import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getMarketTicker, MARKET_TICKER_REFRESH_MS } from '../services/marketTickerService'
import type { MarketTickerItem } from '../services/marketTickerService'
import './MarketTicker.css'

const number = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' })

function Quote({ item }: { item: MarketTickerItem }) {
    const direction = item.changePercent > 0 ? 'positive' : item.changePercent < 0 ? 'negative' : 'neutral'
    const date = item.quotedAt ? new Date(item.quotedAt) : null
    const title = `${item.kind === 'CURRENCY' ? `${item.symbol}/BRL · Compra · ` : ''}${date && !Number.isNaN(date.getTime()) ? `Cotação de ${date.toLocaleString('pt-BR')}` : 'Horário da cotação não informado'}`
    return <li className="market-ticker__item" title={title}>
        <strong>{item.symbol}</strong>
        <span className="market-ticker__price">{item.kind === 'INDEX' ? number.format(item.price) : money.format(item.price)}</span>
        <span className={`market-ticker__change market-ticker__change--${direction}`}>
            <span aria-hidden="true">{direction === 'positive' ? '↗' : direction === 'negative' ? '↘' : '–'} </span>
            {percent.format(item.changePercent)}%
        </span>
    </li>
}

export function MarketTicker() {
    const [items, setItems] = useState<MarketTickerItem[]>([])
    const [loading, setLoading] = useState(true)
    const [paused, setPaused] = useState(false)
    useEffect(() => {
        let active = true
        let busy = false
        let timer: ReturnType<typeof setTimeout>
        async function refresh() {
            if (busy || document.hidden) return
            busy = true
            let retryIn = MARKET_TICKER_REFRESH_MS
            clearTimeout(timer)
            try {
                const response = await getMarketTicker()
                if (!response.items.length) retryIn = 60_000
                if (active) setItems(response.items)
            } catch {
                retryIn = 60_000
                if (active) setItems([])
            } finally {
                busy = false
                if (active) {
                    setLoading(false)
                    timer = setTimeout(refresh, retryIn)
                }
            }
        }
        function visibilityChanged() {
            if (document.hidden) clearTimeout(timer)
            else void refresh()
        }
        void refresh()
        document.addEventListener('visibilitychange', visibilityChanged)
        return () => { active = false; clearTimeout(timer); document.removeEventListener('visibilitychange', visibilityChanged) }
    }, [])

    return <div className={`market-ticker${paused ? ' market-ticker--paused' : ''}`} role="region" aria-label="Cotações de mercado">
        <div className="market-ticker__label" title="Atualização periódica. Cotações podem ter atraso conforme a fonte.">
            <span className="market-ticker__dot" aria-hidden="true" /> Mercado
        </div>
        {items.length === 0 ? <p className="market-ticker__fallback" role="status">
            {loading ? 'Carregando cotações…' : 'Cotações temporariamente indisponíveis.'}
        </p> : <>
            <div className="market-ticker__viewport" tabIndex={0} aria-label="Preços e variações do dia; pause para rolar a lista">
                <div className="market-ticker__track" style={{ '--ticker-duration': `${Math.max(30, items.length * 6)}s` } as CSSProperties}>
                    <ul className="market-ticker__group">{items.map(item => <Quote key={item.symbol} item={item} />)}</ul>
                    <ul className="market-ticker__group market-ticker__copy" aria-hidden="true">{items.map(item => <Quote key={item.symbol} item={item} />)}</ul>
                </div>
            </div>
            <button type="button" className="market-ticker__toggle" onClick={() => setPaused(value => !value)}
                aria-label={paused ? 'Retomar cotações' : 'Pausar cotações'} aria-pressed={paused}
                title={paused ? 'Retomar movimento' : 'Pausar movimento'}>
                <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
            </button>
        </>}
    </div>
}
