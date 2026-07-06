"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { TeamLayout } from "@/components/team-layout"
import { T } from "@/lib/constants"
import { getSupabase } from "@/app/social-midia/calendario-seazone/_lib/supabase"
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, ArrowUpDown, ExternalLink, X, Calendar, RefreshCw, AlertTriangle, Loader2, Pencil, Check } from "lucide-react"

const NAVY = "#0f1d4e"
const COR  = "#0f1d4e"

/* Colunas com editor modal (texto longo) */
const LONG_TEXT_COLS = ["conteudo_orcado", "observacoes"]

const MES_NOMES: Record<number, string> = {
  1: "01. Janeiro", 2: "02. Fevereiro", 3: "03. Março", 4: "04. Abril",
  5: "05. Maio", 6: "06. Junho", 7: "07. Julho", 8: "08. Agosto",
  9: "09. Setembro", 10: "10. Outubro", 11: "11. Novembro", 12: "12. Dezembro",
}

type Tab = "geral" | "expansao_sp" | "expansao_salvador" | "seazone"
type InfluRow = Record<string, string>

const TABS = [
  { id: "geral"             as Tab, label: "Geral",             table: "" },
  { id: "expansao_sp"       as Tab, label: "Expansão SP",       table: "influencers_expansao_sp" },
  { id: "expansao_salvador" as Tab, label: "Expansão Salvador", table: "influencers_expansao_salvador" },
  { id: "seazone"           as Tab, label: "Seazone",           table: "influencers_seazone" },
]
const DATA_TABS = TABS.filter(t => t.id !== "geral")

type ColDef = { key: string; label: string; width: number; type?: string }

const BASE_COLS: ColDef[] = [
  { key: "ano",                      label: "Ano",              width: 60  },
  { key: "mes",                      label: "Mês",              width: 95  },
  { key: "categoria",                label: "Categoria",        width: 90,  type: "categoria" },
  { key: "perfil",                   label: "Perfil",           width: 160 },
  { key: "link_perfil",              label: "Link",             width: 70,  type: "link" },
  { key: "seguidores",               label: "Seguidores",       width: 85  },
  { key: "contato",                  label: "Contato",          width: 150 },
  { key: "status_contrato",          label: "Status",           width: 140, type: "status" },
  { key: "valor_trabalho",           label: "Vlr Trabalho",     width: 100 },
  { key: "valor_hospedagem",         label: "Vlr Hosp.",        width: 90  },
  { key: "data_visita_hospedagem",   label: "Data Visita",      width: 100 },
  { key: "cupom",                    label: "Cupom",            width: 85  },
  { key: "data_validade_cupom",      label: "Val. Cupom",       width: 95  },
  { key: "data_contratacao",         label: "Dt Contrat.",      width: 100 },
  { key: "data_pagamento",           label: "Dt Pgto",          width: 95  },
  { key: "data_hora_post",           label: "Data Post",        width: 100 },
  { key: "link_publicacao",          label: "Link Post",        width: 70,  type: "link" },
  { key: "quantidade_conversoes",    label: "Conversões",       width: 90  },
  { key: "valor_total_reservas",     label: "Vlr Reservas",     width: 100 },
  { key: "conteudo_orcado",          label: "Conteúdo Orçado",  width: 180 },
  { key: "observacoes",              label: "Observações",      width: 180 },
]

const SEAZONE_COLS: ColDef[] = [
  { key: "ano",                      label: "Ano",              width: 60  },
  { key: "cidade",                   label: "Cidade",           width: 110 },
  { key: "mes",                      label: "Mês",              width: 95  },
  { key: "categoria",                label: "Categoria",        width: 90,  type: "categoria" },
  { key: "perfil",                   label: "Perfil",           width: 160 },
  { key: "link_perfil",              label: "Link",             width: 70,  type: "link" },
  { key: "seguidores",               label: "Seguidores",       width: 85  },
  { key: "contato",                  label: "Contato",          width: 150 },
  { key: "status_contrato",          label: "Status",           width: 140, type: "status" },
  { key: "valor_trabalho",           label: "Vlr Trabalho",     width: 100 },
  { key: "valor_hospedagem",         label: "Vlr Hosp.",        width: 90  },
  { key: "data_visita_hospedagem",   label: "Data Visita",      width: 100 },
  { key: "cupom",                    label: "Cupom",            width: 85  },
  { key: "data_validade_cupom",      label: "Val. Cupom",       width: 95  },
  { key: "data_contratacao",         label: "Dt Contrat.",      width: 100 },
  { key: "data_pagamento",           label: "Dt Pgto",          width: 95  },
  { key: "data_hora_post",           label: "Data Post",        width: 100 },
  { key: "link_publicacao",          label: "Link Post",        width: 70,  type: "link" },
  { key: "quantidade_conversoes",    label: "Conversões",       width: 90  },
  { key: "valor_total_reservas",     label: "Vlr Reservas",     width: 100 },
  { key: "conteudo_orcado",          label: "Conteúdo Orçado",  width: 180 },
  { key: "observacoes",              label: "Observações",      width: 180 },
]

const COLS_BY_TAB: Record<string, ColDef[]> = {
  expansao_sp:       BASE_COLS,
  expansao_salvador: BASE_COLS,
  seazone:           SEAZONE_COLS,
}

const STATUS_OPTIONS    = ["Contratado", "Não contratado", "Aguardando", "Permuta"]
const CATEGORIA_OPTIONS = ["Influ", "Perfil", "Página"]

function statusStyle(s: string): React.CSSProperties {
  const v = (s || "").toLowerCase().trim()
  if (v === "contratado")                        return { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
  if (v.includes("não") || v.includes("nao"))    return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }
  if (v === "aguardando")                        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }
  if (v === "permuta")                           return { background: "#e0e7ff", color: "#3730a3", border: "1px solid #a5b4fc" }
  return { background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }
}

