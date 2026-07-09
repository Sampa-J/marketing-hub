'use client';

import { useState } from 'react';
import { Calendar, Lightbulb, PenTool, Users } from 'lucide-react';
import { T } from '@/lib/constants';
import { CalendarViewVistas } from './CalendarViewVistas';
import { BacklogViewVistas } from './BacklogViewVistas';
import { CreateContentViewVistas } from './CreateContentViewVistas';
import { VisitaInfluencersVistas } from './VisitaInfluencersVistas';

type Tab = 'calendario' | 'criar' | 'backlog';
type CalMode = 'conteudo' | 'influencers';

const TABS: { id: Tab; icon: typeof Calendar; label: string }[] = [
  { id: 'calendario', icon: Calendar, label: 'Calendário' },
  { id: 'criar', icon: PenTool, label: 'Criar Conteúdo' },
  { id: 'backlog', icon: Lightbulb, label: 'Backlog' },
];

export function CalendarioConteudoVistas() {
  const [activeTab, setActiveTab] = useState<Tab>('calendario');
  const [calMode, setCalMode] = useState<CalMode>('conteudo');

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: activeTab === id ? T.card : 'transparent',
              color: activeTab === id ? T.primary : T.mutedFg,
              borderBottom: activeTab === id ? `2px solid ${T.primary}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        {activeTab === 'calendario' && (
          <>
            {/* Switch: Conteúdo Instagram | Visita Influencers */}
            <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20, background: T.cinza50, borderRadius: 10, padding: 4 }}>
              {([
                { id: 'conteudo', icon: Calendar, label: 'Conteúdo Instagram' },
                { id: 'influencers', icon: Users, label: 'Visita Influencers' },
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
            {calMode === 'conteudo' ? <CalendarViewVistas /> : <VisitaInfluencersVistas />}
          </>
        )}
        {activeTab === 'criar' && <CreateContentViewVistas onNavigate={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === 'backlog' && <BacklogViewVistas />}
      </div>
    </div>
  );
}
