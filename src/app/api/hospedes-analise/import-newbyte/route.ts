import { NextResponse } from "next/server";
import { getRecords, saveRecords, type ReservationDetail } from "@/lib/hospedes-analise-db";

const METABASE_URL = "https://metabase.seazone.com.br";
const QUESTION_ID = 3335;
const SZ_TAXA = 0.24;

interface MetabaseRow {
  reservation_code: string | null;
  effective_price: number;
  cleaning_fee: number;
}

interface ParsedLine {
  date: string; // yyyy-mm-dd
  code: string;
  value: number;
  raw: string;
}

interface ValidItem {
  date: string;
  code: string;
  value: number;
  cleaningFee: number;
  fatSeazone: number;
}

interface RejectedItem {
  date: string;
  code: string;
  value: number;
  motivo: string;
}

// Formato BR: "R$ 1.170" = 1170 · "R$ 3.304" = 3304 · "R$ 1.234,56" = 1234.56 · "966" = 966
function parseMoney(v: string): number {
  if (!v) return 0;
  let raw = String(v).replace(/[^\d.,]/g, ""); // mantém dígitos, ponto e vírgula
  if (raw.includes(",")) {
    // vírgula = decimal; ponto = milhar
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // sem vírgula → pontos são separador de milhar
    raw = raw.replace(/\./g, "");
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// dd/mm/yyyy | dd/mm/yy | dd/mm → yyyy-mm-dd (ou null)
function parseDate(v: string): string | null {
  const s = v.trim();
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m4) return `${m4[3]}-${m4[2].padStart(2, "0")}-${m4[1].padStart(2, "0")}`;
  const m2y = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2y) return `20${m2y[3]}-${m2y[2].padStart(2, "0")}-${m2y[1].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m2) return `${new Date().getFullYear()}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  return null;
}

function parseLines(pastedData: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const line of pastedData.trim().split("\n")) {
    if (!line.trim()) continue;
    // aceita separador "|" ou TAB
    const parts = (line.includes("|") ? line.split("|") : line.split("\t")).map((p) => p.trim());
    if (parts.length < 3) continue;
    const date = parseDate(parts[0]);
    const code = parts[1];
    if (!date || !code) continue; // pula cabeçalho / linhas inválidas
    out.push({ date, code, value: parseMoney(parts[2]), raw: line });
  }
  return out;
}

