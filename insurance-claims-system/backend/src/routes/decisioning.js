const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createRuleSchema, updateRuleSchema } = require('../utils/validators');
const { evaluateClaim, getActiveRules } = require('../services/decisionEngine');
const { logAudit } = require('../middleware/auditLog');
const { rulesCache } = require('../utils/cache');

const router = express.Router();

// POST /api/decisioning/evaluate/:claimId
router.post('/evaluate/:claimId', authenticate, authorize('claims_adjuster', 'claims_manager', 'compliance_officer'), async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const decision = await evaluateClaim(parseInt(claimId, 10), req.user.id, req.ip, req.requestId);
    res.json(decision);
  } catch (error) {
    if (error.message === 'Claim not found') {
      return res.status(404).json({ error: 'Claim not found' });
    }
    next(error);
  }
});

// GET /api/decisioning/rules
router.get('/rules', authenticate, authorize('claims_manager', 'compliance_officer', 'executive'), async (req, res, next) => {
  try {
    const { state, rule_type, is_active } = req.query;
    let rulesQuery = 'SELECT * FROM decision_rules WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (state) {
      rulesQuery += ` AND (state = $${paramIndex} OR state IS NULL)`;
      params.push(state);
      paramIndex++;
    }
    if (rule_type) {
      rulesQuery += ` AND rule_type = $${paramIndex}`;
      params.push(rule_type);
      paramIndex++;
    }
    if (is_active !== undefined) {
      rulesQuery += ` AND is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    rulesQuery += ' ORDER BY priority DESC';

    const result = await query(rulesQuery, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/decisioning/rules
router.post('/rules', authenticate, authorize('claims_manager', 'compliance_officer'), validate(createRuleSchema), async (req, res, next) => {
  try {
    const { rule_name, rule_type, conditions, action, priority, is_active, state } = req.body;

    const result = await query(
      `INSERT INTO decision_rules (rule_name, rule_type, conditions, action, priority, is_active, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [rule_name, rule_type, JSON.stringify(conditions), action, priority, is_active, state || null]
    );

    rulesCache.clear();

    await logAudit(req.user.id, 'RULE_CREATED', 'decision_rule', result.rows[0].id, null, { rule_name, rule_type }, req.ip, req.requestId);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/decisioning/rules/:id
router.put('/rules/:id', authenticate, authorize('claims_manager', 'compliance_officer'), validate(updateRuleSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingResult = await query('SELECT * FROM decision_rules WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const existing = existingResult.rows[0];

    const setFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'conditions') {
          setFields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setFields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (setFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE decision_rules SET ${setFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    rulesCache.clear();

    await logAudit(req.user.id, 'RULE_UPDATED', 'decision_rule', parseInt(id, 10), existing, updates, req.ip, req.requestId);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
