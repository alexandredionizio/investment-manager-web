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