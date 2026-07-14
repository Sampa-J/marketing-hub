import Link from "next/link"
import { TeamLayout } from "@/components/team-layout"
import { T } from "@/lib/constants"

export default function Page() {
  return (
    <TeamLayout teamId="social-midia">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <Link href="/social-midia/calendario-seazone" style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "20px 24px",
          textDecoration: "none",
          display: "block",
          boxShadow: T.elevSm,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>
            Seazone
          </p>
          <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
            Métricas (IG + YouTube) · Engajamento · Collabs · Influenciadores · Calendário de conteúdo com IA, frentes, CTAs e Drive.
          </p>
        </Link>

        <Link href="/social-midia/canal-ofertas" style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "20px 24px",
          textDecoration: "none",
          display: "block",
          boxShadow: T.elevSm,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>
            Canal de Ofertas
          </p>
          <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
            Posts semanais de imóveis para Instagram e WhatsApp · Copy com IA · Prompt do Story.
          </p>
        </Link>

        <Link href="/social-midia/agente-respostas" style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "20px 24px",
          textDecoration: "none",
          display: "block",
          boxShadow: T.elevSm,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>
            Agente de Respostas
          </p>
          <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
            Gera 3 variações de resposta para comentários no Instagram, Facebook, LinkedIn e TikTok · Seazone & Vistas de Anitá.
          </p>
        </Link>

        <Link href="/social-midia/linhas-editoriais" style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "20px 24px",
          textDecoration: "none",
          display: "block",
          boxShadow: T.elevSm,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.cardFg, margin: "0 0 4px" }}>
            Linhas Editoriais
          </p>
          <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
            Mônica Medeiros · Pedro (Escola de Imóveis) · Rodrigo Ruas.
          </p>
        </Link>

      </div>
    </TeamLayout>
  )
}

