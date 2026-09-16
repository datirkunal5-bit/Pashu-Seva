import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const defaultLocalDbPath = process.env.DB_PATH || path.join(dataDir, 'pashu_khadya.db');

export function createDatabase(customConfig = {}) {
  let url = customConfig.url || process.env.TURSO_DATABASE_URL;
  let authToken = customConfig.authToken || process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    const filePath = customConfig.filePath || defaultLocalDbPath;
    url = `file:${filePath}`;
  }

  const client = createClient({
    url,
    authToken
  });

  const isTurso = url.startsWith('libsql:') || url.startsWith('https:');

  const db = {
    client,
    isTurso,
    url,

    prepare(sql) {
      return {
        async get(...args) {
          const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
          const res = await client.execute({ sql, args: params });
          return res.rows[0] || null;
        },
        async all(...args) {
          const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
          const res = await client.execute({ sql, args: params });
          return res.rows;
        },
        async run(...args) {
          const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
          return await client.execute({ sql, args: params });
        }
      };
    },

    async exec(sql) {
      return await client.executeMultiple(sql);
    },

    async withTransaction(fn) {
      const tx = await client.transaction('write');
      const txDb = {
        ...db,
        prepare(sql) {
          return {
            async get(...args) {
              const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
              const res = await tx.execute({ sql, args: params });
              return res.rows[0] || null;
            },
            async all(...args) {
              const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
              const res = await tx.execute({ sql, args: params });
              return res.rows;
            },
            async run(...args) {
              const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
              return await tx.execute({ sql, args: params });
            }
          };
        },
        async exec(sql) {
          return await tx.executeMultiple(sql);
        }
      };

      try {
        const result = await fn(txDb);
        await tx.commit();
        return result;
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    },

    async initSchema() {
      if (!isTurso) {
        try {
          await client.execute('PRAGMA foreign_keys = ON;');
          await client.execute('PRAGMA journal_mode = WAL;');
        } catch (e) {
          // ignore pragma if not supported
        }
      }

      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone_number TEXT UNIQUE NOT NULL,
          village TEXT,
          member_code TEXT,
          current_balance REAL NOT NULL DEFAULT 0.00,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('payment', 'feed_given')),
          amount REAL NOT NULL CHECK (amount > 0),
          note TEXT,
          resulting_balance REAL NOT NULL,
          recorded_by_admin_id TEXT REFERENCES admins(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS otps (
          phone_number TEXT PRIMARY KEY,
          otp_code TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_member_sort 
          ON transactions(member_id, date ASC, created_at ASC);

        CREATE INDEX IF NOT EXISTS idx_members_phone 
          ON members(phone_number);

        CREATE INDEX IF NOT EXISTS idx_members_code 
          ON members(member_code);
      `);
    }
  };

  return db;
}

const defaultDb = createDatabase();
export default defaultDb;
