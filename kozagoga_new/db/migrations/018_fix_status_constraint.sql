-- ═══════════════════════════════════════════════════════
-- 018_fix_status_constraint.sql
-- Удаляем устаревший CHECK constraint для orders.status
-- (orders_status_check не включает failed/refunded/partially_refunded)
-- ═══════════════════════════════════════════════════════

-- Устаревший constraint (не включает новые статусы)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Проверяем, что chk_order_status существует и покрывает все статусы
-- (должен: pending, paid, processing, completed, cancelled, refunded, failed, partially_refunded)
