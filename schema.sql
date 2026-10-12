-- SA 역량 진단 앱 D1 스키마
-- 적용: npx wrangler d1 execute se-competency --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL UNIQUE,
  pin_hash        TEXT    NOT NULL,
  pin_salt        TEXT    NOT NULL,
  scores          TEXT    NOT NULL DEFAULT '{}',   -- {"e1":3,"c2":4,...}
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    INTEGER NOT NULL DEFAULT 0,      -- epoch ms
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER,                              -- admin 세션은 NULL
  role       TEXT    NOT NULL,                     -- 'user' | 'admin'
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
