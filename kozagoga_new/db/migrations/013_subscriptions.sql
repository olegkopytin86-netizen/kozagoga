-- ═══════════════════════════════════════════════════════
-- 013_subscriptions.sql
-- Подписки и автопродления
-- (SRS Модуль 5)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  variant_id          UUID REFERENCES product_variants(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
    -- active | paused | cancelled | expired | payment_failed
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end  TIMESTAMPTZ NOT NULL,
  trial_end           TIMESTAMPTZ,
  auto_renew          BOOLEAN DEFAULT true,
  payment_method      VARCHAR(50),
  payment_gateway     VARCHAR(50),
  gateway_subscription_id VARCHAR(255),
    -- если шлюз поддерживает рекуррент
  price               NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'RUB',
  billing_interval    VARCHAR(20) NOT NULL,
    -- month | quarter | year
  billing_count       INT DEFAULT 1,
    -- каждые N месяцев
  renewal_count       INT DEFAULT 0,
  last_renewal_at     TIMESTAMPTZ,
  next_renewal_at     TIMESTAMPTZ,
  failed_attempts     INT DEFAULT 0,
  max_failed_attempts INT DEFAULT 3,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       VARCHAR(50),
    -- user | payment_failed | admin
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_renewal ON subscriptions(next_renewal_at)
  WHERE status = 'active' AND auto_renew = true;

CREATE TABLE IF NOT EXISTS subscription_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  event_type      VARCHAR(50) NOT NULL,
    -- created | renewed | cancelled | paused | resumed | payment_failed | expired
  amount          NUMERIC(10,2),
  currency        VARCHAR(3),
  details         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_subs ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type);

-- Функция: продление подписки
CREATE OR REPLACE FUNCTION renew_subscription(p_subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
  v_new_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id FOR UPDATE;

  IF v_sub.status != 'active' OR v_sub.auto_renew = false THEN
    RETURN false;
  END IF;

  -- Рассчитываем новый период
  v_new_end := v_sub.current_period_end + (
    CASE v_sub.billing_interval
      WHEN 'month' THEN INTERVAL '1 month' * v_sub.billing_count
      WHEN 'quarter' THEN INTERVAL '3 months' * v_sub.billing_count
      WHEN 'year' THEN INTERVAL '1 year' * v_sub.billing_count
      ELSE INTERVAL '1 month'
    END
  );

  -- Обновляем подписку
  UPDATE subscriptions SET
    current_period_start = current_period_end,
    current_period_end = v_new_end,
    next_renewal_at = v_new_end,
    renewal_count = renewal_count + 1,
    last_renewal_at = NOW()
  WHERE id = p_subscription_id;

  -- Логируем событие
  INSERT INTO subscription_events (subscription_id, event_type, amount, currency)
  VALUES (p_subscription_id, 'renewed', v_sub.price, v_sub.currency);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE subscriptions IS 'Подписки с автопродлением и управлением статусами';
COMMENT ON TABLE subscription_events IS 'Аудит событий подписки';
COMMENT ON FUNCTION renew_subscription IS 'Продление подписки на следующий период';
