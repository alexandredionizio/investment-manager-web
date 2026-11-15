import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DashboardIssuesSummary } from './DashboardIssuesSummary'

describe('IM-063 — aviso consolidado sem omitir indisponibilidades', () => {
    it('não exibe aviso quando todos os cálculos estão disponíveis', () => {
        render(<DashboardIssuesSummary issues={{}} />)
        expect(screen.queryByRole('alert')).toBeNull()
    })

    it('preserva a causa e identifica cada seção afetada sem repetir o mesmo erro', () => {
        const sameReason = 'Cotação oficial indisponível para TD-PRE-2029'
        render(<DashboardIssuesSummary issues={{ history: sameReason, total: sameReason, comparison: 'Ibovespa indisponível' }} />)
        const alert = screen.getByRole('alert')
        const items = within(alert).getAllByRole('listitem')
        expect(items).toHaveLength(2)
        expect(items[0].textContent).toContain(sameReason)
        expect(items[0].textContent).toContain('Histórico')
        expect(items[0].textContent).toContain('Rentabilidade total')
        expect(items[1].textContent).toContain('Ibovespa indisponível')
    })
})
