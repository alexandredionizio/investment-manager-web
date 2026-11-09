import { isAxiosError } from 'axios'
import { findAllPortfolios } from './portfolioService'
import { findTransactionsByPortfolio } from './transactionService'
import { findMarketPositions } from './positionService'
import { findIncomesByPortfolio } from './incomeService'
import { findRealizedResultsByPortfolio } from './realizedResultService'
import { findPortfolioHistory } from './portfolioHistoryService'
import { findPortfolioReturns } from './portfolioReturnService'
import { findBenchmarkComparison } from './benchmarkComparisonService'
import type { PortfolioHistoryPeriod } from '../types/portfolioHistory'

type RecordData = Record<string, unknown>
type Validator = (value: unknown) => boolean
const object = (value: unknown): value is RecordData =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const nullableNumber = (value: unknown) => value === null || number(value)
const rows = (check: Validator): Validator => value => Array.isArray(value) && value.every(check)
const fields = (numeric: string[], strings: string[] = []): Validator => value =>
    object(value) && numeric.every(key => number(value[key])) && strings.every(key => typeof value[key] === 'string')
const range = (value: unknown): value is RecordData => object(value)
    && number(value.portfolioId) && date(value.startDate) && date(value.endDate)
    && String(value.startDate) <= String(value.endDate)

const returns: Validator = value => range(value) && nullableNumber(value.totalReturn)
    && rows(point => object(point) && date(point.date) && number(point.dailyReturn) && number(point.cumulativeReturn))(value.points)
    && (value.totalReturn === null ? (value.points as unknown[]).length === 0 : (value.points as unknown[]).length > 0)
const history: Validator = value => range(value)
    && typeof value.period === 'string' && ['DAILY', 'WEEKLY', 'MONTHLY'].includes(String(value.granularity))
    && rows(point => object(point) && date(point.date) && number(point.value))(value.points)
const comparison: Validator = rows(point => object(point) && date(point.date)
    && number(point.portfolioReturn) && nullableNumber(point.cdiReturn) && nullableNumber(point.ibovReturn))

export const validValuation: Validator = value => fields(['assetId', 'quantity', 'averagePrice', 'totalCost'], ['assetTicker'])(value)
    && object(value)
    && (value.valuationStatus === 'UNAVAILABLE'
        ? ['currentPrice', 'currentValue', 'profitLoss', 'profitabilityPercent'].every(key => value[key] === null)
            && typeof value.reason === 'string'
        : (value.valuationStatus === undefined || ['AVAILABLE', 'ESTIMATED'].includes(String(value.valuationStatus)))
            && ['currentPrice', 'currentValue', 'profitLoss'].every(key => number(value[key]))
            && nullableNumber(value.profitabilityPercent))

async function checked<T>(request: Promise<T>, validate: Validator): Promise<T> {
    const data = await request
    if (!validate(data)) throw new Error('Resposta inválida do servidor.')
    return data
}

export function dashboardErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        const status = error.response?.status
        if (status === 401) return 'Sessão expirada. Entre novamente.'
        if (status === 503 && error.response?.data?.error === 'Histórico de benchmark incompleto')
            return 'Histórico de CDI ou Ibovespa incompleto no período solicitado. Comparação indisponível.'
        if ([502, 503, 504].includes(status ?? 0) && error.response?.data?.error === 'Falha na integração externa')
            return 'Dados de mercado temporariamente indisponíveis. Tente novamente mais tarde.'
        if (status === 403) return 'Acesso não autorizado a estes dados.'
        if (status === 404 && error.response?.data?.status === 404
            && error.response?.data?.error === 'Cotação não suportada') {
            return typeof error.response.data.message === 'string'
                ? error.response.data.message : 'Cotação não suportada para este ativo.'
        }
        if (status === 404 && error.response?.data?.error === 'Cotação indisponível'
            && error.response?.data?.status === 404) return 'Cotação indisponível para o período solicitado.'
        if (status && status >= 400 && status < 500) return 'A consulta foi recusada pelo servidor (HTTP ' + status + ').'
        if (status) return 'Falha ao carregar dados (HTTP ' + status + '). Tente novamente.'
        return 'Falha de conexão ou tempo limite ao carregar dados. Tente novamente.'
    }
    return 'Resposta inválida ou falha inesperada ao carregar dados. Tente novamente.'
}

async function section<T>(request: Promise<T>, validate: Validator) {
    try {
        return { data: await checked(request, validate), issue: null as string | null }
    } catch (error) {
        if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) throw error
        return { data: null as T | null, issue: dashboardErrorMessage(error) }
    }
}

