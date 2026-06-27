-- ═══════════════════════════════════════════════════════
-- 015_products_missing_fields.sql
-- Добавление недостающих полей products, найденных при тестировании
-- ═══════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order       INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url        VARCHAR(500);
  -- legacy fallback (основное изображение теперь в images[0])
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active        BOOLEAN DEFAULT true;
  -- если колонка уже существует — NOT VALID (иначе будет ошибка)

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order, created_at DESC);

-- Добавляем is_active CHECK если колонка существует
-- (используем DO для избежания ошибки если колонки нет)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_active') THEN
    -- колонка уже есть, триггер и так работает
    RAISE NOTICE 'is_active already exists';
  END IF;
END $$;

-- Обновляем price_min/price_max для существующих продуктов
UPDATE products SET
  price_min = COALESCE((SELECT MIN(price) FROM product_variants WHERE product_id = products.id AND is_active = true), price),
  price_max = COALESCE((SELECT MAX(price) FROM product_variants WHERE product_id = products.id AND is_active = true), price)
WHERE price_min IS NULL;

COMMENT ON COLUMN products.sort_order IS 'Порядок сортировки в каталоге';
COMMENT ON COLUMN products.image_url IS 'URL основного изображения (legacy, используйте images[0])';
