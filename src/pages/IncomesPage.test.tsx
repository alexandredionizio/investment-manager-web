import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AxiosResponse } from 'axios'
import api from '../services/api'
import IncomesPage from './IncomesPage'

const income = { id: 1, portfolioId: 1, assetId: 1, assetTicker: 'ITUB4', type: 'DIVIDEND',
    amountPerUnit: 0.5, quantity: 100, totalAmount: 50, baseDate: '2026-09-10', paymentDate: '2026-10-30', received: true }
let rows: unknown[]
beforeEach(() => {
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
        expect(within(table).getAllByText('Pagamento futuro')).toHaveLength(1)
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
    it('reports malformed payment status instead of calling it a future payment', async () => {
        rows = [{ ...income, received: undefined }]
        open()
        expect(await screen.findByText('Não foi possível carregar os dados.')).toBeTruthy()
        expect(screen.queryByRole('table')).toBeNull()
        expect(screen.queryByText('Pagamento futuro')).toBeNull()
    })
})
