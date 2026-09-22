export interface PortfolioReturnSeriesPoint {
    date: string;
    dailyReturn: number;
    cumulativeReturn: number;
}

export interface PortfolioReturnResponse {
    portfolioId: number;
    startDate: string;
    endDate: string;
    totalReturn: number;
    points: PortfolioReturnSeriesPoint[];
}