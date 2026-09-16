import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { findPortfolioById } from '../services/portfolioService'
import { findMarketPositions } from '../services/positionService'
import type { PortfolioResponse } from '../types/portfolio'
import type { PositionMarketResponse } from '../types/position'

function PortfolioDetailsPage() {
    const { id } = useParams()

    const [portfolio, setPortfolio] =
        useState<PortfolioResponse | null>(null)

    const [positions, setPositions] =
        useState<PositionMarketResponse[]>([])

    useEffect(() => {
        async function loadPortfolio() {
            if (!id) {
                return
            }

            const portfolioId = Number(id)

            try {
                const portfolioData =
                    await findPortfolioById(portfolioId)

                const positionsData =
                    await findMarketPositions(portfolioId)

                setPortfolio(portfolioData)
                setPositions(positionsData)
            } catch (error) {
                console.error(
                    'Erro ao carregar carteira:',
                    error,
                )
            }
        }

        loadPortfolio()
    }, [id])

    function formatCurrency(value: number) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        })
    }

    function formatPercent(value: number) {
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
                {portfolio === null ? (
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

                            {positions.length === 0 ? (
                                <p>Nenhuma posição encontrada.</p>
                            ) : (
                                <div className="positions-grid">
                                    {positions.map((position) => {
                                        const isPositive =
                                            position.profitLoss >= 0

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
                                                                isPositive
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