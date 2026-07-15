import { NextResponse } from "next/server";
import { getRecords, saveRecords, saveRecordsBackup } from "@/lib/hospedes-analise-db";

const METABASE_URL = "https://metabase.seazone.com.br";
const QUESTION_ID = 3335;
const SZ_TAXA = 0.24;

interface MetabaseRow {
  reservation_code: string | null;
  effective_price: number;
  cleaning_fee: number;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

// Revalida os registros de mídia (com/sem atendimento) contra o Metabase, por código.
// Regra de segurança: só reescreve um registro se TODAS as suas reservas tiverem código
// E todos os códigos existirem no Metabase. Qualquer registro com pendência é deixado
// intocado e sinalizado. Newbyte é ignorado. Nada é apagado. Backup salvo antes.
export async function POST() {
  try {
    const records = await getRecords();
    const metabase = await fetchMetabase();

    const backupTs = await saveRecordsBackup(records, "revalidate");

    let recordsRevalidados = 0;
    let reservasRevalidadas = 0;
    let recordsInalterados = 0;
    const flagged: Array<{ date: string; tipo: string; motivo: string }> = [];

    for (const r of records) {
      if (r.type !== "midia-sem-atendimento" && r.type !== "midia-com-atendimento") continue; // pula Newbyte e outros

      const coded = r.reservations.filter((x) => x.reservationCode);
      const codeless = r.reservations.filter((x) => !x.reservationCode);
      if (coded.length === 0) {
        flagged.push({ date: r.date, tipo: r.type, motivo: "sem código de reserva" });
        continue;
      }
      const notInMb = coded.filter((x) => !metabase.has(x.reservationCode!.trim()));
      if (codeless.length > 0 || notInMb.length > 0) {
        const partes = [];
        if (notInMb.length) partes.push(`${notInMb.length} fora do Metabase`);
        if (codeless.length) partes.push(`${codeless.length} sem código`);
        flagged.push({ date: r.date, tipo: r.type, motivo: partes.join(" · ") });
        continue; // intocado
      }

      // todas as reservas casam → recalcula do Metabase
      let eff = 0, cleaning = 0, fatSz = 0;
      for (const res of coded) {
        const mb = metabase.get(res.reservationCode!.trim())!;
        const e = mb.effective_price ?? 0;
        const c = mb.cleaning_fee ?? 0;
        eff += e;
        cleaning += c;
        fatSz += (e - c) * SZ_TAXA;
        res.effectivePrice = e; // enriquece a reserva
      }
      eff = round2(eff); cleaning = round2(cleaning); fatSz = round2(fatSz);

      const antes = {
        reservas: Number(r.data.reservas) || 0,
        fatEffective: Number(r.data.fatEffective) || 0,
        cleaningFee: Number(r.data.cleaningFee) || 0,
        fatSeazone: Number(r.data.fatSeazone) || 0,
      };
      const mudou =
        antes.reservas !== coded.length ||
        Math.abs(antes.fatEffective - eff) > 0.01 ||
        Math.abs(antes.cleaningFee - cleaning) > 0.01 ||
        Math.abs(antes.fatSeazone - fatSz) > 0.01;

      r.data = { reservas: coded.length, fatEffective: eff, cleaningFee: cleaning, fatSeazone: fatSz };

      if (mudou) {
        recordsRevalidados++;
        reservasRevalidadas += coded.length;
      } else {
        recordsInalterados++;
      }
    }

    await saveRecords(records);

    return NextResponse.json({
      ok: true,
      backupTs,
      recordsRevalidados,
      reservasRevalidadas,
      recordsInalterados,
      flaggedCount: flagged.length,
      flagged,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Erro interno: " + msg }, { status: 500 });
  }
}
