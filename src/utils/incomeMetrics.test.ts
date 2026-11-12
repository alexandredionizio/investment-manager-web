import { describe, expect, it } from 'vitest'
import { calculateIncomeMetrics } from './incomeMetrics'
const rec = (portfolioId: number, paymentDate: string, totalAmount: number, received = true) =>
    ({ portfolioId, paymentDate, totalAmount, received })
const today = new Date(2026, 10, 12)
describe('IM-032: indicadores de proventos', () => {
    it('considera apenas recebidos da carteira selecionada, sem previsoes', () => {
        const result = calculateIncomeMetrics([
            rec(1, '2026-10-10', 50), rec(1, '2026-11-01', 100),
            rec(1, '2026-11-20', 999, false), rec(2, '2026-11-02', 400),
        ], '1', today)
        expect(result.total).toBe(150)
        expect(result.last12Total).toBe(150)
        expect(result.monthsWithReceipts).toBe(2)
        expect(result.averageActiveMonth).toBe(75)
    })
    it('preserva acumulado de meses antigos, mas não os inclui nos últimos 12 meses', () => {
        const result = calculateIncomeMetrics([
            rec(1, '2025-10-10', 200), rec(1, '2025-12-10', 100),
        ], '', today)
        expect(result.total).toBe(300)
        expect(result.last12Total).toBe(100)
        expect(result.averageActiveMonth).toBe(100)
    })
    it('não inclui lançamentos futuros nem inventa média sem pagamentos', () => {
        const result = calculateIncomeMetrics([rec(1, '2026-12-01', 300, false)], '', today)
        expect(result.total).toBe(0)
        expect(result.last12Total).toBe(0)
        expect(result.monthsWithReceipts).toBe(0)
    })
    it('exclui crédito futuro classificado incorretamente como recebido', () => {
        const result = calculateIncomeMetrics([rec(1, '2026-12-01', 300, true)], '', today)
        expect(result.total).toBe(0)
    })
})
