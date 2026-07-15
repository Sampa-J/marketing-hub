"use client";

import { T } from '@/lib/constants';
import { FRENTES, getFrente, PUBLICOS, getPublico, COLLABS, getCollab } from '../_lib/calendar-constants';
import type { Frente, Publico, Collab } from '../_lib/types';

/** Chips clicáveis para selecionar as frentes (SZI/SZS/MKTPLACE) */
export function FrentePicker({ value, onChange }: { value: Frente[]; onChange: (f: Frente[]) => void }) {
  const set = new Set(value);
  function toggle(f: Frente) {
    const next = new Set(set);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    onChange(FRENTES.map((x) => x.value).filter((x) => next.has(x)));
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {FRENTES.map((f) => {
        const on = set.has(f.value);
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => toggle(f.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${on ? f.color : T.border}`,
              background: on ? f.color : 'transparent',
              color: on ? '#fff' : T.mutedFg,
              transition: 'all 0.12s',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tags coloridas somente-leitura para exibir as frentes de um post */
export function FrenteTags({ frentes, compact }: { frentes?: Frente[] | null; compact?: boolean }) {
  if (!frentes || frentes.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {frentes.map((val) => {
        const f = getFrente(val);
        if (!f) return null;
        return (
          <span
            key={val}
            style={{
              background: `${f.color}1a`,
              color: f.color,
              border: `1px solid ${f.color}55`,
              borderRadius: 5,
              padding: compact ? '1px 5px' : '2px 7px',
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {f.label}
          </span>
        );
      })}
    </div>
  );
}

/** Chips clicáveis para selecionar os públicos (Hóspedes/Proprietários/Investidores/Franqueados) */
export function PublicoPicker({ value, onChange }: { value: Publico[]; onChange: (p: Publico[]) => void }) {
  const set = new Set(value);
  function toggle(p: Publico) {
    const next = new Set(set);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onChange(PUBLICOS.map((x) => x.value).filter((x) => next.has(x)));
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {PUBLICOS.map((p) => {
        const on = set.has(p.value);
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => toggle(p.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${on ? p.color : T.border}`,
              background: on ? p.color : 'transparent',
              color: on ? '#fff' : T.mutedFg,
              transition: 'all 0.12s',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tags coloridas somente-leitura para exibir os públicos de um post */
export function PublicoTags({ publicos, compact }: { publicos?: Publico[] | null; compact?: boolean }) {
  if (!publicos || publicos.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {publicos.map((val) => {
        const p = getPublico(val);
        if (!p) return null;
        return (
          <span
            key={val}
            style={{
              background: `${p.color}1a`,
              color: p.color,
              border: `1px solid ${p.color}55`,
              borderRadius: 5,
              padding: compact ? '1px 5px' : '2px 7px',
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
}

/** Chips clicáveis para selecionar as collabs */
export function CollabPicker({ value, onChange }: { value: Collab[]; onChange: (c: Collab[]) => void }) {
  const set = new Set(value);
  function toggle(c: Collab) {
    const next = new Set(set);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange(COLLABS.map((x) => x.value).filter((x) => next.has(x)));
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {COLLABS.map((c) => {
        const on = set.has(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => toggle(c.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${on ? c.color : T.border}`,
              background: on ? c.color : 'transparent',
              color: on ? '#fff' : T.mutedFg,
              transition: 'all 0.12s',
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tags coloridas somente-leitura para exibir as collabs de um post */
export function CollabTags({ collabs, compact }: { collabs?: Collab[] | null; compact?: boolean }) {
  if (!collabs || collabs.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {collabs.map((val) => {
        const c = getCollab(val);
        if (!c) return null;
        return (
          <span
            key={val}
            style={{
              background: `${c.color}1a`,
              color: c.color,
              border: `1px solid ${c.color}55`,
              borderRadius: 5,
              padding: compact ? '1px 5px' : '2px 7px',
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
