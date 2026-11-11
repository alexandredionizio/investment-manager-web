import api from './api'

export interface ExpectedIncomeRecord {
    id: number
    portfolioId: number
    assetId: number
    assetTicker: string
    type: 'DIVIDEND' | 'JCP' | 'FII_INCOME'
    expectedPaymentDate: string
    quantity: number
    expectedNetAmount: number
    institution: string | null
}

/** Previsões da V18: não são recebimentos e não alimentam resultados contábeis. */
export async function findExpectedIncomesByPortfolio(portfolioId: number): Promise<ExpectedIncomeRecord[]> {
    const response = await api.get<ExpectedIncomeRecord[]>(`/expected-incomes/portfolio/${portfolioId}`)
    if (!Array.isArray(response.data) || response.data.some(r =>
        !r || !Number.isFinite(r.expectedNetAmount) || r.expectedNetAmount < 0 ||
        !Number.isFinite(r.quantity) || !r.expectedPaymentDate || !r.assetTicker ||
        !['DIVIDEND', 'JCP', 'FII_INCOME'].includes(r.type))) {
        throw new Error('Resposta inválida de proventos previstos.')
    }
    return response.data
}
