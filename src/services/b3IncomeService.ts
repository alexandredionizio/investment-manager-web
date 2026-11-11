import api from './api'
import type { B3IncomePreviewResponse } from '../types/b3Income'

/** Somente prévia. Não cadastra proventos nem altera a carteira. */
export async function previewB3Incomes(file: File): Promise<B3IncomePreviewResponse> {
  const data = new FormData()
  data.append('file', file)
  const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
  const root = base.replace(/\/api(?:\/v\d+)?$/i, '')
  const response = await api.post<B3IncomePreviewResponse>(`${root}/api/imports/b3/incomes/preview`, data)
  return response.data
}

/** Verifica correspondência por carteira e possíveis duplicidades. Nunca persiste. */
export async function reconcileB3Incomes(file: File, portfolioId: number): Promise<import('../types/b3Income').B3IncomeReconciliationResponse> {
  const data = new FormData()
  data.append('file', file)
  data.append('portfolioId', String(portfolioId))
  const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
  const root = base.replace(/\/api(?:\/v\d+)?$/i, '')
  const response = await api.post<import('../types/b3Income').B3IncomeReconciliationResponse>(`${root}/api/imports/b3/incomes/reconcile`, data)
  return response.data
}

/** Reenvia o arquivo ao servidor: valores e status nunca são aceitos do cliente. */
export async function commitB3Incomes(file: File, portfolioId: number,
  entries: import('../types/b3Income').B3IncomeCommitEntry[]): Promise<import('../types/b3Income').B3IncomeCommitResponse> {
  const data = new FormData()
  data.append('file', file)
  data.append('portfolioId', String(portfolioId))
  data.append('decisions', JSON.stringify({ confirmed: true, entries }))
  const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
  const root = base.replace(/\/api(?:\/v\d+)?$/i, '')
  const response = await api.post<import('../types/b3Income').B3IncomeCommitResponse>(`${root}/api/imports/b3/incomes/commit`, data)
  return response.data
}
