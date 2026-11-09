export type B3PreviewRow = {
  excelRow: number
  tradeDate: string | null
  movementType: string
  market: string
  expiry: string
  institution: string
  ticker: string
  quantity: number
  unitPrice: number
  totalValue: number
  errors: string[]
  warnings: string[]
}

export type B3PreviewResponse = {
  fileName: string
  totalRows: number
  validRows: number
  invalidRows: number
  rows: B3PreviewRow[]
}
