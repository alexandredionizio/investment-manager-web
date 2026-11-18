import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketTicker } from './MarketTicker'
import { getMarketTicker, MARKET_TICKER_REFRESH_MS } from '../services/marketTickerService'

vi.mock('../services/marketTickerService', () => ({ getMarketTicker: vi.fn(), MARKET_TICKER_REFRESH_MS: 300_000 }))
const items = [
    { symbol: 'IBOV', kind: 'INDEX' as const, currency: null, price: 169757.39, changePercent: .27, quotedAt: null, source: 'BRAPI' },
    { symbol: 'PETR4', kind: 'STOCK' as const, currency: 'BRL' as const, price: 44.04, changePercent: -.05, quotedAt: null, source: 'BRAPI' },
    { symbol: 'EUR', kind: 'CURRENCY' as const, currency: 'BRL' as const, price: 6.12, changePercent: 0, quotedAt: null, source: 'BRAPI' },
]
beforeEach(() => {
    vi.mocked(getMarketTicker).mockReset().mockResolvedValue({ items, fetchedAt: '2026-11-17T12:00:00Z' })
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('MarketTicker', () => {
    it('formats BRL, index points and signed daily variations with an accessible single list', async () => {
        render(<MarketTicker />)
        const list = await screen.findByRole('list')
        expect(within(list).getByText('169.757,39')).toBeTruthy()
        expect(within(list).getByText(/44,04/).textContent).toContain('R$')
        expect(within(list).getByText(/\+0,27%/).className).toContain('--positive')
        expect(within(list).getByText(/-0,05%/).className).toContain('--negative')
        expect(within(list).getByText(/0,00%/).className).toContain('--neutral')
        expect(screen.getAllByRole('list')).toHaveLength(1)
        expect(document.querySelectorAll('.market-ticker__group')).toHaveLength(2)
    })
    it('lets the user pause and resume the continuous strip', async () => {
        render(<MarketTicker />)
        const pause = await screen.findByRole('button', { name: 'Pausar cotações' })
        fireEvent.click(pause)
        expect(screen.getByRole('region').className).toContain('market-ticker--paused')
        fireEvent.click(screen.getByRole('button', { name: 'Retomar cotações' }))
        expect(screen.getByRole('region').className).not.toContain('market-ticker--paused')
    })
    it('keeps available items and handles an empty response discreetly', async () => {
        vi.mocked(getMarketTicker).mockResolvedValue({ items: [items[1]], fetchedAt: '' })
        const view = render(<MarketTicker />)
        expect(within(await screen.findByRole('list')).getAllByRole('listitem')).toHaveLength(1)
        view.unmount()
        vi.mocked(getMarketTicker).mockResolvedValue({ items: [], fetchedAt: '' })
        render(<MarketTicker />)
        expect(await screen.findByText('Cotações temporariamente indisponíveis.')).toBeTruthy()
        expect(screen.queryByRole('button')).toBeNull()
    })
    it('does not expose technical failures', async () => {
        vi.mocked(getMarketTicker).mockRejectedValue(new Error('secret-provider-body'))
        render(<MarketTicker />)
        expect(await screen.findByText('Cotações temporariamente indisponíveis.')).toBeTruthy()
        expect(document.body.textContent).not.toContain('secret')
    })
    it('refreshes periodically, skips hidden tabs and stops on unmount', async () => {
        vi.useFakeTimers()
        const view = render(<MarketTicker />)
        await act(async () => {})
        expect(getMarketTicker).toHaveBeenCalledTimes(1)
        await act(async () => { await vi.advanceTimersByTimeAsync(MARKET_TICKER_REFRESH_MS) })
        expect(getMarketTicker).toHaveBeenCalledTimes(2)
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        fireEvent(document, new Event('visibilitychange'))
        await act(async () => { await vi.advanceTimersByTimeAsync(MARKET_TICKER_REFRESH_MS * 2) })
        expect(getMarketTicker).toHaveBeenCalledTimes(2)
        Object.defineProperty(document, 'hidden', { configurable: true, value: false })
        await act(async () => { fireEvent(document, new Event('visibilitychange')) })
        expect(getMarketTicker).toHaveBeenCalledTimes(3)
        view.unmount()
        await vi.advanceTimersByTimeAsync(MARKET_TICKER_REFRESH_MS)
        expect(getMarketTicker).toHaveBeenCalledTimes(3)
    })
})
