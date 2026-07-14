"use client";

import { useState, useMemo, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown, Check, X, Search, FolderOpen } from 'lucide-react';
import { T } from '@/lib/constants';
import { useContent } from '../_hooks/useContent';
import { EDITORIALS, getEditorial } from '../_lib/calendar-constants';
import { getStatusTag, getChannelTag } from './ContentCard';
import { FrentePicker, FrenteTags } from './FrenteControls';
import type { EditorialSlug, ContentFormat, Frente } from '../_lib/types';

const FORMAT_OPTIONS: { value: ContentFormat; label: string }[] = [
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'feed', label: 'Post Fixo' },
  { value: 'reels', label: 'Reels' },
  { value: 'stories', label: 'Story' },
];

type ChannelFilter = '' | 'instagram' | 'tiktok';

export function BacklogView() {
  const { items, loading, updateItem, deleteItem } = useContent();
  const [filterEditorial, setFilterEditorial] = useState<EditorialSlug | ''>('');
  const [filterChannel, setFilterChannel] = useState<ChannelFilter>('');
  const [filterFrentes, setFilterFrentes] = useState<Frente[]>([]);
  const [search, setSearch] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveDate, setApproveDate] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const backlogItems = useMemo(() => {
    let filtered = items.filter((item) => item.status === 'ideia' && !item.scheduled_at);
    if (filterEditorial) {
      filtered = filtered.filter((item) => item.editoria === filterEditorial);
    }
    if (filterChannel) {
      filtered = filtered.filter((item) => {
        const canal = (item.canal ?? '').toLowerCase();
        const formato = (item.formato ?? '').toLowerCase();
        if (filterChannel === 'tiktok') return canal.includes('tiktok') || formato === 'tiktok';
        if (filterChannel === 'instagram') return canal.includes('instagram');
        return true;
      });
    }
    if (filterFrentes.length > 0) {
      filtered = filtered.filter((item) => {
        const fr = item.frentes ?? [];
        return filterFrentes.some((f) => fr.includes(f));
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const hay = [item.title, item.tema, item.notas, item.copy].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return filtered;
  }, [items, filterEditorial, filterChannel, filterFrentes, search]);

  const handleApprove = async () => {
    if (!approveId || !approveDate) return;
    await updateItem(approveId, { status: 'ideia', scheduled_at: approveDate });
    setApproveId(null);
    setApproveDate('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: '0 0 4px' }}>Backlog</h2>
          <p style={{ fontSize: 13, color: T.mutedFg, margin: 0 }}>Posts em aprovacao — priorize e aprove para agendar</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterEditorial}
            onChange={(e) => setFilterEditorial(e.target.value as EditorialSlug | '')}
            style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: T.card, padding: '8px 16px', fontSize: 14 }}
          >
            <option value="">Todas editorias</option>
            {EDITORIALS.map((e) => (
              <option key={e.slug} value={e.slug}>{e.name}</option>
            ))}
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value as ChannelFilter)}
            style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: T.card, padding: '8px 16px', fontSize: 14 }}
          >
            <option value="">Todos canais</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.cinza400 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar posts (título, tema, notas, copy)..."
            style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 12, background: T.card, padding: '8px 12px 8px 34px', fontSize: 14, color: T.cinza700, outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.cinza400, display: 'flex' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.mutedFg }}>Frente:</span>
          <FrentePicker value={filterFrentes} onChange={setFilterFrentes} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: T.cinza400 }}>Carregando...</div>
      ) : backlogItems.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '80px 24px', textAlign: 'center', color: T.cinza400 }}>
          Nenhum post em aprovacao. Crie conteudo na aba "Criar Conteudo".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {backlogItems.map((item) => {
            const editorial = getEditorial(item.editoria);
            const formatLabel = FORMAT_OPTIONS.find((f) => f.value === item.formato)?.label ?? item.formato;
            const tag = getStatusTag(item.status);
            const channelTag = getChannelTag(item.canal, item.formato);
            return (
              <div
                key={item.id}
                style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.elevSm; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 4, color: T.cinza400 }}>
                      <ChevronUp size={16} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.cinza700 }}>-</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 4, color: T.cinza400 }}>
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: editorial?.color }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.mutedFg }}>{editorial?.name}</span>
                      <select
                        value={item.formato}
                        onChange={async (e) => { await updateItem(item.id, { formato: e.target.value as ContentFormat }); }}
                        style={{ background: T.cinza50, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, color: T.cinza600, cursor: 'pointer' }}
                      >
                        {FORMAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <span style={{ background: tag.bg, color: tag.fg, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                        {tag.label}
                      </span>
                      {channelTag && (
                        <span style={{ background: channelTag.bg, color: channelTag.fg, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                          {channelTag.label}
                        </span>
                      )}
                      <FrenteTags frentes={item.frentes} />
                      {item.drive_link && (
                        <a
                          href={item.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir conteúdo no Drive"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: T.cinza50, color: T.primary, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                        >
                          <FolderOpen size={12} /> Drive
                        </a>
                      )}
                    </div>
                    {editingField === `title-${item.id}` ? (
                      <input
                        ref={(el) => { editRef.current = el; }}
                        autoFocus
                        defaultValue={item.title}
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val && val !== item.title) await updateItem(item.id, { title: val });
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        style={{ width: '100%', border: `1px solid ${T.primary}`, borderRadius: 8, padding: '4px 8px', fontSize: 14, fontWeight: 600, color: T.cardFg, outline: 'none' }}
                      />
                    ) : (
                      <h3
                        style={{ fontSize: 14, fontWeight: 600, color: T.cardFg, margin: 0, cursor: 'text' }}
                        onClick={() => setEditingField(`title-${item.id}`)}
                      >
                        {item.title}
                      </h3>
                    )}
                    {editingField === `notas-${item.id}` ? (
                      <textarea
                        ref={(el) => { editRef.current = el; }}
                        autoFocus
                        defaultValue={item.notas || ''}
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val !== (item.notas || '')) await updateItem(item.id, { notas: val || null });
                          setEditingField(null);
                        }}
                        rows={2}
                        style={{ width: '100%', border: `1px solid ${T.primary}`, borderRadius: 8, padding: '4px 8px', fontSize: 14, color: T.mutedFg, outline: 'none', resize: 'vertical', marginTop: 4 }}
                      />
                    ) : (
                      <p
                        style={{ fontSize: 14, color: T.mutedFg, margin: '4px 0 0', cursor: 'text', minHeight: 20 }}
                        onClick={() => setEditingField(`notas-${item.id}`)}
                      >
                        {item.notas || 'Adicionar descricao...'}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => { setApproveId(item.id); setApproveDate(''); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, background: T.statusOkFg, color: T.primaryFg,
                        border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Check size={14} />
                      Aprovar
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, color: T.cinza400 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {approveId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setApproveId(null)}
        >
          <div
            style={{ width: '100%', maxWidth: 380, background: T.card, borderRadius: 14, padding: 24, boxShadow: T.elevMd }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: T.cardFg, margin: 0 }}>Aprovar para calendario</h3>
              <button onClick={() => setApproveId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.cinza400 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: T.mutedFg, margin: '0 0 16px' }}>
              Escolha a data de publicacao para aprovar este conteudo.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: T.cinza700, marginBottom: 6 }}>Data de publicacao</label>
              <input
                type="date"
                value={approveDate}
                onChange={(e) => setApproveDate(e.target.value)}
                autoFocus
                style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 16px', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleApprove}
                disabled={!approveDate}
                style={{
                  flex: 1, background: T.statusOkFg, color: T.primaryFg, border: 'none', borderRadius: 12,
                  padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: approveDate ? 1 : 0.4,
                }}
              >
                Aprovar para calendario
              </button>
              <button
                onClick={() => setApproveId(null)}
                style={{ flex: 1, background: 'none', border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 0', fontSize: 14, fontWeight: 600, color: T.cinza600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
