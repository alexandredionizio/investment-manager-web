import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { summarizeValuations } from '../services/valuation'
import { findAllPortfolios } from '../services/portfolioService'
import { findMarketPositions, findPositions } from '../services/positionService'
import { dashboardErrorMessage } from '../services/dashboardService'
import type { PortfolioResponse } from '../types/portfolio'

interface PortfolioSummary {
    issue: string | null
    portfolio: PortfolioResponse
    currentValue: number | null
    totalCost: number | null
    profitLoss: number | null
    profitabilityPercent: number | null
    assetsCount: number | null
}

function PortfoliosPage() {
    const [portfolioSummaries, setPortfolioSummaries] =
        useState<PortfolioSummary[]>([])

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function loadPortfolios() {
            try {
                const portfolios = await findAllPortfolios()

                const summaries = await Promise.all(
                    portfolios.map(async (portfolio) => {
                        try {
                            const positions = await findMarketPositions(portfolio.id)
                            const summary = summarizeValuations(positions)
                            return { portfolio, currentValue: summary.value, totalCost: summary.totalCost, profitLoss: summary.profit,
                                profitabilityPercent: summary.percent, assetsCount: positions.length,
                                issue: summary.partial ? 'Patrimônio parcialmente avaliado: subtotal e resultado apenas das posições avaliadas. Custo sem avaliação: ' + formatCurrency(summary.missingCost)
                                    : summary.estimated ? 'Inclui remuneração contratual estimada.' : null }
                        } catch (marketError) {
                            let totalCost: number | null = null
                            let assetsCount: number | null = null
                            try {
                                const accounting = await findPositions(portfolio.id)
                                totalCost = accounting.reduce((sum, p) => sum + p.totalCost, 0)
                                assetsCount = accounting.length
                            } catch { /* Accounting unavailable remains absent, never zero. */ }
                            return { portfolio, currentValue: null, profitLoss: null, profitabilityPercent: null,
                                totalCost, assetsCount, issue: dashboardErrorMessage(marketError) }
                        }
                    }),
                )

                setPortfolioSummaries(summaries)
            } catch (error) {
                console.error(
                    'Erro ao buscar carteiras:',
                    error,
                )
                setError(dashboardErrorMessage(error))
            } finally {
                setLoading(false)
            }
        }

        loadPortfolios()
    }, [])

    function handleViewPortfolio(portfolioId: number) {
        navigate(`/portfolios/${portfolioId}`)
    }

    function formatCurrency(value: number | null) {
        if (value === null) return "Indisponível"
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        })
    }

    function formatPercent(value: number | null) {
        if (value === null) return "Indisponível"
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

                    {loading ? (<p>Carregando carteiras...</p>) : error ? (<p role="alert">{error}</p>) : portfolioSummaries.length === 0 ? (
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
                                                    (summary.profitabilityPercent !== null && summary.profitabilityPercent >= 0)
                                                        ? 'positive'
                                                        : 'negative'
                                                }
                                            >
                                                {(summary.profitabilityPercent !== null && summary.profitabilityPercent >= 0)
                                                    ? '+'
                                                    : ''}
                                                {formatPercent(
                                                    summary.profitabilityPercent,
                                                )}
                                                {summary.profitabilityPercent === null ? '' : '%'}
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
                                                    (summary.profitLoss !== null && summary.profitLoss >= 0)
                                                        ? 'positive'
                                                        : 'negative'
                                                }
                                            >
                                                {(summary.profitLoss !== null && summary.profitLoss >= 0)
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
                                                {summary.assetsCount ?? 'Indisponível'}
                                            </strong>
                                        </div>
                                    </div>

                                    {summary.issue && <p role="alert">{summary.issue}</p>}
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