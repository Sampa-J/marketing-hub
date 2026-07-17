import { NextResponse } from "next/server"
import { queryMetabaseNative } from "@/lib/metabase"

export const maxDuration = 30

export interface DayData {
  date: string             // YYYY-MM-DD
  count: number            // total de reservas válidas
  countNonota: number      // reservas Não-OTA
  countWebsite: number     // reservas via Website (ota_id = 8)
  movingAvg: number        // média móvel 30 dias — total
  movingAvgNonota: number  // média móvel 30 dias — Não-OTA
  movingAvgWebsite: number // média móvel 30 dias — website
}

// Fonte: Sapron (Postgres) via Metabase (database 2) — MESMA query da skill
// bookings-focus. NÃO usar stays_reservations_export da Nekt para reservas
// (correção do time em 06/07/2026: extensões e bloqueios distorcem a contagem).
//
// Vistas de Anitá = prefixo de property_property.code = 'VST'.
// Reserva válida: exclui cancelamentos, bloqueios e extensões.
// Dia da reserva: COALESCE(stays_creation_date, created_at::date).
// Canais (ota_id → reservation_ota): Website = 8; OTAs externas = Airbnb(1),
// Booking(2), Expedia(3), HomeAway(4), Decolar(10); Não-OTA = todo o resto.
const SQL = `
  SELECT COALESCE(r.stays_creation_date, r.created_at::date) AS dia,
         COUNT(*) AS total,
         SUM(CASE WHEN r.ota_id NOT IN (1,2,3,4,10) OR r.ota_id IS NULL THEN 1 ELSE 0 END) AS nonota,
         SUM(CASE WHEN r.ota_id = 8 THEN 1 ELSE 0 END) AS website
  FROM reservation_reservation r
  JOIN property_property p ON r.property_id = p.id
  WHERE p.code LIKE 'VST%'
    AND r.status <> 'Canceled'
    AND r.is_blocking = false
    AND NOT (r.is_late_extension OR r.is_early_extension OR r.is_extra_days_extension)
    AND COALESCE(r.stays_creation_date, r.created_at::date) >= CURRENT_DATE - 60
    AND COALESCE(r.stays_creation_date, r.created_at::date) < CURRENT_DATE
  GROUP BY 1 ORDER BY 1
`

export async function GET() {
  try {
    const { rows } = await queryMetabaseNative(SQL)

    const totalByDate: Record<string, number> = {}
    const nonotaByDate: Record<string, number> = {}
    const webByDate: Record<string, number> = {}
    for (const row of rows) {
      const date = String(row.dia).slice(0, 10)
      if (!date) continue
      const total = Number(row.total)
      const nonota = Number(row.nonota)
      const web = Number(row.website)
      totalByDate[date] = (totalByDate[date] || 0) + (Number.isFinite(total) ? total : 0)
      nonotaByDate[date] = (nonotaByDate[date] || 0) + (Number.isFinite(nonota) ? nonota : 0)
      webByDate[date] = (webByDate[date] || 0) + (Number.isFinite(web) ? web : 0)
    }

    // Série dos últimos 60 dias, excluindo dia corrente (incompleto)
    const all: DayData[] = []
    for (let i = 60; i >= 1; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().slice(0, 10)
      all.push({
        date,
        count: totalByDate[date] || 0,
        countNonota: nonotaByDate[date] || 0,
        countWebsite: webByDate[date] || 0,
        movingAvg: 0,
        movingAvgNonota: 0,
        movingAvgWebsite: 0,
      })
    }

    // Média móvel 30 dias (total, Não-OTA e website)
    for (let i = 0; i < all.length; i++) {
      const start = Math.max(0, i - 29)
      const window = all.slice(start, i + 1)
      const sumT = window.reduce((s, d) => s + d.count, 0)
      const sumN = window.reduce((s, d) => s + d.countNonota, 0)
      const sumW = window.reduce((s, d) => s + d.countWebsite, 0)
      all[i].movingAvg = Math.round((sumT / window.length) * 10) / 10
      all[i].movingAvgNonota = Math.round((sumN / window.length) * 10) / 10
      all[i].movingAvgWebsite = Math.round((sumW / window.length) * 10) / 10
    }

    const days = all.slice(-30)
    return NextResponse.json({ days })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
