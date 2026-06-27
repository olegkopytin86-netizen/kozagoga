-- ═══════════════════════════════════════════════════════
-- 002_orders_state_machine.sql
-- Order state machine + налоги + мультивалютность
-- (SRS Модуль 3 + критические пробелы)
-- ═══════════════════════════════════════════════════════

-- 1. Расширение orders — добавляем недостающие поля
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency            VARCHAR(3)  DEFAULT 'RUB';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal            NUMERIC(10,2);
  -- сумма без скидок и налогов
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount          NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount     NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashback_used       NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id           UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method      VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway     VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id  VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at             TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at         TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key     VARCHAR(255) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes               TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address     JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address    JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method     VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number     VARCHAR(255);

-- 2. Индексы
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. order_items — расширение
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id         UUID REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price         NUMERIC(10,2);
  -- цена за единицу на момент покупки (snapshot)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS currency           VARCHAR(3) DEFAULT 'RUB';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate           NUMERIC(5,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount         NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivery_type      VARCHAR(50);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_status        VARCHAR(30) DEFAULT 'pending';
  -- pending | delivered | refunded | cancelled
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name       VARCHAR(255);
  -- snapshot названия на момент покупки
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name       VARCHAR(255);
  -- snapshot названия варианта
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image      VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);

-- 4. Order status check constraint (state machine)
-- Допустимые статусы заказа
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_status;

ALTER TABLE orders ADD CONSTRAINT chk_order_status
  CHECK (status IN (
    'pending',       -- создан, ожидает оплаты
    'paid',          -- оплачен, ожидает обработки
    'processing',    -- в обработке (выдача ключа, активация)
    'completed',     -- выполнен
    'cancelled',     -- отменён (до оплаты)
    'refunded',      -- возврат
    'failed',        -- ошибка обработки
    'partially_refunded'  -- частичный возврат
  ));

-- 5. Функция проверки допустимости перехода статуса
CREATE OR REPLACE FUNCTION check_order_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Разрешённые переходы:
  -- pending     → paid | cancelled | failed
  -- paid        → processing | cancelled | refunded
  -- processing  → completed | failed
  -- completed   → refunded | partially_refunded
  -- cancelled   → (none — терминальный)
  -- refunded    → (none — терминальный)
  -- failed      → pending (retry)

  IF OLD.status IS NOT NULL THEN
    -- Запрещаем переход из терминальных статусов (кроме failed→pending)
    IF OLD.status IN ('cancelled', 'refunded') AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Cannot transition from terminal status % to %', OLD.status, NEW.status;
    END IF;

    -- Запрещаем переход из completed в paid/processing
    IF OLD.status = 'completed' AND NEW.status NOT IN ('refunded', 'partially_refunded') THEN
      RAISE EXCEPTION 'Cannot transition from completed to %', NEW.status;
    END IF;

    -- Запрещаем прямой пропуск стадий (pending → completed)
    IF OLD.status = 'pending' AND NEW.status NOT IN ('paid', 'cancelled', 'failed') THEN
      RAISE EXCEPTION 'Cannot transition from pending to %. Must go through paid', NEW.status;
    END IF;
  END IF;

  -- Аудит: логируем в admin_logs (если таблица существует)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'order_status_change',
      jsonb_build_object(
        'order_id', NEW.id,
        'from', OLD.status,
        'to', NEW.status,
        'user_id', NEW.user_id
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_transition ON orders;
CREATE TRIGGER trg_order_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION check_order_status_transition();

-- 6. Автоматическое заполнение paid_at и refunded_at
CREATE OR REPLACE FUNCTION auto_set_order_timestamps()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.paid_at = NOW();
  END IF;
  IF NEW.status IN ('refunded', 'partially_refunded') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.refunded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_timestamps ON orders;
CREATE TRIGGER trg_order_timestamps
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_set_order_timestamps();

-- 7. Комментарии
COMMENT ON TABLE orders IS 'Заказы. Status — state machine с проверкой переходов';
COMMENT ON COLUMN orders.idempotency_key IS 'Ключ идемпотентности для повторной отправки платежа';
COMMENT ON COLUMN order_items.item_status IS 'Статус позиции: pending | delivered | refunded | cancelled';
COMMENT ON COLUMN order_items.unit_price IS 'Цена за единицу на момент покупки (snapshot)';
