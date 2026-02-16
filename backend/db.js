import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'phoenix.db');

let database = null;

function saveDb() {
  if (!database) return;
  const data = database.export();
  const buf = Buffer.from(data);
  writeFileSync(dbPath, buf);
}

function rowToObject(columns, row) {
  const o = {};
  columns.forEach((c, i) => (o[c] = row[i]));
  return o;
}

export async function init() {
  const SQL = await initSqlJs();
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    database = new SQL.Database(buf);
  } else {
    database = new SQL.Database();
  }
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      subtitle TEXT,
      avatar_url TEXT,
      prompt TEXT,
      is_public INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_likes (
      user_id INTEGER NOT NULL,
      bot_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, bot_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  saveDb();
}

export default {
  prepare(sql) {
    if (!database) throw new Error('Database not initialized. Call init() first.');
    return {
      run(...params) {
        database.run(sql, params);
        saveDb();
        let lastInsertRowid = 0;
        try {
          const result = database.exec('SELECT last_insert_rowid() as id');
          if (result.length && result[0].values && result[0].values[0]) {
            lastInsertRowid = result[0].values[0][0];
          }
        } catch (_) {}
        return { lastInsertRowid };
      },
      get(...params) {
        try {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.get();
            const cols = stmt.getColumnNames();
            stmt.free();
            return rowToObject(cols, row);
          }
          stmt.free();
        } catch (e) {
          // sql.js uses different param placeholders sometimes
        }
        return undefined;
      },
      all(...params) {
        const stmt = database.prepare(sql);
        stmt.bind(params);
        const cols = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(rowToObject(cols, stmt.get()));
        stmt.free();
        return rows;
      },
    };
  },
};
