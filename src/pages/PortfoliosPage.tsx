import { PageHeading } from '../components/ui/PageHeading'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { summarizeValuations } from '../services/valuation'
import { findAllPortfolios } from '../services/portfolioService'
import { getSelectedPortfolioId } from '../services/selectedPortfolio'
import { findMarketPositions, findPositions } from '../services/positionService'
import { dashboardErrorMessage } from '../services/dashboardService'
import type { PortfolioResponse } from '../types/portfolio'

interface PortfolioSummary {
    issue: string | null
    valuationLoading: boolean
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
        // IM-061: a lista de carteiras não deve aguardar integrações de mercado.
        // Nada é armazenado entre logins: o efeito pertence apenas à montagem atual.
        let active = true
        async function loadPortfolios() {
            try {
                const portfolios = await findAllPortfolios()
                if (!active) return

                const selectedId = getSelectedPortfolioId()
                const ordered = [...portfolios].sort((a, b) =>
                    Number(b.id === selectedId) - Number(a.id === selectedId))
                setPortfolioSummaries(ordered.map(portfolio => ({
                    portfolio, issue: null, valuationLoading: true,
                    currentValue: null, totalCost: null, profitLoss: null,
                    profitabilityPercent: null, assetsCount: null,
                })))
                setLoading(false)

                // Limita chamadas simultâneas para não sobrecarregar integrações e
                // evitar que uma avaliação lenta bloqueie as demais carteiras.
                let next = 0
                async function worker() {
                    while (active && next < ordered.length) {
                        const portfolio = ordered[next++]
                        let result: PortfolioSummary
                        try {
                            const positions = await findMarketPositions(portfolio.id)
                            const summary = summarizeValuations(positions)
                            result = { portfolio, valuationLoading: false,
                                currentValue: summary.value, totalCost: summary.totalCost,
                                profitLoss: summary.profit, profitabilityPercent: summary.percent,
                                assetsCount: positions.length,
                                issue: summary.partial
                                    ? 'Patrimônio parcialmente avaliado: subtotal e resultado apenas das posições avaliadas. Custo sem avaliação: ' + formatCurrency(summary.missingCost)
                                    : summary.estimated ? 'Inclui remuneração contratual estimada.' : null }
                        } catch (marketError) {
                            let totalCost: number | null = null
                            let assetsCount: number | null = null
                            try {
                                const accounting = await findPositions(portfolio.id)
                                totalCost = accounting.reduce((sum, position) => sum + position.totalCost, 0)
                                assetsCount = accounting.length
                            } catch { /* Não substituir dados indisponíveis por zero. */ }
                            result = { portfolio, valuationLoading: false,
                                currentValue: null, profitLoss: null, profitabilityPercent: null,
                                totalCost, assetsCount, issue: dashboardErrorMessage(marketError) }
                        }
                        if (!active) return
                        setPortfolioSummaries(current => current.map(item =>
                            item.portfolio.id === portfolio.id ? result : item))
                    }
                }
                void Promise.all(Array.from({ length: Math.min(3, ordered.length) }, () => worker()))
            } catch (loadError) {
                if (!active) return
                console.error('Erro ao buscar carteiras:', loadError)
                setError(dashboardErrorMessage(loadError))
                setLoading(false)
            }
        }
        void loadPortfolios()
        return () => { active = false }
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
                <PageHeading title="Carteiras" description="Acompanhe o desempenho das suas carteiras de investimentos." />

                <SurfaceCard>
                    <h2>Minhas carteiras</h2>
                    <p>Crie ou renomeie carteiras pelo seletor do Dashboard.</p>

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

                                            <h3>{summary.portfolio.name}</h3>
                                            {summary.portfolio.id === getSelectedPortfolioId() &&
                                                <p>Carteira selecionada no Dashboard</p>}

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
                                                {summary.valuationLoading ? 'Calculando...' : <>
                                                    {(summary.profitabilityPercent !== null && summary.profitabilityPercent >= 0) ? '+' : ''}
                                                    {formatPercent(summary.profitabilityPercent)}
                                                    {summary.profitabilityPercent === null ? '' : '%'}
                                                </>}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="portfolio-summary-metrics">
                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Patrimônio
                                            </span>

                                            <strong>
                                                {summary.valuationLoading ? 'Calculando...' : formatCurrency(summary.currentValue)}
                                            </strong>
                                        </div>

                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Custo total
                                            </span>

                                            <strong>
                                                {summary.valuationLoading ? 'Calculando...' : formatCurrency(summary.totalCost)}
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
                                                {summary.valuationLoading ? 'Calculando...' : <>
                                                    {(summary.profitLoss !== null && summary.profitLoss >= 0) ? '+' : ''}
                                                    {formatCurrency(summary.profitLoss)}
                                                </>}
                                            </strong>
                                        </div>

                                        <div className="portfolio-summary-metric">
                                            <span>
                                                Ativos
                                            </span>

                                            <strong>
                                                {summary.valuationLoading ? 'Calculando...' : summary.assetsCount ?? 'Indisponível'}
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
                </SurfaceCard>
            </main>
        </>
    )
}

export default PortfoliosPage