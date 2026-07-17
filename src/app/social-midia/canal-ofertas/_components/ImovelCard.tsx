"use client"

import { useState } from 'react'
import { Camera, MessageCircle, Copy, Check, Sparkles, ExternalLink } from 'lucide-react'
import { T } from '@/lib/constants'
import { StoryGenerator } from './StoryGenerator'

export type ImovelData = {
  codigo: string
  nome: string
  cidade: string
  regiao: string
  valor5diarias: string
  maxHospedes: string
  linkReservas: string
  linkDrive: string
  amenidades: string
  copyInstagram: string
  copyWhatsapp: string
  enviadoInstagram: boolean
  enviadoWhatsapp: boolean
}

export const EMPTY_IMOVEL: ImovelData = {
  codigo: '', nome: '', cidade: '', regiao: '', valor5diarias: '',
  maxHospedes: '', linkReservas: '', linkDrive: '', amenidades: '',
  copyInstagram: '', copyWhatsapp: '',
  enviadoInstagram: false, enviadoWhatsapp: false,
}

const CUPOM_INSTAGRAM = 'OFERTASINSTA2026'
const CUPOM_WHATSAPP = 'OFERTASWHATS2026'

const label: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: T.mutedFg, marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: 0.4,
}

const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, color: T.cardFg, background: T.card,
  outline: 'none', boxSizing: 'border-box', fontFamily: T.font,
}


type Props = {
  index: number
  storyKey: string
  data: ImovelData
  onChange: (data: ImovelData) => void
}

