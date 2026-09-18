export type PortfolioHistoryPeriod =
    | 'ONE_MONTH'
    | 'THREE_MONTHS'
    | 'SIX_MONTHS'
    | 'ONE_YEAR'
    | 'TWO_YEARS'
    | 'FIVE_YEARS'
    | 'TEN_YEARS'
    | 'ALL'
    | 'CUSTOM'

export type PortfolioHistoryGranularity =
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'

export interface PortfolioHistoryPoint {
    date: string
    value: number
}

export interface PortfolioHistoryResponse {
    portfolioId: number
    period: PortfolioHistoryPeriod
    startDate: string
    endDate: string
    granularity: PortfolioHistoryGranularity
    points: PortfolioHistoryPoint[]
}