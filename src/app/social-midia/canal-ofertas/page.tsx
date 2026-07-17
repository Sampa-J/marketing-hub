"use client"

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Megaphone, History, Search } from 'lucide-react'
import { T } from '@/lib/constants'
import { SemanaView } from './_components/SemanaView'
import { HistoricoView } from './_components/HistoricoView'
import { RadarView } from './_components/RadarView'

type Tab = 'selecionar' | 'semana' | 'historico'

const TABS: { id: Tab; icon: typeof Megaphone; label: string }[] = [
  { id: 'selecionar', icon: Search, label: 'Selecionar Imóveis' },
  { id: 'semana', icon: Megaphone, label: 'Esta Semana' },
  { id: 'historico', icon: History, label: 'Histórico' },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('selecionar')

  return (
    <div style={{ minHeight: '100vh', background: T.muted, fontFamily: T.font }}>
      {/* Header sticky */}
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
        <span style={{ fontSize: 14, fontWeight: 700, color: T.cardFg }}>Canal de Ofertas</span>

        <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeTab === id ? T.primary : 'transparent',
                color: activeTab === id ? T.primaryFg : T.mutedFg,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Conteúdo */}
      <main style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
        {activeTab === 'selecionar' && <RadarView onConfirmar={() => setActiveTab('semana')} />}
        {activeTab === 'semana' && <SemanaView />}
        {activeTab === 'historico' && <HistoricoView />}
      </main>
    </div>
  )
}

