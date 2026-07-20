"use client";

import { useMemo, useState } from 'react';
import { Search, Plus, Copy, Check, Pencil, Trash2, X, ExternalLink } from 'lucide-react';
import { T } from '@/lib/constants';
import { useCtas } from '../_hooks/useCtas';
import { FrentePicker, FrenteTags } from './FrenteControls';
import type { Cta, Frente } from '../_lib/types';

interface FormState {
  id: string | null;
  titulo: string;
  descricao: string;
  frentes: Frente[];
  links: string[];
}

const EMPTY: FormState = { id: null, titulo: '', descricao: '', frentes: [], links: [''] };

// Retorna todos os links de um CTA, cobrindo o campo legado `link`.
function ctaLinks(c: Cta): string[] {
  if (c.links && c.links.length) return c.links.filter(Boolean);
  return c.link ? [c.link] : [];
}

export function CtaLibrary() {
  const { ctas, loading, createCta, updateCta, deleteCta } = useCtas();
  const [search, setSearch] = useState('');
  const [filterFrentes, setFilterFrentes] = useState<Frente[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ctas.filter((c) => {
      if (filterFrentes.length > 0) {
        const fr = c.frentes ?? [];
        if (!filterFrentes.some((f) => fr.includes(f))) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [c.titulo, c.descricao].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ctas, filterFrentes, search]);

  async function copyTexto(c: Cta) {
    const toCopy = ctaLinks(c)[0] || c.descricao || c.titulo;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }

  function openNew() { setSaveError(null); setForm({ ...EMPTY, links: [''] }); }
  function openEdit(c: Cta) {
    setSaveError(null);
    const links = ctaLinks(c);
    setForm({ id: c.id, titulo: c.titulo, descricao: c.descricao ?? '', frentes: c.frentes ?? [], links: links.length ? links : [''] });
  }

  function updateLink(i: number, value: string) {
    setForm((f) => (f ? { ...f, links: f.links.map((l, idx) => (idx === i ? value : l)) } : f));
  }
  function addLink() {
    setForm((f) => (f ? { ...f, links: [...f.links, ''] } : f));
  }
  function removeLink(i: number) {
    setForm((f) => (f ? { ...f, links: f.links.filter((_, idx) => idx !== i) } : f));
  }

  async function handleSave() {
    if (!form || !form.titulo.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const links = form.links.map((l) => l.trim()).filter(Boolean);
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        frentes: form.frentes.length ? form.frentes : null,
        links: links.length ? links : null,
        link: links[0] ?? null, // mantém o campo legado em sincronia
      };
      if (form.id) await updateCta(form.id, payload);
      else await createCta(payload);
      setForm(null);
    } catch (err) {
      console.error('Erro ao salvar CTA:', err);
      const e = (err ?? {}) as { message?: string; details?: string; hint?: string; code?: string };
      const code = e.code ?? '';
      const msg = err instanceof Error ? err.message : (e.message || e.details || e.hint || (code ? `código ${code}` : 'erro desconhecido'));
      setSaveError(
        /row-level security/i.test(msg) || code === '42501'
          ? 'Sem permissão pra gravar na tabela de CTAs (RLS do Supabase). Rode a policy de escrita: SQL Editor do Supabase → sql/2026-07-15_ctas_rls_fix.sql.'
          : /column .*links.* does not exist/i.test(msg) || /could not find the .*links.* column/i.test(msg) || code === '42703' || code === 'PGRST204'
            ? 'O banco ainda não tem a coluna de múltiplos links. Rode a migração: SQL Editor do Supabase → sql/2026-07-20_ctas_multi_links.sql.'
            : `Não foi possível salvar: ${msg}${code ? ` (código ${code})` : ''}`,
      );
    } finally {
      setSaving(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px',
    fontSize: 14, color: T.cinza700, background: T.card, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: T.cinza600, marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: '0 0 4px' }}>Biblioteca de CTAs</h2>
          <p style={{ fontSize: 13, color: T.mutedFg, margin: 0 }}>CTAs cadastrados no ManyChat — para a equipe usar ao criar os materiais</p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.primary, color: T.primaryFg, border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Novo CTA
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.cinza400 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar CTA..."
            style={{ ...inputBase, borderRadius: 12, padding: '8px 12px 8px 34px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.mutedFg }}>Frente:</span>
          <FrentePicker value={filterFrentes} onChange={setFilterFrentes} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: T.cinza400 }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center', color: T.cinza400 }}>
          {ctas.length === 0 ? 'Nenhum CTA cadastrado ainda. Clique em "Novo CTA".' : 'Nenhum CTA encontrado com esses filtros.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.cardFg }}>{c.titulo}</p>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => copyTexto(c)} title="Copiar texto" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: copiedId === c.id ? T.statusOkFg : T.cinza400, display: 'flex' }}>
                    {copiedId === c.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => openEdit(c)} title="Editar" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: T.cinza400, display: 'flex' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm('Excluir este CTA?')) deleteCta(c.id); }} title="Excluir" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: T.destructive, display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <FrenteTags frentes={c.frentes} />
              {c.descricao && <p style={{ margin: 0, fontSize: 12, color: T.cardFg, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.descricao}</p>}
              {ctaLinks(c).map((lnk, i) => (
                <a key={i} href={lnk} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.primary, wordBreak: 'break-all' }}>
                  <ExternalLink size={11} /> {lnk}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}

      {form && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setForm(null)}
        >
          <div style={{ width: '100%', maxWidth: 500, background: T.card, borderRadius: 14, padding: 24, boxShadow: T.elevMd, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.cardFg, margin: 0 }}>{form.id ? 'Editar CTA' : 'Novo CTA'}</h3>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.cinza400 }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome *</label>
              <input autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: CTA reserva direta" style={inputBase} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Descrição (opcional)</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Quando usar este CTA..." style={inputBase} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Frente</label>
              <FrentePicker value={form.frentes} onChange={(f) => setForm({ ...form, frentes: f })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Links (opcional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.links.map((lnk, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={lnk}
                      onChange={(e) => updateLink(i, e.target.value)}
                      placeholder="https://..."
                      style={inputBase}
                    />
                    {form.links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        title="Remover link"
                        style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 9px', cursor: 'pointer', color: T.destructive, display: 'flex', flexShrink: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLink}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'none', border: `1px dashed ${T.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: T.primary, cursor: 'pointer' }}
              >
                <Plus size={14} /> Adicionar link
              </button>
            </div>

            {saveError && (
              <div role="alert" style={{ background: T.statusErrBg, color: T.statusErrFg, border: `1px solid ${T.statusErr}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setForm(null)} style={{ flex: 1, background: 'none', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: T.mutedFg }}>Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo.trim()}
                style={{ flex: 2, background: T.primary, color: T.primaryFg, border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !form.titulo.trim() ? 0.5 : 1 }}
              >
                {saving ? 'Salvando...' : 'Salvar CTA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
