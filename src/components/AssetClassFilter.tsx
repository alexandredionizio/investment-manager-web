import { useEffect, useState } from 'react'
import { findReturnsByAsset, findReturnsByClass } from '../services/classReturnService'
import type { ClassReturnResponse } from '../services/classReturnService'
import type { ReactNode } from 'react'
import type { AssetType } from '../types/asset'
import type { PositionMarketResponse } from '../types/position'
import './AssetClassFilter.css'

export type ClassKey = AssetType | 'UNCLASSIFIED'
export const assetClasses: { key: ClassKey; label: string }[] = [
  { key: 'STOCK', label: 'Ações' },
  { key: 'FII', label: 'FIIs' },
  { key: 'ETF', label: 'ETFs' },
  { key: 'FIXED_INCOME', label: 'Renda fixa' },
  { key: 'TREASURE', label: 'Tesouro Direto' },
  { key: 'CRYPTO', label: 'Criptomoedas' },
  { key: 'UNCLASSIFIED', label: 'Não classificados' },
]

export function classOf(position: PositionMarketResponse): ClassKey {
  return assetClasses.some(item => item.key === position.assetType) ? position.assetType as AssetType : 'UNCLASSIFIED'
}

export function classBreakdown(positions: PositionMarketResponse[]) {
  const complete = positions.every(p => p.currentValue !== null && Number.isFinite(p.currentValue) && p.valuationStatus !== 'UNAVAILABLE')
  const total = complete ? positions.reduce((sum, p) => sum + p.currentValue!, 0) : null
  return assetClasses.map(({ key, label }) => {
    const items = positions.filter(p => classOf(p) === key)
    const value = complete ? items.reduce((sum, p) => sum + p.currentValue!, 0) : null
    return { key, label, items, count: items.length, value,
      percent: value !== null && total !== null && total > 0 ? value / total * 100 : null }
  }).filter(item => item.count > 0)
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

interface Props {
  positions: PositionMarketResponse[]
  portfolioId?: number
  /** Extra controls for contractual assets, rendered only in Portfolio details. */
  renderAssetDetails?: (position: PositionMarketResponse) => ReactNode
}

const qty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
const currency = (n: number | null | undefined) => n === null || n === undefined || !Number.isFinite(n) ? 'Indisponível' : money(n)
export const variationFromCost = (cost: number, value: number | null): number | null =>
  value === null || !Number.isFinite(value) || !Number.isFinite(cost) || cost <= 0 ? null : (value - cost) / cost * 100
const rate = (n: number | null | undefined) => n === null || n === undefined || !Number.isFinite(n) ? 'Indisponível' : `${n > 0 ? '+' : ''}${percent(n)}`

/** Fetch one asset only when the user expands its class; requests are concurrency-limited. */
function AssetHistoricalReturnCell({ portfolioId, assetId, period }: {
  portfolioId?: number
  assetId: number
  period: 'ONE_MONTH' | 'ONE_YEAR' | 'ALL'
}) {
  const [result, setResult] = useState<{ rate: number | null; hint: string; pending: boolean }>({
    rate: null, hint: 'Aguardando consulta histórica.', pending: true,
  })
  useEffect(() => {
    let active = true
    if (!portfolioId) {
      setResult({ rate: null, hint: 'Carteira não identificada.', pending: false })
      return
    }
    setResult({ rate: null, hint: 'Consultando histórico confirmado...', pending: true })
    findReturnsByAsset(portfolioId, assetId, period)
      .then(value => {
        if (!active) return
        const available = value.status === 'AVAILABLE' && value.totalReturn !== null && Number.isFinite(value.totalReturn)
        setResult({ rate: available ? value.totalReturn! * 100 : null,
          hint: available ? `Rentabilidade ponderada de ${value.startDate} a ${value.endDate}.` : value.reason ?? 'Histórico indisponível.',
          pending: false })
      })
      .catch(() => { if (active) setResult({ rate: null, hint: 'Erro na consulta do histórico.', pending: false }) })
    return () => { active = false }
  }, [portfolioId, assetId, period])
  return <td title={result.hint} className={result.rate === null ? '' : result.rate >= 0 ? 'positive' : 'negative'}>
    {result.pending ? 'Calculando...' : rate(result.rate)}
  </td>
}

/** Single accessible, expandable class/position table used on both pages. */
export function AssetClassFilter({ positions, portfolioId, renderAssetDetails }: Props) {
  const [returnPeriod, setReturnPeriod] = useState<'ONE_MONTH' | 'ONE_YEAR' | 'ALL'>('ALL')
  const [classReturns, setClassReturns] = useState<ClassReturnResponse[]>([])
  const [loadingReturns, setLoadingReturns] = useState(false)
  const [returnsError, setReturnsError] = useState(false)
  useEffect(() => {
    let active = true
    setClassReturns([])
    setReturnsError(false)
    if (!portfolioId || positions.length === 0) { setLoadingReturns(false); return }
    setLoadingReturns(true)
    findReturnsByClass(portfolioId, returnPeriod)
      .then(data => { if (active) setClassReturns(data) })
      .catch(() => { if (active) setReturnsError(true) })
      .finally(() => { if (active) setLoadingReturns(false) })
    return () => { active = false }
  }, [portfolioId, returnPeriod, positions.length])
  const classReturn = (key: ClassKey) => classReturns.find(c => c.assetClass === key)
  const historicalRate = (key: ClassKey) => {
    const item = classReturn(key)
    return !loadingReturns && item?.status === 'AVAILABLE' && item.totalReturn !== null
      && Number.isFinite(item.totalReturn) ? item.totalReturn * 100 : null
  }
  const historicalHint = (key: ClassKey) => {
    if (!portfolioId) return 'Disponível apenas para carteiras identificadas.'
    if (loadingReturns) return 'Calculando rentabilidade histórica confirmada...'
    if (returnsError) return 'Falha ao consultar rentabilidade histórica. Nenhum valor estimado.'
    const item = classReturn(key)
    if (!item || item.status !== 'AVAILABLE' || item.totalReturn === null) return item?.reason ?? 'Rentabilidade histórica indisponível.'
    return `Rentabilidade ponderada por movimentações e proventos de ${item.startDate} a ${item.endDate}. Não confundir com variação sobre custo.`
  }

  const [expanded, setExpanded] = useState<ClassKey[]>([])
  const breakdown = classBreakdown(positions)
  const total = breakdown.every(c => c.value !== null) ? breakdown.reduce((sum, c) => sum + c.value!, 0) : null
  function toggle(key: ClassKey) {
    setExpanded(previous => previous.includes(key) ? previous.filter(v => v !== key) : [...previous, key])
  }
  return (
    <section className="asset-class-filter" aria-label="Posições por classe de ativo">
      <div className="asset-class-filter-top">
        <div>
          <strong>Distribuição por classe</strong>
          <p>{positions.length} {positions.length === 1 ? 'ativo' : 'ativos'} em {breakdown.length} {breakdown.length === 1 ? 'classe' : 'classes'}</p>
        </div>
        <div className="asset-class-controls">
          <label htmlFor="asset-class-period">Rentabilidade</label>
          <select id="asset-class-period" value={returnPeriod} onChange={event => setReturnPeriod(event.target.value as typeof returnPeriod)}>
            <option value="ONE_MONTH">1M</option>
            <option value="ONE_YEAR">12M</option>
            <option value="ALL">Total</option>
          </select>
        <button type="button" onClick={() => setExpanded(expanded.length === breakdown.length ? [] : breakdown.map(c => c.key))}>
          {expanded.length === breakdown.length ? 'Recolher todas' : 'Expandir todas'}
        </button>
        </div>
      </div>
      {total === null && <p className="asset-class-note">Percentuais indisponíveis: existem posições sem avaliação de mercado completa.</p>}
      <div className="asset-class-scroll">
        <table className="asset-class-table">
          <thead>
            <tr><th scope="col">Classe / Ativo</th><th scope="col">Ativos / Quantidade</th><th scope="col">Preço médio</th><th scope="col">Preço atual</th><th scope="col">Custo total</th><th scope="col">Valor atual</th><th scope="col">Resultado</th><th scope="col" title="Variação das posições atuais em relação ao custo: (valor atual - custo) / custo. Não inclui proventos recebidos.">Variação</th><th scope="col" title="Rentabilidade histórica ponderada, neutralizando compras/vendas e considerando proventos no período selecionado.">Rentabilidade ({returnPeriod === 'ONE_MONTH' ? '1M' : returnPeriod === 'ONE_YEAR' ? '12M' : 'Total'})</th><th scope="col">% carteira</th></tr>
          </thead>
          {breakdown.map(group => {
            const isExpanded = expanded.includes(group.key)
            return (
              <tbody key={group.key}>
                <tr className="asset-class-summary">
                  <th scope="row" className="asset-class-name-cell">
                    <button type="button" className="asset-class-toggle" aria-expanded={isExpanded} onClick={() => toggle(group.key)}>
                      <span aria-hidden="true">{isExpanded ? '⌄' : '›'}</span> {group.label}
                    </button>
                  </th>
                  <td>{group.count} {group.count === 1 ? 'ativo' : 'ativos'}</td>
                  <td colSpan={2}>—</td>
                  <td>{money(group.items.reduce((sum, p) => sum + p.totalCost, 0))}</td>
                  <td>{currency(group.value)}</td>
                  <td>{group.items.every(p => p.profitLoss !== null) ? money(group.items.reduce((sum, p) => sum + p.profitLoss!, 0)) : 'Indisponível'}</td>
                  {(() => {
                    const cost = group.items.reduce((sum, p) => sum + p.totalCost, 0)
                    const variation = variationFromCost(cost, group.value)
                    return <td title="Variação sobre custo; não inclui proventos recebidos." className={variation === null ? '' : variation >= 0 ? 'positive' : 'negative'}>{rate(variation)}</td>
                  })()}
                  {(() => { const value = historicalRate(group.key); return <td title={historicalHint(group.key)} className={value === null ? '' : value >= 0 ? 'positive' : 'negative'}>{loadingReturns ? 'Calculando...' : rate(value)}</td> })()}
                  <td><strong>{group.percent === null ? '—' : percent(group.percent)}</strong></td>
                </tr>
                {isExpanded && [...group.items].sort((a, b) => a.assetTicker.localeCompare(b.assetTicker, 'pt-BR', { sensitivity: 'base' })).map(position => {
                  const share = total !== null && total > 0 && position.currentValue !== null && position.valuationStatus !== 'UNAVAILABLE' ? position.currentValue / total * 100 : null
                  const gain = position.profitLoss
                  return (
                    <tr key={position.assetId} className="asset-class-position">
                      <th scope="row" className="asset-class-ticker">
                        <strong>{position.assetTicker}</strong>
                        {renderAssetDetails && (position.assetType === 'FIXED_INCOME' || position.assetType === 'TREASURE') && <div className="asset-class-contract">{renderAssetDetails(position)}</div>}
                      </th>
                      <td>{qty(position.quantity)}</td>
                      <td>{currency(position.averagePrice)}</td>
                      <td>{currency(position.currentPrice)}</td>
                      <td>{currency(position.totalCost)}</td>
                      <td>{currency(position.currentValue)}</td>
                      <td className={gain === null ? '' : gain >= 0 ? 'positive' : 'negative'}>{gain !== null && gain > 0 ? '+' : ''}{currency(gain)}</td>
                      <td title="Variação sobre custo; não inclui proventos recebidos." className={gain === null ? '' : gain >= 0 ? 'positive' : 'negative'}>{rate(position.profitabilityPercent)}</td>
                      <AssetHistoricalReturnCell portfolioId={portfolioId} assetId={position.assetId} period={returnPeriod} />
                      <td>{share === null ? '—' : percent(share)}</td>
                    </tr>
                  )
                })}
              </tbody>
            )
          })}
        </table>
      </div>
    </section>
  )
}
