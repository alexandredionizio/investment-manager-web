import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AssetClassFilter } from './AssetClassFilter'
import { findReturnsByClass, findReturnsByAsset } from '../services/classReturnService'
import type { PositionMarketResponse } from '../types/position'

vi.mock('../services/classReturnService', () => ({
  findReturnsByClass: vi.fn().mockResolvedValue([]),
  findReturnsByAsset: vi.fn().mockResolvedValue({
    assetId: 1, status: 'UNAVAILABLE', totalReturn: null, startDate: null, endDate: null, reason: 'Histórico insuficiente',
  }),
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

const positions: PositionMarketResponse[] = [{
  assetId: 1, assetTicker: 'PETR4', assetType: 'STOCK', quantity: 10,
  averagePrice: 10, totalCost: 100, currentPrice: 12, currentValue: 120,
  profitLoss: 20, profitabilityPercent: 20, valuationStatus: 'AVAILABLE',
}]

describe('IM-065: periodo padrao Total e filtros sem alterar variacao', () => {
  it('inicia em Total e consulta o backend por classe e ativo no periodo ALL', async () => {
    render(<AssetClassFilter positions={positions} portfolioId={7} />)
    const selector = screen.getByRole('combobox', { name: 'Rentabilidade' }) as HTMLSelectElement
    expect(selector.value).toBe('ALL')
    expect(screen.getByRole('columnheader', { name: 'Rentabilidade (Total)' })).toBeTruthy()
    await waitFor(() => expect(findReturnsByClass).toHaveBeenCalledWith(7, 'ALL'))
    fireEvent.click(screen.getByRole('button', { name: /Ações/ }))
    await waitFor(() => expect(findReturnsByAsset).toHaveBeenCalledWith(7, 1, 'ALL'))
  })

  it('troca para 12M e 1M na consulta da classe e do ativo, preservando variacao', async () => {
    render(<AssetClassFilter positions={positions} portfolioId={7} />)
    fireEvent.click(screen.getByRole('button', { name: /Ações/ }))
    const selector = screen.getByRole('combobox', { name: 'Rentabilidade' })
    const tickerRow = screen.getByText('PETR4').closest('tr')!
    expect(tickerRow.textContent).toContain('+20,00%')

    fireEvent.change(selector, { target: { value: 'ONE_YEAR' } })
    await waitFor(() => expect(findReturnsByClass).toHaveBeenCalledWith(7, 'ONE_YEAR'))
    await waitFor(() => expect(findReturnsByAsset).toHaveBeenCalledWith(7, 1, 'ONE_YEAR'))
    expect(screen.getByRole('columnheader', { name: 'Rentabilidade (12M)' })).toBeTruthy()
    expect(tickerRow.textContent).toContain('+20,00%')

    fireEvent.change(selector, { target: { value: 'ONE_MONTH' } })
    await waitFor(() => expect(findReturnsByClass).toHaveBeenCalledWith(7, 'ONE_MONTH'))
    await waitFor(() => expect(findReturnsByAsset).toHaveBeenCalledWith(7, 1, 'ONE_MONTH'))
    expect(screen.getByRole('columnheader', { name: 'Rentabilidade (1M)' })).toBeTruthy()
    expect(tickerRow.textContent).toContain('+20,00%')
  })
})
