"use client";

import { useState, type DragEvent } from 'react';
import { Copy, FolderOpen } from 'lucide-react';
import { T } from '@/lib/constants';
import { getEditorial } from '../_lib/calendar-constants';
import { FrenteTags, PublicoTags, CollabTags } from './FrenteControls';
import type { Post, ContentStatus, ContentFormat } from '../_lib/types';

const STATUS_OPTIONS: { value: ContentStatus; label: string; bg: string; fg: string }[] = [
  { value: 'rascunho',  label: 'Rascunho',      bg: T.cinza50,           fg: T.cinza600 },
  { value: 'ideia',     label: 'Em aprovação',  bg: T.statusWarnBg,      fg: T.statusWarnDark },
  { value: 'aprovado',  label: 'Aprovado',      bg: `${T.roxo600}18`,    fg: T.roxo600 },
  { value: 'producao',  label: 'Em produção',   bg: `${T.laranja500}18`, fg: T.laranja500 },
  { value: 'agendado',  label: 'Agendado',      bg: T.pendingBg,         fg: T.pendingFg },
  { value: 'publicado', label: 'Publicado',     bg: T.statusOkBg,        fg: T.statusOkFg },
];

export function getStatusTag(status: ContentStatus) {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  return option
    ? { label: option.label, bg: option.bg, fg: option.fg }
    : { label: status, bg: T.cinza50, fg: T.cinza600 };
}

const FORMAT_OPTIONS: { value: ContentFormat; label: string }[] = [
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'feed',      label: 'Post Fixo' },
  { value: 'reels',     label: 'Reels' },
  { value: 'stories',   label: 'Story' },
];

export function getChannelTag(canal?: string | null, formato?: string | null): { label: string; bg: string; fg: string } | null {
  const c = (canal ?? '').toLowerCase();
  const f = (formato ?? '').toLowerCase();
  if (c.includes('tiktok') || f === 'tiktok') return { label: 'TikTok', bg: '#000000', fg: '#FFFFFF' };
  if (c.includes('instagram')) return { label: 'Instagram', bg: '#E1306C', fg: '#FFFFFF' };
  if (c.includes('linkedin')) return { label: 'LinkedIn', bg: '#0A66C2', fg: '#FFFFFF' };
  return null;
}

interface ContentCardProps {
  item: Post;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onStatusChange?: (id: string, status: ContentStatus) => void;
  onUpdate?: (id: string, updates: Partial<Post>) => void;
  onDuplicate?: (item: Post) => void;
}

