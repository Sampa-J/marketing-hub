-- Fix RLS — libera escrita nas tabelas novas do dashboard Seazone (ctas, collabs_hidden_seazone)
-- Branch: feat/dashboard-seazone-unificado
--
-- SINTOMA: na página /social-midia/calendario-seazone, cadastrar um novo CTA
--   na Biblioteca de CTAs não faz nada ao clicar em "Salvar".
-- CAUSA: a migração 2026-07-14 criou a tabela `ctas` mas não criou policy de escrita.
--   Com RLS ligado e sem policy de INSERT/UPDATE/DELETE, a chave anon (usada pelo app
--   direto no client) recebe: 42501 "new row violates row-level security policy for table ctas".
--   O SELECT funciona (por isso a lista carrega vazia), só a gravação é bloqueada.
-- CORREÇÃO: policy permissiva pra anon/authenticated, espelhando o acesso que `posts` já tem.
--   Comandos idempotentes (drop if exists + create).

-- ctas
alter table ctas enable row level security;
drop policy if exists "ctas_rw_anon" on ctas;
create policy "ctas_rw_anon" on ctas
  for all to anon, authenticated
  using (true) with check (true);

-- collabs_hidden_seazone (mesma migração 2026-07-14, mesmo risco de bloqueio silencioso
-- ao ocultar uma collab). Preventivo.
alter table collabs_hidden_seazone enable row level security;
drop policy if exists "collabs_hidden_rw_anon" on collabs_hidden_seazone;
create policy "collabs_hidden_rw_anon" on collabs_hidden_seazone
  for all to anon, authenticated
  using (true) with check (true);
