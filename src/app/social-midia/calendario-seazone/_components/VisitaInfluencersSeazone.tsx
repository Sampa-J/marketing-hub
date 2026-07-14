'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { T } from '@/lib/constants';
import { getSupabase } from '../_lib/supabase';

const COR = '#7C3AED';

// Tabelas físicas de influencers (mesmas da planilha unificada)
const INFLU_TABLES = ['influencers_expansao_sp', 'influencers_expansao_salvador', 'influencers_seazone'];

interface Visita {
  perfil: string;
  foto: string | null;
  link: string | null;
  start: Date;
  end: Date;
}

/* Interpreta datas em texto livre. Formatos suportados:
   "04/05 a 06/05/25", "21/06 a 22/06/2026", "23/10 a 24/10",
   "10 a 11/01" (dia inicial herda o mês do fim) e ISO "2025-09-19 00:00:00".
   O ano informado (em qualquer parte, 2 ou 4 dígitos) vale para as partes sem ano. */
function parseVisita(s: string, anoPadrao: number): { start: Date; end: Date } | null {
  const normAno = (y: number) => (y < 100 ? 2000 + y : y);

  const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : { start: d, end: d };
  }

  type Parte = { dia: number; mes: number | null; ano: number | null };
  const partes: (Parte | null)[] = s.split(/\s+a\s+/i).map(str => {
    const full = str.trim().match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (full) return { dia: +full[1], mes: +full[2] - 1, ano: full[3] ? normAno(+full[3]) : null };
    const soDia = str.trim().match(/^(\d{1,2})$/);
    if (soDia) return { dia: +soDia[1], mes: null, ano: null };
    return null;
  });
  if (partes.some(p => !p)) return null;

  let mesRef: number | null = null;
  let anoRef = anoPadrao;
  for (let i = partes.length - 1; i >= 0; i--) {
    if (mesRef == null && partes[i]!.mes != null) mesRef = partes[i]!.mes;
    if (partes[i]!.ano != null) { anoRef = partes[i]!.ano!; break; }
  }
  const toDate = (p: Parte): Date => new Date(p.ano ?? anoRef, p.mes ?? mesRef ?? 0, p.dia);

  if (partes.length === 1) {
    const d = toDate(partes[0]!);
    return isNaN(d.getTime()) ? null : { start: d, end: d };
  }
  const start = toDate(partes[0]!);
  const end = toDate(partes[1]!);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start, end: end < start ? start : end };
}

function Avatar({ perfil, foto, size = 22 }: { perfil: string; foto: string | null; size?: number }) {
  const iniciais = perfil.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.border}` }} />;
  }
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: `${COR}22`, color: COR, fontSize: size * 0.4, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {iniciais || '?'}
    </span>
  );
}

export function VisitaInfluencersSeazone() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    (async () => {
      const all: Record<string, string>[] = [];
      for (const tb of INFLU_TABLES) {
        const { data } = await getSupabase().from(tb).select('*');
        (data ?? []).forEach((r: Record<string, unknown>) => {
          const o: Record<string, string> = {};
          Object.entries(r).forEach(([k, v]) => { o[k] = v == null ? '' : String(v); });
          all.push(o);
        });
      }
      setRows(all);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  const anoPadrao = new Date().getFullYear();

  const visitas = useMemo<Visita[]>(() => {
    const out: Visita[] = [];
    for (const r of rows) {
      const dataVisita = r.data_visita_hospedagem;
      if (!dataVisita || !r.perfil) continue;
      const parsed = parseVisita(dataVisita, anoPadrao);
      if (!parsed) continue;
      out.push({ perfil: r.perfil, foto: null, link: r.link_perfil || null, start: parsed.start, end: parsed.end });
    }
    return out;
  }, [rows, anoPadrao]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    const padDays = Array.from({ length: startPad }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() - (startPad - i)); return d; });
    return [...padDays, ...allDays];
  }, [currentMonth]);

  const visitasNoDia = (day: Date): Visita[] => {
    const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    return visitas.filter(v => {
      const s = new Date(v.start.getFullYear(), v.start.getMonth(), v.start.getDate()).getTime();
      const e = new Date(v.end.getFullYear(), v.end.getMonth(), v.end.getDate()).getTime();
      return d0 >= s && d0 <= e;
    });
  };

  const totalMes = useMemo(() => visitas.filter(v => isSameMonth(v.start, currentMonth) || isSameMonth(v.end, currentMonth)).length, [visitas, currentMonth]);

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: '0 0 4px' }}>Visita de Influenciadores</h2>
          <p style={{ fontSize: 13, color: T.mutedFg, margin: 0 }}>Datas de visita dos influenciadores (da planilha) — {visitas.length} visitas cadastradas</p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: COR, background: `${COR}14`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} /> {totalMes} neste mês
        </span>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, padding: '16px 24px' }}>
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, color: T.mutedFg }}><ChevronLeft size={20} /></button>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.cardFg, margin: 0, textTransform: 'capitalize' }}>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h3>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, color: T.mutedFg }}><ChevronRight size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${T.cinza50}` }}>
          {WEEKDAYS.map(d => <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: T.mutedFg }}>{d}</div>)}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '80px 0', color: T.cinza400 }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '170px' }}>
            {days.map((day, i) => {
              const dayVisitas = visitasNoDia(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <div key={i} style={{ height: 170, overflow: 'hidden', borderBottom: `1px solid ${T.cinza50}`, borderRight: `1px solid ${T.cinza50}`, padding: 8, display: 'flex', flexDirection: 'column', background: today ? `${T.pendingBg}80` : !isCurrentMonth ? `${T.cinza50}80` : 'transparent', boxShadow: today ? `inset 0 0 0 2px ${T.primary}30` : 'none' }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 12, fontWeight: today ? 700 : 500, background: today ? T.primary : 'transparent', color: today ? T.primaryFg : isCurrentMonth ? T.cinza700 : T.cinza200 }}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="collabs-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    {dayVisitas.map((v, j) => {
                      const inner = (
                        <>
                          <Avatar perfil={v.perfil} foto={v.foto} size={30} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.cardFg, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.perfil}</span>
                        </>
                      );
                      const baseStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, background: `${COR}14`, border: `1px solid ${COR}33`, borderRadius: 8, padding: '6px 8px', textDecoration: 'none', flexShrink: 0 };
                      return v.link ? (
                        <a key={j} href={v.link} target="_blank" rel="noopener noreferrer" title={`Ver perfil de ${v.perfil}`} style={{ ...baseStyle, cursor: 'pointer' }}>{inner}</a>
                      ) : (
                        <div key={j} title={v.perfil} style={baseStyle}>{inner}</div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
