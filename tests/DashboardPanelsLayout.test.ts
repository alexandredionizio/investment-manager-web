import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// Verificação pontual estrutural. Conferência visual em desktop/mobile continua necessária.
const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const css = readFileSync('src/pages/dashboard-panels-grid.css', 'utf8')

describe('IM-066: dois painéis do Dashboard', () => {
  it('agrupa exatamente os dois gráficos antes da seção de posições', () => {
    const begin = dashboard.indexOf('<div className="dashboard-charts-grid"')
    const returns = dashboard.indexOf('<section className="dashboard-card dashboard-return-section">', begin)
    const history = dashboard.indexOf('<section className="dashboard-card dashboard-history-section">', returns)
    const monthly = dashboard.indexOf('<details className="dashboard-monthly-disclosure', history)
    const end = dashboard.indexOf('<section className="dashboard-card dashboard-positions-section">', monthly)
    expect(begin).toBeGreaterThan(-1)
    expect(returns).toBeGreaterThan(begin)
    expect(history).toBeGreaterThan(returns)
    expect(monthly).toBeGreaterThan(history)
    expect(end).toBeGreaterThan(monthly)
    expect(dashboard.slice(history, monthly)).toContain('</section>')
    expect(dashboard.slice(history, monthly).trimEnd().endsWith('</div>')).toBe(true)
    expect(dashboard.slice(monthly, end)).toContain('monthlyReturnRows.map')
  })

  it('mantém uma coluna por padrão e duas em telas largas', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(css).toMatch(/@media \(min-width: 1480px\)/)
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  })

  it('preserva seletores independentes e plotagens responsivas', () => {
    expect(dashboard).toContain('dashboard-return-periods')
    expect(dashboard).toContain('dashboard-history-periods')
    expect(dashboard).toContain('comparisonChartData')
    expect(dashboard).toContain('historyChartData')
    expect(css).toContain('dashboard-return-periods')
    expect(css).toContain('dashboard-history-periods')
  })
})
