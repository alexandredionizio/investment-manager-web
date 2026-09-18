import api from './api'

import type {
    PortfolioHistoryPeriod,
    PortfolioHistoryResponse,
} from '../types/portfolioHistory'

export async function findPortfolioHistory(
    portfolioId: number,
    period: PortfolioHistoryPeriod,
    startDate?: string,
    endDate?: string,
): Promise<PortfolioHistoryResponse> {

    const params: {
        period: PortfolioHistoryPeriod
        startDate?: string
        endDate?: string
    } = {
        period,
    }

    if (period === 'CUSTOM') {
        params.startDate = startDate
        params.endDate = endDate
    }

    const response =
        await api.get<PortfolioHistoryResponse>(
            `/portfolios/${portfolioId}/history`,
            {
                params,
            },
        )

    return response.data
}