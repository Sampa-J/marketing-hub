import { NextResponse } from "next/server";
import { getRecords, saveRecords, saveRecordsBackup, type ReservationDetail } from "@/lib/hospedes-analise-db";

const METABASE_URL = "https://metabase.seazone.com.br";
const QUESTION_ID = 3335;
const SZ_TAXA = 0.24;

type MidiaType = "midia-sem-atendimento" | "midia-com-atendimento";

interface MetabaseRow {
  reservation_code: string | null;
  payment_date: string;
  effective_price: number;
  cleaning_fee: number;
}

interface ValidItem {
  date: string;
  code: string;
  effective: number;
  cleaningFee: number;
  fatSeazone: number;
}

interface RejectedItem {
  code: string;
  motivo: string;
}

// Extrai o código de cada linha. Aceita "DATA | CÓDIGO | VALOR", "CÓDIGO | ..." ou só "CÓDIGO".
// Separador "|" ou TAB. A data/valor colados são ignorados — a fonte da verdade é o Metabase.
function parseCodes(pasted: string): string[] {
  const codes: string[] = [];
  for (const line of pasted.trim().split("\n")) {
    if (!line.trim()) continue;
    const parts = (line.includes("|") ? line.split("|") : line.split("\t")).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    // se o primeiro campo parece data (dd/mm...), o código é o segundo; senão, o primeiro
    const first = parts[0];
    const looksLikeDate = /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(first);
    const code = looksLikeDate ? (parts[1] ?? "") : first;
    if (!code) continue;
    if (/^(c[oó]digo|code|reserva)$/i.test(code)) continue; // ignora cabeçalho
    codes.push(code);
  }
  return codes;
}

function toDateStr(iso: string): string {
  return iso.split("T")[0];
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
  const rows = (await res.json()) as MetabaseRow[];
  const map = new Map<string, MetabaseRow>();
  for (const r of rows) {
    if (r.reservation_code) map.set(String(r.reservation_code).trim(), r);
  }
  return map;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pasted: string = body.pastedData ?? "";
    const tipo: MidiaType = body.tipo === "midia-com-atendimento" ? "midia-com-atendimento" : "midia-sem-atendimento";
    const mode: string = body.mode === "save" ? "save" : "analyze";

    if (!pasted.trim()) {
      return NextResponse.json({ error: "Nenhum código colado" }, { status: 400 });
    }

    const codes = parseCodes(pasted);
    if (codes.length === 0) {
      return NextResponse.json({ error: "Nenhum código válido encontrado" }, { status: 400 });
    }

    const metabase = await fetchMetabase();
    const records = await getRecords();

    // Códigos já contabilizados em qualquer frente (evita contar 2x)
    const jaContabilizados = new Set<string>();
    for (const r of records) {
      for (const res of r.reservations) {
        if (res.reservationCode) jaContabilizados.add(res.reservationCode.trim());
      }
    }

    const valid: ValidItem[] = [];
    const rejected: RejectedItem[] = [];
    const seen = new Set<string>();

    for (const code of codes) {
      if (seen.has(code)) {
        rejected.push({ code, motivo: "Código repetido na colagem" });
        continue;
      }
      seen.add(code);

      const mb = metabase.get(code);
      if (!mb) {
        rejected.push({ code, motivo: "Não existe no Metabase (3335)" });
      } else if (jaContabilizados.has(code)) {
        rejected.push({ code, motivo: "Já contabilizada em outra frente" });
      } else {
        const eff = mb.effective_price ?? 0;
        const cleaning = mb.cleaning_fee ?? 0;
        const fatSz = Math.round((eff - cleaning) * SZ_TAXA * 100) / 100;
        valid.push({ date: toDateStr(mb.payment_date), code, effective: eff, cleaningFee: cleaning, fatSeazone: fatSz });
      }
    }

    // Resumo por data
    const byDateMap = new Map<string, { date: string; reservas: number; fatEffective: number; cleaningFee: number; fatSeazone: number }>();
    for (const v of valid) {
      const cur = byDateMap.get(v.date) ?? { date: v.date, reservas: 0, fatEffective: 0, cleaningFee: 0, fatSeazone: 0 };
      cur.reservas += 1;
      cur.fatEffective += v.effective;
      cur.cleaningFee += v.cleaningFee;
      cur.fatSeazone += v.fatSeazone;
      byDateMap.set(v.date, cur);
    }
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const byDate = Array.from(byDateMap.values())
      .map((d) => ({ ...d, fatEffective: round2(d.fatEffective), cleaningFee: round2(d.cleaningFee), fatSeazone: round2(d.fatSeazone) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (mode === "analyze") {
      return NextResponse.json({ tipo, validCount: valid.length, rejectedCount: rejected.length, byDate, rejected });
    }

    // ── save: backup antes de escrever, depois mescla por dia+tipo (acrescenta) ──
    await saveRecordsBackup(records, "manual-por-codigo");
    const updated = [...records];
    for (const [date, entry] of byDateMap) {
      const items = valid.filter((v) => v.date === date);
      const novasReservas: ReservationDetail[] = items.map((it) => ({
        id: `mbm-${it.code}`,
        source: tipo === "midia-com-atendimento" ? "manual-com" : "manual-sem",
        utm: "",
        coupon: "",
        destination: "",
        reservationCode: it.code,
        effectivePrice: it.effective,
      }));

      const existing = updated.find((r) => r.type === tipo && r.date === date && r.id.startsWith("mb-manual-"));
      if (existing) {
        existing.reservations = [...existing.reservations, ...novasReservas];
        existing.data = {
          reservas: (Number(existing.data.reservas) || 0) + entry.reservas,
          fatEffective: round2((Number(existing.data.fatEffective) || 0) + entry.fatEffective),
          cleaningFee: round2((Number(existing.data.cleaningFee) || 0) + entry.cleaningFee),
          fatSeazone: round2((Number(existing.data.fatSeazone) || 0) + entry.fatSeazone),
        };
      } else {
        updated.push({
          id: `mb-manual-${date}-${tipo}`,
          date,
          type: tipo,
          data: {
            reservas: entry.reservas,
            fatEffective: round2(entry.fatEffective),
            cleaningFee: round2(entry.cleaningFee),
            fatSeazone: round2(entry.fatSeazone),
          },
          reservations: novasReservas,
        });
      }
    }

    await saveRecords(updated);
    return NextResponse.json({ tipo, savedCount: valid.length, rejectedCount: rejected.length, byDate, rejected });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro interno: " + msg }, { status: 500 });
  }
}
