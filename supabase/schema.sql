-- Neuralarchitecture Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Setter', 'Partner', 'Founder', 'Head', 'Vendedor')),
  plan TEXT,
  active BOOLEAN DEFAULT true,
  avatar TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ==========================================
-- 2. SALES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  seller_id TEXT REFERENCES users(id),
  seller_name TEXT NOT NULL,
  seller_role TEXT NOT NULL,
  setter_id TEXT REFERENCES users(id),
  setter_name TEXT,
  setup_value NUMERIC DEFAULT 0,
  rec_value NUMERIC DEFAULT 0,
  seller_setup_comm NUMERIC DEFAULT 0,
  seller_rec_comm NUMERIC DEFAULT 0,
  setter_setup_comm NUMERIC DEFAULT 0,
  setter_rec_comm NUMERIC DEFAULT 0,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);

-- ==========================================
-- 3. DAILY FILLS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS fills (
  id TEXT PRIMARY KEY, -- format: ops_fill_YYYY-MM-DD_userId
  user_id TEXT REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '{}',
  obs TEXT,
  score INTEGER DEFAULT 0,
  fill_date TEXT NOT NULL, -- YYYY-MM-DD
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_fills_date ON fills(fill_date);
CREATE INDEX IF NOT EXISTS idx_fills_user ON fills(user_id);

-- ==========================================
-- 4. PIPELINE DEALS (Kanban)
-- ==========================================
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contact', 'proposal', 'negotiation', 'closed')),
  assigned_to TEXT REFERENCES users(id),
  assigned_name TEXT,
  probability INTEGER DEFAULT 10,
  notes TEXT,
  created_at TEXT,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ==========================================
-- 5. LEGACY OPPORTUNITIES
-- ==========================================
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  setter_id TEXT REFERENCES users(id),
  setter_name TEXT,
  founder_id TEXT,
  founder_name TEXT,
  count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'resolved')),
  confirmed_count INTEGER,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ==========================================
-- 6. NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  icon TEXT,
  read BOOLEAN DEFAULT false,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ==========================================
-- 7. COACHING NOTES
-- ==========================================
CREATE TABLE IF NOT EXISTS coaching_notes (
  id TEXT PRIMARY KEY,
  manager_id TEXT REFERENCES users(id),
  member_id TEXT REFERENCES users(id),
  date TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  action_items TEXT,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_coaching_member ON coaching_notes(member_id);

-- ==========================================
-- 8. XP & GAMIFICATION
-- ==========================================
CREATE TABLE IF NOT EXISTS xp_totals (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS xp_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);

CREATE TABLE IF NOT EXISTS achievements (
  user_id TEXT REFERENCES users(id),
  achievement_id TEXT NOT NULL,
  unlocked_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  current INTEGER DEFAULT 0,
  best INTEGER DEFAULT 0,
  last_fill_date TEXT,
  freezes_used INTEGER DEFAULT 0,
  freeze_month TEXT
);

-- ==========================================
-- 9. GOALS
-- ==========================================
CREATE TABLE IF NOT EXISTS goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  daily_contacts INTEGER DEFAULT 50,
  daily_score INTEGER DEFAULT 50,
  monthly_sales INTEGER DEFAULT 5,
  monthly_revenue INTEGER DEFAULT 5000
);

-- ==========================================
-- 10. SHOUTOUTS
-- ==========================================
CREATE TABLE IF NOT EXISTS shoutouts (
  id TEXT PRIMARY KEY,
  from_id TEXT REFERENCES users(id),
  from_name TEXT NOT NULL,
  to_id TEXT REFERENCES users(id),
  to_name TEXT NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT DEFAULT '🔥',
  reactions JSONB DEFAULT '{}',
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ==========================================
-- 11. CONFIG (key-value for app config)
-- ==========================================
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ==========================================
-- 12. CHALLENGES
-- ==========================================
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'daily',
  target_value INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  active BOOLEAN DEFAULT true,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS challenge_progress (
  user_id TEXT REFERENCES users(id),
  challenge_id TEXT REFERENCES challenges(id),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at BIGINT,
  PRIMARY KEY (user_id, challenge_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

-- Allow full access with anon key (team internal app, no public access)
-- For a 20-person internal team, simple permissive policies are appropriate
CREATE POLICY "allow_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON coaching_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON xp_totals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON xp_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON streaks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON shoutouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON challenge_progress FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- REALTIME: Enable for key tables
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE fills;
ALTER PUBLICATION supabase_realtime ADD TABLE shoutouts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