export const findDashboardPortfolios = () => checked(findAllPortfolios(), rows(fields(['id'], ['name'])))
export const findDashboardHistory = (...args: Parameters<typeof findPortfolioHistory>) =>
    checked(findPortfolioHistory(...args), history)
export const findDashboardComparison = (...args: Parameters<typeof findBenchmarkComparison>) =>
    checked(findBenchmarkComparison(...args), comparison)

type SectionResult<T> = { data: T | null; issue: string | null }
export type DashboardData = {
    transactions: SectionResult<Awaited<ReturnType<typeof findTransactionsByPortfolio>>>
    positions: SectionResult<Awaited<ReturnType<typeof findMarketPositions>>>
    incomes: SectionResult<Awaited<ReturnType<typeof findIncomesByPortfolio>>>
    realized: SectionResult<Awaited<ReturnType<typeof findRealizedResultsByPortfolio>>>
    history: SectionResult<Awaited<ReturnType<typeof findPortfolioHistory>>>
    comparison: SectionResult<Awaited<ReturnType<typeof findBenchmarkComparison>>>
    total: SectionResult<Awaited<ReturnType<typeof findPortfolioReturns>>>
    year: SectionResult<Awaited<ReturnType<typeof findPortfolioReturns>>>
    month: SectionResult<Awaited<ReturnType<typeof findPortfolioReturns>>>
}

export const dashboardSectionKeys = ['transactions', 'positions', 'incomes', 'realized', 'history', 'comparison', 'total', 'year', 'month'] as const

type PeriodSelection = { period: PortfolioHistoryPeriod; startDate?: string; endDate?: string }
export async function loadDashboardData(
    portfolioId: number,
    historySelection: PeriodSelection,
    returnSelection: PeriodSelection,
    onUpdate?: (data: Partial<DashboardData>) => void,
): Promise<DashboardData> {
    async function publish<K extends keyof DashboardData>(key: K, request: Promise<DashboardData[K]>) {
        const result = await request
        onUpdate?.({ [key]: result } as Partial<DashboardData>)
        return result
    }
    // Each metric keeps its own failure. Authorization failures still reject the whole load.
    const [transactions, positions, incomes, realized, historyData, comparisonData, total, year, month] = await Promise.all([
        publish('transactions', section(findTransactionsByPortfolio(portfolioId), rows(value => fields(['id', 'portfolioId', 'assetId', 'quantity'], ['type'])(value)
            && object(value) && value.portfolioId === portfolioId && date(value.transactionDate) && ['BUY', 'SELL'].includes(String(value.type))))),
        publish('positions', section(findMarketPositions(portfolioId), rows(validValuation))),
        publish('incomes', section(findIncomesByPortfolio(portfolioId), rows(value => fields(['totalAmount'])(value) && object(value) && typeof value.received === 'boolean'))),
        publish('realized', section(findRealizedResultsByPortfolio(portfolioId), rows(fields(['realizedProfitLoss'])))),
        publish('history', section(findDashboardHistory(portfolioId, historySelection.period, historySelection.startDate, historySelection.endDate), value => range(value) && value.portfolioId === portfolioId)),
        publish('comparison', section(findDashboardComparison(portfolioId, returnSelection.period, returnSelection.startDate, returnSelection.endDate), comparison)),
        publish('total', section(findPortfolioReturns(portfolioId, 'ALL'), value => returns(value) && object(value) && value.portfolioId === portfolioId)),
        publish('year', section(findPortfolioReturns(portfolioId, 'ONE_YEAR'), value => returns(value) && object(value) && value.portfolioId === portfolioId)),
        publish('month', section(findPortfolioReturns(portfolioId, 'ONE_MONTH'), value => returns(value) && object(value) && value.portfolioId === portfolioId)),
    ])
    return { transactions, positions, incomes, realized, history: historyData, comparison: comparisonData, total, year, month }
}

export type DashboardIssues = Partial<Record<keyof DashboardData, string | null>>
export const dashboardSectionLabels: Record<keyof DashboardIssues, string> = {
    transactions: 'Transações', positions: 'Posições e patrimônio', incomes: 'Proventos', realized: 'Resultado realizado',
    history: 'Histórico', comparison: 'Comparação de rentabilidade', total: 'Rentabilidade total', year: 'Rentabilidade em 12 meses', month: 'Rentabilidade no mês',
}
