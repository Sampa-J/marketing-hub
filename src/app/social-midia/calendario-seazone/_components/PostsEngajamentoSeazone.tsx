"use client"

import { useEffect, useMemo, useState } from "react"
import { Heart, MessageCircle, Eye, Bookmark, Zap, Play, Loader2, ExternalLink, AlertTriangle } from "lucide-react"
import { T } from "@/lib/constants"

const COR = T.primary

interface PostEngajamento {
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
  engajamento_pct: number | null
}

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR"))

const SORT_OPTS: { key: string; label: string; get: (p: PostEngajamento) => number }[] = [
  { key: "views", label: "Views", get: p => p.views ?? 0 },
  { key: "likes", label: "Curtidas", get: p => p.likes },
  { key: "comments", label: "Comentários", get: p => p.comments },
  { key: "reach", label: "Alcance", get: p => p.reach ?? 0 },
  { key: "saved", label: "Salvamentos", get: p => p.saved ?? 0 },
  { key: "interactions", label: "Interações totais", get: p => p.interactions ?? 0 },
  { key: "engajamento_pct", label: "Engajamento %", get: p => p.engajamento_pct ?? 0 },
]

function dataFmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function PostsEngajamentoSeazone() {
  const [posts, setPosts] = useState<PostEngajamento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("views")

  useEffect(() => {
    fetch("/api/posts-seazone", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error)
        else if (d.skipped) setErro(d.reason || "Token da Meta não configurado")
        else setPosts(Array.isArray(d.posts) ? d.posts : [])
        setLoading(false)
      })
      .catch(e => { setErro(String(e)); setLoading(false) })
  }, [])

  const sorted = useMemo(() => {
    const opt = SORT_OPTS.find(o => o.key === sortBy) ?? SORT_OPTS[0]
    return [...posts].sort((a, b) => opt.get(b) - opt.get(a))
  }, [posts, sortBy])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.mutedFg, fontSize: 13 }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando posts...
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{ padding: "10px 14px", background: `${T.destructive ?? "#ef4444"}11`, border: `1px solid ${T.destructive ?? "#ef4444"}55`, borderRadius: 8, fontSize: 12, color: T.destructive ?? "#ef4444", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{erro}</span>
      </div>
    )
  }

  if (posts.length === 0) {
    return <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>Nenhum post encontrado.</p>
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.elevSm }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <label htmlFor="sort-posts-seazone" style={{ fontSize: 12, fontWeight: 600, color: T.mutedFg }}>Ordenar por:</label>
        <select
          id="sort-posts-seazone"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ fontSize: 12, fontWeight: 600, color: T.cardFg, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
        >
          {SORT_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
      {sorted.map(p => (
        <a
          key={p.id}
          href={p.permalink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.card, display: "flex", flexDirection: "column" }}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#0001", overflow: "hidden" }}>
            {p.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.mutedFg, fontSize: 11 }}>sem imagem</div>
            )}
            <span style={{ position: "absolute", top: 8, right: 8, background: "#000000aa", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
              <ExternalLink size={10} /> {p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Post"}
            </span>
            {p.views != null && (
              <span style={{ position: "absolute", bottom: 8, left: 8, background: COR, color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <Play size={11} fill="#fff" /> {fmt(p.views)} views
              </span>
            )}
          </div>

          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 10, color: T.mutedFg, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              {dataFmt(p.timestamp)}
              {p.engajamento_pct != null && <span style={{ color: COR, display: "flex", alignItems: "center", gap: 2 }}><Zap size={10} />{p.engajamento_pct}%</span>}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: T.cardFg, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.caption || <span style={{ color: T.mutedFg, fontStyle: "italic" }}>sem legenda</span>}
            </p>

            <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: 11, color: T.cardFg }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Curtidas"><Heart size={12} color="#FC6058" /> {fmt(p.likes)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Comentários"><MessageCircle size={12} color="#3b82f6" /> {fmt(p.comments)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Alcance"><Eye size={12} color="#10b981" /> {fmt(p.reach)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Salvamentos"><Bookmark size={12} color="#f59e0b" /> {fmt(p.saved)}</span>
            </div>
          </div>
        </a>
      ))}
      </div>
    </div>
  )
}
