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
  texto: string;
  descricao: string;
  frentes: Frente[];
  link: string;
}

const EMPTY: FormState = { id: null, titulo: '', texto: '', descricao: '', frentes: [], link: '' };

export function CtaLibrary() {
  const { ctas, loading, createCta, updateCta, deleteCta } = useCtas();
  const [search, setSearch] = useState('');
  const [filterFrentes, setFilterFrentes] = useState<Frente[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ctas.filter((c) => {
      if (filterFrentes.length > 0) {
        const fr = c.frentes ?? [];
        if (!filterFrentes.some((f) => fr.includes(f))) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [c.titulo, c.texto, c.descricao].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ctas, filterFrentes, search]);

  async function copyTexto(c: Cta) {
    try {
      await navigator.clipboard.writeText(c.texto);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }

  function openNew() { setForm({ ...EMPTY }); }
  function openEdit(c: Cta) {
    setForm({ id: c.id, titulo: c.titulo, texto: c.texto, descricao: c.descricao ?? '', frentes: c.frentes ?? [], link: c.link ?? '' });
  }

  async function handleSave() {
    if (!form || !form.titulo.trim() || !form.texto.trim()) return;
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        texto: form.texto.trim(),
        descricao: form.descricao.trim() || null,
        frentes: form.frentes.length ? form.frentes : null,
        link: form.link.trim() || null,
      };
      if (form.id) await updateCta(form.id, payload);
      else await createCta(payload);
      setForm(null);
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
              <p style={{ margin: 0, fontSize: 12, color: T.cardFg, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.texto}</p>
              {c.descricao && <p style={{ margin: 0, fontSize: 11, color: T.mutedFg, fontStyle: 'italic' }}>{c.descricao}</p>}
              {c.link && (
                <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.primary, wordBreak: 'break-all' }}>
                  <ExternalLink size={11} /> {c.link}
                </a>
              )}
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
              <label style={labelStyle}>Título *</label>
              <input autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: CTA reserva direta" style={inputBase} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Texto do CTA *</label>
              <textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} rows={4} placeholder="Texto que será usado no material..." style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Descrição / uso (opcional)</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Quando usar este CTA..." style={inputBase} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Frente</label>
              <FrentePicker value={form.frentes} onChange={(f) => setForm({ ...form, frentes: f })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Link (opcional)</label>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." style={inputBase} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setForm(null)} style={{ flex: 1, background: 'none', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: T.mutedFg }}>Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo.trim() || !form.texto.trim()}
                style={{ flex: 2, background: T.primary, color: T.primaryFg, border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !form.titulo.trim() || !form.texto.trim() ? 0.5 : 1 }}
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
