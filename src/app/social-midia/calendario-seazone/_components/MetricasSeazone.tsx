'use client';

import { useEffect, useState } from 'react';
import { T } from '@/lib/constants';
import { Pencil, Check, Loader2 } from 'lucide-react';

const COR_IG = '#7C3AED';
const COR_YT = '#DC2626';
const META_DEFAULT = 15000;

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR');
}

type RangeTipo = 'semana' | 'mes' | 'trimestre';

const MESES_PT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

/* ─── Gráfico de barras reutilizável ─── */
function GraficoBarras({
  historico,
  cor,
  clipId,
}: {
  historico: { data: string; ganho_dia: number }[];
  cor: string;
  clipId: string;
}) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number } | null>(null);
  const W = 680, H = 140, PL = 36, PB = 28, PT = 8, PR = 8;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxGanho = Math.max(...historico.map(d => d.ganho_dia || 0), 1);
  const n = historico.length;
  const barW = n > 1 ? Math.max(6, (cW / n) - 3) : 20;
  const xs = (i: number) => n > 1 ? PL + (i / (n - 1)) * cW : PL + cW / 2;
  const ys = (val: number) => PT + cH - (val / maxGanho) * cH;

  if (historico.length === 0) {
    return (
      <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
        Sem dados para o período.
      </p>
    );
  }

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }} onMouseLeave={() => setTooltip(null)}>
      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * W;
          let closest = 0, minD = Infinity;
          historico.forEach((_, i) => { const d = Math.abs(xs(i) - mx); if (d < minD) { minD = d; closest = i; } });
          if (minD < barW * 2) setTooltip({ idx: closest, x: xs(closest) });
          else setTooltip(null);
        }}>
        <defs><clipPath id={clipId}><rect x={PL} y={PT} width={cW} height={cH} /></clipPath></defs>
        {[0, Math.round(maxGanho / 2), maxGanho].map(val => (
          <g key={val}>
            <line x1={PL} x2={W - PR} y1={ys(val)} y2={ys(val)} stroke={T.border} strokeWidth={0.5} />
            <text x={PL - 4} y={ys(val) + 4} fontSize={9} fill={T.mutedFg ?? '#888'} textAnchor="end">{val}</text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {historico.map((d, i) => {
            const ganho = d.ganho_dia || 0;
            const bh = Math.max(2, (ganho / maxGanho) * cH);
            const isHoje = d.data === new Date().toISOString().split('T')[0];
            return (
              <rect key={d.data} x={xs(i) - barW / 2} y={ys(ganho)} width={barW} height={bh}
                fill={tooltip?.idx === i ? cor : isHoje ? cor : `${cor}60`}
                rx={2} style={{ transition: 'fill 0.1s' }} />
            );
          })}
        </g>
        {tooltip && <line x1={xs(tooltip.idx)} x2={xs(tooltip.idx)} y1={PT} y2={H - PB} stroke={cor} strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />}
        {n <= 20
          ? historico.map((d, i) => (
            <text key={d.data} x={xs(i)} y={H - 6} fontSize={9}
              fill={tooltip?.idx === i ? cor : T.mutedFg ?? '#888'}
              fontWeight={tooltip?.idx === i ? 700 : 400} textAnchor="middle">
              {d.data.slice(8)}
            </text>
          ))
          : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1].map(i => (
            <text key={i} x={xs(i)} y={H - 6} fontSize={9} fill={T.mutedFg ?? '#888'} textAnchor="middle">
              {historico[i]?.data.slice(8)}/{historico[i]?.data.slice(5, 7)}
            </text>
          ))
        }
      </svg>
      {tooltip && (() => {
        const d = historico[tooltip.idx];
        const ganho = d?.ganho_dia || 0;
        const dataFmt = d?.data.split('-').reverse().join('/') ?? '';
        const isHoje = d?.data === new Date().toISOString().split('T')[0];
        return (
          <div style={{ position: 'absolute', top: 4, left: `${(xs(tooltip.idx) / W) * 100}%`, transform: tooltip.idx > n * 0.65 ? 'translateX(-110%)' : 'translateX(10px)', background: T.card, border: `1.5px solid ${cor}50`, borderRadius: 10, padding: '10px 14px', pointerEvents: 'none', zIndex: 10, boxShadow: `0 4px 20px ${cor}26`, minWidth: 150 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: T.mutedFg, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {dataFmt}
              {isHoje && <span style={{ background: cor, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>hoje</span>}
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: cor, lineHeight: 1 }}>+{ganho.toLocaleString('pt-BR')}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: T.mutedFg }}>ganhos</p>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Métricas Seazone (IG + YouTube) — reutilizável ─── */
export function MetricasSeazone() {
  const [aba, setAba] = useState<'instagram' | 'youtube'>('instagram');

  /* ── Instagram state ── */
  const [total, setTotal] = useState<number | null>(null);
  const [ganhoHoje, setGanhoHoje] = useState<number | null>(null);
  const [ganhoMes, setGanhoMes] = useState<number | null>(null);
  const [historico, setHistorico] = useState<{ data: string; ganho_dia: number }[]>([]);
  const [loadingSeguidores, setLoadingSeguidores] = useState(true);
  const [erroSeguidores, setErroSeguidores] = useState<string | null>(null);
  const [periodoGrafico, setPeriodoGrafico] = useState<7 | 14 | 30 | 'mes'>('mes');
  const [filterMes, setFilterMes] = useState<string | null>(null);
  const [ganhoPeriodoReportei, setGanhoPeriodoReportei] = useState<number | null>(null);
  const [loadingGanho, setLoadingGanho] = useState(false);
  const [metricas, setMetricas] = useState<any>(null);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [metaMes, setMetaMes] = useState<number>(META_DEFAULT);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  // Período das métricas Instagram (igual ao YouTube)
  const [igTipo, setIgTipo] = useState<RangeTipo>('semana');
  const [igMesSel, setIgMesSel] = useState<string | null>(null);
  // Audiência atual (snapshot — carregado uma vez)
  const [igDemografia, setIgDemografia] = useState<{
    followers_gender: { labels: string[]; data: number[] } | null;
    followers_gender_age: { labels: string[]; series: number[][] } | null;
  } | null>(null);

  /* ── YouTube state ── */
  const [ytTipo, setYtTipo] = useState<RangeTipo>('semana');
  const [ytMesSel, setYtMesSel] = useState<string | null>(null);
  const [ytMetricas, setYtMetricas] = useState<any>(null);
  const [ytLoadingMetricas, setYtLoadingMetricas] = useState(false);
  const [ytSubscriberCount, setYtSubscriberCount] = useState<number | null>(null);

  /* ── Meta salva ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('seazone_meta_mensal_seguidores');
      if (saved) setMetaMes(Number(saved));
    } catch {}
  }, []);

  /* ── Instagram: dados principais ── */
  useEffect(() => {
    fetch('/api/seguidores-seazone')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErroSeguidores(data.error); return; }
        setTotal(typeof data.total_seguidores === 'number' ? data.total_seguidores : null);
        setGanhoHoje(typeof data.ganho_hoje === 'number' ? data.ganho_hoje : null);
        setGanhoMes(typeof data.ganho_mes === 'number' ? data.ganho_mes : null);
        setHistorico(Array.isArray(data.historico) ? data.historico : []);
      })
      .catch(e => setErroSeguidores(e.message))
      .finally(() => setLoadingSeguidores(false));
  }, []);

  /* ── Instagram: ganho por período ── */
  useEffect(() => {
    if (periodoGrafico === 'mes' && !filterMes) { setGanhoPeriodoReportei(null); return; }
    setLoadingGanho(true);
    setGanhoPeriodoReportei(null);
    let url: string;
    if (filterMes) {
      url = `/api/seguidores-seazone-mensal?mes=${filterMes}`;
    } else {
      const fim = new Date().toISOString().split('T')[0];
      const ini = new Date();
      ini.setDate(ini.getDate() - (periodoGrafico as number));
      url = `/api/seguidores-seazone-mensal?start=${ini.toISOString().split('T')[0]}&end=${fim}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(d => setGanhoPeriodoReportei(d.ganho ?? null))
      .catch(() => setGanhoPeriodoReportei(null))
      .finally(() => setLoadingGanho(false));
  }, [periodoGrafico, filterMes]);

  /* ── Instagram: métricas do período ── */
  useEffect(() => {
    const { start, end } = calcIgRange();
    setLoadingMetricas(true);
    fetch(`/api/metricas-seazone?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => {
        setMetricas(data);
        // Guarda demografia na primeira carga (é sempre snapshot atual)
        if (!igDemografia && data?.followers_gender) {
          setIgDemografia({
            followers_gender:     data.followers_gender     ?? null,
            followers_gender_age: data.followers_gender_age ?? null,
          });
        }
      })
      .catch(() => setMetricas(null))
      .finally(() => setLoadingMetricas(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igTipo, igMesSel]);

  /* ── Cálculo de datas por período (compartilhado IG e YT) ── */
  function calcRange(tipo: RangeTipo, mesSel: string | null): { start: string; end: string; label: string } {
    const hoje = new Date();
    const iso = (d: Date) => d.toISOString().split('T')[0];
    const lbl2 = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

    if (mesSel) {
      const [ano, mes] = mesSel.split('-').map(Number);
      const s = new Date(ano, mes - 1, 1);
      const e = new Date(ano, mes, 0);
      return { start: iso(s), end: iso(e), label: `${MESES_PT[String(mes).padStart(2,'0')]}/${String(ano).slice(2)}` };
    }
    if (tipo === 'semana') {
      const dow = (hoje.getDay() + 6) % 7; // seg=0
      const seg = new Date(hoje); seg.setDate(hoje.getDate() - dow - 7);
      const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
      return { start: iso(seg), end: iso(dom), label: `${lbl2(seg)} — ${lbl2(dom)}` };
    }
    if (tipo === 'mes') {
      const s = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const e = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { start: iso(s), end: iso(e), label: `${MESES_PT[String(s.getMonth()+1).padStart(2,'0')]}/${String(s.getFullYear()).slice(2)}` };
    }
    // trimestre
    const q = Math.floor(hoje.getMonth() / 3);
    const lqYear = q === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const lqM    = q === 0 ? 9 : (q - 1) * 3;
    const s = new Date(lqYear, lqM, 1);
    const e = new Date(lqYear, lqM + 3, 0);
    const m1 = MESES_PT[String(lqM + 1).padStart(2,'0')];
    const m3 = MESES_PT[String(lqM + 3).padStart(2,'0')];
    return { start: iso(s), end: iso(e), label: `${m1}–${m3}/${String(lqYear).slice(2)}` };
  }

  const calcYtRange = () => calcRange(ytTipo, ytMesSel);
  const calcIgRange = () => calcRange(igTipo, igMesSel);

  /* ── YouTube: métricas do período ── */
  useEffect(() => {
    if (aba !== 'youtube') return;
    const { start, end } = calcYtRange();
    setYtLoadingMetricas(true);
    fetch(`/api/metricas-yt-seazone?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => {
        setYtMetricas(data);
        if (typeof data?.subscriber_count === 'number') setYtSubscriberCount(data.subscriber_count);
      })
      .catch(() => setYtMetricas(null))
      .finally(() => setYtLoadingMetricas(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytTipo, ytMesSel, aba]);

  /* ── Helpers ── */
  function salvarMeta() {
    const n = parseInt(metaInput.replace(/\D/g, ''));
    if (!isNaN(n) && n > 0) {
      setMetaMes(n);
      try { localStorage.setItem('seazone_meta_mensal_seguidores', String(n)); } catch {}
    }
    setEditandoMeta(false);
  }

  const faltam    = ganhoMes !== null ? Math.max(0, metaMes - ganhoMes) : null;
  const progresso = ganhoMes !== null ? Math.min(100, (ganhoMes / metaMes) * 100) : 0;

  const ganhoPeriodo = (!filterMes && periodoGrafico === 'mes') ? ganhoMes : ganhoPeriodoReportei;

  const historicoFiltrado = (() => {
    if (filterMes) return historico.filter(d => d.data.slice(0, 7) === filterMes);
    if (periodoGrafico === 'mes') {
      const inicioMes = new Date().toISOString().slice(0, 7) + '-01';
      return historico.filter(d => d.data >= inicioMes);
    }
    const corte = new Date();
    corte.setDate(corte.getDate() - (periodoGrafico as number));
    return historico.filter(d => d.data >= corte.toISOString().split('T')[0]);
  })();

  const mesesDisponiveis = Array.from(new Set(historico.map(d => d.data.slice(0, 7)))).sort();

  function periodoLabel(pGrafico: typeof periodoGrafico, fMes: string | null) {
    if (fMes) return `${MESES_PT[fMes.slice(5)]}/${fMes.slice(2, 4)}`;
    const hoje = new Date();
    const fmt2 = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (pGrafico === 'mes') {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return `${fmt2(ini)} — ${fmt2(hoje)}`;
    }
    const ini = new Date();
    ini.setDate(hoje.getDate() - (pGrafico as number));
    return `${fmt2(ini)} — ${fmt2(hoje)}`;
  }

  const periodosGrafico: { label: string; val: 7 | 14 | 30 | 'mes' }[] = [
    { label: 'Mês atual', val: 'mes' },
    { label: '7 dias', val: 7 },
    { label: '14 dias', val: 14 },
    { label: '30 dias', val: 30 },
  ];

  /* ── Componente de card de métrica ── */
  function MetCard({ label, value, color, icon, loading, suffix, prefix }: {
    label: string; value: number | null; color: string; icon: string; loading?: boolean; suffix?: string; prefix?: string;
  }) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 185 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.4, overflowWrap: 'break-word', minWidth: 0 }}>{label}</p>
        </div>
        {loading
          ? <p style={{ fontSize: 20, color: T.mutedFg, margin: 0 }}>...</p>
          : <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>
              {prefix && value !== null ? <span style={{ fontSize: 18, fontWeight: 500 }}>{prefix}</span> : ''}
              {fmt(value)}
              {suffix && value !== null ? <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>{suffix}</span> : ''}
            </p>
        }
      </div>
    );
  }

  /* ── Seção de gráfico com filtros ── */
  function SecaoGrafico({
    cor, historicoPeriodo, meses, pGrafico, fMes, ganhoPer, loadingGanhoPer,
    onPeriodo, onMes, onClearMes, clipId,
  }: {
    cor: string;
    historicoPeriodo: { data: string; ganho_dia: number }[];
    meses: string[];
    pGrafico: typeof periodoGrafico;
    fMes: string | null;
    ganhoPer: number | null;
    loadingGanhoPer?: boolean;
    onPeriodo: (v: typeof periodoGrafico) => void;
    onMes: (m: string) => void;
    onClearMes: () => void;
    clipId: string;
  }) {
    const label = periodoLabel(pGrafico, fMes);
    return (
      <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.mutedFg, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ganho diário</p>
            <div style={{ background: `${cor}12`, border: `1px solid ${cor}30`, borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: T.mutedFg }}>{label}:</span>
              {loadingGanhoPer
                ? <Loader2 size={13} color={cor} style={{ animation: 'spin 1s linear infinite' }} />
                : <span style={{ fontSize: 14, fontWeight: 800, color: cor }}>{ganhoPer != null ? `+${fmt(ganhoPer)}` : '—'}</span>
              }
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {meses.length > 1 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {meses.map(m => {
                  const [ano, mes] = m.split('-');
                  const lbl = `${MESES_PT[mes]}/${ano.slice(2)}`;
                  const ativo = fMes === m;
                  return (
                    <button key={m} onClick={() => { onMes(m); }}
                      style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: `1px solid ${ativo ? cor : T.border}`, background: ativo ? cor : 'transparent', color: ativo ? '#fff' : T.mutedFg, transition: 'all 0.12s' }}>
                      {lbl}
                    </button>
                  );
                })}
                {fMes && (
                  <button onClick={onClearMes}
                    style={{ padding: '3px 7px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'transparent', color: T.mutedFg }}>
                    ✕
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              {periodosGrafico.map(p => (
                <button key={String(p.val)} onClick={() => { onPeriodo(p.val); onClearMes(); }}
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: `1px solid ${!fMes && pGrafico === p.val ? cor : T.border}`, background: !fMes && pGrafico === p.val ? cor : 'transparent', color: !fMes && pGrafico === p.val ? '#fff' : T.mutedFg }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <GraficoBarras historico={historicoPeriodo} cor={cor} clipId={clipId} />
      </div>
    );
  }

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, borderBottom: `2px solid ${T.border}`, paddingBottom: 0 }}>
          {([
            { id: 'instagram', label: '📸 Instagram', cor: COR_IG },
            { id: 'youtube',   label: '▶️ YouTube',   cor: COR_YT },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setAba(tab.id)}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 700,
                border: 'none', background: 'none', cursor: 'pointer',
                color: aba === tab.id ? tab.cor : T.mutedFg,
                borderBottom: `3px solid ${aba === tab.id ? tab.cor : 'transparent'}`,
                marginBottom: -2, transition: 'all 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ ABA INSTAGRAM ═══════════════ */}
        {aba === 'instagram' && (
          <>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>INSTAGRAM</p>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: 0 }}>@destinoseazone — Métricas</h2>
            </div>

            {/* Seguidores */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: T.elevSm }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: '0 0 16px' }}>Seguidores</p>
              {loadingSeguidores && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mutedFg, fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando dados do Reportei...
                </div>
              )}
              {erroSeguidores && <p style={{ color: '#EF4444', fontSize: 13 }}>Erro: {erroSeguidores}</p>}
              {!loadingSeguidores && !erroSeguidores && (
                <div>
                  {/* KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total de Seguidores</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: COR_IG, margin: 0 }}>{fmt(total)}</p>
                    </div>
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ganho Hoje</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', margin: 0 }}>{ganhoHoje != null ? `+${fmt(ganhoHoje)}` : '—'}</p>
                    </div>
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Meta Mensal</p>
                        {!editandoMeta && (
                          <button onClick={() => { setMetaInput(String(metaMes)); setEditandoMeta(true); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mutedFg, padding: 0, display: 'flex', alignItems: 'center' }}>
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                      {editandoMeta ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input autoFocus value={metaInput} onChange={e => setMetaInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') salvarMeta(); if (e.key === 'Escape') setEditandoMeta(false); }}
                            style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#D97706', background: 'transparent', border: 'none', borderBottom: `2px solid ${COR_IG}`, outline: 'none', padding: '2px 0' }} />
                          <button onClick={salvarMeta} style={{ background: COR_IG, border: 'none', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: 20, fontWeight: 800, color: '#D97706', margin: 0 }}>+{fmt(metaMes)}</p>
                      )}
                    </div>
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ganho no Mês</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: COR_IG, margin: 0 }}>{ganhoMes != null ? `+${fmt(ganhoMes)}` : '—'}</p>
                    </div>
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Falta para Meta</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: faltam === 0 ? '#16A34A' : '#DC2626', margin: 0 }}>
                        {faltam != null ? (faltam === 0 ? '✔ Batida!' : fmt(faltam)) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Progresso */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Progresso para meta de +{fmt(metaMes)} no mês</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: progresso >= 100 ? '#16A34A' : COR_IG, margin: 0 }}>{progresso.toFixed(1)}%</p>
                    </div>
                    <div style={{ background: T.border, borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${progresso}%`, height: '100%', background: progresso >= 100 ? '#16A34A' : `linear-gradient(90deg, ${COR_IG}, #A855F7)`, borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  <SecaoGrafico
                    cor={COR_IG}
                    historicoPeriodo={historicoFiltrado}
                    meses={mesesDisponiveis}
                    pGrafico={periodoGrafico}
                    fMes={filterMes}
                    ganhoPer={ganhoPeriodo}
                    loadingGanhoPer={loadingGanho}
                    onPeriodo={v => setPeriodoGrafico(v)}
                    onMes={m => { setFilterMes(f => f === m ? null : m); }}
                    onClearMes={() => setFilterMes(null)}
                    clipId="ig-clip"
                  />
                </div>
              )}
            </div>

            {/* Métricas do Período */}
            {(() => {
              const igPeriodos: { label: string; val: RangeTipo }[] = [
                { label: 'Últ. semana',    val: 'semana'    },
                { label: 'Últ. mês',       val: 'mes'       },
                { label: 'Últ. trimestre', val: 'trimestre' },
              ];
              const igMesesHist: string[] = [];
              const hj = new Date();
              for (let i = 1; i <= 12; i++) {
                const d = new Date(hj.getFullYear(), hj.getMonth() - i, 1);
                igMesesHist.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
              }
              const { label: igLabel } = calcIgRange();

              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: T.elevSm }}>
                  {/* Filtros de período */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: 0 }}>Métricas do Período</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {igPeriodos.map(p => {
                          const ativo = !igMesSel && igTipo === p.val;
                          return (
                            <button key={p.val} onClick={() => { setIgTipo(p.val); setIgMesSel(null); }}
                              style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${ativo ? COR_IG : T.border}`, background: ativo ? COR_IG : T.card, color: ativo ? '#fff' : T.mutedFg, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Histórico de meses */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {igMesesHist.map(m => {
                        const [ano, mes] = m.split('-');
                        const lbl = `${MESES_PT[mes]}/${ano.slice(2)}`;
                        const ativo = igMesSel === m;
                        return (
                          <button key={m} onClick={() => setIgMesSel(ativo ? null : m)}
                            style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: `1px solid ${ativo ? COR_IG : T.border}`, background: ativo ? COR_IG : 'transparent', color: ativo ? '#fff' : T.mutedFg, transition: 'all 0.12s' }}>
                            {lbl}
                          </button>
                        );
                      })}
                      {igMesSel && (
                        <button onClick={() => setIgMesSel(null)}
                          style={{ padding: '3px 7px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'transparent', color: T.mutedFg }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chip do período */}
                  <div style={{ background: `${COR_IG}12`, border: `1px solid ${COR_IG}30`, borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, color: T.mutedFg }}>Período:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COR_IG }}>{igLabel}</span>
                  </div>

                  {loadingMetricas && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mutedFg, fontSize: 13, marginBottom: 16 }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando dados do Reportei...
                    </div>
                  )}
                  {metricas?.error && (
                    <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>Erro: {metricas.error}</p>
                  )}

                  {/* Linha 1 — 5 MetCards numéricos */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <MetCard label="Nº de Seguidores"      value={metricas?.followers_count    ?? null} color={COR_IG}  icon="👤" loading={loadingMetricas} />
                    <MetCard label="Variação de Seguidores" value={metricas?.new_followers      ?? null} color="#10B981" icon="📈" loading={loadingMetricas} prefix="+" />
                    <MetCard label="Visualizações Totais"  value={metricas?.views              ?? null} color="#6366F1" icon="👁️" loading={loadingMetricas} />
                    <MetCard label="Visitas ao Perfil"     value={metricas?.profile_views      ?? null} color="#F59E0B" icon="🏠" loading={loadingMetricas} />
                    <MetCard label="Interações nas Postagens" value={metricas?.total_interactions ?? null} color="#EC4899" icon="❤️" loading={loadingMetricas} />
                  </div>

                </div>
              );
            })()}

            {/* Audiência Atual (snapshot — não muda com período) */}
            {(() => {
              const GENDER_COLORS = ['#3B82F6', '#EC4899', '#9CA3AF'];
              const GENDER_PT     = ['Masculino', 'Feminino', 'Desconhecido'];
              const genderData    = igDemografia?.followers_gender    ?? null;
              const ageGenderData = igDemografia?.followers_gender_age ?? null;
              const loading       = !igDemografia && loadingMetricas;

              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: T.elevSm }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: 0 }}>Audiência Atual</p>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, background: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      dados atuais · não variam por período
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

                    {/* Seguidores por gênero */}
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px 20px', flex: '1 1 260px', minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{ fontSize: 15 }}>⚧</span>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Seguidores por Gênero</p>
                      </div>
                      {loading ? (
                        <p style={{ fontSize: 18, color: T.mutedFg, margin: 0 }}>...</p>
                      ) : !genderData ? (
                        <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Sem dados</p>
                      ) : (() => {
                        const tot = genderData.data.reduce((a, b) => a + b, 0);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {genderData.labels.map((label, i) => {
                              const val = genderData.data[i] ?? 0;
                              const pct = tot > 0 ? (val / tot) * 100 : 0;
                              const color = GENDER_COLORS[i] ?? '#9CA3AF';
                              return (
                                <div key={label}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, color: T.mutedFg, fontWeight: 600 }}>{GENDER_PT[i] ?? label}</span>
                                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct.toFixed(1)}% · {val.toLocaleString('pt-BR')}</span>
                                  </div>
                                  <div style={{ background: T.border, borderRadius: 999, height: 7, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Audiência por idade e gênero */}
                    <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px 20px', flex: '2 1 380px', minWidth: 320 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15 }}>📊</span>
                          <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Audiência por Idade e Gênero</p>
                        </div>
                        {ageGenderData && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            {['Masculino', 'Feminino'].map((lbl, i) => (
                              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: GENDER_COLORS[i] }} />
                                <span style={{ fontSize: 10, color: T.mutedFg }}>{lbl}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {loading ? (
                        <p style={{ fontSize: 18, color: T.mutedFg, margin: 0 }}>...</p>
                      ) : !ageGenderData ? (
                        <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Sem dados</p>
                      ) : (() => {
                        const { labels, series } = ageGenderData;
                        const mSeries = series[0] ?? [];
                        const fSeries = series[1] ?? [];
                        const maxVal  = Math.max(...mSeries, ...fSeries, 1);
                        const W = 520, H = 130, PL = 4, PR = 4, PT = 8, PB = 22;
                        const cW = W - PL - PR, cH = H - PT - PB;
                        const n = labels.length;
                        const groupW = cW / n;
                        const barW   = Math.max(6, groupW * 0.35);
                        const gap    = 2;
                        return (
                          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
                            {[mSeries, fSeries].map((serie, si) =>
                              labels.map((_, li) => {
                                const val = serie[li] ?? 0;
                                const bh  = Math.max(2, (val / maxVal) * cH);
                                const gx  = PL + li * groupW + groupW / 2;
                                const bx  = si === 0 ? gx - barW - gap / 2 : gx + gap / 2;
                                return (
                                  <rect key={`${si}-${li}`} x={bx} y={PT + cH - bh} width={barW} height={bh}
                                    fill={GENDER_COLORS[si]} rx={2} opacity={0.85} />
                                );
                              })
                            )}
                            {labels.map((label, li) => (
                              <text key={li} x={PL + li * groupW + groupW / 2} y={H - 4}
                                fontSize={10} fill={T.mutedFg ?? '#888'} textAnchor="middle">
                                {label}
                              </text>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ═══════════════ ABA YOUTUBE ═══════════════ */}
        {aba === 'youtube' && (() => {
          const { label: ytLabel } = calcYtRange();

          // Últimos 12 meses para histórico
          const ytMesesHist: string[] = [];
          const hj = new Date();
          for (let i = 1; i <= 12; i++) {
            const d = new Date(hj.getFullYear(), hj.getMonth() - i, 1);
            ytMesesHist.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
          }

          const periodos: { label: string; val: 'semana' | 'mes' | 'trimestre' }[] = [
            { label: 'Últ. semana',    val: 'semana'    },
            { label: 'Últ. mês',       val: 'mes'       },
            { label: 'Últ. trimestre', val: 'trimestre' },
          ];

          return (
            <>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>YOUTUBE</p>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: 0 }}>Seazone — Métricas</h2>
              </div>

              {/* Card fixo: total atual de inscritos */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 24px', boxShadow: T.elevSm, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 22 }}>🔔</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.mutedFg, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Inscrições no Canal — Total Atual</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: COR_YT, margin: 0, lineHeight: 1 }}>
                    {ytSubscriberCount !== null ? fmt(ytSubscriberCount) : '—'}
                  </p>
                </div>
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: T.elevSm }}>

                {/* Filtros de período */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: 0 }}>Métricas do Período</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {periodos.map(p => {
                        const ativo = !ytMesSel && ytTipo === p.val;
                        return (
                          <button key={p.val} onClick={() => { setYtTipo(p.val); setYtMesSel(null); }}
                            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${ativo ? COR_YT : T.border}`, background: ativo ? COR_YT : T.card, color: ativo ? '#fff' : T.mutedFg, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Histórico de meses */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ytMesesHist.map(m => {
                      const [ano, mes] = m.split('-');
                      const lbl = `${MESES_PT[mes]}/${ano.slice(2)}`;
                      const ativo = ytMesSel === m;
                      return (
                        <button key={m} onClick={() => setYtMesSel(ativo ? null : m)}
                          style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: `1px solid ${ativo ? COR_YT : T.border}`, background: ativo ? COR_YT : 'transparent', color: ativo ? '#fff' : T.mutedFg, transition: 'all 0.12s' }}>
                          {lbl}
                        </button>
                      );
                    })}
                    {ytMesSel && (
                      <button onClick={() => setYtMesSel(null)}
                        style={{ padding: '3px 7px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'transparent', color: T.mutedFg }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Label do período selecionado */}
                <div style={{ background: `${COR_YT}12`, border: `1px solid ${COR_YT}30`, borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, color: T.mutedFg }}>Período:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COR_YT }}>{ytLabel}</span>
                </div>

                {ytLoadingMetricas && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mutedFg, fontSize: 13, marginBottom: 16 }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando dados do Reportei...
                  </div>
                )}
                {ytMetricas?.error && (
                  <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>Erro: {ytMetricas.error}</p>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <MetCard label="Visualizações"             value={ytMetricas?.views              ?? null} color={COR_YT}  icon="▶️" loading={ytLoadingMetricas} />
                  <MetCard label="Minutos Assistidos"        value={ytMetricas?.watch_time         ?? null} color="#F59E0B" icon="⏱️" loading={ytLoadingMetricas} />
                  <MetCard label="% Média de Visualização"  value={ytMetricas?.avg_view_pct       ?? null} color="#6366F1" icon="📊" loading={ytLoadingMetricas} suffix="%" />
                  <MetCard label="Inscritos no Período"      value={ytMetricas?.subscribers_gained ?? null} color="#10B981" icon="👥" loading={ytLoadingMetricas} />
                  <MetCard label="Gostei"                    value={ytMetricas?.likes              ?? null} color="#16A34A" icon="👍" loading={ytLoadingMetricas} />
                  <MetCard label="Compartilhamentos"         value={ytMetricas?.shares             ?? null} color="#06B6D4" icon="↗️" loading={ytLoadingMetricas} />
                  <MetCard label="Não Gostei"                value={ytMetricas?.dislikes           ?? null} color="#EF4444" icon="👎" loading={ytLoadingMetricas} />
                </div>
              </div>
            </>
          );
        })()}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