function parseBRL(val: unknown): number {
  if (!val) return 0
  const s = String(val).replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(s) || 0
}
function formatBRL(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── ColFilterPopup ── */
function ColFilterPopup({ colKey, label, allRows, active, sortDir, onApply, onSort, onClose }: {
  colKey: string; label: string; allRows: InfluRow[]
  active: string[]; sortDir: "asc" | "desc" | null
  onApply: (vals: string[]) => void
  onSort: (dir: "asc" | "desc" | null) => void
  onClose: () => void
}) {
  const allOpts = Array.from(new Set(allRows.map(r => r[colKey] || ""))).filter(Boolean)
  const [sortAZ, setSortAZ] = useState(sortDir !== "desc")
  const [searchVal, setSearchVal] = useState("")
  const [selected, setSelected] = useState<string[]>(active.length ? [...active] : [...allOpts])

  const sorted = [...allOpts].sort((a, b) => sortAZ ? a.localeCompare(b, "pt-BR") : b.localeCompare(a, "pt-BR"))
  const visible = sorted.filter(o => o.toLowerCase().includes(searchVal.toLowerCase()))
  const allSelected = selected.length === allOpts.length

  function toggle(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const GS = { border: "#e2e5e9", headerBg: "#f8f9fa", text: "#1a1d23", textMuted: "#6b7280" }

  return (
    <div
      style={{ background: "#fff", border: `1px solid ${GS.border}`, borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 248, overflow: "hidden" }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ padding: "10px 14px", background: GS.headerBg, borderBottom: `1px solid ${GS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: GS.text }}>Filtrar: {label}</span>
        <button onMouseDown={e => { e.preventDefault(); onClose() }} style={{ background: "none", border: "none", cursor: "pointer", color: GS.textMuted, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>✕</button>
      </div>
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${GS.border}`, display: "flex", gap: 6 }}>
        <button onMouseDown={e => { e.preventDefault(); setSortAZ(true); onSort("asc") }}
          style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: `1px solid ${sortAZ ? COR : GS.border}`, borderRadius: 6, background: sortAZ ? `${COR}15` : "#fff", color: sortAZ ? COR : GS.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: sortAZ ? 700 : 400 }}>
          <ChevronUp size={12} /> A → Z
        </button>
        <button onMouseDown={e => { e.preventDefault(); setSortAZ(false); onSort("desc") }}
          style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: `1px solid ${!sortAZ ? COR : GS.border}`, borderRadius: 6, background: !sortAZ ? `${COR}15` : "#fff", color: !sortAZ ? COR : GS.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: !sortAZ ? 700 : 400 }}>
          <ChevronDown size={12} /> Z → A
        </button>
      </div>
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${GS.border}` }}>
        <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="🔍 Buscar..."
          style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: `1px solid ${GS.border}`, borderRadius: 6, outline: "none", boxSizing: "border-box" as const }} />
      </div>
      <div style={{ padding: "6px 14px", borderBottom: `1px solid ${GS.border}`, background: "#fafafa" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: GS.text, fontWeight: 600 }}>
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : [...allOpts])}
            style={{ width: 14, height: 14, accentColor: COR, cursor: "pointer" }} />
          Selecionar tudo ({allOpts.length})
        </label>
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {visible.map(o => (
          <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, color: GS.text }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f0f4ff"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)}
              style={{ width: 14, height: 14, accentColor: COR, cursor: "pointer" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o}</span>
          </label>
        ))}
        {visible.length === 0 && <p style={{ padding: "12px 14px", fontSize: 12, color: GS.textMuted, margin: 0 }}>Nenhum valor encontrado</p>}
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${GS.border}`, display: "flex", gap: 8, justifyContent: "flex-end", background: "#fafafa" }}>
        <button onMouseDown={e => { e.preventDefault(); onClose() }}
          style={{ padding: "6px 16px", fontSize: 12, border: `1px solid ${GS.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: GS.text }}>
          Cancelar
        </button>
        <button onMouseDown={e => { e.preventDefault(); onApply(selected.length === allOpts.length ? [] : selected); onClose() }}
          style={{ padding: "6px 16px", fontSize: 12, border: "none", borderRadius: 6, background: COR, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
          OK
        </button>
      </div>
    </div>
  )
}

/* ── GeralTab ── */
function GeralTab() {
  const now = new Date()
  const anoAtual   = String(now.getFullYear())
  const mesNumero  = String(now.getMonth() + 1).padStart(2, "0") // "06"

  const [orcamento, setOrcamento]           = useState("")
  const [orcamentoInput, setOrcamentoInput] = useState("")
  const [allRows, setAllRows]               = useState<Record<string, InfluRow[]>>({})
  const [loading, setLoading]               = useState(true)
  const [filterAno, setFilterAno]           = useState(anoAtual)
  const [filterMes, setFilterMes]           = useState("todos")

  useEffect(() => {
    const s = localStorage.getItem("influencers_orcamento_total") || ""
    setOrcamento(s); setOrcamentoInput(s)
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      const results: Record<string, InfluRow[]> = {}
      for (const t of DATA_TABS) {
        const { data } = await getSupabase().from(t.table).select("status_contrato,valor_trabalho,valor_hospedagem,ano,mes")
        results[t.id] = (data ?? []) as InfluRow[]
      }
      setAllRows(results); setLoading(false)
    }
    loadAll()
  }, [])

  const todosMeses = Array.from(new Set(
    Object.values(allRows).flat()
      .filter(r => filterAno === "todos" || String(r.ano) === filterAno)
      .map(r => String(r.mes ?? "")).filter(Boolean)
  )).sort()

  /* Após carregar os dados, encontra o mês atual no formato exato que está no banco
     (ex: "06. junho") para que o filtro e o select batam corretamente */
  useEffect(() => {
    if (Object.keys(allRows).length === 0) return
    const mesNoBanco = todosMeses.find(m => m.trim().startsWith(mesNumero))
    setFilterMes(mesNoBanco ?? "todos")
  }, [allRows])

  function saveOrcamento() { setOrcamento(orcamentoInput); localStorage.setItem("influencers_orcamento_total", orcamentoInput) }

  const todosAnos = Array.from(new Set(Object.values(allRows).flat().map(r => String(r.ano ?? "")).filter(Boolean))).sort().reverse()

  function rowPassFilter(r: InfluRow) {
    return (filterAno === "todos" || String(r.ano) === filterAno) && (filterMes === "todos" || String(r.mes) === filterMes)
  }

  const totalBudget = parseBRL(orcamento)
  const breakdown = DATA_TABS.map(t => {
    const rs = (allRows[t.id] ?? []).filter(rowPassFilter)
    const contratados = rs.filter(r => String(r.status_contrato ?? "").toLowerCase().trim() === "contratado")
    const gasto = contratados.reduce((acc, r) => acc + parseBRL(r.valor_trabalho) + parseBRL(r.valor_hospedagem), 0)
    return { id: t.id, label: t.label, contratados: contratados.length, gasto }
  })
  const totalGasto = breakdown.reduce((acc, b) => acc + b.gasto, 0)
  const saldoLivre = totalBudget - totalGasto
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalGasto / totalBudget) * 100)) : 0
  const barColor = pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : NAVY
  const CAMPAIGN_COLORS: Record<string, string> = { expansao_sp: "#185FA5", expansao_salvador: "#B45309", seazone: "#2563eb" }
  const periodoLabel = filterAno === "todos" ? "Todos os períodos" : filterMes === "todos" ? `Ano ${filterAno}` : `${filterMes.replace(/^\d+\.\s*/, "")} de ${filterAno}`

  return (
    <div>
      <InfluencersDashboard />
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16, boxShadow: T.elevSm }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.mutedFg, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Filtrar por período</p>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontSize: 13, color: T.mutedFg, fontWeight: 600 }}>Ano</label>
            <select value={filterAno} onChange={e => { setFilterAno(e.target.value); setFilterMes("todos") }}
              style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 14, color: T.cardFg, outline: "none", minWidth: 110 }}>
              <option value="todos">Todos</option>
              {todosAnos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontSize: 13, color: T.mutedFg, fontWeight: 600 }}>Mês</label>
            <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
              style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 14, color: T.cardFg, outline: "none", minWidth: 170 }}>
              <option value="todos">Todos os meses</option>
              {todosMeses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {(filterAno !== "todos" || filterMes !== "todos") && (
            <button onClick={() => { setFilterAno("todos"); setFilterMes("todos") }}
              style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 14, color: "#991b1b", fontWeight: 600, cursor: "pointer" }}>
              ✕ Limpar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ background: "#eef1f8", border: `1px solid ${NAVY}30`, borderRadius: 8, padding: "9px 16px" }}>
            <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>{periodoLabel}</span>
          </div>
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16, boxShadow: T.elevSm }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.mutedFg, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Orçamento total de marketing</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }}>
          <input value={orcamentoInput} onChange={e => setOrcamentoInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveOrcamento() }}
            placeholder="Ex: R$ 50.000,00"
            style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 15, color: T.cardFg, outline: "none", width: 240 }} />
          <button onClick={saveOrcamento} style={{ background: NAVY, border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 14, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Salvar</button>
        </div>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: "center" as const, color: T.mutedFg }}>Carregando...</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
            {[
              { label: "Orçamento total", value: formatBRL(totalBudget), color: T.cardFg },
              { label: "Já utilizado",    value: formatBRL(totalGasto),  color: "#185FA5" },
              { label: "Saldo livre",     value: formatBRL(saldoLivre),  color: saldoLivre < 0 ? "#991b1b" : "#065f46" },
            ].map(c => (
              <div key={c.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", boxShadow: T.elevSm }}>
                <p style={{ fontSize: 12, color: T.mutedFg, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" as const, letterSpacing: ".05em" }}>{c.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: c.color, margin: 0 }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16, boxShadow: T.elevSm }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: T.mutedFg, fontWeight: 600 }}>Utilização do orçamento</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: barColor }}>{pct}%</span>
            </div>
            <div style={{ height: 12, background: T.bg, borderRadius: 20, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 20, transition: "width .4s ease" }} />
            </div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.elevSm, overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, margin: 0 }}>Breakdown por campanha</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Campanha", "Contratados", "Gasto", "% do orçamento"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left" as const, fontSize: 12, fontWeight: 700, color: T.mutedFg, textTransform: "uppercase" as const, letterSpacing: ".04em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b, i) => {
                  const campPct = totalBudget > 0 ? Math.min(100, Math.round((b.gasto / totalBudget) * 100)) : 0
                  const color = CAMPAIGN_COLORS[b.id] ?? NAVY
                  return (
                    <tr key={b.id} style={{ borderBottom: i < breakdown.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <td style={{ padding: "14px 20px" }}><span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 14, fontWeight: 600, background: color + "18", color }}>{b.label}</span></td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: T.cardFg }}>{b.contratados} influencer{b.contratados !== 1 ? "s" : ""}</td>
                      <td style={{ padding: "14px 20px", fontSize: 15, fontWeight: 600, color: T.cardFg }}>{formatBRL(b.gasto)}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 20, overflow: "hidden", border: `1px solid ${T.border}` }}>
                            <div style={{ height: "100%", width: `${campPct}%`, background: color, borderRadius: 20 }} />
                          </div>
                          <span style={{ fontSize: 14, color: T.mutedFg, minWidth: 38, textAlign: "right" as const }}>{campPct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ background: T.bg, borderTop: `2px solid ${T.border}` }}>
                  <td style={{ padding: "14px 20px", fontSize: 15, fontWeight: 700, color: T.cardFg }}>Total</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: T.cardFg }}>{breakdown.reduce((a, b) => a + b.contratados, 0)} influencers</td>
                  <td style={{ padding: "14px 20px", fontSize: 15, fontWeight: 700, color: "#185FA5" }}>{formatBRL(totalGasto)}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 20, overflow: "hidden", border: `1px solid ${T.border}` }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 20 }} />
                      </div>
                      <span style={{ fontSize: 14, color: T.mutedFg, minWidth: 38, textAlign: "right" as const }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── DataTab ── */
function DataTab({ tableName, cols }: { tableName: string; cols: ColDef[] }) {
  const tableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = tableRef.current; if (!el) return
    function onWheel(e: WheelEvent) { if (e.shiftKey) { e.preventDefault(); if (el) el.scrollLeft += e.deltaY } }
    el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const [rows, setRows]                   = useState<InfluRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [editCell, setEditCell]           = useState<{ id: string; key: string } | null>(null)
  const [editVal, setEditVal]             = useState("")
  const [saving, setSaving]               = useState(false)
  const [colFilters, setColFilters]       = useState<Record<string, string[]>>({})
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null)
  /* posição fixa do popup de filtro — calculada no clique para escapar do overflow */
  const [filterPopupPos, setFilterPopupPos] = useState<{ top: number; left: number } | null>(null)
  const [search, setSearch]               = useState("")
  const [selectedRow, setSelectedRow]     = useState<string | null>(null)
  const [sortCol, setSortCol]             = useState<string | null>(null)
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("asc")
  const [hoverRow, setHoverRow]           = useState<string | null>(null)
  /* modal de edição para colunas de texto longo */
  const [modalEdit, setModalEdit]         = useState<{ id: string; key: string; label: string; val: string } | null>(null)

  useEffect(() => { loadRows() }, [tableName])

  async function loadRows() {
    setLoading(true)
    const { data } = await getSupabase().from(tableName).select("*").order("ano", { ascending: false }).order("mes")
    setRows((data ?? []).map(r => {
      const o: InfluRow = {}
      Object.entries(r).forEach(([k, v]) => { o[k] = v === null || v === undefined ? "" : String(v) })
      return o
    }))
    setLoading(false)
  }

  let filtered = rows.filter(r => {
    for (const [key, vals] of Object.entries(colFilters)) {
      if (vals.length > 0 && !vals.includes(r[key] || "")) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return cols.some(c => (r[c.key] || "").toLowerCase().includes(q))
    }
    return true
  })

  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] || ""; const vb = b[sortCol] || ""
      const cmp = va.localeCompare(vb, "pt-BR", { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
  }

  async function commitEdit(id: string, key: string, val: string) {
    setSaving(true)
    await getSupabase().from(tableName).update({ [key]: val || null }).eq("id", id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
    setEditCell(null); setSaving(false)
  }

  async function addRow() {
    const payload: Record<string, null> = {}; cols.forEach(c => { payload[c.key] = null })
    const { data } = await getSupabase().from(tableName).insert(payload).select().single()
    if (data) {
      const newRow: InfluRow = {}
      Object.entries(data).forEach(([k, v]) => { newRow[k] = v === null ? "" : String(v) })
      setRows(prev => [...prev, newRow]); setSelectedRow(newRow.id)
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("Excluir este influencer?")) return
    await getSupabase().from(tableName).delete().eq("id", id)
    setRows(prev => prev.filter(r => r.id !== id)); setSelectedRow(null)
  }

  async function duplicateRow(row: InfluRow) {
    const payload: Record<string, string | null> = {}
    cols.forEach(c => { payload[c.key] = row[c.key] || null })
    const { data } = await getSupabase().from(tableName).insert(payload).select().single()
    if (data) {
      const newRow: InfluRow = {}
      Object.entries(data).forEach(([k, v]) => { newRow[k] = v === null ? "" : String(v) })
      setRows(prev => [...prev, newRow]); setSelectedRow(newRow.id)
    }
  }

  function toggleSort(key: string) {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(key); setSortDir("asc") }
  }

  function closeFilterPopup() {
    setOpenFilterCol(null)
    setFilterPopupPos(null)
  }

  const activeFiltersCount = Object.values(colFilters).filter(v => v.length > 0).length

  const GS = {
    headerBg:     "#f8f9fa",
    headerBorder: "#e2e5e9",
    cellBorder:   "#edf0f3",
    rowHover:     "#f0f4ff",
    rowSelected:  "#e8effd",
    rowAlt:       "#fafbfd",
    text:         "#1a1d23",
    textMuted:    "#6b7280",
    inputBorder:  "#3b72f6",
  }

  const cellBase: React.CSSProperties = {
    padding: "8px 10px",
    borderRight: `1px solid ${GS.cellBorder}`,
    borderBottom: `1px solid ${GS.cellBorder}`,
    fontSize: 13,
    color: GS.text,
    overflow: "hidden",
    verticalAlign: "top" as const,
    cursor: "cell",
    wordBreak: "break-word" as const,
    whiteSpace: "pre-wrap" as const,
    lineHeight: "20px",
  }

  if (loading) return (
    <div style={{ padding: 64, textAlign: "center" as const, color: GS.textMuted, fontSize: 14 }}>
      Carregando...
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#fff", border: `1px solid ${GS.headerBorder}`, borderBottom: "none", borderRadius: "10px 10px 0 0", flexWrap: "wrap" as const }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Buscar..."
          style={{ padding: "7px 12px", fontSize: 13, border: `1px solid ${GS.headerBorder}`, borderRadius: 8, outline: "none", background: "#fff", color: GS.text, width: 240 }}
        />
        <span style={{ fontSize: 12, color: GS.textMuted, background: "#f3f4f6", padding: "4px 10px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" as const }}>
          {filtered.length} {filtered.length !== 1 ? "linhas" : "linha"}
        </span>
        {activeFiltersCount > 0 && (
          <button onClick={() => setColFilters({})}
            style={{ padding: "5px 10px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#92400e", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} ativo{activeFiltersCount > 1 ? "s" : ""} ✕
          </button>
        )}
        {sortCol && (
          <button onClick={() => setSortCol(null)}
            style={{ padding: "5px 10px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#1d4ed8", display: "flex", alignItems: "center", gap: 4 }}>
            {cols.find(c => c.key === sortCol)?.label} {sortDir === "asc" ? "↑ A-Z" : "↓ Z-A"} ✕
          </button>
        )}
        {selectedRow && (
          <>
            <button onClick={() => { const r = filtered.find(r => r.id === selectedRow); if (r) duplicateRow(r) }}
              style={{ padding: "5px 12px", background: "#fff", border: `1px solid ${GS.headerBorder}`, borderRadius: 6, fontSize: 12, cursor: "pointer", color: GS.text, display: "flex", alignItems: "center", gap: 4 }}>
              <Copy size={13} /> Duplicar
            </button>
            <button onClick={() => deleteRow(selectedRow)}
              style={{ padding: "5px 12px", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={13} /> Excluir
            </button>
          </>
        )}
        <button onClick={addRow}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: NAVY, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} /> Nova linha
        </button>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        style={{ overflowX: "auto", overflowY: "auto", border: `1px solid ${GS.headerBorder}`, borderRadius: "0 0 10px 10px", maxHeight: 580 }}
      >
        <table style={{ borderCollapse: "collapse" as const, fontSize: 13, minWidth: "100%", tableLayout: "fixed" as const }}>
          <colgroup>
            <col style={{ width: 52 }} />
            {cols.map(c => <col key={c.key} style={{ width: c.width }} />)}
          </colgroup>
          <thead style={{ position: "sticky" as const, top: 0, zIndex: 10 }}>
            <tr style={{ background: GS.headerBg }}>
              <th style={{ width: 52, padding: "0 6px", height: 40, borderRight: `1px solid ${GS.headerBorder}`, borderBottom: `2px solid ${GS.headerBorder}`, textAlign: "center" as const, fontSize: 11, color: GS.textMuted, fontWeight: 600 }}>#</th>
              {cols.map(c => {
                const isFiltered = !!(colFilters[c.key]?.length > 0)
                const isSorted = sortCol === c.key
                const isOpen = openFilterCol === c.key
                return (
                  <th key={c.key} style={{ padding: 0, borderRight: `1px solid ${GS.headerBorder}`, borderBottom: `2px solid ${GS.headerBorder}`, background: isFiltered ? `${COR}08` : GS.headerBg, position: "relative" as const }}>
                    <div style={{ display: "flex", alignItems: "stretch", height: 40 }}>
                      <button onClick={() => toggleSort(c.key)}
                        style={{ flex: 1, padding: "0 4px 0 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: 12, color: isSorted || isFiltered ? COR : GS.textMuted, fontWeight: isSorted || isFiltered ? 700 : 600, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", whiteSpace: "nowrap" as const }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
                        {isFiltered && <span style={{ fontSize: 9, background: COR, color: "#fff", borderRadius: 10, padding: "1px 4px", flexShrink: 0 }}>●</span>}
                        {isSorted ? (sortDir === "asc" ? <ChevronUp size={11} color={COR} /> : <ChevronDown size={11} color={COR} />) : <ArrowUpDown size={10} style={{ opacity: 0.3, flexShrink: 0 }} />}
                      </button>
                      {/* Botão de filtro: calcula posição real (getBoundingClientRect) para o popup não ser cortado pelo overflow */}
                      <button
                        onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation()
                          if (isOpen) {
                            closeFilterPopup()
                          } else {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setFilterPopupPos({ top: rect.bottom + 4, left: rect.left })
                            setOpenFilterCol(c.key)
                          }
                        }}
                        style={{ width: 26, height: 40, background: isOpen ? `${COR}20` : isFiltered ? `${COR}15` : "none", border: "none", borderLeft: `1px solid ${GS.headerBorder}`, cursor: "pointer", color: isFiltered || isOpen ? COR : GS.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                        ▼
                      </button>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isSelected = selectedRow === row.id
              const isHovered  = hoverRow === row.id
              const isAlt      = i % 2 === 1
              const bg = isSelected ? GS.rowSelected : isHovered ? GS.rowHover : isAlt ? GS.rowAlt : "#fff"

              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedRow(isSelected ? null : row.id)}
                  onMouseEnter={() => setHoverRow(row.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: bg, transition: "background 0.06s" }}
                >
                  {/* Célula #: altura fixa via wrapper interno para não causar deslocamento no hover */}
                  <td style={{ width: 52, padding: 0, borderRight: `1px solid ${GS.cellBorder}`, borderBottom: `1px solid ${GS.cellBorder}`, verticalAlign: "middle" as const, cursor: "default", background: bg, boxShadow: isSelected ? `inset 3px 0 0 ${COR}` : "none" }}>
                    <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" as const }}>
                      {/* Número sempre renderizado; some no hover via opacity (sem afetar layout) */}
                      <span style={{ position: "absolute" as const, fontSize: 11, color: GS.textMuted, transition: "opacity 0.1s", opacity: (isHovered || isSelected) ? 0 : 1, pointerEvents: "none" }}>
                        {i + 1}
                      </span>
                      {/* Botões sempre renderizados; aparecem no hover via opacity (sem afetar layout) */}
                      <div style={{ display: "flex", gap: 3, transition: "opacity 0.1s", opacity: (isHovered || isSelected) ? 1 : 0, pointerEvents: (isHovered || isSelected) ? "auto" : "none" }}>
                        <button onClick={e => { e.stopPropagation(); duplicateRow(row) }} title="Duplicar"
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: `1px solid ${GS.headerBorder}`, borderRadius: 5, cursor: "pointer", color: GS.textMuted }}>
                          <Copy size={11} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteRow(row.id) }} title="Excluir"
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 5, cursor: "pointer", color: "#dc2626" }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </td>

                  {cols.map(col => {
                    const val = row[col.key] || ""
                    const isEditing = editCell?.id === row.id && editCell?.key === col.key
                    const isLongText = LONG_TEXT_COLS.includes(col.key)

                    if (isEditing) return (
                      <td key={col.key} style={{ padding: 0, borderRight: `1px solid ${GS.cellBorder}`, borderBottom: `1px solid ${GS.cellBorder}`, verticalAlign: "top" as const, borderTop: `2px solid ${GS.inputBorder}` }}>
                        <textarea autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => setTimeout(() => commitEdit(row.id, col.key, editVal), 100)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(row.id, col.key, editVal) }
                            if (e.key === "Escape") setEditCell(null)
                            if (e.key === "Tab") { e.preventDefault(); commitEdit(row.id, col.key, editVal) }
                          }}
                          style={{ width: "100%", minHeight: 36, maxHeight: 140, padding: "8px 10px", fontSize: 13, border: "none", outline: "none", background: "#fff", color: GS.text, boxSizing: "border-box" as const, resize: "vertical" as const, lineHeight: "20px", fontFamily: "inherit" }}
                        />
                      </td>
                    )

                    if (col.type === "status") return (
                      <td key={col.key} style={{ ...cellBase, background: bg, padding: "6px 8px", whiteSpace: "nowrap" as const }}>
                        <select value={val} onChange={e => commitEdit(row.id, col.key, e.target.value)} onClick={e => e.stopPropagation()}
                          style={{ ...statusStyle(val), width: "100%", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer", outline: "none", height: 28 }}>
                          <option value="">—</option>
                          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                    )

                    if (col.type === "categoria") return (
                      <td key={col.key} style={{ ...cellBase, background: bg, padding: "6px 8px", whiteSpace: "nowrap" as const }}>
                        <select value={val} onChange={e => commitEdit(row.id, col.key, e.target.value)} onClick={e => e.stopPropagation()}
                          style={{ width: "100%", padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer", outline: "none", height: 28, background: `${COR}12`, color: COR, border: `1px solid ${COR}40` }}>
                          <option value="">—</option>
                          {CATEGORIA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                    )

                    if (col.type === "link" && val?.startsWith("http")) return (
                      <td key={col.key} style={{ ...cellBase, background: bg, textAlign: "center" as const, whiteSpace: "nowrap" as const }}
                        onDoubleClick={e => { e.stopPropagation(); setEditCell({ id: row.id, key: col.key }); setEditVal(val) }}>
                        <a href={val.split("\n")[0]} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ color: "#2563eb", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: "#eff6ff", borderRadius: 6, border: "1px solid #bfdbfe", fontWeight: 500 }}>
                          <ExternalLink size={11} /> ver
                        </a>
                      </td>
                    )

                    /* Colunas de texto longo: abre modal em duplo clique */
                    if (isLongText) return (
                      <td key={col.key}
                        style={{ ...cellBase, background: bg, cursor: "pointer", maxHeight: 72 }}
                        title="Duplo clique para editar"
                        onDoubleClick={e => { e.stopPropagation(); setModalEdit({ id: row.id, key: col.key, label: col.label, val }) }}>
                        {val
                          ? <span style={{ display: "-webkit-box" as React.CSSProperties["display"], WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden", whiteSpace: "normal" as const }}>{val}</span>
                          : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                      </td>
                    )

                    return (
                      <td key={col.key} style={{ ...cellBase, background: bg }} title={val}
                        onDoubleClick={e => { e.stopPropagation(); setEditCell({ id: row.id, key: col.key }); setEditVal(val) }}>
                        {val
                          ? <span>{val}</span>
                          : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} style={{ padding: "48px 24px", textAlign: "center" as const, color: GS.textMuted, fontSize: 14, borderBottom: `1px solid ${GS.cellBorder}` }}>
                  {search || Object.keys(colFilters).length > 0
                    ? "Nenhuma linha corresponde aos filtros aplicados."
                    : "Nenhuma linha cadastrada. Clique em \"Nova linha\" para começar."}
                </td>
              </tr>
            )}

            <tr
              onClick={addRow}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = GS.rowHover}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"}
              style={{ background: "#fafafa", cursor: "pointer" }}>
              <td colSpan={cols.length + 1} style={{ height: 36, borderBottom: `1px solid ${GS.cellBorder}`, textAlign: "center" as const, color: GS.textMuted, fontSize: 13 }}>
                + Nova linha
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: GS.textMuted, marginTop: 6 }}>
        Passe o mouse sobre a linha para duplicar ou excluir · Duplo clique para editar · Enter para confirmar · Shift+Enter para nova linha · Tab para próxima célula · ▼ para filtrar colunas · Shift+scroll para mover horizontalmente
      </p>

      {/* Popup de filtro com position:fixed para não ser cortado pelo overflow da tabela */}
      {openFilterCol && filterPopupPos && (() => {
        const col = cols.find(c => c.key === openFilterCol)
        if (!col) return null
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onMouseDown={closeFilterPopup} />
            <div style={{ position: "fixed", top: filterPopupPos.top, left: filterPopupPos.left, zIndex: 999 }}>
              <ColFilterPopup
                colKey={openFilterCol}
                label={col.label}
                allRows={rows}
                active={colFilters[openFilterCol] || []}
                sortDir={sortCol === openFilterCol ? sortDir : null}
                onApply={vals => setColFilters(prev => vals.length ? { ...prev, [openFilterCol]: vals } : (({ [openFilterCol]: _, ...rest }) => rest)(prev))}
                onSort={dir => { if (dir) { setSortCol(openFilterCol); setSortDir(dir) } else setSortCol(null) }}
                onClose={closeFilterPopup}
              />
            </div>
          </>
        )
      })()}

      {/* Modal de edição para colunas de texto longo */}
      {modalEdit && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onMouseDown={() => setModalEdit(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: 28, width: 600, maxWidth: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" as const, gap: 16 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1d23" }}>{modalEdit.label}</span>
              <button
                onClick={() => setModalEdit(null)}
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", color: "#6b7280" }}>
                <X size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              value={modalEdit.val}
              onChange={e => setModalEdit(prev => prev ? { ...prev, val: e.target.value } : null)}
              onKeyDown={e => { if (e.key === "Escape") setModalEdit(null) }}
              placeholder="Digite aqui..."
              style={{ width: "100%", minHeight: 220, padding: "14px 16px", fontSize: 15, lineHeight: "26px", border: "1px solid #e2e5e9", borderRadius: 10, outline: "none", resize: "vertical" as const, fontFamily: "inherit", color: "#1a1d23", boxSizing: "border-box" as const }}
            />
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" as const }}>
              {modalEdit.val.length} caracteres
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setModalEdit(null)}
                style={{ padding: "9px 20px", fontSize: 14, border: "1px solid #e2e5e9", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#6b7280" }}>
                Cancelar
              </button>
              <button
                onClick={() => { commitEdit(modalEdit.id, modalEdit.key, modalEdit.val); setModalEdit(null) }}
                style={{ padding: "9px 24px", fontSize: 14, border: "none", borderRadius: 8, background: NAVY, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Dashboard de Influencers (aba Geral) ──
   Espelho invertido do dash do vistas-hospedes:
   PRINCIPAL = reservas em todos os imóveis EXCETO VST · BLOCO de baixo = reservas nas cabanas VST. */
function fmtBRL0(n: number) { return "R$ " + Math.round(n).toLocaleString("pt-BR") }

type DashBucket = { conversoes: number; valor: number }
type DashCupom = DashBucket & { porMes?: Record<string, DashBucket>; outros?: DashBucket; outrosPorMes?: Record<string, DashBucket> }

function SocialAvatar({ url, perfil, size }: { url?: string; perfil: string; size: number }) {
  const [err, setErr] = useState(false)
  const clean = (perfil || "").replace(/^@/, "").trim()
  const initials = (clean.slice(0, 2) || "?").toUpperCase()
  const hue = [...clean].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (url && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={perfil} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", border: `2px solid ${NAVY}30` }} />
  }
  return <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue}, 45%, 46%)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: Math.round(size * 0.36), flexShrink: 0 }}>{initials}</div>
}

function InfluencersDashboard() {
  const [rows, setRows] = useState<InfluRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAno, setFilterAno] = useState("todos")
  const [filterMes, setFilterMes] = useState("todos")
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("Todos")
  const [filterCategoria, setFilterCategoria] = useState("Todos")
  const [sortBy, setSortBy] = useState<"conversoes" | "valor" | "perfil" | "visita">("conversoes")
  const [soComConv, setSoComConv] = useState(false)
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [editFotoKey, setEditFotoKey] = useState<string | null>(null)
  const [fotoInput, setFotoInput] = useState("")
  const [conv, setConv] = useState<Record<string, DashCupom>>({})
  const [convStatus, setConvStatus] = useState<"loading" | "ok" | "sem_chave" | "erro">("loading")
  const [convMsg, setConvMsg] = useState("")

  const syncMetabase = useCallback(async () => {
    setConvStatus("loading"); setConvMsg("")
    try {
      const r = await fetch("/api/vistas-influenciadores-conversoes", { cache: "no-store" })
      const d = await r.json()
      if (d.error === "sem_chave") { setConvStatus("sem_chave"); setConvMsg(d.message || ""); return }
      if (d.error) { setConvStatus("erro"); setConvMsg(d.message || "Erro ao consultar Metabase"); return }
      setConv(d.cupons || {}); setConvStatus("ok")
    } catch (e) { setConvStatus("erro"); setConvMsg(String(e)) }
  }, [])

  useEffect(() => {
    (async () => {
      const loaded: InfluRow[] = []
      for (const t of DATA_TABS) {
        const { data } = await getSupabase().from(t.table).select("*")
        for (const r of (data ?? [])) {
          const o: InfluRow = {}
          Object.entries(r).forEach(([k, v]) => { o[k] = v === null || v === undefined ? "" : String(v) })
          o._key = t.id + ":" + o.id
          o._campanha = t.label
          loaded.push(o)
        }
      }
      setRows(loaded); setLoading(false)
    })()
    try { const s = localStorage.getItem("influencers-social-fotos"); if (s) setFotos(JSON.parse(s)) } catch {}
    syncMetabase()
  }, [syncMetabase])

  function saveFoto(key: string, url: string) {
    setFotos(prev => {
      const next = { ...prev }
      if (url.trim()) next[key] = url.trim(); else delete next[key]
      try { localStorage.setItem("influencers-social-fotos", JSON.stringify(next)) } catch {}
      return next
    })
    setEditFotoKey(null); setFotoInput("")
  }

  const mesNum = filterMes !== "todos" ? filterMes.slice(0, 2) : null
  const periodoAtivo = filterAno !== "todos" || filterMes !== "todos"

  const scoped = (bucket: DashBucket | undefined, porMes: Record<string, DashBucket> | undefined): DashBucket => {
    if (!bucket) return { conversoes: 0, valor: 0 }
    if (!periodoAtivo) return { conversoes: bucket.conversoes, valor: bucket.valor }
    const pm = porMes || {}
    let conversoes = 0, valor = 0
    for (const ym in pm) {
      if (filterAno !== "todos" && ym.slice(0, 4) !== filterAno) continue
      if (mesNum && ym.slice(5, 7) !== mesNum) continue
      conversoes += pm[ym].conversoes; valor += pm[ym].valor
    }
    return { conversoes, valor }
  }
  // PRINCIPAL = todos os imóveis EXCETO VST (no route isso é "outros")
  const mainFor = (cupom: string): DashBucket => {
    const e = conv[(cupom || "").trim().toLowerCase()]
    return e ? scoped(e.outros, e.outrosPorMes) : { conversoes: 0, valor: 0 }
  }
  // SECUNDÁRIO = cabanas Vistas (VST)
  const vstFor = (cupom: string): DashBucket => {
    const e = conv[(cupom || "").trim().toLowerCase()]
    return e ? scoped({ conversoes: e.conversoes, valor: e.valor }, e.porMes) : { conversoes: 0, valor: 0 }
  }

  const anos = ["todos", ...Array.from(new Set(rows.map(r => r.ano).filter(Boolean))).sort().reverse()]
  const meses = ["todos", ...Array.from(new Set(rows.map(r => r.mes).filter(Boolean))).sort()]
  const statusOpts = ["Todos", ...Array.from(new Set(rows.map(r => r.status_contrato).filter(Boolean)))]
  const categoriaOpts = ["Todos", ...Array.from(new Set(rows.map(r => r.categoria).filter(Boolean)))]

  // dedupe por cupom (mantém 1 por cupom; sem cupom fica individual)
  const rowsUnicos = (() => {
    const score = (x: InfluRow) => (String(x.status_contrato).toLowerCase() === "contratado" ? 2 : 0) + (x.data_visita_hospedagem ? 1 : 0)
    const idxByCupom = new Map<string, number>()
    const out: InfluRow[] = []
    for (const r of rows) {
      const k = (r.cupom || "").trim().toLowerCase()
      if (!k) { out.push(r); continue }
      const idx = idxByCupom.get(k)
      if (idx === undefined) { idxByCupom.set(k, out.length); out.push(r) }
      else if (score(r) > score(out[idx])) { out[idx] = r }
    }
    return out
  })()

  const filtrados = rowsUnicos.filter(r => {
    if (periodoAtivo) {
      const matchesReg = (filterAno === "todos" || r.ano === filterAno) && (filterMes === "todos" || r.mes === filterMes)
      if (!matchesReg && !mainFor(r.cupom).conversoes) return false
    }
    if (filterStatus !== "Todos" && r.status_contrato !== filterStatus) return false
    if (filterCategoria !== "Todos" && r.categoria !== filterCategoria) return false
    if (soComConv && !mainFor(r.cupom).conversoes) return false
    if (search) {
      const q = search.toLowerCase()
      if (!((r.perfil || "").toLowerCase().includes(q) || (r.cupom || "").toLowerCase().includes(q))) return false
    }
    return true
  })

  const ordenados = [...filtrados].sort((a, b) => {
    if (sortBy === "perfil") return (a.perfil || "").localeCompare(b.perfil || "", "pt-BR")
    if (sortBy === "visita") return (b.data_visita_hospedagem || "").localeCompare(a.data_visita_hospedagem || "", "pt-BR", { numeric: true })
    if (sortBy === "valor") return mainFor(b.cupom).valor - mainFor(a.cupom).valor
    return mainFor(b.cupom).conversoes - mainFor(a.cupom).conversoes
  })

  const totalConv = filtrados.reduce((s, r) => s + mainFor(r.cupom).conversoes, 0)
  const totalValor = filtrados.reduce((s, r) => s + mainFor(r.cupom).valor, 0)
  const totalVst = filtrados.reduce((s, r) => s + vstFor(r.cupom).conversoes, 0)
  const totalVstValor = filtrados.reduce((s, r) => s + vstFor(r.cupom).valor, 0)
  const ranked = [...filtrados].map(r => ({ r, c: mainFor(r.cupom) })).sort((a, b) => b.c.conversoes - a.c.conversoes)
  const maxConv = Math.max(1, ...ranked.map(x => x.c.conversoes))
  const activeExtra = (search ? 1 : 0) + (filterStatus !== "Todos" ? 1 : 0) + (filterCategoria !== "Todos" ? 1 : 0) + (soComConv ? 1 : 0)
  const periodoLabel = !periodoAtivo ? "todo o período" : `${filterMes !== "todos" ? filterMes.replace(/^\d+\.\s*/, "") : "todos os meses"}${filterAno !== "todos" ? ` / ${filterAno}` : ""}`

  const GS = { text: "#1a1d23", textMuted: "#6b7280", cardBorder: "#edf0f3" }
  const selectStyle: React.CSSProperties = { padding: "4px 8px", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4, outline: "none", background: "#fff", color: GS.text }

  if (loading) return <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.mutedFg, fontSize: 13, padding: "16px 0" }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando dashboard...</div>

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16, boxShadow: T.elevSm }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>Dashboard de Influencers</p>
      <p style={{ fontSize: 12, color: T.mutedFg, margin: "0 0 14px" }}>Reservas em todos os imóveis <b>exceto</b> as cabanas do Vistas (VST) — essas ficam no bloco de cada card.</p>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Ano</span>
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={{ ...selectStyle, minWidth: 80 }}>{anos.map(a => <option key={a} value={a}>{a === "todos" ? "Todos" : a}</option>)}</select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Mês</span>
          <select value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ ...selectStyle, minWidth: 130 }}>{meses.map(m => <option key={m} value={m}>{m === "todos" ? "Todos" : m}</option>)}</select>
        </div>
        <button onClick={() => { setFilterAno("todos"); setFilterMes("todos") }} style={{ marginTop: 14, padding: "4px 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 11, cursor: "pointer", color: T.mutedFg }}>Todos</button>
        <button onClick={syncMetabase} disabled={convStatus === "loading"} style={{ marginLeft: "auto", marginTop: 14, display: "flex", alignItems: "center", gap: 5, background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: convStatus === "loading" ? 0.7 : 1 }}>
          <RefreshCw size={12} style={convStatus === "loading" ? { animation: "spin 1s linear infinite" } : {}} /> Sincronizar Metabase
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14, padding: "10px 12px", background: `${NAVY}06`, border: `1px solid ${NAVY}20`, borderRadius: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar perfil ou cupom..." style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", background: "#fff", color: GS.text, width: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>{statusOpts.map(s => <option key={s} value={s}>{s === "Todos" ? "Status: todos" : s}</option>)}</select>
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} style={selectStyle}>{categoriaOpts.map(c => <option key={c} value={c}>{c === "Todos" ? "Categoria: todas" : c}</option>)}</select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={selectStyle}>
          <option value="conversoes">Ordenar: conversões</option>
          <option value="valor">Ordenar: R$ reservas</option>
          <option value="visita">Ordenar: visita recente</option>
          <option value="perfil">Ordenar: nome (A-Z)</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: GS.text, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={soComConv} onChange={e => setSoComConv(e.target.checked)} style={{ accentColor: NAVY, cursor: "pointer" }} /> Só com conversão
        </label>
        {activeExtra > 0 && (
          <button onClick={() => { setSearch(""); setFilterStatus("Todos"); setFilterCategoria("Todos"); setSoComConv(false) }} style={{ padding: "5px 10px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#92400e" }}>Limpar filtros ✕</button>
        )}
        <span style={{ fontSize: 11, color: T.mutedFg }}>{filtrados.length} de {rowsUnicos.length}</span>
      </div>

      {convStatus === "sem_chave" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#92400e" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Conversões indisponíveis no ambiente local — <b>{convMsg}</b> Aparecem assim que a chave estiver configurada (em produção já funciona).</span>
        </div>
      )}
      {convStatus === "erro" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#991b1b" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> <span>Erro ao consultar Metabase: {convMsg}</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Influencers", value: String(filtrados.length), color: NAVY },
          { label: "Conversões (fora VST)", value: convStatus === "ok" ? totalConv.toLocaleString("pt-BR") : "—", color: "#10b981" },
          { label: "R$ em reservas", value: convStatus === "ok" ? fmtBRL0(totalValor) : "—", color: "#b45309" },
          { label: "Contratados", value: String(filtrados.filter(r => String(r.status_contrato).toLowerCase() === "contratado").length), color: "#065f46" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {convStatus === "ok" && (
        <p style={{ fontSize: 11, color: T.mutedFg, margin: "0 0 12px" }}>
          <Calendar size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
          Conversões e R$ em reservas (todos os imóveis, <b>exceto</b> cabanas VST) referentes a: <b style={{ color: NAVY }}>{periodoLabel}</b> (pela data da reserva)
        </p>
      )}

      {filtrados.length === 0 ? (
        <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>Nenhum influencer com os filtros aplicados.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20, maxHeight: 540, overflowY: "auto", paddingRight: 6 }}>
            {ordenados.map(r => {
              const c = mainFor(r.cupom)
              const v = vstFor(r.cupom)
              const editando = editFotoKey === r._key
              return (
                <div key={r._key} style={{ background: "#fff", border: `1px solid ${GS.cardBorder}`, borderRadius: 12, padding: "16px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative" }}>
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <SocialAvatar url={r.foto || fotos[r._key]} perfil={r.perfil} size={68} />
                    <button title="Trocar foto" onClick={() => { setEditFotoKey(editando ? null : r._key); setFotoInput(r.foto || fotos[r._key] || "") }}
                      style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: "50%", background: NAVY, border: "2px solid #fff", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <Pencil size={11} />
                    </button>
                  </div>
                  {editando && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 8, width: "100%" }}>
                      <input autoFocus value={fotoInput} onChange={e => setFotoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveFoto(r._key, fotoInput); if (e.key === "Escape") { setEditFotoKey(null); setFotoInput("") } }}
                        placeholder="Colar URL da foto" style={{ flex: 1, minWidth: 0, padding: "4px 8px", fontSize: 11, border: `1px solid ${NAVY}`, borderRadius: 6, outline: "none" }} />
                      <button onClick={() => saveFoto(r._key, fotoInput)} style={{ padding: "0 8px", background: NAVY, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}><Check size={13} /></button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{r.perfil || "—"}</span>
                    {(r.link_perfil || "").startsWith("http") && <a href={r.link_perfil.split("\n")[0]} target="_blank" rel="noopener noreferrer" style={{ color: NAVY, display: "flex" }}><ExternalLink size={11} /></a>}
                  </div>
                  {r.seguidores && <span style={{ fontSize: 11, color: GS.textMuted, marginBottom: 6 }}>{r.seguidores} seguidores</span>}
                  {r.status_contrato && <span style={{ ...statusStyle(r.status_contrato), fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "2px 10px", marginBottom: 10 }}>{r.status_contrato}</span>}
                  <div style={{ width: "100%", borderTop: `1px solid ${GS.cardBorder}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, color: GS.textMuted }}>
                      <Calendar size={11} /> {r.data_visita_hospedagem ? `Visita ${r.data_visita_hospedagem}` : "Sem data de visita"}
                    </div>
                    {r.cupom && <div style={{ fontSize: 11, color: GS.textMuted }}>Cupom <span style={{ fontWeight: 700, color: NAVY }}>{r.cupom}</span></div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, background: "#ecfdf5", borderRadius: 8, padding: "6px 4px" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#059669", lineHeight: 1 }}>{convStatus === "ok" ? c.conversoes : "—"}</div>
                        <div style={{ fontSize: 9, color: "#059669", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>conversões</div>
                      </div>
                      <div style={{ flex: 1.3, background: "#fffbeb", borderRadius: 8, padding: "6px 4px" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#b45309", lineHeight: 1 }}>{convStatus === "ok" ? fmtBRL0(c.valor) : "—"}</div>
                        <div style={{ fontSize: 9, color: "#b45309", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>em reservas</div>
                      </div>
                    </div>
                    {convStatus === "ok" && v.conversoes > 0 && (
                      <div style={{ marginTop: 6, padding: "5px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 10, color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
                        <span>Cabanas Vistas (VST): <b>{v.conversoes}</b> · <b>{fmtBRL0(v.valor)}</b></span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ranking */}
          <div style={{ background: "#fff", border: `1px solid ${GS.cardBorder}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: GS.text, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ranking por conversão (fora VST)</p>
            {convStatus !== "ok" ? (
              <p style={{ fontSize: 12, color: GS.textMuted, fontStyle: "italic", margin: 0 }}>O ranking aparece quando as conversões do Metabase estiverem disponíveis.</p>
            ) : ranked.every(x => !x.c.conversoes) ? (
              <p style={{ fontSize: 12, color: GS.textMuted, fontStyle: "italic", margin: 0 }}>Nenhuma conversão (fora VST) registrada para os cupons deste período.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 168, overflowY: "auto", paddingRight: 6 }}>
                {ranked.map(({ r, c }, i) => (
                  <div key={r._key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: GS.textMuted, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    <SocialAvatar url={r.foto || fotos[r._key]} perfil={r.perfil} size={28} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: GS.text, width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{r.perfil || "—"}</span>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 99, height: 16, overflow: "hidden", minWidth: 40 }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${(c.conversoes / maxConv) * 100}%`, background: NAVY, minWidth: c.conversoes > 0 ? 4 : 0, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", width: 56, textAlign: "right", flexShrink: 0 }}>{c.conversoes} conv.</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309", width: 80, textAlign: "right", flexShrink: 0 }}>{fmtBRL0(c.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {convStatus === "ok" && totalVst > 0 && (
            <div style={{ marginTop: 12, padding: "9px 13px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
              <span>Somando os influencers exibidos: <b>{totalVst}</b> reserva{totalVst > 1 ? "s" : ""} desses cupons {totalVst > 1 ? "foram" : "foi"} nas cabanas do Vistas (VST) <b>({fmtBRL0(totalVstValor)})</b> — não contabilizada{totalVst > 1 ? "s" : ""} nos números acima. Veja o detalhe por influencer em cada card.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Page principal ── */
export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("geral")

  return (
    <TeamLayout teamId="social-midia">
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: "0 0 3px" }}>Controle de Influencers</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", border: activeTab === t.id ? "none" : `1px solid ${T.border}`, transition: "all .15s", background: activeTab === t.id ? NAVY : T.card, color: activeTab === t.id ? "#fff" : T.mutedFg, boxShadow: activeTab === t.id ? `0 2px 8px ${NAVY}40` : T.elevSm }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "geral" && <GeralTab />}
      {activeTab !== "geral" && (
        <DataTab
          key={activeTab}
          tableName={TABS.find(t => t.id === activeTab)!.table}
          cols={COLS_BY_TAB[activeTab] ?? BASE_COLS}
        />
      )}
    </TeamLayout>
  )
}
