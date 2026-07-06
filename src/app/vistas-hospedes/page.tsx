"use client"
import { CalendarioConteudoVistas } from './_components/CalendarioConteudoVistas';
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Check, Calendar, Link2, AlertTriangle, Pencil, TrendingUp, TrendingDown, RefreshCw, Sparkles, Copy, ChevronDown, ChevronUp, ArrowUpDown, ExternalLink, X } from "lucide-react"
import { T } from "@/lib/constants"
import type { DayData } from "@/app/api/vistas-reservas/route"
import type { Task } from "@/app/api/vistas-checklist/route"

const META_DIA = 7
const META_MENSAL = 15000
const COR = "#7C3AED"

const fmt2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
function fmtDate(iso: string | null) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
function statusColor(v: number, meta: number) {
  if (v >= meta) return "#10b981"
  if (v >= meta * 0.7) return T.statusWarn ?? "#f59e0b"
  return T.destructive ?? "#ef4444"
}

function TextWithLinks({ text, style }: { text: string; style?: React.CSSProperties }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <span style={style}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: COR, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>🔗</a>
          : part
      )}
    </span>
  )
}

const TOTAL_LINE = "#f59e0b" // laranja — média móvel total
const WEB_LINE = "#06b6d4"   // ciano — média móvel website

const finite = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback)

function ReservasChart({ days }: { days: DayData[] }) {
  const W = 680, H = 130, PL = 28, PB = 22, PT = 8, PR = 8
  const cW = W - PL - PR, cH = H - PT - PB
  const maxV = Math.max(...days.map(d => finite(d.count)), META_DIA) + 2
  const xs = (i: number) => days.length > 1
    ? PL + (i / (days.length - 1)) * cW
    : PL + cW / 2
  const ys = (v: number) => PT + cH - (finite(v) / maxV) * cH
  const metaY = ys(META_DIA)
  const barW = Math.max(2, (cW / Math.max(days.length, 1)) - 2)
  const totalPath = days.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(finite(d.movingAvg))}`).join(" ")
  const webPath = days.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(finite(d.movingAvgWebsite))}`).join(" ")
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      {[0, META_DIA / 2, META_DIA, META_DIA * 1.5].map(v => (
        <line key={v} x1={PL} x2={W - PR} y1={ys(v)} y2={ys(v)} stroke={T.border} strokeWidth={0.5} />
      ))}
      {/* Barras totais (cinza) ao fundo */}
      {days.map((d, i) => {
        const count = finite(d.count)
        const bhT = Math.max(2, (count / maxV) * cH)
        return (
          <rect key={`t-${i}`} x={xs(i) - barW / 2} y={ys(count)} width={barW} height={bhT} fill="#9ca3af33" stroke="#9ca3af" strokeWidth={0.5} rx={1}>
            <title>{fmtDate(d.date)}: {count} reserva{count !== 1 ? "s" : ""} (total)</title>
          </rect>
        )
      })}
      {/* Barras website (verde se ≥ meta, vermelho se abaixo) à frente */}
      {days.map((d, i) => {
        const web = finite(d.countWebsite)
        if (web <= 0) return null
        const bhW = Math.max(2, (web / maxV) * cH)
        const ok = web >= META_DIA
        const fill = ok ? "#10b98155" : `${T.destructive}44`
        const stroke = ok ? "#10b981" : T.destructive
        return (
          <rect key={`w-${i}`} x={xs(i) - barW / 2} y={ys(web)} width={barW} height={bhW} fill={fill} stroke={stroke} strokeWidth={0.5} rx={1}>
            <title>{fmtDate(d.date)}: {web} via website / {finite(d.count)} total</title>
          </rect>
        )
      })}
      <line x1={PL} x2={W - PR} y1={metaY} y2={metaY} stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={W - PR + 3} y={metaY + 4} fontSize={9} fill="#10b981" fontWeight={700}>7</text>
      <path d={totalPath} fill="none" stroke={TOTAL_LINE} strokeWidth={2} strokeLinejoin="round" />
      <path d={webPath} fill="none" stroke={WEB_LINE} strokeWidth={2} strokeLinejoin="round" />
      {[0, 7, 14, 21, 29].map(i => (
        <text key={i} x={xs(i)} y={H - 4} fontSize={8} fill={T.mutedFg ?? "#888"} textAnchor="middle">{fmtDate(days[i]?.date ?? "")}</text>
      ))}
    </svg>
  )
}

const SECTION_META: Record<string, { label: string; live: string | null }> = {
  "midia-paga": { label: "Mídia Paga — Retargeting", live: "25 abr" },
  "website": { label: "Website — Melhorias de Conversão", live: "30 abr" },
  "geral": { label: "Geral", live: null },
}
const SECTION_ORDER = ["midia-paga", "website", "geral"]

const SEED: Omit<Task, "id" | "done" | "createdAt">[] = [
  { title: "Finalizar os 4 briefings de criativo", notes: "Urgência e Emocional", deadline: "2026-04-10", link: null, section: "midia-paga", isWarning: false },
  { title: "Enviar briefings para a head aprovar", notes: "Sinalizar urgência de prazo", deadline: "2026-04-10", link: null, section: "midia-paga", isWarning: false },
  { title: "Head aprova e abre chamado para criação", notes: "Sinalizar urgência de prazo", deadline: "2026-04-10", link: null, section: "midia-paga", isWarning: false },
  { title: "Time de criação produz os 4 criativos", notes: "4 dias úteis — entrega prevista: 16/04", deadline: "2026-04-16", link: null, section: "midia-paga", isWarning: false },
  { title: "Aprovação dos criativos — responsável + head", notes: "Se houver ajustes, retorno em 22/04", deadline: "2026-04-17", link: null, section: "midia-paga", isWarning: false },
  { title: "FERIADO — Tiradentes", notes: "Próximo dia útil: 22/04", deadline: "2026-04-21", link: null, section: "midia-paga", isWarning: true },
  { title: "Enviar criativos aprovados para o growth publicar", notes: "Growth configura campanhas no Meta Ads com segmentações", deadline: "2026-04-22", link: null, section: "midia-paga", isWarning: false },
  { title: "Campanhas de retargeting no ar", notes: "Monitorar CTR e custo por clique nas primeiras 48h", deadline: "2026-04-25", link: null, section: "midia-paga", isWarning: false },
  { title: "Montar briefing das melhorias para o time de tech", notes: "4 itens: pop-up exit intent, filtro por ocasião, contador de disponibilidade, galeria de hóspedes", deadline: "2026-04-13", link: null, section: "website", isWarning: false },
  { title: "Reunião com time de tech — escopo e prazos", notes: "Definir o que entra até 30/04, responsável e data de entrega por item", deadline: "2026-04-14", link: null, section: "website", isWarning: false },
  { title: "Tech implementa pop-up exit intent", notes: "Quick win — menor esforço, maior impacto imediato", deadline: "2026-04-17", link: null, section: "website", isWarning: false },
  { title: "Testar e validar pop-up — aprovação para ir ao ar", notes: "Checar disparo, cupom ativo e link de reserva funcionando", deadline: "2026-04-17", link: null, section: "website", isWarning: false },
  { title: "FERIADO — Tiradentes", notes: "Próximo dia útil: 22/04", deadline: "2026-04-21", link: null, section: "website", isWarning: true },
  { title: "Tech implementa filtro por ocasião + contador de disponibilidade", notes: "4 botões de filtro (Romance / Família / Pet / Workcation) + contador dinâmico nas páginas de cabana", deadline: "2026-04-25", link: null, section: "website", isWarning: false },
  { title: "Review e testes de todas as implementações", notes: "Filtros, contador, responsividade mobile e links de reserva", deadline: "2026-04-29", link: null, section: "website", isWarning: false },
  { title: "Todas as melhorias do site no ar — DEADLINE", notes: "Pop-up, filtro por ocasião e contador funcionando", deadline: "2026-04-30", link: null, section: "website", isWarning: false },
]

interface AddForm { title: string; notes: string; deadline: string; link: string }
const EMPTY_ADD: AddForm = { title: "", notes: "", deadline: "", link: "" }
interface EditForm { title: string; notes: string; deadline: string; link: string }

