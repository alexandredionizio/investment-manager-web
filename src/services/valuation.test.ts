import { describe, expect, it } from 'vitest'
import { summarizeValuations, benchmarkAvailability } from './valuation'
import { validValuation } from './dashboardService'
import type { PositionMarketResponse } from '../types/position'
const priced: PositionMarketResponse = { assetId: 1, assetTicker: 'BTC', quantity: 0.1, averagePrice: 100, totalCost: 100,
    currentPrice: 1500, currentValue: 150, profitLoss: 50, profitabilityPercent: 50, valuationStatus: 'AVAILABLE' }
const missing: PositionMarketResponse = { ...priced, assetId: 2, assetTicker: 'SOL', totalCost: 500,
    currentPrice: null, currentValue: null, profitLoss: null, profitabilityPercent: null, valuationStatus: 'UNAVAILABLE', reason: 'Sem suporte' }
describe('valuation consolidation', () => {
    it('uses only evaluated costs for the evaluated return and keeps full accounting', () => {
        expect(summarizeValuations([priced, missing])).toEqual({ partial: true, estimated: false, value: 150, profit: 50,
            totalCost: 600, missingCost: 500, percent: 50 })
    })
    it('distinguishes entirely unpriced portfolio from no positions', () => {
        expect(summarizeValuations([missing]).value).toBeNull()
        expect(summarizeValuations([missing]).profit).toBeNull()
        expect(summarizeValuations([]).value).toBe(0)
    })
    it('identifies contractual estimates without adding paid income', () => {
        const result = summarizeValuations([{ ...priced, valuationStatus: 'ESTIMATED', valuationMethod: 'CONTRACTUAL' }])
        expect(result.estimated).toBe(true)
        expect(result.value).toBe(150)
    })
    it('validates unavailable nulls and rejects fictional zero price for unavailable state', () => {
        expect(validValuation(missing)).toBe(true)
        expect(validValuation({ ...missing, currentValue: 0 })).toBe(false)
        expect(validValuation({ ...priced, currentValue: null })).toBe(false)
    })
    it('distinguishes full, partial, and absent CDI coverage', () => {
        expect(benchmarkAvailability([0, 0.01], 'CDI')).toBeNull()
        expect(benchmarkAvailability([null, 0.01], 'CDI')).toContain('parcialmente')
        expect(benchmarkAvailability([null, null], 'CDI')).toContain('sem base')
    })
})
