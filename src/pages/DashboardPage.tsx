import { useEffect, useState } from 'react'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import Header from '../components/Header'

import { findAllPortfolios } from '../services/portfolioService'
import { findMarketPositions } from '../services/positionService'
import { findIncomesByPortfolio } from '../services/incomeService'
import { findRealizedResultsByPortfolio } from '../services/realizedResultService'
import { findPortfolioHistory } from '../services/portfolioHistoryService'
import { findPortfolioReturns } from '../services/portfolioReturnService'

import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse } from '../types/position'
import type { IncomeResponse } from '../types/income'
import type { RealizedResultResponse } from '../types/realizedResult'
import type {
    PortfolioHistoryPeriod,
    PortfolioHistoryResponse,
} from '../types/portfolioHistory'
import type { PortfolioReturnResponse } from '../types/portfolioReturn'

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

    const [portfolioReturns, setPortfolioReturns] =
        useState<PortfolioReturnResponse | null>(null)

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

    useEffect(() => {

        async function loadDashboard() {

            try {

                setLoading(true)
                setError('')

                const portfoliosData =
                    await findAllPortfolios()

                setPortfolios(portfoliosData)

                if (portfoliosData.length === 0) {
                    return
                }

                const firstPortfolioId =
                    portfoliosData[0].id

                setSelectedPortfolioId(
                    firstPortfolioId,
                )

                const [
                    positionsData,
                    incomesData,
                    realizedResultsData,
                    historyData,
                    returnsData,
                    totalReturnsData,
                    lastTwelveMonthsReturnsData,
                ] = await Promise.all([
                    findMarketPositions(
                        firstPortfolioId,
                    ),
                    findIncomesByPortfolio(
                        firstPortfolioId,
                    ),
                    findRealizedResultsByPortfolio(
                        firstPortfolioId,
                    ),
                    findPortfolioHistory(
                        firstPortfolioId,
                        'ONE_MONTH',
                    ),
                    findPortfolioReturns(
                        firstPortfolioId,
                        'ONE_MONTH',
                    ),
                    findPortfolioReturns(
                        firstPortfolioId,
                        'ALL',
                    ),
                    findPortfolioReturns(
                        firstPortfolioId,
                        'ONE_YEAR',
                    ),
                ])

                setPositions(positionsData)
                setIncomes(incomesData)
                setRealizedResults(realizedResultsData)
                setPortfolioHistory(historyData)
                setPortfolioReturns(returnsData)
                setTotalPortfolioReturns(totalReturnsData)
                setLastTwelveMonthsReturns(lastTwelveMonthsReturnsData)
                setLastMonthReturns(returnsData)

            } catch (error) {

                console.error(
                    'Erro ao carregar dashboard:',
                    error,
                )

                setError(
                    'Não foi possível carregar os dados do dashboard.',
                )

            } finally {

                setLoading(false)
            }
        }

        loadDashboard()

    }, [])

    async function handlePortfolioChange(
        portfolioId: number,
    ) {

        try {

            setLoading(true)
            setError('')

            setSelectedPortfolioId(portfolioId)

            const historyPromise =
                historyPeriod === 'CUSTOM' &&
                customStartDate &&
                customEndDate
                    ? findPortfolioHistory(
                        portfolioId,
                        'CUSTOM',
                        customStartDate,
                        customEndDate,
                    )
                    : findPortfolioHistory(
                        portfolioId,
                        historyPeriod === 'CUSTOM'
                            ? 'ONE_MONTH'
                            : historyPeriod,
                    )

            const returnsPromise =
                returnPeriod === 'CUSTOM' &&
                returnCustomStartDate &&
                returnCustomEndDate
                    ? findPortfolioReturns(
                        portfolioId,
                        'CUSTOM',
                        returnCustomStartDate,
                        returnCustomEndDate,
                    )
                    : findPortfolioReturns(
                        portfolioId,
                        returnPeriod === 'CUSTOM'
                            ? 'ONE_MONTH'
                            : returnPeriod,
                    )

            const [
                positionsData,
                incomesData,
                realizedResultsData,
                historyData,
                returnsData,
                totalReturnsData,
                lastTwelveMonthsReturnsData,
                lastMonthReturnsData,
            ] = await Promise.all([
                findMarketPositions(portfolioId),
                findIncomesByPortfolio(portfolioId),
                findRealizedResultsByPortfolio(
                    portfolioId,
                ),
                historyPromise,
                returnsPromise,
                findPortfolioReturns(
                    portfolioId,
                    'ALL',
                ),
                findPortfolioReturns(
                    portfolioId,
                    'ONE_YEAR',
                ),
                findPortfolioReturns(
                    portfolioId,
                    'ONE_MONTH',
                ),
            ])

            setPositions(positionsData)
            setIncomes(incomesData)
            setRealizedResults(realizedResultsData)
            setPortfolioHistory(historyData)
            setPortfolioReturns(returnsData)
            setTotalPortfolioReturns(totalReturnsData)
            setLastTwelveMonthsReturns(lastTwelveMonthsReturnsData)
            setLastMonthReturns(lastMonthReturnsData)

            if (
                historyPeriod === 'CUSTOM' &&
                (!customStartDate || !customEndDate)
            ) {
                setHistoryPeriod('ONE_MONTH')
            }

            if (
                returnPeriod === 'CUSTOM' &&
                (!returnCustomStartDate || !returnCustomEndDate)
            ) {
                setReturnPeriod('ONE_MONTH')
            }

        } catch (error) {

            console.error(
                'Erro ao carregar carteira:',
                error,
            )

            setError(
                'Não foi possível carregar os dados da carteira.',
            )

        } finally {

            setLoading(false)
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

        try {

            setHistoryLoading(true)
            setError('')

            const historyData =
                await findPortfolioHistory(
                    selectedPortfolioId,
                    period,
                )

            setHistoryPeriod(period)
            setPortfolioHistory(historyData)

        } catch (error) {

            console.error(
                'Erro ao carregar histórico da carteira:',
                error,
            )

            setError(
                'Não foi possível carregar o histórico da carteira.',
            )

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

            console.error(
                'Erro ao carregar período personalizado:',
                error,
            )

            setError(
                'Não foi possível carregar o período personalizado.',
            )

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

        try {
            setReturnLoading(true)
            setError('')

            const returnsData =
                await findPortfolioReturns(
                    selectedPortfolioId,
                    period,
                )

            setReturnPeriod(period)
            setPortfolioReturns(returnsData)

        } catch (error) {
            console.error(
                'Erro ao carregar rentabilidade da carteira:',
                error,
            )

            setError(
                'Não foi possível carregar a rentabilidade da carteira.',
            )

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
            setError('')

            const returnsData =
                await findPortfolioReturns(
                    selectedPortfolioId,
                    'CUSTOM',
                    returnCustomStartDate,
                    returnCustomEndDate,
                )

            setPortfolioReturns(returnsData)

        } catch (error) {
            console.error(
                'Erro ao carregar período personalizado da rentabilidade:',
                error,
            )

            setError(
                'Não foi possível carregar o período personalizado da rentabilidade.',
            )

        } finally {
            setReturnLoading(false)
        }
    }

    const totalWeightedReturn =
        (totalPortfolioReturns?.totalReturn ?? 0) * 100

    const lastTwelveMonthsWeightedReturn =
        (lastTwelveMonthsReturns?.totalReturn ?? 0) * 100

    const lastMonthWeightedReturn =
        (lastMonthReturns?.totalReturn ?? 0) * 100

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

    const totalCurrentValue =
        positions.reduce(
            (total, position) =>
                total + position.currentValue,
            0,
        )

    const totalCost =
        positions.reduce(
            (total, position) =>
                total + position.totalCost,
            0,
        )

    const totalProfitLoss =
        totalCurrentValue - totalCost

    const profitabilityPercent =
        totalCost > 0
            ? (totalProfitLoss / totalCost) * 100
            : 0

    const totalIncomes =
        incomes.reduce(
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

    function formatCurrency(value: number) {

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

    function formatPercentage(value: number) {

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

                    {portfolios.length > 0 && (

                        <div className="dashboard-portfolio-selector">

                            <label htmlFor="dashboard-portfolio">
                                Carteira
                            </label>

                            <select
                                id="dashboard-portfolio"
                                value={
                                    selectedPortfolioId ??
                                    ''
                                }
                                onChange={(event) =>
                                    handlePortfolioChange(
                                        Number(
                                            event.target.value,
                                        ),
                                    )
                                }
                            >
                                {portfolios.map(
                                    (portfolio) => (

                                        <option
                                            key={portfolio.id}
                                            value={portfolio.id}
                                        >
                                            {portfolio.name}
                                        </option>
                                    ),
                                )}
                            </select>

                        </div>
                    )}

                </div>

                {error && (

                    <div className="dashboard-error">
                        {error}
                    </div>
                )}

                {portfolios.length === 0 ? (

                    <section className="dashboard-card dashboard-return-section">

                        <p>
                            Nenhuma carteira encontrada.
                        </p>

                    </section>

                ) : (
                    <>

                        <div className="dashboard-metrics">

                            <article className="dashboard-metric-card">

                                <span>
                                    Patrimônio atual
                                </span>

                                <strong>
                                    {formatCurrency(
                                        totalCurrentValue,
                                    )}
                                </strong>

                                <small>
                                    Valor atual das posições
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado não realizado
                                </span>

                                <strong
                                    className={
                                        totalProfitLoss >= 0
                                            ? 'positive'
                                            : 'negative'
                                    }
                                >
                                    {totalProfitLoss >= 0
                                        ? '+'
                                        : ''}

                                    {formatCurrency(
                                        totalProfitLoss,
                                    )}
                                </strong>

                                <small>
                                    Ganho ou perda das posições atuais
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado realizado
                                </span>

                                <strong
                                    className={
                                        totalRealizedProfitLoss >= 0
                                            ? 'positive'
                                            : 'negative'
                                    }
                                >
                                    {totalRealizedProfitLoss >= 0
                                        ? '+'
                                        : ''}

                                    {formatCurrency(
                                        totalRealizedProfitLoss,
                                    )}
                                </strong>

                                <small>
                                    Ganho ou perda nas vendas
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Resultado sobre custo
                                </span>

                                <strong
                                    className={
                                        profitabilityPercent >= 0
                                            ? 'positive'
                                            : 'negative'
                                    }
                                >
                                    {profitabilityPercent >= 0
                                        ? '+'
                                        : ''}

                                    {formatPercentage(
                                        profitabilityPercent,
                                    )}
                                    %
                                </strong>

                                <small>
                                    Variação das posições atuais sobre o custo
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Custo investido
                                </span>

                                <strong>
                                    {formatCurrency(
                                        totalCost,
                                    )}
                                </strong>

                                <small>
                                    Capital das posições atuais
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Proventos recebidos
                                </span>

                                <strong className="positive">
                                    {formatCurrency(
                                        totalIncomes,
                                    )}
                                </strong>

                                <small>
                                    Proventos registrados
                                </small>

                            </article>

                            <article className="dashboard-metric-card">

                                <span>
                                    Ativos
                                </span>

                                <strong>
                                    {positions.length}
                                </strong>

                                <small>
                                    Posições na carteira
                                </small>

                            </article>

                        </div>

                        <section className="dashboard-card dashboard-return-section">

                            <div className="dashboard-history-header">

                                <div>

                                    <h2>Rentabilidade ponderada</h2>

                                    <p>
                                        Desempenho da carteira neutralizando compras e vendas e considerando os proventos recebidos.
                                    </p>

                                </div>

                                <div className="dashboard-history-periods">

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
                                                disabled={returnLoading}
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

                            <div className="dashboard-metrics">

                                <article className="dashboard-metric-card">

                                    <span>
                                        Rentabilidade total
                                    </span>

                                    <strong
                                        className={
                                            totalWeightedReturn >= 0
                                                ? 'positive'
                                                : 'negative'
                                        }
                                    >
                                        {totalWeightedReturn >= 0
                                            ? '+'
                                            : ''}

                                        {formatPercentage(
                                            totalWeightedReturn,
                                        )}
                                        %
                                    </strong>

                                    <small>
                                        Desde o primeiro lançamento da carteira
                                    </small>

                                </article>

                                <article className="dashboard-metric-card">

                                    <span>
                                        Últimos 12 meses
                                    </span>

                                    <strong
                                        className={
                                            lastTwelveMonthsWeightedReturn >= 0
                                                ? 'positive'
                                                : 'negative'
                                        }
                                    >
                                        {lastTwelveMonthsWeightedReturn >= 0
                                            ? '+'
                                            : ''}

                                        {formatPercentage(
                                            lastTwelveMonthsWeightedReturn,
                                        )}
                                        %
                                    </strong>

                                    <small>
                                        Rentabilidade ponderada no período
                                    </small>

                                </article>

                                <article className="dashboard-metric-card">

                                    <span>
                                        Último mês
                                    </span>

                                    <strong
                                        className={
                                            lastMonthWeightedReturn >= 0
                                                ? 'positive'
                                                : 'negative'
                                        }
                                    >
                                        {lastMonthWeightedReturn >= 0
                                            ? '+'
                                            : ''}

                                        {formatPercentage(
                                            lastMonthWeightedReturn,
                                        )}
                                        %
                                    </strong>

                                    <small>
                                        Rentabilidade ponderada no período
                                    </small>

                                </article>

                            </div>

                            {returnPeriod === 'CUSTOM' && (

                                <div className="dashboard-history-custom">

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
                                        disabled={returnLoading}
                                        onClick={handleCustomReturnSubmit}
                                    >
                                        Aplicar
                                    </button>

                                </div>
                            )}

                            <div className="dashboard-return-chart">
                                {returnLoading ? (
                                    <div className="dashboard-history-message">
                                        Carregando rentabilidade...
                                    </div>
                                ) : !portfolioReturns || portfolioReturns.points.length === 0 ? (
                                    <div className="dashboard-history-message">
                                        Nenhuma rentabilidade disponível.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={portfolioReturns.points.map((point) => ({
                                                ...point,
                                                cumulativeReturnPercent:
                                                    point.cumulativeReturn * 100,
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
                                                tickFormatter={(value) =>
                                                    `${formatPercentage(Number(value))}%`
                                                }
                                            />

                                            <Tooltip
                                                labelFormatter={(value) =>
                                                    formatHistoryDate(String(value))
                                                }
                                                formatter={(value) => [
                                                    `${formatPercentage(Number(value))}%`,
                                                    'Rentabilidade',
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="cumulativeReturnPercent"
                                                name="Rentabilidade"
                                                stroke="#16834b"
                                                strokeWidth={2.5}
                                                dot={false}
                                                activeDot={{ r: 5 }}
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

                                {monthlyReturnRows.length === 0 ? (
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
                                                    historyLoading
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
                                        disabled={historyLoading}
                                        onClick={
                                            handleCustomHistorySubmit
                                        }
                                    >
                                        Aplicar
                                    </button>

                                </div>
                            )}

                            {historyLoading ? (

                                <div className="dashboard-history-message">
                                    Carregando histórico...
                                </div>

                            ) : !portfolioHistory ||
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

                            {loading ? (

                                <p>
                                    Carregando posições...
                                </p>

                            ) : positions.length === 0 ? (

                                <p>
                                    Nenhuma posição encontrada.
                                </p>

                            ) : (

                                <div className="positions-grid">

                                    {positions.map(
                                        (position) => {

                                            const isPositive =
                                                position.profitLoss >=
                                                0

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
                                                                isPositive
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
                                                                %
                                                            </strong>

                                                        </div>

                                                    </div>

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
                                                                    isPositive
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
