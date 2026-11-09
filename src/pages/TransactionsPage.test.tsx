import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import TransactionsPage from './TransactionsPage'
import AssetsPage from './AssetsPage'
import { findAllPortfolios } from '../services/portfolioService'
import { findAllBrokers } from '../services/brokerService'
import { findAllAssets } from '../services/assetService'
import { createTransaction, findTransactionsByPortfolio } from '../services/transactionService'
import { createPurchase, searchInstruments, findSaleOptions } from '../services/instrumentService'
vi.mock('../services/portfolioService', () => ({ findAllPortfolios: vi.fn() }))
vi.mock('../services/brokerService', () => ({ findAllBrokers: vi.fn() }))
vi.mock('../services/assetService', () => ({ findAllAssets: vi.fn() }))
vi.mock('../services/transactionService', () => ({ createTransaction: vi.fn(), findTransactionsByPortfolio: vi.fn() }))
vi.mock('../services/instrumentService', () => ({ createPurchase: vi.fn(), searchInstruments: vi.fn(), findSaleOptions: vi.fn() }))
afterEach(cleanup)
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findAllPortfolios).mockResolvedValue([{ id: 1, name: 'Principal', description: '', createdAt: '2026-09-01T00:00:00' }, { id: 2, name: 'Outra', description: '', createdAt: '2026-09-01T00:00:00' }])
    vi.mocked(findAllBrokers).mockResolvedValue([{ id: 1, name: 'Corretora teste' }])
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([])
    vi.mocked(searchInstruments).mockResolvedValue({ items: [{ ticker: 'PETR4', name: 'Petrobras', type: 'STOCK', exchange: 'B3', assetId: null, requiresReview: false }], page: 1, hasNextPage: false })
    vi.mocked(findSaleOptions).mockResolvedValue([{ assetId: 8, ticker: 'OLDT3', name: 'Histórico', type: 'STOCK', quantityAtDate: 10, chronologicalLimit: 10 }])
})
async function setup() {
    render(<MemoryRouter><TransactionsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Principal')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Selecione a carteira'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Corretora'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '25' } })
}
it('confirms a catalog purchase without an asset ID and clears the selected instrument after success', async () => {
    await setup()
    fireEvent.change(screen.getByLabelText('Buscar ativo por ticker ou nome'), { target: { value: 'PETR' } })
    fireEvent.click(await screen.findByRole('button', { name: /PETR4 — Petrobras/ }))
    fireEvent.click(screen.getByText('Registrar transação'))
    await waitFor(() => expect(createPurchase).toHaveBeenCalledWith({ portfolioId: 1, ticker: 'PETR4', brokerId: 1, quantity: 10, unitPrice: 25, transactionDate: '2026-09-01' }))
    expect(createTransaction).not.toHaveBeenCalled(); expect(findAllAssets).not.toHaveBeenCalled()
    await screen.findByText('Transação registrada com sucesso.')
    expect((screen.getByText('Registrar transação') as HTMLButtonElement).disabled).toBe(true)
})
it.each(['Data', 'Selecione a carteira', 'Tipo'])('clears the sale selection immediately when %s changes', async label => {
    await setup(); fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'SELL' } })
    await screen.findByText(/OLDT3 — Histórico/)
    fireEvent.change(screen.getByLabelText('Posição para venda'), { target: { value: '8' } })
    expect((screen.getByText('Registrar transação') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.change(screen.getByLabelText(label), { target: { value: label === 'Data' ? '2026-09-02' : label === 'Tipo' ? 'BUY' : '2' } })
    expect((screen.getByText('Registrar transação') as HTMLButtonElement).disabled).toBe(true)
    expect(createTransaction).not.toHaveBeenCalled()
    if (label !== 'Tipo') await waitFor(() => expect(findSaleOptions).toHaveBeenLastCalledWith(label === 'Selecione a carteira' ? 2 : 1, label === 'Data' ? '2026-09-02' : '2026-09-01', expect.any(AbortSignal)))
})
it('submits a sale with its internal position ID and refreshes available options', async () => {
    await setup(); fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'SELL' } })
    await screen.findByText(/OLDT3 — Histórico/); fireEvent.change(screen.getByLabelText('Posição para venda'), { target: { value: '8' } })
    fireEvent.click(screen.getByText('Registrar transação'))
    await waitFor(() => expect(createTransaction).toHaveBeenCalledWith({ portfolioId: 1, assetId: 8, brokerId: 1, type: 'SELL', quantity: 10, unitPrice: 25, transactionDate: '2026-09-01' }))
    await waitFor(() => expect(findSaleOptions).toHaveBeenCalledTimes(2)); expect(createPurchase).not.toHaveBeenCalled()
})
it('keeps Assets exclusively as consultation', async () => {
    vi.mocked(findAllAssets).mockResolvedValue([{ id: 1, ticker: 'OLDT3', name: 'Histórico', type: 'STOCK', sector: '', exchange: 'B3' }])
    const { container } = render(<MemoryRouter><AssetsPage /></MemoryRouter>)
    await screen.findByText('OLDT3'); expect(container.querySelector('form')).toBeNull()
    expect(screen.getByText(/A presença nesta lista não garante/)).toBeTruthy()
})
