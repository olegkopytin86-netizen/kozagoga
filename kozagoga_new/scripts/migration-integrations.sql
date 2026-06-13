-- Migration: добавить поля интеграций в существующие таблицы

-- Products: добавить поля провайдера
ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_service_id VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_params JSONB DEFAULT '[]'::jsonb;

-- Orders: добавить поля транзакции провайдера
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);

-- Order Items: добавить поля провайдера (denormalized)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS provider_code VARCHAR(50);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS provider_service_id VARCHAR(100);

-- Payments: добавить поля шлюза
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_tx_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Создать таблицу transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  order_item_id UUID,
  provider_code VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255),
  provider_service_id VARCHAR(100),
  operation VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2),
  currency VARCHAR(10) DEFAULT 'KGS',
  transaction_amount NUMERIC(10, 2),
  transaction_currency VARCHAR(10),
  rate NUMERIC(10, 6),
  request_body JSONB,
  response_body JSONB,
  provider_status VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Индексы для transactions
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_code);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_tx ON transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Создать таблицу wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_before NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON wallet_transactions(order_id);

-- Индекс для products по провайдеру
CREATE INDEX IF NOT EXISTS idx_products_provider ON products(provider_code);
