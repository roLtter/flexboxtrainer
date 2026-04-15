import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === "disable" ? false : undefined,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      nickname TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS workplace TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_variant SMALLINT NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image_data TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGSERIAL PRIMARY KEY,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      task_config JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_attempts_task_id ON attempts(task_id);`);
  await pool.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS editor_mode TEXT NOT NULL DEFAULT 'html';`);
  await pool.query(`
    DELETE FROM attempts a
    USING attempts b
    WHERE a.user_id = b.user_id
      AND a.task_id = b.task_id
      AND (
        a.created_at < b.created_at
        OR (a.created_at = b.created_at AND a.id < b.id)
      );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_attempts_user_task ON attempts(user_id, task_id);`);
}
