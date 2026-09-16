import { useEffect, useState } from 'react'

import Header from '../components/Header'
import { findAllPortfolios } from '../services/portfolioService'
import { findMarketPositions } from '../services/positionService'
import { findIncomesByPortfolio } from '../services/incomeService'

import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse } from '../types/position'
import type { IncomeResponse } from '../types/income'

function DashboardPage() {
    const [portfolios, setPortfolios] =
        useState<PortfolioResponse[]>([])

    const [selectedPortfolioId, setSelectedPortfolioId] =
        useState<number | null>(null)

    const [positions, setPositions] =
        useState<PositionMarketResponse[]>([])

    const [incomes, setIncomes] =
        useState<IncomeResponse[]>([])

    const [loading, setLoading] =
        useState(true)

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
                ] = await Promise.all([
                    findMarketPositions(
                        firstPortfolioId,
                    ),
                    findIncomesByPortfolio(
                        firstPortfolioId,
                    ),
                ])

                setPositions(positionsData)
                setIncomes(incomesData)
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

            const [
                positionsData,
                incomesData,
            ] = await Promise.all([
                findMarketPositions(portfolioId),
                findIncomesByPortfolio(portfolioId),
            ])

            setPositions(positionsData)
            setIncomes(incomesData)
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

    function formatCurrency(value: number) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    function formatNumber(value: number) {
        return new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 8,
        }).format(value)
    }

    function formatPercentage(value: number) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value)
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
                                    Resultado
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
                                    Ganho ou perda não realizada
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

                        <section className="dashboard-card dashboard-positions-section">
                            <div className="dashboard-section-heading">
                                <div>
                                    <h2>Posições</h2>

                                    <p>
                                        Desempenho atual dos ativos
                                        da carteira.
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