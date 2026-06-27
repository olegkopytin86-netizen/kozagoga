-- ═══════════════════════════════════════════════════════
-- 010_referrals.sql
-- Реферальная программа
-- (SRS Модуль 9)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referral_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) UNIQUE,
  code            VARCHAR(20) UNIQUE NOT NULL,
  referral_count  INT DEFAULT 0,
  total_earned    NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_ref_user ON referral_codes(user_id);

CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES users(id),
  referred_id     UUID NOT NULL REFERENCES users(id) UNIQUE,
  code_id         UUID NOT NULL REFERENCES referral_codes(id),
  status          VARCHAR(20) DEFAULT 'pending',
    -- pending | converted | rewarded
  first_order_id  UUID REFERENCES orders(id),
  reward_amount   NUMERIC(10,2),
  reward_given    BOOLEAN DEFAULT false,
  reward_given_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_status ON referrals(status);

-- Функция: начисление бонуса рефереру после первой покупки реферала
CREATE OR REPLACE FUNCTION reward_referrer(p_order_id UUID)
RETURNS NUMERIC(10,2) AS $$
DECLARE
  v_referrer_id  UUID;
  v_reward       NUMERIC(10,2) := 200;  -- configurable
BEGIN
  -- Найти реферала по заказу
  SELECT r.referrer_id INTO v_referrer_id
  FROM referrals r
  JOIN orders o ON o.user_id = r.referred_id
  WHERE o.id = p_order_id AND o.status = 'completed'
    AND r.status = 'pending'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Начислить бонус
  INSERT INTO cashback_transactions (user_id, order_id, type, amount, balance_before, balance_after, description)
  VALUES (
    v_referrer_id, NULL, 'earned', v_reward,
    COALESCE((SELECT balance FROM wallet_balances WHERE user_id = v_referrer_id), 0),
    COALESCE((SELECT balance FROM wallet_balances WHERE user_id = v_referrer_id), 0) + v_reward,
    'Реферальный бонус'
  );

  UPDATE wallet_balances SET balance = balance + v_reward
  WHERE user_id = v_referrer_id;

  UPDATE referrals SET status = 'rewarded', reward_amount = v_reward, reward_given = true, reward_given_at = NOW()
  WHERE referrer_id = v_referrer_id AND referred_id = (SELECT user_id FROM orders WHERE id = p_order_id);

  UPDATE referral_codes SET total_earned = total_earned + v_reward, referral_count = referral_count + 1
  WHERE user_id = v_referrer_id;

  RETURN v_reward;
END;
$$ LANGUAGE plpgsql;

-- Функция генерации читаемого реферального кода
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_name VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_suffix VARCHAR(10);
  v_code   VARCHAR(20);
BEGIN
  v_prefix := upper(substring(regexp_replace(p_user_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6));
  IF v_prefix = '' THEN v_prefix := 'USER'; END IF;

  -- Генерация уникального кода
  LOOP
    v_suffix := upper(substr(md5(random()::text), 1, 6));
    v_code := v_prefix || '-' || v_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE referral_codes IS 'Реферальные коды пользователей';
COMMENT ON TABLE referrals IS 'Связь реферер → реферал';
COMMENT ON FUNCTION reward_referrer IS 'Начисление бонуса рефереру при первой покупке реферала';