function ChecklistSection() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingSection, setAddingSection] = useState<string | null>(null)
  const [form, setForm] = useState<AddForm>(EMPTY_ADD)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ title: "", notes: "", deadline: "", link: "" })

  useEffect(() => {
    fetch("/api/vistas-checklist").then(r => r.json()).then(async (data: Task[]) => {
      const list = Array.isArray(data) ? data : []
      if (list.length === 0) {
        const seeded: Task[] = []
        for (const t of SEED) {
          const res = await fetch("/api/vistas-checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) })
          if (res.ok) seeded.push(await res.json())
        }
        setTasks(seeded)
      } else { setTasks(list) }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function sortAll(list: Task[]) {
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return (a.deadline || "9999").localeCompare(b.deadline || "9999")
    })
  }

  const grouped: Record<string, Task[]> = {}
  for (const s of SECTION_ORDER) {
    grouped[s] = sortAll(tasks.filter(t => s === "geral" ? (!t.section || t.section === "geral") : t.section === s))
  }

  async function addTask() {
    if (!form.title.trim() || !addingSection) return
    setSaving(true)
    const res = await fetch("/api/vistas-checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, section: addingSection }) })
    const task = await res.json()
    setTasks(prev => [...prev, task])
    setForm(EMPTY_ADD); setAddingSection(null); setSaving(false)
  }

  async function toggle(id: string, done: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch("/api/vistas-checklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done }) })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch("/api/vistas-checklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editForm }) })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    setEditId(null); setSaving(false)
  }

  async function remove(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch("/api/vistas-checklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
  }

  const totalDone = tasks.filter(t => t.done && !t.isWarning).length
  const totalReal = tasks.filter(t => !t.isWarning).length

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: T.mutedFg, fontSize: 13 }}>
      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando plano de ação...
    </div>
  )

  const inputStyle = { padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font, color: T.cardFg, background: T.muted, outline: "none" }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 12, color: T.mutedFg }}>Período: 10 a 30 de abril · Objetivo: todas as ações de mídia paga e website no ar</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.mutedFg }}><Check size={12} color={COR} style={{ display: "inline", marginRight: 4 }} />{totalDone} de {totalReal} concluídas</p>
        </div>
      </div>
      {SECTION_ORDER.map(sKey => {
        const secTasks = grouped[sKey]
        const meta = SECTION_META[sKey]
        if (secTasks.length === 0 && addingSection !== sKey) return null
        const doneCount = secTasks.filter(t => t.done && !t.isWarning).length
        const totalCount = secTasks.filter(t => !t.isWarning).length
        return (
          <div key={sKey} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${COR}30`, paddingBottom: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.cardFg }}>{meta.label}</span>
                {meta.live && <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981", background: "#10b98115", padding: "2px 8px", borderRadius: 20 }}>Live: {meta.live}</span>}
              </div>
              <span style={{ fontSize: 12, color: T.mutedFg, fontWeight: 600 }}>{doneCount}/{totalCount}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {secTasks.map(task => {
                if (task.isWarning) return (
                  <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                    <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{task.title}</span>{task.notes && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.mutedFg }}>{task.notes}</p>}</div>
                    {task.deadline && <span style={{ fontSize: 11, color: "#f59e0b", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtDate(task.deadline)}</span>}
                  </div>
                )
                if (editId === task.id) return (
                  <div key={task.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}`, background: `${COR}06`, borderRadius: 6 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, padding: "0 4px" }}>
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} autoFocus style={{ ...inputStyle, flex: "1 1 200px" }} />
                      <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observação" style={{ ...inputStyle, flex: "1 1 180px" }} />
                      <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
                      <input value={editForm.link} onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))} placeholder="Link (opcional)" style={{ ...inputStyle, flex: "1 1 160px" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, padding: "0 4px" }}>
                      <button onClick={() => saveEdit(task.id)} style={{ padding: "5px 14px", background: COR, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{saving ? "Salvando..." : "Salvar"}</button>
                      <button onClick={() => setEditId(null)} style={{ padding: "5px 12px", background: "transparent", color: T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
                      <button onClick={() => remove(task.id)} style={{ marginLeft: "auto", padding: "5px 8px", background: "transparent", color: T.destructive, border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
                return (
                  <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.border}`, opacity: task.done ? 0.5 : 1, transition: "opacity 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget.querySelector(".row-actions") as HTMLElement | null)?.style && ((e.currentTarget.querySelector(".row-actions") as HTMLElement).style.opacity = "1") }}
                    onMouseLeave={e => { (e.currentTarget.querySelector(".row-actions") as HTMLElement | null)?.style && ((e.currentTarget.querySelector(".row-actions") as HTMLElement).style.opacity = "0") }}
                  >
                    <button onClick={() => toggle(task.id, !task.done)} style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: "pointer", border: `2px solid ${task.done ? COR : T.border}`, background: task.done ? COR : "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, marginTop: 1 }}>
                      {task.done && <Check size={11} color="#fff" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: T.cardFg, fontWeight: 500, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</span>
                        {task.link && <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: COR, textDecoration: "none" }}><Link2 size={10} /> link</a>}
                      </div>
                      {task.notes && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.mutedFg }}>{task.notes}</p>}
                    </div>
                    {task.deadline && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: T.mutedFg, whiteSpace: "nowrap", flexShrink: 0 }}><Calendar size={10} /> {fmtDate(task.deadline)}</span>}
                    <div className="row-actions" style={{ display: "flex", gap: 4, flexShrink: 0, opacity: 0, transition: "opacity 0.1s" }}>
                      <button onClick={() => { setEditId(task.id); setEditForm({ title: task.title, notes: task.notes || "", deadline: task.deadline || "", link: task.link || "" }) }} style={{ padding: "3px 6px", background: "transparent", color: T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center" }}><Pencil size={11} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            {addingSection === sKey ? (
              <div style={{ padding: "12px 0 4px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Nome da tarefa..." style={{ ...inputStyle, flex: "1 1 200px" }} />
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observação (opcional)" style={{ ...inputStyle, flex: "1 1 200px" }} />
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addTask} disabled={saving || !form.title.trim()} style={{ padding: "6px 14px", background: COR, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, opacity: !form.title.trim() ? 0.5 : 1 }}>{saving ? "Salvando..." : "Adicionar"}</button>
                  <button onClick={() => { setAddingSection(null); setForm(EMPTY_ADD) }} style={{ padding: "6px 12px", background: "transparent", color: T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAddingSection(sKey); setForm(EMPTY_ADD); setEditId(null) }} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, background: "transparent", border: "none", cursor: "pointer", color: T.mutedFg, fontSize: 12, fontFamily: T.font, padding: "4px 0" }}>
                <Plus size={12} /> Adicionar tarefa
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface CriativoRow {
  campaign_name: string; ad_name: string; ad_id: string
  investimento: number; impressoes: number; leads: number; won: number
  gasto_hoje: number; gasto_ontem: number; imp_hoje: number; imp_ontem: number
}

function CriativosSection() {
  const toISO = (d: Date) => d.toISOString().split("T")[0]
  const today = new Date()
  const d30 = new Date(today); d30.setDate(today.getDate() - 30)
  const [dataInicio, setDataInicio] = useState(toISO(d30))
  const [dataFim, setDataFim] = useState(toISO(today))
  const [rows, setRows] = useState<CriativoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [ultimaAtt, setUltimaAtt] = useState("")
  const [iaAnalise, setIaAnalise] = useState("")
  const [iaLoading, setIaLoading] = useState(false)

  const load = useCallback(async (di: string, df: string) => {
    setLoading(true); setError("")
    try {
      const sql = `SELECT campaign_name, ad_name, ad_id,
        SUM(CASE WHEN date >= DATE '${di}' AND date <= DATE '${df}' THEN spend ELSE 0 END) AS investimento,
        SUM(CASE WHEN date >= DATE '${di}' AND date <= DATE '${df}' THEN impressions ELSE 0 END) AS impressoes,
        SUM(CASE WHEN date >= DATE '${di}' AND date <= DATE '${df}' THEN lead ELSE 0 END) AS leads,
        SUM(CASE WHEN date >= DATE '${di}' AND date <= DATE '${df}' THEN won ELSE 0 END) AS won,
        SUM(CASE WHEN date = CURRENT_DATE THEN spend ELSE 0 END) AS gasto_hoje,
        SUM(CASE WHEN date = CURRENT_DATE - INTERVAL '1' DAY THEN spend ELSE 0 END) AS gasto_ontem,
        SUM(CASE WHEN date = CURRENT_DATE THEN impressions ELSE 0 END) AS imp_hoje,
        SUM(CASE WHEN date = CURRENT_DATE - INTERVAL '1' DAY THEN impressions ELSE 0 END) AS imp_ontem
        FROM nekt_operacional_silver.ads_unificado_historico
        WHERE REGEXP_LIKE(campaign_name, '^\\[SH\\]')
          AND (LOWER(campaign_name) LIKE '%vistas%' OR LOWER(campaign_name) LIKE '%anit%' OR LOWER(campaign_name) LIKE '%vista%' OR LOWER(campaign_name) LIKE '%serra%')
          AND campaign_name IN (SELECT DISTINCT campaign_name FROM nekt_operacional_silver.ads_unificado_historico WHERE spend > 0 AND date >= CURRENT_DATE - INTERVAL '7' DAY)
        GROUP BY campaign_name, ad_name, ad_id ORDER BY investimento DESC`
      const res = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql }) })
      const data = await res.json()
      const mapped: CriativoRow[] = (data.rows || []).map((r: Record<string, unknown>) => ({
        campaign_name: String(r.campaign_name || ""), ad_name: String(r.ad_name || ""), ad_id: String(r.ad_id || ""),
        investimento: Number(r.investimento) || 0, impressoes: Number(r.impressoes) || 0,
        leads: Number(r.leads) || 0, won: Number(r.won) || 0,
        gasto_hoje: Number(r.gasto_hoje) || 0, gasto_ontem: Number(r.gasto_ontem) || 0,
        imp_hoje: Number(r.imp_hoje) || 0, imp_ontem: Number(r.imp_ontem) || 0,
      }))
      setRows(mapped); setCampaigns([...new Set(mapped.map(r => r.campaign_name))].filter(Boolean))
      setUltimaAtt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(dataInicio, dataFim) }, [])

  async function analisarIA() {
    setIaLoading(true); setIaAnalise("")
    try {
      const res = await fetch("/api/analyze-creatives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, groupBy: "ad_name", dataInicio, dataFim, vistaMode: true }) })
      const data = await res.json()
      setIaAnalise(data.analysis || data.error || "Sem resposta")
    } catch (e) { setIaAnalise(String(e)) } finally { setIaLoading(false) }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR")
  const inputStyle: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, color: T.cardFg, outline: "none" }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.mutedFg, fontWeight: 600 }}>Período</span>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
        <span style={{ fontSize: 12, color: T.mutedFg }}>até</span>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
        <button onClick={() => load(dataInicio, dataFim)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={12} style={loading ? { animation: "spin 1s linear infinite" } : {}} /> Buscar
        </button>
        {ultimaAtt && <span style={{ fontSize: 11, color: T.mutedFg }}>Atualizado às {ultimaAtt}</span>}
        <button onClick={analisarIA} disabled={iaLoading || rows.length === 0 || loading} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "#7C3AED", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: iaLoading ? 0.7 : 1 }}>
          <Sparkles size={12} /> {iaLoading ? "Analisando..." : "Analisar com IA"}
        </button>
      </div>
      {iaAnalise && (
        <div style={{ background: `#7C3AED10`, border: `1px solid #7C3AED40`, borderRadius: 10, padding: "14px 16px", marginBottom: 14, fontSize: 13, color: T.cardFg, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontWeight: 700, color: "#7C3AED", fontSize: 13 }}><Sparkles size={14} /> Análise IA</div>
          {iaAnalise}
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: T.destructive, background: `${T.destructive}10`, padding: "10px 14px", borderRadius: 8, marginBottom: 10 }}>Erro: {error}</div>}
      {!loading && rows.length === 0 && !error && <div style={{ fontSize: 13, color: T.mutedFg, fontStyle: "italic", background: T.muted, padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}` }}>Nenhum criativo [SH] ativo encontrado para o período.</div>}
      {rows.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.mutedFg }}>{rows.length} criativos ·</span>
          {campaigns.map(c => <span key={c} style={{ background: `${COR}15`, color: COR, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c}</span>)}
        </div>
      )}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.mutedFg, fontSize: 13, padding: "16px 0" }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Buscando criativos na Nekt...</div>
      ) : rows.length > 0 && (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 420 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: T.muted }}>
                {["Anúncio", "Ad ID", "Campanha", "Investimento", "Impressões", "Variação D-1", "Leads", "WON"].map(col =>
                  <th key={col} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: T.mutedFg, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", background: T.muted }}>{col}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const dGasto = row.gasto_hoje - row.gasto_ontem
                const dImp = row.imp_hoje - row.imp_ontem
                const hasVar = row.gasto_hoje > 0 || row.gasto_ontem > 0
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = T.muted }} onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent" }}>
                    <td style={{ padding: "7px 10px", color: T.cardFg, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.ad_name}>{row.ad_name || "—"}</td>
                    <td style={{ padding: "7px 10px", color: T.mutedFg, fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap" }}>{row.ad_id || "—"}</td>
                    <td style={{ padding: "7px 10px" }}><span style={{ background: `${COR}15`, color: COR, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.campaign_name}</span></td>
                    <td style={{ padding: "7px 10px", color: T.cardFg, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>R$ {fmt(row.investimento)}</td>
                    <td style={{ padding: "7px 10px", color: T.mutedFg, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtInt(row.impressoes)}</td>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                      {!hasVar ? <span style={{ color: T.mutedFg, fontSize: 11 }}>—</span> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3, color: dGasto >= 0 ? T.teal600 : T.destructive, fontSize: 11, fontFamily: "monospace" }}>
                            {dGasto >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} R$ {fmt(Math.abs(dGasto))} gasto
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3, color: dImp >= 0 ? T.teal600 : T.destructive, fontSize: 11, fontFamily: "monospace" }}>
                            {dImp >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {fmtInt(Math.abs(dImp))} imp.
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "7px 10px", color: T.teal600, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{row.leads > 0 ? fmtInt(row.leads) : "—"}</td>
                    <td style={{ padding: "7px 10px", color: T.primary, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{row.won > 0 ? fmtInt(row.won) : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Influenciadores ── */
interface InfluRow {
  id: string; ano: string; mes: string; categoria: string; perfil: string
  link_perfil: string; seguidores: string; contato: string; status: string
  valor_trabalho: string; valor_hospedagem: string; data_visita: string
  data_contratacao: string; data_pagamento: string; cupom: string
  validade_cupom: string; data_post: string; link_post: string
  conversoes: string; valor_reservas: string; conteudo_orcado: string; observacoes: string
  foto?: string
}

const INFLU_COLS: { key: keyof InfluRow; label: string; width: number; type?: string }[] = [
  { key: 'ano', label: 'Ano', width: 60 },
  { key: 'mes', label: 'Mês', width: 100 },
  { key: 'categoria', label: 'Categoria', width: 85 },
  { key: 'perfil', label: 'Perfil', width: 160 },
  { key: 'link_perfil', label: 'Link', width: 60, type: 'link' },
  { key: 'seguidores', label: 'Seguidores', width: 85 },
  { key: 'contato', label: 'Contato', width: 140 },
  { key: 'status', label: 'Status', width: 130 },
  { key: 'valor_trabalho', label: 'Vlr Trabalho', width: 95 },
  { key: 'valor_hospedagem', label: 'Vlr Hosp.', width: 85 },
  { key: 'data_visita', label: 'Data Visita', width: 105 },
  { key: 'cupom', label: 'Cupom', width: 85 },
  { key: 'validade_cupom', label: 'Val. Cupom', width: 95 },
  { key: 'data_contratacao', label: 'Dt Contrat.', width: 95 },
  { key: 'data_pagamento', label: 'Dt Pgto', width: 90 },
  { key: 'data_post', label: 'Data Post', width: 100 },
  { key: 'link_post', label: 'Link Post', width: 75, type: 'link' },
  { key: 'conteudo_orcado', label: 'Conteúdo Orçado', width: 180 },
  { key: 'observacoes', label: 'Observações', width: 180 },
]

const MES_NOMES: Record<number, string> = {
  1: '01. Janeiro', 2: '02. Fevereiro', 3: '03. Março', 4: '04. Abril',
  5: '05. Maio', 6: '06. Junho', 7: '07. Julho', 8: '08. Agosto',
  9: '09. Setembro', 10: '10. Outubro', 11: '11. Novembro', 12: '12. Dezembro',
}

function statusStyle(s: string): React.CSSProperties {
  const v = s?.toLowerCase() || ''
  if (v === 'contratado') return { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }
  if (v.includes('não') || v.includes('nao')) return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
  if (v.includes('aguard')) return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
  return { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }
}

function parseValor(v: string): number {
  if (!v) return 0
  const n = parseFloat(v.replace(/[^\d,.-]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function ColFilterPopup({ colKey, label, allRows, active, onApply, onClose }: {
  colKey: keyof InfluRow; label: string; allRows: InfluRow[]
  active: string[]; onApply: (vals: string[]) => void; onClose: () => void
}) {
  const allOpts = Array.from(new Set(allRows.map(r => r[colKey] || ''))).filter(Boolean)
  const [sortAZ, setSortAZ] = useState(true)
  const [searchVal, setSearchVal] = useState('')
  const [selected, setSelected] = useState<string[]>(active.length ? [...active] : [...allOpts])

  const sorted = [...allOpts].sort((a, b) => sortAZ ? a.localeCompare(b, 'pt-BR') : b.localeCompare(a, 'pt-BR'))
  const visible = sorted.filter(o => o.toLowerCase().includes(searchVal.toLowerCase()))
  const allSelected = selected.length === allOpts.length
  const someSelected = selected.length > 0 && !allSelected

  function toggle(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const GS = { border: '#e2e5e9', headerBg: '#f8f9fa', text: '#1a1d23', textMuted: '#6b7280' }

  return (
    <div
      style={{ background: '#fff', border: `1px solid ${GS.border}`, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 248, overflow: 'hidden' }}
      onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
    >
      <div style={{ padding: '10px 14px', background: GS.headerBg, borderBottom: `1px solid ${GS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: GS.text }}>Filtrar: {label}</span>
        <button onMouseDown={e => { e.preventDefault(); onClose() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GS.textMuted, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>✕</button>
      </div>
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${GS.border}`, display: 'flex', gap: 6 }}>
        <button onMouseDown={e => { e.preventDefault(); setSortAZ(true) }}
          style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: `1px solid ${sortAZ ? COR : GS.border}`, borderRadius: 6, background: sortAZ ? `${COR}15` : '#fff', color: sortAZ ? COR : GS.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: sortAZ ? 700 : 400 }}>
          <ChevronUp size={12} /> A → Z
        </button>
        <button onMouseDown={e => { e.preventDefault(); setSortAZ(false) }}
          style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: `1px solid ${!sortAZ ? COR : GS.border}`, borderRadius: 6, background: !sortAZ ? `${COR}15` : '#fff', color: !sortAZ ? COR : GS.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: !sortAZ ? 700 : 400 }}>
          <ChevronDown size={12} /> Z → A
        </button>
      </div>
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${GS.border}` }}>
        <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="🔍 Buscar..."
          style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `1px solid ${GS.border}`, borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ padding: '6px 14px', borderBottom: `1px solid ${GS.border}`, background: '#fafafa' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: GS.text, fontWeight: 600 }}>
          <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }}
            onChange={() => setSelected(allSelected ? [] : [...allOpts])}
            style={{ width: 14, height: 14, accentColor: COR, cursor: 'pointer' }} />
          Selecionar tudo ({allOpts.length})
        </label>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {visible.map(o => (
          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: GS.text }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f5f0ff'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)}
              style={{ width: 14, height: 14, accentColor: COR, cursor: 'pointer' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
          </label>
        ))}
        {visible.length === 0 && <p style={{ padding: '12px 14px', fontSize: 12, color: GS.textMuted, margin: 0 }}>Nenhum valor encontrado</p>}
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${GS.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#fafafa' }}>
        <button onMouseDown={e => { e.preventDefault(); onClose() }}
          style={{ padding: '6px 16px', fontSize: 12, border: `1px solid ${GS.border}`, borderRadius: 6, background: '#fff', cursor: 'pointer', color: GS.text }}>
          Cancelar
        </button>
        <button onMouseDown={e => { e.preventDefault(); onApply(selected.length === allOpts.length ? [] : selected); onClose() }}
          style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: COR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
          OK
        </button>
      </div>
    </div>
  )
}

