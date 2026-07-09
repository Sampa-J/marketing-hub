"use client"

import { useEffect, useState } from "react"
import { T } from "@/lib/constants"

const COR = "#7C3AED"

export const NAV_SECTIONS = [
  { id: "reservas", label: "Reservas" },
  { id: "seguidores", label: "Seguidores" },
  { id: "engajamento", label: "Engajamento" },
  { id: "collabs", label: "Collabs" },
  { id: "influenciadores", label: "Influenciadores" },
  { id: "conteudo", label: "Conteúdo" },
]

export function SectionNavVistas() {
  const [active, setActive] = useState<string>(NAV_SECTIONS[0].id)

  useEffect(() => {
    const els = NAV_SECTIONS
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null)

    const obs = new IntersectionObserver(
      (entries) => {
        // pega a seção mais próxima do topo que está visível
        const visiveis = entries.filter(e => e.isIntersecting)
        if (visiveis.length > 0) {
          visiveis.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActive(visiveis[0].target.id)
        }
      },
      { rootMargin: "-110px 0px -55% 0px", threshold: 0 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 52,
        zIndex: 39,
        background: `${T.card}f2`,
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "8px 24px",
        display: "flex",
        gap: 6,
        overflowX: "auto",
        boxShadow: T.elevSm,
      }}
    >
      {NAV_SECTIONS.map(s => {
        const on = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => irPara(s.id)}
            style={{
              flexShrink: 0,
              padding: "5px 13px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${on ? COR : T.border}`,
              background: on ? COR : "transparent",
              color: on ? "#fff" : T.mutedFg,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}
