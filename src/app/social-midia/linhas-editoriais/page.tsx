import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { TeamLayout } from "@/components/team-layout"
import { T } from "@/lib/constants"

const LINHAS = [
  {
    href: "https://linha-editorial-monica.lovable.app/",
    title: "Linha Editorial — Mônica Medeiros",
    desc: "Linha editorial da Mônica Medeiros.",
  },
  {
    href: "https://linha-editorial-pedro-escola-de-imoveis.lovable.app",
    title: "Linha Editorial — Pedro (Escola de Imóveis)",
    desc: "Investimento imobiliário e short stay. 4 pilares · Reels + Carrossel · 3 meses.",
  },
  {
    href: "https://linha-editorial-rodrigo-ruas-seazone.lovable.app",
    title: "Linha Editorial — Rodrigo Ruas",
    desc: "Gestão de imóveis para aluguel por temporada. 4 pilares · 1 Reels/semana · 3 meses.",
  },
]

export default function Page() {
  return (
    <TeamLayout teamId="social-midia">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <Link href="/social-midia" style={{
          display: "flex", alignItems: "center", gap: 4,
          color: T.mutedFg, fontSize: 13, textDecoration: "none", fontWeight: 500, marginBottom: 4,
        }}>
          <ChevronLeft size={16} />
          Social Mídia
        </Link>

        <p style={{ fontSize: 18, fontWeight: 800, color: T.cardFg, margin: "0 0 4px" }}>Linhas Editoriais</p>

        {LINHAS.map((l) => (
          <a key={l.href} href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "20px 24px",
              textDecoration: "none",
              display: "block",
              boxShadow: T.elevSm,
            }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>
              {l.title}
            </p>
            <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
              {l.desc}
            </p>
          </a>
        ))}

      </div>
    </TeamLayout>
  )
}
