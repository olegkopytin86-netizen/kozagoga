-- ═══════════════════════════════════════════════════════
-- 008_gifts.sql
-- Система подарков
-- (SRS Модуль 7)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID NOT NULL REFERENCES order_items(id),
  from_user_id    UUID NOT NULL REFERENCES users(id),
  to_recipient    VARCHAR(255) NOT NULL,
    -- email или телефон
  recipient_name  VARCHAR(255),
  message         TEXT,
  status          VARCHAR(20) DEFAULT 'sent',
    -- sent | received | claimed | expired
  claimed_by      UUID REFERENCES users(id),
  claimed_at      TIMESTAMPTZ,
  claim_code      VARCHAR(20) UNIQUE NOT NULL,
  viewed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_gifts_from ON gifts(from_user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_to ON gifts(to_recipient);
CREATE INDEX IF NOT EXISTS idx_gifts_code ON gifts(claim_code);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);

COMMENT ON TABLE gifts IS 'Подарки. После оплаты создаётся запись с claim_code для получателя';
COMMENT ON COLUMN gifts.claim_code IS 'Уникальный код для активации подарка получателем';
