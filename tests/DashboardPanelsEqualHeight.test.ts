import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const css = readFileSync('src/pages/dashboard-panels-grid.css', 'utf8')

describe('IM-066: gráficos com alturas alinhadas', () => {
  it('mantém os dois painéis no mesmo grid, antes das posições', () => {
    const grid = dashboard.indexOf('<div className="dashboard-charts-grid"')
    const chartA = dashboard.indexOf('<section className="dashboard-card dashboard-return-section">', grid)
    const chartB = dashboard.indexOf('<section className="dashboard-card dashboard-history-section">', chartA)
    const monthly = dashboard.indexOf('<details className="dashboard-monthly-disclosure', chartB)
    const positions = dashboard.indexOf('<section className="dashboard-card dashboard-positions-section">', monthly)
    expect(grid).toBeGreaterThan(-1)
    expect(chartA).toBeGreaterThan(grid)
    expect(chartB).toBeGreaterThan(chartA)
    expect(monthly).toBeGreaterThan(chartB)
    expect(positions).toBeGreaterThan(monthly)
    expect(dashboard.slice(chartA, chartB)).not.toContain('Rentabilidade mensal')
  })

  it('separa rentabilidade mensal em área recolhível sem retirar a tabela', () => {
    expect(dashboard).toContain('<summary>Rentabilidade mensal — visualizar histórico detalhado</summary>')
    expect(dashboard).toContain('monthlyReturnRows.map')
    expect(dashboard).toContain('dashboard-return-table-wrapper')
  })

  it('alinha os cartões e permite preencher altura restante com gráficos no desktop', () => {
    expect(css).toContain('align-items: stretch')
    expect(css).toContain('.dashboard-charts-grid > .dashboard-card {')
    expect(css).toContain('flex-direction: column')
    expect(css).toContain('.dashboard-charts-grid .dashboard-history-chart')
    expect(css).toContain('flex: 1 1 auto')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  })
})
