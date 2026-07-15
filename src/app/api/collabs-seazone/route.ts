import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 30

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN as string
const META_API_VERSION = "v20.0"
const BASE = `https://graph.facebook.com/${META_API_VERSION}`

// IG Business Account da Seazone (@destinoseazone) — definir em IG_USER_ID_SEAZONE
const IG_USER_ID = process.env.IG_USER_ID_SEAZONE as string

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TABLE = "collabs_hidden_seazone"

function supa() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

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

/* IDs ocultados manualmente, persistidos no Supabase */
async function getHidden(): Promise<string[]> {
  const db = supa()
  if (!db) return []
  const { data, error } = await db.from(TABLE).select("media_id")
  if (error || !data) return []
  return data.map((r: { media_id: string }) => r.media_id)
}

export async function GET() {
  if (!META_ACCESS_TOKEN) {
    return NextResponse.json({ collabs: [], skipped: true, reason: "META_ACCESS_TOKEN não configurado" })
  }
  if (!IG_USER_ID) {
    return NextResponse.json({ collabs: [], skipped: true, reason: "IG_USER_ID_SEAZONE não configurado" })
  }

  try {
    // /tags = mídias em que a Seazone foi marcada (collabs e parcerias)
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
    const db = supa()
    if (!db) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 })

    if (hidden) {
      await db.from(TABLE).upsert({ media_id: id }, { onConflict: "media_id" })
    } else {
      await db.from(TABLE).delete().eq("media_id", id)
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
