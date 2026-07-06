import { NextResponse } from "next/server"

// Cruza o cupom de cada influenciador com as reservas do Metabase.
// Reaproveita a mesma pergunta usada em hospedes-analise/sync-metabase (id 3335),
// que retorna reservas com promo_code + effective_price.
const METABASE_URL = "https://metabase.seazone.com.br"
const QUESTION_ID = 3335

interface MetabaseRow {
  payment_date: string
  promo_code: string | null
  effective_price: number
  property_code: string | null
}

// Reservas nas cabanas do Vistas de Anitá têm property_code começando com "VST".
const isVst = (code: string | null) => (code || "").toUpperCase().includes("VST")

// GET /api/vistas-influenciadores-conversoes
// Resposta ok:      { ok: true, cupons: { "<cupom minúsculo>": { conversoes, valor } } }
// Sem chave local:  { error: "sem_chave", message }  (status 200 — o front trata como aviso, não erro)
// Falha Metabase:   { error: "metabase_http", message }
export async function GET() {
  const apiKey = process.env.METABASE_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: "sem_chave",
      message: "METABASE_API_KEY não está configurada neste ambiente. Preencha no .env.local para ver as conversões reais.",
    })
  }

  let rows: MetabaseRow[]
  try {
    const res = await fetch(`${METABASE_URL}/api/card/${QUESTION_ID}/query/json`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ parameters: [] }),
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json({ error: "metabase_http", message: `Metabase retornou ${res.status}` })
    }
    rows = await res.json()
  } catch (e) {
    return NextResponse.json({ error: "metabase_http", message: String(e) })
  }

  type Bucket = { conversoes: number; valor: number }
  // conversoes/valor/porMes contam SOMENTE reservas nas cabanas do Vistas (property_code com "VST").
  // outros/outrosPorMes contam as reservas do mesmo cupom em outros imóveis.
  const cupons: Record<string, Bucket & { porMes: Record<string, Bucket>; outros: Bucket; outrosPorMes: Record<string, Bucket> }> = {}
  for (const r of rows) {
    const cupom = (r.promo_code || "").trim().toLowerCase()
    if (!cupom) continue
    const eff = r.effective_price || 0
    const ym = (r.payment_date || "").slice(0, 7) // YYYY-MM
    if (!cupons[cupom]) cupons[cupom] = { conversoes: 0, valor: 0, porMes: {}, outros: { conversoes: 0, valor: 0 }, outrosPorMes: {} }
    const c = cupons[cupom]
    if (isVst(r.property_code)) {
      c.conversoes += 1
      c.valor += eff
      if (ym) {
        if (!c.porMes[ym]) c.porMes[ym] = { conversoes: 0, valor: 0 }
        c.porMes[ym].conversoes += 1
        c.porMes[ym].valor += eff
      }
    } else {
      c.outros.conversoes += 1
      c.outros.valor += eff
      if (ym) {
        if (!c.outrosPorMes[ym]) c.outrosPorMes[ym] = { conversoes: 0, valor: 0 }
        c.outrosPorMes[ym].conversoes += 1
        c.outrosPorMes[ym].valor += eff
      }
    }
  }

  return NextResponse.json({ ok: true, cupons, totalCupons: Object.keys(cupons).length })
}
