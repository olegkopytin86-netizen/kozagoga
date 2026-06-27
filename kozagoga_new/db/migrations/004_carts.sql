-- ═══════════════════════════════════════════════════════
-- 004_carts.sql
-- Серверная корзина + cart_items
-- (SRS Модуль 3)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS carts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id      VARCHAR(100),
    -- для анонимных пользователей
  status          VARCHAR(20) DEFAULT 'active',
    -- active | checked_out | abandoned
  total           NUMERIC(10,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'RUB',
  coupon_id       UUID, -- FK added in 014_add_coupon_fks.sql
  discount_amount NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Одна активная корзина на пользователя (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_user_active ON carts(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS cart_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  quantity        INT NOT NULL DEFAULT 1,
  price           NUMERIC(10,2) NOT NULL,
    -- цена на момент добавления (snapshot)
  currency        VARCHAR(3) DEFAULT 'RUB',
  gift_to         VARCHAR(255),
    -- email/телефон получателя (для подарков)
  gift_message    TEXT,
  gift_from_name  VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- Проверка: количество > 0
ALTER TABLE cart_items ADD CONSTRAINT chk_cart_item_quantity
  CHECK (quantity > 0);

-- Триггер: пересчёт total корзины при изменении cart_items
CREATE OR REPLACE FUNCTION recalc_cart_total()
RETURNS trigger AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cart_id := OLD.cart_id;
  ELSE
    v_cart_id := NEW.cart_id;
  END IF;

  UPDATE carts
  SET total = (
    SELECT COALESCE(SUM(price * quantity), 0)
    FROM cart_items
    WHERE cart_id = v_cart_id
  ),
  updated_at = NOW()
  WHERE id = v_cart_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cart_total_insert ON cart_items;
CREATE TRIGGER trg_cart_total_insert
  AFTER INSERT ON cart_items
  FOR EACH ROW EXECUTE FUNCTION recalc_cart_total();

DROP TRIGGER IF EXISTS trg_cart_total_update ON cart_items;
CREATE TRIGGER trg_cart_total_update
  AFTER UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION recalc_cart_total();

DROP TRIGGER IF EXISTS trg_cart_total_delete ON cart_items;
CREATE TRIGGER trg_cart_total_delete
  AFTER DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION recalc_cart_total();

-- Функция: слияние корзин анонима и пользователя при логине
CREATE OR REPLACE FUNCTION merge_carts(p_session_id VARCHAR, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_session_cart_id UUID;
  v_user_cart_id UUID;
  v_merged_cart_id UUID;
BEGIN
  -- Находим корзину сессии
  SELECT id INTO v_session_cart_id
  FROM carts
  WHERE session_id = p_session_id AND status = 'active'
  LIMIT 1;

  -- Находим корзину пользователя
  SELECT id INTO v_user_cart_id
  FROM carts
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- Если нет корзины сессии — возвращаем пользовательскую
  IF v_session_cart_id IS NULL THEN
    RETURN v_user_cart_id;
  END IF;

  -- Если нет пользовательской — привязываем сессионную к пользователю
  IF v_user_cart_id IS NULL THEN
    UPDATE carts SET user_id = p_user_id, session_id = NULL
    WHERE id = v_session_cart_id;
    RETURN v_session_cart_id;
  END IF;

  -- Есть обе — переносим items из сессионной в пользовательскую
  INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price, currency, gift_to, gift_message, gift_from_name)
  SELECT v_user_cart_id, ci.product_id, ci.variant_id, ci.quantity, ci.price, ci.currency, ci.gift_to, ci.gift_message, ci.gift_from_name
  FROM cart_items ci
  WHERE ci.cart_id = v_session_cart_id
  ON CONFLICT DO NOTHING;

  -- Помечаем сессионную как checked_out
  UPDATE carts SET status = 'checked_out', user_id = p_user_id
  WHERE id = v_session_cart_id;

  RETURN v_user_cart_id;
END;
$$ LANGUAGE plpgsql;

-- Очистка просроченных корзин (CRON)
CREATE OR REPLACE FUNCTION cleanup_abandoned_carts()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE carts
  SET status = 'abandoned'
  WHERE status = 'active' AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE carts IS 'Серверная корзина. Одна активная на пользователя или анонимную сессию';
COMMENT ON TABLE cart_items IS 'Позиции корзины с snapshot цен на момент добавления';
COMMENT ON FUNCTION merge_carts IS 'Слияние анонимной корзины с пользовательской при логине';
