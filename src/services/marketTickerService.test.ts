import { beforeEach, describe, expect, it, vi } from 'vitest'
const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./api', () => ({ default: { get } }))
const item = { symbol: 'PETR4', kind: 'STOCK', currency: 'BRL', price: 44.04, changePercent: 0, quotedAt: null, source: 'BRAPI' }
beforeEach(() => { vi.resetModules(); get.mockReset() })

describe('marketTickerService', () => {
    it('deduplicates in-flight requests and reuses the snapshot on navigation', async () => {
        get.mockResolvedValue({ data: { items: [item], fetchedAt: '2026-11-17T12:00:00Z' } })
        const { getMarketTicker } = await import('./marketTickerService')
        const first = getMarketTicker()
        expect(getMarketTicker()).toBe(first)
        await first
        await getMarketTicker()
        expect(get).toHaveBeenCalledTimes(1)
        expect(get).toHaveBeenCalledWith('/market/ticker')
    })
    it('keeps a legitimate zero change and drops missing prices, changes and incompatible currencies', async () => {
        get.mockResolvedValue({ data: { items: [item, { ...item, price: null }, { ...item, changePercent: null }, { ...item, currency: 'USD' }] } })
        const { getMarketTicker } = await import('./marketTickerService')
        expect((await getMarketTicker()).items).toEqual([item])
    })
    it('releases a failed request so that the next refresh can recover', async () => {
        get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { items: [item] } })
        const { getMarketTicker } = await import('./marketTickerService')
        await expect(getMarketTicker()).rejects.toThrow('offline')
        expect((await getMarketTicker()).items).toEqual([item])
        expect(get).toHaveBeenCalledTimes(2)
    })
})
