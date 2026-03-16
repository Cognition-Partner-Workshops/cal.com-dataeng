const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createClaimSchema, updateClaimSchema, claimDecisionSchema, assignClaimSchema, createNoteSchema } = require('../utils/validators');
const { logAudit } = require('../middleware/auditLog');
const { evaluateClaim } = require('../services/decisionEngine');

const router = express.Router();

// GET /api/claims — filtered by role
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { page = 1, limit = 20, status, priority, type, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let baseQuery = `
      SELECT c.*, 
        p.policy_number, p.type as policy_type, p.state as policy_state,
        claimant.first_name as claimant_first_name, claimant.last_name as claimant_last_name, claimant.email as claimant_email,
        adj.first_name as adjuster_first_name, adj.last_name as adjuster_last_name,
        mgr.first_name as manager_first_name, mgr.last_name as manager_last_name
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      JOIN users claimant ON c.claimant_id = claimant.id
      LEFT JOIN users adj ON c.adjuster_id = adj.id
      LEFT JOIN users mgr ON c.manager_id = mgr.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (role === 'policyholder') {
      conditions.push(`c.claimant_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    } else if (role === 'claims_adjuster') {
      conditions.push(`(c.adjuster_id = $${paramIndex} OR c.status = 'filed')`);
      params.push(userId);
      paramIndex++;
    }
    // claims_manager, compliance_officer, executive see all

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (priority) {
      conditions.push(`c.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }
    if (type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const allowedSorts = ['created_at', 'amount_claimed', 'filed_date', 'status', 'priority', 'fraud_score'];
    const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    baseQuery += ` ORDER BY c.${sortCol} ${order}`;

    // Count query
    let countQuery = 'SELECT COUNT(*) as total FROM claims c JOIN policies p ON c.policy_id = p.id';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const [dataResult, countResult] = await Promise.all([
      query(baseQuery + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, parseInt(limit, 10), offset]),
      query(countQuery, params),
    ]);

    res.json({
      claims: dataResult.rows,
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

// GET /api/claims/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, 
        p.policy_number, p.type as policy_type, p.status as policy_status, p.coverage_limit, p.deductible, p.state as policy_state, p.effective_date as policy_effective_date, p.expiration_date as policy_expiration_date,
        claimant.first_name as claimant_first_name, claimant.last_name as claimant_last_name, claimant.email as claimant_email,
        adj.first_name as adjuster_first_name, adj.last_name as adjuster_last_name,
        mgr.first_name as manager_first_name, mgr.last_name as manager_last_name
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      JOIN users claimant ON c.claimant_id = claimant.id
      LEFT JOIN users adj ON c.adjuster_id = adj.id
      LEFT JOIN users mgr ON c.manager_id = mgr.id
      WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = result.rows[0];

    // Policyholders can only see their own claims
    if (req.user.role === 'policyholder' && claim.claimant_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get fraud indicators
    const fraudResult = await query('SELECT * FROM fraud_indicators WHERE claim_id = $1', [id]);

    res.json({ ...claim, fraud_indicators: fraudResult.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/claims — policyholder files a claim
router.post('/', authenticate, authorize('policyholder'), validate(createClaimSchema), async (req, res, next) => {
  try {
    const { policy_id, type, amount_claimed, incident_date, incident_description } = req.body;

    // Verify policy belongs to this policyholder
    const policyResult = await query(
      'SELECT * FROM policies WHERE id = $1 AND policyholder_id = $2',
      [policy_id, req.user.id]
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or does not belong to you' });
    }

    // Generate claim number
    const countResult = await query('SELECT COUNT(*) as cnt FROM claims');
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].cnt, 10) + 1).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO claims (claim_number, policy_id, claimant_id, type, amount_claimed, incident_date, incident_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [claimNumber, policy_id, req.user.id, type, amount_claimed, incident_date, incident_description]
    );

    const claim = result.rows[0];

    // Record initial status
    await query(
      'INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, reason) VALUES ($1, NULL, $2, $3, $4)',
      [claim.id, 'filed', req.user.id, 'Claim filed by policyholder']
    );

    await logAudit(req.user.id, 'CLAIM_FILED', 'claim', claim.id, null, { claim_number: claimNumber, amount: amount_claimed }, req.ip, req.requestId);

    // Run decisioning engine
    let decision = null;
    try {
      decision = await evaluateClaim(claim.id, req.user.id, req.ip, req.requestId);
    } catch (decisionError) {
      console.error('Decision engine error:', decisionError.message);
    }

    // Re-fetch the claim after decisioning
    const updatedClaim = await query('SELECT * FROM claims WHERE id = $1', [claim.id]);

    res.status(201).json({
      claim: updatedClaim.rows[0],
      decision,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/claims/:id
router.put('/:id', authenticate, authorize('claims_adjuster', 'claims_manager', 'compliance_officer'), validate(updateClaimSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingResult = await query('SELECT * FROM claims WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const existing = existingResult.rows[0];

    // Build update query
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE claims SET ${setFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Record status change if applicable
    if (updates.status && updates.status !== existing.status) {
      await query(
        'INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
        [id, existing.status, updates.status, req.user.id, updates.decision_reason || 'Status updated']
      );
    }

    await logAudit(req.user.id, 'CLAIM_UPDATED', 'claim', parseInt(id, 10), existing, updates, req.ip, req.requestId);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:id/decide
router.post('/:id/decide', authenticate, authorize('claims_adjuster', 'claims_manager'), validate(claimDecisionSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, amount_approved, reason } = req.body;

    const claimResult = await query(
      `SELECT c.*, p.coverage_limit FROM claims c JOIN policies p ON c.policy_id = p.id WHERE c.id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = claimResult.rows[0];

    // Adjuster authority check: can only approve up to $10,000
    if (req.user.role === 'claims_adjuster' && decision === 'approve' && claim.amount_claimed > 10000) {
      return res.status(403).json({ error: 'Claims over $10,000 require manager approval' });
    }

    let newStatus;
    let approvedAmount = null;

    switch (decision) {
      case 'approve':
        newStatus = 'approved';
        approvedAmount = amount_approved !== undefined ? amount_approved : claim.amount_claimed;
        break;
      case 'deny':
        newStatus = 'denied';
        approvedAmount = 0;
        break;
      case 'refer_manager':
        newStatus = 'under_review';
        break;
      case 'request_info':
        newStatus = 'under_review';
        break;
      default:
        return res.status(400).json({ error: 'Invalid decision' });
    }

    const updateFields = [
      'status = $1',
      'decision_reason = $2',
      'decision_date = CURRENT_TIMESTAMP',
      'updated_at = CURRENT_TIMESTAMP',
    ];
    const updateValues = [newStatus, reason];
    let paramIdx = 3;

    if (approvedAmount !== null) {
      updateFields.push(`amount_approved = $${paramIdx}`);
      updateValues.push(approvedAmount);
      paramIdx++;
    }

    if (decision === 'refer_manager') {
      // Auto-assign manager if not already set
      if (!claim.manager_id) {
        const managerResult = await query(
          "SELECT id FROM users WHERE role = 'claims_manager' AND is_active = true LIMIT 1"
        );
        if (managerResult.rows.length > 0) {
          updateFields.push(`manager_id = $${paramIdx}`);
          updateValues.push(managerResult.rows[0].id);
          paramIdx++;
        }
      }
    }

    updateValues.push(id);
    const result = await query(
      `UPDATE claims SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      updateValues
    );

    // Record status change
    await query(
      'INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
      [id, claim.status, newStatus, req.user.id, reason]
    );

    await logAudit(
      req.user.id,
      `CLAIM_${decision.toUpperCase()}`,
      'claim',
      parseInt(id, 10),
      { status: claim.status },
      { status: newStatus, decision, reason, amount_approved: approvedAmount },
      req.ip,
      req.requestId
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:id/assign
router.post('/:id/assign', authenticate, authorize('claims_manager'), validate(assignClaimSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjuster_id } = req.body;

    // Verify adjuster exists and has the right role
    const adjusterResult = await query(
      "SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = 'claims_adjuster' AND is_active = true",
      [adjuster_id]
    );

    if (adjusterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adjuster not found' });
    }

    const result = await query(
      'UPDATE claims SET adjuster_id = $1, status = CASE WHEN status = \'filed\' THEN \'under_review\' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [adjuster_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    await logAudit(req.user.id, 'CLAIM_ASSIGNED', 'claim', parseInt(id, 10), null, { adjuster_id }, req.ip, req.requestId);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/claims/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT csh.*, u.first_name, u.last_name, u.role
       FROM claim_status_history csh
       LEFT JOIN users u ON csh.changed_by = u.id
       WHERE csh.claim_id = $1
       ORDER BY csh.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/claims/:id/documents
router.get('/:id/documents', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT cd.*, u.first_name, u.last_name
       FROM claim_documents cd
       LEFT JOIN users u ON cd.uploaded_by = u.id
       WHERE cd.claim_id = $1
       ORDER BY cd.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:id/documents
router.post('/:id/documents', authenticate, async (req, res, next) => {
  try {
    const { document_type, file_name, file_path } = req.body;
    const result = await query(
      'INSERT INTO claim_documents (claim_id, uploaded_by, document_type, file_name, file_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, req.user.id, document_type, file_name, file_path]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/claims/:id/notes
router.get('/:id/notes', authenticate, async (req, res, next) => {
  try {
    let notesQuery = `
      SELECT cn.*, u.first_name, u.last_name, u.role
      FROM claim_notes cn
      LEFT JOIN users u ON cn.author_id = u.id
      WHERE cn.claim_id = $1
    `;

    // Policyholders can only see non-internal notes
    if (req.user.role === 'policyholder') {
      notesQuery += ' AND cn.is_internal = false';
    }

    notesQuery += ' ORDER BY cn.created_at DESC';

    const result = await query(notesQuery, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:id/notes
router.post('/:id/notes', authenticate, validate(createNoteSchema), async (req, res, next) => {
  try {
    const { note_text, is_internal } = req.body;

    // Policyholders cannot create internal notes
    const isInternal = req.user.role === 'policyholder' ? false : is_internal;

    const result = await query(
      'INSERT INTO claim_notes (claim_id, author_id, note_text, is_internal) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, req.user.id, note_text, isInternal]
    );

    await logAudit(req.user.id, 'NOTE_ADDED', 'claim_note', result.rows[0].id, null, { claim_id: req.params.id, is_internal: isInternal }, req.ip, req.requestId);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
