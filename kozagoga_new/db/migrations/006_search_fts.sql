-- ═══════════════════════════════════════════════════════
-- 006_search_fts.sql
-- Полнотекстовый поиск через PG FTS (GIN index)
-- (SRS Модуль 13)
-- ═══════════════════════════════════════════════════════

-- 1. Добавляем search_vector колонку (PG FTS)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. GIN индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);

-- 3. Функция обновления поискового вектора
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('russian', coalesce(NEW.seo_keywords, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.meta_title, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер на INSERT и UPDATE
DROP TRIGGER IF EXISTS trg_product_search ON products;
CREATE TRIGGER trg_product_search
  BEFORE INSERT OR UPDATE OF name, short_description, description, seo_keywords, meta_title
  ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- 5. Функция поиска (пример использования)
CREATE OR REPLACE FUNCTION search_products(
  p_query   TEXT,
  p_limit   INT DEFAULT 20,
  p_offset  INT DEFAULT 0
) RETURNS TABLE(
  id              UUID,
  name            VARCHAR(255),
  slug            VARCHAR(255),
  price_min       NUMERIC(10,2),
  price_max       NUMERIC(10,2),
  image_url       VARCHAR(500),
  rating          NUMERIC(3,1),
  review_count    INT,
  rank            REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.slug, p.price_min, p.price_max, p.images->>0,
         p.rating, p.review_count,
         ts_rank(p.search_vector, plainto_tsquery('russian', p_query), 32) AS rank
  FROM products p
  WHERE p.search_vector @@ plainto_tsquery('russian', p_query)
    AND p.is_active = true
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 6. Автодополнение (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION autocomplete_products(
  p_query   TEXT,
  p_limit   INT DEFAULT 8
) RETURNS TABLE(
  name        VARCHAR(255),
  slug        VARCHAR(255),
  image_url   VARCHAR(500),
  price_min   NUMERIC(10,2),
  similarity  REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, p.slug, p.images->>0, p.price_min,
         similarity(p.name, p_query) AS sim
  FROM products p
  WHERE p.is_active = true
    AND (p.name % p_query OR p.name ILIKE p_query || '%')
  ORDER BY sim DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Комментарии
COMMENT ON COLUMN products.search_vector IS 'TSVector для полнотекстового поиска (веса A/B/C)';
COMMENT ON FUNCTION search_products IS 'Полнотекстовый поиск с ранжированием';
COMMENT ON FUNCTION autocomplete_products IS 'Автодополнение через pg_trgm similarity';
