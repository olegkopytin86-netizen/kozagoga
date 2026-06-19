-- ============================================
-- Migration 001: Admin Panel (Phase 1 MVP)
-- ============================================
-- Расширение схемы под личный кабинет администратора
-- RBAC, categories tree, product_fields, transactions, admin_logs, system_logs
-- ============================================

-- ═══════════════════════════════════════════
-- 1. Расширение ролей пользователей (RBAC)
-- ═══════════════════════════════════════════
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'viewer', 'operator', 'admin', 'superadmin'));

-- ═══════════════════════════════════════════
-- 2. Расширение categories (иерархическое дерево)
-- ═══════════════════════════════════════════
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- ═══════════════════════════════════════════
-- 3. Расширение products (каталог админки)
-- ═══════════════════════════════════════════
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) NOT NULL DEFAULT 'digital';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_min NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_max NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_fixed NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_precheck BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS exclude_commission BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- ═══════════════════════════════════════════
-- 4. product_fields — динамические поля услуги
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  label VARCHAR(255) NOT NULL,
  placeholder VARCHAR(255),
  regex VARCHAR(500),
  max_length INTEGER,
  keyboard_type VARCHAR(50),
  is_required BOOLEAN DEFAULT true,
  is_readonly BOOLEAN DEFAULT false,
  dictionary_code VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  default_value VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_fields_product ON product_fields(product_id);

-- ═══════════════════════════════════════════
-- 5. Расширение transactions (детальные транзакции)
-- ═══════════════════════════════════════════
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS local_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gateway_tx_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gateway_code VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_status VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission NUMERIC(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS webhook_payload JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS force_completed_by UUID REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS force_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_gateway_tx ON transactions(gateway_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_local_tx ON transactions(local_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON transactions(gateway_code);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- ═══════════════════════════════════════════
-- 6. Расширение admin_logs (аудит)
-- ═══════════════════════════════════════════
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity ON admin_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

-- ═══════════════════════════════════════════
-- 7. system_logs — структурированные системные логи
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  component VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  request_id VARCHAR(100),
  user_id UUID REFERENCES users(id),
  ip VARCHAR(45),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_request ON system_logs(request_id);

-- ═══════════════════════════════════════════
-- 8. config_version — для DB-based конфига (архитектурная закладка)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  applied_by UUID REFERENCES users(id),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_config_active ON config_versions(is_active);
