export interface MetabaseResult {
  columns: string[]
  rows: Record<string, unknown>[]
}

const METABASE_URL = "https://metabase.seazone.com.br"

// database 2 = "sapron" — o mesmo banco de produção que a skill bookings-focus
// usa via MCP. Rodar SQL nativa aqui devolve exatamente os mesmos números.
export const DB_SAPRON = 2

// Roda uma query SQL nativa no Metabase (endpoint /api/dataset) e devolve as
// linhas já mapeadas por nome de coluna. Ponte para chegar no Postgres do Sapron
// a partir do hub (que roda na Vercel e não tem conexão direta com o banco).
export async function queryMetabaseNative(sql: string, database = DB_SAPRON): Promise<MetabaseResult> {
  const apiKey = process.env.METABASE_API_KEY
  if (!apiKey) throw new Error("METABASE_API_KEY não configurada")

  const res = await fetch(`${METABASE_URL}/api/dataset`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ database, type: "native", native: { query: sql } }),
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Metabase API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  if (data?.status === "failed" || data?.error) {
    throw new Error(`Metabase query failed: ${data.error || JSON.stringify(data).slice(0, 300)}`)
  }

  const cols: string[] = (data?.data?.cols || []).map((c: { name: string }) => c.name)
  const rawRows: unknown[][] = data?.data?.rows || []
  const rows = rawRows.map((r) => {
    const o: Record<string, unknown> = {}
    cols.forEach((c, i) => { o[c] = r[i] })
    return o
  })
  return { columns: cols, rows }
}
