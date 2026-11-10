import api from './api'
import type {
    TransactionRequest,
    TransactionResponse,
} from '../types/transaction'

export async function createTransaction(
    data: TransactionRequest,
): Promise<TransactionResponse> {
    const response = await api.post<TransactionResponse>(
        '/transactions',
        data,
    )

    return response.data
}

export async function findTransactionsByPortfolio(
    portfolioId: number,
): Promise<TransactionResponse[]> {
    const response = await api.get<TransactionResponse[]>(
        `/transactions/portfolio/${portfolioId}`,
    )

    return response.data
}

export async function deleteManualTransaction(transactionId: number): Promise<void> {
    await api.delete(`/transactions/${transactionId}`)
}

export interface B3Reversal {
    transactionId: number
    batchId: number
    excelRow: number
    reason: string
    reversedAt: string
}

function b3Endpoint(suffix: string): string {
    const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
    const root = base.replace(/\/api(?:\/v\d+)?$/i, '')
    return `${root}/api/imports/b3/${suffix}`
}

export async function findB3LinkedTransactions(portfolioId: number): Promise<number[]> {
    const response = await api.get<number[]>(b3Endpoint('linked-transactions'), { params: { portfolioId } })
    return response.data
}

export async function findB3Reversals(portfolioId: number): Promise<B3Reversal[]> {
    const response = await api.get<B3Reversal[]>(b3Endpoint('reversals'), { params: { portfolioId } })
    return response.data
}

export async function reverseB3Transaction(transactionId: number, reason: string): Promise<B3Reversal> {
    const response = await api.post<B3Reversal>(b3Endpoint(`reversals/${transactionId}`), {
        reason, confirmed: true,
    })
    return response.data
}
