import api from './api'
import type { AssetType } from '../types/asset'
import type { TransactionRequest, TransactionResponse } from '../types/transaction'
export interface InstrumentCandidate { ticker: string; name: string; type: AssetType; exchange: string; assetId: number | null; requiresReview: boolean }
export interface InstrumentSearch { items: InstrumentCandidate[]; page: number; hasNextPage: boolean }
export interface SaleOption { assetId: number; ticker: string; name: string; type: AssetType; quantityAtDate: number; chronologicalLimit: number }
export type InstrumentSelection = { ticker: string } | { assetId: number }
export async function searchInstruments(query: string, page: number, signal?: AbortSignal): Promise<InstrumentSearch> {
    return (await api.get<InstrumentSearch>('/assets/search', { params: { query, page, limit: 10 }, signal })).data
}
export async function findSaleOptions(portfolioId: number, date: string, signal?: AbortSignal): Promise<SaleOption[]> {
    return (await api.get<SaleOption[]>('/transactions/portfolio/' + portfolioId + '/sale-options', { params: { date }, signal })).data
}
export async function createPurchase(data: Omit<TransactionRequest, 'assetId' | 'type'> & { ticker: string }): Promise<TransactionResponse> {
    return (await api.post<TransactionResponse>('/transactions/purchases', data)).data
}
