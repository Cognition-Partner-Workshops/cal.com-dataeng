const { query } = require('../config/database');

async function logAudit(userId, action, entityType, entityId, oldValues, newValues, ipAddress, requestId) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
        requestId || null,
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
}

function auditMiddleware(action, entityType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user ? req.user.id : null;
        const entityId = req.params.id || (data && data.id) || null;
        const ip = req.ip || req.connection.remoteAddress;
        logAudit(userId, action, entityType, entityId, null, req.body, ip, req.requestId);
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
