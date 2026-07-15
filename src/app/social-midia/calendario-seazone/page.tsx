"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { T } from '@/lib/constants';
import { SectionNavSeazone } from './_components/SectionNavSeazone';
import { MetricasSeazone } from './_components/MetricasSeazone';
import { PostsEngajamentoSeazone } from './_components/PostsEngajamentoSeazone';
import { CollabsSeazone } from './_components/CollabsSeazone';
import { InfluenciadoresSeazone } from './_components/InfluenciadoresSeazone';
import { ConteudoSeazone } from './_components/ConteudoSeazone';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 120, marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: '0 0 16px' }}>{title}</h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', background: T.muted, fontFamily: T.font }}>
      <header style={{
        background: T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: T.elevSm,
      }}>
        <Link href="/social-midia" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: T.mutedFg, fontSize: 12, textDecoration: 'none', fontWeight: 500,
        }}>
          <ChevronLeft size={14} />
          Social Mídia
        </Link>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.cardFg }}>Seazone — Dashboard</span>
      </header>

      <SectionNavSeazone />

      <main style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Section id="conteudo" title="Conteúdo">
          <ConteudoSeazone />
        </Section>

        <Section id="engajamento" title="Engajamento por Post">
          <PostsEngajamentoSeazone />
        </Section>

        <Section id="collabs" title="Collabs e Marcações">
          <CollabsSeazone />
        </Section>

        <Section id="influenciadores" title="Influenciadores">
          <InfluenciadoresSeazone />
        </Section>

        <Section id="metricas" title="Métricas">
          <MetricasSeazone />
        </Section>
      </main>
    </div>
  );
}
