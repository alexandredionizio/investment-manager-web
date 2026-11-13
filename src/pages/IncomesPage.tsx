import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import Header from '../components/Header'
import { csvExportFilename, downloadCsv } from '../utils/csvExport'
import { calculateIncomeMetrics } from '../utils/incomeMetrics'
import { findAllPortfolios } from '../services/portfolioService'
import { findAllAssets } from '../services/assetService'
import {
    createIncome,
    findAllIncomes,
} from '../services/incomeService'
import type { PortfolioResponse } from '../types/portfolio'
import type { AssetResponse } from '../types/asset'
import { findExpectedIncomesByPortfolio } from '../services/expectedIncomeQueryService'
import type { ExpectedIncomeRecord } from '../services/expectedIncomeQueryService'
import type {
    IncomeResponse,
    IncomeType,
} from '../types/income'

interface ApiErrorResponse {
    status: number
    error: string
    message: string
}

function IncomesPage() {
    const [incomes, setIncomes] =
        useState<IncomeResponse[]>([])

    const [portfolios, setPortfolios] =
        useState<PortfolioResponse[]>([])

    const [assets, setAssets] =
        useState<AssetResponse[]>([])

    const [portfolioId, setPortfolioId] =
        useState('')

    const [historyPortfolioId, setHistoryPortfolioId] = useState('')
    const [historyFilter, setHistoryFilter] = useState<'all' | 'received' | 'expected'>('all')
    const [expected, setExpected] = useState<ExpectedIncomeRecord[]>([])
    const [expectedLoading, setExpectedLoading] = useState(true)
    const [expectedError, setExpectedError] = useState(false)

    const [assetId, setAssetId] =
        useState('')

    const [type, setType] =
        useState<IncomeType>('DIVIDEND')

    const [amountPerUnit, setAmountPerUnit] =
        useState('')

    const [baseDate, setBaseDate] =
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

    useEffect(() => {
        let live = true
        async function loadExpected() {
            setExpectedLoading(true)
            setExpectedError(false)
            try {
                // O histórico existente lista todas as carteiras; seguir esse mesmo escopo.
                const results = await Promise.all(portfolios.map(p => findExpectedIncomesByPortfolio(p.id)))
                if (live) setExpected(results.flat())
            } catch {
                if (live) { setExpected([]); setExpectedError(true) }
            } finally {
                if (live) setExpectedLoading(false)
            }
        }
        if (!loading) void loadExpected()
        return () => { live = false }
    }, [loading, portfolios])

    // Um provento já cadastrado não deve reaparecer como previsão da B3.
    // Usar também carteira, quantidade e valor impede ocultar eventos distintos.
    const expectedNotRegistered = expected.filter(b3 => !incomes.some(income =>
        income.portfolioId === b3.portfolioId &&
        income.assetTicker.toUpperCase() === b3.assetTicker.toUpperCase() &&
        income.type === b3.type &&
        income.paymentDate === b3.expectedPaymentDate &&
        Math.abs(income.quantity - b3.quantity) < 0.00000001 &&
        Math.abs(income.totalAmount - b3.expectedNetAmount) < 0.01
    ))
    const historyItems = [
        ...incomes.map(i => ({
            key: `income-${i.id}`, portfolioId: i.portfolioId, baseDate: i.baseDate, paymentDate: i.paymentDate,
            status: i.received ? 'received' as const : 'expected' as const,
            assetTicker: i.assetTicker, type: i.type, quantity: i.quantity,
            amountPerUnit: i.amountPerUnit, totalAmount: i.totalAmount,
            source: 'income' as const,
        })),
        ...expectedNotRegistered.map(i => ({
            key: `b3-expected-${i.id}`, portfolioId: i.portfolioId, baseDate: null, paymentDate: i.expectedPaymentDate,
            status: 'expected' as const, assetTicker: i.assetTicker, type: i.type,
            quantity: i.quantity,
            amountPerUnit: i.quantity ? i.expectedNetAmount / i.quantity : 0,
            totalAmount: i.expectedNetAmount, source: 'b3-expected' as const,
        })),
    ]
    const displayedItems = historyItems.filter(item =>
        (historyPortfolioId === '' || item.portfolioId === Number(historyPortfolioId)) &&
        (historyFilter === 'all' || item.status === historyFilter)
    )
    // Somente proventos cadastrados como recebidos; previsoes B3 nao sao credito.
    const incomeMetrics = calculateIncomeMetrics(incomes, historyPortfolioId)

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
            !baseDate ||
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
                baseDate,
                paymentDate,
            })

            await reloadIncomes()

            setAssetId('')
            setAmountPerUnit('')
            setBaseDate('')
            setPaymentDate('')
            setType('DIVIDEND')
        } catch (error) {
            console.error(
                'Erro ao cadastrar provento:',
                error,
            )

            if (error instanceof AxiosError) {
                const apiError =
                    error.response?.data as ApiErrorResponse

                if (apiError?.message) {
                    setError(apiError.message)
                    return
                }
            }

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
                                Informe a data-base e o sistema
                                calculará automaticamente a
                                quantidade elegível.
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
                            <label htmlFor="base-date">
                                Data-base
                            </label>

                            <input
                                id="base-date"
                                type="date"
                                value={baseDate}
                                onChange={(event) =>
                                    setBaseDate(
                                        event.target.value,
                                    )
                                }
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
                            <button type="button"
                                disabled={loading || expectedLoading || expectedError || Boolean(error) || displayedItems.length === 0}
                                onClick={() => downloadCsv(
                                    csvExportFilename('proventos', historyPortfolioId ? portfolios.find(p => String(p.id) === historyPortfolioId)?.name ?? 'carteira' : 'todas'),
                                    ['Data-base', 'Pagamento', 'Situação', 'Ativo', 'Tipo', 'Quantidade', 'Valor por unidade', 'Valor total', 'Origem'],
                                    displayedItems.map(i => [
                                        i.baseDate ?? '', i.paymentDate,
                                        i.status === 'received' ? 'Recebido' : 'Previsto',
                                        i.assetTicker, formatIncomeType(i.type),
                                        i.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 }),
                                        i.amountPerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 8, maximumFractionDigits: 8 }),
                                        i.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                        i.source === 'b3-expected' ? 'Previsão B3' : 'Provento cadastrado',
                                    ])
                                )}>Exportar proventos (CSV)</button>
                            <p>
                                Consulte os rendimentos já
                                registrados na carteira.
                            </p>
                        </div>
                        <div className="income-form-field" style={{ minWidth: 185 }}>
                            <label htmlFor="income-history-portfolio">Carteira do histórico</label>
                            <select id="income-history-portfolio" value={historyPortfolioId}
                                onChange={e => setHistoryPortfolioId(e.target.value)}>
                                <option value="">Todas as carteiras</option>
                                {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="income-form-field" style={{ minWidth: 185 }}>
                            <label htmlFor="income-history-filter">Situação</label>
                            <select id="income-history-filter" value={historyFilter}
                                onChange={e => setHistoryFilter(e.target.value as 'all' | 'received' | 'expected')}>
                                <option value="all">Todos</option>
                                <option value="received">Recebidos</option>
                                <option value="expected">Previstos</option>
                            </select>
                        </div>
                    </div>

                    {expectedError && <p role="alert">Previsões B3 indisponíveis. O histórico abaixo pode estar incompleto.</p>}
                    {!loading && !error && (
                        <div className="dashboard-metrics" aria-label="Indicadores de proventos">
                            <article className="dashboard-metric-card">
                                <span>Acumulado recebido</span>
                                <strong>{formatCurrency(incomeMetrics.total)}</strong>
                                <small>Proventos registrados como recebidos</small>
                            </article>
                            <article className="dashboard-metric-card">
                                <span>Recebido nos últimos 12 meses</span>
                                <strong>{formatCurrency(incomeMetrics.last12Total)}</strong>
                            </article>
                            <article className="dashboard-metric-card">
                                <span>Média mensal com recebimentos (12M)</span>
                                <strong>{incomeMetrics.monthsWithReceipts
                                    ? formatCurrency(incomeMetrics.averageActiveMonth)
                                    : 'Sem dados suficientes'}</strong>
                                <small>Considera apenas meses com proventos recebidos</small>
                            </article>
                        </div>
                    )}
                    {loading || expectedLoading ? (
                        <p>Carregando proventos...</p>
                    ) : displayedItems.length === 0 ? (
                        <p>Nenhum provento encontrado para o filtro selecionado.</p>
                    ) : (
                        <div className="table-container">
                            <table className="transactions-table">
                                <thead>
                                <tr>
                                    <th>Data-base</th>
                                    <th>Pagamento</th>
                                    <th>Situação</th>
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
                                {displayedItems.map((income) => (
                                    <tr key={income.key}>
                                        <td>
                                            {income.baseDate
                                                ? formatDate(income.baseDate)
                                                : <span title="Não informada pela B3">—</span>}
                                        </td>

                                        <td>
                                            {formatDate(
                                                income.paymentDate,
                                            )}
                                        </td>

                                        <td>{income.status === 'received' ? 'Recebido' : 'Previsto'}</td>

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