import api from './api'
import type {
    PositionMarketResponse,
    PositionResponse,
} from '../types/position'

export async function findPositions(
    portfolioId: number,
): Promise<PositionResponse[]> {
    const response = await api.get<PositionResponse[]>(
        `/portfolios/${portfolioId}/positions`,
    )

    return response.data
}

export async function findMarketPositions(
    portfolioId: number,
): Promise<PositionMarketResponse[]> {
    const response = await api.get<PositionMarketResponse[]>(
        `/portfolios/${portfolioId}/positions/market`,
    )

    return response.data
}