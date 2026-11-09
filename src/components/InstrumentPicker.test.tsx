import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstrumentPicker from './InstrumentPicker'
import { searchInstruments, findSaleOptions } from '../services/instrumentService'
import { findAllAssets } from '../services/assetService'
vi.mock('../services/instrumentService', () => ({ searchInstruments: vi.fn(), findSaleOptions: vi.fn() }))
vi.mock('../services/assetService', () => ({ findAllAssets: vi.fn() }))
const item = { ticker: 'PETR4', name: 'Petrobras', type: 'STOCK' as const, exchange: 'B3', assetId: null, requiresReview: false }
const onChange = vi.fn()
function mount(props = {}) { return render(<InstrumentPicker type="BUY" portfolioId="1" date="2026-09-01" onChange={onChange} {...props} />) }
afterEach(() => { cleanup(); vi.useRealTimers() })
beforeEach(() => { vi.clearAllMocks(); vi.mocked(searchInstruments).mockResolvedValue({ items: [item], page: 1, hasNextPage: false }); vi.mocked(findSaleOptions).mockResolvedValue([]) })
describe('InstrumentPicker', () => {
    it('debounces the query and supports selecting an unregistered ticker by keyboard', async () => {
        vi.useFakeTimers(); mount()
        fireEvent.change(screen.getByRole('combobox', { name: /Buscar ativo/ }), { target: { value: 'PET' } })
        await act(async () => { await vi.advanceTimersByTimeAsync(200) })
        expect(searchInstruments).not.toHaveBeenCalled()
        fireEvent.change(screen.getByRole('combobox', { name: /Buscar ativo/ }), { target: { value: 'PETR' } })
        await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(searchInstruments).toHaveBeenCalledTimes(1)
        expect(searchInstruments).toHaveBeenCalledWith('PETR', 1, expect.any(AbortSignal))
        const input = screen.getByRole('combobox', { name: /Buscar ativo/ })
        fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' })
        expect(onChange).toHaveBeenLastCalledWith({ ticker: 'PETR4' })
        expect(screen.getByText('Selecionado: PETR4')).toBeTruthy()
        expect(screen.queryByText('Nenhum instrumento elegível nesta página.')).toBeNull()
        await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(searchInstruments).toHaveBeenCalledTimes(1)
        expect(screen.getByRole('combobox', { name: /Buscar ativo/ }).getAttribute('aria-expanded')).toBe('false')
        fireEvent.change(input, { target: { value: 'VALE' } })
        expect(onChange).toHaveBeenLastCalledWith(null)
    })
    it('ignores late responses and cancels the previous request', async () => {
        vi.useFakeTimers()
        let finish!: (result: { items: typeof item[]; page: number; hasNextPage: boolean }) => void
        vi.mocked(searchInstruments).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        mount(); const input = screen.getByRole('combobox', { name: /Buscar ativo/ })
        fireEvent.change(input, { target: { value: 'OLD' } }); await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        const signal = vi.mocked(searchInstruments).mock.calls[0][2]
        fireEvent.change(input, { target: { value: 'PETR' } }); await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        await act(async () => { finish({ items: [{ ...item, ticker: 'OLDT3' }], page: 1, hasNextPage: false }) })
        expect(signal?.aborted).toBe(true); expect(screen.queryByText(/OLDT3/)).toBeNull(); expect(screen.getByText(/Catálogo B3/)).toBeTruthy()
    })
    it('paginates and never enables ambiguous candidates', async () => {
        vi.useFakeTimers(); vi.mocked(searchInstruments).mockResolvedValueOnce({ items: [{ ...item, requiresReview: true }], page: 1, hasNextPage: true })
        mount(); fireEvent.change(screen.getByRole('combobox', { name: /Buscar ativo/ }), { target: { value: 'PETR' } })
        await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect((screen.getByRole('button', { name: /Revisão necessária/ }) as HTMLButtonElement).disabled).toBe(true)
        fireEvent.keyDown(screen.getByRole('combobox', { name: /Buscar ativo/ }), { key: 'ArrowDown' })
        fireEvent.keyDown(screen.getByRole('combobox', { name: /Buscar ativo/ }), { key: 'Enter' })
        expect(onChange).not.toHaveBeenCalledWith({ ticker: 'PETR4' })
        fireEvent.click(screen.getByText('Próxima página')); await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(searchInstruments).toHaveBeenLastCalledWith('PETR', 2, expect.any(AbortSignal))
    })
    it('shows catalog failures separately from empty results and supports retry', async () => {
        vi.useFakeTimers(); vi.mocked(searchInstruments).mockRejectedValueOnce(new Error('offline'))
        mount(); fireEvent.change(screen.getByRole('combobox', { name: /Buscar ativo/ }), { target: { value: 'PETR' } })
        await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(screen.getByRole('alert').textContent).toContain('Não foi possível')
        expect(screen.queryByText('Nenhum instrumento elegível nesta página.')).toBeNull()
        fireEvent.click(screen.getByText('Tentar novamente')); await act(async () => { await vi.advanceTimersByTimeAsync(300) })
        expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByText(/Catálogo B3/)).toBeTruthy()
    })
    it('lists historical holdings even when the later chronology reserves the balance', async () => {
        vi.mocked(findSaleOptions).mockResolvedValue([{ assetId: 7, ticker: 'OLDT3', name: 'Histórico', type: 'STOCK', quantityAtDate: 10, chronologicalLimit: 0 }])
        mount({ type: 'SELL' }); await waitFor(() => expect(screen.getByText(/OLDT3/)).toBeTruthy())
        expect(findSaleOptions).toHaveBeenCalledWith(1, '2026-09-01', expect.any(AbortSignal))
        fireEvent.change(screen.getByLabelText('Posição para venda'), { target: { value: '7' } })
        expect(onChange).toHaveBeenLastCalledWith({ assetId: 7 }); expect(screen.getByText(/Limite pela trajetória/).textContent).toContain(': 0.')
        expect(searchInstruments).not.toHaveBeenCalled()
    })
    it('does not fetch sale positions without a portfolio and date', () => {
        mount({ type: 'SELL', date: '' }); expect(findSaleOptions).not.toHaveBeenCalled(); expect(screen.getByText(/Escolha a carteira/)).toBeTruthy()
    })
    it('keeps other classes outside B3 discovery and excludes unsupported crypto purchases', async () => {
        vi.mocked(findAllAssets).mockResolvedValue([
            { id: 1, ticker: 'BTC', name: 'Bitcoin', type: 'CRYPTO', exchange: 'BINANCE', sector: '' },
            { id: 2, ticker: 'SOL', name: 'Solana', type: 'CRYPTO', exchange: 'BINANCE', sector: '' },
            { id: 3, ticker: 'PETR4', name: 'Petrobras', type: 'STOCK', exchange: 'B3', sector: '' },
        ])
        mount(); fireEvent.change(screen.getByLabelText('Classe da compra'), { target: { value: 'OTHER' } })
        await waitFor(() => expect(screen.getByText(/BTC — Bitcoin/)).toBeTruthy())
        expect(screen.queryByText(/Solana/)).toBeNull(); expect(screen.queryByText(/PETR4/)).toBeNull(); expect(searchInstruments).not.toHaveBeenCalled()
    })
})
