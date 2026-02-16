import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get current user profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const botCount = db.prepare('SELECT COUNT(*) as c FROM bots WHERE user_id = ?').get(req.userId).c;
  const likeCount = db.prepare('SELECT COUNT(*) as c FROM user_likes WHERE user_id = ?').get(req.userId).c;
  return res.json({ ...user, botCount, likeCount });
});

// Get user profile by username (public: their public bots + basic info)
router.get('/:username', (req, res) => {
  const { username } = req.params;
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const isOwn = req.userId === user.id;
  const bots = db.prepare(`
    SELECT b.id, b.name, b.description, b.subtitle, b.avatar_url, b.is_public, b.created_at
    FROM bots b
    WHERE b.user_id = ?
    ${isOwn ? '' : 'AND b.is_public = 1'}
    ORDER BY b.created_at DESC
  `).all(user.id);
  let likedBotIds = [];
  if (req.userId && isOwn) {
    likedBotIds = db.prepare('SELECT bot_id FROM user_likes WHERE user_id = ?').all(req.userId).map((r) => r.bot_id);
  }
  const botCount = bots.length;
  const likeCount = isOwn ? db.prepare('SELECT COUNT(*) as c FROM user_likes WHERE user_id = ?').get(req.userId).c : null;
  return res.json({
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    botCount,
    likeCount: likeCount ?? undefined,
    isOwn,
    bots: bots.map((b) => ({
      ...b,
      author_username: user.username,
      isLiked: isOwn && likedBotIds.includes(b.id),
      chatCount: db.prepare('SELECT COUNT(DISTINCT user_id) FROM messages WHERE bot_id = ?').get(b.id)['COUNT(DISTINCT user_id)'] || 0,
    })),
  });
});

export default router;
