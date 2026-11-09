import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

import Header from '../components/Header'
import { findAllPortfolios } from '../services/portfolioService'
import InstrumentPicker from '../components/InstrumentPicker'
import { createPurchase } from '../services/instrumentService'
import type { InstrumentSelection } from '../services/instrumentService'
import { findAllBrokers } from '../services/brokerService'
import {
    createTransaction,
    findTransactionsByPortfolio,
} from '../services/transactionService'

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
            const data =
                await findTransactionsByPortfolio(portfolioId)
            if (version !== historyVersion.current) return

            setSelectedPortfolioId(portfolioId)
            setTransactions(data)
        } catch {
            if (version === historyVersion.current) setTransactionMessage('Não foi possível carregar o histórico.')
        }
    }

    function handlePortfolioChange(portfolioId: string) {
        historyVersion.current++
        setInstrument(null)
        setSelectedPortfolioId(null)
        setTransactions([])
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
                                            </tr>
                                        ),
                                    )}
                                    </tbody>
                                </table>
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

                        {transactionMessage && (
                            <p>{transactionMessage}</p>
                        )}
                    </form>
                </section>
            </main>
        </>
    )
}

export default TransactionsPage