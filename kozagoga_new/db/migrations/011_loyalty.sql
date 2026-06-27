-- ═══════════════════════════════════════════════════════
-- 011_loyalty.sql
-- Программа лояльности
-- (SRS Модуль 10)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS loyalty_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20) UNIQUE NOT NULL,
    -- bronze | silver | gold | platinum
  name            VARCHAR(50) NOT NULL,
    -- "Бронза" | "Серебро" | "Золото" | "Платина"
  min_spent       NUMERIC(10,2) NOT NULL,
    -- минимальная сумма покупок для уровня
  cashback_rate   NUMERIC(5,2) DEFAULT 0,
    -- 0.5 | 1.0 | 2.0 | 5.0 (процент)
  discount_percent NUMERIC(5,2) DEFAULT 0,
  free_delivery   BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  early_access    BOOLEAN DEFAULT false,
  badge_icon      VARCHAR(100),
  sort_order      INT DEFAULT 0,
  color_hex       VARCHAR(7) DEFAULT '#CD7F32',
    -- цвет бейджа (CD7F32=бронза, C0C0C0=серебро, FFD700=золото, E5E4E2=платина)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_loyalty (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) UNIQUE,
  level_id        UUID NOT NULL REFERENCES loyalty_levels(id),
  total_spent     NUMERIC(10,2) DEFAULT 0,
    -- общая сумма покупок за всё время
  period_spent    NUMERIC(10,2) DEFAULT 0,
    -- за текущий период (для понижения уровня)
  level_upgraded_at TIMESTAMPTZ,
  level_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Базовая вставка уровней (seed)
INSERT INTO loyalty_levels (code, name, min_spent, cashback_rate, discount_percent, free_delivery, priority_support, sort_order, color_hex)
VALUES
  ('bronze', 'Бронза', 0,     0.5,  0, false, false, 0, '#CD7F32'),
  ('silver', 'Серебро', 5000, 1.0,  3, false, false, 1, '#C0C0C0'),
  ('gold',   'Золото',  20000, 2.0,  5, true,  false, 2, '#FFD700'),
  ('platinum', 'Платина', 100000, 5.0, 10, true,  true,  3, '#E5E4E2')
ON CONFLICT (code) DO NOTHING;

-- Функция: пересчёт уровня пользователя
CREATE OR REPLACE FUNCTION recalc_user_loyalty(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_total_spent NUMERIC(10,2);
  v_new_level_id UUID;
  v_current_level_id UUID;
  v_level_upgraded BOOLEAN;
BEGIN
  -- Общая сумма завершённых заказов
  SELECT COALESCE(SUM(total), 0) INTO v_total_spent
  FROM orders
  WHERE user_id = p_user_id AND status = 'completed';

  -- Наивысший достижимый уровень
  SELECT id INTO v_new_level_id
  FROM loyalty_levels
  WHERE min_spent <= v_total_spent
  ORDER BY min_spent DESC
  LIMIT 1;

  IF v_new_level_id IS NULL THEN
    SELECT id INTO v_new_level_id FROM loyalty_levels ORDER BY min_spent ASC LIMIT 1;
  END IF;

  -- Текущий уровень пользователя
  SELECT level_id INTO v_current_level_id
  FROM user_loyalty
  WHERE user_id = p_user_id;

  IF v_current_level_id IS NULL THEN
    -- Создаём запись
    INSERT INTO user_loyalty (user_id, level_id, total_spent, level_upgraded_at, level_changed_at)
    VALUES (p_user_id, v_new_level_id, v_total_spent, NOW(), NOW());
    RETURN v_new_level_id;
  END IF;

  -- Проверяем, изменился ли уровень
  IF v_current_level_id != v_new_level_id THEN
    UPDATE user_loyalty
    SET level_id = v_new_level_id,
        total_spent = v_total_spent,
        level_changed_at = NOW(),
        level_upgraded_at = CASE WHEN v_new_level_id > v_current_level_id THEN NOW() ELSE level_upgraded_at END
    WHERE user_id = p_user_id;

    -- Уведомление о повышении
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      p_user_id,
      'loyalty_level_up',
      'Поздравляем! Уровень повышен!',
      'Ваш уровень лояльности повышен. Проверьте новые привилегии в профиле.'
    );
  ELSE
    -- Просто обновляем сумму
    UPDATE user_loyalty
    SET total_spent = v_total_spent, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_new_level_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE loyalty_levels IS 'Уровни программы лояльности с бенефитами';
COMMENT ON TABLE user_loyalty IS 'Текущий уровень и прогресс пользователя';
COMMENT ON FUNCTION recalc_user_loyalty IS 'Пересчёт уровня лояльности пользователя на основе суммы покупок';
