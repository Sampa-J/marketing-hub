"use client";

import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { T } from '@/lib/constants';
import { useCtas } from '../_hooks/useCtas';
import { FrenteTags } from './FrenteControls';

/** Seletor de CTA (biblioteca do ManyChat) para vincular a um post */
export function CtaPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { ctas, loading } = useCtas();
  const [copied, setCopied] = useState(false);

  const selected = useMemo(() => ctas.find((c) => c.id === value) ?? null, [ctas, value]);
  const selectedLinks = useMemo(() => {
    if (!selected) return [];
    if (selected.links && selected.links.length) return selected.links.filter(Boolean);
    return selected.link ? [selected.link] : [];
  }, [selected]);

  async function copyTexto() {
    if (!selected) return;
    const toCopy = selectedLinks[0] || selected.descricao || selected.titulo;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: T.card, color: T.cardFg }}
      >
        <option value="">{loading ? 'Carregando CTAs...' : 'Sem CTA'}</option>
        {ctas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.titulo}
          </option>
        ))}
      </select>

      {selected && (
        <div style={{ marginTop: 8, background: T.cinza50, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <FrenteTags frentes={selected.frentes} compact />
            <button
              type="button"
              onClick={copyTexto}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: copied ? T.statusOkFg : T.mutedFg, cursor: 'pointer' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          {selected.descricao && <p style={{ margin: 0, fontSize: 12, color: T.cardFg, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{selected.descricao}</p>}
          {selectedLinks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: selected.descricao ? 6 : 0 }}>
              {selectedLinks.map((lnk, i) => (
                <a key={i} href={lnk} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.primary, wordBreak: 'break-all' }}>
                  {lnk}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
