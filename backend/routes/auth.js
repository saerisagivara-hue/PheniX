import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { sendVerificationEmail } from '../mailer.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 2, max: 30 }).withMessage('Username 2–30 characters'),
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      const { username, email, password } = req.body;
      const emailLower = email.toLowerCase().trim();
      if (!emailRegex.test(emailLower)) {
        return res.status(400).json({ error: 'Please enter a real email address.' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(emailLower, username);
      if (existing) {
        return res.status(400).json({ error: 'Email or username already registered.' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const result = db.prepare('INSERT INTO users (username, email, password_hash, verified) VALUES (?, ?, ?, 0)')
        .run(username, emailLower, password_hash);
      const userId = result.lastInsertRowid;
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
        .run(userId, token, expiresAt);
      const API_URL = process.env.API_URL || 'http://localhost:3001';
      const verificationUrl = `${API_URL}/api/auth/verify-email?token=${token}`;
      await sendVerificationEmail(emailLower, username, verificationUrl);
      return res.status(201).json({
        message: 'Registration successful. Please check your email to verify your address.',
        userId,
        email: emailLower,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect(`${FRONTEND_URL}/login?error=missing-token`);
  }
  const row = db.prepare(`
    SELECT v.user_id, u.email FROM verification_tokens v
    JOIN users u ON u.id = v.user_id
    WHERE v.token = ? AND v.expires_at > datetime('now')
  `).get(token);
  if (!row) {
    return res.redirect(`${FRONTEND_URL}/login?error=invalid-or-expired`);
  }
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(row.user_id);
  db.prepare('DELETE FROM verification_tokens WHERE token = ?').run(token);
  return res.redirect(`${FRONTEND_URL}/login?verified=1`);
});

router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }
      const { email, password } = req.body;
      const emailLower = email.toLowerCase().trim();
      if (!emailRegex.test(emailLower)) {
        return res.status(400).json({ error: 'Please enter a real email address.' });
      }
      const user = db.prepare('SELECT id, username, email, password_hash, verified FROM users WHERE email = ?').get(emailLower);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (!user.verified) {
        return res.status(403).json({
          error: 'Email not verified.',
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

export default router;
