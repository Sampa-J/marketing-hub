"use client"

import { useEffect, useState } from "react"
import { Heart, MessageCircle, Loader2, ExternalLink, AlertTriangle, Users, EyeOff, RotateCcw } from "lucide-react"
import { T } from "@/lib/constants"

const COR = T.primary

interface Collab {
  id: string
  username: string | null
  media_type: string
  thumbnail: string | null
  permalink: string
  timestamp: string
  likes: number
  comments: number
  hidden: boolean
}

const fmt = (n: number) => n.toLocaleString("pt-BR")

function dataFmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function CollabsSeazone() {
  const [collabs, setCollabs] = useState<Collab[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarOcultos, setMostrarOcultos] = useState(false)

  useEffect(() => {
    fetch("/api/collabs-seazone", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error)
        else if (d.skipped) setErro(d.reason || "Token da Meta não configurado")
        else setCollabs(Array.isArray(d.collabs) ? d.collabs : [])
        setLoading(false)
      })
      .catch(e => { setErro(String(e)); setLoading(false) })
  }, [])

  async function toggleHidden(id: string, hidden: boolean) {
    // otimista
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, hidden } : c))
    try {
      await fetch("/api/collabs-seazone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hidden }),
      })
    } catch {
      // reverte em caso de falha
      setCollabs(prev => prev.map(c => c.id === id ? { ...c, hidden: !hidden } : c))
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.mutedFg, fontSize: 13 }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando collabs...
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

  const ocultos = collabs.filter(c => c.hidden)
  const visiveis = mostrarOcultos ? ocultos : collabs.filter(c => !c.hidden)

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.elevSm }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "0 0 12px", flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, color: T.mutedFg, margin: 0, flex: 1, minWidth: 200 }}>
          Posts em que a Seazone foi marcada. Oculte as menções que não são collab — elas ficam salvas e somem da lista.
        </p>
        {ocultos.length > 0 && (
          <button
            onClick={() => setMostrarOcultos(m => !m)}
            style={{ fontSize: 11, fontWeight: 600, color: mostrarOcultos ? "#fff" : COR, background: mostrarOcultos ? COR : "transparent", border: `1px solid ${COR}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {mostrarOcultos ? "← Voltar aos collabs" : `Ver ocultos (${ocultos.length})`}
          </button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
          {mostrarOcultos ? "Nenhum post oculto." : "Nenhum collab por aqui."}
        </p>
      ) : (
        <div className="collabs-scroll" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, maxHeight: 1050, overflowY: "auto", paddingRight: 4 }}>
          {visiveis.map(c => (
            <a
              key={c.id}
              href={c.permalink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.card, display: "flex", flexDirection: "column", opacity: c.hidden ? 0.6 : 1 }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#0001", overflow: "hidden" }}>
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.mutedFg, fontSize: 11 }}>sem imagem</div>
                )}
                <span style={{ position: "absolute", top: 8, right: 8, background: "#000000aa", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                  <ExternalLink size={10} /> {c.media_type === "VIDEO" ? "Reel" : c.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Post"}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleHidden(c.id, !c.hidden) }}
                  title={c.hidden ? "Restaurar (é collab)" : "Ocultar (não é collab)"}
                  style={{ position: "absolute", top: 8, left: 8, background: "#000000aa", color: "#fff", border: "none", borderRadius: 4, padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700 }}
                >
                  {c.hidden ? <><RotateCcw size={11} /> Restaurar</> : <EyeOff size={11} />}
                </button>
              </div>

              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COR, display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={12} /> @{c.username ?? "—"}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: T.mutedFg, fontWeight: 600 }}>{dataFmt(c.timestamp)}</p>

                <div style={{ marginTop: "auto", display: "flex", gap: 14, fontSize: 12, color: T.cardFg }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Curtidas"><Heart size={13} color="#FC6058" /> {fmt(c.likes)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Comentários"><MessageCircle size={13} color="#3b82f6" /> {fmt(c.comments)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
