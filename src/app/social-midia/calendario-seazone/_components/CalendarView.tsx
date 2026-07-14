"use client";

import { useState, useMemo, useCallback, type DragEvent } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameMonth, addMonths, subMonths, getDay, isToday, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, ChevronDown, Search } from 'lucide-react';
import { T } from '@/lib/constants';
import { useContent } from '../_hooks/useContent';
import { useCtas } from '../_hooks/useCtas';
import { EDITORIALS, FORMATS, FRENTES } from '../_lib/calendar-constants';
import { ContentCard } from './ContentCard';
import { ContentModal } from './ContentModal';
import { QuickCreateModal } from './QuickCreateModal';
import { FrentePicker, PublicoPicker, CollabPicker } from './FrenteControls';
import type { Post, EditorialSlug, ContentStatus, ContentFormat, Frente, Publico, Collab } from '../_lib/types';

// Modal com todos os posts do dia
interface DayModalProps {
  date: string;
  items: Post[];
  onClose: () => void;
  onSelectItem: (item: Post) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
  onDuplicate: (item: Post) => void;
  onUpdate: (id: string, updates: Partial<Post>) => Promise<void>;
}

function DayModal({ date, items, onClose, onSelectItem, onStatusChange, onDuplicate, onUpdate }: DayModalProps) {
  const [d, m, y] = [
    parseInt(date.substring(8, 10)),
    parseInt(date.substring(5, 7)) - 1,
    parseInt(date.substring(0, 4)),
  ];
  const displayDate = format(new Date(y, m, d), "d 'de' MMMM yyyy", { locale: ptBR });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 520, background: T.card, borderRadius: 14,
          padding: 24, boxShadow: T.elevMd, maxHeight: '85vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.cardFg, margin: '0 0 2px', textTransform: 'capitalize' }}>
              {displayDate}
            </h3>
            <p style={{ fontSize: 13, color: T.mutedFg, margin: 0 }}>
              {items.length} {items.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.cinza400 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              compact={false}
              onClick={() => { onClose(); onSelectItem(item); }}
              onStatusChange={onStatusChange}
              onDuplicate={onDuplicate}
              onUpdate={async (id, updates) => { await onUpdate(id, updates); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type ChannelValue = 'instagram' | 'tiktok';
const CHANNEL_OPTIONS: { value: ChannelValue; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
];

export function CalendarView() {
  const { items, loading, updateItem, deleteItem, fetchItems, createItem } = useContent();
  const { ctas } = useCtas();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterEditorials, setFilterEditorials] = useState<EditorialSlug[]>([]);
  const [filterChannels, setFilterChannels] = useState<ChannelValue[]>([]);
  const [filterFormats, setFilterFormats] = useState<ContentFormat[]>([]);
  const [filterFrentes, setFilterFrentes] = useState<Frente[]>([]);
  const [filterPublicos, setFilterPublicos] = useState<Publico[]>([]);
  const [filterCollabs, setFilterCollabs] = useState<Collab[]>([]);
  const [filterCtas, setFilterCtas] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showEditorialDropdown, setShowEditorialDropdown] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showCtaDropdown, setShowCtaDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Post | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    const padDays = Array.from({ length: startPad }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (startPad - i));
      return d;
    });
    return [...padDays, ...allDays];
  }, [currentMonth]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.scheduled_at) return false;
      if (filterEditorials.length > 0 && !filterEditorials.includes(item.editoria)) return false;
      if (filterChannels.length > 0) {
        const canal = (item.canal ?? '').toLowerCase();
        const formato = (item.formato ?? '').toLowerCase();
        const isTikTok = canal.includes('tiktok') || formato === 'tiktok';
        const isInstagram = canal.includes('instagram');
        const match = filterChannels.some((ch) => (ch === 'tiktok' ? isTikTok : isInstagram));
        if (!match) return false;
      }
      if (filterFormats.length > 0 && !filterFormats.includes(item.formato as ContentFormat)) return false;
      if (filterFrentes.length > 0) {
        const fr = item.frentes ?? [];
        if (!filterFrentes.some((f) => fr.includes(f))) return false;
      }
      if (filterPublicos.length > 0) {
        const pb = item.publicos ?? [];
        if (!filterPublicos.some((p) => pb.includes(p))) return false;
      }
      if (filterCollabs.length > 0) {
        const cb = item.collabs ?? [];
        if (!filterCollabs.some((c) => cb.includes(c))) return false;
      }
      if (filterCtas.length > 0 && !filterCtas.includes(item.cta_id ?? '')) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [item.title, item.tema, item.notas, item.copy].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterEditorials, filterChannels, filterFormats, filterFrentes, filterPublicos, filterCollabs, filterCtas, search]);

  // Distribuição de frentes no mês visível (conta cada marcação de frente)
  const frenteDist = useMemo(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const counts: Record<string, number> = {};
    let total = 0;
    items.forEach((it) => {
      if (!it.scheduled_at || it.scheduled_at.substring(0, 7) !== monthKey) return;
      (it.frentes ?? []).forEach((f) => { counts[f] = (counts[f] || 0) + 1; total += 1; });
    });
    return {
      total,
      rows: FRENTES.map((f) => ({
        ...f,
        count: counts[f.value] || 0,
        pct: total ? ((counts[f.value] || 0) / total) * 100 : 0,
      })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    };
  }, [items, currentMonth]);

  const toggleFormatFilter = (fmt: ContentFormat) => {
    setFilterFormats((prev) => prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]);
  };

  const toggleEditorialFilter = (slug: EditorialSlug) => {
    setFilterEditorials((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  const toggleChannelFilter = (ch: ChannelValue) => {
    setFilterChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const toggleCtaFilter = (id: string) => {
    setFilterCtas((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    try {
      await updateItem(id, { status });
      await fetchItems();
      showToast(`Status atualizado para "${status}"`);
    } catch (err) {
      showToast('Erro ao atualizar status');
    }
  };

  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredItems.filter(
      (item) => item.scheduled_at && item.scheduled_at.substring(0, 10) === dayStr
    );
  };

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleDuplicate = async (item: Post) => {
    try {
      await createItem({
        title: `${item.title} (copia)`,
        editoria: item.editoria,
        formato: item.formato,
        canal: item.canal,
        status: 'ideia',
        scheduled_at: item.scheduled_at,
        tema: item.tema,
        estrutura: item.estrutura,
        copy: item.copy,
        notas: item.notas,
      });
      await fetchItems();
      showToast('Post duplicado!');
    } catch {
      showToast('Erro ao duplicar');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => setDragOverDate(null);

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.scheduled_at === targetDate) return;
    try {
      await updateItem(itemId, { scheduled_at: targetDate });
      await fetchItems();
      const formattedDate = format(parseISO(targetDate), "d 'de' MMMM", { locale: ptBR });
      showToast(`"${item.title}" movido para ${formattedDate}`);
    } catch {
      showToast('Erro ao mover conteudo');
    }
  };

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const dayModalItems = useMemo(() => {
    if (!dayModalDate) return [];
    return filteredItems.filter(
      (item) => item.scheduled_at && item.scheduled_at.substring(0, 10) === dayModalDate
    );
  }, [dayModalDate, filteredItems]);

  return (
    <div>
      {/* Painel de filtros */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 12, boxShadow: T.elevSm }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.mutedFg, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>Filtros</p>
        {/* Busca */}
        <div style={{ position: 'relative', maxWidth: 480, marginBottom: 10 }}>
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
        {/* Dropdowns: editoria, canal, CTA, formato */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          {/* Filtro de editoria — multi-select */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEditorialDropdown((v) => !v)}
              style={{
                border: `1px solid ${filterEditorials.length > 0 ? T.primary : T.border}`,
                borderRadius: 12, background: filterEditorials.length > 0 ? T.pendingBg : T.card,
                padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                color: filterEditorials.length > 0 ? T.primary : T.cinza700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {filterEditorials.length > 0 ? `Editorias (${filterEditorials.length})` : 'Todas editorias'}
              <ChevronDown size={14} />
            </button>
            {showEditorialDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                  onClick={() => setShowEditorialDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 99,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: 8, boxShadow: T.elevMd, minWidth: 240,
                  maxHeight: 320, overflowY: 'auto',
                }}>
                  {EDITORIALS.map((e) => (
                    <label
                      key={e.slug}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', cursor: 'pointer', borderRadius: 8,
                        fontSize: 13, color: T.cinza700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterEditorials.includes(e.slug)}
                        onChange={() => toggleEditorialFilter(e.slug)}
                        style={{ accentColor: T.primary, width: 14, height: 14 }}
                      />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                      {e.name}
                    </label>
                  ))}
                  {filterEditorials.length > 0 && (
                    <button
                      onClick={() => { setFilterEditorials([]); setShowEditorialDropdown(false); }}
                      style={{
                        width: '100%', marginTop: 6, padding: '5px 10px', fontSize: 12,
                        color: T.destructive, background: 'none', border: 'none',
                        borderTop: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Filtro de canal — multi-select */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowChannelDropdown((v) => !v)}
              style={{
                border: `1px solid ${filterChannels.length > 0 ? T.primary : T.border}`,
                borderRadius: 12, background: filterChannels.length > 0 ? T.pendingBg : T.card,
                padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                color: filterChannels.length > 0 ? T.primary : T.cinza700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {filterChannels.length > 0 ? `Canais (${filterChannels.length})` : 'Todos canais'}
              <ChevronDown size={14} />
            </button>
            {showChannelDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                  onClick={() => setShowChannelDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 99,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: 8, boxShadow: T.elevMd, minWidth: 170,
                }}>
                  {CHANNEL_OPTIONS.map((c) => (
                    <label
                      key={c.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', cursor: 'pointer', borderRadius: 8,
                        fontSize: 13, color: T.cinza700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterChannels.includes(c.value)}
                        onChange={() => toggleChannelFilter(c.value)}
                        style={{ accentColor: T.primary, width: 14, height: 14 }}
                      />
                      {c.label}
                    </label>
                  ))}
                  {filterChannels.length > 0 && (
                    <button
                      onClick={() => { setFilterChannels([]); setShowChannelDropdown(false); }}
                      style={{
                        width: '100%', marginTop: 6, padding: '5px 10px', fontSize: 12,
                        color: T.destructive, background: 'none', border: 'none',
                        borderTop: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Filtro de CTA — multi-select */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCtaDropdown((v) => !v)}
              title="Filtrar por CTA"
              style={{
                border: `1px solid ${filterCtas.length > 0 ? T.primary : T.border}`,
                borderRadius: 12, background: filterCtas.length > 0 ? T.pendingBg : T.card,
                padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                color: filterCtas.length > 0 ? T.primary : T.cinza700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {filterCtas.length > 0 ? `CTAs (${filterCtas.length})` : 'Todos CTAs'}
              <ChevronDown size={14} />
            </button>
            {showCtaDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                  onClick={() => setShowCtaDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 99,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: 8, boxShadow: T.elevMd, minWidth: 240,
                  maxHeight: 320, overflowY: 'auto',
                }}>
                  {ctas.length === 0 ? (
                    <p style={{ fontSize: 12, color: T.mutedFg, margin: 0, padding: '6px 10px' }}>Nenhuma CTA cadastrada.</p>
                  ) : ctas.map((c) => (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', cursor: 'pointer', borderRadius: 8,
                        fontSize: 13, color: T.cinza700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterCtas.includes(c.id)}
                        onChange={() => toggleCtaFilter(c.id)}
                        style={{ accentColor: T.primary, width: 14, height: 14, flexShrink: 0 }}
                      />
                      {c.titulo}
                    </label>
                  ))}
                  {filterCtas.length > 0 && (
                    <button
                      onClick={() => { setFilterCtas([]); setShowCtaDropdown(false); }}
                      style={{
                        width: '100%', marginTop: 6, padding: '5px 10px', fontSize: 12,
                        color: T.destructive, background: 'none', border: 'none',
                        borderTop: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Filtro de formato — multi-select */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFormatDropdown((v) => !v)}
              style={{
                border: `1px solid ${filterFormats.length > 0 ? T.primary : T.border}`,
                borderRadius: 12, background: filterFormats.length > 0 ? T.pendingBg : T.card,
                padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                color: filterFormats.length > 0 ? T.primary : T.cinza700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {filterFormats.length > 0 ? `Formato (${filterFormats.length})` : 'Todos formatos'}
              <ChevronDown size={14} />
            </button>
            {showFormatDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                  onClick={() => setShowFormatDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 99,
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: 8, boxShadow: T.elevMd, minWidth: 170,
                }}>
                  {FORMATS.map((f) => (
                    <label
                      key={f.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', cursor: 'pointer', borderRadius: 8,
                        fontSize: 13, color: T.cinza700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterFormats.includes(f.value)}
                        onChange={() => toggleFormatFilter(f.value)}
                        style={{ accentColor: T.primary, width: 14, height: 14 }}
                      />
                      {f.label}
                    </label>
                  ))}
                  {filterFormats.length > 0 && (
                    <button
                      onClick={() => { setFilterFormats([]); setShowFormatDropdown(false); }}
                      style={{
                        width: '100%', marginTop: 6, padding: '5px 10px', fontSize: 12,
                        color: T.destructive, background: 'none', border: 'none',
                        borderTop: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

        {/* Tags: Frente, Público, Collab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.cardFg }}>Frente:</span>
          <FrentePicker value={filterFrentes} onChange={setFilterFrentes} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.cardFg }}>Público:</span>
          <PublicoPicker value={filterPublicos} onChange={setFilterPublicos} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.cardFg }}>Collab:</span>
          <CollabPicker value={filterCollabs} onChange={setFilterCollabs} />
        </div>
        </div>
      </div>

      {/* Barra de distribuição de conteúdo por frente (mês visível) */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.cardFg }}>Distribuição por frente</span>
          <span style={{ fontSize: 12, color: T.mutedFg }}>
            {frenteDist.total} {frenteDist.total === 1 ? 'marcação' : 'marcações'} no mês
          </span>
        </div>
        {frenteDist.total === 0 ? (
          <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>Nenhum post com frente neste mês.</p>
        ) : (
          <>
            <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: T.cinza50 }}>
              {frenteDist.rows.map((r) => (
                <div key={r.value} title={`${r.label}: ${Math.round(r.pct)}%`} style={{ width: `${r.pct}%`, background: r.color }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
              {frenteDist.rows.map((r) => (
                <span key={r.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.cinza700 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                  <strong style={{ color: T.cardFg }}>{r.label}</strong> {Math.round(r.pct)}% ({r.count})
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legenda de visualização — alerta de posts no feed por dia */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.cardFg }}>Posts no feed/dia:</span>
        {[
          { c: T.statusOk, t: '1 post' },
          { c: T.statusWarn, t: '2 posts' },
          { c: T.statusErr, t: '3+ (limite atingido)' },
        ].map((l) => (
          <span key={l.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.cinza700 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.c, flexShrink: 0 }} />
            {l.t}
          </span>
        ))}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, padding: '16px 24px' }}>
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, color: T.mutedFg }}
          >
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.cardFg, margin: 0, textTransform: 'capitalize' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 6, color: T.mutedFg }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${T.cinza50}` }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: T.mutedFg }}>
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: T.cinza400 }}>
            Carregando...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '170px' }}>
            {days.map((day, i) => {
              const dayItems = getItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const dateStr = format(day, 'yyyy-MM-dd');
              const isDragOver = dragOverDate === dateStr;
              const today = isToday(day);
              const isHovered = hoveredDate === dateStr;

              // Alerta de limite: conta posts de FEED do INSTAGRAM (carrossel + post fixo + reels)
              // no dia, sempre sobre o total real (ignora filtros ativos). TikTok não conta.
              const feedCount = items.filter((it) => {
                if (!it.scheduled_at || it.scheduled_at.substring(0, 10) !== dateStr) return false;
                if (!it.formato || !['carrossel', 'feed', 'reels'].includes(it.formato)) return false;
                return !(it.canal ?? '').toLowerCase().includes('tiktok');
              }).length;
              const limitColor = feedCount >= 3 ? T.statusErr : feedCount === 2 ? T.statusWarn : feedCount === 1 ? T.statusOk : null;
              const limitTitle = feedCount >= 3
                ? `${feedCount} posts no feed — limite de posts atingido`
                : feedCount === 2 ? '2 posts no feed'
                  : feedCount === 1 ? '1 post no feed' : '';

              return (
                <div
                  key={i}
                  onMouseEnter={() => isCurrentMonth && setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  style={{
                    height: 170, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    borderBottom: `1px solid ${T.cinza50}`,
                    borderRight: `1px solid ${T.cinza50}`,
                    padding: 8,
                    transition: 'background 0.15s',
                    background: isDragOver
                      ? T.pendingBg
                      : today
                        ? `${T.pendingBg}80`
                        : !isCurrentMonth
                          ? `${T.cinza50}80`
                          : limitColor
                            ? `${limitColor}14`
                            : 'transparent',
                    boxShadow: isDragOver
                      ? `inset 0 0 0 2px ${T.primary}60`
                      : today
                        ? `inset 0 0 0 2px ${T.primary}30`
                        : 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      {/* Numero do dia — clicavel para abrir modal do dia */}
                      <span
                        onClick={() => isCurrentMonth && dayItems.length > 0 && setDayModalDate(dateStr)}
                        style={{
                          display: 'inline-flex', width: 24, height: 24,
                          alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%', fontSize: 12, fontWeight: today ? 700 : 500,
                          background: today ? T.primary : 'transparent',
                          color: today ? T.primaryFg : isCurrentMonth ? T.cinza700 : T.cinza200,
                          flexShrink: 0,
                          cursor: isCurrentMonth && dayItems.length > 0 ? 'pointer' : 'default',
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* Selo de limite de posts no feed */}
                      {isCurrentMonth && limitColor && (
                        <span
                          title={limitTitle}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 16, height: 16, padding: '0 4px',
                            borderRadius: 999, background: limitColor, color: '#fff',
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}
                        >
                          {feedCount}
                        </span>
                      )}
                    </div>
                    {isCurrentMonth && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setQuickCreateDate(dateStr); }}
                        title="Adicionar post"
                        style={{
                          background: 'none', border: `1px solid ${T.border}`, cursor: 'pointer',
                          color: T.cinza400, padding: '1px 4px', borderRadius: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  <div
                    className="cal-day-scroll"
                    style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1, minHeight: 0 }}
                  >
                    {dayItems.map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        compact
                        draggable
                        onClick={() => setSelectedItem(item)}
                        onStatusChange={handleStatusChange}
                        onDuplicate={handleDuplicate}
                        onUpdate={async (id, updates) => {
                          await updateItem(id, updates);
                          await fetchItems();
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal do dia */}
      {dayModalDate && (
        <DayModal
          date={dayModalDate}
          items={dayModalItems}
          onClose={() => setDayModalDate(null)}
          onSelectItem={(item) => { setDayModalDate(null); setSelectedItem(item); }}
          onStatusChange={handleStatusChange}
          onDuplicate={handleDuplicate}
          onUpdate={async (id, updates) => { await updateItem(id, updates); await fetchItems(); }}
        />
      )}

      {selectedItem && (
        <ContentModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={updateItem}
          onDelete={deleteItem}
        />
      )}

      {quickCreateDate && (
        <QuickCreateModal
          date={quickCreateDate}
          onClose={() => setQuickCreateDate(null)}
          onCreate={async (item) => {
            const created = await createItem(item);
            showToast('Post criado com sucesso!');
            return created;
          }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          background: T.fg, borderRadius: 12, padding: '12px 20px',
          fontSize: 14, fontWeight: 500, color: T.primaryFg, boxShadow: T.elevMd,
        }}>
          <CheckCircle size={18} color={T.statusOk} />
          {toast}
        </div>
      )}
    </div>
  );
}
