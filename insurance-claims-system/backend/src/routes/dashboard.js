const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { dashboardCache } = require('../utils/cache');

const router = express.Router();

// GET /api/dashboard/executive
router.get('/executive', authenticate, authorize('executive', 'claims_manager'), async (req, res, next) => {
  try {
    const cacheKey = 'dashboard_executive';
    const cached = dashboardCache.get(cacheKey);
    if (cached) return res.json(cached);

    const [
      overview,
      claimsByStatus,
      claimsByType,
      claimsByState,
      monthlyTrends,
      topAdjusters,
      fraudMetrics,
      recentClaims,
      financialSummary,
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_claims,
          SUM(CASE WHEN status = 'filed' THEN 1 ELSE 0 END) as filed,
          SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
          SUM(CASE WHEN status = 'investigation' THEN 1 ELSE 0 END) as investigation,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN status = 'appealed' THEN 1 ELSE 0 END) as appealed,
          SUM(amount_claimed) as total_claimed,
          SUM(COALESCE(amount_approved, 0)) as total_approved,
          AVG(amount_claimed) as avg_claim_amount,
          AVG(fraud_score) as avg_fraud_score
        FROM claims
      `),
      query(`
        SELECT status, COUNT(*) as count, SUM(amount_claimed) as total_amount
        FROM claims GROUP BY status ORDER BY count DESC
      `),
      query(`
        SELECT type, COUNT(*) as count, SUM(amount_claimed) as total_amount, AVG(amount_claimed) as avg_amount
        FROM claims GROUP BY type ORDER BY count DESC
      `),
      query(`
        SELECT p.state, COUNT(c.id) as count, SUM(c.amount_claimed) as total_amount
        FROM claims c JOIN policies p ON c.policy_id = p.id
        GROUP BY p.state ORDER BY count DESC
      `),
      query(`
        SELECT 
          DATE_TRUNC('month', filed_date) as month,
          COUNT(*) as claims_filed,
          SUM(amount_claimed) as total_claimed,
          SUM(COALESCE(amount_approved, 0)) as total_approved,
          AVG(fraud_score) as avg_fraud_score
        FROM claims
        GROUP BY DATE_TRUNC('month', filed_date)
        ORDER BY month DESC
        LIMIT 12
      `),
      query(`
        SELECT u.id, u.first_name, u.last_name,
          COUNT(c.id) as claims_handled,
          SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN c.status = 'denied' THEN 1 ELSE 0 END) as denied_count,
          AVG(c.amount_claimed) as avg_claim_amount
        FROM users u
        LEFT JOIN claims c ON c.adjuster_id = u.id
        WHERE u.role = 'claims_adjuster'
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY claims_handled DESC
      `),
      query(`
        SELECT 
          COUNT(CASE WHEN fraud_score >= 50 THEN 1 END) as high_risk_claims,
          COUNT(CASE WHEN fraud_score >= 25 AND fraud_score < 50 THEN 1 END) as medium_risk_claims,
          COUNT(CASE WHEN fraud_score < 25 THEN 1 END) as low_risk_claims,
          AVG(fraud_score) as avg_fraud_score,
          MAX(fraud_score) as max_fraud_score
        FROM claims
      `),
      query(`
        SELECT c.id, c.claim_number, c.status, c.amount_claimed, c.fraud_score, c.filed_date, c.type,
          u.first_name as claimant_first_name, u.last_name as claimant_last_name,
          p.policy_number, p.state as policy_state
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        JOIN policies p ON c.policy_id = p.id
        ORDER BY c.filed_date DESC LIMIT 10
      `),
      query(`
        SELECT 
          SUM(amount_claimed) as total_claimed,
          SUM(COALESCE(amount_approved, 0)) as total_approved,
          SUM(CASE WHEN status IN ('approved', 'paid', 'closed') THEN COALESCE(amount_approved, 0) ELSE 0 END) as total_paid_out,
          CASE WHEN SUM(amount_claimed) > 0 
            THEN ROUND(SUM(COALESCE(amount_approved, 0))::numeric / SUM(amount_claimed)::numeric * 100, 2) 
            ELSE 0 END as loss_ratio
        FROM claims
      `),
    ]);

    const data = {
      overview: overview.rows[0],
      claims_by_status: claimsByStatus.rows,
      claims_by_type: claimsByType.rows,
      claims_by_state: claimsByState.rows,
      monthly_trends: monthlyTrends.rows,
      top_adjusters: topAdjusters.rows,
      fraud_metrics: fraudMetrics.rows[0],
      recent_claims: recentClaims.rows,
      financial_summary: financialSummary.rows[0],
    };

    dashboardCache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/adjuster
router.get('/adjuster', authenticate, authorize('claims_adjuster'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cacheKey = `dashboard_adjuster_${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return res.json(cached);

    const [myClaims, myStats, recentActivity, pendingClaims] = await Promise.all([
      query(`
        SELECT c.*, p.policy_number, p.type as policy_type, p.state as policy_state,
          u.first_name as claimant_first_name, u.last_name as claimant_last_name
        FROM claims c
        JOIN policies p ON c.policy_id = p.id
        JOIN users u ON c.claimant_id = u.id
        WHERE c.adjuster_id = $1
        ORDER BY c.priority DESC, c.filed_date DESC
        LIMIT 20
      `, [userId]),
      query(`
        SELECT 
          COUNT(*) as total_assigned,
          SUM(CASE WHEN status IN ('under_review', 'investigation') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
          AVG(amount_claimed) as avg_claim_amount,
          SUM(amount_claimed) as total_claim_value
        FROM claims WHERE adjuster_id = $1
      `, [userId]),
      query(`
        SELECT csh.*, c.claim_number
        FROM claim_status_history csh
        JOIN claims c ON csh.claim_id = c.id
        WHERE csh.changed_by = $1
        ORDER BY csh.created_at DESC LIMIT 10
      `, [userId]),
      query(`
        SELECT c.*, p.policy_number, p.type as policy_type,
          u.first_name as claimant_first_name, u.last_name as claimant_last_name
        FROM claims c
        JOIN policies p ON c.policy_id = p.id
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status = 'filed' AND c.adjuster_id IS NULL
        ORDER BY c.priority DESC, c.filed_date ASC
        LIMIT 10
      `),
    ]);

    const data = {
      my_claims: myClaims.rows,
      stats: myStats.rows[0],
      recent_activity: recentActivity.rows,
      unassigned_claims: pendingClaims.rows,
    };

    dashboardCache.set(cacheKey, data, 60000);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/manager
router.get('/manager', authenticate, authorize('claims_manager'), async (req, res, next) => {
  try {
    const cacheKey = 'dashboard_manager';
    const cached = dashboardCache.get(cacheKey);
    if (cached) return res.json(cached);

    const [teamStats, pendingApprovals, adjusterWorkload, recentDecisions] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_claims,
          SUM(CASE WHEN status IN ('under_review', 'investigation', 'filed') THEN 1 ELSE 0 END) as open_claims,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
          SUM(CASE WHEN amount_claimed > 10000 AND status IN ('under_review', 'investigation') THEN 1 ELSE 0 END) as needs_manager_approval,
          SUM(amount_claimed) as total_claimed,
          SUM(COALESCE(amount_approved, 0)) as total_approved
        FROM claims
      `),
      query(`
        SELECT c.*, p.policy_number, p.state as policy_state,
          u.first_name as claimant_first_name, u.last_name as claimant_last_name,
          adj.first_name as adjuster_first_name, adj.last_name as adjuster_last_name
        FROM claims c
        JOIN policies p ON c.policy_id = p.id
        JOIN users u ON c.claimant_id = u.id
        LEFT JOIN users adj ON c.adjuster_id = adj.id
        WHERE c.amount_claimed > 10000 AND c.status IN ('under_review', 'investigation')
        ORDER BY c.amount_claimed DESC
      `),
      query(`
        SELECT u.id, u.first_name, u.last_name,
          COUNT(c.id) as total_claims,
          SUM(CASE WHEN c.status IN ('under_review', 'investigation') THEN 1 ELSE 0 END) as active_claims,
          AVG(c.amount_claimed) as avg_claim_amount
        FROM users u
        LEFT JOIN claims c ON c.adjuster_id = u.id
        WHERE u.role = 'claims_adjuster' AND u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name
      `),
      query(`
        SELECT c.id, c.claim_number, c.status, c.amount_claimed, c.amount_approved, c.decision_reason, c.decision_date,
          adj.first_name as adjuster_first_name, adj.last_name as adjuster_last_name
        FROM claims c
        LEFT JOIN users adj ON c.adjuster_id = adj.id
        WHERE c.decision_date IS NOT NULL
        ORDER BY c.decision_date DESC LIMIT 10
      `),
    ]);

    const data = {
      team_stats: teamStats.rows[0],
      pending_approvals: pendingApprovals.rows,
      adjuster_workload: adjusterWorkload.rows,
      recent_decisions: recentDecisions.rows,
    };

    dashboardCache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