export function ImovelCard({ index, storyKey, data, onChange }: Props) {
  const [copyTab, setCopyTab] = useState<'instagram' | 'whatsapp'>('instagram')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Campos essenciais para gerar a copy. O link de reservas NÃO é obrigatório —
  // pode ser preenchido manualmente ou adicionado depois; a copy é gerada sem ele.
  const CAMPOS_OBRIGATORIOS: { key: keyof ImovelData; label: string }[] = [
    { key: 'nome', label: 'nome' },
    { key: 'cidade', label: 'cidade' },
    { key: 'valor5diarias', label: 'valor 5 diárias' },
    { key: 'maxHospedes', label: 'nº de hóspedes' },
  ]
  const camposFaltando = CAMPOS_OBRIGATORIOS.filter(c => !String(data[c.key] ?? '').trim()).map(c => c.label)
  const isFormFilled = camposFaltando.length === 0
  const hasCopy = !!(data.copyInstagram && data.copyWhatsapp)

  const set = (field: keyof ImovelData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...data, [field]: e.target.value })

  async function gerarCopy(canal: 'instagram' | 'whatsapp') {
    setLoading(true)
    setError('')
    try {
      const cupom = canal === 'instagram' ? CUPOM_INSTAGRAM : CUPOM_WHATSAPP
      const res = await fetch('/api/canal-ofertas/gerar-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: data.nome, cidade: data.cidade, regiao: data.regiao,
          valor5diarias: data.valor5diarias, maxHospedes: data.maxHospedes,
          linkReservas: data.linkReservas, amenidades: data.amenidades,
          cupom,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      if (canal === 'instagram') {
        onChange({ ...data, copyInstagram: json.copy })
      } else {
        onChange({ ...data, copyWhatsapp: json.copy })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar copy')
    } finally {
      setLoading(false)
    }
  }

  async function gerarAmbas() {
    setLoading(true)
    setError('')
    try {
      const [resIG, resWA] = await Promise.all([
        fetch('/api/canal-ofertas/gerar-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: data.nome, cidade: data.cidade, regiao: data.regiao,
            valor5diarias: data.valor5diarias, maxHospedes: data.maxHospedes,
            linkReservas: data.linkReservas, amenidades: data.amenidades,
            cupom: CUPOM_INSTAGRAM,
          }),
        }),
        fetch('/api/canal-ofertas/gerar-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: data.nome, cidade: data.cidade, regiao: data.regiao,
            valor5diarias: data.valor5diarias, maxHospedes: data.maxHospedes,
            linkReservas: data.linkReservas, amenidades: data.amenidades,
            cupom: CUPOM_WHATSAPP,
          }),
        }),
      ])
      const [ig, wa] = await Promise.all([resIG.json(), resWA.json()])
      if (ig.error) throw new Error(ig.error)
      if (wa.error) throw new Error(wa.error)
      onChange({ ...data, copyInstagram: ig.copy, copyWhatsapp: wa.copy })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar copy')
    } finally {
      setLoading(false)
    }
  }

  async function copiarCopy() {
    const text = copyTab === 'instagram' ? data.copyInstagram : data.copyWhatsapp
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

const ambosEnviados = data.enviadoInstagram && data.enviadoWhatsapp
  const borderColor = ambosEnviados ? T.statusOk + '66' : hasCopy ? T.statusOk + '33' : T.border

  const statusBg = ambosEnviados ? T.statusOkBg : hasCopy ? T.pendingBg : isFormFilled ? T.cinza100 : T.cinza50
  const statusFg = ambosEnviados ? T.statusOkDark : hasCopy ? T.pendingFg : isFormFilled ? T.cinza700 : T.cinza600
  const statusLabel = ambosEnviados ? 'Publicado ✓' : hasCopy ? 'Copy pronta' : isFormFilled ? 'Aguardando copy' : 'Pendente'

  function toggleEnviado(canal: 'instagram' | 'whatsapp') {
    if (canal === 'instagram') onChange({ ...data, enviadoInstagram: !data.enviadoInstagram })
    else onChange({ ...data, enviadoWhatsapp: !data.enviadoWhatsapp })
  }

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${borderColor}`,
      borderRadius: 12, padding: 24, boxShadow: T.elevSm,
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: T.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: T.mutedFg, flexShrink: 0,
        }}>
          {index}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.cardFg, flex: 1 }}>
          {data.nome || `Imóvel ${index}`}
        </span>

        {/* Indicadores de envio por canal */}
        {hasCopy && (
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: data.enviadoInstagram ? T.statusOkBg : T.cinza100,
              color: data.enviadoInstagram ? T.statusOkDark : T.cinza600,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Camera size={10} />
              {data.enviadoInstagram ? 'Enviado' : 'Não enviado'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: data.enviadoWhatsapp ? T.statusOkBg : T.cinza100,
              color: data.enviadoWhatsapp ? T.statusOkDark : T.cinza600,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <MessageCircle size={10} />
              {data.enviadoWhatsapp ? 'Enviado' : 'Não enviado'}
            </span>
          </div>
        )}

        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: statusBg, color: statusFg, flexShrink: 0,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Código do imóvel */}
      <div style={{ marginBottom: 12 }}>
        <label style={label}>Código do imóvel</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...input, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.6, maxWidth: 180 }}
            value={data.codigo}
            onChange={set('codigo')}
            placeholder="Ex: BSF0806"
          />
          {data.codigo && (
            <a
              href={`https://www.seazone.com.br/s/${data.codigo}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver no site Seazone"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`,
                color: T.mutedFg, background: T.card, flexShrink: 0, textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Form — 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Nome do imóvel</label>
          <input style={input} value={data.nome} onChange={set('nome')} placeholder="Ex: Casa Beira-Mar Jurerê" />
        </div>
        <div>
          <label style={label}>Cidade / Estado</label>
          <input style={input} value={data.cidade} onChange={set('cidade')} placeholder="Ex: Florianópolis – SC" />
        </div>
        <div>
          <label style={label}>Região / Bairro</label>
          <input style={input} value={data.regiao} onChange={set('regiao')} placeholder="Ex: Jurerê Internacional" />
        </div>
        <div>
          <label style={label}>Valor 5 diárias (R$)</label>
          <input style={input} value={data.valor5diarias} onChange={set('valor5diarias')} placeholder="Ex: 1.850" />
        </div>
        <div>
          <label style={label}>Até quantos hóspedes</label>
          <input style={input} value={data.maxHospedes} onChange={set('maxHospedes')} placeholder="Ex: 8" type="number" min="1" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={label}>Amenidades / diferenciais (opcional)</label>
          <textarea
            style={{ ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
            value={data.amenidades}
            onChange={set('amenidades')}
            placeholder="Ex: piscina, churrasqueira gourmet, vista pro mar, 2 vagas de garagem, Wi-Fi, smart TV"
          />
        </div>
        <div>
          <label style={label}>Link de reservas (com UTM + tr.ee)</label>
          <input style={input} value={data.linkReservas} onChange={set('linkReservas')} placeholder="Ex: https://tr.ee/xxxxxxxx" />
        </div>
        <div>
          <label style={label}>Link do Drive (fotos do imóvel)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={{ ...input, flex: 1 }} value={data.linkDrive} onChange={set('linkDrive')} placeholder="Ex: https://drive.google.com/drive/folders/..." />
            {data.linkDrive && (
              <a href={data.linkDrive} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`,
                color: T.mutedFg, background: T.card, flexShrink: 0,
              }}>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Botões de geração */}
      <div style={{ display: 'flex', gap: 8, marginBottom: error ? 8 : 0 }}>
        <button
          onClick={gerarAmbas}
          disabled={!isFormFilled || loading}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            cursor: isFormFilled && !loading ? 'pointer' : 'not-allowed',
            background: isFormFilled && !loading ? T.primary : T.cinza100,
            color: isFormFilled && !loading ? T.primaryFg : T.mutedFg,
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <Sparkles size={15} />
          {loading ? 'Gerando...' : hasCopy ? 'Regenerar ambas' : 'Gerar copy (Instagram + WhatsApp)'}
        </button>
        {hasCopy && (
          <button
            onClick={() => { setCopyTab('instagram'); gerarCopy('instagram') }}
            disabled={loading}
            title="Regenerar só Instagram"
            style={{
              padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
              cursor: loading ? 'not-allowed' : 'pointer', background: T.card, color: T.mutedFg,
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Camera size={13} /> IG
          </button>
        )}
        {hasCopy && (
          <button
            onClick={() => { setCopyTab('whatsapp'); gerarCopy('whatsapp') }}
            disabled={loading}
            title="Regenerar só WhatsApp"
            style={{
              padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
              cursor: loading ? 'not-allowed' : 'pointer', background: T.card, color: T.mutedFg,
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <MessageCircle size={13} /> WA
          </button>
        )}
      </div>

      {!isFormFilled && !loading && (
        <p style={{ fontSize: 11.5, color: T.mutedFg, margin: '8px 0 0' }}>
          Preencha para liberar a geração: <strong>{camposFaltando.join(', ')}</strong>.
        </p>
      )}

      {error && <p style={{ fontSize: 12, color: T.destructive, margin: '8px 0 0' }}>{error}</p>}

      {/* Seção de copy */}
      {hasCopy && (
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 20, paddingTop: 20 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            {(['instagram', 'whatsapp'] as const).map(tab => {
              const isEnviado = tab === 'instagram' ? data.enviadoInstagram : data.enviadoWhatsapp
              return (
                <button key={tab} onClick={() => setCopyTab(tab)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  background: copyTab === tab ? T.primary : T.muted,
                  color: copyTab === tab ? T.primaryFg : T.mutedFg,
                  position: 'relative',
                }}>
                  {tab === 'instagram' ? <Camera size={13} /> : <MessageCircle size={13} />}
                  {tab === 'instagram' ? 'Instagram' : 'WhatsApp'}
                  {isEnviado && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 10, height: 10, borderRadius: '50%',
                      background: T.statusOk, border: `2px solid ${T.card}`,
                    }} />
                  )}
                </button>
              )
            })}
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: copyTab === 'instagram' ? '#dbeafe' : '#dcfce7',
              color: copyTab === 'instagram' ? T.pendingFg : T.statusOkDark, letterSpacing: 0.3,
            }}>
              {copyTab === 'instagram' ? CUPOM_INSTAGRAM : CUPOM_WHATSAPP}
            </span>
          </div>

          {/* Texto editável */}
          <textarea
            value={copyTab === 'instagram' ? data.copyInstagram : data.copyWhatsapp}
            onChange={e => onChange({
              ...data,
              [copyTab === 'instagram' ? 'copyInstagram' : 'copyWhatsapp']: e.target.value,
            })}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: T.muted, borderRadius: 8, padding: '12px 14px',
              fontSize: 13, color: T.cardFg, lineHeight: 1.65,
              whiteSpace: 'pre-wrap', marginBottom: 12, minHeight: 200,
              border: 'none', outline: 'none', resize: 'vertical',
              fontFamily: T.font,
            }}
          />

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={copiarCopy} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: copied ? T.statusOkBg : T.card, color: copied ? T.statusOkDark : T.cardFg,
              transition: 'all 0.15s',
            }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar copy'}
            </button>

            {/* Toggle enviado do canal ativo */}
            {(() => {
              const isEnviado = copyTab === 'instagram' ? data.enviadoInstagram : data.enviadoWhatsapp
              const canalLabel = copyTab === 'instagram' ? 'Instagram' : 'WhatsApp'
              return (
                <button
                  onClick={() => toggleEnviado(copyTab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: `1px solid ${isEnviado ? T.statusOk + '88' : T.border}`,
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    background: isEnviado ? T.statusOkBg : T.card,
                    color: isEnviado ? T.statusOkDark : T.mutedFg,
                  }}
                >
                  <Check size={13} />
                  {isEnviado ? `Enviado no ${canalLabel}` : `Marcar enviado no ${canalLabel}`}
                </button>
              )
            })()}

          </div>

          <StoryGenerator
            nomeImovel={data.nome}
            storyKey={storyKey}
          />
        </div>
      )}
    </div>
  )
}
