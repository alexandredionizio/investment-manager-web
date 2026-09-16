export type TransactionType = 'BUY' | 'SELL'

export interface TransactionRequest {
    portfolioId: number
    assetId: number
    brokerId: number
    type: TransactionType
    quantity: number
    unitPrice: number
    transactionDate: string
}

export interface TransactionResponse {
    id: number
    portfolioId: number
    assetId: number
    assetTicker: string
    brokerId: number
    brokerName: string
    type: TransactionType
    quantity: number
    unitPrice: number
    transactionDate: string
}