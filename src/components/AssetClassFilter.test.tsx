import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AssetClassFilter, classBreakdown, variationFromCost } from './AssetClassFilter'
import type { PositionMarketResponse } from '../types/position'

// Garantir isolamento do DOM entre os cenarios no ambiente Vitest do projeto.
afterEach(() => cleanup())

const make = (assetId: number, assetTicker: string, assetType: PositionMarketResponse['assetType'], currentValue: number | null): PositionMarketResponse => ({
  assetId, assetTicker, assetType, currentValue,
  quantity: 10, averagePrice: 10, totalCost: 100,
  currentPrice: currentValue === null ? null : currentValue / 10,
  profitLoss: currentValue === null ? null : currentValue - 100,
  profitabilityPercent: currentValue === null ? null : currentValue - 100,
  valuationStatus: currentValue === null ? 'UNAVAILABLE' : 'AVAILABLE',
})
const positions = [make(1, 'PETR4', 'STOCK', 300), make(2, 'BBAS3', 'STOCK', 100), make(3, 'HGLG11', 'FII', 600)]

describe('IM-065: tabela única compartilhada de classes e posições', () => {
  it('calcula variação agregada por custo sem confundir com rentabilidade ponderada', () => {
    expect(variationFromCost(100, 115)).toBeCloseTo(15)
    expect(variationFromCost(100, 90)).toBeCloseTo(-10)
    expect(variationFromCost(0, 0)).toBeNull()
    expect(variationFromCost(100, null)).toBeNull()
  })
  it('exibe variação por classe e não inventa rentabilidade histórica sem uma carteira', () => {
    render(<AssetClassFilter positions={positions} />)
    const classRow = screen.getByRole('button', { name: /Ações/ }).closest('tr')!
    expect(classRow.textContent).toContain('+100,00%')
    expect(classRow.textContent).toContain('Indisponível')
  })

  it('resume valor e percentual sobre o patrimônio total', () => {
    expect(classBreakdown(positions).map(c => [c.label, c.count, c.value, c.percent])).toEqual([
      ['Ações', 2, 400, 40], ['FIIs', 1, 600, 60],
    ])
  })
  it('não inventa participação quando há posição sem avaliação', () => {
    expect(classBreakdown([...positions, make(4, 'BTC', 'CRYPTO', null)]).every(c => c.percent === null)).toBe(true)
  })
  it('apresenta uma linha por classe e linhas de ativos em ordem alfabética quando expandida', () => {
    render(<AssetClassFilter positions={positions} />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3) // cabeçalho + duas classes
    fireEvent.click(screen.getByRole('button', { name: /Ações/ }))
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(5)
    expect(rows.map(row => row.textContent).filter(text => text?.includes('BBAS3') || text?.includes('PETR4'))[0]).toContain('BBAS3')
    expect(rows.map(row => row.textContent).filter(text => text?.includes('BBAS3') || text?.includes('PETR4'))[1]).toContain('PETR4')
    expect(within(table).getByText('40,00%')).toBeTruthy()
    expect(rows.some(row => row.textContent?.includes('300,00'))).toBe(true)
    expect(rows.some(row => row.textContent?.includes('BBAS3') && row.textContent?.includes('Indisponível'))).toBe(true)
  })
  it('permite recolher classe e expandir todas preservando detalhes contratuais', () => {
    const rendaFixa = make(4, 'CDB-2029', 'FIXED_INCOME', 150)
    render(<AssetClassFilter positions={[...positions, rendaFixa]} renderAssetDetails={() => <button type="button">Editar contrato</button>} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todas' }))
    expect(screen.getByRole('button', { name: 'Editar contrato' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Renda fixa/ }))
    expect(screen.queryByRole('button', { name: 'Editar contrato' })).toBeNull()
  })
})
