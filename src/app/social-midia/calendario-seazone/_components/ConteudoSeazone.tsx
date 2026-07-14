"use client";

import { useState } from 'react';
import { Calendar, Lightbulb, PenTool, Megaphone, Settings, Users } from 'lucide-react';
import { T } from '@/lib/constants';
import { CalendarView } from './CalendarView';
import { VisitaInfluencersSeazone } from './VisitaInfluencersSeazone';
import { BacklogView } from './BacklogView';
import { CreateContentView } from './CreateContentView';
import { CtaLibrary } from './CtaLibrary';
import { SettingsView } from './SettingsView';

type Tab = 'calendario' | 'criar' | 'backlog' | 'ctas' | 'config';

const TABS: { id: Tab; icon: typeof Calendar; label: string }[] = [
  { id: 'calendario', icon: Calendar, label: 'Calendário' },
  { id: 'criar', icon: PenTool, label: 'Criar Conteúdo' },
  { id: 'backlog', icon: Lightbulb, label: 'Backlog' },
  { id: 'ctas', icon: Megaphone, label: 'Biblioteca de CTAs' },
  { id: 'config', icon: Settings, label: 'Configurações' },
];

export function ConteudoSeazone() {
  const [activeTab, setActiveTab] = useState<Tab>('calendario');
  const [calMode, setCalMode] = useState<'conteudo' | 'influencers'>('conteudo');

  return (
    <div>
      <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
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

      {activeTab === 'calendario' && (
        <>
          {/* Switch: Conteúdo Instagram | Visita Influenciadores */}
          <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20, background: T.cinza50, borderRadius: 10, padding: 4 }}>
            {([
              { id: 'conteudo', icon: Calendar, label: 'Conteúdo Instagram' },
              { id: 'influencers', icon: Users, label: 'Visita Influenciadores' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setCalMode(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: calMode === id ? T.card : 'transparent',
                  color: calMode === id ? T.primary : T.mutedFg,
                  boxShadow: calMode === id ? T.elevSm : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          {calMode === 'conteudo' ? <CalendarView /> : <VisitaInfluencersSeazone />}
        </>
      )}
      {activeTab === 'criar' && <CreateContentView onNavigate={(tab) => setActiveTab(tab as Tab)} />}
      {activeTab === 'backlog' && <BacklogView />}
      {activeTab === 'ctas' && <CtaLibrary />}
      {activeTab === 'config' && <SettingsView onNavigate={(tab) => setActiveTab(tab as Tab)} />}
    </div>
  );
}
