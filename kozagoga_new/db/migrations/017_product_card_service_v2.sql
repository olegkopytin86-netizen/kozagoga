-- ═══════════════════════════════════════════════════════
-- 017_product_card_service_v2.sql
-- Модель услуг, регионов и динамических полей (SRS Модуль Product Card)
-- Архитектура: product → services → regions → input_fields
-- ═══════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- 1. ПЕРЕИМЕНОВАНИЕ: item_status → delivery_status
-- ═══════════════════════════════════════════════════════

-- Сначала дропаем индекс на старом имени
DROP INDEX IF EXISTS idx_order_items_status;

-- Затем переименовываем колонку
ALTER TABLE order_items RENAME COLUMN item_status TO delivery_status;

-- Создаём индекс на новом имени
CREATE INDEX IF NOT EXISTS idx_oi_delivery_status ON order_items(delivery_status);

-- ═══════════════════════════════════════════════════════
-- 2. НОВЫЕ КОЛОНКИ В order_items
-- ═══════════════════════════════════════════════════════

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS service_id            UUID,                          -- FK → product_services (добавится позже)
  ADD COLUMN IF NOT EXISTS region_id             UUID,                          -- FK → service_regions (добавится позже)
  ADD COLUMN IF NOT EXISTS service_name          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS region_name           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS region_code           VARCHAR(10),
  ADD COLUMN IF NOT EXISTS total_price           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS external_id           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_response     JSONB,
  ADD COLUMN IF NOT EXISTS result_value          TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message         TEXT;

-- ═══════════════════════════════════════════════════════
-- 3. НОВЫЕ КОЛОНКИ В orders
-- ═══════════════════════════════════════════════════════

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_email              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway_status          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_config_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS metadata                JSONB;

-- Индекс на created_at (для админки)
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- ═══════════════════════════════════════════════════════
-- 4. НОВЫЕ КОЛОНКИ В transactions
-- ═══════════════════════════════════════════════════════

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS service_id      UUID,
  ADD COLUMN IF NOT EXISTS direction       VARCHAR(10)  DEFAULT 'outgoing',
  ADD COLUMN IF NOT EXISTS retry_attempt   INT          DEFAULT 0;

-- ═══════════════════════════════════════════════════════
-- 5. НОВЫЕ ТАБЛИЦЫ
-- ═══════════════════════════════════════════════════════

-- 5.1. УСЛУГИ ПРОДУКТА
CREATE TABLE IF NOT EXISTS product_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  description       TEXT,
  is_active         BOOLEAN DEFAULT true,
  sort_order        INT DEFAULT 0,
  image_url         VARCHAR(500),
  billing_interval  VARCHAR(20),   -- month | quarter | year | one_time. NULL = разовый
  billing_count     INT DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ps_product ON product_services(product_id);
CREATE INDEX IF NOT EXISTS idx_ps_active ON product_services(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_product_services_updated_at ON product_services;
CREATE TRIGGER trg_product_services_updated_at
  BEFORE UPDATE ON product_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.2. РЕГИОНЫ УСЛУГИ
CREATE TABLE IF NOT EXISTS service_regions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        UUID NOT NULL REFERENCES product_services(id) ON DELETE CASCADE,
  region_code       VARCHAR(10) NOT NULL,              -- "RU", "KZ", "US", "ALL"
  region_name       VARCHAR(255) NOT NULL,
  base_price        NUMERIC(10,2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'RUB',
  old_price         NUMERIC(10,2),
  price_multiplier  NUMERIC(5,2) DEFAULT 1.00,
  is_active         BOOLEAN DEFAULT true,
  sort_order        INT DEFAULT 0,
  min_amount        NUMERIC(10,2),
  max_amount        NUMERIC(10,2),
  fixed_amounts     NUMERIC(10,2)[],
  region_flag_url   VARCHAR(500),
  instruction       TEXT,
  requires_phone    BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, region_code)
);

