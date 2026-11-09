export interface PositionResponse {
    assetId: number
    assetTicker: string
    quantity: number
    averagePrice: number
    totalCost: number
}

export interface PositionMarketResponse {
    assetId: number
    assetTicker: string
    quantity: number
    averagePrice: number
    totalCost: number

    assetType?: import('./asset').AssetType
    valuationStatus?: 'AVAILABLE' | 'ESTIMATED' | 'UNAVAILABLE'
    valuationMethod?: 'MARKET' | 'CONTRACTUAL' | null
    referenceTime?: string | null
    source?: string | null
    reason?: string | null
    netValue?: number | null
    currentPrice: number | null
    currentValue: number | null
    profitLoss: number | null
    profitabilityPercent: number | null
}