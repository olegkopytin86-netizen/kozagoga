-- ═══════════════════════════════════════════════════════
-- 019_provider_delivery_flow.sql
-- Модель данных для доставки услуг через внешних провайдеров
-- FR-DELIVERY-06 (idempotency), FR-DELIVERY-08 (alerts)
-- ═══════════════════════════════════════════════════════

-- 1. Таблица алертов (FR-DELIVERY-08)
CREATE TABLE IF NOT EXISTS alerts (
  id              SERIAL PRIMARY KEY,
  type            VARCHAR(50) NOT NULL,
  priority        VARCHAR(20) NOT NULL DEFAULT 'high',
  order_id        UUID REFERENCES orders(id),
  transaction_id  VARCHAR(100),
  provider_code   VARCHAR(50),
  message         TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'new',  -- new | sent | resolved
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

COMMENT ON TABLE alerts IS 'Системные алерты для админов (FR-DELIVERY-08)';
COMMENT ON COLUMN alerts.type IS 'provider_delivery_failed | provider_payment_failed | polling_timeout | refund_failed';
COMMENT ON COLUMN alerts.priority IS 'high | critical';

-- 2. Idempotency key для webhook (FR-DELIVERY-06, уровень 1)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN payments.idempotency_key IS 'Уникальный ключ идемпотентности для webhook (mdOrder_operation)';

-- 3. Поля для провайдера в order_items (FR-DELIVERY-02)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS provider_account VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN order_items.provider_account IS 'Реквизит/account для отправки провайдеру (из inputs)';

-- 4. Расширение orders для провайдер-статусов
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN orders.provider_transaction_id IS 'ID транзакции у внешнего провайдера (package_id)';
COMMENT ON COLUMN orders.provider_status IS 'Нормализованный статус провайдера: INPROGRESS | COMPLETE | FAILURE | CANCELLED | UNEXPECTED_ERROR | delivery_failed';
