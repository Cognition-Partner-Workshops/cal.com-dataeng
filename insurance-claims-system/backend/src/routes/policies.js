const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createPolicySchema } = require('../utils/validators');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();

// GET /api/policies
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { page = 1, limit = 20, status, type, state } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let baseQuery = `
      SELECT p.*, u.first_name as holder_first_name, u.last_name as holder_last_name, u.email as holder_email
      FROM policies p
      JOIN users u ON p.policyholder_id = u.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (role === 'policyholder') {
      conditions.push(`p.policyholder_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (type) {
      conditions.push(`p.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    if (state) {
      conditions.push(`p.state = $${paramIndex}`);
      params.push(state);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY p.created_at DESC';

    const countQuery = baseQuery.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');

    const [dataResult, countResult] = await Promise.all([
      query(baseQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, parseInt(limit, 10), offset]),
      query(countQuery, params),
    ]);

    res.json({
      policies: dataResult.rows,
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

// GET /api/policies/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.first_name as holder_first_name, u.last_name as holder_last_name, u.email as holder_email
       FROM policies p
       JOIN users u ON p.policyholder_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const policy = result.rows[0];

    if (req.user.role === 'policyholder' && policy.policyholder_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get associated claims count
    const claimsCount = await query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status IN (\'approved\', \'paid\') THEN amount_approved ELSE 0 END) as total_paid FROM claims WHERE policy_id = $1',
      [req.params.id]
    );

    res.json({
      ...policy,
      claims_count: parseInt(claimsCount.rows[0].total, 10),
      total_claims_paid: parseFloat(claimsCount.rows[0].total_paid || 0),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/policies
router.post('/', authenticate, authorize('claims_manager', 'executive'), validate(createPolicySchema), async (req, res, next) => {
  try {
    const { policy_number, policyholder_id, type, premium, coverage_limit, deductible, effective_date, expiration_date, state } = req.body;

    const existingPolicy = await query('SELECT id FROM policies WHERE policy_number = $1', [policy_number]);
    if (existingPolicy.rows.length > 0) {
      return res.status(409).json({ error: 'Policy number already exists' });
    }

    const result = await query(
      `INSERT INTO policies (policy_number, policyholder_id, type, premium, coverage_limit, deductible, effective_date, expiration_date, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [policy_number, policyholder_id, type, premium, coverage_limit, deductible, effective_date, expiration_date, state]
    );

    await logAudit(req.user.id, 'POLICY_CREATED', 'policy', result.rows[0].id, null, { policy_number }, req.ip, req.requestId);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
