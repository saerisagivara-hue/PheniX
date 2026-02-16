import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { init as initDb } from './db.js';
import authRoutes from './routes/auth.js';
import botsRoutes from './routes/bots.js';
import usersRoutes from './routes/users.js';
import { optionalAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bots', optionalAuth, botsRoutes);
app.use('/api/users', optionalAuth, usersRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`PhoeniX API running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
