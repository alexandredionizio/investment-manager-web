import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortfolio, renamePortfolio } from '../services/portfolioService'
import { getSelectedPortfolioId, saveSelectedPortfolioId } from '../services/selectedPortfolio'

import {
    CartesianGrid,
    Line,
    LineChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import Header from '../components/Header'
import ValuationDetails from '../components/ValuationDetails'
import { summarizeValuations, benchmarkAvailability } from '../services/valuation'

import {
    findDashboardPortfolios, findDashboardHistory as findPortfolioHistory,
    findDashboardComparison as findBenchmarkComparison, loadDashboardData,
    dashboardErrorMessage, dashboardSectionLabels, dashboardSectionKeys,
} from '../services/dashboardService'
import type { DashboardData, DashboardIssues } from '../services/dashboardService'

import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse } from '../types/position'
import type { IncomeResponse } from '../types/income'
import type { RealizedResultResponse } from '../types/realizedResult'
import type {
    PortfolioHistoryPeriod,
    PortfolioHistoryResponse,
} from '../types/portfolioHistory'
import type { PortfolioReturnResponse } from '../types/portfolioReturn'
import type { BenchmarkComparisonPointResponse } from '../types/benchmarkComparison'

const historyPeriods: {
    value: PortfolioHistoryPeriod
    label: string
}[] = [
    { value: 'ONE_MONTH', label: '1M' },
    { value: 'THREE_MONTHS', label: '3M' },
    { value: 'SIX_MONTHS', label: '6M' },
    { value: 'ONE_YEAR', label: '1A' },
    { value: 'TWO_YEARS', label: '2A' },
    { value: 'FIVE_YEARS', label: '5A' },
    { value: 'TEN_YEARS', label: '10A' },
    { value: 'ALL', label: 'Tudo' },
    { value: 'CUSTOM', label: 'Personalizado' },
]

