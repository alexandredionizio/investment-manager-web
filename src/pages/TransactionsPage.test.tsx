import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import TransactionsPage from './TransactionsPage'
import AssetsPage from './AssetsPage'
import { downloadCsv } from '../utils/csvExport'
import { findAllPortfolios } from '../services/portfolioService'
import { findAllBrokers } from '../services/brokerService'
import { findAllAssets, findAssetIdentifiers } from '../services/assetService'
import { createTransaction, deleteManualTransaction, findTransactionsByPortfolio, findB3LinkedTransactions, findB3Reversals, reverseB3Transaction } from '../services/transactionService'
import { createPurchase, searchInstruments, findSaleOptions } from '../services/instrumentService'
vi.mock('../utils/csvExport', () => ({ downloadCsv: vi.fn() }))
vi.mock('../services/portfolioService', () => ({ findAllPortfolios: vi.fn() }))
vi.mock('../services/brokerService', () => ({ findAllBrokers: vi.fn() }))
vi.mock('../services/assetService', () => ({ findAllAssets: vi.fn(), findAssetIdentifiers: vi.fn() }))
vi.mock('../services/transactionService', () => ({ createTransaction: vi.fn(), deleteManualTransaction: vi.fn(), findTransactionsByPortfolio: vi.fn(), findB3LinkedTransactions: vi.fn(), findB3Reversals: vi.fn(), reverseB3Transaction: vi.fn() }))
vi.mock('../services/instrumentService', () => ({ createPurchase: vi.fn(), searchInstruments: vi.fn(), findSaleOptions: vi.fn() }))
afterEach(cleanup)
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findAllPortfolios).mockResolvedValue([{ id: 1, name: 'Principal', description: '', createdAt: '2026-09-01T00:00:00' }, { id: 2, name: 'Outra', description: '', createdAt: '2026-09-01T00:00:00' }])
    vi.mocked(findAllBrokers).mockResolvedValue([{ id: 1, name: 'Corretora teste' }])
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([])
    vi.mocked(findB3LinkedTransactions).mockResolvedValue([])
    vi.mocked(findB3Reversals).mockResolvedValue([])
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
    await waitFor(() => expect(searchInstruments).toHaveBeenCalled(), { timeout: 10000 })
    fireEvent.click(await screen.findByRole('button', { name: /PETR4 — Petrobras/ }, { timeout: 10000 }))
    fireEvent.click(screen.getByText('Registrar transação'))
    await waitFor(() => expect(createPurchase).toHaveBeenCalledWith({ portfolioId: 1, ticker: 'PETR4', brokerId: 1, quantity: 10, unitPrice: 25, transactionDate: '2026-09-01' }))
    expect(createTransaction).not.toHaveBeenCalled(); expect(findAllAssets).not.toHaveBeenCalled()
    await screen.findByText('Transação registrada com sucesso.')
    expect((screen.getByText('Registrar transação') as HTMLButtonElement).disabled).toBe(true)
}, 15000)
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

it('IM-050: consulta aliases e ISIN confirmados sem permitir editar ativos históricos', async () => {
    vi.mocked(findAllAssets).mockResolvedValue([{ id: 1, ticker: 'BHIA3', name: 'Casas Bahia', type: 'STOCK', sector: '', exchange: 'B3' }])
    vi.mocked(findAssetIdentifiers).mockResolvedValue([
        { kind: 'TICKER', value: 'VIIA3', exchange: 'B3', source: 'BRAPI', observedName: 'Casas Bahia', effectiveDate: '2023-10-01' },
        { kind: 'ISIN', value: 'BRBHIAACNOR8', exchange: 'B3', source: 'BRAPI', observedName: 'Casas Bahia', effectiveDate: null },
    ])
    const { container } = render(<MemoryRouter><AssetsPage /></MemoryRouter>)
    await screen.findByText('BHIA3')
    expect(findAssetIdentifiers).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico' }))
    await screen.findByText(/Ticker: VIIA3/)
    expect(screen.getByText(/ISIN: BRBHIAACNOR8/)).toBeTruthy()
    expect(findAssetIdentifiers).toHaveBeenCalledWith(1)
    expect(container.querySelector('form')).toBeNull()
})

