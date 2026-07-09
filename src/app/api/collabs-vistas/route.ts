import { NextResponse } from "next/server"

export const maxDuration = 30

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN as string
const META_API_VERSION = "v20.0"
const BASE = `https://graph.facebook.com/${META_API_VERSION}`

// IG Business Account do Vistas de Anitá (@vistasdeanita)
const IG_USER_ID = "17841445596268700"

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const KEY = "vistas:collabs:hidden"

export interface Collab {
  id: string
  username: string | null // perfil do parceiro que publicou
  media_type: string
  thumbnail: string | null
  permalink: string
  timestamp: string
  likes: number
  comments: number
  hidden: boolean // ocultado manualmente (menção que não é collab)
}

/* IDs ocultados manualmente, persistidos no Upstash Redis */
async function getHidden(): Promise<string[]> {
  if (!KV_URL || !KV_TOKEN) return []
  const res = await fetch(`${KV_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  })
  const data = await res.json()
  if (!data.result) return []
  try { return JSON.parse(data.result) } catch { return [] }
}

async function setHidden(ids: string[]) {
  if (!KV_URL || !KV_TOKEN) return
  await fetch(`${KV_URL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", KEY, JSON.stringify(ids)]),
  })
}

export async function GET() {
  if (!META_ACCESS_TOKEN) {
    return NextResponse.json({ collabs: [], skipped: true, reason: "META_ACCESS_TOKEN não configurado" })
  }

  try {
    // /tags = mídias em que o Vistas foi marcado (collabs e parcerias)
    const fields = "id,username,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
    const [res, hidden] = await Promise.all([
      fetch(`${BASE}/${IG_USER_ID}/tags?fields=${fields}&limit=15&access_token=${META_ACCESS_TOKEN}`),
      getHidden(),
    ])
    if (!res.ok) {
      return NextResponse.json({ error: `Meta API ${res.status}`, collabs: [] }, { status: 502 })
    }
    const data = await res.json() as {
      data?: Array<{
        id: string; username?: string; media_type: string; media_url?: string
        thumbnail_url?: string; permalink: string; timestamp: string
        like_count?: number; comments_count?: number
      }>
      error?: { message: string }
    }
    if (data.error) {
      return NextResponse.json({ error: data.error.message, collabs: [] }, { status: 502 })
    }

    const hiddenSet = new Set(hidden)
    const collabs: Collab[] = (data.data ?? []).map(m => ({
      id: m.id,
      username: m.username ?? null,
      media_type: m.media_type,
      thumbnail: m.thumbnail_url || m.media_url || null,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      hidden: hiddenSet.has(m.id),
    }))

    // Ordena do post mais curtido para o menos curtido
    collabs.sort((a, b) => b.likes - a.likes)

    return NextResponse.json({ collabs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, collabs: [] }, { status: 500 })
  }
}

/* Oculta/restaura um post: body { id, hidden: boolean } */
export async function POST(req: Request) {
  try {
    const { id, hidden } = await req.json() as { id?: string; hidden?: boolean }
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 })
    const atual = new Set(await getHidden())
    if (hidden) atual.add(id)
    else atual.delete(id)
    await setHidden([...atual])
    return NextResponse.json({ ok: true, hidden: [...atual] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
