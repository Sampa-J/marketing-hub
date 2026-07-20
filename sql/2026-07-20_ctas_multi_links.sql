-- Biblioteca de CTAs: suportar mais de 1 link por CTA
-- Adiciona coluna `links` (array de texto). A coluna antiga `link` (single) é
-- mantida para compatibilidade e continua populada com o primeiro link.

ALTER TABLE ctas ADD COLUMN IF NOT EXISTS links text[] DEFAULT '{}';

-- Backfill: migra o link único existente para o array, quando houver.
UPDATE ctas
SET links = ARRAY[link]
WHERE link IS NOT NULL
  AND link <> ''
  AND (links IS NULL OR array_length(links, 1) IS NULL);
