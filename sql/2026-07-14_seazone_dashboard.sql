-- Migração do Dashboard Seazone unificado (/social-midia/calendario-seazone)
-- Branch: feat/dashboard-seazone-unificado
-- Rodar no Supabase (SQL Editor) ANTES de mergear — senão criar/editar post quebra
-- com erro 42703 "column posts.frentes does not exist".
-- Todos os comandos são idempotentes (IF NOT EXISTS) e retrocompatíveis.

-- 1) Novas colunas em posts: frentes (SZI/SZS/MKTPLACE/FRANQUIAS),
--    publicos (HOSPEDES/PROPRIETARIOS/INVESTIDORES/FRANQUEADOS), link do Drive e CTA
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS frentes    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publicos   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS collabs    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS drive_link text,
  ADD COLUMN IF NOT EXISTS cta_id     uuid;

-- 2) Biblioteca de CTAs (ManyChat)
CREATE TABLE IF NOT EXISTS ctas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     text,
  texto      text,
  descricao  text,
  frentes    text[] DEFAULT '{}',
  link       text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Collabs ocultadas na aba Collabs da Seazone
CREATE TABLE IF NOT EXISTS collabs_hidden_seazone (
  media_id text PRIMARY KEY
);

-- Observação: a frente "Franquias" NÃO exige mudança de schema — frentes é text[],
-- então o valor 'FRANQUIAS' é aceito sem alteração no banco.
