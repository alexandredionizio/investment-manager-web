import api from './api'

import type {
    BenchmarkComparisonPointResponse,
} from '../types/benchmarkComparison'

import type {
    PortfolioHistoryPeriod,
} from '../types/portfolioHistory'

export async function findBenchmarkComparison(
    portfolioId: number,
    period: PortfolioHistoryPeriod,
    startDate?: string,
    endDate?: string,
): Promise<BenchmarkComparisonPointResponse[]> {

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
        await api.get<BenchmarkComparisonPointResponse[]>(
            `/portfolios/${portfolioId}/benchmark-comparison`,
            {
                params,
            },
        )

    return response.data
}
