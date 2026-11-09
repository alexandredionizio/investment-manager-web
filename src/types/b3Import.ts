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

/** Resultado somente de consulta: NÃO representa elegibilidade para gravar operações. */
export type B3MatchRow = {
  excelRow: number
  ticker: string
  institution: string
  assetStatus: string
  assetId: number | null
  brokerStatus: string
  brokerId: number | null
  brokerSuggestions: B3BrokerOption[]
  messages: string[]
}

export type B3MatchResponse = {
  fileName: string
  totalRows: number
  matchedRows: number
  reviewRows: number
  invalidRows: number
  rows: B3MatchRow[]
}

export type B3BrokerOption = {
  id: number
  name: string
}

export type B3BrokerAliasResponse = {
  institution: string
  brokerId: number
  brokerName: string
}

export type B3BrokerRegistrationResponse = {
  institution: string
  brokerId: number
  brokerName: string
}

export type B3AssetCandidate = {
  ticker: string
  name: string
  type: 'STOCK' | 'FII' | 'ETF'
  exchange: string
  assetId: number | null
  requiresReview: boolean
}

export type B3AssetRegistrationResponse = {
  ticker: string
  assetId: number
  created: boolean
}
