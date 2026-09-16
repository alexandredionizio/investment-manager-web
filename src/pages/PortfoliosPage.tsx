import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { findAllPortfolios } from '../services/portfolioService'
import { findMarketPositions } from '../services/positionService'
import type { PortfolioResponse } from '../types/portfolio'

interface PortfolioSummary {
    portfolio: PortfolioResponse
    currentValue: number
    totalCost: number
    profitLoss: number
    profitabilityPercent: number
    assetsCount: number
}

function PortfoliosPage() {
    const [portfolioSummaries, setPortfolioSummaries] =
        useState<PortfolioSummary[]>([])

    const navigate = useNavigate()

    useEffect(() => {
        async function loadPortfolios() {
            try {
                const portfolios = await findAllPortfolios()

                const summaries = await Promise.all(
                    portfolios.map(async (portfolio) => {
                        const positions =
                            await findMarketPositions(portfolio.id)

                        const currentValue = positions.reduce(
                            (total, position) =>
                                total + position.currentValue,
                            0,
                        )

                        const totalCost = positions.reduce(
                            (total, position) =>
                                total + position.totalCost,
                            0,
                        )

                        const profitLoss =
                            currentValue - totalCost

                        const profitabilityPercent =
                            totalCost > 0
                                ? (profitLoss / totalCost) * 100
                                : 0

                        return {
                            portfolio,
                            currentValue,
                            totalCost,
                            profitLoss,
                            profitabilityPercent,
                            assetsCount: positions.length,
                        }
                    }),
                )

                setPortfolioSummaries(summaries)
            } catch (error) {
                console.error(
                    'Erro ao buscar carteiras:',
                    error,
                )
            }
        }

        loadPortfolios()
    }, [])

    function handleViewPortfolio(portfolioId: number) {
        navigate(`/portfolios/${portfolioId}`)
    }

    function formatCurrency(value: number) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        })
    }

    function formatPercent(value: number) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">
                <div className="page-heading">
                    <h1>Carteiras</h1>

                    <p>
                        Acompanhe o desempenho das suas
                        carteiras de investimentos.
                    </p>
                </div>

                <section className="dashboard-card">
                    <h2>Minhas carteiras</h2>

                    {portfolioSummaries.length === 0 ? (
                        <p>Nenhuma carteira encontrada.</p>
                    ) : (
                        <div className="portfolio-summary-list">
                            {portfolioSummaries.map((summary) => (
                                <article
                                    key={summary.portfolio.id}
                                    className="portfolio-summary-card"
                                >
                                    <div className="portfolio-summary-header">
                                        <div>
                                            <span className="portfolio-summary-label">
                                                Carteira
                                            </span>

                                            <h3>
                                                {summary.portfolio.name}
                                            </h3>

                                            <p>
                                                {
                                                    summary.portfolio
                                                        .description
                                                }
                                            </p>
                                        </div>

                                        <div className="portfolio-summary-profitability">
                                            <span>
                                                Rentabilidade
                                            </span>

                                            <strong
                                                className={
                                                    summary.profitabilityPercent >=
                                                    0
                                                        ? 'positive'
                                                        : 'negative'
                                                }
                                            >
                                                {summary.profitabilityPercent >=
                                                0
                                                    ? '+'
                                                    : ''}
                                                {formatPercent(
                                                    summary.profitabilityPercent,
                                                )}
                                                %
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="portfolio-summary-metrics">
                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Patrimônio
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    summary.currentValue,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Custo total
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    summary.totalCost,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Resultado
                                            </span>

                                            <strong
                                                className={
                                                    summary.profitLoss >= 0
                                                        ? 'positive'
                                                        : 'negative'
                                                }
                                            >
                                                {summary.profitLoss >= 0
                                                    ? '+'
                                                    : ''}
                                                {formatCurrency(
                                                    summary.profitLoss,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Ativos
                                            </span>

                                            <strong>
                                                {summary.assetsCount}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="portfolio-summary-footer">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleViewPortfolio(
                                                    summary.portfolio.id,
                                                )
                                            }
                                        >
                                            Ver carteira →
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </>
    )
}

export default PortfoliosPage