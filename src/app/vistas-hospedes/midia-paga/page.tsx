"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Area, Legend,
} from "recharts";
import type { DailyRecord, DailySpending, ReservationDetail, FormulaConfig } from "@/lib/hospedes-analise-db";
import { DEFAULT_FORMULA_CONFIG } from "@/lib/hospedes-analise-db";
import NewbyteImportSection from "@/components/newbyte-import-section";

// ─── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtCurrency(v: number) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(v: number | undefined) {
  if (v == null || v === 0) return "—";
  return v.toLocaleString("pt-BR");
}

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function parseMoneyValue(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const raw = String(value).trim();
  const norm = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(norm);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGetRecords(): Promise<DailyRecord[]> {
  const r = await fetch("/api/hospedes-analise/records");
  return r.json();
}

async function apiSaveRecord(record: DailyRecord): Promise<void> {
  await fetch("/api/hospedes-analise/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
}

async function apiDeleteRecord(id: string): Promise<void> {
  await fetch(`/api/hospedes-analise/records/${id}`, { method: "DELETE" });
}

async function apiGetSpending(): Promise<DailySpending[]> {
  const r = await fetch("/api/hospedes-analise/spending");
  return r.json();
}

async function apiSaveSpending(entry: DailySpending): Promise<void> {
  await fetch("/api/hospedes-analise/spending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

async function apiDeleteSpending(id: string): Promise<void> {
  await fetch(`/api/hospedes-analise/spending/${id}`, { method: "DELETE" });
}

async function apiGetFormulaConfig(): Promise<FormulaConfig> {
  const r = await fetch("/api/hospedes-analise/formula-config");
  if (!r.ok) return DEFAULT_FORMULA_CONFIG;
  return r.json();
}

async function apiSaveFormulaConfig(config: FormulaConfig): Promise<void> {
  await fetch("/api/hospedes-analise/formula-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

// ─── useAnalysis hook ─────────────────────────────────────────────────────────

type AnalysisRow = {
  date: string;
  gastoGoogle: number; gastoMeta: number; gastoTiktok: number; gastoTotal: number;
  fatSzTotal: number; fatEffTotal: number; cleaningTotal: number; reservasTotal: number;
  fatLiquido: number; roi: number; conversoesNB: number; ticketsNB: number;
};

function buildAnalysisData(
  records: DailyRecord[],
  spending: DailySpending[],
  source: string,
  startDate: string,
  endDate: string,
  config: FormulaConfig = DEFAULT_FORMULA_CONFIG,
): AnalysisRow[] {
  const map: Record<string, {
    date: string;
    gastoGoogle: number; gastoMeta: number; gastoTiktok: number; gastoTotal: number;
    fatSzSem: number; fatSzCom: number; fatSzNB: number;
    fatEffSem: number; fatEffCom: number; fatEffNB: number;
    cleaningSem: number; cleaningCom: number; cleaningNB: number;
    reservasSem: number; reservasCom: number; reservasNB: number;
    ticketsNB: number; conversoesNB: number;
  }> = {};

  const ensure = (d: string) => {
    if (!map[d]) map[d] = {
      date: d,
      gastoGoogle: 0, gastoMeta: 0, gastoTiktok: 0, gastoTotal: 0,
      fatSzSem: 0, fatSzCom: 0, fatSzNB: 0,
      fatEffSem: 0, fatEffCom: 0, fatEffNB: 0,
      cleaningSem: 0, cleaningCom: 0, cleaningNB: 0,
      reservasSem: 0, reservasCom: 0, reservasNB: 0,
      ticketsNB: 0, conversoesNB: 0,
    };
    return map[d];
  };

  spending.forEach((s) => {
    const row = ensure(s.date);
    row.gastoGoogle += s.google;
    row.gastoMeta += s.meta;
    row.gastoTiktok += s.tiktok;
    row.gastoTotal += s.google + s.meta + s.tiktok;
  });

  records.forEach((r) => {
    const row = ensure(r.date);
    const fatEff = parseMoneyValue(r.data.fatEffective);
    const cleaning = parseMoneyValue(r.data.cleaningFee);
    const fatSzBase = config.szBase === "fat-effective" ? fatEff : (fatEff - cleaning);
    const fatSz = r.type === "relatorio-newbyte"
      ? parseMoneyValue(r.data.fatSeazone)
      : fatSzBase * config.szTaxa;
    let reservas = parseMoneyValue(r.data.reservas);

    if (r.type === "midia-sem-atendimento") {
      row.fatSzSem += fatSz; row.fatEffSem += fatEff; row.cleaningSem += cleaning; row.reservasSem += reservas;
    } else if (r.type === "midia-com-atendimento") {
      row.fatSzCom += fatSz; row.fatEffCom += fatEff; row.cleaningCom += cleaning; row.reservasCom += reservas;
    } else if (r.type === "relatorio-newbyte") {
      row.fatSzNB += fatSz; row.fatEffNB += fatEff; row.cleaningNB += cleaning;
      row.ticketsNB += parseMoneyValue(r.data.tickets);
      const conv = parseMoneyValue(r.data.conversoes);
      row.conversoesNB += conv;
      reservas = conv;
    }
  });

  let data = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  if (startDate) data = data.filter((d) => d.date >= startDate);
  if (endDate) data = data.filter((d) => d.date <= endDate);

  return data.map((row) => {
    let fatSz = row.fatSzSem + row.fatSzCom + row.fatSzNB;
    let fatEff = row.fatEffSem + row.fatEffCom + row.fatEffNB;
    let cleaning = row.cleaningSem + row.cleaningCom + row.cleaningNB;
    let reservas = row.reservasSem + row.reservasCom + row.reservasNB;
    if (source === "sem-atendimento") { fatSz = row.fatSzSem; fatEff = row.fatEffSem; cleaning = row.cleaningSem; reservas = row.reservasSem; }
    else if (source === "com-atendimento") { fatSz = row.fatSzCom; fatEff = row.fatEffCom; cleaning = row.cleaningCom; reservas = row.reservasCom; }
    else if (source === "newbyte") { fatSz = row.fatSzNB; fatEff = row.fatEffNB; cleaning = row.cleaningNB; reservas = row.conversoesNB; }
    const fatLiquido = config.liqSubtrairLimpeza ? fatEff - cleaning : fatEff;
    const roiNum = config.roiNumerador === "fat-liquido" ? fatLiquido : config.roiNumerador === "fat-effective" ? fatEff : fatSz;
    const roiDenom = config.roiDenominador === "gasto-google" ? row.gastoGoogle : config.roiDenominador === "gasto-meta" ? row.gastoMeta : row.gastoTotal;
    const roi = roiDenom > 0 ? (roiNum - roiDenom) / roiDenom : 0;
    return {
      date: row.date,
      gastoGoogle: row.gastoGoogle, gastoMeta: row.gastoMeta, gastoTiktok: row.gastoTiktok, gastoTotal: row.gastoTotal,
      fatSzTotal: fatSz, fatEffTotal: fatEff, cleaningTotal: cleaning, reservasTotal: reservas,
      fatLiquido, roi, conversoesNB: row.conversoesNB, ticketsNB: row.ticketsNB,
    };
  });
}

// ─── MonthlyRoiTable ──────────────────────────────────────────────────────────

function MonthlyRoiTable({
  records,
  spending,
  source,
  config = DEFAULT_FORMULA_CONFIG,
}: {
  records: DailyRecord[];
  spending: DailySpending[];
  source: string;
  config?: FormulaConfig;
}) {
  const monthlyData = useMemo(() => {
    const daily = buildAnalysisData(records, spending, source, "", "", config);
    const map: Record<string, {
      month: string;
      gastoTotal: number; gastoGoogle: number; gastoMeta: number;
      fatEffTotal: number; fatSzTotal: number; cleaningTotal: number;
      fatLiquido: number; reservasTotal: number;
    }> = {};

    for (const d of daily) {
      const month = d.date.slice(0, 7);
      if (!map[month]) {
        map[month] = { month, gastoTotal: 0, gastoGoogle: 0, gastoMeta: 0, fatEffTotal: 0, fatSzTotal: 0, cleaningTotal: 0, fatLiquido: 0, reservasTotal: 0 };
      }
      map[month].gastoTotal += d.gastoTotal;
      map[month].gastoGoogle += d.gastoGoogle;
      map[month].gastoMeta += d.gastoMeta;
      map[month].fatEffTotal += d.fatEffTotal;
      map[month].fatSzTotal += d.fatSzTotal;
      map[month].cleaningTotal += d.cleaningTotal;
      map[month].fatLiquido += d.fatLiquido;
      map[month].reservasTotal += d.reservasTotal;
    }

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((m) => {
      const roiNum = config.roiNumerador === "fat-liquido" ? m.fatLiquido : config.roiNumerador === "fat-effective" ? m.fatEffTotal : m.fatSzTotal;
      const roiDenom = config.roiDenominador === "gasto-google" ? m.gastoGoogle : config.roiDenominador === "gasto-meta" ? m.gastoMeta : m.gastoTotal;
      return { ...m, roi: roiDenom > 0 ? (roiNum - roiDenom) / roiDenom : 0 };
    });
  }, [records, spending, source, config]);

  if (monthlyData.length === 0) return null;

  const totals = monthlyData.reduce(
    (acc, m) => {
      acc.gastoTotal += m.gastoTotal;
      acc.gastoGoogle += m.gastoGoogle;
      acc.gastoMeta += m.gastoMeta;
      acc.fatEffTotal += m.fatEffTotal;
      acc.fatSzTotal += m.fatSzTotal;
      acc.cleaningTotal += m.cleaningTotal;
      acc.fatLiquido += m.fatLiquido;
      acc.reservasTotal += m.reservasTotal;
      return acc;
    },
    { gastoTotal: 0, gastoGoogle: 0, gastoMeta: 0, fatEffTotal: 0, fatSzTotal: 0, cleaningTotal: 0, fatLiquido: 0, reservasTotal: 0 }
  );
  const totalRoiNum = config.roiNumerador === "fat-liquido" ? totals.fatLiquido : config.roiNumerador === "fat-effective" ? totals.fatEffTotal : totals.fatSzTotal;
  const totalRoiDenom = config.roiDenominador === "gasto-google" ? totals.gastoGoogle : config.roiDenominador === "gasto-meta" ? totals.gastoMeta : totals.gastoTotal;
  const totalRoi = totalRoiDenom > 0 ? (totalRoiNum - totalRoiDenom) / totalRoiDenom : 0;

  const fmtMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(mo, 10) - 1]}/${y.slice(2)}`;
  };

  const thS: React.CSSProperties = { padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#7C7C7C", textAlign: "right", background: "#F8FAFF", borderBottom: "1px solid #E8EEF8", whiteSpace: "nowrap" };
  const tdS: React.CSSProperties = { padding: "7px 12px", fontSize: 12, textAlign: "right", borderBottom: "1px solid #F0F3FA", whiteSpace: "nowrap" };

  return (
    <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F3FA", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: "#0055FF" }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", margin: 0 }}>ROI Mensal — Visão Consolidada</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thS, textAlign: "left" }}>Mês</th>
              <th style={thS}>Gasto Total</th>
              <th style={thS}>Fat. Effective</th>
              <th style={thS}>Fat. Seazone</th>
              <th style={thS}>Tx. Limpeza</th>
              <th style={thS}>Fat. Líquido</th>
              <th style={thS}>Reservas</th>
              <th style={{ ...thS, color: "#0055FF" }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => (
              <tr key={m.month}>
                <td style={{ ...tdS, textAlign: "left", fontWeight: 600, color: "#00143D" }}>{fmtMonth(m.month)}</td>
                <td style={{ ...tdS, color: "#FC6058" }}>{fmtCurrency(m.gastoTotal)}</td>
                <td style={tdS}>{fmtCurrency(m.fatEffTotal)}</td>
                <td style={{ ...tdS, color: "#0055FF" }}>{fmtCurrency(m.fatSzTotal)}</td>
                <td style={{ ...tdS, color: "#94A3B8" }}>{fmtCurrency(m.cleaningTotal)}</td>
                <td style={{ ...tdS, color: "#0EA5E9" }}>{fmtCurrency(m.fatLiquido)}</td>
                <td style={tdS}>{m.reservasTotal > 0 ? m.reservasTotal.toFixed(0) : "—"}</td>
                <td style={{ ...tdS, fontWeight: 700, color: m.roi >= 0 ? "#10B981" : "#FC6058" }}>
                  {m.gastoTotal > 0 ? `${(m.roi * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#F8FAFF" }}>
              <td style={{ ...tdS, textAlign: "left", fontWeight: 700, color: "#00143D", borderTop: "2px solid #E8EEF8" }}>Total</td>
              <td style={{ ...tdS, fontWeight: 700, color: "#FC6058", borderTop: "2px solid #E8EEF8" }}>{fmtCurrency(totals.gastoTotal)}</td>
              <td style={{ ...tdS, fontWeight: 700, borderTop: "2px solid #E8EEF8" }}>{fmtCurrency(totals.fatEffTotal)}</td>
              <td style={{ ...tdS, fontWeight: 700, color: "#0055FF", borderTop: "2px solid #E8EEF8" }}>{fmtCurrency(totals.fatSzTotal)}</td>
              <td style={{ ...tdS, fontWeight: 700, color: "#94A3B8", borderTop: "2px solid #E8EEF8" }}>{fmtCurrency(totals.cleaningTotal)}</td>
              <td style={{ ...tdS, fontWeight: 700, color: "#0EA5E9", borderTop: "2px solid #E8EEF8" }}>{fmtCurrency(totals.fatLiquido)}</td>
              <td style={{ ...tdS, fontWeight: 700, borderTop: "2px solid #E8EEF8" }}>{totals.reservasTotal > 0 ? totals.reservasTotal.toFixed(0) : "—"}</td>
              <td style={{ ...tdS, fontWeight: 700, color: totalRoi >= 0 ? "#10B981" : "#FC6058", borderTop: "2px solid #E8EEF8" }}>
                {totals.gastoTotal > 0 ? `${(totalRoi * 100).toFixed(1)}%` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── ResultadosTab ────────────────────────────────────────────────────────────

function ResultadosTab({ records, spending, onRecordsChange, formulaConfig, onFormulaConfigChange }: {
  records: DailyRecord[];
  spending: DailySpending[];
  onRecordsChange: (r: DailyRecord[]) => void;
  formulaConfig: FormulaConfig;
  onFormulaConfigChange: (c: FormulaConfig) => void;
}) {
  const [source, setSource] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metrics, setMetrics] = useState<string[]>(["fatSzTotal", "reservasTotal"]);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{ updated: number } | null>(null);
  const [draftConfig, setDraftConfig] = useState<FormulaConfig>(formulaConfig);
  const [editingFormulas, setEditingFormulas] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const handleFixFatSeazone = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const res = await fetch("/api/hospedes-analise/fix-fat-seazone", { method: "POST" });
      const json = await res.json();
      setFixResult(json);
      const updated = await fetch("/api/hospedes-analise/records").then((r) => r.json());
      onRecordsChange(updated);
    } finally {
      setFixing(false);
    }
  };

  const data = useMemo(
    () => buildAnalysisData(records, spending, source, startDate, endDate, formulaConfig),
    [records, spending, source, startDate, endDate, formulaConfig]
  );

  const summary = useMemo(() => {
    const totalGasto = data.reduce((s, d) => s + d.gastoTotal, 0);
    const totalGastoGoogle = data.reduce((s, d) => s + d.gastoGoogle, 0);
    const totalGastoMeta = data.reduce((s, d) => s + d.gastoMeta, 0);
    const totalFatSz = data.reduce((s, d) => s + d.fatSzTotal, 0);
    const totalFatEff = data.reduce((s, d) => s + d.fatEffTotal, 0);
    const totalCleaning = data.reduce((s, d) => s + d.cleaningTotal, 0);
    const totalReservas = data.reduce((s, d) => s + d.reservasTotal, 0);
    const totalFatLiquido = data.reduce((s, d) => s + d.fatLiquido, 0);
    const roiNum = formulaConfig.roiNumerador === "fat-liquido" ? totalFatLiquido : formulaConfig.roiNumerador === "fat-effective" ? totalFatEff : totalFatSz;
    const roiDenom = formulaConfig.roiDenominador === "gasto-google" ? totalGastoGoogle : formulaConfig.roiDenominador === "gasto-meta" ? totalGastoMeta : totalGasto;
    const roi = roiDenom > 0 ? (roiNum - roiDenom) / roiDenom : 0;
    const crNum = formulaConfig.crNumerador === "gasto-google" ? totalGastoGoogle : formulaConfig.crNumerador === "gasto-meta" ? totalGastoMeta : totalGasto;
    const custoReserva = totalReservas > 0 ? crNum / totalReservas : 0;
    return { totalGasto, totalFatSz, totalFatEff, totalCleaning, totalFatLiquido, totalReservas, roi, custoReserva };
  }, [data, formulaConfig]);

  const ALL_METRICS = [
    { key: "fatSzTotal", label: "Fat. Seazone", color: "#0055FF" },
    { key: "fatEffTotal", label: "Fat. Effective", color: "#7C3AED" },
    { key: "gastoTotal", label: "Gasto Total", color: "#FC6058" },
    { key: "reservasTotal", label: "Reservas", color: "#10B981" },
    { key: "gastoGoogle", label: "Gasto Google", color: "#0EA5E9" },
    { key: "gastoMeta", label: "Gasto Meta", color: "#6366F1" },
    { key: "gastoTiktok", label: "Gasto TikTok", color: "#EC4899" },
  ];

  const toggleMetric = (key: string) =>
    setMetrics((prev) => prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]);

  const chartData = data.map((d) => ({ ...d, date: fmtDate(d.date) }));
  const hasData = data.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ background: "#00143D", borderRadius: 16, padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,85,255,0.12), transparent)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ width: 40, height: 3, background: "#0055FF", borderRadius: 2, marginBottom: 12 }} />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Resultados — Mídia Paga Hóspedes</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>Acompanhamento de performance cruzando métricas, reservas e gastos</p>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#00143D", marginBottom: 12 }}>Filtros</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Frente</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13, background: "#fff" }}>
              <option value="all">Todas as frentes</option>
              <option value="sem-atendimento">Mídia paga (s/ atend.)</option>
              <option value="com-atendimento">Mídia paga (c/ atend.)</option>
              <option value="newbyte">Newbyte</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>De</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13, background: "#fff" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Até</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13, background: "#fff" }} />
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F3FA", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleFixFatSeazone} disabled={fixing} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #E8EEF8", background: fixing ? "#F0F3FA" : "#fff", fontSize: 12, cursor: fixing ? "not-allowed" : "pointer", color: "#0055FF", fontWeight: 600 }}>
            {fixing ? "Corrigindo..." : "Corrigir Fat. Seazone nos dados"}
          </button>
          {fixResult && <span style={{ fontSize: 12, color: "#10B981" }}>{fixResult.updated} registro(s) corrigido(s)</span>}
        </div>
      </div>

      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: `Fat. Seazone (${(formulaConfig.szTaxa * 100).toFixed(0)}%)`, value: fmtCurrency(summary.totalFatSz), color: "#0055FF", title: "" },
            { label: "Fat. Effective", value: fmtCurrency(summary.totalFatEff), color: "#7C3AED", title: "" },
            { label: "Tx. Limpeza", value: fmtCurrency(summary.totalCleaning), color: "#94A3B8", title: "" },
            { label: "Fat. Líquido", value: fmtCurrency(summary.totalFatLiquido), color: "#0EA5E9", title: "Fat. Effective - Tx. Limpeza" },
            { label: "Gasto Total", value: fmtCurrency(summary.totalGasto), color: "#FC6058", title: "" },
            { label: "Reservas", value: summary.totalReservas.toFixed(0), color: "#10B981", title: "" },
            { label: "ROI", value: `${(summary.roi * 100).toFixed(1)}%`, color: summary.roi >= 0 ? "#10B981" : "#FC6058", title: "(Fat. Seazone - Gasto) / Gasto" },
            { label: "Custo/Reserva", value: fmtCurrency(summary.custoReserva), color: "#F59E0B", title: "" },
          ].map((kpi) => (
            <div key={kpi.label} title={kpi.title} style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 11, color: "#7C7C7C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{kpi.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {hasData && (
        <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#7C7C7C", marginBottom: 10 }}>Selecionar métricas no gráfico</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_METRICS.map((m) => {
              const active = metrics.includes(m.key);
              return (
                <button key={m.key} onClick={() => toggleMetric(m.key)} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${active ? m.color : "#E8EEF8"}`, background: active ? `${m.color}18` : "#fff", color: active ? m.color : "#7C7C7C", fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasData && metrics.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7C7C7C" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7C7C7C" }} width={60} />
              <Tooltip contentStyle={{ background: "#00143D", border: "none", borderRadius: 10, fontSize: 12, color: "#fff" }} labelStyle={{ color: "rgba(255,255,255,0.6)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {ALL_METRICS.filter((m) => metrics.includes(m.key)).map((m) => (
                <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color} opacity={0.85} radius={[3, 3, 0, 0]} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasData && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#7C7C7C" }}>
          <p style={{ fontSize: 36 }}>📊</p>
          <p style={{ marginTop: 8 }}>Nenhum dado encontrado. Preencha registros na aba Preenchimento.</p>
        </div>
      )}

      {hasData && <MonthlyRoiTable records={records} spending={spending} source={source} config={formulaConfig} />}

      {(() => {
        const szBaseLabel = formulaConfig.szBase === "fat-effective" ? "Fat. Effective" : "Fat. Líquido (Eff. − Limpeza)";
        const roiNumLabel = { "fat-seazone": "Fat. Seazone", "fat-liquido": "Fat. Líquido", "fat-effective": "Fat. Effective" }[formulaConfig.roiNumerador];
        const roiDenomLabel = { "gasto-total": "Gasto Total", "gasto-google": "Gasto Google", "gasto-meta": "Gasto Meta" }[formulaConfig.roiDenominador];
        const liqLabel = formulaConfig.liqSubtrairLimpeza ? "Fat. Effective − Tx. Limpeza" : "Fat. Effective (sem desconto)";
        const crNumLabel = { "gasto-total": "Gasto Total", "gasto-google": "Gasto Google", "gasto-meta": "Gasto Meta" }[formulaConfig.crNumerador];

        const selStyle: React.CSSProperties = { padding: "5px 8px", borderRadius: 7, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff", cursor: "pointer" };
        const numInStyle: React.CSSProperties = { width: 64, padding: "5px 8px", borderRadius: 7, border: "1px solid #CBD5E1", fontSize: 12, textAlign: "center" as const };

        return (
          <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F3FA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: "#F59E0B" }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", margin: 0 }}>Como são calculados os resultados</p>
              </div>
              <button
                onClick={() => { setEditingFormulas(!editingFormulas); setDraftConfig(formulaConfig); }}
                style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #E8EEF8", background: editingFormulas ? "#EBF2FF" : "#F8FAFF", color: editingFormulas ? "#0055FF" : "#7C7C7C", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {editingFormulas ? "Fechar editor" : "Editar fórmulas"}
              </button>
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Cards mostrando fórmulas atuais */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "12px 14px", background: "#EBF2FF", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0055FF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Fat. Seazone</p>
                  <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>= <strong>{szBaseLabel}</strong> × <strong>{(formulaConfig.szTaxa * 100).toFixed(0)}%</strong></p>
                  <p style={{ fontSize: 11, color: "#7C7C7C", marginTop: 3 }}>Newbyte: valor direto do relatório</p>
                </div>
                <div style={{ padding: "12px 14px", background: "#ECFDF5", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>ROI</p>
                  <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>= (<strong>{roiNumLabel}</strong> − <strong>{roiDenomLabel}</strong>) ÷ <strong>{roiDenomLabel}</strong></p>
                </div>
                <div style={{ padding: "12px 14px", background: "#F0F9FF", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Fat. Líquido</p>
                  <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>= <strong>{liqLabel}</strong></p>
                </div>
                <div style={{ padding: "12px 14px", background: "#FFFBEB", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Custo/Reserva</p>
                  <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>= <strong>{crNumLabel}</strong> ÷ Reservas</p>
                </div>
              </div>

              {/* Editor */}
              {editingFormulas && (
                <div style={{ padding: "16px 18px", background: "#F8FAFF", borderRadius: 8, border: "1px dashed #CBD5E1", display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#00143D", margin: 0 }}>Editar fórmulas</p>

                  {/* Fat. Seazone */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0055FF", minWidth: 100 }}>Fat. Seazone =</span>
                    <select value={draftConfig.szBase} onChange={(e) => setDraftConfig((p) => ({ ...p, szBase: e.target.value as FormulaConfig["szBase"] }))} style={selStyle}>
                      <option value="fat-liquido">Fat. Líquido (Eff. − Limpeza)</option>
                      <option value="fat-effective">Fat. Effective (bruto)</option>
                    </select>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>×</span>
                    <input type="number" min={0} max={100} step={0.1} value={(draftConfig.szTaxa * 100).toFixed(1)} onChange={(e) => setDraftConfig((p) => ({ ...p, szTaxa: (Number(e.target.value) || 0) / 100 }))} style={numInStyle} />
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>%</span>
                  </div>

                  {/* Fat. Líquido */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0EA5E9", minWidth: 100 }}>Fat. Líquido =</span>
                    <select value={draftConfig.liqSubtrairLimpeza ? "com" : "sem"} onChange={(e) => setDraftConfig((p) => ({ ...p, liqSubtrairLimpeza: e.target.value === "com" }))} style={selStyle}>
                      <option value="com">Fat. Effective − Tx. Limpeza</option>
                      <option value="sem">Fat. Effective (sem desconto de limpeza)</option>
                    </select>
                  </div>

                  {/* ROI */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981", minWidth: 100 }}>ROI =</span>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>(</span>
                    <select value={draftConfig.roiNumerador} onChange={(e) => setDraftConfig((p) => ({ ...p, roiNumerador: e.target.value as FormulaConfig["roiNumerador"] }))} style={selStyle}>
                      <option value="fat-seazone">Fat. Seazone</option>
                      <option value="fat-liquido">Fat. Líquido</option>
                      <option value="fat-effective">Fat. Effective</option>
                    </select>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>−</span>
                    <select value={draftConfig.roiDenominador} onChange={(e) => setDraftConfig((p) => ({ ...p, roiDenominador: e.target.value as FormulaConfig["roiDenominador"] }))} style={selStyle}>
                      <option value="gasto-total">Gasto Total</option>
                      <option value="gasto-google">Gasto Google</option>
                      <option value="gasto-meta">Gasto Meta</option>
                    </select>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>)</span>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>÷ mesmo denominador</span>
                  </div>

                  {/* Custo/Reserva */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", minWidth: 100 }}>Custo/Reserva =</span>
                    <select value={draftConfig.crNumerador} onChange={(e) => setDraftConfig((p) => ({ ...p, crNumerador: e.target.value as FormulaConfig["crNumerador"] }))} style={selStyle}>
                      <option value="gasto-total">Gasto Total</option>
                      <option value="gasto-google">Gasto Google</option>
                      <option value="gasto-meta">Gasto Meta</option>
                    </select>
                    <span style={{ fontSize: 12, color: "#7C7C7C" }}>÷ Reservas</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4, borderTop: "1px solid #E2E8F0" }}>
                    <button
                      onClick={async () => {
                        setSavingConfig(true);
                        await apiSaveFormulaConfig(draftConfig);
                        onFormulaConfigChange(draftConfig);
                        setSavingConfig(false);
                        setEditingFormulas(false);
                      }}
                      disabled={savingConfig}
                      style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: savingConfig ? "#94A3B8" : "#0055FF", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingConfig ? "default" : "pointer" }}
                    >
                      {savingConfig ? "Salvando..." : "Aplicar para todos"}
                    </button>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>Todas as tabelas e KPIs recalculam. Visível para todos os usuários.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── PreenchimentoTab ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "midia-sem-atendimento", label: "Sem atendimento", emoji: "📊", desc: "Mídia paga direta" },
  { value: "midia-com-atendimento", label: "Com atendimento", emoji: "🤝", desc: "Mídia + atend." },
  { value: "relatorio-newbyte", label: "Newbyte", emoji: "📋", desc: "Relatório IA" },
];

function emptyReservation(): ReservationDetail {
  return { id: uid(), source: "", utm: "", coupon: "", destination: "" };
}

function PreenchimentoTab({ records, spending, onRecordsChange, onSpendingChange }: { records: DailyRecord[]; spending: DailySpending[]; onRecordsChange: (r: DailyRecord[]) => void; onSpendingChange: (s: DailySpending[]) => void }) {
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [spDate, setSpDate] = useState(todayStr());
  const [spGoogle, setSpGoogle] = useState("");
  const [spMeta, setSpMeta] = useState("");
  const [spTiktok, setSpTiktok] = useState("");
  const [spSaved, setSpSaved] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineGoogle, setInlineGoogle] = useState("");
  const [inlineMeta, setInlineMeta] = useState("");
  const [inlineTiktok, setInlineTiktok] = useState("");

  const resetForm = () => { setFormData({}); setReservations([]); setSaved(false); setEditingId(null); };

  const calcFatSeazone = () => {
    const ep = parseMoneyValue(formData.fatEffective);
    const cf = parseMoneyValue(formData.cleaningFee);
    setFormData((prev) => ({ ...prev, fatSeazone: ((ep - cf) * 0.24).toFixed(2) }));
  };

  const handleSave = async () => {
    if (!selectedType || !selectedDate) return;
    const record: DailyRecord = { id: editingId || uid(), date: selectedDate, type: selectedType, data: Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])), reservations };
    const updated = editingId ? records.map((r) => (r.id === editingId ? record : r)) : [...records, record];
    await apiSaveRecord(record);
    onRecordsChange(updated);
    setSaved(true);
    setTimeout(() => { resetForm(); setSelectedType(""); }, 1500);
  };

  const handleSaveSpending = async () => {
    if (!spDate) return;
    const metaTotal = Number(spMeta) || 0;
    const entry: DailySpending = { id: uid(), date: spDate, google: Number(spGoogle) || 0, meta: metaTotal, tiktok: Number(spTiktok) || 0, meta565: metaTotal, meta566: 0 };
    await apiSaveSpending(entry);
    onSpendingChange([...spending, entry]);
    setSpSaved(true);
    setTimeout(() => { setSpGoogle(""); setSpMeta(""); setSpTiktok(""); setSpSaved(false); }, 1500);
  };

  const startInlineEdit = (s: DailySpending) => { setInlineEditId(s.id); setInlineGoogle(String(s.google || "")); setInlineMeta(String(s.meta || "")); setInlineTiktok(String(s.tiktok || "")); };

  const saveInlineEdit = async (s: DailySpending) => {
    const metaTotal = Number(inlineMeta) || 0;
    const entry: DailySpending = { ...s, google: Number(inlineGoogle) || 0, meta: metaTotal, tiktok: Number(inlineTiktok) || 0, meta565: metaTotal };
    await apiSaveSpending(entry);
    onSpendingChange(spending.map((x) => (x.id === s.id ? entry : x)));
    setInlineEditId(null);
  };

  const handleEditRecord = (r: DailyRecord) => { setSelectedType(r.type); setSelectedDate(r.date); setFormData(Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, String(v)]))); setReservations(r.reservations); setEditingId(r.id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleDeleteRecord = async (id: string) => { await apiDeleteRecord(id); onRecordsChange(records.filter((r) => r.id !== id)); };
  const handleDeleteSpending = async (id: string) => { await apiDeleteSpending(id); onSpendingChange(spending.filter((s) => s.id !== id)); };

  const isNewbyte = selectedType === "relatorio-newbyte";
  const fieldStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13, background: "#fff", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. NewByte — importar por código */}
      <NewbyteImportSection onSaved={async () => { const r = await apiGetRecords(); onRecordsChange(r); }} />

      {/* 2. Gasto de mídia — só TikTok (compacto) */}
      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 4 }}>Gasto de mídia — TikTok</p>
        <p style={{ fontSize: 12, color: "#7C7C7C", marginBottom: 12 }}>Google e Meta são sincronizados automaticamente via Nekt. Aqui você só preenche o <strong>TikTok</strong>.</p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={labelStyle}>Data</label><input type="date" value={spDate} onChange={(e) => setSpDate(e.target.value)} style={{ ...fieldStyle, width: 170 }} /></div>
          <div><label style={labelStyle}>TikTok Ads (R$)</label><input type="number" placeholder="0" value={spTiktok} onChange={(e) => setSpTiktok(e.target.value)} style={{ ...fieldStyle, width: 150 }} /></div>
          <button onClick={handleSaveSpending} disabled={spSaved} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: spSaved ? "#10B981" : "#F59E0B", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{spSaved ? "✓ Salvo!" : "Salvar TikTok"}</button>
        </div>
        {spending.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#7C7C7C", marginBottom: 8 }}>Registros de gastos</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflow: "auto" }}>
              {[...spending].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                <div key={s.id} style={{ padding: "8px 12px", background: "#F8FAFF", borderRadius: 8, fontSize: 13 }}>
                  {inlineEditId === s.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#00143D", minWidth: 70 }}>{fmtDate(s.date)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
                        <span style={{ fontSize: 11, color: "#7C7C7C" }}>Google</span>
                        <input type="number" value={inlineGoogle} onChange={(e) => setInlineGoogle(e.target.value)} style={{ width: 76, padding: "3px 7px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }} />
                        <span style={{ fontSize: 11, color: "#7C7C7C" }}>Meta</span>
                        <input type="number" value={inlineMeta} onChange={(e) => setInlineMeta(e.target.value)} style={{ width: 76, padding: "3px 7px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }} />
                        <span style={{ fontSize: 11, color: "#7C7C7C" }}>TikTok</span>
                        <input type="number" value={inlineTiktok} onChange={(e) => setInlineTiktok(e.target.value)} style={{ width: 76, padding: "3px 7px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }} />
                        <button onClick={() => saveInlineEdit(s)} style={{ padding: "3px 12px", borderRadius: 6, border: "none", background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓</button>
                        <button onClick={() => setInlineEditId(null)} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", fontSize: 12, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, color: "#00143D" }}>{fmtDate(s.date)}</span>
                      <span style={{ color: "#7C7C7C" }}>Google: {fmtCurrency(s.google)} | Meta: {fmtCurrency(s.meta)} | TikTok: {fmtCurrency(s.tiktok)}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => startInlineEdit(s)} style={{ fontSize: 12, color: "#0055FF", background: "none", border: "none", cursor: "pointer" }}>✏</button>
                        <button onClick={() => handleDeleteSpending(s.id)} style={{ fontSize: 12, color: "#FC6058", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Registro manual — Com / Sem atendimento (por último) */}
      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 12 }}>Registro manual — Com / Sem atendimento</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TYPE_OPTIONS.filter((t) => t.value !== "relatorio-newbyte").map((t) => (
            <button key={t.value} onClick={() => { setSelectedType(t.value); resetForm(); }} style={{ padding: "10px 16px", borderRadius: 10, border: `1.5px solid ${selectedType === t.value ? "#0055FF" : "#E8EEF8"}`, background: selectedType === t.value ? "#0055FF12" : "#fff", color: selectedType === t.value ? "#0055FF" : "#00143D", fontWeight: selectedType === t.value ? 700 : 400, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t.emoji}</span> {t.label} <span style={{ fontSize: 11, color: "#7C7C7C", fontWeight: 400 }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 16 }}>{editingId ? "Editando registro" : "Novo registro"}</p>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Data</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={fieldStyle} /></div>
          {!isNewbyte && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>Reservas</label><input type="number" placeholder="0" value={formData.reservas || ""} onChange={(e) => setFormData((p) => ({ ...p, reservas: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Fat. Effective (R$)</label><input type="number" placeholder="0" value={formData.fatEffective || ""} onChange={(e) => setFormData((p) => ({ ...p, fatEffective: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Tx. Limpeza (R$)</label><input type="number" placeholder="0" value={formData.cleaningFee || ""} onChange={(e) => setFormData((p) => ({ ...p, cleaningFee: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Fat. Seazone (R$)</label><div style={{ display: "flex", gap: 6 }}><input type="number" placeholder="0" value={formData.fatSeazone || ""} onChange={(e) => setFormData((p) => ({ ...p, fatSeazone: e.target.value }))} style={{ ...fieldStyle, flex: 1 }} /><button onClick={calcFatSeazone} title="Calcular automaticamente" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E8EEF8", background: "#F0F3FA", fontSize: 12, cursor: "pointer" }}>⚡</button></div></div>
            </div>
          )}
          {isNewbyte && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>Tickets</label><input type="number" placeholder="0" value={formData.tickets || ""} onChange={(e) => setFormData((p) => ({ ...p, tickets: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Reservas (conversões)</label><input type="number" placeholder="0" value={formData.conversoes || ""} onChange={(e) => setFormData((p) => ({ ...p, conversoes: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Fat. Effective (R$)</label><input type="number" placeholder="0" value={formData.fatEffective || ""} onChange={(e) => setFormData((p) => ({ ...p, fatEffective: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Fat. Seazone (R$)</label><input type="number" placeholder="0" value={formData.fatSeazone || ""} onChange={(e) => setFormData((p) => ({ ...p, fatSeazone: e.target.value }))} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Canal</label><select value={formData.canal || ""} onChange={(e) => setFormData((p) => ({ ...p, canal: e.target.value }))} style={fieldStyle}><option value="">Selecione</option><option value="meta">Meta Ads</option><option value="tiktok">TikTok</option></select></div>
            </div>
          )}
          {!isNewbyte && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Detalhes de reservas</label>
                <button onClick={() => setReservations((p) => [...p, emptyReservation()])} style={{ fontSize: 12, color: "#0055FF", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Adicionar reserva</button>
              </div>
              {reservations.map((res, i) => (
                <div key={res.id} style={{ border: "1px solid #E8EEF8", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: "#00143D" }}>Reserva {i + 1}{res.destination && ` — ${res.destination}`}</span><button onClick={() => setReservations((p) => p.filter((_, j) => j !== i))} style={{ fontSize: 12, color: "#FC6058", background: "none", border: "none", cursor: "pointer" }}>✕</button></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><label style={labelStyle}>Fonte</label><select value={res.source} onChange={(e) => setReservations((p) => p.map((r, j) => j === i ? { ...r, source: e.target.value } : r))} style={fieldStyle}><option value="">—</option><option value="Google">Google</option><option value="Meta Ads">Meta Ads</option><option value="TikTok">TikTok</option></select></div>
                    <div><label style={labelStyle}>Destino</label><input type="text" placeholder="Florianópolis" value={res.destination} onChange={(e) => setReservations((p) => p.map((r, j) => j === i ? { ...r, destination: e.target.value } : r))} style={fieldStyle} /></div>
                    <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>UTMs</label><input type="text" placeholder="utm_source=google&utm_medium=cpc" value={res.utm} onChange={(e) => setReservations((p) => p.map((r, j) => j === i ? { ...r, utm: e.target.value } : r))} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Cupom</label><input type="text" placeholder="PRAIA10" value={res.coupon} onChange={(e) => setReservations((p) => p.map((r, j) => j === i ? { ...r, coupon: e.target.value } : r))} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Código da reserva</label><input type="text" placeholder="LW600J" value={res.reservationCode || ""} onChange={(e) => setReservations((p) => p.map((r, j) => j === i ? { ...r, reservationCode: e.target.value } : r))} style={fieldStyle} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saved} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: saved ? "#10B981" : "#0055FF", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{saved ? "✓ Salvo!" : editingId ? "Salvar edição" : "Salvar registro"}</button>
            {editingId && <button onClick={resetForm} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #E8EEF8", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancelar</button>}
          </div>
        </div>
      )}

      {records.filter((r) => r.date === todayStr()).length > 0 && (
        <div style={{ background: "#F0F3FA", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#7C7C7C", marginBottom: 8 }}>Registros de hoje</p>
          {records.filter((r) => r.date === todayStr()).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fff", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <span>{TYPE_OPTIONS.find((t) => t.value === r.type)?.emoji} {TYPE_OPTIONS.find((t) => t.value === r.type)?.label}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => handleEditRecord(r)} style={{ fontSize: 12, color: "#0055FF", background: "none", border: "none", cursor: "pointer" }}>✏ Editar</button>
                <button onClick={() => handleDeleteRecord(r.id)} style={{ fontSize: 12, color: "#FC6058", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TabelaTab (unchanged from original) ──────────────────────────────────────

function TabelaTab({ records, spending }: { records: DailyRecord[]; spending: DailySpending[]; onRecordsChange: (r: DailyRecord[]) => void; onSpendingChange: (s: DailySpending[]) => void }) {
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const handleExportCSV = () => {
    const url = `/api/hospedes-analise/export-kpis?dateFrom=${filterFrom || "2024-01-01"}&dateTo=${filterTo || today}&format=csv`;
    window.open(url, "_blank");
  };
  const handleExportJSON = async () => {
    const url = `/api/hospedes-analise/export-kpis?dateFrom=${filterFrom || "2024-01-01"}&dateTo=${filterTo || today}&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kpis-export-${filterFrom || "2024-01-01"}-${filterTo || today}.json`;
    a.click();
  };

  type DateColumn = { date: string; sem?: DailyRecord; com?: DailyRecord; nb?: DailyRecord; spending?: { google: number; meta: number; tiktok: number; total: number }; reservations: ReservationDetail[] };

  const columns = useMemo(() => {
    const map: Record<string, DateColumn> = {};
    records.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, reservations: [] };
      if (r.type === "midia-sem-atendimento") map[r.date].sem = r;
      else if (r.type === "midia-com-atendimento") map[r.date].com = r;
      else if (r.type === "relatorio-newbyte") map[r.date].nb = r;
      map[r.date].reservations.push(...r.reservations);
    });
    spending.forEach((s) => { if (!map[s.date]) map[s.date] = { date: s.date, reservations: [] }; const ex = map[s.date].spending || { google: 0, meta: 0, tiktok: 0, total: 0 }; ex.google += s.google; ex.meta += s.meta; ex.tiktok += s.tiktok; ex.total += s.google + s.meta + s.tiktok; map[s.date].spending = ex; });
    // Dedupe reservations por reservationCode (mesma reserva pode vir de sem/com via Metabase
    // E também do import-newbyte → contava 2x na coluna Det.)
    Object.values(map).forEach((col) => {
      const seen = new Set<string>();
      col.reservations = col.reservations.filter((r) => {
        const key = r.reservationCode || r.id;
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    let cols = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
    if (filterFrom) cols = cols.filter((c) => c.date >= filterFrom);
    if (filterTo) cols = cols.filter((c) => c.date <= filterTo);
    return cols;
  }, [records, spending, filterFrom, filterTo]);

  const getVal = (rec: DailyRecord | undefined, key: string) => { if (!rec) return undefined; const v = rec.data[key]; return v != null ? Number(v) : undefined; };
  const fmtVal = (v: number | undefined, fmt: "currency" | "number") => { if (v == null || v === 0) return <span style={{ color: "#ccc" }}>—</span>; return fmt === "currency" ? fmtCurrency(v) : fmtNum(v); };

  const totals = useMemo(() => columns.reduce((acc, c) => { acc.google += c.spending?.google || 0; acc.meta += c.spending?.meta || 0; acc.tiktok += c.spending?.tiktok || 0; acc.total += c.spending?.total || 0; acc.fatSzSem += parseMoneyValue(c.sem?.data.fatSeazone); acc.fatSzCom += parseMoneyValue(c.com?.data.fatSeazone); acc.fatSzNB += parseMoneyValue(c.nb?.data.fatSeazone); acc.fatEffSem += parseMoneyValue(c.sem?.data.fatEffective); acc.fatEffCom += parseMoneyValue(c.com?.data.fatEffective); acc.fatEffNB += parseMoneyValue(c.nb?.data.fatEffective); acc.cleaningSem += parseMoneyValue(c.sem?.data.cleaningFee); acc.cleaningCom += parseMoneyValue(c.com?.data.cleaningFee); acc.resSem += getVal(c.sem, "reservas") || 0; acc.resCom += getVal(c.com, "reservas") || 0; acc.resNB += getVal(c.nb, "conversoes") || 0; return acc; }, { google: 0, meta: 0, tiktok: 0, total: 0, fatSzSem: 0, fatSzCom: 0, fatSzNB: 0, fatEffSem: 0, fatEffCom: 0, fatEffNB: 0, cleaningSem: 0, cleaningCom: 0, resSem: 0, resCom: 0, resNB: 0 }), [columns]);

  const thStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#7C7C7C", textAlign: "center", whiteSpace: "nowrap", background: "#F8FAFF", borderBottom: "1px solid #E8EEF8" };
  const tdStyle: React.CSSProperties = { padding: "6px 10px", fontSize: 12, textAlign: "center", borderBottom: "1px solid #F0F3FA", whiteSpace: "nowrap" };
  const th1: React.CSSProperties = { ...thStyle, position: "sticky", top: 0, zIndex: 3 };
  const th2: React.CSSProperties = { ...thStyle, position: "sticky", top: 34, zIndex: 3 };
  const tdTotal: React.CSSProperties = { ...tdStyle, position: "sticky", top: 68, zIndex: 2, background: "#F8FAFF", fontWeight: 700 };
  const tdSpend: React.CSSProperties = { ...tdStyle, background: "#FFFBEB" };
  const tdSem: React.CSSProperties = { ...tdStyle, background: "#EBF2FF" };
  const tdCom: React.CSSProperties = { ...tdStyle, background: "#ECFDF5" };
  const tdNB: React.CSSProperties = { ...tdStyle, background: "#F5F3FF" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>De</label><input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Até</label><input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13 }} /></div>
        {(filterFrom || filterTo) && <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E8EEF8", background: "#fff", fontSize: 12, cursor: "pointer" }}>Limpar</button>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleExportCSV} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #10B981", background: "#ECFDF5", color: "#10B981", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>📥 CSV</button>
          <button onClick={handleExportJSON} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #0055FF", background: "#EBF2FF", color: "#0055FF", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>📥 JSON</button>
        </div>
      </div>
      {columns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#7C7C7C" }}><p style={{ fontSize: 32 }}>📋</p><p style={{ marginTop: 8 }}>Nenhum dado. Preencha registros na aba Preenchimento.</p></div>
      ) : (
        <div style={{ overflow: "auto", maxHeight: "70vh", borderRadius: 12, border: "1px solid #E8EEF8" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={{ ...th1, textAlign: "left", position: "sticky", left: 0, zIndex: 4 }}>Data</th>
                <th style={{ ...th1, background: "#EBF2FF" }} colSpan={4}>Sem atend.</th>
                <th style={{ ...th1, background: "#ECFDF5" }} colSpan={4}>Com atend.</th>
                <th style={{ ...th1, background: "#F5F3FF" }} colSpan={4}>Newbyte</th>
                <th style={{ ...th1, background: "#FFFBEB" }} colSpan={4}>Gastos</th>
                <th style={th1} rowSpan={2}>Reservas</th>
              </tr>
              <tr>
                <th style={{ ...th2, textAlign: "left", position: "sticky", left: 0, zIndex: 4 }}></th>
                <th style={{ ...th2, background: "#EBF2FF" }}>Res.</th><th style={{ ...th2, background: "#EBF2FF" }}>Fat. Eff.</th><th style={{ ...th2, background: "#EBF2FF" }}>Tx. Limp.</th><th style={{ ...th2, background: "#EBF2FF" }}>Fat. Sz</th>
                <th style={{ ...th2, background: "#ECFDF5" }}>Res.</th><th style={{ ...th2, background: "#ECFDF5" }}>Fat. Eff.</th><th style={{ ...th2, background: "#ECFDF5" }}>Tx. Limp.</th><th style={{ ...th2, background: "#ECFDF5" }}>Fat. Sz</th>
                <th style={{ ...th2, background: "#F5F3FF" }}>Tickets</th><th style={{ ...th2, background: "#F5F3FF" }}>Conv.</th><th style={{ ...th2, background: "#F5F3FF" }}>Fat. Eff.</th><th style={{ ...th2, background: "#F5F3FF" }}>Fat. Sz</th>
                <th style={{ ...th2, background: "#FFFBEB" }}>Google</th><th style={{ ...th2, background: "#FFFBEB" }}>Meta</th><th style={{ ...th2, background: "#FFFBEB" }}>TikTok</th><th style={{ ...th2, background: "#FFFBEB" }}>Total</th>
              </tr>
              <tr>
                <td style={{ ...tdTotal, textAlign: "left", position: "sticky", left: 0, zIndex: 3, fontSize: 11 }}>TOTAL</td>
                <td style={{ ...tdTotal, background: "#EBF2FF" }}>{totals.resSem || "—"}</td><td style={{ ...tdTotal, background: "#EBF2FF" }}>{fmtCurrency(totals.fatEffSem)}</td><td style={{ ...tdTotal, background: "#EBF2FF" }}>{fmtCurrency(totals.cleaningSem)}</td><td style={{ ...tdTotal, background: "#EBF2FF" }}>{fmtCurrency(totals.fatSzSem)}</td>
                <td style={{ ...tdTotal, background: "#ECFDF5" }}>{totals.resCom || "—"}</td><td style={{ ...tdTotal, background: "#ECFDF5" }}>{fmtCurrency(totals.fatEffCom)}</td><td style={{ ...tdTotal, background: "#ECFDF5" }}>{fmtCurrency(totals.cleaningCom)}</td><td style={{ ...tdTotal, background: "#ECFDF5" }}>{fmtCurrency(totals.fatSzCom)}</td>
                <td style={{ ...tdTotal, background: "#F5F3FF" }}>—</td><td style={{ ...tdTotal, background: "#F5F3FF" }}>{totals.resNB || "—"}</td><td style={{ ...tdTotal, background: "#F5F3FF" }}>{fmtCurrency(totals.fatEffNB)}</td><td style={{ ...tdTotal, background: "#F5F3FF" }}>{fmtCurrency(totals.fatSzNB)}</td>
                <td style={{ ...tdTotal, background: "#FFFBEB" }}>{fmtCurrency(totals.google)}</td><td style={{ ...tdTotal, background: "#FFFBEB" }}>{fmtCurrency(totals.meta)}</td><td style={{ ...tdTotal, background: "#FFFBEB" }}>{fmtCurrency(totals.tiktok)}</td><td style={{ ...tdTotal, background: "#FFFBEB", color: "#FC6058" }}>{fmtCurrency(totals.total)}</td>
                <td style={tdTotal}>{(totals.resSem + totals.resCom + totals.resNB) || "—"}</td>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <React.Fragment key={col.date}>
                <tr style={{ borderBottom: "1px solid #F0F3FA" }}>
                  <td style={{ ...tdStyle, textAlign: "left", position: "sticky", left: 0, background: "#fff", fontWeight: 600, color: "#00143D" }}>{fmtDate(col.date)}</td>
                  <td style={tdSem}>{fmtVal(getVal(col.sem, "reservas"), "number")}</td><td style={tdSem}>{fmtVal(getVal(col.sem, "fatEffective"), "currency")}</td><td style={tdSem}>{fmtVal(getVal(col.sem, "cleaningFee"), "currency")}</td><td style={tdSem}>{fmtVal(getVal(col.sem, "fatSeazone"), "currency")}</td>
                  <td style={tdCom}>{fmtVal(getVal(col.com, "reservas"), "number")}</td><td style={tdCom}>{fmtVal(getVal(col.com, "fatEffective"), "currency")}</td><td style={tdCom}>{fmtVal(getVal(col.com, "cleaningFee"), "currency")}</td><td style={tdCom}>{fmtVal(getVal(col.com, "fatSeazone"), "currency")}</td>
                  <td style={tdNB}>{fmtVal(getVal(col.nb, "tickets"), "number")}</td><td style={tdNB}>{fmtVal(getVal(col.nb, "conversoes"), "number")}</td><td style={tdNB}>{fmtVal(getVal(col.nb, "fatEffective"), "currency")}</td><td style={tdNB}>{fmtVal(getVal(col.nb, "fatSeazone"), "currency")}</td>
                  <td style={tdSpend}>{fmtVal(col.spending?.google, "currency")}</td><td style={tdSpend}>{fmtVal(col.spending?.meta, "currency")}</td><td style={tdSpend}>{fmtVal(col.spending?.tiktok, "currency")}</td><td style={{ ...tdSpend, fontWeight: 600 }}>{fmtVal(col.spending?.total, "currency")}</td>
                  <td style={tdStyle}>{(() => {
                    const totalRes = (getVal(col.sem, "reservas") || 0) + (getVal(col.com, "reservas") || 0) + (getVal(col.nb, "conversoes") || 0);
                    return totalRes > 0 ? (
                      <button onClick={() => setExpandedDate(expandedDate === col.date ? null : col.date)} style={{ fontSize: 12, color: "#0055FF", background: "#EBF2FF", padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: 700 }}>{totalRes} {expandedDate === col.date ? "▲" : "▼"}</button>
                    ) : <span style={{ color: "#ccc" }}>—</span>;
                  })()}</td>
                </tr>
                {expandedDate === col.date && (
                  <tr><td colSpan={18} style={{ padding: "0 0 8px 0", background: "#F8FAFF" }}>
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#7C7C7C", textTransform: "uppercase", margin: 0 }}>Códigos das reservas — {fmtDate(col.date)}</p>
                      {[
                        { label: "Sem atendimento", color: "#1D4ED8", rec: col.sem },
                        { label: "Com atendimento", color: "#065F46", rec: col.com },
                        { label: "Newbyte", color: "#5B21B6", rec: col.nb },
                      ].map((g) => {
                        const codes = (g.rec?.reservations || []).map((r) => r.reservationCode).filter(Boolean) as string[];
                        if (codes.length === 0) return null;
                        return (
                          <div key={g.label}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 4 }}>{g.label} ({codes.length})</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {codes.map((c, i) => (
                                <span key={`${c}-${i}`} style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#00143D", background: "#fff", border: "1px solid #E8EEF8", borderRadius: 6, padding: "3px 8px" }}>{c}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {![col.sem, col.com, col.nb].some((r) => (r?.reservations || []).some((x) => x.reservationCode)) && (
                        <p style={{ fontSize: 12, color: "#7C7C7C", margin: 0 }}>Nenhum código de reserva registrado neste dia.</p>
                      )}
                    </div>
                  </td></tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #F0F3FA", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 4, height: 16, borderRadius: 2, background: "#94A3B8" }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#00143D", margin: 0 }}>Origem dos dados</p>
        </div>
        <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "10px 14px", background: "#EBF2FF", borderRadius: 8, borderLeft: "3px solid #3B82F6" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Sem atendimento</p>
              <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>Reservas, Fat. Effective, Tx. Limpeza e Fat. Seazone</p>
              <p style={{ fontSize: 11, color: "#3B82F6", marginTop: 3, fontWeight: 600 }}>Fonte: Metabase</p>
            </div>
            <div style={{ padding: "10px 14px", background: "#ECFDF5", borderRadius: 8, borderLeft: "3px solid #10B981" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Com atendimento</p>
              <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>Reservas, Fat. Effective, Tx. Limpeza e Fat. Seazone</p>
              <p style={{ fontSize: 11, color: "#10B981", marginTop: 3, fontWeight: 600 }}>Fonte: Metabase</p>
            </div>
            <div style={{ padding: "10px 14px", background: "#F5F3FF", borderRadius: 8, borderLeft: "3px solid #7C3AED" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#5B21B6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Newbyte</p>
              <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>
                Reservas da campanha <strong>Vistas de Anitá MKT</strong> (CRM), coladas por código + valor.<br />
                Validadas no Metabase (3335) e sem duplicar com/sem atendimento.<br />
                <strong>Conv.</strong> = nº de reservas · <strong>Fat. Eff.</strong> = valor pago · <strong>Fat. Sz</strong> = (valor − limpeza) × 24%
              </p>
              <p style={{ fontSize: 11, color: "#7C3AED", marginTop: 3, fontWeight: 600 }}>Fonte: CRM Hóspedes + validação Metabase (por código)</p>
            </div>
            <div style={{ padding: "10px 14px", background: "#FFFBEB", borderRadius: 8, borderLeft: "3px solid #F59E0B" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Gastos (Google · Meta · TikTok)</p>
              <p style={{ fontSize: 12, color: "#00143D", margin: 0 }}>
                <strong>Google e Meta:</strong> sincronizados automaticamente via Nekt<br />
                <strong>TikTok:</strong> preenchido manualmente — gasto não está disponível na Nekt
              </p>
              <p style={{ fontSize: 11, color: "#F59E0B", marginTop: 3, fontWeight: 600 }}>Fonte: Nekt (auto) · Manual (TikTok)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DestinosTab ──────────────────────────────────────────────────────────────

function DestinosTab({ records }: { records: DailyRecord[] }) {
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const paidRecords = useMemo(() => {
    let filtered = records.filter((r) => r.type === "midia-sem-atendimento" || r.type === "midia-com-atendimento");
    if (filterFrom) filtered = filtered.filter((r) => r.date >= filterFrom);
    if (filterTo) filtered = filtered.filter((r) => r.date <= filterTo);
    return filtered;
  }, [records, filterFrom, filterTo]);
  const cityMap: Record<string, { reservas: number; fatSz: number }> = {};
  const propMap: Record<string, { reservas: number; fatSz: number }> = {};

  for (const r of paidRecords) {
    for (const res of r.reservations) {
      const dest = res.destination?.trim() || "Não informado";
      if (!cityMap[dest]) cityMap[dest] = { reservas: 0, fatSz: 0 };
      cityMap[dest].reservas += 1;
      const prop = (res as any).propertyCode?.trim() || "Não informado";
      if (!propMap[prop]) propMap[prop] = { reservas: 0, fatSz: 0 };
      propMap[prop].reservas += 1;
    }
    const fatSzPerRes = r.reservations.length > 0 ? parseMoneyValue(r.data.fatSeazone) / r.reservations.length : 0;
    for (const res of r.reservations) {
      const dest = res.destination?.trim() || "Não informado";
      if (cityMap[dest]) cityMap[dest].fatSz += fatSzPerRes;
      const prop = (res as any).propertyCode?.trim() || "Não informado";
      if (propMap[prop]) propMap[prop].fatSz += fatSzPerRes;
    }
  }

  const cities = Object.entries(cityMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.reservas - a.reservas);
  const props = Object.entries(propMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.reservas - a.reservas);
  const totalRes = cities.reduce((s, c) => s + c.reservas, 0);
  const barStyle = (pct: number, color: string): React.CSSProperties => ({ height: 6, borderRadius: 3, background: color, width: `${Math.max(pct * 100, 2)}%` });

  if (paidRecords.length === 0) return <div style={{ textAlign: "center", padding: "60px 20px", color: "#7C7C7C" }}><p style={{ fontSize: 32 }}>📍</p><p style={{ marginTop: 8 }}>Faça um Sync Metabase para ver os destinos.</p></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>De</label><input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Até</label><input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13 }} /></div>
        {(filterFrom || filterTo) && <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E8EEF8", background: "#fff", fontSize: 12, cursor: "pointer" }}>Limpar</button>}
        <span style={{ fontSize: 11, color: "#7C7C7C" }}>{paidRecords.length} registros no período</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 16 }}>Cidades mais reservadas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cities.slice(0, 15).map((c) => (<div key={c.name}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: "#00143D", fontWeight: 500 }}>{c.name}</span><span style={{ fontSize: 12, color: "#7C7C7C" }}>{c.reservas} res · {fmtCurrency(c.fatSz)}</span></div><div style={{ background: "#F0F3FA", borderRadius: 3, height: 6 }}><div style={barStyle(totalRes > 0 ? c.reservas / totalRes : 0, "#0055FF")} /></div></div>))}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 16 }}>Imóveis mais reservados</p>
          {props.filter((p) => p.name !== "Não informado").length === 0 ? <p style={{ fontSize: 12, color: "#7C7C7C" }}>Dados de imóvel disponíveis após o próximo Sync Metabase.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {props.filter((p) => p.name !== "Não informado").slice(0, 15).map((p) => (<div key={p.name}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: "#00143D", fontWeight: 500 }}>{p.name}</span><span style={{ fontSize: 12, color: "#7C7C7C" }}>{p.reservas} res · {fmtCurrency(p.fatSz)}</span></div><div style={{ background: "#F0F3FA", borderRadius: 3, height: 6 }}><div style={barStyle(totalRes > 0 ? p.reservas / totalRes : 0, "#7C3AED")} /></div></div>))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── SyncNektButton ───────────────────────────────────────────────────────────

function SyncNektButton({ onSynced }: { onSynced: (s: DailySpending[]) => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ synced: number; dateFrom: string; dateTo: string } | null>(null);

  const handleSync = async () => {
    setStatus("loading"); setResult(null);
    try {
      const res = await fetch("/api/hospedes-analise/sync-nekt-spending", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data); setStatus("done");
      const fresh = await apiGetSpending();
      onSynced(fresh);
      setTimeout(() => setStatus("idle"), 6000);
    } catch { setStatus("error"); setTimeout(() => setStatus("idle"), 5000); }
  };

  const color = status === "done" ? "#10B981" : status === "error" ? "#FC6058" : "#0055FF";
  const bg = status === "done" ? "#ECFDF5" : status === "error" ? "#FEF2F2" : "#EBF2FF";
  const border = status === "done" ? "#10B981" : status === "error" ? "#FC6058" : "#0055FF";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleSync} disabled={status === "loading"} style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontWeight: 600, fontSize: 12, cursor: status === "loading" ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        {status === "loading" ? "⏳ Sincronizando..." : status === "done" ? "✓ Sincronizado!" : status === "error" ? "❌ Erro" : "🔄 Sync Nekt"}
      </button>
      {status === "done" && result && <span style={{ fontSize: 11, color: "#10B981" }}>{result.synced} dias · {result.dateFrom} → {result.dateTo}</span>}
    </div>
  );
}

// ─── SyncMetabaseButton ───────────────────────────────────────────────────────

function SyncMetabaseButton({ onSynced }: { onSynced: (records: DailyRecord[]) => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ synced: number; dates: number; breakdown: { semAtendimento: number; comAtendimento: number } } | null>(null);

  const handleSync = async () => {
    setStatus("loading"); setResult(null);
    try {
      const res = await fetch("/api/hospedes-analise/sync-metabase", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data); setStatus("done");
      const fresh = await apiGetRecords();
      onSynced(fresh);
      setTimeout(() => setStatus("idle"), 4000);
    } catch { setStatus("error"); setTimeout(() => setStatus("idle"), 3000); }
  };

  const color = status === "done" ? "#10B981" : status === "error" ? "#FC6058" : "#7C3AED";
  const bg = status === "done" ? "#ECFDF5" : status === "error" ? "#FEF2F2" : "#F5F3FF";
  const border = status === "done" ? "#10B981" : status === "error" ? "#FC6058" : "#7C3AED";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleSync} disabled={status === "loading"} style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontWeight: 600, fontSize: 12, cursor: status === "loading" ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        {status === "loading" ? "⏳ Sincronizando..." : status === "done" ? "✓ Sincronizado!" : status === "error" ? "❌ Erro" : "🔄 Sync Metabase"}
      </button>
      {status === "done" && result && <span style={{ fontSize: 11, color: "#10B981" }}>{result.dates} dias · {result.breakdown.semAtendimento}s/ + {result.breakdown.comAtendimento}c/</span>}
    </div>
  );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────

const EXPORT_SNIPPET = `copy(JSON.stringify({records:JSON.parse(localStorage.getItem('preenchimento-daily-data')||'[]'),spending:JSON.parse(localStorage.getItem('preenchimento-spending-data')||'[]')}))`;

function ImportModal({ onImported }: { onImported: (records: DailyRecord[], spending: DailySpending[]) => void }) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ imported: { records: number; spending: number } } | null>(null);
  const [copied, setCopied] = useState(false);

  const copySnippet = () => { navigator.clipboard.writeText(EXPORT_SNIPPET); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleImport = async () => {
    setStatus("loading");
    try {
      const parsed = JSON.parse(json);
      const res = await fetch("/api/hospedes-analise/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
      if (!res.ok) throw new Error("Erro no servidor");
      const data = await res.json();
      setResult(data); setStatus("done");
      const [newRecords, newSpending] = await Promise.all([apiGetRecords(), apiGetSpending()]);
      onImported(newRecords, newSpending);
    } catch { setStatus("error"); }
  };

  if (!open) return <button onClick={() => setOpen(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #F59E0B", background: "#FFFBEB", color: "#92400E", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>📥 Importar dados do Lovable</button>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div><h2 style={{ fontSize: 16, fontWeight: 700, color: "#00143D", margin: 0 }}>Importar dados do Lovable</h2><p style={{ fontSize: 13, color: "#7C7C7C", marginTop: 4 }}>Migra todos os seus registros sem perder nada</p></div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#7C7C7C" }}>✕</button>
        </div>
        {status !== "done" && (<>
          <div style={{ background: "#F0F3FA", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 8 }}>Passo 1 — Exporte os dados do Lovable</p>
            <ol style={{ fontSize: 13, color: "#7C7C7C", paddingLeft: 20, margin: "0 0 12px" }}><li>Abra <strong>analise-dados-midia-paga-hospedes.lovable.app</strong></li><li>Aperte <strong>F12</strong> para abrir o DevTools</li><li>Clique na aba <strong>Console</strong></li><li>Cole o comando abaixo e pressione Enter</li></ol>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ flex: 1, fontSize: 11, background: "#00143D", color: "#7FDBFF", padding: "8px 12px", borderRadius: 8, display: "block", overflow: "auto", whiteSpace: "nowrap" }}>{EXPORT_SNIPPET}</code>
              <button onClick={copySnippet} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E8EEF8", background: "#fff", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600, color: copied ? "#10B981" : "#00143D" }}>{copied ? "✓ Copiado!" : "Copiar"}</button>
            </div>
            <p style={{ fontSize: 12, color: "#7C7C7C", marginTop: 8 }}>O comando copia automaticamente o JSON para sua área de transferência.</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 8 }}>Passo 2 — Cole o JSON aqui</p>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"records":[...],"spending":[...]}' rows={6} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          {status === "error" && <p style={{ fontSize: 12, color: "#FC6058", marginBottom: 12 }}>❌ JSON inválido ou erro no servidor. Verifique se o conteúdo está correto.</p>}
          <button onClick={handleImport} disabled={!json.trim() || status === "loading"} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: !json.trim() ? "#E8EEF8" : "#0055FF", color: !json.trim() ? "#7C7C7C" : "#fff", fontWeight: 700, fontSize: 14, cursor: json.trim() ? "pointer" : "default" }}>{status === "loading" ? "Importando..." : "Importar dados"}</button>
        </>)}
        {status === "done" && result && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: 40 }}>✅</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#00143D", marginTop: 12 }}>Importação concluída!</p>
            <p style={{ fontSize: 13, color: "#7C7C7C", marginTop: 8 }}>{result.imported.records} registros e {result.imported.spending} entradas de gastos importados com sucesso.</p>
            <button onClick={() => { setOpen(false); setJson(""); setStatus("idle"); setResult(null); }} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 8, border: "none", background: "#0055FF", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Ver meus dados</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnaliseMidiaPagaHospedesPage() {
  const [tab, setTab] = useState<"resultados" | "preenchimento" | "tabela" | "destinos">("resultados");
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [spending, setSpending] = useState<DailySpending[]>([]);
  const [formulaConfig, setFormulaConfig] = useState<FormulaConfig>(DEFAULT_FORMULA_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGetRecords(), apiGetSpending(), apiGetFormulaConfig()]).then(([r, s, fc]) => {
      setRecords(r); setSpending(s); setFormulaConfig(fc); setLoading(false);
    });
  }, []);

  const tabs: { id: "resultados" | "preenchimento" | "tabela" | "destinos"; label: string; emoji: string }[] = [
    { id: "resultados", label: "Resultados", emoji: "📈" },
    { id: "preenchimento", label: "Preenchimento", emoji: "📝" },
    { id: "tabela", label: "Tabela KPIs", emoji: "📋" },
    { id: "destinos", label: "Destinos", emoji: "📍" },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#7C7C7C" }}>
          <Link href="/vistas-hospedes" style={{ color: "#7C7C7C", textDecoration: "none" }}>Hóspedes</Link>
          <span>›</span>
          <span style={{ color: "#00143D", fontWeight: 600 }}>Análise Mídia Paga</span>
        </div>
        {!loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SyncMetabaseButton onSynced={(r) => setRecords(r)} />
            <SyncNektButton onSynced={(s) => setSpending(s)} />
            <ImportModal onImported={(r, s) => { setRecords(r); setSpending(s); }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F0F3FA", borderRadius: 12, padding: 4 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 16px", borderRadius: 9, border: "none", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#00143D" : "#7C7C7C", fontWeight: tab === t.id ? 700 : 400, fontSize: 13, cursor: "pointer", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#7C7C7C" }}><p>Carregando dados...</p></div>
      ) : (<>
        {tab === "resultados" && <ResultadosTab records={records} spending={spending} onRecordsChange={setRecords} formulaConfig={formulaConfig} onFormulaConfigChange={setFormulaConfig} />}
        {tab === "preenchimento" && <PreenchimentoTab records={records} spending={spending} onRecordsChange={setRecords} onSpendingChange={setSpending} />}
        {tab === "tabela" && <TabelaTab records={records} spending={spending} onRecordsChange={setRecords} onSpendingChange={setSpending} />}
        {tab === "destinos" && <DestinosTab records={records} />}
      </>)}
    </div>
  );
}
