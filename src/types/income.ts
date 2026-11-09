export type IncomeType =
    | 'DIVIDEND'
    | 'JCP'
    | 'FII_INCOME'

export interface IncomeRequest {
    portfolioId: number
    assetId: number
    type: IncomeType
    amountPerUnit: number
    baseDate: string
    paymentDate: string
}

export interface IncomeResponse {
    id: number
    portfolioId: number
    assetId: number
    assetTicker: string
    type: IncomeType
    amountPerUnit: number
    quantity: number
    received: boolean
    totalAmount: number
    baseDate: string
    paymentDate: string
}