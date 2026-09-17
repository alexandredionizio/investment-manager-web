import api from './api'
import type { RealizedResultResponse } from '../types/realizedResult'

export async function findRealizedResultsByPortfolio(
    portfolioId: number,
): Promise<RealizedResultResponse[]> {

    const response =
        await api.get<RealizedResultResponse[]>(
            `/portfolios/${portfolioId}/realized-results`,
        )

    return response.data
}