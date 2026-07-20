"use client";

import { useState } from 'react';
import { X, CheckCircle, Sparkles, Copy, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { T } from '@/lib/constants';
import { getEditorial, STATUSES } from '../_lib/calendar-constants';
import { getStatusTag } from './ContentCard';
import { FrentePicker, PublicoPicker, CollabPicker } from './FrenteControls';
import { CtaPicker } from './CtaPicker';
import type { Post, ContentStatus, ContentFormat, Frente, Publico, Collab } from '../_lib/types';

const FORMAT_OPTIONS: { value: ContentFormat; label: string }[] = [
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'feed', label: 'Post Fixo' },
  { value: 'reels', label: 'Reels' },
  { value: 'stories', label: 'Story' },
];

interface ContentModalProps {
  item: Post;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Post>) => Promise<Post>;
  onDelete: (id: string) => Promise<void>;
}

export function ContentModal({ item, onClose, onUpdate, onDelete }: ContentModalProps) {
  const editorial = getEditorial(item.editoria);
  const [title, setTitle] = useState(item.title);
  const [notas, setNotas] = useState(item.notas ?? '');
  const [tema, setTema] = useState(item.tema ?? '');
  const [copy, setCopy] = useState(item.copy ?? '');
  const [status, setStatus] = useState<ContentStatus>(item.status);
  const [formato, setFormato] = useState<ContentFormat>(item.formato);
  const [scheduledDate, setScheduledDate] = useState(item.scheduled_at ?? '');
  const [frentes, setFrentes] = useState<Frente[]>(item.frentes ?? []);
  const [publicos, setPublicos] = useState<Publico[]>(item.publicos ?? []);
  const [collabs, setCollabs] = useState<Collab[]>(item.collabs ?? []);
  const [driveLink, setDriveLink] = useState(item.drive_link ?? '');
  const [ctaId, setCtaId] = useState<string | null>(item.cta_id ?? null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [copyPanelOpen, setCopyPanelOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copySaved, setCopySaved] = useState(false);

  const defaultPrompt = `Escreva a copy completa para o seguinte post:

Titulo: ${item.title}
Editoria: ${editorial?.name ?? item.editoria}
Formato: ${FORMAT_OPTIONS.find(f => f.value === item.formato)?.label ?? item.formato}
Canal: ${item.canal ?? 'Instagram'}${item.tema ? `\nTema: ${item.tema}` : ''}${item.notas ? `\nNotas: ${item.notas}` : ''}

Escreva a copy ideal para esse post.`;

  const handleGenerate = async () => {
    setGenerating(true);
    setCopyError('');
    setGeneratedCopy('');
    setCopySaved(false);
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          editorial: editorial?.name ?? item.editoria,
          formato: FORMAT_OPTIONS.find(f => f.value === item.formato)?.label ?? item.formato,
          canal: item.canal ?? 'Instagram',
          tema: item.tema,
          notas: item.notas,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar');
      setGeneratedCopy(data.copy);
    } catch (err: any) {
      setCopyError(err.message ?? 'Erro ao gerar copy');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseCopy = async () => {
    setCopy(generatedCopy);
    try {
      await onUpdate(item.id, { copy: generatedCopy });
      setCopySaved(true);
      setTimeout(() => setCopySaved(false), 2000);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onUpdate(item.id, {
        title,
        notas: notas || null,
        tema: tema || null,
        copy: copy || null,
        status,
        formato,
        scheduled_at: scheduledDate || null,
        frentes: frentes.length ? frentes : null,
        publicos: publicos.length ? publicos : null,
        collabs: collabs.length ? collabs : null,
        drive_link: driveLink || null,
        cta_id: ctaId,
      });
      onClose();
    } catch (err: any) {
      const msg = err?.message ?? 'Erro ao salvar.';
      setSaveError(
        /column .* does not exist/i.test(msg)
          ? 'Não foi possível salvar: o banco ainda não tem as colunas novas (frentes/drive/CTA). Falta a migração do admin.'
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este conteudo?')) {
      await onDelete(item.id);
      onClose();
    }
  };

  const tag = getStatusTag(item.status);

  const inputBase: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 14,
    color: T.cinza700,
    background: T.card,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: T.card,
          borderRadius: 14,
          padding: 24,
          boxShadow: T.elevMd,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: editorial?.color, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: T.mutedFg }}>{editorial?.name}</span>
            <span style={{ fontSize: 14, color: T.cinza400 }}>
              {FORMAT_OPTIONS.find((f) => f.value === item.formato)?.label ?? item.formato}
            </span>
            <span style={{ fontSize: 14, color: T.cinza400 }}>{item.canal}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.cinza400, flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo do post..."
            onFocus={(e) => (e.currentTarget.style.borderColor = T.primary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
            style={{ ...inputBase, fontSize: 17, fontWeight: 700, color: T.cardFg }}
          />
          <span style={{ background: tag.bg, color: tag.fg, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            {tag.label}
          </span>
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Tema</p>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Adicionar tema..."
            onFocus={(e) => (e.currentTarget.style.borderColor = T.primary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
            style={inputBase}
          />
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Notas</p>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Adicionar notas..."
            rows={3}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.primary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
            style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Frente</p>
          <FrentePicker value={frentes} onChange={setFrentes} />
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Público</p>
          <PublicoPicker value={publicos} onChange={setPublicos} />
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Collab</p>
          <CollabPicker value={collabs} onChange={setCollabs} />
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Link do Drive (conteúdo)</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              onFocus={(e) => (e.currentTarget.style.borderColor = T.primary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
              style={inputBase}
            />
            {driveLink.trim().startsWith('http') && (
              <a
                href={driveLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir conteúdo no Drive"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} /> Abrir
              </a>
            )}
          </div>
        </div>

        <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>CTA (ManyChat)</p>
          <CtaPicker value={ctaId} onChange={setCtaId} />
        </div>

        {copy && (
          <div style={{ background: T.cinza50, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.05em' }}>Copy</p>
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={5}
              onFocus={(e) => (e.currentTarget.style.borderColor = T.primary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
        )}

        <div style={{
          border: `1px solid ${copyPanelOpen ? T.primary : T.border}`,
          borderRadius: 10,
          marginBottom: 16,
          overflow: 'hidden',
          transition: 'border-color 0.15s',
        }}>
          <button
            onClick={() => {
              setCopyPanelOpen((v) => !v);
              if (!customPrompt) setCustomPrompt(defaultPrompt);
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: copyPanelOpen ? T.pendingBg : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color={T.primary} />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.primary }}>Gerar Copy com IA</span>
            </div>
            {copyPanelOpen ? <ChevronUp size={16} color={T.mutedFg} /> : <ChevronDown size={16} color={T.mutedFg} />}
          </button>

          {copyPanelOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 12, color: T.mutedFg, margin: '12px 0 8px' }}>
                Edite o prompt abaixo para personalizar o que o Claude vai gerar:
              </p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={6}
                style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5, fontSize: 13, marginBottom: 12 }}
              />
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: T.primary, color: T.primaryFg, border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  opacity: generating ? 0.7 : 1,
                  marginBottom: generatedCopy || copyError ? 16 : 0,
                }}
              >
                <Sparkles size={15} />
                {generating ? 'Gerando...' : 'Gerar'}
              </button>

              {copyError && (
                <div style={{ background: T.statusErrBg, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.destructive }}>
                  {copyError}
                </div>
              )}

              {generatedCopy && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.05em' }}>
                    Copy gerada
                  </p>
                  <textarea
                    value={generatedCopy}
                    onChange={(e) => setGeneratedCopy(e.target.value)}
                    rows={7}
                    style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6, fontSize: 13, marginBottom: 10, background: T.cinza50 }}
                  />
                  <button
                    onClick={handleUseCopy}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: copySaved ? T.statusOkFg : T.primary,
                      color: T.primaryFg, border: 'none', borderRadius: 8,
                      padding: '8px 18px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.2s',
                    }}
                  >
                    <Copy size={14} />
                    {copySaved ? 'Copy salva!' : 'Usar essa copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.cinza600, marginBottom: 4 }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
              style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.cinza600, marginBottom: 4 }}>Formato</label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as ContentFormat)}
              style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.cinza600, marginBottom: 4 }}>Data agendada</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
            />
          </div>
        </div>

        {saveError && (
          <div style={{ background: T.statusErrBg, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.destructive, marginBottom: 12 }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {item.status === 'agendado' && (
            <button
              onClick={async () => {
                setSaving(true);
                try { await onUpdate(item.id, { status: 'publicado' }); onClose(); } finally { setSaving(false); }
              }}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: T.statusOkFg, color: T.primaryFg,
                border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', opacity: saving ? 0.5 : 1,
              }}
            >
              <CheckCircle size={16} />
              Marcar como publicado
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, background: T.primary, color: T.primaryFg, border: 'none', borderRadius: 12,
              padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={handleDelete}
            style={{
              background: 'none', border: `1px solid ${T.statusErrBg}`, color: T.destructive, borderRadius: 12,
              padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
