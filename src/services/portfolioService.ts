import api from './api'
import type { PortfolioResponse } from '../types/portfolio'

export async function findAllPortfolios(): Promise<PortfolioResponse[]> {
    const response = await api.get<PortfolioResponse[]>('/portfolios')

    return response.data
}

export async function findPortfolioById(
    id: number
): Promise<PortfolioResponse> {
    const response = await api.get<PortfolioResponse>(
        `/portfolios/${id}`
    )

    return response.data
}