"use client";

import { useState } from "react";

interface ByDate {
  date: string;
  conversoes: number;
  fatEffective: number;
  fatSeazone: number;
}
interface Rejected {
  date: string;
  code: string;
  value: number;
  motivo: string;
}
interface ApiResult {
  validCount?: number;
  savedCount?: number;
  rejectedCount: number;
  byDate: ByDate[];
  rejected: Rejected[];
}

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

const PLACEHOLDER = `01/07/2026 | LW600J | R$ 1.170
01/07/2026 | LW593J | R$ 1.126
28/06/2026 | ME309J | R$ 966`;

export default function NewbyteImportSection({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [pastedData, setPastedData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (mode: "analyze" | "save"): Promise<ApiResult | null> => {
    setLoading(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/hospedes-analise/import-newbyte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedData, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao processar");
        return null;
      }
      return data as ApiResult;
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const data = await call("analyze");
    if (data) {
      setResult(data);
      setAnalyzed(true);
    }
  };

  const handleSave = async () => {
    const data = await call("save");
    if (data) {
      setResult(data);
      setSavedMsg(`${data.savedCount ?? 0} reserva(s) registrada(s) na Newbyte.`);
      setAnalyzed(false);
      setPastedData("");
      await onSaved();
    }
  };

  const validCount = result?.validCount ?? result?.savedCount ?? 0;
  const box: React.CSSProperties = { background: "#fff", border: "1px solid #E8EEF8", borderRadius: 12, padding: 20 };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#7C7C7C", textTransform: "uppercase" };

  return (
    <div style={box}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#00143D", marginBottom: 4 }}>
        📋 NewByte — importar por código (campanha Vistas de Anitá MKT)
      </p>
      <p style={{ fontSize: 12, color: "#7C7C7C", marginBottom: 12 }}>
        Cole as reservas no formato <strong>DD/MM/AAAA | CÓDIGO | VALOR</strong> (uma por linha). Linhas de “Soma do dia” e vazias são ignoradas.
        Cada reserva é validada: precisa existir no Metabase (3335), não pode já estar em com/sem atendimento nem já registrada na Newbyte.
        <strong> Fat. Sz = (valor − taxa de limpeza do Metabase) × 24%.</strong>
      </p>

      <textarea
        value={pastedData}
        onChange={(e) => { setPastedData(e.target.value); setAnalyzed(false); }}
        placeholder={PLACEHOLDER}
        rows={7}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E8EEF8", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={handleAnalyze}
          disabled={loading || !pastedData.trim()}
          style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #0055FF", background: "#EBF2FF", color: "#0055FF", fontWeight: 700, fontSize: 13, cursor: loading || !pastedData.trim() ? "not-allowed" : "pointer", opacity: loading || !pastedData.trim() ? 0.6 : 1 }}
        >
          {loading ? "Processando..." : "Analisar"}
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !analyzed || validCount === 0}
          title={!analyzed ? "Analise primeiro" : ""}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: !analyzed || validCount === 0 ? "#CBD5E1" : "#10B981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: loading || !analyzed || validCount === 0 ? "not-allowed" : "pointer" }}
        >
          Registrar {analyzed && validCount > 0 ? `${validCount} reserva(s)` : ""}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: 13 }}>{error}</div>
      )}
      {savedMsg && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, color: "#065F46", fontSize: 13, fontWeight: 600 }}>✓ {savedMsg}</div>
      )}

      {result && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, padding: "10px 14px", background: "#ECFDF5", borderRadius: 8, borderLeft: "3px solid #10B981" }}>
              <p style={label}>Válidas</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#065F46", margin: 0 }}>{validCount}</p>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #FC6058" }}>
              <p style={label}>Recusadas</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{result.rejectedCount}</p>
            </div>
          </div>

          {result.byDate.length > 0 && (
            <div>
              <p style={{ ...label, marginBottom: 6 }}>Por dia {analyzed ? "(prévia)" : "(registrado)"}</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Data", "Conversões", "Fat. Eff.", "Fat. Sz"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Data" ? "left" : "right", padding: "6px 10px", color: "#7C7C7C", fontWeight: 600, borderBottom: "1px solid #E8EEF8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.byDate.map((d) => (
                    <tr key={d.date} style={{ borderBottom: "1px solid #F0F3FA" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600, color: "#00143D" }}>{fmtDate(d.date)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{d.conversoes}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmtCurrency(d.fatEffective)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "#7C3AED", fontWeight: 600 }}>{fmtCurrency(d.fatSeazone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.rejected.length > 0 && (
            <div>
              <p style={{ ...label, marginBottom: 6, color: "#B91C1C" }}>Recusadas (não registradas)</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Data", "Código", "Valor", "Motivo"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#7C7C7C", fontWeight: 600, borderBottom: "1px solid #E8EEF8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rejected.map((r, i) => (
                    <tr key={`${r.code}-${i}`} style={{ borderBottom: "1px solid #F0F3FA" }}>
                      <td style={{ padding: "6px 10px", color: "#00143D" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace", color: "#7C3AED", fontWeight: 600 }}>{r.code}</td>
                      <td style={{ padding: "6px 10px" }}>{fmtCurrency(r.value)}</td>
                      <td style={{ padding: "6px 10px", color: "#B91C1C" }}>{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
