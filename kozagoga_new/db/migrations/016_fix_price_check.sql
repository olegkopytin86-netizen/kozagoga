-- ═══════════════════════════════════════════════════════
-- 016_fix_price_check.sql
-- Добавление CHECK-констрейнтов для цен
-- ═══════════════════════════════════════════════════════

ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_product_price_positive;
ALTER TABLE products ADD CONSTRAINT chk_product_price_positive
  CHECK (price >= 0);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_price_positive;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_price_positive
  CHECK (price >= 0);
