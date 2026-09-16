import api from './api'
import type {
    IncomeRequest,
    IncomeResponse,
} from '../types/income'

export async function findAllIncomes(): Promise<IncomeResponse[]> {
    const response = await api.get<IncomeResponse[]>(
        '/incomes',
    )

    return response.data
}

export async function findIncomesByPortfolio(
    portfolioId: number,
): Promise<IncomeResponse[]> {
    const response = await api.get<IncomeResponse[]>(
        `/incomes/portfolio/${portfolioId}`,
    )

    return response.data
}

export async function findIncomeById(
    incomeId: number,
): Promise<IncomeResponse> {
    const response = await api.get<IncomeResponse>(
        `/incomes/${incomeId}`,
    )

    return response.data
}

export async function createIncome(
    data: IncomeRequest,
): Promise<IncomeResponse> {
    const response = await api.post<IncomeResponse>(
        '/incomes',
        data,
    )

    return response.data
}