const bcrypt = require('bcrypt');
const { pool } = require('./database');
require('dotenv').config();

const BCRYPT_ROUNDS = 12;

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM fraud_indicators');
    await client.query('DELETE FROM audit_log');
    await client.query('DELETE FROM compliance_flags');
    await client.query('DELETE FROM claim_status_history');
    await client.query('DELETE FROM claim_notes');
    await client.query('DELETE FROM claim_documents');
    await client.query('DELETE FROM claims');
    await client.query('DELETE FROM policies');
    await client.query('DELETE FROM decision_rules');
    await client.query('DELETE FROM token_blacklist');
    await client.query('DELETE FROM users');

    // Reset sequences
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE policies_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE claims_id_seq RESTART WITH 1");

    // Create users (unique strong passwords per user)
    const users = [
      { email: 'john.doe@safeguard.com', password: 'Policyholder#2024!Secure', first_name: 'John', last_name: 'Doe', role: 'policyholder', branch: 'Dallas' },
      { email: 'jane.smith@safeguard.com', password: 'Policyholder#Jane2024!', first_name: 'Jane', last_name: 'Smith', role: 'policyholder', branch: 'Los Angeles' },
      { email: 'robert.chen@safeguard.com', password: 'Policyholder#Rob2024!!', first_name: 'Robert', last_name: 'Chen', role: 'policyholder', branch: 'New York' },
      { email: 'adjuster.mike@safeguard.com', password: 'Adjuster#Mike2024!Sec', first_name: 'Mike', last_name: 'Johnson', role: 'claims_adjuster', branch: 'Dallas' },
      { email: 'adjuster.sarah@safeguard.com', password: 'Adjuster#Sarah2024!S', first_name: 'Sarah', last_name: 'Williams', role: 'claims_adjuster', branch: 'Los Angeles' },
      { email: 'manager.lisa@safeguard.com', password: 'Manager#Lisa2024!Sec!', first_name: 'Lisa', last_name: 'Anderson', role: 'claims_manager', branch: 'Main' },
      { email: 'compliance.tom@safeguard.com', password: 'Compliance#Tom2024!S!', first_name: 'Tom', last_name: 'Davis', role: 'compliance_officer', branch: 'Main' },
      { email: 'exec.patricia@safeguard.com', password: 'Executive#Pat2024!Se!', first_name: 'Patricia', last_name: 'Martinez', role: 'executive', branch: 'Main' },
    ];

    const userIds = {};
    for (const user of users) {
      const hash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, branch) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [user.email, hash, user.first_name, user.last_name, user.role, user.branch]
      );
      userIds[user.email] = result.rows[0].id;
    }
    console.log('Users seeded:', Object.keys(userIds).length);

    // Create policies
    const policies = [
      { policy_number: 'POL-AUTO-001', policyholder_id: userIds['john.doe@safeguard.com'], type: 'auto', status: 'active', premium: 1200.00, coverage_limit: 50000.00, deductible: 500.00, effective_date: '2025-01-01', expiration_date: '2027-01-01', state: 'TX' },
      { policy_number: 'POL-HOME-001', policyholder_id: userIds['john.doe@safeguard.com'], type: 'home', status: 'active', premium: 2400.00, coverage_limit: 300000.00, deductible: 1000.00, effective_date: '2025-03-01', expiration_date: '2027-03-01', state: 'TX' },
      { policy_number: 'POL-AUTO-002', policyholder_id: userIds['jane.smith@safeguard.com'], type: 'auto', status: 'active', premium: 950.00, coverage_limit: 35000.00, deductible: 750.00, effective_date: '2025-06-01', expiration_date: '2027-06-01', state: 'CA' },
      { policy_number: 'POL-HEALTH-001', policyholder_id: userIds['jane.smith@safeguard.com'], type: 'health', status: 'active', premium: 5200.00, coverage_limit: 500000.00, deductible: 2000.00, effective_date: '2025-01-01', expiration_date: '2027-01-01', state: 'CA' },
      { policy_number: 'POL-HOME-002', policyholder_id: userIds['robert.chen@safeguard.com'], type: 'home', status: 'active', premium: 3600.00, coverage_limit: 500000.00, deductible: 1500.00, effective_date: '2025-02-01', expiration_date: '2027-02-01', state: 'NY' },
      { policy_number: 'POL-LIFE-001', policyholder_id: userIds['robert.chen@safeguard.com'], type: 'life', status: 'active', premium: 800.00, coverage_limit: 250000.00, deductible: 0.00, effective_date: '2025-01-15', expiration_date: '2035-01-15', state: 'NY' },
      { policy_number: 'POL-AUTO-EXP', policyholder_id: userIds['john.doe@safeguard.com'], type: 'auto', status: 'expired', premium: 1100.00, coverage_limit: 40000.00, deductible: 500.00, effective_date: '2023-01-01', expiration_date: '2025-01-01', state: 'TX' },
    ];

    const policyIds = {};
    for (const policy of policies) {
      const result = await client.query(
        `INSERT INTO policies (policy_number, policyholder_id, type, status, premium, coverage_limit, deductible, effective_date, expiration_date, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [policy.policy_number, policy.policyholder_id, policy.type, policy.status, policy.premium, policy.coverage_limit, policy.deductible, policy.effective_date, policy.expiration_date, policy.state]
      );
      policyIds[policy.policy_number] = result.rows[0].id;
    }
    console.log('Policies seeded:', Object.keys(policyIds).length);

    // Create claims at various stages
    const claims = [
      // Auto-approved claim (under $1000)
      { claim_number: 'CLM-2026-0001', policy_id: policyIds['POL-AUTO-001'], claimant_id: userIds['john.doe@safeguard.com'], type: 'auto_collision', status: 'approved', amount_claimed: 750.00, amount_approved: 750.00, incident_date: '2026-02-15', incident_description: 'Minor fender bender in parking lot', fraud_score: 5.0, priority: 'low', decision_reason: 'Auto-approved: claim under $1,000 threshold with valid active policy' },
      // Under review by adjuster
      { claim_number: 'CLM-2026-0002', policy_id: policyIds['POL-HOME-001'], claimant_id: userIds['john.doe@safeguard.com'], adjuster_id: userIds['adjuster.mike@safeguard.com'], type: 'home_damage', status: 'under_review', amount_claimed: 5500.00, incident_date: '2026-03-01', incident_description: 'Storm damage to roof and siding', fraud_score: 12.0, priority: 'normal' },
      // Needs manager approval (over $10K)
      { claim_number: 'CLM-2026-0003', policy_id: policyIds['POL-HOME-002'], claimant_id: userIds['robert.chen@safeguard.com'], adjuster_id: userIds['adjuster.sarah@safeguard.com'], type: 'home_damage', status: 'investigation', amount_claimed: 45000.00, incident_date: '2026-02-20', incident_description: 'Water damage from burst pipe affecting multiple rooms', fraud_score: 8.0, priority: 'high' },
      // Denied claim
      { claim_number: 'CLM-2026-0004', policy_id: policyIds['POL-AUTO-002'], claimant_id: userIds['jane.smith@safeguard.com'], adjuster_id: userIds['adjuster.sarah@safeguard.com'], type: 'auto_theft', status: 'denied', amount_claimed: 28000.00, amount_approved: 0, incident_date: '2026-01-10', incident_description: 'Vehicle reported stolen from driveway', fraud_score: 72.0, priority: 'high', decision_reason: 'Claim denied: High fraud score (72.0). Inconsistencies in police report timeline.' },
      // Paid claim
      { claim_number: 'CLM-2026-0005', policy_id: policyIds['POL-HEALTH-001'], claimant_id: userIds['jane.smith@safeguard.com'], adjuster_id: userIds['adjuster.mike@safeguard.com'], type: 'health_medical', status: 'paid', amount_claimed: 3200.00, amount_approved: 2800.00, incident_date: '2026-01-05', incident_description: 'Emergency room visit for broken arm', fraud_score: 2.0, priority: 'normal', decision_reason: 'Approved after deductible applied' },
      // Filed, not yet assigned
      { claim_number: 'CLM-2026-0006', policy_id: policyIds['POL-AUTO-001'], claimant_id: userIds['john.doe@safeguard.com'], type: 'auto_collision', status: 'filed', amount_claimed: 8500.00, incident_date: '2026-03-10', incident_description: 'Rear-end collision at intersection', fraud_score: 0, priority: 'normal' },
      // Appealed claim
      { claim_number: 'CLM-2026-0007', policy_id: policyIds['POL-HOME-002'], claimant_id: userIds['robert.chen@safeguard.com'], adjuster_id: userIds['adjuster.mike@safeguard.com'], type: 'home_theft', status: 'appealed', amount_claimed: 12000.00, incident_date: '2026-02-28', incident_description: 'Burglary - electronics and jewelry stolen', fraud_score: 35.0, priority: 'high', decision_reason: 'Initially denied due to fraud concerns, policyholder appealing with additional evidence' },
      // Another small auto-approved
      { claim_number: 'CLM-2026-0008', policy_id: policyIds['POL-AUTO-002'], claimant_id: userIds['jane.smith@safeguard.com'], type: 'auto_collision', status: 'approved', amount_claimed: 450.00, amount_approved: 450.00, incident_date: '2026-03-05', incident_description: 'Windshield crack from road debris', fraud_score: 1.0, priority: 'low', decision_reason: 'Auto-approved: claim under $1,000 threshold with valid active policy' },
      // Closed claim
      { claim_number: 'CLM-2026-0009', policy_id: policyIds['POL-HEALTH-001'], claimant_id: userIds['jane.smith@safeguard.com'], adjuster_id: userIds['adjuster.sarah@safeguard.com'], type: 'health_prescription', status: 'closed', amount_claimed: 650.00, amount_approved: 500.00, incident_date: '2025-12-15', incident_description: 'Prescription medication costs for chronic condition', fraud_score: 0, priority: 'low', decision_reason: 'Approved after formulary review' },
      // Large claim under investigation
      { claim_number: 'CLM-2026-0010', policy_id: policyIds['POL-LIFE-001'], claimant_id: userIds['robert.chen@safeguard.com'], adjuster_id: userIds['adjuster.mike@safeguard.com'], manager_id: userIds['manager.lisa@safeguard.com'], type: 'life_disability', status: 'investigation', amount_claimed: 75000.00, incident_date: '2026-03-08', incident_description: 'Long-term disability claim following workplace accident', fraud_score: 15.0, priority: 'urgent' },
    ];

    const claimIds = {};
    for (const claim of claims) {
      const result = await client.query(
        `INSERT INTO claims (claim_number, policy_id, claimant_id, adjuster_id, manager_id, type, status, amount_claimed, amount_approved, incident_date, incident_description, fraud_score, priority, decision_reason, decision_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
        [claim.claim_number, claim.policy_id, claim.claimant_id, claim.adjuster_id || null, claim.manager_id || null, claim.type, claim.status, claim.amount_claimed, claim.amount_approved || null, claim.incident_date, claim.incident_description, claim.fraud_score, claim.priority, claim.decision_reason || null, claim.status === 'approved' || claim.status === 'denied' || claim.status === 'paid' || claim.status === 'closed' ? new Date() : null]
      );
      claimIds[claim.claim_number] = result.rows[0].id;
    }
    console.log('Claims seeded:', Object.keys(claimIds).length);

    // Seed claim status history
    const statusHistories = [
      { claim_id: claimIds['CLM-2026-0001'], from_status: 'filed', to_status: 'approved', changed_by: null, reason: 'Auto-approved by decisioning engine' },
      { claim_id: claimIds['CLM-2026-0002'], from_status: 'filed', to_status: 'under_review', changed_by: userIds['adjuster.mike@safeguard.com'], reason: 'Assigned to adjuster for review' },
      { claim_id: claimIds['CLM-2026-0003'], from_status: 'filed', to_status: 'under_review', changed_by: userIds['adjuster.sarah@safeguard.com'], reason: 'Assigned for investigation' },
      { claim_id: claimIds['CLM-2026-0003'], from_status: 'under_review', to_status: 'investigation', changed_by: userIds['adjuster.sarah@safeguard.com'], reason: 'Requires on-site inspection' },
      { claim_id: claimIds['CLM-2026-0004'], from_status: 'filed', to_status: 'under_review', changed_by: userIds['adjuster.sarah@safeguard.com'], reason: 'Assigned for investigation' },
      { claim_id: claimIds['CLM-2026-0004'], from_status: 'under_review', to_status: 'denied', changed_by: userIds['adjuster.sarah@safeguard.com'], reason: 'High fraud indicators detected' },
      { claim_id: claimIds['CLM-2026-0005'], from_status: 'filed', to_status: 'under_review', changed_by: userIds['adjuster.mike@safeguard.com'], reason: 'Medical claim review' },
      { claim_id: claimIds['CLM-2026-0005'], from_status: 'under_review', to_status: 'approved', changed_by: userIds['adjuster.mike@safeguard.com'], reason: 'Approved after deductible' },
      { claim_id: claimIds['CLM-2026-0005'], from_status: 'approved', to_status: 'paid', changed_by: userIds['manager.lisa@safeguard.com'], reason: 'Payment processed' },
      { claim_id: claimIds['CLM-2026-0009'], from_status: 'filed', to_status: 'approved', changed_by: userIds['adjuster.sarah@safeguard.com'], reason: 'Prescription approved' },
      { claim_id: claimIds['CLM-2026-0009'], from_status: 'approved', to_status: 'paid', changed_by: userIds['manager.lisa@safeguard.com'], reason: 'Payment processed' },
      { claim_id: claimIds['CLM-2026-0009'], from_status: 'paid', to_status: 'closed', changed_by: userIds['manager.lisa@safeguard.com'], reason: 'Claim finalized' },
    ];

    for (const sh of statusHistories) {
      await client.query(
        `INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)`,
        [sh.claim_id, sh.from_status, sh.to_status, sh.changed_by, sh.reason]
      );
    }
    console.log('Status histories seeded');

    // Seed claim notes
    const notes = [
      { claim_id: claimIds['CLM-2026-0002'], author_id: userIds['adjuster.mike@safeguard.com'], note_text: 'Contacted policyholder for additional photos of storm damage. Awaiting response.', is_internal: false },
      { claim_id: claimIds['CLM-2026-0002'], author_id: userIds['adjuster.mike@safeguard.com'], note_text: 'Weather reports confirm severe storm in area on reported date. Claim appears legitimate.', is_internal: true },
      { claim_id: claimIds['CLM-2026-0003'], author_id: userIds['adjuster.sarah@safeguard.com'], note_text: 'Scheduled on-site inspection for March 25, 2026.', is_internal: false },
      { claim_id: claimIds['CLM-2026-0003'], author_id: userIds['adjuster.sarah@safeguard.com'], note_text: 'Damage extent appears significant. May exceed initial estimate. Flagging for manager review.', is_internal: true },
      { claim_id: claimIds['CLM-2026-0004'], author_id: userIds['adjuster.sarah@safeguard.com'], note_text: 'Police report indicates vehicle was found 2 miles from home undamaged. Inconsistency noted.', is_internal: true },
      { claim_id: claimIds['CLM-2026-0007'], author_id: userIds['adjuster.mike@safeguard.com'], note_text: 'Policyholder submitted additional receipts for stolen items. Reviewing documentation.', is_internal: false },
      { claim_id: claimIds['CLM-2026-0010'], author_id: userIds['manager.lisa@safeguard.com'], note_text: 'High value disability claim. Requesting independent medical examination.', is_internal: true },
    ];

    for (const note of notes) {
      await client.query(
        `INSERT INTO claim_notes (claim_id, author_id, note_text, is_internal) VALUES ($1, $2, $3, $4)`,
        [note.claim_id, note.author_id, note.note_text, note.is_internal]
      );
    }
    console.log('Notes seeded');

    // Seed decision rules
    const decisionRules = [
      { rule_name: 'Auto-Approve Small Claims', rule_type: 'auto_approve', conditions: { max_amount: 1000, policy_status: 'active', max_fraud_score: 25 }, action: 'approve', priority: 100, state: null },
      { rule_name: 'Auto-Deny Expired Policy', rule_type: 'auto_deny', conditions: { policy_status: 'expired' }, action: 'deny', priority: 200, state: null },
      { rule_name: 'Auto-Deny Exceeded Limits', rule_type: 'auto_deny', conditions: { exceeds_coverage: true }, action: 'deny', priority: 190, state: null },
      { rule_name: 'Refer Medium Claims to Adjuster', rule_type: 'refer_adjuster', conditions: { min_amount: 1000, max_amount: 10000 }, action: 'refer_adjuster', priority: 80, state: null },
      { rule_name: 'Refer Large Claims to Manager', rule_type: 'refer_manager', conditions: { min_amount: 10000 }, action: 'refer_manager', priority: 70, state: null },
      { rule_name: 'High Fraud Score Review', rule_type: 'fraud_check', conditions: { min_fraud_score: 50 }, action: 'flag_fraud', priority: 150, state: null },
      // State-specific rules
      { rule_name: 'TX - 15 Day Acknowledgment', rule_type: 'auto_approve', conditions: { acknowledgment_days: 15, response_days: 30 }, action: 'compliance_check', priority: 50, state: 'TX' },
      { rule_name: 'CA - 15 Day Acknowledgment', rule_type: 'auto_approve', conditions: { acknowledgment_days: 15, response_days: 40 }, action: 'compliance_check', priority: 50, state: 'CA' },
      { rule_name: 'NY - 15 Business Day Acknowledgment', rule_type: 'auto_approve', conditions: { acknowledgment_days: 15, response_days: 30, business_days: true }, action: 'compliance_check', priority: 50, state: 'NY' },
    ];

    for (const rule of decisionRules) {
      await client.query(
        `INSERT INTO decision_rules (rule_name, rule_type, conditions, action, priority, is_active, state)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [rule.rule_name, rule.rule_type, JSON.stringify(rule.conditions), rule.action, rule.priority, rule.state]
      );
    }
    console.log('Decision rules seeded');

    // Seed compliance flags
    const complianceFlags = [
      { claim_id: claimIds['CLM-2026-0004'], flag_type: 'fraud_investigation', description: 'High fraud score triggered automatic review. SIU investigation recommended.', severity: 'high', resolved: false },
      { claim_id: claimIds['CLM-2026-0007'], flag_type: 'fraud_investigation', description: 'Elevated fraud indicators on burglary claim. Timeline inconsistencies noted.', severity: 'medium', resolved: false },
      { claim_id: claimIds['CLM-2026-0010'], flag_type: 'high_value_review', description: 'Claim exceeds $50,000 threshold. Executive review required per company policy.', severity: 'high', resolved: false },
      { claim_id: claimIds['CLM-2026-0005'], flag_type: 'processing_time', description: 'Claim processed within required CA timeframe. Compliant.', severity: 'low', resolved: true, resolved_by: userIds['compliance.tom@safeguard.com'] },
    ];

    for (const flag of complianceFlags) {
      await client.query(
        `INSERT INTO compliance_flags (claim_id, flag_type, description, severity, resolved, resolved_by, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [flag.claim_id, flag.flag_type, flag.description, flag.severity, flag.resolved, flag.resolved_by || null, flag.resolved ? new Date() : null]
      );
    }
    console.log('Compliance flags seeded');

    // Seed fraud indicators
    const fraudIndicators = [
      { claim_id: claimIds['CLM-2026-0004'], indicator_type: 'claim_frequency', score: 25, details: { claims_in_12_months: 3, average_for_segment: 0.8 } },
      { claim_id: claimIds['CLM-2026-0004'], indicator_type: 'amount_vs_limit', score: 20, details: { claim_amount: 28000, coverage_limit: 35000, ratio: 0.80 } },
      { claim_id: claimIds['CLM-2026-0004'], indicator_type: 'policy_age', score: 15, details: { days_since_inception: 224, threshold_days: 90 } },
      { claim_id: claimIds['CLM-2026-0004'], indicator_type: 'report_inconsistency', score: 12, details: { finding: 'Police report timeline conflicts with witness statements' } },
      { claim_id: claimIds['CLM-2026-0007'], indicator_type: 'claim_frequency', score: 15, details: { claims_in_12_months: 2, average_for_segment: 0.5 } },
      { claim_id: claimIds['CLM-2026-0007'], indicator_type: 'amount_vs_limit', score: 10, details: { claim_amount: 12000, coverage_limit: 500000, ratio: 0.024 } },
      { claim_id: claimIds['CLM-2026-0007'], indicator_type: 'timeline_suspicious', score: 10, details: { finding: 'Claim filed 48 hours after policy coverage increase' } },
    ];

    for (const fi of fraudIndicators) {
      await client.query(
        `INSERT INTO fraud_indicators (claim_id, indicator_type, score, details) VALUES ($1, $2, $3, $4)`,
        [fi.claim_id, fi.indicator_type, fi.score, JSON.stringify(fi.details)]
      );
    }
    console.log('Fraud indicators seeded');

    // Seed payments
    const payments = [
      { claim_id: claimIds['CLM-2026-0001'], amount: 750.00, payment_method: 'direct_deposit', status: 'completed', reference_number: 'PAY-2026-0001' },
      { claim_id: claimIds['CLM-2026-0005'], amount: 2800.00, payment_method: 'check', status: 'completed', reference_number: 'PAY-2026-0002' },
      { claim_id: claimIds['CLM-2026-0008'], amount: 450.00, payment_method: 'direct_deposit', status: 'pending', reference_number: 'PAY-2026-0003' },
      { claim_id: claimIds['CLM-2026-0009'], amount: 500.00, payment_method: 'check', status: 'completed', reference_number: 'PAY-2026-0004' },
    ];

    for (const payment of payments) {
      await client.query(
        `INSERT INTO payments (claim_id, amount, payment_method, status, reference_number) VALUES ($1, $2, $3, $4, $5)`,
        [payment.claim_id, payment.amount, payment.payment_method, payment.status, payment.reference_number]
      );
    }
    console.log('Payments seeded');

    // Seed audit log entries
    const auditEntries = [
      { user_id: null, action: 'CLAIM_AUTO_APPROVED', entity_type: 'claim', entity_id: claimIds['CLM-2026-0001'], new_values: { status: 'approved', reason: 'Auto-approved: under $1,000' } },
      { user_id: userIds['adjuster.mike@safeguard.com'], action: 'CLAIM_ASSIGNED', entity_type: 'claim', entity_id: claimIds['CLM-2026-0002'], new_values: { adjuster_id: userIds['adjuster.mike@safeguard.com'] } },
      { user_id: userIds['adjuster.sarah@safeguard.com'], action: 'CLAIM_DENIED', entity_type: 'claim', entity_id: claimIds['CLM-2026-0004'], old_values: { status: 'under_review' }, new_values: { status: 'denied', reason: 'Fraud indicators' } },
      { user_id: userIds['adjuster.mike@safeguard.com'], action: 'CLAIM_APPROVED', entity_type: 'claim', entity_id: claimIds['CLM-2026-0005'], old_values: { status: 'under_review' }, new_values: { status: 'approved', amount_approved: 2800 } },
      { user_id: userIds['manager.lisa@safeguard.com'], action: 'PAYMENT_PROCESSED', entity_type: 'payment', entity_id: claimIds['CLM-2026-0005'], new_values: { amount: 2800, method: 'check' } },
    ];

    for (const entry of auditEntries) {
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, '127.0.0.1', $7)`,
        [entry.user_id, entry.action, entry.entity_type, entry.entity_id, entry.old_values ? JSON.stringify(entry.old_values) : null, JSON.stringify(entry.new_values), `seed-${Date.now()}`]
      );
    }
    console.log('Audit log seeded');

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch(() => process.exit(1));
}

module.exports = { seed };
