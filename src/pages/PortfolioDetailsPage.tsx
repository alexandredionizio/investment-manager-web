import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/Header'
import ValuationContractForm from '../components/ValuationContractForm'
import { AssetClassFilter } from '../components/AssetClassFilter'
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

    function formatQuantity(value: number) {
        return value.toLocaleString('pt-BR', {
            maximumFractionDigits: 8,
        })
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">
                <Link to="/portfolios" className="portfolio-back-link">
                    <span aria-hidden="true">←</span> Voltar para Carteiras
                </Link>
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
                                    : <div className="asset-class-scroll">
                                        <table className="asset-class-table">
                                            <thead><tr><th>Ativo</th><th>Quantidade</th><th>Preço médio</th><th>Custo total</th></tr></thead>
                                            <tbody>{accounting.map(position => <tr key={position.assetId} className="asset-class-position">
                                                <th scope="row">{position.assetTicker}</th>
                                                <td>{formatQuantity(position.quantity)}</td>
                                                <td>{formatCurrency(position.averagePrice)}</td>
                                                <td>{formatCurrency(position.totalCost)}</td>
                                            </tr>)}</tbody>
                                        </table>
                                    </div>}
                            </> : positions.length === 0 ? (
                                <p>Nenhuma posição encontrada.</p>
                            ) : (
                                <AssetClassFilter
                                    positions={positions}
                                    portfolioId={Number(id)}
                                    renderAssetDetails={position => <ValuationContractForm
                                        portfolioId={Number(id)} assetId={position.assetId} assetType={position.assetType!}
                                        onSaved={async () => setPositions(await findMarketPositions(Number(id)))} />}
                                />
                            )}
                        </section>
                    </>
                )}
            </main>
        </>
    )
}

export default PortfolioDetailsPage