export function ContentCard({ item, compact, onClick, draggable, onStatusChange, onUpdate, onDuplicate }: ContentCardProps) {
  const editorial = getEditorial(item.editoria);
  const formatLabel = FORMAT_OPTIONS.find((f) => f.value === item.formato)?.label ?? item.formato;
  const tag = getStatusTag(item.status);
  const channelTag = getChannelTag(item.canal, item.formato);
  const [editingField, setEditingField] = useState<'title' | 'notas' | null>(null);
  const [hovered, setHovered] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLDivElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).style.opacity = '1';
  };

  return (
    <div
      onClick={editingField ? undefined : onClick}
      draggable={draggable && !editingField}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.elevMd; setHovered(true); }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; setHovered(false); }}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: compact ? 8 : 12,
        padding: compact ? 6 : 12,
        cursor: draggable && !editingField ? 'grab' : 'pointer',
        transition: 'box-shadow 0.15s',
        overflow: 'hidden',
        minWidth: 0,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Botao duplicar — aparece no hover */}
      {onDuplicate && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}
          title="Duplicar post"
          style={{
            position: 'absolute', top: 4, right: 4,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 5, padding: '2px 5px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            color: T.cinza400, zIndex: 2,
          }}
        >
          <Copy size={11} />
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap', rowGap: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: editorial?.color, flexShrink: 0 }} />
        {!compact && (
          <span style={{ fontSize: 12, fontWeight: 500, color: T.mutedFg, whiteSpace: 'nowrap' }}>{editorial?.name}</span>
        )}
        {onStatusChange ? (
          <select
            value={item.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); onStatusChange(item.id, e.target.value as ContentStatus); }}
            style={{
              background: tag.bg, color: tag.fg,
              border: `1px solid ${tag.bg}`, borderRadius: 6,
              padding: '1px 4px', fontSize: 10, fontWeight: 600,
              cursor: 'pointer', outline: 'none', flexShrink: 0,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <span style={{ background: tag.bg, color: tag.fg, borderRadius: 6, padding: '1px 4px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {tag.label}
          </span>
        )}
        {channelTag && (
          <span style={{ background: channelTag.bg, color: channelTag.fg, borderRadius: 6, padding: '1px 5px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {channelTag.label}
          </span>
        )}
        <FrenteTags frentes={item.frentes} compact />
        <PublicoTags publicos={item.publicos} compact />
        <CollabTags collabs={item.collabs} compact />
        {item.drive_link && (
          <a
            href={item.drive_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir conteúdo no Drive"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: T.cinza50, color: T.primary, border: `1px solid ${T.border}`, borderRadius: 6, padding: '1px 5px', fontSize: 10, fontWeight: 600, flexShrink: 0, textDecoration: 'none' }}
          >
            <FolderOpen size={10} /> Drive
          </a>
        )}
      </div>

      {onUpdate && editingField === 'title' ? (
        <input
          autoFocus
          defaultValue={item.title}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (val && val !== item.title) onUpdate(item.id, { title: val });
            setEditingField(null);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{
            width: '100%', border: `1px solid ${T.primary}`, borderRadius: 6,
            padding: '2px 4px', fontSize: compact ? 11 : 14, fontWeight: 600,
            color: T.cardFg, outline: 'none',
          }}
        />
      ) : (
        <p
          style={{
            fontSize: compact ? 11 : 14, fontWeight: 600, color: T.cardFg,
            margin: 0, lineHeight: 1.3,
            cursor: onUpdate ? 'text' : undefined,
            ...(compact ? {
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            } : {}),
          }}
          onClick={onUpdate ? (e) => { e.stopPropagation(); setEditingField('title'); } : undefined}
        >
          {item.title}
        </p>
      )}

      {compact && (editorial?.name || formatLabel) && (
        <p style={{ fontSize: 11, color: T.mutedFg, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ fontWeight: 700, color: editorial?.color }}>{editorial?.name}</span>
          {editorial?.name && formatLabel ? ' · ' : ''}
          {formatLabel}
        </p>
      )}

      {!compact && (
        <>
          {onUpdate && editingField === 'notas' ? (
            <textarea
              autoFocus
              defaultValue={item.notas || ''}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val !== (item.notas || '')) onUpdate(item.id, { notas: val || null });
                setEditingField(null);
              }}
              rows={2}
              style={{
                width: '100%', border: `1px solid ${T.primary}`, borderRadius: 6,
                padding: '2px 4px', fontSize: 12, color: T.mutedFg,
                outline: 'none', resize: 'vertical', marginTop: 4,
              }}
            />
          ) : (item.notas || onUpdate) ? (
            <p
              style={{ fontSize: 12, color: T.mutedFg, margin: '4px 0 0', cursor: onUpdate ? 'text' : undefined }}
              onClick={onUpdate ? (e) => { e.stopPropagation(); setEditingField('notas'); } : undefined}
            >
              {item.notas || 'Adicionar descricao...'}
            </p>
          ) : null}
        </>
      )}

      {!compact && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {onUpdate ? (
            <select
              value={item.formato}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); onUpdate(item.id, { formato: e.target.value as ContentFormat }); }}
              style={{
                background: T.cinza50, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: '2px 8px', fontSize: 12, color: T.cinza600, cursor: 'pointer', outline: 'none',
              }}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <span style={{ background: T.cinza50, borderRadius: 6, padding: '2px 8px', fontSize: 12, color: T.cinza600 }}>
              {formatLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
