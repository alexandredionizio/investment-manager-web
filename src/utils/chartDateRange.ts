import type { PortfolioHistoryPeriod } from '../types/portfolioHistory'

/** UTC calendar arithmetic avoids DST shifts and month-overflow at month ends. */
export function dateMillis(iso: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN
    const timestamp = Date.parse(`${iso}T00:00:00Z`)
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === iso
        ? timestamp : NaN
}

export function dateLabel(timestamp: number): string {
    const iso = new Date(timestamp).toISOString().slice(0, 10)
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function fullDateLabel(timestamp: number): string {
    const iso = new Date(timestamp).toISOString().slice(0, 10)
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

function minusMonths(end: string, count: number): string {
    const [year, month, day] = end.split('-').map(Number)
    const first = new Date(Date.UTC(year, month - count - 1, 1))
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
    first.setUTCDate(Math.min(day, lastDay))
    return first.toISOString().slice(0, 10)
}

export type DateRange = { start: number; end: number }

export function selectedDateRange(
    period: PortfolioHistoryPeriod,
    observedDates: string[],
    startDate = '',
    endDate = '',
    today = new Date(),
): DateRange | null {
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const endIso = period === 'CUSTOM' ? endDate : todayIso
    const end = dateMillis(endIso)
    if (!Number.isFinite(end)) return null

    let startIso: string
    if (period === 'CUSTOM') startIso = startDate
    else if (period === 'ALL') {
        startIso = observedDates.filter(date => Number.isFinite(dateMillis(date))).sort()[0] ?? todayIso
    } else {
        const months: Partial<Record<PortfolioHistoryPeriod, number>> = {
            ONE_MONTH: 1, THREE_MONTHS: 3, SIX_MONTHS: 6,
            ONE_YEAR: 12, TWO_YEARS: 24, FIVE_YEARS: 60, TEN_YEARS: 120,
        }
        startIso = minusMonths(todayIso, months[period] ?? 1)
    }
    const start = dateMillis(startIso)
    return Number.isFinite(start) && start <= end ? { start, end } : null
}

/** Only actual returned points are charted. Boundary labels are axis ticks, never synthetic data. */
export function chartDataInRange<T extends { date: string }>(points: T[], range: DateRange | null): (T & { timestamp: number })[] {
    if (!range) return []
    return points.flatMap(point => {
        const timestamp = dateMillis(point.date)
        return Number.isFinite(timestamp) && timestamp >= range.start && timestamp <= range.end
            ? [{ ...point, timestamp }] : []
    }).sort((a, b) => a.timestamp - b.timestamp)
}

export function dateAxisTicks(range: DateRange | null): number[] {
    if (!range) return []
    if (range.start === range.end) return [range.start]
    const ticks = Array.from({ length: 5 }, (_, index) =>
        Math.round((range.start + (range.end - range.start) * index / 4) / 86400000) * 86400000)
    return [...new Set([range.start, ...ticks, range.end])].sort((a, b) => a - b)
}

/** Zooms the display to actual coverage, never adding artificial historical data. */
export function observedAxisRange<T extends { timestamp: number }>(
    points: T[], requested: DateRange | null,
): DateRange | null {
    if (!requested || points.length === 0) return null
    const times = points.map(point => point.timestamp).filter(Number.isFinite)
    if (!times.length) return null
    const first = Math.max(requested.start, Math.min(...times))
    const last = Math.min(requested.end, Math.max(...times))
    if (first > last) return null
    // A single observation must remain visible, but should not imply a time series.
    if (first === last) return {
        start: Math.max(requested.start, first - 86400000),
        end: Math.min(requested.end, last + 86400000),
    }
    return { start: first, end: last }
}

export function isPartialCoverage(requested: DateRange | null, points: { timestamp: number }[]): boolean {
    if (!requested || points.length === 0) return false
    const first = Math.min(...points.map(p => p.timestamp))
    return first > requested.start + 86400000
}
