-- ============================================
-- Performance Indexes — Migration 003
-- Ускоряет публичное API, логи, админ-панель
-- ============================================

BEGIN;

-- Для публичного API: фильтрация по slug, is_active, is_featured
CREATE INDEX IF NOT EXISTS idx_products_slug_active ON products(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured_active ON products(is_featured) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id) WHERE is_active = true;

-- Для поиска (ILIKE)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_short_desc_trgm ON products USING gin (short_description gin_trgm_ops);

-- Для пагинации и сортировки
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order, created_at DESC);

-- Для категорий: активные + сортировка
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories(is_active, sort_order) WHERE is_active = true;

-- Для логов: уровень + дата
CREATE INDEX IF NOT EXISTS idx_system_logs_combo ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component, created_at DESC);

-- Для админ-логов: дата
CREATE INDEX IF NOT EXISTS idx_admin_logs_combo ON admin_logs(created_at DESC);

-- Для заказов: статус + дата (админ-панель)
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, created_at DESC);

-- Для wallet: тип + дата
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_date ON wallet_transactions(user_id, created_at DESC);

COMMIT;