async function fetchMetabase(): Promise<Map<string, MetabaseRow>> {
  const apiKey = process.env.METABASE_API_KEY;
  if (!apiKey) throw new Error("METABASE_API_KEY não configurada");
  const res = await fetch(`${METABASE_URL}/api/card/${QUESTION_ID}/query/json`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ parameters: [] }),
  });
  if (!res.ok) throw new Error(`Metabase retornou ${res.status}`);
  const rows = JSON.parse(await res.text()) as MetabaseRow[];
  const map = new Map<string, MetabaseRow>();
  for (const r of rows) {
    if (r.reservation_code) map.set(String(r.reservation_code).trim(), r);
  }
  return map;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pastedData: string = body.pastedData;
    const mode: string = body.mode === "save" ? "save" : "analyze";

    if (!pastedData?.trim()) {
      return NextResponse.json({ error: "Nenhum dado colado" }, { status: 400 });
    }

    const parsed = parseLines(pastedData);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha válida (use: DD/MM/AAAA | CÓDIGO | VALOR)" }, { status: 400 });
    }

    const metabase = await fetchMetabase();
    const records = await getRecords();

    // Códigos já contabilizados em com/sem atendimento e na Newbyte
    const comSemCodes = new Set<string>();
    const newbyteCodes = new Set<string>();
    for (const r of records) {
      const isComSem = r.type === "midia-com-atendimento" || r.type === "midia-sem-atendimento";
      const isNB = r.type === "relatorio-newbyte";
      for (const res of r.reservations) {
        if (!res.reservationCode) continue;
        const c = res.reservationCode.trim();
        if (isComSem) comSemCodes.add(c);
        if (isNB) newbyteCodes.add(c);
      }
    }

    const valid: ValidItem[] = [];
    const rejected: RejectedItem[] = [];
    const seen = new Set<string>();

    for (const p of parsed) {
      if (seen.has(p.code)) {
        rejected.push({ date: p.date, code: p.code, value: p.value, motivo: "Código repetido na colagem" });
        continue;
      }
      seen.add(p.code);

      if (!metabase.has(p.code)) {
        rejected.push({ date: p.date, code: p.code, value: p.value, motivo: "Não existe no Metabase (3335)" });
      } else if (comSemCodes.has(p.code)) {
        rejected.push({ date: p.date, code: p.code, value: p.value, motivo: "Já contabilizada em com/sem atendimento" });
      } else if (newbyteCodes.has(p.code)) {
        rejected.push({ date: p.date, code: p.code, value: p.value, motivo: "Já registrada na Newbyte" });
      } else {
        const cleaning = metabase.get(p.code)?.cleaning_fee ?? 0;
        const fatSz = Math.round((p.value - cleaning) * SZ_TAXA * 100) / 100;
        valid.push({ date: p.date, code: p.code, value: p.value, cleaningFee: cleaning, fatSeazone: fatSz });
      }
    }

    // Resumo por data (para a UI)
    const byDateMap = new Map<string, { date: string; conversoes: number; fatEffective: number; fatSeazone: number }>();
    for (const v of valid) {
      const cur = byDateMap.get(v.date) ?? { date: v.date, conversoes: 0, fatEffective: 0, fatSeazone: 0 };
      cur.conversoes += 1;
      cur.fatEffective += v.value;
      cur.fatSeazone += v.fatSeazone;
      byDateMap.set(v.date, cur);
    }
    const byDate = Array.from(byDateMap.values())
      .map((d) => ({ ...d, fatEffective: Math.round(d.fatEffective * 100) / 100, fatSeazone: Math.round(d.fatSeazone * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (mode === "analyze") {
      return NextResponse.json({ validCount: valid.length, rejectedCount: rejected.length, byDate, rejected });
    }

    // ── mode === "save": mescla nas Newbyte por data (acrescenta, nunca sobrepõe) ──
    const updated = [...records];
    for (const [date, entry] of byDateMap) {
      const items = valid.filter((v) => v.date === date);
      const novasReservas: ReservationDetail[] = items.map((it) => ({
        id: `nb-${it.code}`,
        source: "newbyte",
        utm: "",
        coupon: "",
        destination: "",
        reservationCode: it.code,
        effectivePrice: it.value,
      }));

      const existing = updated.find((r) => r.type === "relatorio-newbyte" && r.date === date);
      if (existing) {
        existing.reservations = [...existing.reservations, ...novasReservas];
        existing.data = {
          ...existing.data,
          tickets: Number(existing.data.tickets) || 0,
          conversoes: (Number(existing.data.conversoes) || 0) + entry.conversoes,
          fatEffective: Math.round(((Number(existing.data.fatEffective) || 0) + entry.fatEffective) * 100) / 100,
          fatSeazone: Math.round(((Number(existing.data.fatSeazone) || 0) + entry.fatSeazone) * 100) / 100,
        };
      } else {
        updated.push({
          id: `nb-${date}-${Date.now()}`,
          date,
          type: "relatorio-newbyte",
          data: {
            tickets: 0,
            conversoes: entry.conversoes,
            fatEffective: Math.round(entry.fatEffective * 100) / 100,
            fatSeazone: Math.round(entry.fatSeazone * 100) / 100,
          },
          reservations: novasReservas,
        });
      }
    }

    await saveRecords(updated);
    return NextResponse.json({ savedCount: valid.length, rejectedCount: rejected.length, byDate, rejected });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro interno: " + msg }, { status: 500 });
  }
}
