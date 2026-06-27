# ═══════════════════════════════════════════════════════
# Kozagogo Marketplace — Database Migrations
# ═══════════════════════════════════════════════════════
# SRS v1.0 — реализация моделей данных
# ═══════════════════════════════════════════════════════

## Как использовать

```bash
# Статус миграций
node db/migrate.js status

# Выполнить все ожидающие
node db/migrate.js up

# Выполнить до конкретного файла (включительно)
node db/migrate.js up 005_key_pool_delivery.sql
```

## Порядок выполнения

```
№   Файл                                    Модуль SRS              Зависимости
──  ──────────────────────────────────────  ───────────────────────  ───────────
001  product_variants                        CAT (каталог)          —
002  orders_state_machine                    CART (заказы)          —
003  transactions_and_wallet                 PRM (финансы)          orders
004  carts                                   CART (корзина)         products, coupons
005  key_pool_delivery                       DD (доставка)          products, orders
006  search_fts                              SRC (поиск)            products
007  wishlist_notifications                  WIS (избранное)        products
008  gifts                                   GFT (подарки)          orders
009  coupons_cashback                        PRM (промокоды)        orders
010  referrals                               REF (рефералки)        users, wallet
011  loyalty                                 LYL (лояльность)       orders
012  support                                 SPT (поддержка)        orders
013  subscriptions                           SUB (подписки)         products, orders
```

## Соглашения

1. Нумерация: 001-999 — последовательные, без разрывов
2. Каждый файл выполняется в отдельной транзакции
3. Все миграции идемпотентны: `IF NOT EXISTS`, `IF NOT IN`
4. `CREATE OR REPLACE` для функций и триггеров
5. Откат: `DELETE FROM _migrations WHERE filename = '...'` + ручной SQL
