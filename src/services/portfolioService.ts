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
export async function createPortfolio(name: string, description = ''): Promise<PortfolioResponse> {
    const response = await api.post<PortfolioResponse>('/portfolios', { name: name.trim(), description: description.trim() || null })
    return response.data
}

export async function renamePortfolio(id: number, name: string): Promise<PortfolioResponse> {
    const response = await api.put<PortfolioResponse>(`/portfolios/${id}/name`, { name: name.trim() })
    return response.data
}

export async function deletePortfolio(id: number): Promise<void> {
    await api.delete(`/portfolios/${id}`)
}
