import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

import Header from '../components/Header'
import { downloadCsv } from '../utils/csvExport'
import { findAllPortfolios } from '../services/portfolioService'
import InstrumentPicker from '../components/InstrumentPicker'
import { createPurchase } from '../services/instrumentService'
import type { InstrumentSelection } from '../services/instrumentService'
import { findAllBrokers } from '../services/brokerService'
import {
    createTransaction,
    deleteManualTransaction,
    findB3LinkedTransactions,
    findB3Reversals,
    reverseB3Transaction,
    findTransactionsByPortfolio,
} from '../services/transactionService'

import type { B3Reversal } from '../services/transactionService'
import type { PortfolioResponse } from '../types/portfolio'
import type { BrokerResponse } from '../types/broker'
import type {
    TransactionResponse,
    TransactionType,
} from '../types/transaction'

interface ApiErrorResponse {
    status: number
    error: string
    message: string
}

function TransactionsPage() {
    const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
    const [transactions, setTransactions] = useState<TransactionResponse[]>([])
    const [b3LinkedIds, setB3LinkedIds] = useState<number[]>([])
    const [b3Reversals, setB3Reversals] = useState<B3Reversal[]>([])
    const [historyError, setHistoryError] = useState('')
    const [instrument, setInstrument] = useState<InstrumentSelection | null>(null)
    const [optionsVersion, setOptionsVersion] = useState(0)
    const historyVersion = useRef(0)
    const [brokers, setBrokers] = useState<BrokerResponse[]>([])

    const [selectedPortfolioId, setSelectedPortfolioId] =
        useState<number | null>(null)

    const [transactionPortfolioId, setTransactionPortfolioId] = useState('')
    const [brokerId, setBrokerId] = useState('')
    const [transactionType, setTransactionType] =
        useState<TransactionType>('BUY')
    const [quantity, setQuantity] = useState('')
    const [unitPrice, setUnitPrice] = useState('')
    const [transactionDate, setTransactionDate] = useState('')

    const [transactionMessage, setTransactionMessage] = useState('')
    const [transactionLoading, setTransactionLoading] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    useEffect(() => {
        async function loadInitialData() {
            try {
                const [
                    portfoliosData,
                    brokersData,
                ] = await Promise.all([
                    findAllPortfolios(),
                    findAllBrokers(),
                ])

                setPortfolios(portfoliosData)
                setBrokers(brokersData)
            } catch {
                setTransactionMessage('Não foi possível carregar carteiras e corretoras.')
            }
        }

        loadInitialData()
    }, [])

    async function loadTransactions(portfolioId: number) {
        const version = ++historyVersion.current
        try {
            const [data, linked, audit] = await Promise.all([
                findTransactionsByPortfolio(portfolioId),
                findB3LinkedTransactions(portfolioId),
                findB3Reversals(portfolioId),
            ])
            if (version !== historyVersion.current) return
            setSelectedPortfolioId(portfolioId)
            setTransactions(data)
            setB3LinkedIds(linked)
            setB3Reversals(audit)
            setHistoryError('')
        } catch {
            if (version === historyVersion.current) {
                setHistoryError('Não foi possível carregar histórico ou auditoria B3. Tente novamente.');
            }
        }
    }

    function handlePortfolioChange(portfolioId: string) {
        historyVersion.current++
        setInstrument(null)
        setSelectedPortfolioId(null)
        setTransactions([])
        setB3LinkedIds([])
        setB3Reversals([])
        setHistoryError('')
        setTransactionPortfolioId(portfolioId)
        setTransactionMessage('')

        if (!portfolioId) {
            setSelectedPortfolioId(null)
            setTransactions([])
            return
        }

        loadTransactions(Number(portfolioId))
    }

    async function handleCreateTransaction(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (!instrument) { setTransactionMessage('Selecione um instrumento elegível.'); return }
        setTransactionMessage('')
        setTransactionLoading(true)

        try {
            const portfolioIdNumber =
                Number(transactionPortfolioId)

            const data = {
                portfolioId: portfolioIdNumber,
                brokerId: Number(brokerId),
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
                transactionDate,
            }
            if (transactionType === 'BUY' && 'ticker' in instrument) {
                await createPurchase({ ...data, ticker: instrument.ticker })
            } else if ('assetId' in instrument) {
                await createTransaction({ ...data, assetId: instrument.assetId, type: transactionType })
            } else { throw new Error('Seleção incompatível') }
            setInstrument(null)
            setOptionsVersion(version => version + 1)

            setTransactionMessage(
                'Transação registrada com sucesso.',
            )

            setQuantity('')
            setUnitPrice('')

            await loadTransactions(portfolioIdNumber)
        } catch (error) {
            if (axios.isAxiosError<ApiErrorResponse>(error)) {
                const apiMessage =
                    error.response?.data?.message

                if (apiMessage) {
                    setTransactionMessage(apiMessage)
                } else {
                    setTransactionMessage(
                        'Não foi possível registrar a transação.',
                    )
                }
            } else {
                setTransactionMessage(
                    'Não foi possível registrar a transação.',
                )
            }
        } finally {
            setTransactionLoading(false)
        }
    }

    async function handleDeleteTransaction(transaction: TransactionResponse) {
        const portfolioId = selectedPortfolioId
        if (portfolioId === null || deletingId !== null || transactionLoading) return
        const confirmed = window.confirm(
            `Excluir a ${transaction.type === 'BUY' ? 'compra' : 'venda'} de ${formatNumber(transaction.quantity)} ${transaction.assetTicker}, em ${formatDate(transaction.transactionDate)}?\n\n` +
            'A exclusão é definitiva. O backend verificará vendas posteriores, proventos e importações B3 antes de autorizar.',
        )
        if (!confirmed) return
        setDeletingId(transaction.id)
        setTransactionMessage('')
        try {
            await deleteManualTransaction(transaction.id)
            await loadTransactions(portfolioId)
            setOptionsVersion(version => version + 1)
            setTransactionMessage('Transação excluída com sucesso.')
        } catch (error) {
            if (axios.isAxiosError<ApiErrorResponse>(error)) {
                setTransactionMessage(error.response?.data?.message ||
                    'Exclusão não autorizada. Confira se a operação veio da B3 ou afeta saldos e proventos.')
            } else {
                setTransactionMessage('Não foi possível excluir a transação.')
            }
        } finally {
            setDeletingId(null)
        }
    }

    async function handleReverseB3(transaction: TransactionResponse) {
        const portfolioId = selectedPortfolioId
        if (portfolioId === null || deletingId !== null || transactionLoading) return
        const reason = window.prompt(
            `Motivo do estorno auditável da operação B3 ${transaction.id} (${transaction.assetTicker}):\n\nO lançamento original permanecerá registrado no lote B3.`,
            '',
        )
        if (reason === null) return
        if (reason.trim().length < 10 || reason.trim().length > 500) {
            setTransactionMessage('Informe um motivo de 10 a 500 caracteres para estornar.'); return
        }
        if (!window.confirm(`Confirmar estorno de ${transaction.assetTicker}? A posição será recalculada, e o lançamento original permanecerá na auditoria B3.`)) return
        setDeletingId(transaction.id)
        setTransactionMessage('')
        try {
            await reverseB3Transaction(transaction.id, reason.trim())
            await loadTransactions(portfolioId)
            setOptionsVersion(version => version + 1)
            setTransactionMessage('Operação B3 estornada com registro de auditoria.')
        } catch (error) {
            if (axios.isAxiosError<ApiErrorResponse>(error)) {
                setTransactionMessage(error.response?.data?.message ||
                    'Estorno recusado: verifique vendas posteriores e proventos.')
            } else {
                setTransactionMessage('Não foi possível realizar o estorno.')
            }
        } finally { setDeletingId(null) }
    }

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

    function formatDate(date: string) {
        const [year, month, day] = date.split('-')

        return `${day}/${month}/${year}`
    }

    return (
        <>
            <Header />

            <main>
                <h1>Transações</h1>

                <p>
                    Consulte e registre suas movimentações.
                </p>

                <section>
                    <h2>Carteira</h2>

                    <div>
                        <label htmlFor="transactionPortfolio">
                            Selecione a carteira
                        </label>

                        <select
                            id="transactionPortfolio"
                            disabled={deletingId !== null}
                            value={transactionPortfolioId}
                            onChange={(event) =>
                                handlePortfolioChange(
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
                </section>

                {selectedPortfolioId !== null && (
                    <section>
                        <h2>Histórico de transações</h2>
                        <button type="button"
                            disabled={transactions.length === 0 || Boolean(historyError)}
                            onClick={() => downloadCsv(
                                `transacoes-${selectedPortfolioId}-${new Date().toISOString().slice(0, 10)}.csv`,
                                ['Data', 'Ativo', 'Tipo', 'Corretora', 'Quantidade', 'Preço unitário', 'Valor bruto'],
                                transactions.map(t => [
                                    t.transactionDate, t.assetTicker, t.type === 'BUY' ? 'Compra' : 'Venda',
                                    t.brokerName, t.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 }),
                                    t.unitPrice.toLocaleString('pt-BR', { maximumFractionDigits: 8 }),
                                    (t.quantity * t.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                ])
                            )}>Exportar transações (CSV)</button>
                        <p>Exclusão disponível somente para lançamentos manuais que não comprometam o histórico. Registros da B3 exigem correção auditável.</p>
                        {transactionMessage && <p role="status">{transactionMessage}</p>}
                        {historyError && <p role="alert">{historyError}</p>}

                        {transactions.length === 0 ? (
                            <p>
                                Nenhuma transação encontrada.
                            </p>
                        ) : (
                            <div className="table-container">
                                <table className="transactions-table">
                                    <thead>
                                    <tr>
                                        <th>Ativo</th>
                                        <th>Tipo</th>
                                        <th>Corretora</th>
                                        <th>Quantidade</th>
                                        <th>
                                            Preço unitário
                                        </th>
                                        <th>Data</th>
                                        <th>Ações</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {transactions.map(
                                        (transaction) => (
                                            <tr
                                                key={
                                                    transaction.id
                                                }
                                            >
                                                <td className="ticker">
                                                    {
                                                        transaction.assetTicker
                                                    }
                                                </td>

                                                <td>
                                                        <span
                                                            className={
                                                                transaction.type ===
                                                                'BUY'
                                                                    ? 'transaction-type buy'
                                                                    : 'transaction-type sell'
                                                            }
                                                        >
                                                            {transaction.type ===
                                                            'BUY'
                                                                ? 'Compra'
                                                                : 'Venda'}
                                                        </span>
                                                </td>

                                                <td>
                                                    {
                                                        transaction.brokerName
                                                    }
                                                </td>

                                                <td>
                                                    {formatNumber(
                                                        transaction.quantity,
                                                    )}
                                                </td>

                                                <td>
                                                    {formatCurrency(
                                                        transaction.unitPrice,
                                                    )}
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        transaction.transactionDate,
                                                    )}
                                                </td>
                                                <td>
                                                    {b3LinkedIds.includes(transaction.id) ? (
                                                        <button type="button"
                                                            disabled={deletingId !== null || transactionLoading}
                                                            aria-label={`Estornar B3 transação ${transaction.id} de ${transaction.assetTicker}`}
                                                            onClick={() => void handleReverseB3(transaction)}>
                                                            {deletingId === transaction.id ? 'Estornando...' : 'Estornar B3'}
                                                        </button>
                                                    ) : (
                                                        <button type="button"
                                                            disabled={deletingId !== null || transactionLoading}
                                                            aria-label={`Excluir transação ${transaction.id} de ${transaction.assetTicker}`}
                                                            onClick={() => void handleDeleteTransaction(transaction)}>
                                                            {deletingId === transaction.id ? 'Excluindo...' : 'Excluir'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {b3Reversals.length > 0 && (
                            <div>
                                <h3>Auditoria de estornos B3</h3>
                                <p>Operações estornadas não entram nos saldos, mas permanecem vinculadas ao lote e à linha originais.</p>
                                <ul>
                                    {b3Reversals.map(r => (
                                        <li key={r.transactionId}>
                                            Transação #{r.transactionId} — lote #{r.batchId}, linha {r.excelRow} — {r.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                )}

                <section>
                    <h2>Nova transação</h2>

                    <form onSubmit={handleCreateTransaction}>
                        <fieldset disabled={transactionLoading}>
                        <InstrumentPicker key={[transactionPortfolioId, transactionDate, transactionType, optionsVersion].join(':')}
                            type={transactionType} portfolioId={transactionPortfolioId} date={transactionDate} onChange={setInstrument} />

                        <div>
                            <label htmlFor="broker">
                                Corretora
                            </label>

                            <select
                                id="broker"
                                value={brokerId}
                                onChange={(event) =>
                                    setBrokerId(
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">
                                    Selecione uma corretora
                                </option>

                                {brokers.map((broker) => (
                                    <option
                                        key={broker.id}
                                        value={broker.id}
                                    >
                                        {broker.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="transactionType">
                                Tipo
                            </label>

                            <select
                                id="transactionType"
                                value={transactionType}
                                onChange={(event) => { setInstrument(null); setTransactionType(event.target.value as TransactionType) }}
                            >
                                <option value="BUY">
                                    Compra
                                </option>

                                <option value="SELL">
                                    Venda
                                </option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="quantity">
                                Quantidade
                            </label>

                            <input
                                id="quantity"
                                type="number"
                                min="0"
                                step="any"
                                value={quantity}
                                onChange={(event) =>
                                    setQuantity(
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="unitPrice">
                                Preço unitário
                            </label>

                            <input
                                id="unitPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitPrice}
                                onChange={(event) =>
                                    setUnitPrice(
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="transactionDate">
                                Data
                            </label>

                            <input
                                id="transactionDate"
                                type="date"
                                value={transactionDate}
                                onChange={(event) => { setInstrument(null); setTransactionDate(event.target.value) }}
                                required
                            />
                        </div>

                        </fieldset>
                        <button
                            type="submit"
                            disabled={
                                transactionLoading ||
                                !transactionPortfolioId || !instrument
                            }
                        >
                            {transactionLoading
                                ? 'Registrando...'
                                : 'Registrar transação'}
                        </button>

                    </form>
                </section>
            </main>
        </>
    )
}

export default TransactionsPage