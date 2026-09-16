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

    currentPrice: number
    currentValue: number
    profitLoss: number
    profitabilityPercent: number
}