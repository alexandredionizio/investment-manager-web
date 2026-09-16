export type AssetType =
    | 'STOCK'
    | 'FII'
    | 'ETF'
    | 'CRYPTO'
    | 'FIXED_INCOME'
    | 'TREASURE'

export interface AssetResponse {
    id: number
    ticker: string
    name: string
    type: AssetType
    sector: string
    exchange: string
}