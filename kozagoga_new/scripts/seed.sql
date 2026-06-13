-- Seed data for Kozagogo Marketplace

-- Categories
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
  ('Игры', 'games', 'Цифровые версии игр, ключи и дополнения', '🎮', 1),
  ('Пополнение кошельков', 'top-ups', 'Пополнение игровых кошельков и платёжных систем', '💰', 2),
  ('Подарочные карты', 'gift-cards', 'Подарочные карты магазинов и сервисов', '🎁', 3),
  ('Подписки', 'subscriptions', 'Подписки на сервисы и игры', '📱', 4),
  ('Аккаунты', 'accounts', 'Готовые игровые аккаунты', '👤', 5),
  ('Услуги', 'services', 'Цифровые услуги и бусты', '⚡', 6)
ON CONFLICT (slug) DO NOTHING;

-- Products
INSERT INTO products (name, slug, description, short_description, price, old_price, category_id, delivery_time, region, rating, review_count, stock, is_active, is_featured, seller_name, seller_verified, features, faq, tags) VALUES
  ('Valorant — 1000 VP', 'valorant-1000-vp', 'Пополнение счётчика Valorant Points на 1000 VP. Мгновенная доставка на ваш аккаунт Riot Games.', '1000 VP для Valorant', 799, 899, (SELECT id FROM categories WHERE slug = 'top-ups'), 'Мгновенно', 'Россия', 4.8, 234, 999, true, true, 'Kozagogo Official', true, '["1000 VP на ваш аккаунт","Мгновенная доставка","Работает во всех регионах","Поддержка 24/7"]'::jsonb, '[{"question":"Как получить VP?","answer":"После оплаты укажите ваш Riot ID, и мы отправим VP в течение минуты."},{"question":"Работает ли в РФ?","answer":"Да, пополнение работает для аккаунтов всех регионов."}]'::jsonb, '["valorant","vp","riot","пополнение"]'::jsonb),
  ('Steam Gift Card 500 ₽', 'steam-gift-card-500', 'Подарочная карта Steam номиналом 500 рублей.', 'Подарочная карта Steam на 500 ₽', 500, NULL, (SELECT id FROM categories WHERE slug = 'gift-cards'), '1–5 минут', 'Россия', 4.9, 567, 500, true, true, 'Kozagogo Official', true, '["Номинал 500 ₽","Активация в Steam","Пополнение кошелька"]'::jsonb, '[{"question":"Как активировать?","answer":"Код придёт на email. Активируйте в клиенте Steam."}]'::jsonb, '["steam","gift card","подарок","игры"]'::jsonb),
  ('PlayStation Plus Essential (1 месяц)', 'ps-plus-essential-1m', 'Подписка PlayStation Plus Essential на 1 месяц.', 'PS Plus Essential на 1 месяц', 699, 799, (SELECT id FROM categories WHERE slug = 'subscriptions'), 'Мгновенно', 'Россия', 4.7, 189, 300, true, false, 'Kozagogo Official', true, '["1 месяц PS Plus Essential","Многопользовательская игра","2 бесплатные игры в месяц"]'::jsonb, '[{"question":"Подходит для РФ аккаунта?","answer":"Да, код активируется на российском аккаунте PSN."}]'::jsonb, '["playstation","ps plus","подписка","sony"]'::jsonb),
  ('PUBG — 1000 G-COIN', 'pubg-1000-gcoin', 'Пополнение G-COIN в PUBG: Battlegrounds.', '1000 G-COIN для PUBG', 249, NULL, (SELECT id FROM categories WHERE slug = 'top-ups'), 'Мгновенно', 'Россия', 4.6, 145, 800, true, false, 'Kozagogo Official', true, '["1000 G-COIN","Для PC и консолей","Мгновенно"]'::jsonb, '[]'::jsonb, '["pubg","g-coin","пополнение","батлграунд"]'::jsonb),
  ('World of Warcraft — 60 дней', 'wow-60-days', '60 дней игрового времени для World of Warcraft.', '60 дней WoW', 1499, 1799, (SELECT id FROM categories WHERE slug = 'subscriptions'), '1–5 минут', 'Европа', 4.8, 98, 200, true, false, 'Kozagogo Official', true, '["60 дней игрового времени","Для всех версий WoW","Активация на Battle.net"]'::jsonb, '[{"question":"Как активировать?","answer":"Код активируется в личном кабинете Battle.net."}]'::jsonb, '["wow","world of warcraft","подписка","blizzard"]'::jsonb),
  ('Xbox Game Pass Ultimate (1 месяц)', 'xbox-game-pass-ultimate-1m', 'Xbox Game Pass Ultimate на 1 месяц.', 'Xbox Game Pass Ultimate на месяц', 999, NULL, (SELECT id FROM categories WHERE slug = 'subscriptions'), 'Мгновенно', 'Россия', 4.7, 312, 400, true, true, 'Kozagogo Official', true, '["1 месяц Ultimate","Xbox + PC","EA Play включён"]'::jsonb, '[]'::jsonb, '["xbox","game pass","microsoft","подписка"]'::jsonb),
  ('Fortnite — 1000 V-Bucks', 'fortnite-1000-vbucks', '1000 V-Bucks для Fortnite.', '1000 V-Bucks', 599, 699, (SELECT id FROM categories WHERE slug = 'top-ups'), 'Мгновенно', 'Россия', 4.5, 423, 600, true, false, 'Kozagogo Official', true, '["1000 V-Bucks","Для всех платформ","Мгновенная доставка"]'::jsonb, '[]'::jsonb, '["fortnite","v-bucks","пополнение","эпик"]'::jsonb),
  ('Google Play Gift Card 1000 ₽', 'google-play-1000', 'Подарочная карта Google Play на 1000 рублей.', 'Google Play на 1000 ₽', 1000, NULL, (SELECT id FROM categories WHERE slug = 'gift-cards'), '1–5 минут', 'Россия', 4.9, 876, 1000, true, true, 'Kozagogo Official', true, '["Номинал 1000 ₽","Для Google Play","Активация в приложении"]'::jsonb, '[{"question":"Как активировать?","answer":"Код придёт на email. Активируйте в Google Play."}]'::jsonb, '["google play","gift card","подарок","android"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Demo-пользователи (bcrypt хеши)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@kozagogo.ru', '$2b$10$JRi9JcNTE3J61EurWyFgHO9tb70acgB9.ELYDHWWcoaUqUySI1w8e', 'admin'),
  ('user@kozagogo.ru', '$2b$10$uAYheXUtkpBUT4Zx804jT.YsigTLY9NghYfX3hXozOxNq0SG/EM/.', 'user')
ON CONFLICT (email) DO NOTHING;

-- Wallet для demo-пользователей
INSERT INTO wallet_balances (user_id, balance)
  SELECT id, 10000 FROM users WHERE email = 'admin@kozagogo.ru'
  ON CONFLICT (user_id) DO NOTHING;
INSERT INTO wallet_balances (user_id, balance)
  SELECT id, 5000 FROM users WHERE email = 'user@kozagogo.ru'
  ON CONFLICT (user_id) DO NOTHING;
