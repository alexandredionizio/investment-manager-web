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

import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse } from '../types/position'
import type { IncomeResponse } from '../types/income'
import type { RealizedResultResponse } from '../types/realizedResult'
import type {
    PortfolioHistoryPeriod,
    PortfolioHistoryResponse,
} from '../types/portfolioHistory'

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

    const [historyPeriod, setHistoryPeriod] =
        useState<PortfolioHistoryPeriod>('ONE_MONTH')

    const [customStartDate, setCustomStartDate] =
        useState('')

    const [customEndDate, setCustomEndDate] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [historyLoading, setHistoryLoading] =
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
                ])

                setPositions(positionsData)
                setIncomes(incomesData)
                setRealizedResults(realizedResultsData)
                setPortfolioHistory(historyData)

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

            const [
                positionsData,
                incomesData,
                realizedResultsData,
                historyData,
            ] = await Promise.all([
                findMarketPositions(portfolioId),
                findIncomesByPortfolio(portfolioId),
                findRealizedResultsByPortfolio(
                    portfolioId,
                ),
                historyPromise,
            ])

            setPositions(positionsData)
            setIncomes(incomesData)
            setRealizedResults(realizedResultsData)
            setPortfolioHistory(historyData)

            if (
                historyPeriod === 'CUSTOM' &&
                (!customStartDate || !customEndDate)
            ) {
                setHistoryPeriod('ONE_MONTH')
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

                    <section className="dashboard-card">

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
                                    Rentabilidade
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
                                    Sobre o custo investido
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