it('removes a manual transaction after confirmation and refreshes the list', async () => {
    const oldConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    try {
        vi.mocked(findTransactionsByPortfolio)
            .mockResolvedValueOnce([{ id: 91, portfolioId: 1, assetId: 5, assetTicker: 'PETR4', brokerId: 1,
                brokerName: 'Corretora teste', type: 'BUY', quantity: 10, unitPrice: 25, transactionDate: '2026-09-01' }])
            .mockResolvedValue([])
        vi.mocked(deleteManualTransaction).mockResolvedValue(undefined)
        await setup()
        fireEvent.click(await screen.findByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' }))
        await waitFor(() => expect(deleteManualTransaction).toHaveBeenCalledWith(91))
        await screen.findByText('Transação excluída com sucesso.')
        await screen.findByText('Nenhuma transação encontrada.')
    } finally {
        window.confirm = oldConfirm
    }
})

it('estorna B3 com motivo e mantém auditoria na tela após confirmação reforçada', async () => {
    const oldConfirm = window.confirm
    const oldPrompt = window.prompt
    window.confirm = vi.fn(() => true)
    window.prompt = vi.fn(() => 'Negociação lançada incorretamente na carteira')
    try {
        vi.mocked(findTransactionsByPortfolio).mockResolvedValueOnce([{
            id: 101, portfolioId: 1, assetId: 5, assetTicker: 'PETR4', brokerId: 1,
            brokerName: 'Corretora teste', type: 'BUY', quantity: 10, unitPrice: 25,
            transactionDate: '2026-09-01',
        }]).mockResolvedValue([])
        vi.mocked(findB3LinkedTransactions).mockResolvedValueOnce([101]).mockResolvedValue([])
        vi.mocked(findB3Reversals).mockResolvedValueOnce([]).mockResolvedValue([{
            transactionId: 101, batchId: 2, excelRow: 3, reason: 'Negociação lançada incorretamente na carteira',
            reversedAt: '2026-11-10T12:00:00Z',
        }])
        vi.mocked(reverseB3Transaction).mockResolvedValue({
            transactionId: 101, batchId: 2, excelRow: 3, reason: 'Negociação lançada incorretamente na carteira',
            reversedAt: '2026-11-10T12:00:00Z',
        })
        await setup()
        expect(screen.queryByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' })).toBeNull()
        fireEvent.click(await screen.findByRole('button', { name: 'Estornar compra de 10 PETR4 de 01/09/2026' }))
        await waitFor(() => expect(reverseB3Transaction).toHaveBeenCalledWith(101, 'Negociação lançada incorretamente na carteira'))
        expect(vi.mocked(window.prompt)).toHaveBeenCalledWith(expect.stringContaining('compra de 10 PETR4 em 01/09/2026'), '')
        expect(vi.mocked(window.confirm)).toHaveBeenCalledWith(expect.stringContaining('compra de 10 PETR4 de 01/09/2026'))
        await screen.findByText(/Operação B3 estornada com registro de auditoria/)
        await screen.findByText(/importação B3, linha 3/)
    } finally {
        window.confirm = oldConfirm
        window.prompt = oldPrompt
    }
})

it('IM-035: exporta apenas as transações da carteira consultada, sem IDs internos', async () => {
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([{
        id: 99, portfolioId: 1, assetId: 5, assetTicker: 'PETR4',
        brokerId: 1, brokerName: 'Corretora teste', type: 'BUY',
        quantity: 10, unitPrice: 25, transactionDate: '2026-09-01',
    }])
    await setup()
    const exportButton = await screen.findByRole('button', { name: 'Exportar transações (CSV)' })
    await waitFor(() => expect((exportButton as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(exportButton)
    expect(downloadCsv).toHaveBeenCalledTimes(1)
    expect(downloadCsv).toHaveBeenCalledWith(
        expect.stringMatching(/^transacoes-principal-\d{4}-\d{2}-\d{2}\.csv$/),
        ['Data', 'Ativo', 'Tipo', 'Corretora', 'Quantidade', 'Preço unitário', 'Valor bruto'],
        [['2026-09-01', 'PETR4', 'Compra', 'Corretora teste', '10', '25', '250,00']],
    )
})

it('IM-035: impede exportação de histórico vazio', async () => {
    await setup()
    const exportButton = await screen.findByRole('button', { name: 'Exportar transações (CSV)' })
    expect((exportButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(exportButton)
    expect(downloadCsv).not.toHaveBeenCalled()
})


it('IM-035: cancelamento de exclusão manual não modifica os lançamentos', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([{
        id: 191, portfolioId: 1, assetId: 5, assetTicker: 'PETR4', brokerId: 1,
        brokerName: 'Corretora teste', type: 'BUY', quantity: 10,
        unitPrice: 25, transactionDate: '2026-09-01',
    }])
    await setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' }))
    expect(confirm).toHaveBeenCalled()
    expect(deleteManualTransaction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' })).toBeTruthy()
    confirm.mockRestore()
})

it('IM-035: falha ao excluir preserva o registro e mostra indisponibilidade', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([{
        id: 192, portfolioId: 1, assetId: 5, assetTicker: 'PETR4', brokerId: 1,
        brokerName: 'Corretora teste', type: 'BUY', quantity: 10,
        unitPrice: 25, transactionDate: '2026-09-01',
    }])
    vi.mocked(deleteManualTransaction).mockRejectedValue(new Error('Falha de conexão'))
    await setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' }))
    expect(await screen.findByText('Não foi possível excluir a transação.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Excluir compra de 10 PETR4 de 01/09/2026' })).toBeTruthy()
    expect(findTransactionsByPortfolio).toHaveBeenCalledTimes(1)
    vi.mocked(window.confirm).mockRestore()
})

it('IM-035: estorno da B3 exige motivo suficiente antes de chamar o backend', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('curto')
    const confirm = vi.spyOn(window, 'confirm')
    vi.mocked(findTransactionsByPortfolio).mockResolvedValue([{
        id: 193, portfolioId: 1, assetId: 5, assetTicker: 'PETR4', brokerId: 1,
        brokerName: 'Corretora teste', type: 'BUY', quantity: 10,
        unitPrice: 25, transactionDate: '2026-09-01',
    }])
    vi.mocked(findB3LinkedTransactions).mockResolvedValue([193])
    await setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Estornar compra de 10 PETR4 de 01/09/2026' }))
    expect(prompt).toHaveBeenCalled()
    expect(await screen.findByText('Informe um motivo de 10 a 500 caracteres para estornar.')).toBeTruthy()
    expect(confirm).not.toHaveBeenCalled()
    expect(reverseB3Transaction).not.toHaveBeenCalled()
    prompt.mockRestore()
    confirm.mockRestore()
})