const monthLabels = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function DashboardPage() {

    const [portfolios, setPortfolios] =
        useState<PortfolioResponse[]>([])

    const [selectedPortfolioId, setSelectedPortfolioId] =
        useState<number | null>(null)

    const [positions, setPositions] =
        useState<PositionMarketResponse[]>([])

    const [incomes, setIncomes] =
        useState<IncomeResponse[]>([])

    const [realizedResults, setRealizedResults] =
        useState<RealizedResultResponse[]>([])

    const [portfolioHistory, setPortfolioHistory] =
        useState<PortfolioHistoryResponse | null>(null)

    const [benchmarkComparison, setBenchmarkComparison] =
        useState<BenchmarkComparisonPointResponse[]>([])

    const [totalPortfolioReturns, setTotalPortfolioReturns] =
        useState<PortfolioReturnResponse | null>(null)

    const [lastTwelveMonthsReturns, setLastTwelveMonthsReturns] =
        useState<PortfolioReturnResponse | null>(null)

    const [lastMonthReturns, setLastMonthReturns] =
        useState<PortfolioReturnResponse | null>(null)

    const [historyPeriod, setHistoryPeriod] =
        useState<PortfolioHistoryPeriod>('ONE_MONTH')

    const [returnPeriod, setReturnPeriod] =
        useState<PortfolioHistoryPeriod>('ONE_MONTH')

    const [customStartDate, setCustomStartDate] =
        useState('')

    const [customEndDate, setCustomEndDate] =
        useState('')

    const [returnCustomStartDate, setReturnCustomStartDate] =
        useState('')

    const [returnCustomEndDate, setReturnCustomEndDate] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [historyLoading, setHistoryLoading] =
        useState(false)

    const [returnLoading, setReturnLoading] =
        useState(false)

    const [error, setError] =
        useState('')

    const [issues, setIssues] = useState<DashboardIssues>({})
    const [emptyPortfolio, setEmptyPortfolio] = useState<boolean | null>(null)
    const [dashboardReady, setDashboardReady] = useState(false)
    const [pendingSections, setPendingSections] = useState<Partial<Record<keyof DashboardData, boolean>>>({})
    const loadVersion = useRef(0)
    const [portfolioAction, setPortfolioAction] = useState<'create' | 'rename' | null>(null)
    const [portfolioMenuOpen, setPortfolioMenuOpen] = useState(false)
    const [portfolioActionsId, setPortfolioActionsId] = useState<number | null>(null)
    const [renameTargetId, setRenameTargetId] = useState<number | null>(null)
    const [portfolioName, setPortfolioName] = useState('')
    const [portfolioSaving, setPortfolioSaving] = useState(false)
    const [portfolioActionError, setPortfolioActionError] = useState('')
    const [portfolioNotice, setPortfolioNotice] = useState('')


    async function loadPortfolio(portfolioId: number,
        historySelection: Parameters<typeof loadDashboardData>[1],
        returnSelection: Parameters<typeof loadDashboardData>[2]) {
        const version = ++loadVersion.current
        setLoading(false)
        setDashboardReady(true)
        setError('')
        setIssues({})
        setPendingSections(Object.fromEntries(dashboardSectionKeys.map(key => [key, true])))
        setEmptyPortfolio(null)
        setSelectedPortfolioId(portfolioId)
        saveSelectedPortfolioId(portfolioId)
        setPositions([])
        setIncomes([])
        setRealizedResults([])
        setPortfolioHistory(null)
        setBenchmarkComparison([])
        setTotalPortfolioReturns(null)
        setLastTwelveMonthsReturns(null)
        setLastMonthReturns(null)
        try {
            await loadDashboardData(portfolioId, historySelection, returnSelection, data => {
                if (version !== loadVersion.current) return
                if (data.positions) setPositions(data.positions.data ?? [])
                if (data.incomes) setIncomes(data.incomes.data ?? [])
                if (data.realized) setRealizedResults(data.realized.data ?? [])
                if (data.history) setPortfolioHistory(data.history.data)
                if (data.comparison) setBenchmarkComparison(data.comparison.data ?? [])
                if (data.total) setTotalPortfolioReturns(data.total.data)
                if (data.year) setLastTwelveMonthsReturns(data.year.data)
                if (data.month) setLastMonthReturns(data.month.data)
                if (data.transactions) setEmptyPortfolio(data.transactions.data === null ? null : data.transactions.data.length === 0)
                setIssues(current => ({ ...current, ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.issue])) }))
                setPendingSections(current => ({ ...current, ...Object.fromEntries(Object.keys(data).map(key => [key, false])) }))
            })
        } catch (error) {
            if (version === loadVersion.current) {
                // Late updates from other requests must not restore data after an authorization failure.
                loadVersion.current++
                setError(dashboardErrorMessage(error))
                setDashboardReady(false)
            }
        }
    }

    useEffect(() => {
        let active = true
        async function loadDashboard() {
            try {
                const data = await findDashboardPortfolios()
                if (!active) return
                setPortfolios(data)
                if (data.length > 0) {
                    await loadPortfolio(data.find(p => p.id === getSelectedPortfolioId())?.id ?? data[0].id, { period: 'ONE_MONTH' }, { period: 'ONE_MONTH' })
                } else {
                    setLoading(false)
                }
            } catch (error) {
                if (active) {
                    setError(dashboardErrorMessage(error))
                    setLoading(false)
                }
            }
        }
        loadDashboard()
        return () => { active = false; loadVersion.current++ }
    }, [])

    async function handlePortfolioChange(portfolioId: number) {
        const nextHistoryPeriod = historyPeriod === 'CUSTOM' && (!customStartDate || !customEndDate) ? 'ONE_MONTH' : historyPeriod
        const nextReturnPeriod = returnPeriod === 'CUSTOM' && (!returnCustomStartDate || !returnCustomEndDate) ? 'ONE_MONTH' : returnPeriod
        setHistoryPeriod(nextHistoryPeriod)
        setReturnPeriod(nextReturnPeriod)
        await loadPortfolio(portfolioId,
            { period: nextHistoryPeriod, startDate: customStartDate, endDate: customEndDate },
            { period: nextReturnPeriod, startDate: returnCustomStartDate, endDate: returnCustomEndDate })
    }

    function startPortfolioAction(action: 'create' | 'rename', targetId?: number) {
        setRenameTargetId(action === 'rename' ? (targetId ?? selectedPortfolioId) : null)
        setPortfolioActionsId(null)
        setPortfolioAction(action)
        setPortfolioActionError('')
        setPortfolioNotice('')
        setPortfolioName(action === 'rename'
            ? portfolios.find(p => p.id === (targetId ?? selectedPortfolioId))?.name ?? '' : '')
    }

    async function submitPortfolioAction(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const name = portfolioName.trim()
        if (!name || name.length > 100 || !portfolioAction || portfolioSaving) return
        if (portfolioAction === 'rename' && renameTargetId === null) return
        setPortfolioSaving(true)
        setPortfolioActionError('')
        try {
            if (portfolioAction === 'create') {
                const created = await createPortfolio(name)
                setPortfolios(current => [...current, created])
                saveSelectedPortfolioId(created.id)
                setPortfolioNotice('Carteira criada e selecionada.')
                await handlePortfolioChange(created.id)
            } else {
                const updated = await renamePortfolio(renameTargetId!, name)
                setPortfolios(current => current.map(p => p.id === updated.id ? updated : p))
                setPortfolioNotice('Nome da carteira atualizado.')
            }
            setPortfolioAction(null)
            setPortfolioMenuOpen(false)
            setRenameTargetId(null)
            setPortfolioName('')
        } catch {
            setPortfolioActionError(portfolioAction === 'create'
                ? 'Não foi possível criar a carteira. Tente novamente.'
                : 'Não foi possível renomear a carteira. Tente novamente.')
        } finally {
            setPortfolioSaving(false)
        }
    }

    async function handleHistoryPeriodChange(
        period: PortfolioHistoryPeriod,
    ) {

        if (selectedPortfolioId === null) {
            return
        }

        if (period === 'CUSTOM') {

            setHistoryPeriod('CUSTOM')
            setError('')

            return
        }

        setHistoryPeriod(period)

        try {

            setHistoryLoading(true)
            setPortfolioHistory(null)
            setIssues(current => ({ ...current, history: null }))
            setError('')

            const historyData =
                await findPortfolioHistory(
                    selectedPortfolioId,
                    period,
                )

            setHistoryPeriod(period)
            setPortfolioHistory(historyData)

        } catch (error) {
            setIssues(current => ({ ...current, history: dashboardErrorMessage(error) }))
        } finally {

            setHistoryLoading(false)
        }
    }

    async function handleCustomHistorySubmit() {

        if (selectedPortfolioId === null) {
            return
        }

        if (!customStartDate || !customEndDate) {

            setError(
                'Informe a data inicial e a data final do período personalizado.',
            )

            return
        }

        if (customEndDate < customStartDate) {

            setError(
                'A data final não pode ser anterior à data inicial.',
            )

            return
        }

        try {

            setHistoryLoading(true)
            setPortfolioHistory(null)
            setIssues(current => ({ ...current, history: null }))
            setError('')

            const historyData =
                await findPortfolioHistory(
                    selectedPortfolioId,
                    'CUSTOM',
                    customStartDate,
                    customEndDate,
                )

            setPortfolioHistory(historyData)

        } catch (error) {
            setIssues(current => ({ ...current, history: dashboardErrorMessage(error) }))
        } finally {

            setHistoryLoading(false)
        }
    }

    async function handleReturnPeriodChange(
        period: PortfolioHistoryPeriod,
    ) {

        if (selectedPortfolioId === null) {
            return
        }

        if (period === 'CUSTOM') {
            setReturnPeriod('CUSTOM')
            setError('')
            return
        }

        setReturnPeriod(period)

        try {
            setReturnLoading(true)
            setBenchmarkComparison([])
            setIssues(current => ({ ...current, comparison: null }))
            setError('')

            const benchmarkComparisonData =
                await findBenchmarkComparison(
                    selectedPortfolioId,
                    period,
                )

            setReturnPeriod(period)
            setBenchmarkComparison(benchmarkComparisonData)

        } catch (error) {
            setIssues(current => ({ ...current, comparison: dashboardErrorMessage(error) }))
        } finally {
            setReturnLoading(false)
        }
    }

    async function handleCustomReturnSubmit() {

        if (selectedPortfolioId === null) {
            return
        }

        if (!returnCustomStartDate || !returnCustomEndDate) {
            setError(
                'Informe a data inicial e a data final do período personalizado.',
            )
            return
        }

        if (returnCustomEndDate < returnCustomStartDate) {
            setError(
                'A data final não pode ser anterior à data inicial.',
            )
            return
        }

        try {
            setReturnLoading(true)
            setBenchmarkComparison([])
            setIssues(current => ({ ...current, comparison: null }))
            setError('')

            const benchmarkComparisonData =
                await findBenchmarkComparison(
                    selectedPortfolioId,
                    'CUSTOM',
                    returnCustomStartDate,
                    returnCustomEndDate,
                )

            setBenchmarkComparison(benchmarkComparisonData)

        } catch (error) {
            setIssues(current => ({ ...current, comparison: dashboardErrorMessage(error) }))
        } finally {
            setReturnLoading(false)
        }
    }

    const totalWeightedReturn =
        totalPortfolioReturns?.totalReturn == null ? null : totalPortfolioReturns.totalReturn * 100

    const lastTwelveMonthsWeightedReturn =
        lastTwelveMonthsReturns?.totalReturn == null ? null : lastTwelveMonthsReturns.totalReturn * 100

    const lastMonthWeightedReturn =
        lastMonthReturns?.totalReturn == null ? null : lastMonthReturns.totalReturn * 100

    const monthlyReturnRows = (() => {

        if (!totalPortfolioReturns || totalPortfolioReturns.points.length === 0) {
            return []
        }

        const points = [...totalPortfolioReturns.points]
            .sort((a, b) => a.date.localeCompare(b.date))

        const years = new Map<
            number,
            {
                months: (number | null)[]
                annualFactor: number
                accumulatedFactor: number
            }
        >()

        let accumulatedFactor = 1

        for (const point of points) {

            const [yearText, monthText] = point.date.split('-')
            const year = Number(yearText)
            const monthIndex = Number(monthText) - 1
            const dailyFactor = 1 + point.dailyReturn

            if (!years.has(year)) {
                years.set(year, {
                    months: Array(12).fill(null),
                    annualFactor: 1,
                    accumulatedFactor,
                })
            }

            const yearData = years.get(year)!
            const currentMonthReturn = yearData.months[monthIndex]
            const currentMonthFactor =
                currentMonthReturn === null
                    ? 1
                    : 1 + currentMonthReturn

            yearData.months[monthIndex] =
                currentMonthFactor * dailyFactor - 1

            yearData.annualFactor *= dailyFactor
            accumulatedFactor *= dailyFactor
            yearData.accumulatedFactor = accumulatedFactor
        }

        return Array.from(years.entries())
            .map(([year, data]) => ({
                year,
                months: data.months,
                annualReturn: data.annualFactor - 1,
                accumulatedReturn: data.accumulatedFactor - 1,
            }))
            .sort((a, b) => b.year - a.year)
    })()

    const valuation = summarizeValuations(positions)
    const totalCurrentValue = valuation.value
    const totalCost = valuation.totalCost
    const totalProfitLoss = valuation.profit
    const profitabilityPercent = valuation.percent

    const totalIncomes =
        incomes.filter(income => income.received).reduce(
            (total, income) =>
                total + income.totalAmount,
            0,
        )

    const totalRealizedProfitLoss =
        realizedResults.reduce(
            (total, result) =>
                total + result.realizedProfitLoss,
            0,
        )

    function metricValue(key: keyof DashboardIssues, value: string) {
        return pendingSections[key] ? 'Carregando...' : issues[key] ? 'Indisponível' : value
    }

    function returnValue(key: keyof DashboardIssues, value: number | null) {
        return metricValue(key, value === null ? 'Sem dados suficientes' : (value >= 0 ? '+' : '') + formatPercentage(value) + '%')
    }

    function returnClass(value: number | null, key?: keyof DashboardIssues) {
        return value === null || (key && (issues[key] || pendingSections[key])) ? '' : value >= 0 ? 'positive' : 'negative'
    }

    function formatCurrency(value: number | null) {
        if (value === null) return 'Indisponível'

        return new Intl.NumberFormat(
            'pt-BR',
            {
                style: 'currency',
                currency: 'BRL',
            },
        ).format(value)
    }

    function formatCompactCurrency(value: number) {

        return new Intl.NumberFormat(
            'pt-BR',
            {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1,
            },
        ).format(value)
    }

    function formatNumber(value: number) {

        return new Intl.NumberFormat(
            'pt-BR',
            {
                maximumFractionDigits: 8,
            },
        ).format(value)
    }

    function formatPercentage(value: number | null) {
        if (value === null) return 'Indisponível'

        return new Intl.NumberFormat(
            'pt-BR',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        ).format(value)
    }

    function formatHistoryDate(value: string) {

        const [year, month, day] =
            value.split('-')

        return `${day}/${month}/${year}`
    }

    function formatHistoryAxisDate(value: string) {

        const [, month, day] =
            value.split('-')

        return `${day}/${month}`
    }

    if (loading && portfolios.length === 0) {

        return (
            <>
                <Header />

                <main className="dashboard-container">

                    <div className="page-heading">

                        <h1>Dashboard</h1>

                        <p>
                            Carregando seus investimentos...
                        </p>

                    </div>

                </main>
            </>
        )
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">

                <div className="dashboard-heading">

                    <div>

                        <h1>Dashboard</h1>

                        <p>
                            Visão geral dos seus investimentos.
                        </p>

                    </div>

                    <div className="dashboard-portfolio-selector" style={{ minWidth: 'min(320px, 90vw)', position: 'relative' }}>
                        <span id="dashboard-portfolio-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Carteira</span>
                        <button type="button" aria-label="Carteira" aria-expanded={portfolioMenuOpen}
                            aria-controls="dashboard-portfolio-menu" disabled={loading || portfolioSaving}
                            onClick={() => { setPortfolioMenuOpen(open => !open); setPortfolioActionsId(null); setPortfolioAction(null) }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', textAlign: 'left', padding: '0.75rem', border: '1px solid #bcc9db', borderRadius: '6px', background: '#fff', color: '#193a62', fontWeight: 600 }}>
                            <span style={{ overflowWrap: 'anywhere' }}>
                                {portfolios.find(p => p.id === selectedPortfolioId)?.name ?? 'Selecionar carteira'}
                            </span>
                            <span aria-hidden="true">▾</span>
                        </button>
                        {portfolioMenuOpen && (
                            <div id="dashboard-portfolio-menu" aria-label="Carteiras disponíveis"
                                style={{ position: 'absolute', top: '100%', right: 0, width: 'max(100%, 320px)', maxWidth: '90vw', background: 'white', border: '1px solid #d5dfeb', boxShadow: '0 8px 22px #1b345322', borderRadius: '8px', zIndex: 20, padding: '0.4rem', maxHeight: 'min(70vh, 440px)', overflowY: 'auto' }}>
                                {portfolios.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid #edf1f5' }}>
                                        <button type="button" aria-label={`Selecionar ${p.name}`}
                                            disabled={portfolioSaving}
                                            onClick={() => {
                                                setPortfolioMenuOpen(false)
                                                setPortfolioActionsId(null)
                                                setPortfolioNotice('')
                                                setPortfolioActionError('')
                                                void handlePortfolioChange(p.id)
                                            }}
                                            style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', border: 0, background: 'transparent', color: '#193a62', padding: '0.7rem', cursor: 'pointer' }}>
                                            <span aria-hidden="true" style={{ marginRight: '0.5rem' }}>{p.id === selectedPortfolioId ? '✓' : ' '}</span>{p.name}
                                        </button>
                                        <div style={{ position: 'relative' }}>
                                            <button type="button" aria-label={`Ações da carteira ${p.name}`}
                                                aria-expanded={portfolioActionsId === p.id}
                                                title="Ações da carteira" disabled={portfolioSaving}
                                                onClick={() => setPortfolioActionsId(portfolioActionsId === p.id ? null : p.id)}
                                                style={{ border: 0, background: 'transparent', color: '#193a62', fontSize: '1.5rem', padding: '0.25rem 0.65rem', cursor: 'pointer' }}>⋯</button>
                                            {portfolioActionsId === p.id && (
                                                <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 30, minWidth: '155px', padding: '0.3rem', border: '1px solid #d5dfeb', borderRadius: '6px', background: 'white', boxShadow: '0 6px 16px #1b345322' }}>
                                                    <button type="button" aria-label={`Renomear ${p.name}`}
                                                        onClick={() => startPortfolioAction('rename', p.id)}
                                                        style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', color: '#193a62', padding: '0.6rem', cursor: 'pointer' }}>Renomear</button>
                                                    <button type="button" disabled title="Disponível futuramente"
                                                        style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '0.6rem', opacity: 0.5 }}>Excluir (em breve)</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => startPortfolioAction('create')}
                                    style={{ width: '100%', border: 0, textAlign: 'left', background: 'transparent', padding: '0.8rem', fontWeight: 600, color: '#193a62', cursor: 'pointer' }}>+ Criar nova carteira</button>
                                {portfolioAction && (
                                    <form onSubmit={submitPortfolioAction} style={{ borderTop: '1px solid #d5dfeb', padding: '0.5rem' }}>
                                        <label htmlFor="dashboard-portfolio-name">
                                            {portfolioAction === 'create' ? 'Nome da nova carteira' : 'Novo nome da carteira'}
                                        </label>
                                        <input id="dashboard-portfolio-name" maxLength={100} required autoFocus
                                            value={portfolioName} disabled={portfolioSaving}
                                            onChange={event => setPortfolioName(event.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box' }} />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button type="submit" disabled={portfolioSaving || !portfolioName.trim()}>
                                                {portfolioAction === 'create' ? 'Criar e selecionar' : 'Salvar nome'}
                                            </button>
                                            <button type="button" disabled={portfolioSaving}
                                                onClick={() => { setPortfolioAction(null); setPortfolioActionError('') }}>Cancelar</button>
                                        </div>
                                    </form>
                                )}
                                {portfolioActionError && <p role="alert">{portfolioActionError}</p>}
                            </div>
                        )}
                        {portfolioNotice && <p role="status">{portfolioNotice}</p>}
                    </div>
                </div>

                {error && (

                    <div className="dashboard-error" role="alert">
                        {error}
                    </div>
                )}

                {loading ? <p role="status">Carregando dados da carteira...</p> : portfolios.length === 0 ? (error ? null : (

                    <section className="dashboard-card dashboard-return-section">

                        <p>
                            Nenhuma carteira encontrada.
                        </p>

                    </section>

                )) : !dashboardReady ? null : (
                    <>
                        {emptyPortfolio === true && <p role="status">Esta carteira ainda não possui transações. As métricas serão exibidas conforme houver dados.</p>}
                        {Object.entries(issues).filter(([, issue]) => issue).map(([key, issue]) => (
                            <p key={key} role="alert" className="dashboard-error">
                                {dashboardSectionLabels[key as keyof DashboardIssues]}: {issue}
                            </p>
                        ))}

                        <div className="dashboard-metrics">

                            <article className="dashboard-metric-card">

                                <span>
                                    {valuation.partial ? 'Patrimônio parcialmente avaliado' : 'Patrimônio atual'}
                                </span>

                                <strong>{metricValue('positions', formatCurrency(totalCurrentValue))}</strong>

                                <small>
                                    {valuation.partial ? 'Subtotal das posições avaliadas. Custo sem avaliação: ' + formatCurrency(valuation.missingCost) : 'Valor atual das posições'}
                                    {valuation.estimated && ' • Inclui remuneração contratual estimada.'}
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado não realizado
                                </span>

                                <strong className={returnClass(totalProfitLoss, 'positions')}>{metricValue('positions', (totalProfitLoss !== null && totalProfitLoss >= 0 ? '+' : '') + formatCurrency(totalProfitLoss))}</strong>

                                <small>
                                    {valuation.partial ? 'Resultado apenas das posições avaliadas' : 'Ganho ou perda das posições atuais'}
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado realizado
                                </span>

                                <strong className={returnClass(totalRealizedProfitLoss, 'realized')}>{metricValue('realized', (totalRealizedProfitLoss >= 0 ? '+' : '') + formatCurrency(totalRealizedProfitLoss))}</strong>

                                <small>
                                    Ganho ou perda nas vendas
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado sobre custo
                                </span>

                                <strong className={returnClass(profitabilityPercent, 'positions')}>{returnValue('positions', profitabilityPercent)}</strong>

                                <small>
                                    Variação das posições atuais sobre o custo
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Custo investido
                                </span>

                                <strong>{metricValue('positions', formatCurrency(totalCost))}</strong>

                                <small>
                                    Capital das posições atuais
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Proventos recebidos
                                </span>

                                <strong>{metricValue('incomes', formatCurrency(totalIncomes))}</strong>

                                <small>
                                    Pagamentos até hoje
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Ativos
                                </span>

                                <strong>{metricValue('positions', String(positions.length))}</strong>

                                <small>
                                    Posições na carteira
                                </small>

                            </article>

                        </div>

                        <section className="dashboard-card dashboard-return-section">

                            <div className="dashboard-return-header">

                                <h2>Rentabilidade ponderada</h2>

                                <div className="dashboard-return-controls">

                                    <p>
                                        Desempenho da carteira neutralizando compras e vendas e considerando os proventos recebidos.
                                    </p>

                                    <div className="dashboard-return-periods">

                                        {historyPeriods.map(
                                            (period) => (

                                                <button
                                                    key={period.value}
                                                    type="button"
                                                    className={
                                                        returnPeriod === period.value
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    disabled={returnLoading || pendingSections.comparison}
                                                    onClick={() =>
                                                        handleReturnPeriodChange(
                                                            period.value,
                                                        )
                                                    }
                                                >
                                                    {period.label}
                                                </button>
                                            ),
                                        )}

                                    </div>

                                </div>

                            </div>

                            {returnPeriod === 'CUSTOM' && (

                                <div className="dashboard-return-custom">

                                    <div>
                                        <label htmlFor="return-start-date">
                                            Data inicial
                                        </label>

                                        <input
                                            id="return-start-date"
                                            type="date"
                                            value={returnCustomStartDate}
                                            onChange={(event) =>
                                                setReturnCustomStartDate(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="return-end-date">
                                            Data final
                                        </label>

                                        <input
                                            id="return-end-date"
                                            type="date"
                                            value={returnCustomEndDate}
                                            onChange={(event) =>
                                                setReturnCustomEndDate(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={returnLoading || pendingSections.comparison}
                                        onClick={handleCustomReturnSubmit}
                                    >
                                        Aplicar
                                    </button>

                                </div>
                            )}

                            <div className="dashboard-metrics">

                                <article className="dashboard-metric-card">

                                    <span>
                                        Rentabilidade total
                                    </span>

                                    <strong className={returnClass(totalWeightedReturn, 'total')}>
                                        {returnValue('total', totalWeightedReturn)}
                                    </strong>

                                    <small>
                                        Desde o primeiro lançamento da carteira
                                    </small>

                                </article>

                                <article className="dashboard-metric-card">

                                    <span>
                                        Últimos 12 meses
                                    </span>

                                    <strong className={returnClass(lastTwelveMonthsWeightedReturn, 'year')}>
                                        {returnValue('year', lastTwelveMonthsWeightedReturn)}
                                    </strong>

                                    <small>
                                        Rentabilidade ponderada no período
                                    </small>

                                </article>

                                <article className="dashboard-metric-card">

                                    <span>
                                        Último mês
                                    </span>

                                    <strong className={returnClass(lastMonthWeightedReturn, 'month')}>
                                        {returnValue('month', lastMonthWeightedReturn)}
                                    </strong>

                                    <small>
                                        Rentabilidade ponderada no período
                                    </small>

                                </article>

                            </div>

                            {benchmarkAvailability(benchmarkComparison.map(p => p.cdiReturn), 'CDI') && <p>{benchmarkAvailability(benchmarkComparison.map(p => p.cdiReturn), 'CDI')}</p>}
                            {benchmarkAvailability(benchmarkComparison.map(p => p.ibovReturn), 'IBOV') && <p>{benchmarkAvailability(benchmarkComparison.map(p => p.ibovReturn), 'IBOV')}</p>}
                            <div className="dashboard-return-chart">
                                {returnLoading || pendingSections.comparison ? (
                                    <div className="dashboard-history-message">
                                        Carregando rentabilidade...
                                    </div>
                                ) : issues.comparison ? (<p role="alert">{issues.comparison}</p>) : benchmarkComparison.length === 0 ? (
                                    <div className="dashboard-history-message">
                                        Nenhuma comparação de rentabilidade disponível.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={benchmarkComparison.map((point) => ({
                                                ...point,
                                                portfolioReturnPercent:
                                                    point.portfolioReturn * 100,
                                                cdiReturnPercent:
                                                    point.cdiReturn === null ? null : point.cdiReturn * 100,
                                                ibovReturnPercent:
                                                    point.ibovReturn === null ? null : point.ibovReturn * 100,
                                            }))}
                                            margin={{
                                                top: 10,
                                                right: 15,
                                                left: 10,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={formatHistoryAxisDate}
                                                minTickGap={30}
                                            />

                                            <YAxis
                                                width={70}
                                                allowDataOverflow
                                                domain={[
                                                    (dataMin: number) =>
                                                        dataMin < 0
                                                            ? Math.floor(dataMin)
                                                            : 0,
                                                    (dataMax: number) =>
                                                        Math.ceil(dataMax * 1.05),
                                                ]}
                                                tickFormatter={(value) =>
                                                    `${formatPercentage(Number(value))}%`
                                                }
                                            />

                                            <Tooltip
                                                labelFormatter={(value) =>
                                                    formatHistoryDate(String(value))
                                                }
                                                formatter={(value, name) => [
                                                    `${formatPercentage(Number(value))}%`,
                                                    String(name),
                                                ]}
                                            />

                                            <Legend />

                                            <Line
                                                type="monotone"
                                                dataKey="portfolioReturnPercent"
                                                name="Carteira"
                                                stroke="#16834b"
                                                strokeWidth={2.5}
                                                dot={false}
                                                activeDot={{ r: 5 }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="cdiReturnPercent"
                                                connectNulls={false}
                                                name="CDI"
                                                stroke="#173e6d"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="ibovReturnPercent"
                                                connectNulls={false}
                                                name="IBOV"
                                                stroke="#b7791f"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="dashboard-return-table-section">

                                <div className="dashboard-return-table-heading">
                                    <h3>Rentabilidade mensal</h3>
                                    <p>
                                        Retornos compostos por mês, no ano e acumulados desde o início da carteira.
                                    </p>
                                </div>

                                {pendingSections.total ? <p role="status">Carregando rentabilidade mensal...</p> : issues.total ? (<p role="alert">{issues.total}</p>) : monthlyReturnRows.length === 0 ? (
                                    <div className="dashboard-history-message">
                                        Nenhuma rentabilidade mensal disponível.
                                    </div>
                                ) : (
                                    <div className="dashboard-return-table-wrapper">
                                        <table className="dashboard-return-table">
                                            <thead>
                                            <tr>
                                                <th>Ano</th>
                                                {monthLabels.map((month) => (
                                                    <th key={month}>{month}</th>
                                                ))}
                                                <th>No ano</th>
                                                <th>Acumulado</th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {monthlyReturnRows.map((row) => (
                                                <tr key={row.year}>
                                                    <td className="dashboard-return-year">
                                                        {row.year}
                                                    </td>

                                                    {row.months.map((monthReturn, index) => (
                                                        <td key={`${row.year}-${index}`}>
                                                            {monthReturn === null ? (
                                                                <span className="dashboard-return-empty">—</span>
                                                            ) : (
                                                                <span
                                                                    className={
                                                                        monthReturn >= 0
                                                                            ? 'positive'
                                                                            : 'negative'
                                                                    }
                                                                >
                                                                        {monthReturn >= 0 ? '+' : ''}
                                                                    {formatPercentage(monthReturn * 100)}%
                                                                    </span>
                                                            )}
                                                        </td>
                                                    ))}

                                                    <td>
                                                        <strong
                                                            className={
                                                                row.annualReturn >= 0
                                                                    ? 'positive'
                                                                    : 'negative'
                                                            }
                                                        >
                                                            {row.annualReturn >= 0 ? '+' : ''}
                                                            {formatPercentage(row.annualReturn * 100)}%
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <strong
                                                            className={
                                                                row.accumulatedReturn >= 0
                                                                    ? 'positive'
                                                                    : 'negative'
                                                            }
                                                        >
                                                            {row.accumulatedReturn >= 0 ? '+' : ''}
                                                            {formatPercentage(row.accumulatedReturn * 100)}%
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            </div>

                        </section>

                        <section className="dashboard-card dashboard-history-section">

                            <div className="dashboard-history-header">

                                <div>

                                    <h2>
                                        Evolução patrimonial
                                    </h2>

                                    <p>
                                        Valor histórico da carteira com base nas posições e cotações de mercado.
                                    </p>

                                </div>

                                <div className="dashboard-history-periods">

                                    {historyPeriods.map(
                                        (period) => (

                                            <button
                                                key={period.value}
                                                type="button"
                                                className={
                                                    historyPeriod ===
                                                    period.value
                                                        ? 'active'
                                                        : ''
                                                }
                                                disabled={
                                                    historyLoading || pendingSections.history
                                                }
                                                onClick={() =>
                                                    handleHistoryPeriodChange(
                                                        period.value,
                                                    )
                                                }
                                            >
                                                {period.label}
                                            </button>
                                        ),
                                    )}

                                </div>

                            </div>

                            {historyPeriod === 'CUSTOM' && (

                                <div className="dashboard-history-custom">

                                    <div>

                                        <label htmlFor="history-start-date">
                                            Data inicial
                                        </label>

                                        <input
                                            id="history-start-date"
                                            type="date"
                                            value={customStartDate}
                                            onChange={(event) =>
                                                setCustomStartDate(
                                                    event.target.value,
                                                )
                                            }
                                        />

                                    </div>

                                    <div>

                                        <label htmlFor="history-end-date">
                                            Data final
                                        </label>

                                        <input
                                            id="history-end-date"
                                            type="date"
                                            value={customEndDate}
                                            onChange={(event) =>
                                                setCustomEndDate(
                                                    event.target.value,
                                                )
                                            }
                                        />

                                    </div>

                                    <button
                                        type="button"
                                        disabled={historyLoading || pendingSections.history}
                                        onClick={
                                            handleCustomHistorySubmit
                                        }
                                    >
                                        Aplicar
                                    </button>

                                </div>
                            )}

                            {historyLoading || pendingSections.history ? (

                                <div className="dashboard-history-message">
                                    Carregando histórico...
                                </div>

                            ) : issues.history ? (<p role="alert">{issues.history}</p>) : !portfolioHistory ||
                            portfolioHistory.points.length === 0 ? (

                                <div className="dashboard-history-message">
                                    Nenhum histórico disponível.
                                </div>

                            ) : (

                                <div className="dashboard-history-chart">

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <LineChart
                                            data={
                                                portfolioHistory.points
                                            }
                                            margin={{
                                                top: 10,
                                                right: 15,
                                                left: 10,
                                                bottom: 5,
                                            }}
                                        >

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={
                                                    formatHistoryAxisDate
                                                }
                                                minTickGap={30}
                                            />

                                            <YAxis
                                                width={80}
                                                tickFormatter={
                                                    formatCompactCurrency
                                                }
                                            />

                                            <Tooltip
                                                labelFormatter={(
                                                    value,
                                                ) =>
                                                    formatHistoryDate(
                                                        String(
                                                            value,
                                                        ),
                                                    )
                                                }
                                                formatter={(
                                                    value,
                                                ) => [
                                                    formatCurrency(
                                                        Number(
                                                            value,
                                                        ),
                                                    ),
                                                    'Patrimônio',
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                name="Patrimônio"
                                                stroke="#173e6d"
                                                strokeWidth={2.5}
                                                dot={false}
                                                activeDot={{
                                                    r: 5,
                                                }}
                                            />

                                        </LineChart>

                                    </ResponsiveContainer>

                                </div>
                            )}

                        </section>

                        <section className="dashboard-card dashboard-positions-section">

                            <div className="dashboard-section-heading">

                                <div>

                                    <h2>Posições</h2>

                                    <p>
                                        Desempenho atual dos ativos da carteira.
                                    </p>

                                </div>

                            </div>

                            {pendingSections.positions ? (

                                <p>
                                    Carregando posições...
                                </p>

                            ) : issues.positions ? (<p role="alert">{issues.positions}</p>) : positions.length === 0 ? (

                                <p>
                                    Nenhuma posição encontrada.
                                </p>

                            ) : (

                                <div className="positions-grid">

                                    {positions.map(
                                        (position) => {

                                            const isPositive =
                                                position.profitLoss !== null && position.profitLoss >= 0

                                            return (

                                                <article
                                                    className="position-card"
                                                    key={
                                                        position.assetId
                                                    }
                                                >

                                                    <div className="position-card-header">

                                                        <div>

                                                            <span className="position-label">
                                                                Ativo
                                                            </span>

                                                            <h3>
                                                                {
                                                                    position.assetTicker
                                                                }
                                                            </h3>

                                                        </div>

                                                        <div
                                                            className={
                                                                position.profitLoss === null ? 'position-profit' : isPositive
                                                                    ? 'position-profit positive'
                                                                    : 'position-profit negative'
                                                            }
                                                        >

                                                            <span>
                                                                Rentabilidade
                                                            </span>

                                                            <strong>
                                                                {isPositive
                                                                    ? '+'
                                                                    : ''}

                                                                {formatPercentage(
                                                                    position.profitabilityPercent,
                                                                )}
                                                                {position.profitabilityPercent === null ? '' : '%'}
                                                            </strong>

                                                        </div>

                                                    </div>

                                                    <ValuationDetails position={position} />
                                                    <div className="position-metrics">

                                                        <div className="position-metric">

                                                            <span>
                                                                Quantidade
                                                            </span>

                                                            <strong>
                                                                {formatNumber(
                                                                    position.quantity,
                                                                )}
                                                            </strong>

                                                        </div>

                                                        <div className="position-metric">

                                                            <span>
                                                                Preço médio
                                                            </span>

                                                            <strong>
                                                                {formatCurrency(
                                                                    position.averagePrice,
                                                                )}
                                                            </strong>

                                                        </div>

                                                        <div className="position-metric">

                                                            <span>
                                                                Preço atual
                                                            </span>

                                                            <strong>
                                                                {formatCurrency(
                                                                    position.currentPrice,
                                                                )}
                                                            </strong>

                                                        </div>

                                                        <div className="position-metric">

                                                            <span>
                                                                Custo total
                                                            </span>

                                                            <strong>
                                                                {formatCurrency(
                                                                    position.totalCost,
                                                                )}
                                                            </strong>

                                                        </div>

                                                        <div className="position-metric">

                                                            <span>
                                                                Valor atual
                                                            </span>

                                                            <strong>
                                                                {formatCurrency(
                                                                    position.currentValue,
                                                                )}
                                                            </strong>

                                                        </div>

                                                        <div className="position-metric">

                                                            <span>
                                                                Resultado
                                                            </span>

                                                            <strong
                                                                className={
                                                                    position.profitLoss === null ? '' : isPositive
                                                                        ? 'positive'
                                                                        : 'negative'
                                                                }
                                                            >
                                                                {isPositive
                                                                    ? '+'
                                                                    : ''}

                                                                {formatCurrency(
                                                                    position.profitLoss,
                                                                )}
                                                            </strong>

                                                        </div>

                                                    </div>

                                                </article>
                                            )
                                        },
                                    )}

                                </div>
                            )}

                        </section>

                    </>
                )}

            </main>
        </>
    )
}

export default DashboardPage