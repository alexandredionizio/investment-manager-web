import type { PositionMarketResponse } from '../types/position'

export function summarizeValuations(positions: PositionMarketResponse[]) {
    const valid = positions.filter(p => p.currentValue !== null && p.profitLoss !== null && p.valuationStatus !== 'UNAVAILABLE')
    const partial = valid.length < positions.length
    const available = valid.length > 0 || positions.length === 0
    const evaluatedCost = valid.reduce((sum, p) => sum + p.totalCost, 0)
    const value = available ? valid.reduce((sum, p) => sum + p.currentValue!, 0) : null
    const profit = available ? valid.reduce((sum, p) => sum + p.profitLoss!, 0) : null
    return {
        partial, estimated: valid.some(p => p.valuationStatus === 'ESTIMATED'),
        totalCost: positions.reduce((sum, p) => sum + p.totalCost, 0),
        missingCost: positions.filter(p => !valid.includes(p)).reduce((sum, p) => sum + p.totalCost, 0),
        value, profit, percent: profit !== null && evaluatedCost > 0 ? profit / evaluatedCost * 100 : null,
    }
}

export function benchmarkAvailability(values: (number | null)[], label: string) {
    if (!values.length || values.every(v => v !== null)) return null
    return values.every(v => v === null)
        ? label + ' indisponível no período: sem base de comparação.'
        : label + ' parcialmente disponível: a curva mostra somente os pontos com dados.'
}
