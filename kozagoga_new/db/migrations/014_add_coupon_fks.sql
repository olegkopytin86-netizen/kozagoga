-- ═══════════════════════════════════════════════════════
-- 014_add_coupon_fks.sql
-- Добавление FK-ограничений на coupons (после создания таблицы)
-- ═══════════════════════════════════════════════════════

-- Orders → coupons
ALTER TABLE orders ADD CONSTRAINT fk_orders_coupon
  FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  NOT VALID;  -- NOT VALID = не проверяет существующие данные
  -- После валидации: ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_coupon;

-- Carts → coupons
ALTER TABLE carts ADD CONSTRAINT fk_carts_coupon
  FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  NOT VALID;

COMMENT ON CONSTRAINT fk_orders_coupon ON orders IS 'Связь заказа с промокодом (NOT VALID для существующих записей)';
COMMENT ON CONSTRAINT fk_carts_coupon ON carts IS 'Связь корзины с промокодом (NOT VALID для существующих записей)';
