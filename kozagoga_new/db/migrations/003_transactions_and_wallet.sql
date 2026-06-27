-- ═══════════════════════════════════════════════════════
-- 003_transactions_and_wallet.sql
-- Общая таблица транзакций + расширение кошелька
-- (SRS — критический пробел)
-- ═══════════════════════════════════════════════════════

-- 1. Общая таблица транзакций (аудит всех денежных движений)
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(30) NOT NULL,
    -- payment | refund | partial_refund | cashback_earned | cashback_redeemed |
    -- cashback_expired | referral_bonus | withdrawal | commission
  amount          NUMERIC(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'RUB',
  amount_usd      NUMERIC(10,2),
    -- опционально: сумма в USD для кросс-валютной сверки
  gateway         VARCHAR(50),
    -- sberbank | yookassa | wallet | system
  gateway_tx_id   VARCHAR(255),
    -- ID транзакции в платёжной системе
  status          VARCHAR(30) NOT NULL DEFAULT 'completed',
    -- pending | completed | failed | cancelled
  description     TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_gateway ON transactions(gateway, gateway_tx_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

-- 2. Расширение wallet_balances
ALTER TABLE wallet_balances ADD COLUMN IF NOT EXISTS currency         VARCHAR(3) DEFAULT 'RUB';
ALTER TABLE wallet_balances ADD COLUMN IF NOT EXISTS loyalty_bonus    NUMERIC(10,2) DEFAULT 0;
  -- бонусные баллы (отдельно от реальных денег)
ALTER TABLE wallet_balances ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ;

-- 3. Расширение wallet_transactions
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS currency     VARCHAR(3) DEFAULT 'RUB';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata     JSONB;

-- 4. Exchange rates (мультивалютность)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   VARCHAR(3) NOT NULL,
  to_currency     VARCHAR(3) NOT NULL,
  rate            NUMERIC(10,6) NOT NULL,
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_to        TIMESTAMPTZ,
  source          VARCHAR(50) DEFAULT 'manual',
    -- cbr | openexchangerates | manual
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_rates_pair ON exchange_rates(from_currency, to_currency);

-- 5. Комментарии
COMMENT ON TABLE transactions IS 'Аудит всех денежных операций — payments, refunds, cashback, bonuses';
COMMENT ON COLUMN transactions.amount_usd IS 'Сумма в USD для кросс-валютной сверки/отчётности';
COMMENT ON TABLE exchange_rates IS 'Курсы валют для мультивалютности';
