const express = require('express');
const { healthCheck } = require('../config/database');

const router = express.Router();

// GET /api/health
router.get('/', async (req, res) => {
  const dbHealth = await healthCheck();
  const status = dbHealth.status === 'healthy' ? 200 : 503;
  res.status(status).json({
    status: dbHealth.status,
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// GET /api/health/ready
router.get('/ready', async (req, res) => {
  const dbHealth = await healthCheck();
  if (dbHealth.status === 'healthy') {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'Database unavailable' });
  }
});

// GET /api/health/live
router.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

module.exports = router;
