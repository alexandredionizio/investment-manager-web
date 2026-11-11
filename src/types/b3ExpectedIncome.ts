export type B3ExpectedIncomeRow = {
  excelRow: number
  product: string
  eventType: string
  type: 'DIVIDEND' | 'JCP' | 'FII_INCOME'
  expectedPaymentDate: string | null
  institution: string
  account: string
  quantity: number | null
  unitPrice: number | null
  expectedNetAmount: number | null
  errors: string[]
  warnings: string[]
}
export type B3ExpectedIncomePreviewResponse = {
  fileName: string
  totalRows: number
  recognizedRows: number
  skippedRows: number
  rows: B3ExpectedIncomeRow[]
}
export type B3ExpectedIncomeReconciliationResponse = {
  portfolioId: number
  total: number
  ready: number
  blocked: number
  rows: Array<{ excelRow: number; ticker: string | null; assetId: number | null; status: 'READY' | 'BLOCKED'; messages: string[] }>
}
export type B3ExpectedIncomeCommitResponse = { imported: number; totalExpectedNet: number }
