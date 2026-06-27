-- ═══════════════════════════════════════════════════════
-- 005_key_pool_delivery.sql
-- Пул ключей + цифровая доставка
-- (SRS Модуль 2 — Digital Delivery)
-- ═══════════════════════════════════════════════════════

-- 1. Пул ключей/кодов (загружается поставщиком)
CREATE TABLE IF NOT EXISTS key_pool (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  batch_id        UUID,
    -- для групповой загрузки
  value           TEXT NOT NULL,
    -- сам ключ/код (AES-256 шифрованный на уровне приложения)
  value_hash      VARCHAR(64) NOT NULL UNIQUE,
    -- sha256(value) для поиска дублей
  type            VARCHAR(20) NOT NULL,
    -- key | code | link | file
  meta            JSONB,
    -- доп. данные (логин, ссылка на активацию)
  is_sold         BOOLEAN DEFAULT false,
  sold_at         TIMESTAMPTZ,
  order_item_id   UUID,
  expires_at      TIMESTAMPTZ,
    -- срок годности ключа
  supplier        VARCHAR(100),
  cost_price      NUMERIC(10,2),
    -- закупочная цена (для аналитики)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_key_pool_product ON key_pool(product_id);
CREATE INDEX IF NOT EXISTS idx_key_pool_unsold ON key_pool(product_id, variant_id) WHERE is_sold = false;
CREATE INDEX IF NOT EXISTS idx_key_pool_hash ON key_pool(value_hash);
CREATE INDEX IF NOT EXISTS idx_key_pool_batch ON key_pool(batch_id);

-- 2. Выданные ключи (покупателю)
CREATE TABLE IF NOT EXISTS digital_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID NOT NULL REFERENCES order_items(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  key_pool_id     UUID REFERENCES key_pool(id),
    -- NULL для auto-activation (service type)
  type            VARCHAR(20) NOT NULL,
    -- key | code | link | file | activation
  value_encrypted TEXT,
    -- зашифрованный ключ (AES-256) — дубль для безопасности
  is_revealed     BOOLEAN DEFAULT false,
  revealed_at     TIMESTAMPTZ,
  max_reveals     INT DEFAULT 3,
  reveal_count    INT DEFAULT 0,
  activated_at    TIMESTAMPTZ,
  auto_activated  BOOLEAN DEFAULT false,
  delivery_method VARCHAR(20) DEFAULT 'screen',
    -- screen | email | profile
  email_sent      BOOLEAN DEFAULT false,
  email_sent_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_order ON digital_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_dd_order_item ON digital_deliveries(order_item_id);
CREATE INDEX IF NOT EXISTS idx_dd_product ON digital_deliveries(product_id);
CREATE INDEX IF NOT EXISTS idx_dd_revealed ON digital_deliveries(order_item_id, is_revealed);

-- 3. Функция резервирования ключа (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION reserve_key(
  p_product_id  UUID,
  p_variant_id  UUID,
  p_order_item_id UUID,
  p_order_id    UUID
) RETURNS UUID AS $$
DECLARE
  v_key_id UUID;
  v_value  TEXT;
BEGIN
  -- Атомарное получение ключа с блокировкой
  SELECT id, value INTO v_key_id, v_value
  FROM key_pool
  WHERE product_id = p_product_id
    AND (variant_id = p_variant_id OR variant_id IS NULL)
    AND is_sold = false
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'No available keys for product % variant %', p_product_id, p_variant_id;
  END IF;

  -- Помечаем как проданный
  UPDATE key_pool
  SET is_sold = true, sold_at = NOW(), order_item_id = p_order_item_id
  WHERE id = v_key_id;

  -- Создаём запись доставки
  INSERT INTO digital_deliveries (
    order_id, order_item_id, product_id, variant_id,
    key_pool_id, type, value_encrypted, delivery_method
  )
  SELECT p_order_id, p_order_item_id, p_product_id, p_variant_id,
         v_key_id, kp.type, kp.value, 'screen'
  FROM key_pool kp WHERE kp.id = v_key_id;

  -- Уменьшаем остаток
  UPDATE products SET stock = CASE WHEN stock > 0 THEN stock - 1 ELSE stock END
  WHERE id = p_product_id AND stock >= 0;

  RETURN v_key_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE key_pool IS 'Пул загруженных ключей/кодов. AES-256 шифрование на уровне приложения';
COMMENT ON TABLE digital_deliveries IS 'Журнал выдачи цифровых товаров покупателям';
COMMENT ON FUNCTION reserve_key IS 'Атомарное резервирование ключа с FOR UPDATE SKIP LOCKED';
