/** Indicadores calculados apenas sobre registros de proventos classificados como recebidos. */
export interface IncomeMetricRecord {
    portfolioId: number
    paymentDate: string
    received: boolean
    totalAmount: number
}

export interface IncomeMetrics {
    total: number
    last12Total: number
    monthsWithReceipts: number
    averageActiveMonth: number
}

export function calculateIncomeMetrics(
    records: IncomeMetricRecord[],
    portfolioId: string,
    now: Date = new Date(),
): IncomeMetrics {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const firstMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const filtered = records.filter(i =>
        i.received === true &&
        (portfolioId === '' || i.portfolioId === Number(portfolioId)) &&
        typeof i.totalAmount === 'number' && Number.isFinite(i.totalAmount) && i.totalAmount >= 0 &&
        typeof i.paymentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(i.paymentDate) &&
        i.paymentDate <= today
    )
    const recent = filtered.filter(i => i.paymentDate.slice(0, 7) >= firstMonth)
    const monthsWithReceipts = new Set(recent.map(i => i.paymentDate.slice(0, 7))).size
    const last12Total = recent.reduce((sum, i) => sum + i.totalAmount, 0)
    return {
        total: filtered.reduce((sum, i) => sum + i.totalAmount, 0),
        last12Total,
        monthsWithReceipts,
        averageActiveMonth: monthsWithReceipts ? last12Total / monthsWithReceipts : 0,
    }
}
