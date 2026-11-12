import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AxiosResponse } from 'axios'
import api from '../services/api'
import IncomesPage from './IncomesPage'
import { downloadCsv } from '../utils/csvExport'
import { findExpectedIncomesByPortfolio } from '../services/expectedIncomeQueryService'
vi.mock('../utils/csvExport', () => ({ downloadCsv: vi.fn() }))
vi.mock('../services/expectedIncomeQueryService', () => ({ findExpectedIncomesByPortfolio: vi.fn() }))

const income = { id: 1, portfolioId: 1, assetId: 1, assetTicker: 'ITUB4', type: 'DIVIDEND',
    amountPerUnit: 0.5, quantity: 100, totalAmount: 50, baseDate: '2026-09-10', paymentDate: '2026-10-30', received: true }
let rows: unknown[]
beforeEach(() => {
    vi.mocked(findExpectedIncomesByPortfolio).mockResolvedValue([])
    rows = [income, { ...income, id: 2, paymentDate: '2026-10-31' },
        { ...income, id: 3, received: false, paymentDate: '2026-11-01' }]
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({ data: url === '/incomes' ? rows : [] }) as AxiosResponse)
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const open = () => render(<MemoryRouter><IncomesPage /></MemoryRouter>)

describe('Income payment presentation', () => {
    it('keeps future income registered while clearly distinguishing received payments', async () => {
        open()
        const table = await screen.findByRole('table')
        expect(within(table).getByRole('columnheader', { name: 'Situação' })).toBeTruthy()
        expect(within(table).getAllByText('Recebido')).toHaveLength(2)
        expect(within(table).getAllByText('Previsto')).toHaveLength(1)
        expect(within(table).getAllByRole('row')).toHaveLength(4)
        expect(within(table).getAllByRole('row').slice(1).every(row => within(row).getAllByRole('cell').length === 8)).toBe(true)
    })
    it('shows an em dash for B3 received income without base date and preserves existing dates and amounts', async () => {
        rows = [
            { ...income, id: 10, assetTicker: 'HGLG11', baseDate: null, paymentDate: '2026-10-15', totalAmount: 59.67 },
            { ...income, id: 11, assetTicker: 'KNRI11', baseDate: '2026-09-30', paymentDate: '2026-10-15', totalAmount: 49.50 },
        ]
        open()
        const table = await screen.findByRole('table')
        const allRows = within(table).getAllByRole('row')
        const imported = within(allRows[1])
        expect(imported.getByText('—').getAttribute('title')).toBe('Não informada pela B3')
        expect(imported.getByText('15/10/2026')).toBeTruthy()
        expect(imported.getByText(/R\$\s*59,67/)).toBeTruthy()
        const withBaseDate = within(allRows[2])
        expect(withBaseDate.getByText('30/09/2026')).toBeTruthy()
        expect(withBaseDate.getByText('15/10/2026')).toBeTruthy()
        expect(withBaseDate.getByText(/R\$\s*49,50/)).toBeTruthy()
    })
    it('filters received and expected B3 records without turning them into credits', async () => {
        vi.mocked(findExpectedIncomesByPortfolio).mockResolvedValue([{
            id: 8, portfolioId: 1, assetId: 2, assetTicker: 'HGLG11',
            type: 'FII_INCOME', expectedPaymentDate: '2026-11-16', quantity: 54,
            expectedNetAmount: 63.18, institution: 'XP',
        }])
        // O teste usa uma carteira cadastrada para carregar previsões.
        vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({
            data: url === '/incomes' ? rows : url === '/portfolios' ? [{ id: 1, name: 'Teste' }] : [],
        }) as AxiosResponse)
        open()
        const filter = await screen.findByLabelText('Situação')
        await screen.findByText('HGLG11')
        fireEvent.change(filter, { target: { value: 'received' } })
        expect(screen.queryByText('HGLG11')).toBeNull()
        fireEvent.change(filter, { target: { value: 'expected' } })
        expect(screen.getByText('HGLG11')).toBeTruthy()
        expect(screen.getByText(/R\$\s*63,18/)).toBeTruthy()
    })
    it('reports malformed payment status instead of calling it a future payment', async () => {
        rows = [{ ...income, received: undefined }]
        open()
        expect(await screen.findByText('Não foi possível carregar os dados.')).toBeTruthy()
        expect(screen.queryByRole('table')).toBeNull()
        expect(screen.queryByText('Pagamento futuro')).toBeNull()
    })
    it('IM-032: does not show an already registered income twice as B3 expected', async () => {
        rows = [{ ...income, paymentDate: '2026-11-16', received: false }]
        vi.mocked(findExpectedIncomesByPortfolio).mockResolvedValue([{
            id: 8, portfolioId: 1, assetId: 1, assetTicker: 'ITUB4',
            type: 'DIVIDEND', expectedPaymentDate: '2026-11-16', quantity: 100,
            expectedNetAmount: 50, institution: 'XP',
        }])
        vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({
            data: url === '/incomes' ? rows : url === '/portfolios' ? [{ id: 1, name: 'Teste' }] : [],
        }) as AxiosResponse)
        open()
        const table = await screen.findByRole('table')
        expect(within(table).getAllByRole('row')).toHaveLength(2)
        expect(within(table).getAllByText('ITUB4')).toHaveLength(1)
    })
    it('IM-032: retains different B3 events instead of removing by ticker alone', async () => {
        rows = [{ ...income, paymentDate: '2026-11-16', received: false }]
        vi.mocked(findExpectedIncomesByPortfolio).mockResolvedValue([{
            id: 9, portfolioId: 1, assetId: 1, assetTicker: 'ITUB4',
            type: 'DIVIDEND', expectedPaymentDate: '2026-11-17', quantity: 100,
            expectedNetAmount: 50, institution: 'XP',
        }])
        vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({
            data: url === '/incomes' ? rows : url === '/portfolios' ? [{ id: 1, name: 'Teste' }] : [],
        }) as AxiosResponse)
        open()
        const table = await screen.findByRole('table')
        expect(within(table).getAllByRole('row')).toHaveLength(3)
    })
})

it('IM-035: exporta apenas proventos recebidos conforme filtro, sem identificadores internos', async () => {
    rows = [
        { ...income, id: 1, portfolioId: 1, paymentDate: '2026-10-30', received: true },
        { ...income, id: 2, portfolioId: 2, paymentDate: '2026-10-31', received: true },
        { ...income, id: 3, portfolioId: 1, paymentDate: '2026-11-16', received: false },
    ]
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => ({
        data: url === '/incomes' ? rows : url === '/portfolios'
            ? [{ id: 1, name: 'Principal' }, { id: 2, name: 'Outra' }] : [],
    }) as AxiosResponse)
    open()
    const exportButton = await screen.findByRole('button', { name: 'Exportar proventos (CSV)' })
    await screen.findByRole('table')
    fireEvent.change(screen.getByLabelText('Carteira do histórico'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'received' } })
    fireEvent.click(exportButton)
    expect(downloadCsv).toHaveBeenCalledTimes(1)
    const [name, headers, exported] = vi.mocked(downloadCsv).mock.calls[0]
    expect(name).toMatch(/^proventos-1-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(headers).toEqual(['Data-base', 'Pagamento', 'Situação', 'Ativo', 'Tipo', 'Quantidade', 'Valor por unidade', 'Valor total', 'Origem'])
    expect(exported).toHaveLength(1)
    expect(exported[0]).toEqual(['2026-09-10', '2026-10-30', 'Recebido', 'ITUB4', 'Dividendo', '100', '0,50000000', '50,00', 'Provento cadastrado'])
})
