import api from './api'
import type {
    IncomeRequest,
    IncomeResponse,
} from '../types/income'

function checkedIncome(income: IncomeResponse): IncomeResponse {
    if (!income || typeof income.received !== 'boolean' || !Number.isFinite(income.totalAmount)) {
        throw new Error('Resposta inválida de proventos do servidor.')
    }
    return income
}

export async function findAllIncomes(): Promise<IncomeResponse[]> {
    const response = await api.get<IncomeResponse[]>(
        '/incomes',
    )

    return response.data.map(checkedIncome)
}

export async function findIncomesByPortfolio(
    portfolioId: number,
): Promise<IncomeResponse[]> {
    const response = await api.get<IncomeResponse[]>(
        `/incomes/portfolio/${portfolioId}`,
    )

    return response.data.map(checkedIncome)
}

export async function findIncomeById(
    incomeId: number,
): Promise<IncomeResponse> {
    const response = await api.get<IncomeResponse>(
        `/incomes/${incomeId}`,
    )

    return checkedIncome(response.data)
}

export async function createIncome(
    data: IncomeRequest,
): Promise<IncomeResponse> {
    const response = await api.post<IncomeResponse>(
        '/incomes',
        data,
    )

    return checkedIncome(response.data)
}