CREATE INDEX IF NOT EXISTS idx_sr_service ON service_regions(service_id);
CREATE INDEX IF NOT EXISTS idx_sr_active ON service_regions(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_service_regions_updated_at ON service_regions;
CREATE TRIGGER trg_service_regions_updated_at
  BEFORE UPDATE ON service_regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.3. ПОЛЯ ВВОДА ДЛЯ УСЛУГИ
CREATE TABLE IF NOT EXISTS service_input_fields (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        UUID NOT NULL REFERENCES product_services(id) ON DELETE CASCADE,
  field_key         VARCHAR(50) NOT NULL,               -- "login", "email", "phone"
  field_label       VARCHAR(255) NOT NULL,              -- "Логин Steam"
  field_type        VARCHAR(30) NOT NULL,               -- "text" | "email" | "tel" | "textarea" | "select"
  validation_regex  VARCHAR(500),
  validation_error  VARCHAR(255),
  placeholder       VARCHAR(255),
  is_required       BOOLEAN DEFAULT true,
  max_length        INT DEFAULT 255,
  sort_order        INT DEFAULT 0,
  options           JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sif_service ON service_input_fields(service_id);

-- 5.4. МАППИНГ УСЛУГА → ВНЕШНИЙ ПРОВАЙДЕР
CREATE TABLE IF NOT EXISTS service_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        UUID NOT NULL REFERENCES product_services(id) ON DELETE CASCADE,
  provider_code     VARCHAR(50) NOT NULL,
  endpoint          VARCHAR(255) NOT NULL,
  http_method       VARCHAR(10) DEFAULT 'POST',
  body_template     JSONB NOT NULL,
  headers_override  JSONB,
  timeout_ms        INT DEFAULT 15000,
  retry_count       INT DEFAULT 3,
  retry_delay_ms    INT DEFAULT 1000,
  response_mapping  JSONB,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_service ON service_providers(service_id);
CREATE INDEX IF NOT EXISTS idx_sp_active ON service_providers(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_service_providers_updated_at ON service_providers;
CREATE TRIGGER trg_service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.5. КОНФИГУРАЦИЯ ПРОВАЙДЕРОВ
CREATE TABLE IF NOT EXISTS provider_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code         VARCHAR(50) NOT NULL UNIQUE,
  provider_name         VARCHAR(255) NOT NULL,
  base_url              VARCHAR(500) NOT NULL,
  auth_type             VARCHAR(30) DEFAULT 'api_key',
  auth_credentials      JSONB,
  default_headers       JSONB,
  default_timeout_ms    INT DEFAULT 15000,
  rate_limit_rps        INT DEFAULT 10,
  circuit_breaker       JSONB,
  health_check_url      VARCHAR(500),
  health_check_interval_ms INT DEFAULT 60000,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_provider_configs_updated_at ON provider_configs;
CREATE TRIGGER trg_provider_configs_updated_at
  BEFORE UPDATE ON provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.6. ИСТОРИЯ СТАТУСОВ ЗАКАЗА
CREATE TABLE IF NOT EXISTS order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status     VARCHAR(30),
  to_status       VARCHAR(30) NOT NULL,
  changed_by      VARCHAR(50) DEFAULT 'system',
  reason          TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osh_order ON order_status_history(order_id);

-- 5.7. ВВОД ПОЛЬЗОВАТЕЛЯ ПО ПОЗИЦИИ
CREATE TABLE IF NOT EXISTS order_item_inputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id   UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  field_key       VARCHAR(50) NOT NULL,
  field_label     VARCHAR(255),
  field_type      VARCHAR(30),
  value           TEXT NOT NULL,
  value_sha256    VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oi_input ON order_item_inputs(order_item_id);

-- ═══════════════════════════════════════════════════════
-- 6. FOREIGN KEY (после создания таблиц)
-- ═══════════════════════════════════════════════════════

-- FK для order_items (если колонки существуют, но constraint нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_oi_service'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'service_id'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT fk_oi_service
      FOREIGN KEY (service_id) REFERENCES product_services(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_oi_region'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT fk_oi_region
      FOREIGN KEY (region_id) REFERENCES service_regions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tx_service'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'service_id'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT fk_tx_service
      FOREIGN KEY (service_id) REFERENCES product_services(id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- 7. КОММЕНТАРИИ
-- ═══════════════════════════════════════════════════════

COMMENT ON TABLE product_services IS 'Услуги продукта (например Steam: "Пополнение кошелька", "Подарочная карта")';
COMMENT ON TABLE service_regions IS 'Цены и настройки услуг по регионам';
COMMENT ON TABLE service_input_fields IS 'Поля ввода для услуги (логин, email, телефон и т.д.)';
COMMENT ON TABLE service_providers IS 'Маппинг услуги на внешнего провайдера';
COMMENT ON TABLE provider_configs IS 'Конфигурация внешних API-провайдеров';
COMMENT ON TABLE order_status_history IS 'Аудит переходов статусов заказа';
COMMENT ON TABLE order_item_inputs IS 'Сохранённые значения полей ввода по позиции заказа';

COMMENT ON COLUMN order_items.delivery_status IS 'Статус доставки позиции: pending, processing, delivered, failed';
COMMENT ON COLUMN order_items.service_id IS 'Ссылка на услугу продукта';
COMMENT ON COLUMN order_items.region_id IS 'Ссылка на регион услуги';
COMMENT ON COLUMN order_items.external_id IS 'ID транзакции у внешнего провайдера';
COMMENT ON COLUMN order_items.external_response IS 'Полный ответ от внешнего провайдера';
COMMENT ON COLUMN order_items.result_value IS 'Результат доставки (ключ, код, подтверждение)';

COMMENT ON COLUMN orders.service_config_snapshot IS 'Слепок конфига услуг на момент заказа';
COMMENT ON COLUMN transactions.direction IS 'Направление: outgoing (к провайдеру) / incoming (от провайдера)';
COMMENT ON COLUMN transactions.retry_attempt IS 'Номер попытки при retry';

-- ═══════════════════════════════════════════════════════
-- 8. ВАЛИДАЦИЯ: цена не может быть отрицательной
-- ═══════════════════════════════════════════════════════

ALTER TABLE service_regions ADD CONSTRAINT chk_sr_price_positive
  CHECK (base_price >= 0);

ALTER TABLE product_services ADD CONSTRAINT chk_ps_billing_interval
  CHECK (billing_interval IS NULL OR billing_interval IN ('one_time', 'month', 'quarter', 'year'));

COMMENT ON COLUMN product_services.billing_interval IS 'Периодичность: one_time | month | quarter | year. NULL = разовый товар (сосуществует с product_variants)';
