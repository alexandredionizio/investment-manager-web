import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { findAllPortfolios } from '../services/portfolioService'
import { findAllAssets } from '../services/assetService'
import {
    createIncome,
    findAllIncomes,
} from '../services/incomeService'
import type { PortfolioResponse } from '../types/portfolio'
import type { AssetResponse } from '../types/asset'
import type {
    IncomeResponse,
    IncomeType,
} from '../types/income'

function IncomesPage() {
    const [incomes, setIncomes] =
        useState<IncomeResponse[]>([])

    const [portfolios, setPortfolios] =
        useState<PortfolioResponse[]>([])

    const [assets, setAssets] =
        useState<AssetResponse[]>([])

    const [portfolioId, setPortfolioId] =
        useState('')

    const [assetId, setAssetId] =
        useState('')

    const [type, setType] =
        useState<IncomeType>('DIVIDEND')

    const [amountPerUnit, setAmountPerUnit] =
        useState('')

    const [quantity, setQuantity] =
        useState('')

    const [paymentDate, setPaymentDate] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [error, setError] =
        useState('')

    useEffect(() => {
        async function loadPageData() {
            try {
                const [
                    incomesData,
                    portfoliosData,
                    assetsData,
                ] = await Promise.all([
                    findAllIncomes(),
                    findAllPortfolios(),
                    findAllAssets(),
                ])

                setIncomes(incomesData)
                setPortfolios(portfoliosData)
                setAssets(assetsData)
            } catch (error) {
                console.error(
                    'Erro ao carregar dados de proventos:',
                    error,
                )

                setError(
                    'Não foi possível carregar os dados.',
                )
            } finally {
                setLoading(false)
            }
        }

        loadPageData()
    }, [])

    async function reloadIncomes() {
        const data = await findAllIncomes()
        setIncomes(data)
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        setError('')

        if (
            !portfolioId ||
            !assetId ||
            !amountPerUnit ||
            !quantity ||
            !paymentDate
        ) {
            setError(
                'Preencha todos os campos do provento.',
            )
            return
        }

        try {
            setSaving(true)

            await createIncome({
                portfolioId: Number(portfolioId),
                assetId: Number(assetId),
                type,
                amountPerUnit: Number(amountPerUnit),
                quantity: Number(quantity),
                paymentDate,
            })

            await reloadIncomes()

            setAssetId('')
            setAmountPerUnit('')
            setQuantity('')
            setPaymentDate('')
            setType('DIVIDEND')
        } catch (error) {
            console.error(
                'Erro ao cadastrar provento:',
                error,
            )

            setError(
                'Não foi possível cadastrar o provento.',
            )
        } finally {
            setSaving(false)
        }
    }

    function formatCurrency(value: number) {
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

    function formatDate(date: string) {
        return new Date(
            `${date}T00:00:00`,
        ).toLocaleDateString('pt-BR')
    }

    function formatIncomeType(type: IncomeType) {
        switch (type) {
            case 'DIVIDEND':
                return 'Dividendo'

            case 'JCP':
                return 'JCP'

            case 'FII_INCOME':
                return 'Rendimento FII'
        }
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">
                <div className="page-heading">
                    <h1>Proventos</h1>

                    <p>
                        Acompanhe os proventos dos seus
                        investimentos.
                    </p>
                </div>

                <section className="dashboard-card">
                    <div className="income-section-header">
                        <div>
                            <h2>Novo provento</h2>
                            <p>
                                Registre dividendos, JCP e
                                rendimentos recebidos.
                            </p>
                        </div>
                    </div>

                    <form
                        className="income-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="income-form-field">
                            <label htmlFor="portfolio">
                                Carteira
                            </label>

                            <select
                                id="portfolio"
                                value={portfolioId}
                                onChange={(event) =>
                                    setPortfolioId(
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">
                                    Selecione uma carteira
                                </option>

                                {portfolios.map((portfolio) => (
                                    <option
                                        key={portfolio.id}
                                        value={portfolio.id}
                                    >
                                        {portfolio.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="income-form-field">
                            <label htmlFor="asset">
                                Ativo
                            </label>

                            <select
                                id="asset"
                                value={assetId}
                                onChange={(event) =>
                                    setAssetId(
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">
                                    Selecione um ativo
                                </option>

                                {assets.map((asset) => (
                                    <option
                                        key={asset.id}
                                        value={asset.id}
                                    >
                                        {asset.ticker}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="income-form-field">
                            <label htmlFor="income-type">
                                Tipo
                            </label>

                            <select
                                id="income-type"
                                value={type}
                                onChange={(event) =>
                                    setType(
                                        event.target
                                            .value as IncomeType,
                                    )
                                }
                            >
                                <option value="DIVIDEND">
                                    Dividendo
                                </option>

                                <option value="JCP">
                                    JCP
                                </option>

                                <option value="FII_INCOME">
                                    Rendimento FII
                                </option>
                            </select>
                        </div>

                        <div className="income-form-field">
                            <label htmlFor="amount-per-unit">
                                Valor por unidade
                            </label>

                            <input
                                id="amount-per-unit"
                                type="number"
                                min="0"
                                step="0.00000001"
                                value={amountPerUnit}
                                onChange={(event) =>
                                    setAmountPerUnit(
                                        event.target.value,
                                    )
                                }
                                placeholder="Ex.: 1,25"
                            />
                        </div>

                        <div className="income-form-field">
                            <label htmlFor="quantity">
                                Quantidade
                            </label>

                            <input
                                id="quantity"
                                type="number"
                                min="0"
                                step="0.00000001"
                                value={quantity}
                                onChange={(event) =>
                                    setQuantity(
                                        event.target.value,
                                    )
                                }
                                placeholder="Ex.: 100"
                            />
                        </div>

                        <div className="income-form-field">
                            <label htmlFor="payment-date">
                                Data de pagamento
                            </label>

                            <input
                                id="payment-date"
                                type="date"
                                value={paymentDate}
                                onChange={(event) =>
                                    setPaymentDate(
                                        event.target.value,
                                    )
                                }
                            />
                        </div>

                        {error && (
                            <div className="income-form-error">
                                {error}
                            </div>
                        )}

                        <div className="income-form-actions">
                            <button
                                type="submit"
                                disabled={saving}
                            >
                                {saving
                                    ? 'Salvando...'
                                    : 'Cadastrar provento'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="dashboard-card">
                    <div className="income-section-header">
                        <div>
                            <h2>Histórico de proventos</h2>
                            <p>
                                Consulte os rendimentos já
                                registrados na carteira.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p>Carregando proventos...</p>
                    ) : incomes.length === 0 ? (
                        <p>Nenhum provento encontrado.</p>
                    ) : (
                        <div className="table-container">
                            <table className="transactions-table">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Ativo</th>
                                    <th>Tipo</th>
                                    <th>Quantidade</th>
                                    <th>
                                        Valor por unidade
                                    </th>
                                    <th>Valor total</th>
                                </tr>
                                </thead>

                                <tbody>
                                {incomes.map((income) => (
                                    <tr key={income.id}>
                                        <td>
                                            {formatDate(
                                                income.paymentDate,
                                            )}
                                        </td>

                                        <td className="ticker">
                                            {income.assetTicker}
                                        </td>

                                        <td>
                                                <span className="income-type">
                                                    {formatIncomeType(
                                                        income.type,
                                                    )}
                                                </span>
                                        </td>

                                        <td>
                                            {formatQuantity(
                                                income.quantity,
                                            )}
                                        </td>

                                        <td>
                                            {formatCurrency(
                                                income.amountPerUnit,
                                            )}
                                        </td>

                                        <td>
                                            <strong className="positive">
                                                {formatCurrency(
                                                    income.totalAmount,
                                                )}
                                            </strong>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </>
    )
}

export default IncomesPage