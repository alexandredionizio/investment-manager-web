import api from './api'

export interface MarketTickerItem {
    symbol: string
    kind: 'STOCK' | 'INDEX' | 'CURRENCY'
    currency: 'BRL' | null
    price: number
    changePercent: number
    quotedAt: string | null
    source: string
}
export interface MarketTickerResponse { items: MarketTickerItem[]; fetchedAt: string }
export const MARKET_TICKER_REFRESH_MS = 5 * 60 * 1000

// Share the request through StrictMode mounts and quick navigation back to the Dashboard.
let snapshot: MarketTickerResponse | undefined
let expiresAt = 0
let pending: Promise<MarketTickerResponse> | undefined

export function getMarketTicker(): Promise<MarketTickerResponse> {
    if (snapshot && Date.now() < expiresAt) return Promise.resolve(snapshot)
    if (pending) return pending
    pending = api.get<MarketTickerResponse>('/market/ticker').then(({ data }) => {
        const items = Array.isArray(data?.items) ? data.items.filter(item =>
            item && typeof item.symbol === 'string' && ['STOCK', 'INDEX', 'CURRENCY'].includes(item.kind)
            && (item.kind === 'INDEX' || item.currency === 'BRL')
            && Number.isFinite(item.price) && item.price > 0 && Number.isFinite(item.changePercent)) : []
        snapshot = { items, fetchedAt: data?.fetchedAt }
        expiresAt = Date.now() + (items.length ? MARKET_TICKER_REFRESH_MS : 60_000)
        return snapshot
    }).finally(() => { pending = undefined })
    return pending
}
