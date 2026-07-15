import { NextResponse } from "next/server"

export const maxDuration = 45

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN as string
const META_API_VERSION = "v20.0"
const BASE = `https://graph.facebook.com/${META_API_VERSION}`

// IG Business Account do Vistas de Anitá (@vistasdeanita)
const IG_USER_ID = "17841445596268700"

export interface PostEngajamento {
  id: string
  caption: string | null
  media_type: string
  thumbnail: string | null
  permalink: string
  timestamp: string
  likes: number
  comments: number
  views: number | null
  reach: number | null
  saved: number | null
  interactions: number | null
  engajamento_pct: number | null // interações / alcance
}

/* Busca insights de um post; tolera métricas indisponíveis por tipo de mídia */
async function fetchInsights(mediaId: string): Promise<{ views: number | null; reach: number | null; saved: number | null; interactions: number | null }> {
  try {
    const url = `${BASE}/${mediaId}/insights?metric=views,reach,saved,total_interactions&access_token=${META_ACCESS_TOKEN}`
    const res = await fetch(url)
    if (!res.ok) return { views: null, reach: null, saved: null, interactions: null }
    const data = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: number }> }> }
    const pick = (name: string) => data.data?.find(m => m.name === name)?.values?.[0]?.value ?? null
    return { views: pick("views"), reach: pick("reach"), saved: pick("saved"), interactions: pick("total_interactions") }
  } catch {
    return { views: null, reach: null, saved: null, interactions: null }
  }
}

export async function GET() {
  if (!META_ACCESS_TOKEN) {
    return NextResponse.json({ posts: [], skipped: true, reason: "META_ACCESS_TOKEN não configurado" })
  }

  try {
    // Últimos 12 posts (a API já retorna do mais recente para o mais antigo)
    const limit = 12
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
    const res = await fetch(`${BASE}/${IG_USER_ID}/media?fields=${fields}&limit=${limit}&access_token=${META_ACCESS_TOKEN}`)
    if (!res.ok) {
      return NextResponse.json({ error: `Meta API ${res.status}`, posts: [] }, { status: 502 })
    }
    const data = await res.json() as {
      data?: Array<{
        id: string; caption?: string; media_type: string; media_url?: string
        thumbnail_url?: string; permalink: string; timestamp: string
        like_count?: number; comments_count?: number
      }>
      error?: { message: string }
    }
    if (data.error) {
      return NextResponse.json({ error: data.error.message, posts: [] }, { status: 502 })
    }

    const media = data.data ?? []
    const insights = await Promise.all(media.map(m => fetchInsights(m.id)))

    const posts: PostEngajamento[] = media.map((m, i) => {
      const { views, reach, saved, interactions } = insights[i]
      return {
        id: m.id,
        caption: m.caption ?? null,
        media_type: m.media_type,
        thumbnail: m.thumbnail_url || m.media_url || null,
        permalink: m.permalink,
        timestamp: m.timestamp,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        views,
        reach,
        saved,
        interactions,
        engajamento_pct: interactions != null && reach ? Math.round((interactions / reach) * 1000) / 10 : null,
      }
    })

    // Ordena da maior visualização para a menor (fallback: alcance)
    const vw = (p: PostEngajamento) => p.views ?? p.reach ?? 0
    posts.sort((a, b) => vw(b) - vw(a))

    return NextResponse.json({ posts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, posts: [] }, { status: 500 })
  }
}
