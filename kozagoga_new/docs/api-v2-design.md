# API-нейминг: v2 vs расширение текущих эндпоинтов

## Проблема

Текущий проект использует `/api/products`, `/api/orders`, `/api/categories` — плоские эндпоинты.
SRS вводит новые сущности (variants, cart, digital delivery, coupons) и новые поля.

## Варианты

### A) Новый префикс `/api/v2/...`
- ✅ Чистое разделение, старый код не ломается
- ❌ Нужно дублировать middleware (auth, rate-limit, sanitize)
- ❌ Два API живущих параллельно — путаница
- ❌ Старый фронт не переедет на v2 единовременно

### B) Расширять текущие эндпоинты (backward-compatible)
- Новые поля добавляются в response, старые клиенты их игнорируют
- Новые эндпоинты `/api/cart/*`, `/api/deliveries/*` — не конфликтуют
- `products` получает поле `variants` (массив) при наличии

### C) Заменить текущие (breaking change)
- ❌ Ломает работающий код, нет изоляции

## Решение

**Выбран вариант B** — расширяем текущие эндпоинты.

### Конкретные правила

| Старый эндпоинт | Новый | Изменение |
|----------------|-------|-----------|
| `GET /api/products` | то же + `price_min`, `price_max`, `variants[]` | Backward-compat |
| `GET /api/products/:slug` | то же + `variants[]`, `product_type`, `delivery_type` | Backward-compat |
| `GET /api/categories` | то же | Без изменений |
| — | `POST /api/cart` | Новый |
| — | `GET /api/cart` | Новый |
| — | `POST /api/cart/items` | Новый |
| — | `PATCH /api/cart/items/:id` | Новый |
| — | `DELETE /api/cart/items/:id` | Новый |
| — | `POST /api/checkout` | Новый |
| — | `GET /api/deliveries/:orderId` | Новый |
| — | `POST /api/deliveries/:itemId/reveal` | Новый |
| — | `POST /api/cart/coupon` | Новый |
| — | `DELETE /api/cart/coupon` | Новый |

### Рефакторинг структуры сервера

```
server.js — только базовая настройка Express + импорт роутов
src/routes/
  api/
    cart.js           ← новый
    checkout.js       ← новый
    digital-delivery.js ← новый
    coupons.js        ← новый
    products.js       ← новый (вынести из server.js)
    search.js         ← новый (PG FTS)
  admin/              ← существующее
```

### Миграция фронта

Постепенная: старые страницы используют старые эндпоинты.
Новые страницы (CartPage, Checkout, KeyReveal) — новые.
После переезда всех страниц — удалить старые эндпоинты.