function InfluenciadoresSection() {
  const tableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = tableRef.current; if (!el) return
    function onWheel(e: WheelEvent) { if (e.shiftKey) { e.preventDefault(); if (el) el.scrollLeft += e.deltaY } }
    el.addEventListener('wheel', onWheel, { passive: false }); return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const [rows, setRows] = useState<InfluRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editCell, setEditCell] = useState<{ id: string; key: keyof InfluRow } | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [colFilters, setColFilters] = useState<Partial<Record<keyof InfluRow, string[]>>>({})
  const [openFilterCol, setOpenFilterCol] = useState<keyof InfluRow | null>(null)
  const [filterPopupPos, setFilterPopupPos] = useState<{ top: number; left: number } | null>(null)
  const [search, setSearch] = useState('')
  const [orcamento, setOrcamento] = useState('')
  const [editOrcamento, setEditOrcamento] = useState(false)
  const [filterAno, setFilterAno] = useState('Todos')
  const [filterMes, setFilterMes] = useState('Todos')
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<keyof InfluRow | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<string | null>(null)
  const [modalEdit, setModalEdit] = useState<{ id: string; key: keyof InfluRow; label: string; val: string } | null>(null)

  useEffect(() => {
    fetch('/api/vistas-influenciadores').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
    try { const s = localStorage.getItem('vistas-orcamento-mensal'); if (s) setOrcamento(s) } catch {}
    const now = new Date()
    setFilterAno(String(now.getFullYear()))
    setFilterMes(MES_NOMES[now.getMonth() + 1] || 'Todos')
  }, [])

  const mesAtual = MES_NOMES[new Date().getMonth() + 1] || ''
  const anos = ['Todos', ...Array.from(new Set(rows.map(r => r.ano).filter(Boolean))).sort()]
  const meses = ['Todos', ...Array.from(new Set(rows.map(r => r.mes).filter(Boolean))).sort()]

  const rowsPeriodo = rows.filter(r => {
    if (filterAno !== 'Todos' && r.ano !== filterAno) return false
    if (filterMes !== 'Todos' && r.mes !== filterMes) return false
    return true
  })

  let filtered = rowsPeriodo.filter(r => {
    for (const [key, vals] of Object.entries(colFilters)) {
      if (vals && vals.length > 0 && !vals.includes(r[key as keyof InfluRow] || '')) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return r.perfil?.toLowerCase().includes(q) || r.observacoes?.toLowerCase().includes(q) || r.cupom?.toLowerCase().includes(q)
    }
    return true
  })

  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] || ''; const vb = b[sortCol] || ''
      const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const totalPeriodo = rowsPeriodo.length
  const contratadosPeriodo = rowsPeriodo.filter(r => r.status?.toLowerCase() === 'contratado').length
  const naoContratadosPeriodo = totalPeriodo - contratadosPeriodo
  const totalUtilizado = rowsPeriodo.filter(r => r.status?.toLowerCase() === 'contratado').reduce((s, r) => s + parseValor(r.valor_trabalho) + parseValor(r.valor_hospedagem), 0)
  const orcamentoNum = parseValor(orcamento)
  const saldo = orcamentoNum - totalUtilizado
  const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function commitEdit(id: string, key: keyof InfluRow, val: string) {
    setSaving(true)
    await fetch('/api/vistas-influenciadores', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [key]: val }) })
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
    setEditCell(null); setSaving(false)
  }

  async function addRow() {
    const now = new Date()
    const newRow: Omit<InfluRow, 'id'> = {
      ano: filterAno !== 'Todos' ? filterAno : String(now.getFullYear()),
      mes: filterMes !== 'Todos' ? filterMes : mesAtual,
      categoria: 'Influ', perfil: 'Novo influenciador', link_perfil: '', seguidores: '',
      contato: '', status: 'Aguardando', valor_trabalho: '', valor_hospedagem: '',
      data_visita: '', data_contratacao: '', data_pagamento: '', cupom: '',
      validade_cupom: '', data_post: '', link_post: '', conversoes: '',
      valor_reservas: '', conteudo_orcado: '', observacoes: '',
    }
    const res = await fetch('/api/vistas-influenciadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRow) })
    const row = await res.json()
    setRows(prev => [...prev, row]); setSelectedRow(row.id)
  }

  async function deleteRow(id: string) {
    if (!confirm('Remover esta linha?')) return
    await fetch('/api/vistas-influenciadores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setRows(prev => prev.filter(r => r.id !== id)); setSelectedRow(null)
  }

  async function duplicateRow(row: InfluRow) {
    const { id, ...rest } = row
    const res = await fetch('/api/vistas-influenciadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) })
    const newRow = await res.json()
    setRows(prev => [...prev, newRow]); setSelectedRow(newRow.id)
  }

  function saveOrcamento(val: string) {
    setOrcamento(val)
    try { localStorage.setItem('vistas-orcamento-mensal', val) } catch {}
    setEditOrcamento(false)
  }

  function toggleSort(key: keyof InfluRow) {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  function closeFilterPopup() {
    setOpenFilterCol(null)
    setFilterPopupPos(null)
  }

  const GS = {
    headerBg: '#f8f9fa',
    headerBorder: '#e2e5e9',
    cellBorder: '#edf0f3',
    rowHover: '#f5f0ff',
    rowSelected: '#ede9fe',
    rowAlt: '#fafbfd',
    text: '#1a1d23',
    textMuted: '#6b7280',
    inputBorder: '#7C3AED',
  }

  const cellBase: React.CSSProperties = {
    padding: '8px 10px',
    borderRight: `1px solid ${GS.cellBorder}`,
    borderBottom: `1px solid ${GS.cellBorder}`,
    fontSize: 13,
    color: GS.text,
    overflow: 'hidden',
    verticalAlign: 'top',
    cursor: 'cell',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    lineHeight: '20px',
  }

  const activeFiltersCount = Object.values(colFilters).filter(v => v && v.length > 0).length
  const LONG_TEXT_COLS: (keyof InfluRow)[] = ['conteudo_orcado', 'observacoes']

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mutedFg, fontSize: 13 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando influenciadores...</div>

  return (
    <div>
      <div style={{ background: `${COR}08`, border: `1px solid ${COR}25`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: COR, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filtrar por período</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Ano</span>
            <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={{ padding: '4px 8px', fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4, outline: 'none', background: '#fff', color: GS.text, minWidth: 80 }}>
              {anos.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Mês</span>
            <select value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ padding: '4px 8px', fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4, outline: 'none', background: '#fff', color: GS.text, minWidth: 130 }}>
              {meses.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterAno('Todos'); setFilterMes('Todos') }} style={{ marginTop: 14, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 11, cursor: 'pointer', color: T.mutedFg }}>
            Todos
          </button>
          <span style={{ marginTop: 14, fontSize: 11, color: T.mutedFg }}>{rowsPeriodo.length} registros</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: String(totalPeriodo), color: GS.text },
          { label: 'Contratados', value: String(contratadosPeriodo), color: '#065f46' },
          { label: 'Não contratados', value: String(naoContratadosPeriodo), color: '#991b1b' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: `1px solid ${GS.cellBorder}`, borderRadius: 6, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 11, color: GS.textMuted }}>{k.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</span>
          </div>
        ))}
        <div style={{ background: '#fff', border: `1px solid ${GS.cellBorder}`, borderRadius: 6, padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div>
            <div style={{ fontSize: 10, color: GS.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Orçamento</div>
            {editOrcamento ? (
              <input autoFocus defaultValue={orcamento} onBlur={e => saveOrcamento(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveOrcamento((e.target as HTMLInputElement).value) }}
                style={{ width: 100, padding: '2px 6px', fontSize: 13, border: `2px solid ${GS.inputBorder}`, borderRadius: 3, outline: 'none' }} placeholder="ex: 8200" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: COR }}>{orcamentoNum ? `R$ ${fmtBRL(orcamentoNum)}` : '—'}</span>
                <button onClick={() => setEditOrcamento(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GS.textMuted, padding: 0 }}><Pencil size={11} /></button>
              </div>
            )}
          </div>
          <div style={{ borderLeft: `1px solid ${GS.cellBorder}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 10, color: GS.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Utilizado</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}>R$ {fmtBRL(totalUtilizado)}</span>
          </div>
          {orcamentoNum > 0 && (
            <div style={{ borderLeft: `1px solid ${GS.cellBorder}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 10, color: GS.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Saldo</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: saldo >= 0 ? '#065f46' : '#991b1b' }}>R$ {fmtBRL(Math.abs(saldo))}{saldo < 0 ? ' ⚠️' : ''}</span>
            </div>
          )}
          {orcamentoNum > 0 && (
            <div style={{ borderLeft: `1px solid ${GS.cellBorder}`, paddingLeft: 12, minWidth: 120 }}>
              <div style={{ fontSize: 10, color: GS.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Utilização <span style={{ fontWeight: 700, color: saldo >= 0 ? '#065f46' : '#991b1b' }}>{((totalUtilizado / orcamentoNum) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (totalUtilizado / orcamentoNum) * 100)}%`, background: saldo >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff', border: `1px solid ${GS.headerBorder}`, borderBottom: 'none', borderRadius: '10px 10px 0 0', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar perfil, cupom..."
          style={{ padding: '7px 12px', fontSize: 13, border: `1px solid ${GS.headerBorder}`, borderRadius: 8, outline: 'none', background: '#fff', color: GS.text, width: 240 }} />
        <span style={{ fontSize: 12, color: GS.textMuted, background: '#f3f4f6', padding: '4px 10px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {filtered.length} {filtered.length !== 1 ? 'linhas' : 'linha'}
        </span>
        {activeFiltersCount > 0 && (
          <button onClick={() => setColFilters({})} style={{ padding: '5px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''} ✕
          </button>
        )}
        {sortCol && (
          <button onClick={() => setSortCol(null)} style={{ padding: '5px 10px', background: '#f5f0ff', border: `1px solid ${COR}50`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: COR, display: 'flex', alignItems: 'center', gap: 4 }}>
            {INFLU_COLS.find(c => c.key === sortCol)?.label} {sortDir === 'asc' ? '↑ A-Z' : '↓ Z-A'} ✕
          </button>
        )}
        {selectedRow && (
          <>
            <button onClick={() => { const r = filtered.find(r => r.id === selectedRow); if (r) duplicateRow(r) }}
              style={{ padding: '5px 12px', background: '#fff', border: `1px solid ${GS.headerBorder}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: GS.text, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Copy size={13} /> Duplicar
            </button>
            <button onClick={() => deleteRow(selectedRow)}
              style={{ padding: '5px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={13} /> Excluir
            </button>
          </>
        )}
        <button onClick={addRow} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Nova linha
        </button>
      </div>

      <div ref={tableRef} style={{ overflowX: 'auto', overflowY: 'auto', border: `1px solid ${GS.headerBorder}`, borderRadius: '0 0 10px 10px', maxHeight: 580 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 52 }} />
            {INFLU_COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: GS.headerBg }}>
              <th style={{ width: 52, padding: '0 6px', height: 40, borderRight: `1px solid ${GS.headerBorder}`, borderBottom: `2px solid ${GS.headerBorder}`, textAlign: 'center', fontSize: 11, color: GS.textMuted, fontWeight: 600 }}>#</th>
              {INFLU_COLS.map(c => {
                const isFiltered = !!(colFilters[c.key] && colFilters[c.key]!.length > 0)
                const isSorted = sortCol === c.key
                const isOpen = openFilterCol === c.key
                return (
                  <th key={c.key} style={{ padding: 0, borderRight: `1px solid ${GS.headerBorder}`, borderBottom: `2px solid ${GS.headerBorder}`, background: isFiltered ? `${COR}08` : GS.headerBg, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'stretch', height: 40 }}>
                      <button onClick={() => toggleSort(c.key)}
                        style={{ flex: 1, padding: '0 4px 0 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: isSorted || isFiltered ? COR : GS.textMuted, fontWeight: isSorted || isFiltered ? 700 : 600, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                        {isFiltered && <span style={{ fontSize: 9, background: COR, color: '#fff', borderRadius: 10, padding: '1px 4px', flexShrink: 0 }}>●</span>}
                        {isSorted ? (sortDir === 'asc' ? <ChevronUp size={11} color={COR} /> : <ChevronDown size={11} color={COR} />) : <ArrowUpDown size={10} style={{ opacity: 0.3, flexShrink: 0 }} />}
                      </button>
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
                        style={{ width: 26, height: 40, background: isOpen ? `${COR}20` : isFiltered ? `${COR}15` : 'none', border: 'none', borderLeft: `1px solid ${GS.headerBorder}`, cursor: 'pointer', color: isFiltered || isOpen ? COR : GS.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
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
              const isHovered = hoverRow === row.id
              const isAlt = i % 2 === 1
              const bg = isSelected ? GS.rowSelected : isHovered ? GS.rowHover : isAlt ? GS.rowAlt : '#fff'
              return (
                <tr key={row.id}
                  onClick={() => setSelectedRow(isSelected ? null : row.id)}
                  onMouseEnter={() => setHoverRow(row.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{ background: bg, transition: 'background 0.06s' }}
                >
                  {/* # / Actions — altura fixa para não causar deslocamento no hover */}
                  <td style={{ width: 52, padding: 0, borderRight: `1px solid ${GS.cellBorder}`, borderBottom: `1px solid ${GS.cellBorder}`, verticalAlign: 'middle', cursor: 'default', background: bg, boxShadow: isSelected ? `inset 3px 0 0 ${COR}` : 'none' }}>
                    <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ position: 'absolute', fontSize: 11, color: GS.textMuted, transition: 'opacity 0.1s', opacity: (isHovered || isSelected) ? 0 : 1, pointerEvents: 'none' }}>
                        {i + 1}
                      </span>
                      <div style={{ display: 'flex', gap: 3, transition: 'opacity 0.1s', opacity: (isHovered || isSelected) ? 1 : 0, pointerEvents: (isHovered || isSelected) ? 'auto' : 'none' }}>
                        <button onClick={e => { e.stopPropagation(); duplicateRow(row) }} title="Duplicar"
                          style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: `1px solid ${GS.headerBorder}`, borderRadius: 5, cursor: 'pointer', color: GS.textMuted }}>
                          <Copy size={11} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteRow(row.id) }} title="Excluir"
                          style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', color: '#dc2626' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </td>
                  {INFLU_COLS.map(col => {
                    const val = row[col.key] || ''
                    const isEditing = editCell?.id === row.id && editCell?.key === col.key
                    const isLongText = LONG_TEXT_COLS.includes(col.key)

                    if (isEditing) return (
                      <td key={col.key} style={{ padding: 0, borderRight: `1px solid ${GS.cellBorder}`, borderBottom: `1px solid ${GS.cellBorder}`, verticalAlign: 'top', borderTop: `2px solid ${GS.inputBorder}` }}>
                        <textarea autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                          onBlur={() => setTimeout(() => commitEdit(row.id, col.key, editVal), 100)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(row.id, col.key, editVal) }
                            if (e.key === 'Escape') setEditCell(null)
                            if (e.key === 'Tab') { e.preventDefault(); commitEdit(row.id, col.key, editVal) }
                          }}
                          style={{ width: '100%', minHeight: 36, maxHeight: 140, padding: '8px 10px', fontSize: 13, border: 'none', outline: 'none', background: '#fff', color: GS.text, boxSizing: 'border-box', resize: 'vertical', lineHeight: '20px', fontFamily: 'inherit' }} />
                      </td>
                    )

                    if (col.key === 'status') return (
                      <td key={col.key} style={{ ...cellBase, background: bg, padding: '6px 8px', whiteSpace: 'nowrap' }}>
                        <select value={val} onChange={e => commitEdit(row.id, col.key, e.target.value)} onClick={e => e.stopPropagation()}
                          style={{ ...statusStyle(val), width: '100%', padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', outline: 'none', height: 28 }}>
                          <option value="">—</option>
                          <option value="Contratado">Contratado</option>
                          <option value="Não contratado">Não contratado</option>
                          <option value="Aguardando">Aguardando</option>
                          <option value="Sem resposta">Sem resposta</option>
                        </select>
                      </td>
                    )

                    if (col.key === 'categoria') return (
                      <td key={col.key} style={{ ...cellBase, background: bg, padding: '6px 8px', whiteSpace: 'nowrap' }}>
                        <select value={val} onChange={e => commitEdit(row.id, col.key, e.target.value)} onClick={e => e.stopPropagation()}
                          style={{ width: '100%', padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', outline: 'none', height: 28, background: `${COR}12`, color: COR, border: `1px solid ${COR}40` }}>
                          <option value="">—</option>
                          <option value="Influ">Influ</option>
                          <option value="Página">Página</option>
                        </select>
                      </td>
                    )

                    if (col.type === 'link') {
                      const links = (val || '').split(/[\s,]+/).map(s => s.trim()).filter(u => /^https?:\/\//.test(u))
                      if (links.length > 0) return (
                        <td key={col.key} style={{ ...cellBase, background: bg, textAlign: 'center' }}
                          onDoubleClick={e => { e.stopPropagation(); setEditCell({ id: row.id, key: col.key }); setEditVal(val) }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                            {links.map((u, li) => (
                              <a key={li} href={u} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={u}
                                style={{ color: COR, fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', background: `${COR}10`, borderRadius: 6, border: `1px solid ${COR}30`, fontWeight: 500 }}>
                                <ExternalLink size={11} /> {links.length > 1 ? `Ver ${li + 1}` : 'ver'}
                              </a>
                            ))}
                          </div>
                        </td>
                      )
                    }

                    if (isLongText) return (
                      <td key={col.key}
                        style={{ ...cellBase, background: bg, cursor: 'pointer', maxHeight: 72 }}
                        title="Duplo clique para editar"
                        onDoubleClick={e => { e.stopPropagation(); setModalEdit({ id: row.id, key: col.key, label: col.label, val }) }}>
                        {val
                          ? <span style={{ display: '-webkit-box' as React.CSSProperties['display'], WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', whiteSpace: 'normal' }}>{val}</span>
                          : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>
                    )

                    return (
                      <td key={col.key} style={{ ...cellBase, background: bg }} title={val}
                        onDoubleClick={e => { e.stopPropagation(); setEditCell({ id: row.id, key: col.key }); setEditVal(val) }}>
                        {val ? <TextWithLinks text={val} style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} /> : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={INFLU_COLS.length + 1} style={{ padding: '48px 24px', textAlign: 'center', color: GS.textMuted, fontSize: 14, borderBottom: `1px solid ${GS.cellBorder}` }}>
                  {search || Object.keys(colFilters).length > 0
                    ? 'Nenhuma linha corresponde aos filtros aplicados.'
                    : 'Nenhuma linha cadastrada. Clique em "Nova linha" para começar.'}
                </td>
              </tr>
            )}

            <tr
              onClick={addRow}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = GS.rowHover}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'}
              style={{ background: '#fafafa', cursor: 'pointer' }}>
              <td colSpan={INFLU_COLS.length + 1} style={{ height: 36, borderBottom: `1px solid ${GS.cellBorder}`, textAlign: 'center', color: GS.textMuted, fontSize: 13 }}>
                + Nova linha
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: GS.textMuted, marginTop: 6 }}>
        Passe o mouse sobre a linha para duplicar ou excluir · Duplo clique para editar · Enter para confirmar · Shift+Enter para nova linha · Tab para próxima célula · ▼ para filtrar colunas · Shift+scroll para mover horizontalmente
      </p>

      {/* Popup de filtro com position:fixed — não é cortado pelo overflow da tabela */}
      {openFilterCol && filterPopupPos && (() => {
        const col = INFLU_COLS.find(c => c.key === openFilterCol)
        if (!col) return null
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onMouseDown={closeFilterPopup} />
            <div style={{ position: 'fixed', top: filterPopupPos.top, left: filterPopupPos.left, zIndex: 999 }}>
              <ColFilterPopup
                colKey={openFilterCol}
                label={col.label}
                allRows={rowsPeriodo}
                active={colFilters[openFilterCol] || []}
                onApply={vals => {
                  setColFilters(prev => {
                    const next = { ...prev }
                    if (vals.length) next[openFilterCol!] = vals
                    else delete next[openFilterCol!]
                    return next
                  })
                }}
                onClose={closeFilterPopup}
              />
            </div>
          </>
        )
      })()}

      {/* Modal de edição para texto longo */}
      {modalEdit && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onMouseDown={() => setModalEdit(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 600, maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', gap: 16 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>{modalEdit.label}</span>
              <button onClick={() => setModalEdit(null)}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#6b7280' }}>
                <X size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              value={modalEdit.val}
              onChange={e => setModalEdit(prev => prev ? { ...prev, val: e.target.value } : null)}
              onKeyDown={e => { if (e.key === 'Escape') setModalEdit(null) }}
              placeholder="Digite aqui..."
              style={{ width: '100%', minHeight: 220, padding: '14px 16px', fontSize: 15, lineHeight: '26px', border: '1px solid #e2e5e9', borderRadius: 10, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#1a1d23', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
              {modalEdit.val.length} caracteres
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalEdit(null)}
                style={{ padding: '9px 20px', fontSize: 14, border: '1px solid #e2e5e9', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
                Cancelar
              </button>
              <button
                onClick={() => { commitEdit(modalEdit.id, modalEdit.key, modalEdit.val); setModalEdit(null) }}
                style={{ padding: '9px 24px', fontSize: 14, border: 'none', borderRadius: 8, background: COR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Dashboard de Influenciadores (abaixo da planilha) ── */
interface Bucket { conversoes: number; valor: number }
interface CupomConv extends Bucket { porMes?: Record<string, Bucket>; outros?: Bucket; outrosPorMes?: Record<string, Bucket> }

function InfluAvatar({ url, perfil, size }: { url?: string; perfil: string; size: number }) {
  const [err, setErr] = useState(false)
  const clean = (perfil || '').replace(/^@/, '').trim()
  const initials = (clean.slice(0, 2) || '?').toUpperCase()
  const hue = [...clean].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (url && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={perfil} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', border: `2px solid ${COR}30` }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue}, 52%, 55%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.36), flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function InfluenciadoresDashboard() {
  const [rows, setRows] = useState<InfluRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAno, setFilterAno] = useState('Todos')
  const [filterMes, setFilterMes] = useState('Todos')
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [editFotoId, setEditFotoId] = useState<string | null>(null)
  const [fotoInput, setFotoInput] = useState('')
  const [conv, setConv] = useState<Record<string, CupomConv>>({})
  const [convStatus, setConvStatus] = useState<'loading' | 'ok' | 'sem_chave' | 'erro'>('loading')
  const [convMsg, setConvMsg] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [filterCategoria, setFilterCategoria] = useState('Todos')
  const [sortBy, setSortBy] = useState<'conversoes' | 'valor' | 'perfil' | 'visita'>('conversoes')
  const [soComConv, setSoComConv] = useState(false)

  const syncMetabase = useCallback(async () => {
    setConvStatus('loading'); setConvMsg('')
    try {
      const r = await fetch('/api/vistas-influenciadores-conversoes', { cache: 'no-store' })
      const d = await r.json()
      if (d.error === 'sem_chave') { setConvStatus('sem_chave'); setConvMsg(d.message || ''); return }
      if (d.error) { setConvStatus('erro'); setConvMsg(d.message || 'Erro ao consultar Metabase'); return }
      setConv(d.cupons || {}); setConvStatus('ok')
    } catch (e) { setConvStatus('erro'); setConvMsg(String(e)) }
  }, [])

  useEffect(() => {
    fetch('/api/vistas-influenciadores').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
    try { const s = localStorage.getItem('vistas-influ-fotos'); if (s) setFotos(JSON.parse(s)) } catch {}
    const now = new Date()
    setFilterAno(String(now.getFullYear()))
    setFilterMes(MES_NOMES[now.getMonth() + 1] || 'Todos')
    syncMetabase()
  }, [syncMetabase])

  async function saveFoto(id: string, url: string) {
    const v = url.trim()
    setRows(prev => prev.map(r => r.id === id ? { ...r, foto: v } : r)) // atualiza a tela na hora
    setEditFotoId(null); setFotoInput('')
    try {
      const res = await fetch('/api/vistas-influenciadores', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, foto: v }) })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      alert('Não consegui salvar a foto no banco. Confira se a coluna "foto" já foi criada no Supabase.\n\nDetalhe: ' + String(e))
    }
  }

  // Número do mês selecionado ("03. Março" -> "03"); null quando "Todos"
  const mesNum = filterMes !== 'Todos' ? filterMes.slice(0, 2) : null
  const periodoAtivo = filterAno !== 'Todos' || filterMes !== 'Todos'

  // Conversões/R$ do cupom, respeitando o período selecionado (por data da reserva).
  // Sem período => total geral do cupom.
  const convFor = (cupom: string): Bucket | null => {
    const k = (cupom || '').trim().toLowerCase()
    const entry = k ? conv[k] : null
    if (!entry) return null
    if (!periodoAtivo) return { conversoes: entry.conversoes, valor: entry.valor }
    const pm = entry.porMes || {}
    let conversoes = 0, valor = 0
    for (const ym in pm) {
      if (filterAno !== 'Todos' && ym.slice(0, 4) !== filterAno) continue
      if (mesNum && ym.slice(5, 7) !== mesNum) continue
      conversoes += pm[ym].conversoes; valor += pm[ym].valor
    }
    return { conversoes, valor }
  }

  // Reservas do mesmo cupom em OUTROS imóveis (não-VST), respeitando o período.
  const outrosFor = (cupom: string): Bucket => {
    const k = (cupom || '').trim().toLowerCase()
    const entry = k ? conv[k] : null
    if (!entry || !entry.outros) return { conversoes: 0, valor: 0 }
    if (!periodoAtivo) return { conversoes: entry.outros.conversoes, valor: entry.outros.valor }
    const pm = entry.outrosPorMes || {}
    let conversoes = 0, valor = 0
    for (const ym in pm) {
      if (filterAno !== 'Todos' && ym.slice(0, 4) !== filterAno) continue
      if (mesNum && ym.slice(5, 7) !== mesNum) continue
      conversoes += pm[ym].conversoes; valor += pm[ym].valor
    }
    return { conversoes, valor }
  }

  // Deduplica por cupom (case-insensitive) — mantém 1 linha por cupom, preferindo
  // a mais completa (contratado > com data de visita). Linhas sem cupom ficam individuais.
  const rowsUnicos = (() => {
    const score = (x: InfluRow) => (x.status?.toLowerCase() === 'contratado' ? 2 : 0) + (x.data_visita ? 1 : 0)
    const idxByCupom = new Map<string, number>()
    const out: InfluRow[] = []
    for (const r of rows) {
      const k = (r.cupom || '').trim().toLowerCase()
      if (!k) { out.push(r); continue }
      const idx = idxByCupom.get(k)
      if (idx === undefined) { idxByCupom.set(k, out.length); out.push(r) }
      else if (score(r) > score(out[idx])) { out[idx] = r }
    }
    return out
  })()
  const duplicatasRemovidas = rows.length - rowsUnicos.length

  const anos = ['Todos', ...Array.from(new Set(rows.map(r => r.ano).filter(Boolean))).sort()]
  const meses = ['Todos', ...Array.from(new Set(rows.map(r => r.mes).filter(Boolean))).sort()]
  const statusOpts = ['Todos', ...Array.from(new Set(rows.map(r => r.status).filter(Boolean)))]
  const categoriaOpts = ['Todos', ...Array.from(new Set(rows.map(r => r.categoria).filter(Boolean))).filter(c => c !== 'Perfil')]

  const filtrados = rowsUnicos.filter(r => {
    // Período: aparece se foi registrado no mês OU se o cupom teve reserva no período
    if (periodoAtivo) {
      const matchesReg = (filterAno === 'Todos' || r.ano === filterAno) && (filterMes === 'Todos' || r.mes === filterMes)
      if (!matchesReg && !(convFor(r.cupom)?.conversoes)) return false
    }
    if (filterStatus !== 'Todos' && r.status !== filterStatus) return false
    if (filterCategoria !== 'Todos' && r.categoria !== filterCategoria) return false
    if (soComConv && !(convFor(r.cupom)?.conversoes)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(r.perfil?.toLowerCase().includes(q) || r.cupom?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const ordenados = [...filtrados].sort((a, b) => {
    if (sortBy === 'perfil') return (a.perfil || '').localeCompare(b.perfil || '', 'pt-BR')
    if (sortBy === 'visita') return (b.data_visita || '').localeCompare(a.data_visita || '', 'pt-BR', { numeric: true })
    if (sortBy === 'valor') return (convFor(b.cupom)?.valor || 0) - (convFor(a.cupom)?.valor || 0)
    return (convFor(b.cupom)?.conversoes || 0) - (convFor(a.cupom)?.conversoes || 0)
  })

  const totalConv = filtrados.reduce((s, r) => s + (convFor(r.cupom)?.conversoes || 0), 0)
  const totalValor = filtrados.reduce((s, r) => s + (convFor(r.cupom)?.valor || 0), 0)
  const totalOutros = filtrados.reduce((s, r) => s + outrosFor(r.cupom).conversoes, 0)
  const totalOutrosValor = filtrados.reduce((s, r) => s + outrosFor(r.cupom).valor, 0)
  const ranked = [...filtrados]
    .map(r => ({ r, c: convFor(r.cupom) }))
    .sort((a, b) => (b.c?.conversoes || 0) - (a.c?.conversoes || 0))
  const maxConv = Math.max(1, ...ranked.map(x => x.c?.conversoes || 0))
  const activeExtra = (search ? 1 : 0) + (filterStatus !== 'Todos' ? 1 : 0) + (filterCategoria !== 'Todos' ? 1 : 0) + (soComConv ? 1 : 0)
  const periodoLabel = !periodoAtivo
    ? 'todo o período'
    : `${filterMes !== 'Todos' ? filterMes.replace(/^\d+\.\s*/, '') : 'todos os meses'}${filterAno !== 'Todos' ? ` / ${filterAno}` : ''}`

  const fmtBRL0 = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
  const GS = { text: '#1a1d23', textMuted: '#6b7280', border: '#e2e5e9', cardBorder: '#edf0f3' }

  const selectStyle: React.CSSProperties = { padding: '4px 8px', fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4, outline: 'none', background: '#fff', color: GS.text }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mutedFg, fontSize: 13, padding: '16px 0' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando dashboard...</div>

  return (
    <div>
      {/* Filtro por período + status do Metabase */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Ano</span>
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={{ ...selectStyle, minWidth: 80 }}>{anos.map(a => <option key={a}>{a}</option>)}</select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>Mês</span>
          <select value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ ...selectStyle, minWidth: 130 }}>{meses.map(m => <option key={m}>{m}</option>)}</select>
        </div>
        <button onClick={() => { setFilterAno('Todos'); setFilterMes('Todos') }} style={{ marginTop: 14, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 11, cursor: 'pointer', color: T.mutedFg }}>Todos</button>
        <span style={{ marginTop: 14, fontSize: 11, color: T.mutedFg }}>
          {filtrados.length} de {rowsUnicos.length} influenciadores
          {duplicatasRemovidas > 0 && <span style={{ color: '#92400e' }}> · {duplicatasRemovidas} duplicata{duplicatasRemovidas > 1 ? 's' : ''} de cupom oculta{duplicatasRemovidas > 1 ? 's' : ''}</span>}
        </span>
        <button onClick={syncMetabase} disabled={convStatus === 'loading'} style={{ marginLeft: 'auto', marginTop: 14, display: 'flex', alignItems: 'center', gap: 5, background: T.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: convStatus === 'loading' ? 0.7 : 1 }}>
          <RefreshCw size={12} style={convStatus === 'loading' ? { animation: 'spin 1s linear infinite' } : {}} /> Sincronizar Metabase
        </button>
      </div>

      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, padding: '10px 12px', background: `${COR}06`, border: `1px solid ${COR}20`, borderRadius: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar perfil ou cupom..."
          style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, outline: 'none', background: '#fff', color: GS.text, width: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle} title="Status">
          {statusOpts.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Status: todos' : s}</option>)}
        </select>
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} style={selectStyle} title="Categoria">
          {categoriaOpts.map(c => <option key={c} value={c}>{c === 'Todos' ? 'Categoria: todas' : c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={selectStyle} title="Ordenar por">
          <option value="conversoes">Ordenar: conversões</option>
          <option value="valor">Ordenar: R$ reservas</option>
          <option value="visita">Ordenar: visita recente</option>
          <option value="perfil">Ordenar: nome (A-Z)</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: GS.text, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={soComConv} onChange={e => setSoComConv(e.target.checked)} style={{ accentColor: COR, cursor: 'pointer' }} />
          Só com conversão
        </label>
        {activeExtra > 0 && (
          <button onClick={() => { setSearch(''); setFilterStatus('Todos'); setFilterCategoria('Todos'); setSoComConv(false) }}
            style={{ padding: '5px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
            Limpar filtros ✕
          </button>
        )}
      </div>

      {/* Aviso de conexão Metabase */}
      {convStatus === 'sem_chave' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#92400e' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Conversões indisponíveis no ambiente local — <b>{convMsg}</b> Os números por cupom aparecem assim que a chave estiver configurada (em produção já funciona).</span>
        </div>
      )}
      {convStatus === 'erro' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: `${T.destructive}11`, border: `1px solid ${T.destructive}55`, borderRadius: 8, marginBottom: 14, fontSize: 12, color: T.destructive }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> <span>Erro ao consultar Metabase: {convMsg}</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Influenciadores', value: String(filtrados.length), color: COR },
          { label: 'Conversões (cupons)', value: convStatus === 'ok' ? totalConv.toLocaleString('pt-BR') : '—', color: '#10b981' },
          { label: 'R$ em reservas', value: convStatus === 'ok' ? fmtBRL0(totalValor) : '—', color: '#f59e0b' },
          { label: 'Contratados', value: String(filtrados.filter(r => r.status?.toLowerCase() === 'contratado').length), color: '#065f46' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {convStatus === 'ok' && (
        <p style={{ fontSize: 11, color: T.mutedFg, margin: '0 0 12px' }}>
          <Calendar size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
          Conversões e R$ em reservas nas cabanas do Vistas (VST) referentes a: <b style={{ color: COR }}>{periodoLabel}</b> (pela data da reserva)
        </p>
      )}
      {filtrados.length === 0 ? (
        <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Nenhum influenciador com os filtros aplicados.</p>
      ) : (
        <>
          {/* Cards com foto — altura limitada (~2 linhas) com scroll interno */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20, maxHeight: 540, overflowY: 'auto', paddingRight: 6 }}>
            {ordenados.map(r => {
              const c = convFor(r.cupom)
              const o = outrosFor(r.cupom)
              const editando = editFotoId === r.id
              return (
                <div key={r.id} style={{ background: '#fff', border: `1px solid ${GS.cardBorder}`, borderRadius: 12, padding: '16px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                  {/* Foto + editar */}
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <InfluAvatar url={r.foto || fotos[r.id]} perfil={r.perfil} size={68} />
                    <button title="Trocar foto" onClick={() => { setEditFotoId(editando ? null : r.id); setFotoInput(fotos[r.id] || '') }}
                      style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: COR, border: '2px solid #fff', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <Pencil size={11} />
                    </button>
                  </div>
                  {editando && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, width: '100%' }}>
                      <input autoFocus value={fotoInput} onChange={e => setFotoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveFoto(r.id, fotoInput); if (e.key === 'Escape') { setEditFotoId(null); setFotoInput('') } }}
                        placeholder="Colar URL da foto"
                        style={{ flex: 1, minWidth: 0, padding: '4px 8px', fontSize: 11, border: `1px solid ${COR}`, borderRadius: 6, outline: 'none' }} />
                      <button onClick={() => saveFoto(r.id, fotoInput)} style={{ padding: '0 8px', background: COR, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Check size={13} /></button>
                    </div>
                  )}
                  {/* Perfil */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{r.perfil || '—'}</span>
                    {r.link_perfil?.startsWith('http') && (
                      <a href={r.link_perfil.split('\n')[0]} target="_blank" rel="noopener noreferrer" style={{ color: COR, display: 'flex' }}><ExternalLink size={11} /></a>
                    )}
                  </div>
                  {r.seguidores && <span style={{ fontSize: 11, color: GS.textMuted, marginBottom: 6 }}>{r.seguidores} seguidores</span>}
                  {/* Status */}
                  {r.status && <span style={{ ...statusStyle(r.status), fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 10px', marginBottom: 10 }}>{r.status}</span>}
                  {/* Visita */}
                  <div style={{ width: '100%', borderTop: `1px solid ${GS.cardBorder}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, color: GS.textMuted }}>
                      <Calendar size={11} /> {r.data_visita ? `Visita ${r.data_visita}` : 'Sem data de visita'}
                    </div>
                    {r.cupom && <div style={{ fontSize: 11, color: GS.textMuted }}>Cupom <span style={{ fontWeight: 700, color: COR }}>{r.cupom}</span></div>}
                    {/* Conversões */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, background: '#ecfdf5', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{c ? c.conversoes : (convStatus === 'ok' ? 0 : '—')}</div>
                        <div style={{ fontSize: 9, color: '#059669', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>conversões</div>
                      </div>
                      <div style={{ flex: 1.3, background: '#fffbeb', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{c ? fmtBRL0(c.valor) : (convStatus === 'ok' ? 'R$ 0' : '—')}</div>
                        <div style={{ fontSize: 9, color: '#d97706', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>em reservas</div>
                      </div>
                    </div>
                    {convStatus === 'ok' && o.conversoes > 0 && (
                      <div style={{ marginTop: 6, padding: '5px 8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 10, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
                        <span>Outros imóveis: <b>{o.conversoes}</b> · <b>{fmtBRL0(o.valor)}</b></span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ranking por conversão */}
          <div style={{ background: '#fff', border: `1px solid ${GS.cardBorder}`, borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: GS.text, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ranking por conversão</p>
            {convStatus !== 'ok' ? (
              <p style={{ fontSize: 12, color: GS.textMuted, fontStyle: 'italic', margin: 0 }}>O ranking aparece quando as conversões do Metabase estiverem disponíveis.</p>
            ) : ranked.every(x => !x.c?.conversoes) ? (
              <p style={{ fontSize: 12, color: GS.textMuted, fontStyle: 'italic', margin: 0 }}>Nenhuma conversão registrada para os cupons deste período.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 168, overflowY: 'auto', paddingRight: 6 }}>
                {ranked.map(({ r, c }, i) => {
                  const conversoes = c?.conversoes || 0
                  const valor = c?.valor || 0
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: GS.textMuted, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <InfluAvatar url={r.foto || fotos[r.id]} perfil={r.perfil} size={28} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: GS.text, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.perfil || '—'}</span>
                      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 99, height: 16, overflow: 'hidden', minWidth: 40 }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${(conversoes / maxConv) * 100}%`, background: COR, minWidth: conversoes > 0 ? 4 : 0, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', width: 56, textAlign: 'right', flexShrink: 0 }}>{conversoes} conv.</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706', width: 80, textAlign: 'right', flexShrink: 0 }}>{fmtBRL0(valor)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {convStatus === 'ok' && totalOutros > 0 && (
            <div style={{ marginTop: 12, padding: '9px 13px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
              <span>
                Somando os influenciadores exibidos: <b>{totalOutros}</b> reserva{totalOutros > 1 ? 's' : ''} desses cupons {totalOutros > 1 ? 'foram' : 'foi'} em outros imóveis (fora das cabanas VST) <b>({fmtBRL0(totalOutrosValor)})</b> — não contabilizada{totalOutros > 1 ? 's' : ''} nos números acima. Veja o detalhe por influenciador em cada card.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SocialMediaSection() {
  const [data, setData] = useState<{
    total_seguidores: number | null; ganho_hoje: number | null; ganho_mes: number | null
    historico: { data: string; total_seguidores: number; ganho_dia: number }[]
  } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<7 | 14 | 30 | 'mes'>('mes')
  const [filterMes, setFilterMes] = useState<string | null>(null)
  const [ganhoPeriodoReportei, setGanhoPeriodoReportei] = useState<number | null>(null)
  const [loadingGanho, setLoadingGanho] = useState(false)
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [metaMensal, setMetaMensal] = useState<number>(META_MENSAL)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaInput, setMetaInput] = useState(String(META_MENSAL))

  useEffect(() => {
    const saved = localStorage.getItem("vistas-meta-mensal")
    if (saved) {
      const n = parseInt(saved, 10)
      if (!isNaN(n) && n > 0) { setMetaMensal(n); setMetaInput(String(n)) }
    }
  }, [])

  function salvarMeta() {
    const n = parseInt(metaInput, 10)
    if (!isNaN(n) && n > 0) {
      setMetaMensal(n)
      localStorage.setItem("vistas-meta-mensal", String(n))
    }
    setEditandoMeta(false)
  }

  useEffect(() => {
    fetch("/api/seguidores-vistas")
      .then(r => r.json())
      .then(d => {
        if (d?.error) setErro(d.error)
        else setData(d)
      })
      .catch(e => setErro(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [])

  // Busca ganho direto do Reportei sempre que período ou mês mudar (exceto "mês atual" que já vem da rota principal)
  useEffect(() => {
    if (periodo === 'mes' && !filterMes) {
      setGanhoPeriodoReportei(null)
      return
    }
    setLoadingGanho(true)
    setGanhoPeriodoReportei(null)

    let url: string
    if (filterMes) {
      url = `/api/seguidores-vistas-mensal?mes=${filterMes}`
    } else {
      const fim = new Date().toISOString().split('T')[0]
      const ini = new Date(); ini.setDate(ini.getDate() - (periodo as number))
      url = `/api/seguidores-vistas-mensal?start=${ini.toISOString().split('T')[0]}&end=${fim}`
    }

    fetch(url)
      .then(r => r.json())
      .then(d => setGanhoPeriodoReportei(d.ganho ?? null))
      .catch(() => setGanhoPeriodoReportei(null))
      .finally(() => setLoadingGanho(false))
  }, [periodo, filterMes])

  const total = data?.total_seguidores ?? null
  const ganhoMes = data?.ganho_mes ?? null
  const ganhoHoje = data?.ganho_hoje ?? null
  const historicoCompleto = data?.historico ?? []

  const historicoFiltrado = (() => {
    if (filterMes) return historicoCompleto.filter(d => d.data.slice(0, 7) === filterMes)
    if (periodo === 'mes') {
      const inicioMes = new Date().toISOString().slice(0, 7) + '-01'
      return historicoCompleto.filter(d => d.data >= inicioMes)
    }
    const corte = new Date(); corte.setDate(corte.getDate() - (periodo as number))
    return historicoCompleto.filter(d => d.data >= corte.toISOString().split('T')[0])
  })()

  // Ganho: sempre do Reportei — para mês atual usa ganho_mes da rota principal
  const ganhoPeriodo = (() => {
    if (!filterMes && periodo === 'mes') return ganhoMes
    return ganhoPeriodoReportei
  })()

  const totalSeguidoresPeriodo = (() => {
    const ultimo = historicoFiltrado[historicoFiltrado.length - 1]
    if (ultimo?.total_seguidores) return ultimo.total_seguidores
    if (total === null || !ultimo?.data) return null
    const ganhoApos = historicoCompleto
      .filter(d => d.data > ultimo.data)
      .reduce((s, d) => s + (d.ganho_dia || 0), 0)
    return total - ganhoApos
  })()

  const faltaMeta = Math.max(0, metaMensal - (ganhoMes ?? 0))
  const progressoMeta = Math.min(100, ((ganhoMes ?? 0) / metaMensal) * 100)

  const maxGanho = Math.max(...historicoFiltrado.map(d => finite(d.ganho_dia)), 1)
  const W = 680, H = 140, PL = 36, PB = 28, PT = 8, PR = 8
  const cW = W - PL - PR, cH = H - PT - PB
  const n = historicoFiltrado.length
  const barW = n > 1 ? Math.max(6, (cW / n) - 3) : 20
  const xs = (i: number) => n > 1 ? PL + (i / (n - 1)) * cW : PL + cW / 2
  const ys = (v: number) => PT + cH - (finite(v) / maxGanho) * cH

  const periodos: { label: string; val: 7 | 14 | 30 | 'mes' }[] = [
    { label: 'Mês atual', val: 'mes' }, { label: '7 dias', val: 7 }, { label: '14 dias', val: 14 }, { label: '30 dias', val: 30 },
  ]

  const MESES_PT: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  }

  const mesesDisponiveis = Array.from(new Set(historicoCompleto.map(d => d.data.slice(0, 7)))).sort()

  const periodoLabel = (() => {
    if (filterMes) return `${MESES_PT[filterMes.slice(5)]}/${filterMes.slice(2, 4)}`
    if (periodo === 'mes') {
      const hoje = new Date()
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      return `${fmt(ini)} — ${fmt(hoje)}`
    }
    const hoje = new Date()
    const ini = new Date(); ini.setDate(hoje.getDate() - (periodo as number))
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    return `${fmt(ini)} — ${fmt(hoje)}`
  })()

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: T.cardFg, margin: "0 0 12px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>Seguidores</p>
      {erro && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: `${T.destructive}11`, border: `1px solid ${T.destructive}55`, borderRadius: 8, fontSize: 12, color: T.destructive, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Reportei: {erro}</span>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Total de Seguidores", value: loading ? "—" : total?.toLocaleString("pt-BR") ?? "—", color: COR },
          { label: "Ganho Hoje", value: loading ? "—" : ganhoHoje != null ? `+${ganhoHoje.toLocaleString("pt-BR")}` : "—", color: "#10b981" },
          { label: "Meta Mensal", value: `+${metaMensal.toLocaleString("pt-BR")}`, color: "#f59e0b" },
          { label: "Ganho no Mês", value: loading ? "—" : ganhoMes != null ? `+${ganhoMes.toLocaleString("pt-BR")}` : "—", color: COR },
          { label: "Falta para Meta", value: loading ? "—" : faltaMeta > 0 ? faltaMeta.toLocaleString("pt-BR") : "✅ Meta batida!", color: faltaMeta > 0 ? "#ef4444" : "#10b981" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</p>
            {kpi.label === "Meta Mensal" ? (
              editandoMeta ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: kpi.color }}>+</span>
                  <input
                    type="number"
                    value={metaInput}
                    onChange={e => setMetaInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") salvarMeta()
                      if (e.key === "Escape") { setEditandoMeta(false); setMetaInput(String(metaMensal)) }
                    }}
                    autoFocus
                    style={{ width: 90, fontSize: 16, fontWeight: 800, color: kpi.color, background: "transparent", border: `1px solid ${kpi.color}88`, borderRadius: 6, padding: "2px 6px", outline: "none", fontFamily: "inherit" }}
                  />
                  <button onClick={salvarMeta} title="Salvar" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#10b981", lineHeight: 1 }}><Check size={14} /></button>
                  <button onClick={() => { setEditandoMeta(false); setMetaInput(String(metaMensal)) }} title="Cancelar" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.mutedFg, lineHeight: 1 }}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                  <button onClick={() => { setEditandoMeta(true); setMetaInput(String(metaMensal)) }} title="Editar meta" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.mutedFg, lineHeight: 1, opacity: 0.6 }}><Pencil size={12} /></button>
                </div>
              )
            ) : (
              <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, margin: 0 }}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : kpi.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {!loading && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.mutedFg, marginBottom: 4 }}>
            <span>Progresso para meta de +{metaMensal.toLocaleString("pt-BR")} no mês</span>
            <span style={{ fontWeight: 700, color: progressoMeta >= 100 ? "#10b981" : COR }}>{progressoMeta.toFixed(1)}%</span>
          </div>
          <div style={{ background: T.border, borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${progressoMeta}%`, background: progressoMeta >= 100 ? "#10b981" : COR, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      <div style={{ background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.mutedFg, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>Ganho diário</p>
            {!loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                <div style={{ background: `${COR}12`, border: `1px solid ${COR}30`, borderRadius: 8, padding: "4px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.mutedFg }}>{periodoLabel}:</span>
                  {loadingGanho
                    ? <Loader2 size={13} color={COR} style={{ animation: "spin 1s linear infinite" }} />
                    : <span style={{ fontSize: 14, fontWeight: 800, color: COR }}>
                        {ganhoPeriodo != null ? `+${ganhoPeriodo.toLocaleString("pt-BR")}` : "—"}
                      </span>
                  }
                </div>
                {totalSeguidoresPeriodo !== null && (
                  <div style={{ background: `${COR}08`, border: `1px solid ${COR}20`, borderRadius: 8, padding: "4px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: T.mutedFg }}>Total no período:</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: COR }}>{totalSeguidoresPeriodo.toLocaleString("pt-BR")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            {mesesDisponiveis.length > 1 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {mesesDisponiveis.map(m => {
                  const [ano, mes] = m.split('-')
                  const label = `${MESES_PT[mes]}/${ano.slice(2)}`
                  const ativo = filterMes === m
                  return (
                    <button key={m} onClick={() => { setFilterMes(ativo ? null : m); setTooltip(null) }}
                      style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", fontFamily: T.font, border: `1px solid ${ativo ? COR : T.border}`, background: ativo ? COR : "transparent", color: ativo ? "#fff" : T.mutedFg, transition: "all 0.12s" }}>
                      {label}
                    </button>
                  )
                })}
                {filterMes && (
                  <button onClick={() => { setFilterMes(null); setTooltip(null) }}
                    style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", color: T.mutedFg, fontFamily: T.font }}>
                    ✕
                  </button>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {periodos.map(p => (
                <button key={String(p.val)} onClick={() => { setPeriodo(p.val); setFilterMes(null); setTooltip(null) }}
                  style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", fontFamily: T.font, border: `1px solid ${!filterMes && periodo === p.val ? COR : T.border}`, background: !filterMes && periodo === p.val ? COR : "transparent", color: !filterMes && periodo === p.val ? "#fff" : T.mutedFg }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {historicoFiltrado.length === 0 ? (
          <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
            Sem dados para o período. O histórico é preenchido automaticamente ao abrir a página.
          </p>
        ) : (
          <div style={{ overflow: "hidden", position: "relative" }} onMouseLeave={() => setTooltip(null)}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}
              onMouseMove={e => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
                const mx = ((e.clientX - rect.left) / rect.width) * W
                let closest = 0; let minD = Infinity
                historicoFiltrado.forEach((_, i) => { const d = Math.abs(xs(i) - mx); if (d < minD) { minD = d; closest = i } })
                if (minD < barW * 2) setTooltip({ idx: closest, x: xs(closest), y: ys(historicoFiltrado[closest]?.ganho_dia || 0) })
                else setTooltip(null)
              }}>
              <defs><clipPath id="chart-clip"><rect x={PL} y={PT} width={cW} height={cH} /></clipPath></defs>
              {[0, Math.round(maxGanho / 2), maxGanho].map(v => (
                <g key={v}>
                  <line x1={PL} x2={W - PR} y1={ys(v)} y2={ys(v)} stroke={T.border} strokeWidth={0.5} />
                  <text x={PL - 4} y={ys(v) + 4} fontSize={9} fill={T.mutedFg ?? "#888"} textAnchor="end">{v}</text>
                </g>
              ))}
              <g clipPath="url(#chart-clip)">
                {historicoFiltrado.map((d, i) => {
                  const ganho = finite(d.ganho_dia)
                  const bh = Math.max(2, (ganho / maxGanho) * cH)
                  const isHoje = d.data === new Date().toISOString().split("T")[0]
                  return (
                    <rect key={d.data} x={xs(i) - barW / 2} y={ys(ganho)} width={barW} height={bh}
                      fill={tooltip?.idx === i ? "#5B21B6" : isHoje ? COR : `${COR}60`} rx={2} style={{ transition: "fill 0.1s" }} />
                  )
                })}
              </g>
              {tooltip && <line x1={xs(tooltip.idx)} x2={xs(tooltip.idx)} y1={PT} y2={H - PB} stroke={COR} strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />}
              {historicoFiltrado.length <= 20
                ? historicoFiltrado.map((d, i) => (
                  <text key={d.data} x={xs(i)} y={H - 6} fontSize={9} fill={tooltip?.idx === i ? COR : T.mutedFg ?? "#888"} fontWeight={tooltip?.idx === i ? 700 : 400} textAnchor="middle">{d.data.slice(8)}</text>
                ))
                : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1].map(i => (
                  <text key={i} x={xs(i)} y={H - 6} fontSize={9} fill={T.mutedFg ?? "#888"} textAnchor="middle">
                    {historicoFiltrado[i]?.data.slice(8)}/{historicoFiltrado[i]?.data.slice(5, 7)}
                  </text>
                ))
              }
            </svg>
            {tooltip && (() => {
              const d = historicoFiltrado[tooltip.idx]
              const ganho = d?.ganho_dia || 0
              const dataFmt = d?.data.split("-").reverse().join("/") ?? ""
              const isHoje = d?.data === new Date().toISOString().split("T")[0]
              return (
                <div style={{ position: "absolute", top: 4, left: `${(xs(tooltip.idx) / W) * 100}%`, transform: tooltip.idx > n * 0.65 ? "translateX(-110%)" : "translateX(10px)", background: T.card, border: `1.5px solid ${COR}50`, borderRadius: 10, padding: "10px 14px", pointerEvents: "none", zIndex: 10, boxShadow: "0 4px 20px rgba(124,58,237,0.15)", minWidth: 150 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: T.mutedFg, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {dataFmt}
                    {isHoje && <span style={{ background: COR, color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>hoje</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COR, lineHeight: 1 }}>+{ganho.toLocaleString("pt-BR")}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: T.mutedFg }}>seguidores ganhos</p>
                </div>
              )
            })()}
          </div>
        )}
      </div>
      <div style={{ marginTop: 28 }}>
  <p style={{ fontSize: 13, fontWeight: 700, color: T.cardFg, margin: "0 0 12px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>Dashboard de Influenciadores</p>
  <InfluenciadoresDashboard />
</div>
<div style={{ marginTop: 28 }}>
  <p style={{ fontSize: 13, fontWeight: 700, color: T.cardFg, margin: "0 0 12px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>Planilha de Influenciadores</p>
  <InfluenciadoresSection />
</div>
<div style={{ marginTop: 32 }}>
  <p style={{ fontSize: 13, fontWeight: 700, color: T.cardFg, margin: "0 0 16px", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
    Calendário de Conteúdo
  </p>
  <CalendarioConteudoVistas />
</div>
    </div>
  )
}

export default function VistasHospedesPage() {
  const [days, setDays] = useState<DayData[]>([])
  const [loadingRes, setLoadingRes] = useState(true)
  const [errorRes, setErrorRes] = useState("")

  const fetchReservas = useCallback(async () => {
    setLoadingRes(true); setErrorRes("")
    try {
      const res = await fetch("/api/vistas-reservas", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro")
      setDays(data.days || [])
    } catch (e) { setErrorRes(String(e)) } finally { setLoadingRes(false) }
  }, [])

  useEffect(() => { fetchReservas() }, [fetchReservas])

  const today = days[days.length - 1]?.count ?? 0
  const avg30 = days.length > 0 ? (days.reduce((s, d) => s + d.count, 0) / days.length) : 0
  const avg30r = Math.round(avg30 * 10) / 10
  const avg30Web = days.length > 0 ? (days.reduce((s, d) => s + d.countWebsite, 0) / days.length) : 0
  const avg30WebR = Math.round(avg30Web * 10) / 10
  const daysAboveMeta = days.filter(d => d.countWebsite >= META_DIA).length

  return (
    <div style={{ minHeight: "100vh", background: T.muted, fontFamily: T.font }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <header style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 40, boxShadow: T.elevSm }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.mutedFg, fontSize: 12, textDecoration: "none", fontWeight: 500 }}><ChevronLeft size={14} /> Menu</Link>
        <span style={{ color: T.border }}>|</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: COR, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: T.cardFg }}>Vistas de Anitá — Hóspedes</span>
      </header>
      <main style={{ padding: "24px 24px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.mutedFg, margin: "0 0 2px" }}>Nekt · Reservas Válidas (Stays)</p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: T.cardFg, margin: 0 }}>Meta de Reservas — Anitápolis</h2>
            </div>
            <button onClick={fetchReservas} disabled={loadingRes} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, color: T.mutedFg, cursor: "pointer", fontFamily: T.font }}>
              {loadingRes ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "↻"} Atualizar
            </button>
          </div>
          {errorRes ? (
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: T.muted, border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: T.mutedFg }}>⚠️ Dados de reservas não disponíveis no ambiente local.</span>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Média 30d total", value: loadingRes ? "—" : fmt2(avg30r), color: "#f59e0b" },
                  { label: "Média 30d website", value: loadingRes ? "—" : fmt2(avg30WebR), color: statusColor(avg30WebR, META_DIA) },
                  { label: "Meta diária website", value: String(META_DIA), color: "#10b981" },
                  { label: "Dias acima da meta", value: loadingRes ? "—" : `${daysAboveMeta}/${days.length}`, color: statusColor(daysAboveMeta, days.length / 2) },
                  { label: "Status média website", value: loadingRes ? "—" : avg30WebR >= META_DIA ? "✔ Acima da meta" : "Abaixo da meta", color: statusColor(avg30WebR, META_DIA) },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: T.elevSm }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                  </div>
                ))}
              </div>
              {!loadingRes && days.length > 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: T.elevSm }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, fontSize: 11, color: T.mutedFg, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#9ca3af55", borderRadius: 2, display: "inline-block" }} /> Total/dia</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#10b98155", borderRadius: 2, display: "inline-block" }} /> Website (≥ meta)</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: `${T.destructive}44`, borderRadius: 2, display: "inline-block" }} /> Website (&lt; meta)</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, background: "#f59e0b", display: "inline-block" }} /> Média 30d total</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, background: "#06b6d4", display: "inline-block" }} /> Média 30d website</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, background: "#10b981", borderTop: "2px dashed #10b981", display: "inline-block" }} /> Meta (7/dia)</span>
                  </div>
                  <ReservasChart days={days} />
                </div>
              )}
              {loadingRes && <div style={{ textAlign: "center", padding: 32, background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}><Loader2 size={20} color={COR} style={{ animation: "spin 1s linear infinite" }} /></div>}
            </>
          )}
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            <Link href="/vistas-hospedes/plano-de-acao" style={{ textDecoration: "none" }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: T.elevSm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: `4px solid ${COR}` }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COR, margin: "0 0 4px" }}>Plano de Ação</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>To do&apos;s por sub-área</p>
                  <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Mídia paga · Website · Social · Automação</p>
                </div>
                <ChevronRight size={20} color={T.mutedFg} />
              </div>
            </Link>
            <Link href="/vistas-hospedes/resumo-resultados" style={{ textDecoration: "none" }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: T.elevSm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #10b981" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981", margin: "0 0 4px" }}>Resultados</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>Resumo e resultado das ações</p>
                  <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Métricas · Análise estratégica por IA</p>
                </div>
                <ChevronRight size={20} color={T.mutedFg} />
              </div>
            </Link>
            <Link href="/vistas-hospedes/midia-paga" style={{ textDecoration: "none" }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: T.elevSm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: `4px solid ${T.primary}` }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.primary, margin: "0 0 4px" }}>Mídia Paga</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>Análise de desempenho</p>
                  <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Meta Ads · Gastos · ROI · Metabase</p>
                </div>
                <ChevronRight size={20} color={T.mutedFg} />
              </div>
            </Link>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.mutedFg, margin: "0 0 2px" }}>Nekt · Meta Ads</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.cardFg, margin: 0 }}>Criativos Ativos</h2>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: T.elevSm }}><CriativosSection /></div>
        </section>

        <section>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.mutedFg, margin: "0 0 2px" }}>Instagram</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.cardFg, margin: 0 }}>Social Media</h2>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: T.elevSm }}><SocialMediaSection /></div>
        </section>
      </main>
    </div>
  )
}