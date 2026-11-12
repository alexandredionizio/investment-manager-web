export type B3IncomeRow = {
  excelRow: number
  paymentDate: string | null
  movement: string
  product: string
  institution: string
  type: 'DIVIDEND' | 'JCP' | 'FII_INCOME'
  quantity: number | null
  unitPrice: number | null
  creditedAmount: number | null
  errors: string[]
  warnings: string[]
}

export type B3SkippedMovement = {
  lineNumber: number
  movement: string
  reason: string
}

export type B3IncomePreviewResponse = {
  fileName: string
  totalRows: number
  incomeRows: number
  skippedRows: number
  skippedDetails?: B3SkippedMovement[]
  rows: B3IncomeRow[]
}

export type B3IncomeReconciliationResponse = {
  portfolioId: number
  total: number
  identified: number
  needsReview: number
  blocked: number
  rows: { excelRow: number; ticker: string | null; assetId: number | null;
    status: 'BLOCKED' | 'READY' | 'POSSIBLE_DUPLICATE' | 'REVIEW_AMOUNT'; messages: string[]; expectedIncomeId?: number | null; expectedAmount?: number | null }[]
}

export type B3IncomeCommitResponse = { imported: number; totalCredited: number; incomeIds: number[] }
export type B3IncomeCommitEntry = { excelRow: number; confirmAmountDifference?: boolean }
