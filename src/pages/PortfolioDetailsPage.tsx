import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import ValuationDetails from '../components/ValuationDetails'
import ValuationContractForm from '../components/ValuationContractForm'
import { summarizeValuations } from '../services/valuation'
import { findPortfolioById } from '../services/portfolioService'
import { findMarketPositions, findPositions } from '../services/positionService'
import { dashboardErrorMessage } from '../services/dashboardService'
import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse, PositionResponse } from '../types/position'

function PortfolioDetailsPage() {
    const { id } = useParams()
    const [error, setError] = useState('')
    const [marketIssue, setMarketIssue] = useState('')
    const [accounting, setAccounting] = useState<PositionResponse[] | null>(null)

    const [portfolio, setPortfolio] =
        useState<PortfolioResponse | null>(null)

    const [positions, setPositions] =
        useState<PositionMarketResponse[]>([])

    useEffect(() => {
        let cancelled = false
        async function loadPortfolio() {
            if (!id) {
                return
            }

            setError('')
            setMarketIssue('')
            setAccounting(null)
            setPortfolio(null)
            setPositions([])
            const portfolioId = Number(id)

            try {
                const portfolioData =
                    await findPortfolioById(portfolioId)

                try {
                    const positionsData = await findMarketPositions(portfolioId)
                    if (cancelled) return
                    setPositions(positionsData)
                } catch (marketError) {
                    let accountingData: PositionResponse[] | null = null
                    try { accountingData = await findPositions(portfolioId) } catch { /* Keep absence explicit. */ }
                    if (cancelled) return
                    setAccounting(accountingData)
                    setMarketIssue(dashboardErrorMessage(marketError))
                }
                if (!cancelled) setPortfolio(portfolioData)
            } catch (error) {
                console.error(
                    'Erro ao carregar carteira:',
                    error,
                )
                if (!cancelled) setError(dashboardErrorMessage(error))
            }
        }

        loadPortfolio()
        return () => { cancelled = true }
    }, [id])

    function formatCurrency(value: number | null) {
        if (value === null) return 'Indisponível'
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        })
    }

    function formatPercent(value: number | null) {
        if (value === null) return 'Indisponível'
        return `${value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}%`
    }

    function formatQuantity(value: number) {
        return value.toLocaleString('pt-BR', {
            maximumFractionDigits: 8,
        })
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">
                {error ? (<p role="alert">{error}</p>) : portfolio === null ? (
                    <p>Carregando carteira...</p>
                ) : (
                    <>
                        <div className="portfolio-details-heading">
                            <div>
                                <h1>{portfolio.name}</h1>
                                <p>{portfolio.description}</p>
                            </div>
                        </div>

                        <section className="dashboard-card">
                            <h2>Posições da carteira</h2>
                            {summarizeValuations(positions).partial && <p>Patrimônio parcialmente avaliado. Posições sem preço mantêm seu custo contábil.</p>}

                            {marketIssue ? <>
                                <p role="alert">{marketIssue}</p>
                                <p>Preço atual, valor de mercado e rentabilidade: indisponíveis.</p>
                                {accounting === null ? <p>Dados contábeis indisponíveis.</p> : accounting.length === 0
                                    ? <p>Nenhuma posição contábil encontrada.</p>
                                    : accounting.map(position => <article key={position.assetId} className="position-card">
                                        <h3>{position.assetTicker}</h3>
                                        <p>Quantidade: {formatQuantity(position.quantity)}</p>
                                        <p>Preço médio: {formatCurrency(position.averagePrice)}</p>
                                        <p>Custo total: {formatCurrency(position.totalCost)}</p>
                                    </article>)}
                            </> : positions.length === 0 ? (
                                <p>Nenhuma posição encontrada.</p>
                            ) : (
                                <div className="positions-grid">
                                    {positions.map((position) => {
                                        const isPositive =
                                            position.profitLoss !== null && position.profitLoss >= 0

                                        return (
                                            <article
                                                key={position.assetId}
                                                className="position-card"
                                            >
                                                <div className="position-card-header">
                                                    <div>
                                                        <span className="position-label">
                                                            Ativo
                                                        </span>

                                                        <h3>
                                                            {position.assetTicker}
                                                        </h3>
                                                    </div>

                                                    <div className="position-profit">
                                                        <span>
                                                            Rentabilidade
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
                                                            {formatPercent(
                                                                position.profitabilityPercent,
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <ValuationDetails position={position} />
                                                {(position.assetType === 'FIXED_INCOME' || position.assetType === 'TREASURE') && <ValuationContractForm
                                                    portfolioId={Number(id)} assetId={position.assetId} assetType={position.assetType}
                                                    onSaved={async () => setPositions(await findMarketPositions(Number(id)))} />}
                                                <div className="position-metrics">
                                                    <div className="position-metric">
                                                        <span>
                                                            Quantidade
                                                        </span>

                                                        <strong>
                                                            {formatQuantity(
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
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </>
    )
}

export default PortfolioDetailsPage