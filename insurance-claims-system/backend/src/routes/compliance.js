const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createFlagSchema } = require('../utils/validators');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();

// GET /api/compliance/audit-log
router.get('/audit-log', authenticate, authorize('compliance_officer', 'executive'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entity_type, action, user_id, start_date, end_date } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let baseQuery = `
      SELECT al.*, u.first_name, u.last_name, u.email, u.role
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (entity_type) {
      conditions.push(`al.entity_type = $${paramIndex}`);
      params.push(entity_type);
      paramIndex++;
    }
    if (action) {
      conditions.push(`al.action ILIKE $${paramIndex}`);
      params.push(`%${action}%`);
      paramIndex++;
    }
    if (user_id) {
      conditions.push(`al.user_id = $${paramIndex}`);
      params.push(parseInt(user_id, 10));
      paramIndex++;
    }
    if (start_date) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY al.created_at DESC';

    const countQuery = `SELECT COUNT(*) as total FROM audit_log al${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`;

    const [dataResult, countResult] = await Promise.all([
      query(baseQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, parseInt(limit, 10), offset]),
      query(countQuery, params),
    ]);

    res.json({
      audit_log: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(countResult.rows[0].total, 10),
        pages: Math.ceil(parseInt(countResult.rows[0].total, 10) / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/compliance/flags
router.get('/flags', authenticate, authorize('compliance_officer', 'claims_manager', 'executive'), async (req, res, next) => {
  try {
    const { resolved, severity, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let baseQuery = `
      SELECT cf.*, c.claim_number, c.amount_claimed, c.status as claim_status,
        u.first_name as resolver_first_name, u.last_name as resolver_last_name
      FROM compliance_flags cf
      JOIN claims c ON cf.claim_id = c.id
      LEFT JOIN users u ON cf.resolved_by = u.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (resolved !== undefined) {
      conditions.push(`cf.resolved = $${paramIndex}`);
      params.push(resolved === 'true');
      paramIndex++;
    }
    if (severity) {
      conditions.push(`cf.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY cf.created_at DESC';

    const [dataResult, countResult] = await Promise.all([
      query(baseQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, parseInt(limit, 10), offset]),
      query(`SELECT COUNT(*) as total FROM compliance_flags cf${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`, params),
    ]);

    res.json({
      flags: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(countResult.rows[0].total, 10),
        pages: Math.ceil(parseInt(countResult.rows[0].total, 10) / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/compliance/flags
router.post('/flags', authenticate, authorize('compliance_officer', 'claims_manager'), validate(createFlagSchema), async (req, res, next) => {
  try {
    const { claim_id, flag_type, description, severity } = req.body;

    const claimExists = await query('SELECT id FROM claims WHERE id = $1', [claim_id]);
    if (claimExists.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const result = await query(
      'INSERT INTO compliance_flags (claim_id, flag_type, description, severity) VALUES ($1, $2, $3, $4) RETURNING *',
      [claim_id, flag_type, description, severity]
    );

    await logAudit(req.user.id, 'FLAG_CREATED', 'compliance_flag', result.rows[0].id, null, { claim_id, flag_type, severity }, req.ip, req.requestId);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/compliance/flags/:id/resolve
router.put('/flags/:id/resolve', authenticate, authorize('compliance_officer'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution_note } = req.body || {};

    const result = await query(
      'UPDATE compliance_flags SET resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    await logAudit(req.user.id, 'FLAG_RESOLVED', 'compliance_flag', parseInt(id, 10), { resolved: false }, { resolved: true, resolution_note }, req.ip, req.requestId);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/compliance/reports
router.get('/reports', authenticate, authorize('compliance_officer', 'executive'), async (req, res, next) => {
  try {
    const [
      claimsByState,
      processingTimes,
      flagsSummary,
      decisionBreakdown,
      monthlyTrends,
    ] = await Promise.all([
      query(`
        SELECT p.state, COUNT(c.id) as total_claims, 
          SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN c.status = 'denied' THEN 1 ELSE 0 END) as denied,
          AVG(c.amount_claimed) as avg_claim_amount
        FROM claims c JOIN policies p ON c.policy_id = p.id
        GROUP BY p.state ORDER BY p.state
      `),
      query(`
        SELECT p.state,
          AVG(EXTRACT(EPOCH FROM (c.decision_date - c.filed_date)) / 86400) as avg_processing_days
        FROM claims c JOIN policies p ON c.policy_id = p.id
        WHERE c.decision_date IS NOT NULL
        GROUP BY p.state
      `),
      query(`
        SELECT severity, COUNT(*) as total,
          SUM(CASE WHEN resolved = true THEN 1 ELSE 0 END) as resolved_count
        FROM compliance_flags
        GROUP BY severity
      `),
      query(`
        SELECT 
          SUM(CASE WHEN decision_reason LIKE '%Auto-approved%' THEN 1 ELSE 0 END) as auto_approved,
          SUM(CASE WHEN status = 'approved' AND decision_reason NOT LIKE '%Auto-approved%' THEN 1 ELSE 0 END) as manual_approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
          SUM(CASE WHEN status IN ('under_review', 'investigation') THEN 1 ELSE 0 END) as pending_review,
          COUNT(*) as total
        FROM claims
      `),
      query(`
        SELECT 
          DATE_TRUNC('month', filed_date) as month,
          COUNT(*) as claims_filed,
          SUM(amount_claimed) as total_claimed,
          AVG(fraud_score) as avg_fraud_score
        FROM claims
        GROUP BY DATE_TRUNC('month', filed_date)
        ORDER BY month DESC
        LIMIT 12
      `),
    ]);

    res.json({
      by_state: claimsByState.rows,
      processing_times: processingTimes.rows,
      flags_summary: flagsSummary.rows,
      decision_breakdown: decisionBreakdown.rows[0],
      monthly_trends: monthlyTrends.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
