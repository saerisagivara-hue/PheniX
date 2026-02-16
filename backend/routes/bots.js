import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// List public bots (main page) or optionally filter by user
router.get('/', optionalAuth, (req, res) => {
  try {
    const publicOnly = req.query.public !== 'false';
    let sql = `
      SELECT b.id, b.name, b.description, b.subtitle, b.avatar_url, b.is_public, b.created_at,
             u.username AS author_username
      FROM bots b
      JOIN users u ON u.id = b.user_id
    `;
    const params = [];
    if (publicOnly) {
      sql += ' WHERE b.is_public = 1';
    }
    sql += ' ORDER BY b.created_at DESC';
    const bots = db.prepare(sql).all(...params);
    const withLikes = req.userId
      ? bots.map((bot) => {
          const liked = db.prepare('SELECT 1 FROM user_likes WHERE user_id = ? AND bot_id = ?').get(req.userId, bot.id);
          const chatCount = db.prepare('SELECT COUNT(DISTINCT user_id) FROM messages WHERE bot_id = ?').get(bot.id);
          return { ...bot, isLiked: !!liked, chatCount: chatCount['COUNT(DISTINCT user_id)'] || 0 };
        })
      : bots.map((bot) => {
          const chatCount = db.prepare('SELECT COUNT(DISTINCT user_id) FROM messages WHERE bot_id = ?').get(bot.id);
          return { ...bot, isLiked: false, chatCount: chatCount['COUNT(DISTINCT user_id)'] || 0 };
        });
    return res.json(withLikes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get single bot (if public or owner)
router.get('/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid bot id' });
  const bot = db.prepare(`
    SELECT b.*, u.username AS author_username
    FROM bots b JOIN users u ON u.id = b.user_id
    WHERE b.id = ?
  `).get(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  if (!bot.is_public && req.userId !== bot.user_id) {
    return res.status(404).json({ error: 'Bot not found' });
  }
  const isLiked = req.userId
    ? !!db.prepare('SELECT 1 FROM user_likes WHERE user_id = ? AND bot_id = ?').get(req.userId, id)
    : false;
  return res.json({ ...bot, isLiked });
});

// Create bot (auth required)
router.post(
  '/',
  requireAuth,
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('description').optional().trim(),
    body('subtitle').optional().trim(),
    body('avatar_url').optional().trim(),
    body('prompt').optional().trim(),
    body('is_public').optional().isBoolean(),
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      const { name, description, subtitle, avatar_url, prompt, is_public } = req.body;
      const isPublic = is_public === true;
      const result = db.prepare(`
        INSERT INTO bots (user_id, name, description, subtitle, avatar_url, prompt, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.userId, name, description || '', subtitle || '', avatar_url || '', prompt || '', isPublic ? 1 : 0);
      const bot = db.prepare('SELECT b.*, u.username AS author_username FROM bots b JOIN users u ON u.id = b.user_id WHERE b.id = ?').get(result.lastInsertRowid);
      return res.status(201).json(bot);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create bot' });
    }
  }
);

// Update bot (owner only)
router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isInt(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('subtitle').optional().trim(),
    body('avatar_url').optional().trim(),
    body('prompt').optional().trim(),
    body('is_public').optional().isBoolean(),
  ],
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    const bot = db.prepare('SELECT id, user_id FROM bots WHERE id = ?').get(id);
    if (!bot || bot.user_id !== req.userId) return res.status(404).json({ error: 'Bot not found' });
    const { name, description, subtitle, avatar_url, prompt, is_public } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (subtitle !== undefined) { updates.push('subtitle = ?'); params.push(subtitle); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }
    if (prompt !== undefined) { updates.push('prompt = ?'); params.push(prompt); }
    if (typeof is_public === 'boolean') { updates.push('is_public = ?'); params.push(is_public ? 1 : 0); }
    if (updates.length === 0) return res.json(bot);
    params.push(id);
    db.prepare(`UPDATE bots SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT b.*, u.username AS author_username FROM bots b JOIN users u ON u.id = b.user_id WHERE b.id = ?').get(id);
    return res.json(updated);
  }
);

// Delete bot (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id, user_id FROM bots WHERE id = ?').get(id);
  if (!bot || bot.user_id !== req.userId) return res.status(404).json({ error: 'Bot not found' });
  db.prepare('DELETE FROM user_likes WHERE bot_id = ?').run(id);
  db.prepare('DELETE FROM messages WHERE bot_id = ?').run(id);
  db.prepare('DELETE FROM bots WHERE id = ?').run(id);
  return res.status(204).send();
});

// Like / unlike
router.post('/:id/like', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  try {
    db.prepare('INSERT INTO user_likes (user_id, bot_id) VALUES (?, ?)').run(req.userId, id);
    return res.json({ liked: true });
  } catch {
    db.prepare('DELETE FROM user_likes WHERE user_id = ? AND bot_id = ?').run(req.userId, id);
    return res.json({ liked: false });
  }
});

// Chat messages for a bot
router.get('/:id/messages', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id, user_id FROM bots WHERE id = ?').get(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  if (!bot.is_public && bot.user_id !== req.userId) return res.status(404).json({ error: 'Bot not found' });
  const messages = db.prepare(`
    SELECT id, role, content, created_at FROM messages
    WHERE bot_id = ? AND user_id = ?
    ORDER BY created_at ASC
  `).all(id, req.userId);
  return res.json(messages);
});

// Send message (simulated bot reply for demo)
router.post('/:id/messages', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { content } = req.body || {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message content required' });
  }
  const bot = db.prepare('SELECT id, user_id, name, prompt FROM bots WHERE id = ?').get(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  if (!bot.is_public && bot.user_id !== req.userId) return res.status(404).json({ error: 'Bot not found' });
  db.prepare('INSERT INTO messages (bot_id, user_id, role, content) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, 'user', content.trim());
  const userMsgId = db.prepare('SELECT last_insert_rowid() as id').get().id;
  const replyContent = bot.prompt
    ? `[${bot.name}]: ${bot.prompt.split('.').slice(0, 2).join('.')}... You said: "${content.trim().slice(0, 50)}". (This is a placeholder reply; connect an AI API for real responses.)`
    : `${bot.name} received your message. (Connect an AI API for real bot replies.)`;
  db.prepare('INSERT INTO messages (bot_id, user_id, role, content) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, 'assistant', replyContent);
  const assistantRow = db.prepare('SELECT id, role, content, created_at FROM messages WHERE bot_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1').get(id, req.userId);
  return res.status(201).json({
    userMessage: { id: userMsgId, role: 'user', content: content.trim(), created_at: new Date().toISOString() },
    assistantMessage: assistantRow,
  });
});

export default router;
