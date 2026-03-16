const { query } = require('../config/database');
const { logAudit } = require('../middleware/auditLog');
const { rulesCache } = require('../utils/cache');

async function getActiveRules(state) {
  const cacheKey = `rules_${state || 'all'}`;
  const cached = rulesCache.get(cacheKey);
  if (cached) return cached;

  let result;
  if (state) {
    result = await query(
      'SELECT * FROM decision_rules WHERE is_active = true AND (state = $1 OR state IS NULL) ORDER BY priority DESC',
      [state]
    );
  } else {
    result = await query(
      'SELECT * FROM decision_rules WHERE is_active = true ORDER BY priority DESC'
    );
  }
  rulesCache.set(cacheKey, result.rows);
  return result.rows;
}

async function calculateFraudScore(claimData, policyData) {
  const indicators = [];
  let totalScore = 0;

  // 1. Claim frequency check
  const claimHistory = await query(
    'SELECT COUNT(*) as claim_count FROM claims WHERE claimant_id = $1 AND filed_date > NOW() - INTERVAL \'12 months\'',
    [claimData.claimant_id]
  );
  const claimCount = parseInt(claimHistory.rows[0].claim_count, 10);
  if (claimCount > 2) {
    const frequencyScore = Math.min((claimCount - 2) * 10, 30);
    totalScore += frequencyScore;
    indicators.push({
      indicator_type: 'claim_frequency',
      score: frequencyScore,
      details: { claims_in_12_months: claimCount, threshold: 2 },
    });
  }

  // 2. Amount vs policy limits ratio
  const amountRatio = claimData.amount_claimed / policyData.coverage_limit;
  if (amountRatio > 0.7) {
    const ratioScore = Math.min(Math.round(amountRatio * 30), 25);
    totalScore += ratioScore;
    indicators.push({
      indicator_type: 'amount_vs_limit',
      score: ratioScore,
      details: { claim_amount: claimData.amount_claimed, coverage_limit: policyData.coverage_limit, ratio: Math.round(amountRatio * 100) / 100 },
    });
  }

  // 3. Time since policy inception
  const effectiveDate = new Date(policyData.effective_date);
  const daysSinceInception = Math.floor((new Date() - effectiveDate) / (1000 * 60 * 60 * 24));
  if (daysSinceInception < 90) {
    const inceptionScore = Math.min(Math.round((90 - daysSinceInception) / 3), 20);
    totalScore += inceptionScore;
    indicators.push({
      indicator_type: 'policy_age',
      score: inceptionScore,
      details: { days_since_inception: daysSinceInception, threshold_days: 90 },
    });
  }

  // 4. Claim amount anomaly (very high relative to premium)
  const premiumRatio = claimData.amount_claimed / policyData.premium;
  if (premiumRatio > 10) {
    const anomalyScore = Math.min(Math.round(premiumRatio), 15);
    totalScore += anomalyScore;
    indicators.push({
      indicator_type: 'premium_anomaly',
      score: anomalyScore,
      details: { claim_to_premium_ratio: Math.round(premiumRatio * 100) / 100 },
    });
  }

  totalScore = Math.min(totalScore, 100);

  return { totalScore, indicators };
}

