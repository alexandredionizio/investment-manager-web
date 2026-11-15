import { describe, expect, it } from 'vitest'
import { chartDataInRange, dateAxisTicks, dateLabel, fullDateLabel, observedAxisRange, isPartialCoverage, selectedDateRange } from './chartDateRange'

const today = new Date(2026, 10, 15)
const iso = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10)

describe('IM-060: calendário dos gráficos', () => {
    it('usa a extensão observada no eixo sem deslocar séries de 1M, 6M e 5A', () => {
        const points = [{ timestamp: Date.UTC(2026, 10, 2) }, { timestamp: Date.UTC(2026, 10, 15) }]
        for (const period of ['ONE_MONTH', 'SIX_MONTHS', 'FIVE_YEARS'] as const) {
            const requested = selectedDateRange(period, [], '', '', today)!
            const axis = observedAxisRange(points, requested)!
            expect(iso(axis.start)).toBe('2026-11-02')
            expect(iso(axis.end)).toBe('2026-11-15')
            expect(isPartialCoverage(requested, points)).toBe(true)
        }
        expect(observedAxisRange([], selectedDateRange('ONE_MONTH', [], '', '', today))).toBeNull()
    })

    it('delimita 1M, 3M, 6M e 2A pelo período solicitado, não pelo menor histórico retornado', () => {
        for (const [period, start] of [
            ['ONE_MONTH', '2026-10-15'], ['THREE_MONTHS', '2026-08-15'],
            ['SIX_MONTHS', '2026-05-15'], ['TWO_YEARS', '2024-11-15'],
        ] as const) {
            const range = selectedDateRange(period, ['2026-11-02', '2026-11-15'], '', '', today)!
            expect(iso(range.start)).toBe(start)
            expect(iso(range.end)).toBe('2026-11-15')
            expect(dateAxisTicks(range)).toContain(range.start)
            expect(dateAxisTicks(range)).toContain(range.end)
        }
    })
    it('preserva intervalo personalizado e histórico completo sem pontos fabricados', () => {
        const custom = selectedDateRange('CUSTOM', [], '2024-01-01', '2024-12-31', today)!
        expect(iso(custom.start)).toBe('2024-01-01')
        expect(chartDataInRange([{ date: '2023-12-30', value: 2 }, { date: '2024-07-10', value: 5 }], custom))
            .toEqual([{ date: '2024-07-10', value: 5, timestamp: Date.UTC(2024, 6, 10) }])
        expect(iso(selectedDateRange('ALL', ['2022-01-02', '2026-11-10'], '', '', today)!.start)).toBe('2022-01-02')
    })
    it('não fabrica pontos, preserva ausências e ordena cronologicamente', () => {
        const range = selectedDateRange('ONE_MONTH', [], '', '', today)!
        expect(chartDataInRange([], range)).toEqual([])
        const filtered = chartDataInRange([
            { date: '2026-11-14', cdiReturn: null },
            { date: '2026-08-01', cdiReturn: 1 },
            { date: '2026-11-02', cdiReturn: 0 },
        ], range)
        expect(filtered.map(p => p.date)).toEqual(['2026-11-02', '2026-11-14'])
        expect(filtered[1].cdiReturn).toBeNull()
    })
    it('formata datas de eixo e tooltip sem confundir dia/mês', () => {
        expect(dateLabel(Date.UTC(2024, 0, 31))).toBe('31/01')
        expect(fullDateLabel(Date.UTC(2024, 0, 31))).toBe('31/01/2024')
        expect(iso(selectedDateRange('ONE_MONTH', [], '', '', new Date(2026, 2, 31))!.start)).toBe('2026-02-28')
    })
})
