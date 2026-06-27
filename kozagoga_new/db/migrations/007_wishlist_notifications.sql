-- ═══════════════════════════════════════════════════════
-- 007_wishlist_notifications.sql
-- Избранное + Уведомления
-- (SRS Модуль 6)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wishlist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id),
  price_at_add    NUMERIC(10,2),
    -- цена на момент добавления (для отслеживания скидок)
  notify_on_sale  BOOLEAN DEFAULT false,
  notify_reminder DATE,
  notify_expiry   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_sale ON wishlist_items(notify_on_sale) WHERE notify_on_sale = true;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,
    -- sale_alert | reminder | subscription_expiry | order_update | gift_received
    -- loyalty_level_up | referral_bonus | support_reply
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  data            JSONB,
    -- метаданные для deep link: { link, order_id, product_id }
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

COMMENT ON TABLE wishlist_items IS 'Избранное пользователя с опциями уведомлений';
COMMENT ON TABLE notifications IS 'Системные уведомления (in-app, push-база)';