async function evaluateClaim(claimId, userId, ipAddress, requestId) {
  // Fetch claim with policy data
  const claimResult = await query(
    `SELECT c.*, p.status as policy_status, p.coverage_limit, p.deductible, p.effective_date, p.expiration_date, p.premium, p.state as policy_state, p.type as policy_type
     FROM claims c
     JOIN policies p ON c.policy_id = p.id
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw new Error('Claim not found');
  }

  const claim = claimResult.rows[0];
  const decision = {
    claim_id: claimId,
    claim_number: claim.claim_number,
    original_status: claim.status,
    new_status: null,
    reason_codes: [],
    adverse_action: null,
    fraud_score: 0,
    fraud_indicators: [],
    requires_review: false,
  };

  // Get active rules for the policy's state
  const rules = await getActiveRules(claim.policy_state);

  // Rule 1: Check if policy is expired
  if (claim.policy_status === 'expired' || new Date(claim.expiration_date) < new Date()) {
    decision.new_status = 'denied';
    decision.reason_codes.push('EXPIRED_POLICY');
    decision.adverse_action = 'Claim denied: Policy is expired. Coverage ended on ' + new Date(claim.expiration_date).toLocaleDateString();
    
    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Rule 2: Check if policy is cancelled
  if (claim.policy_status === 'cancelled') {
    decision.new_status = 'denied';
    decision.reason_codes.push('CANCELLED_POLICY');
    decision.adverse_action = 'Claim denied: Policy has been cancelled.';
    
    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Rule 3: Check if claim exceeds coverage limit
  if (claim.amount_claimed > claim.coverage_limit) {
    decision.new_status = 'denied';
    decision.reason_codes.push('EXCEEDS_COVERAGE');
    decision.adverse_action = `Claim denied: Amount claimed ($${claim.amount_claimed}) exceeds policy coverage limit ($${claim.coverage_limit}).`;
    
    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Calculate fraud score
  const fraudResult = await calculateFraudScore(claim, {
    coverage_limit: claim.coverage_limit,
    effective_date: claim.effective_date,
    premium: claim.premium,
  });

  decision.fraud_score = fraudResult.totalScore;
  decision.fraud_indicators = fraudResult.indicators;

  // Store fraud indicators
  for (const indicator of fraudResult.indicators) {
    await query(
      'INSERT INTO fraud_indicators (claim_id, indicator_type, score, details) VALUES ($1, $2, $3, $4)',
      [claimId, indicator.indicator_type, indicator.score, JSON.stringify(indicator.details)]
    );
  }

  // Update fraud score on claim
  await query('UPDATE claims SET fraud_score = $1 WHERE id = $2', [decision.fraud_score, claimId]);

  // Rule 4: High fraud score — flag for investigation
  if (decision.fraud_score >= 50) {
    decision.new_status = 'investigation';
    decision.reason_codes.push('HIGH_FRAUD_SCORE');
    decision.requires_review = true;

    await query(
      'INSERT INTO compliance_flags (claim_id, flag_type, description, severity) VALUES ($1, $2, $3, $4)',
      [claimId, 'fraud_investigation', `High fraud score: ${decision.fraud_score}. Automatic investigation triggered.`, 'high']
    );

    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Rule 5: Auto-approve small claims (under $1,000)
  if (claim.amount_claimed < 1000 && claim.policy_status === 'active' && decision.fraud_score < 25) {
    const approvedAmount = Math.max(0, claim.amount_claimed - claim.deductible);
    decision.new_status = 'approved';
    decision.reason_codes.push('AUTO_APPROVED');
    decision.amount_approved = approvedAmount;

    await query(
      'UPDATE claims SET amount_approved = $1 WHERE id = $2',
      [approvedAmount, claimId]
    );

    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Rule 6: Refer medium claims ($1,000 - $10,000) to adjuster
  if (claim.amount_claimed >= 1000 && claim.amount_claimed <= 10000) {
    decision.new_status = 'under_review';
    decision.reason_codes.push('REFER_ADJUSTER');
    decision.requires_review = true;

    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Rule 7: Refer large claims (> $10,000) to manager
  if (claim.amount_claimed > 10000) {
    decision.new_status = 'under_review';
    decision.reason_codes.push('REFER_MANAGER');
    decision.requires_review = true;

    await applyDecision(claimId, decision, userId, ipAddress, requestId);
    return decision;
  }

  // Default: refer for review
  decision.new_status = 'under_review';
  decision.reason_codes.push('DEFAULT_REVIEW');
  decision.requires_review = true;
  await applyDecision(claimId, decision, userId, ipAddress, requestId);
  return decision;
}

async function applyDecision(claimId, decision, userId, ipAddress, requestId) {
  // Update claim status
  const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const updateValues = [decision.new_status];
  let paramIndex = 2;

  if (decision.reason_codes.length > 0) {
    updateFields.push(`decision_reason = $${paramIndex}`);
    updateValues.push(decision.adverse_action || decision.reason_codes.join(', '));
    paramIndex++;
  }

  if (decision.new_status === 'approved' || decision.new_status === 'denied') {
    updateFields.push(`decision_date = CURRENT_TIMESTAMP`);
  }

  updateValues.push(claimId);
  await query(
    `UPDATE claims SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
    updateValues
  );

  // Record status change
  await query(
    'INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
    [claimId, decision.original_status, decision.new_status, userId, decision.adverse_action || decision.reason_codes.join(', ')]
  );

  // Audit log
  await logAudit(
    userId,
    `CLAIM_${decision.new_status.toUpperCase()}`,
    'claim',
    claimId,
    { status: decision.original_status },
    { status: decision.new_status, reason_codes: decision.reason_codes, fraud_score: decision.fraud_score },
    ipAddress,
    requestId
  );
}

module.exports = { evaluateClaim, calculateFraudScore, getActiveRules };
