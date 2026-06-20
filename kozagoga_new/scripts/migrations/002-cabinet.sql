-- ============================================
-- Migration 002: Personal Cabinet + Config + Logs
-- ============================================
-- 1. Добавление name в users
-- 2. Индексы для wallet_transactions
-- 3. Конфигурация в БД (config_versions)
-- 4. Системные логи (system_logs) — уже есть в 001
-- ============================================

BEGIN;

-- ═══════════════════════════════════════════
-- 1. Добавляем name в users
-- ═══════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- ═══════════════════════════════════════════
-- 2. Индексы для wallet_transactions
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at);

-- ═══════════════════════════════════════════
-- 3. Функция авто-обновления updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для users
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════
-- 4. Расширение transactions для wallet (payment_method = wallet)
-- ═══════════════════════════════════════════
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_status ON transactions(provider_status);

COMMIT;
