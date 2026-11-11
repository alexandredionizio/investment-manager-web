import api from './api'
import type { B3ExpectedIncomePreviewResponse, B3ExpectedIncomeReconciliationResponse, B3ExpectedIncomeCommitResponse } from '../types/b3ExpectedIncome'
const endpoint = () => {
  const base = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
  return `${base.replace(/\/api(?:\/v\d+)?$/i, '')}/api/imports/b3/expected-incomes`
}
const dataWithFile = (file: File) => { const data = new FormData(); data.append('file', file); return data }
export async function previewB3ExpectedIncomes(file: File): Promise<B3ExpectedIncomePreviewResponse> {
  return (await api.post<B3ExpectedIncomePreviewResponse>(`${endpoint()}/preview`, dataWithFile(file))).data
}
export async function reconcileB3ExpectedIncomes(file: File, portfolioId: number): Promise<B3ExpectedIncomeReconciliationResponse> {
  return (await api.post<B3ExpectedIncomeReconciliationResponse>(`${endpoint()}/reconcile?portfolioId=${encodeURIComponent(portfolioId)}`, dataWithFile(file))).data
}
export async function commitB3ExpectedIncomes(file: File, portfolioId: number, excelRows: number[]): Promise<B3ExpectedIncomeCommitResponse> {
  const data = dataWithFile(file)
  data.append('decisions', JSON.stringify({ confirmed: true, entries: excelRows.map(excelRow => ({ excelRow })) }))
  return (await api.post<B3ExpectedIncomeCommitResponse>(`${endpoint()}/commit?portfolioId=${encodeURIComponent(portfolioId)}`, data)).data
}
