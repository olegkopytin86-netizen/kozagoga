-- ═══════════════════════════════════════════════════════
-- 001_product_variants.sql
-- Расширение products + product_variants (SRS Модуль 1)
-- ═══════════════════════════════════════════════════════

-- 1. Расширение products недостающими полями
ALTER TABLE products ADD COLUMN IF NOT EXISTS activation_region   VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS validity_days       INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS instruction         TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_type       VARCHAR(50)   DEFAULT 'auto';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock               INT           DEFAULT -1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS download_url        VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS system_requirements JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images              JSONB         DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery             JSONB         DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title          VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description    TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN       DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating              NUMERIC(3,1)  DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count        INT           DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_name         VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_verified     BOOLEAN       DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type        VARCHAR(50)   DEFAULT 'digital';
  -- service | digital | physical
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency            VARCHAR(3)    DEFAULT 'RUB';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate            NUMERIC(5,2)  DEFAULT 0;
  -- НДС / VAT в процентах (0, 10, 20)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_min           NUMERIC(10,2);
  -- минимальная цена среди вариантов (для фильтрации)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_max           NUMERIC(10,2);
  -- максимальная цена среди вариантов

-- 2. Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_delivery ON products(delivery_type);

-- 3. product_variants — варианты товара
CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku             VARCHAR(100) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  old_price       NUMERIC(10,2),
  currency        VARCHAR(3) DEFAULT 'RUB',
  validity_days   INT,
  stock           INT DEFAULT -1,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  metadata        JSONB,
    -- provider_service_id, provider_params, и т.д.
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- 4. Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variants_updated_at ON product_variants;
CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Проверка: цена не может быть отрицательной
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_price_positive
  CHECK (price >= 0);

-- 6. Комментарии к таблицам и колонкам
COMMENT ON TABLE product_variants IS 'Варианты товаров (сроки, регионы, объёмы)';
COMMENT ON COLUMN products.product_type IS 'Тип товара: service | digital | physical';
COMMENT ON COLUMN products.delivery_type IS 'Способ доставки: auto | manual | key | file | subscription';
COMMENT ON COLUMN products.stock IS 'Общий остаток (-1 = неограничено)';
COMMENT ON COLUMN products.tax_rate IS 'Ставка налога в процентах (0, 10, 20...)';
COMMENT ON COLUMN product_variants.stock IS 'Остаток варианта (-1 = неограничено)';
COMMENT ON COLUMN product_variants.metadata IS 'JSON: provider_service_id, provider_params и др.';
