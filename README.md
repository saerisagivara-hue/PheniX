# PhoeniX

A Character.ai-style website where users can register, verify their email, create AI characters (bots), and chat with them. Public bots appear on the main page; private bots are visible only on the creator's profile.

## Features

- **User registration & email verification** — Users sign up with username, email, and password. A verification link is sent to the provided email; only after clicking it can they log in (ensuring a real email).
- **Login** — After verification, users log in with email and password. The site remembers them by username, email, and password.
- **Profiles** — Each user has a profile showing bots they created and (when viewing their own profile) a "Liked" tab for bots they've liked.
- **Main page** — Lists all **public** bots from all users. Search and horizontal "For you" row plus a grid of characters.
- **Create bot** — Logged-in users can create a character with name, description, subtitle, avatar URL, and prompt. They choose **public** (visible to everyone on the home page) or **private** (only on their profile).
- **Chat** — Open any bot to chat. Messages are stored; placeholder replies are shown until you connect a real AI API.

## Tech stack

- **Backend:** Node.js, Express, SQLite (sql.js — no native build required), JWT auth, Nodemailer (verification emails)
- **Frontend:** React, Vite, React Router

## Setup

### Backend

```bash
cd PhoeniX/backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET, and optionally SMTP_* for real verification emails
npm run dev
```

API runs at `http://localhost:3001`. Without SMTP config, verification links are printed to the console (copy into the browser to verify).

### Frontend

```bash
cd PhoeniX/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Set `VITE_API_URL=http://localhost:3001` in `.env` if your API is elsewhere.

### Email verification

- **Development:** Leave `SMTP_*` empty; the backend logs the verification URL to the console. Copy that URL (e.g. `http://localhost:3001/api/auth/verify-email?token=...`) into your browser to verify the account. The page will redirect to the frontend login with "Email verified!"
- **Production:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (e.g. Gmail, SendGrid). Set `API_URL` to your public backend URL so the link in the email points to your server; the server will verify and redirect to `FRONTEND_URL/login?verified=1`.

## Project structure

```
PhoeniX/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── mailer.js
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js    # register, login, verify-email
│       ├── bots.js    # CRUD, like, messages
│       └── users.js   # me, profile by username
├── frontend/
│   └── src/
│       ├── api.js
│       ├── context/AuthContext.jsx
│       ├── components/ (NavBar, BotCard)
│       └── pages/ (Home, Login, Register, Profile, Chat, CreateBot)
└── README.md
```

## API overview

- `POST /api/auth/register` — Register (sends verification email)
- `GET /api/auth/verify-email?token=...` — Verify email (redirects to frontend login)
- `POST /api/auth/login` — Login (returns JWT and user)
- `GET /api/bots` — List public bots (optional auth for like state)
- `GET /api/bots/:id` — Get one bot
- `POST /api/bots` — Create bot (auth), body: `{ name, description?, subtitle?, avatar_url?, prompt?, is_public }`
- `PATCH /api/bots/:id` — Update bot (owner)
- `DELETE /api/bots/:id` — Delete bot (owner)
- `POST /api/bots/:id/like` — Toggle like (auth)
- `GET /api/bots/:id/messages` — Chat history (auth)
- `POST /api/bots/:id/messages` — Send message (auth), body: `{ content }`
- `GET /api/users/me` — Current user (auth)
- `GET /api/users/:username` — Public profile (optional auth for isOwn)
