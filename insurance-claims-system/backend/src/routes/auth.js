const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/database');
const { generateToken, generateRefreshToken, authenticate } = require('../middleware/auth');
const { validate, loginSchema, registerSchema } = require('../utils/validators');
const { logAudit } = require('../middleware/auditLog');
const jwt = require('jsonwebtoken');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10);

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userResult = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, branch, is_active, locked_until, login_attempts FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account is locked. Try again in ${remainingMinutes} minutes.`,
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const newAttempts = (user.login_attempts || 0) + 1;
      const updates = { login_attempts: newAttempts };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION * 60000);
        await query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, lockUntil, user.id]
        );
        await logAudit(user.id, 'ACCOUNT_LOCKED', 'user', user.id, null, { reason: 'Max login attempts exceeded' }, req.ip, req.requestId);
        return res.status(423).json({ error: 'Account locked due to too many failed attempts' });
      }

      await query('UPDATE users SET login_attempts = $1 WHERE id = $2', [newAttempts, user.id]);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset login attempts on successful login
    await query('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await logAudit(user.id, 'LOGIN', 'user', user.id, null, { method: 'password' }, req.ip, req.requestId);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role, branch } = req.body;

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, branch)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, branch`,
      [email, passwordHash, first_name, last_name, role, branch || 'Main']
    );

    const user = result.rows[0];
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await logAudit(user.id, 'REGISTER', 'user', user.id, null, { role }, req.ip, req.requestId);

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const userResult = await query(
      'SELECT id, email, first_name, last_name, role, branch, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];
    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await query(
      'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2)',
      [tokenHash, expiresAt]
    );

    await logAudit(req.user.id, 'LOGOUT', 'user', req.user.id, null, null, req.ip, req.requestId);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
