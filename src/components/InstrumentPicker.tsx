import { useEffect, useState } from 'react'
import axios from 'axios'
import { userFacingApiMessage } from '../utils/userFacingApiMessage'
import { findAllAssets } from '../services/assetService'
import { searchInstruments, findSaleOptions } from '../services/instrumentService'
import type { InstrumentCandidate, InstrumentSelection, SaleOption } from '../services/instrumentService'
import type { AssetResponse } from '../types/asset'
import type { TransactionType } from '../types/transaction'

function message(error: unknown) {
    return axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? userFacingApiMessage(error.response.data.message, 'Não foi possível consultar os instrumentos. Tente novamente.')
        : 'Não foi possível consultar os instrumentos. Tente novamente.'
}
interface Props { type: TransactionType; portfolioId: string; date: string; onChange: (value: InstrumentSelection | null) => void }
export default function InstrumentPicker({ type, portfolioId, date, onChange }: Props) {
    const [mode, setMode] = useState('B3')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [items, setItems] = useState<InstrumentCandidate[]>([])
    const [next, setNext] = useState(false)
    const [active, setActive] = useState(-1)
    const [chosen, setChosen] = useState('')
    const [sales, setSales] = useState<SaleOption[]>([])
    const [others, setOthers] = useState<AssetResponse[]>([])
    const [loading, setLoading] = useState(type === 'SELL' && Boolean(portfolioId && date))
    const [error, setError] = useState('')
    const [retry, setRetry] = useState(0)
    useEffect(() => {
        const abort = new AbortController()
        let current = true
        if (type !== 'BUY' || mode !== 'B3' || chosen || query.trim().length < 2) return
        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const result = await searchInstruments(query.trim(), page, abort.signal)
                if (current) { setItems(result.items); setNext(result.hasNextPage); setActive(-1) }
            } catch (failure) { if (current) setError(message(failure)) }
            finally { if (current) setLoading(false) }
        }, 300)
        return () => { current = false; clearTimeout(timer); abort.abort() }
    }, [query, page, type, mode, retry, chosen])
    useEffect(() => {
        let current = true
        const abort = new AbortController()
        if (type === 'SELL' && portfolioId && date) {
            findSaleOptions(Number(portfolioId), date, abort.signal)
                .then(result => { if (current) setSales(result) })
                .catch(failure => { if (current) setError(message(failure)) })
                .finally(() => { if (current) setLoading(false) })
        } else if (type === 'BUY' && mode === 'OTHER') {
            findAllAssets().then(result => { if (current) setOthers(result.filter(asset =>
                asset.type === 'FIXED_INCOME' || asset.type === 'TREASURE' ||
                (asset.type === 'CRYPTO' && ['BTC', 'ETH'].includes(asset.ticker.trim().toUpperCase())))) })
                .catch(failure => { if (current) setError(message(failure)) })
                .finally(() => { if (current) setLoading(false) })
        }
        return () => { current = false; abort.abort() }
    }, [type, portfolioId, date, mode, retry])
    function clear() { setChosen(''); onChange(null); setError(''); setLoading(false); setItems([]); setNext(false); setActive(-1) }
    function choose(item: InstrumentCandidate) {
        if (item.requiresReview) return

        setChosen(item.ticker)
        setLoading(false)
        setQuery(item.ticker)
        setItems([])
        setNext(false)
        setActive(-1)
        onChange({ ticker: item.ticker })
    }
    const selectedSale = sales.find(item => String(item.assetId) === chosen)
    return <div>
        {type === 'BUY' && <><label htmlFor="instrument-market">Classe da compra</label>
            <select id="instrument-market" value={mode} onChange={event => { clear(); setLoading(event.target.value === 'OTHER'); setMode(event.target.value) }}>
                <option value="B3">Ações, FIIs e ETFs B3</option>
                <option value="OTHER">Cripto, renda fixa e Tesouro reconhecidos</option>
            </select></>}
        {type === 'BUY' && mode === 'B3' ? <>
            <label htmlFor="instrument-query">Buscar ativo por ticker ou nome</label>
            <input id="instrument-query" role="combobox" aria-autocomplete="list" aria-expanded={items.length > 0}
                aria-controls="instrument-results" aria-activedescendant={active >= 0 ? 'instrument-option-' + active : undefined}
                autoComplete="off" maxLength={80} value={query}
                onChange={event => { clear(); setLoading(event.target.value.trim().length >= 2); setQuery(event.target.value); setPage(1) }}
                onKeyDown={event => {
                    if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setActive(index => (index + 1) % items.length) }
                    if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setActive(index => index <= 0 ? items.length - 1 : index - 1) }
                    if (event.key === 'Enter') { event.preventDefault(); if (active >= 0 && items[active]) choose(items[active]) }
                    if (event.key === 'Escape') { clear(); setQuery(''); setPage(1) }
                }} />
            <p>A pesquisa não cadastra ativos. O cadastro é confirmado junto com a compra.</p>
            {!chosen && items.length > 0 && (
                <ul id="instrument-results" role="listbox" aria-label="Resultados de instrumentos">
                {items.map((item, index) => <li key={item.ticker} id={'instrument-option-' + index} role="option"
                    aria-selected={chosen === item.ticker} aria-disabled={item.requiresReview}>
                    <button type="button" disabled={item.requiresReview} onClick={() => choose(item)}>
                        {item.ticker} — {item.name} ({item.type}) — {item.requiresReview ? 'Revisão necessária' : item.assetId ? 'Já reconhecido' : 'Catálogo B3'}
                    </button>
                </li>)}
            </ul>)}
            {chosen && <p role="status">Selecionado: {chosen}</p>}
            {!chosen && !loading && !error && query.trim().length >= 2 && !items.length && <p role="status">Nenhum instrumento elegível nesta página.</p>}
            {query.trim().length < 2 && <p>Digite pelo menos 2 caracteres.</p>}
            {!chosen && page > 1 && <button type="button" disabled={loading} onClick={() => { clear(); setPage(page - 1) }}>Página anterior</button>}
            {!chosen && next && <button type="button" disabled={loading} onClick={() => { clear(); setPage(page + 1) }}>Próxima página</button>}
        </> : <>
            <label htmlFor="instrument-select">{type === 'SELL' ? 'Posição para venda' : 'Ativo reconhecido'}</label>
            <select id="instrument-select" value={chosen} required disabled={loading || !!error}
                onChange={event => { setChosen(event.target.value); onChange(event.target.value ? { assetId: Number(event.target.value) } : null) }}>
                <option value="">Selecione um ativo</option>
                {type === 'SELL' ? sales.map(item => <option key={item.assetId} value={item.assetId}>
                    {item.ticker} — {item.name} — saldo na data: {item.quantityAtDate}
                </option>) : others.map(item => <option key={item.id} value={item.id}>{item.ticker} — {item.name}</option>)}
            </select>
            {type === 'SELL' ? <>
                {(!portfolioId || !date) && <p>Escolha a carteira e a data para consultar posições.</p>}
                {portfolioId && date && !loading && !error && !sales.length && <p>Nenhuma posição com saldo na data.</p>}
                {selectedSale && <p>Limite pela trajetória das transações: {selectedSale.chronologicalLimit}. O servidor também revalida concorrência e proventos ao confirmar.</p>}
            </> : <p>Estas classes usam suas próprias identificações e contratos. A descoberta B3 não cadastra cripto, renda fixa ou Tesouro.</p>}
        </>}
        {loading && <p role="status">Consultando instrumentos...</p>}
        {error && <div role="alert">{error} <button type="button" onClick={() => { clear(); setLoading(true); setRetry(retry + 1) }}>Tentar novamente</button></div>}
    </div>
}
