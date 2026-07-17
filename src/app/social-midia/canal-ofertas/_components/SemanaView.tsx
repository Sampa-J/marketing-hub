"use client"

import { useState, useEffect } from 'react'
import { ImovelCard, type ImovelData, EMPTY_IMOVEL } from './ImovelCard'
import { T } from '@/lib/constants'

function getWeekLabel(): string {
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${fmt(monday)} — ${fmt(sunday)}`
}

function getWeekKey(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7)
  return `canal-ofertas-${year}-W${weekNum.toString().padStart(2, '0')}`
}

type Semana = ImovelData[]

const INITIAL: Semana = [
  { ...EMPTY_IMOVEL },
  { ...EMPTY_IMOVEL },
]

export function SemanaView() {
  const [imoveis, setImoveis] = useState<Semana>(INITIAL)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const key = getWeekKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 1) {
          setImoveis(parsed.map(p => ({ ...EMPTY_IMOVEL, ...p })) as Semana)
        }
      } catch { /* ignore */ }
    } else {
      // Pre-preencher códigos selecionados no RadarView
      const selecao = localStorage.getItem(`canal-ofertas-selecao-${key}`)
      if (selecao) {
        try {
          const codigos: string[] = JSON.parse(selecao)
          if (Array.isArray(codigos) && codigos.length >= 1) {
            setImoveis(codigos.map(codigo => ({ ...EMPTY_IMOVEL, codigo })) as Semana)
          }
        } catch { /* ignore */ }
      }
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(getWeekKey(), JSON.stringify(imoveis))
  }, [imoveis, ready])

  const prontos = imoveis.filter(i => i.copyInstagram && i.copyWhatsapp).length

  function handleChange(index: number, data: ImovelData) {
    const next = [...imoveis] as Semana
    next[index] = data
    setImoveis(next)
  }

  function limparSemana() {
    if (!confirm('Limpar todos os dados desta semana?')) return
    setImoveis([{ ...EMPTY_IMOVEL }, { ...EMPTY_IMOVEL }])
  }

  return (
    <div>
      {/* Cabeçalho da semana */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.mutedFg, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Semana atual
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: T.cardFg, margin: 0 }}>
            {getWeekLabel()}
          </p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Indicador de progresso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {imoveis.map((imovel, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: imovel.copyInstagram ? T.statusOk : T.cinza200,
                transition: 'background 0.2s',
              }} />
            ))}
            <span style={{ fontSize: 13, color: T.mutedFg, marginLeft: 4 }}>
              {prontos}/{imoveis.length} prontos
            </span>
          </div>

          <button
            onClick={limparSemana}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${T.border}`, cursor: 'pointer',
              fontSize: 12, fontWeight: 500,
              background: T.card, color: T.mutedFg,
              transition: 'all 0.15s',
            }}
          >
            Limpar semana
          </button>
        </div>
      </div>

      {/* 3 cards de imóveis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {imoveis.map((imovel, i) => (
          <ImovelCard
            key={i}
            index={i + 1}
            storyKey={`${getWeekKey()}-${i}`}
            data={imovel}
            onChange={data => handleChange(i, data)}
          />
        ))}
      </div>

      {/* Rodapé informativo */}
      <div style={{
        marginTop: 24, padding: '12px 16px',
        background: T.cinza50, borderRadius: 8,
        fontSize: 12, color: T.mutedFg, lineHeight: 1.5,
      }}>
        Os dados são salvos automaticamente no navegador por semana. Use o Radar de Ofertas no Lovable para selecionar os 2 imóveis desta semana.
      </div>
    </div>
  )
}
