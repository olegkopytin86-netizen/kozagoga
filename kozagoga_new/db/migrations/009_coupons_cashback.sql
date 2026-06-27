-- ═══════════════════════════════════════════════════════
-- 009_coupons_cashback.sql
-- Промокоды + Кешбэк
-- (SRS Модуль 8)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  type            VARCHAR(20) NOT NULL,
    -- fixed | percent | free_delivery
  value           NUMERIC(10,2) NOT NULL,
    -- сумма скидки или процент
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount    NUMERIC(10,2),
    -- максимальная скидка (для percent type)
  max_uses        INT DEFAULT 1,
    -- 0 = безлимит
  max_uses_per_user INT DEFAULT 1,
  used_count      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  products        UUID[],
    -- привязка к конкретным товарам
  users           UUID[],
    -- привязка к конкретным пользователям
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  order_id        UUID REFERENCES orders(id),
  discount_amount NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON coupon_uses(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_user ON coupon_uses(user_id);

-- Кешбэк
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  order_id        UUID REFERENCES orders(id),
  type            VARCHAR(20) NOT NULL,
    -- earned | redeemed | expired | adjusted
  amount          NUMERIC(10,2) NOT NULL,
  balance_before  NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_after   NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate            NUMERIC(5,2),
    -- процент кешбэка (1.0 = 1%)
  description     TEXT,
  expires_at      TIMESTAMPTZ,
    -- кешбэк сгорает через N дней
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_user ON cashback_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cb_order ON cashback_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_cb_type ON cashback_transactions(type);

ALTER TABLE cashback_transactions ADD CONSTRAINT chk_cb_amount_not_zero
  CHECK (amount != 0);

COMMENT ON TABLE coupons IS 'Промокоды: fixed/percent/free_delivery с ограничениями';
COMMENT ON TABLE cashback_transactions IS 'История начисления/списания/сгорания кешбэка';
