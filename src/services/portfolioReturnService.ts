import api from './api'

import type {
    PortfolioReturnResponse,
} from '../types/portfolioReturn'

import type {
    PortfolioHistoryPeriod,
} from '../types/portfolioHistory'

export async function findPortfolioReturns(
    portfolioId: number,
    period: PortfolioHistoryPeriod,
    startDate?: string,
    endDate?: string,
): Promise<PortfolioReturnResponse> {

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
        await api.get<PortfolioReturnResponse>(
            `/portfolios/${portfolioId}/returns`,
            {
                params,
            },
        )

    return response.data
}