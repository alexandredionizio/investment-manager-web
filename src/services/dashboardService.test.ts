import { expect, it } from 'vitest'
import { dashboardErrorMessage } from './dashboardService'
import api from './api'

it('distinguishes incomplete benchmark history from provider failure and zero returns', () => {
    expect(dashboardErrorMessage({ isAxiosError: true, response: {
        status: 503, data: { error: 'Histórico de benchmark incompleto' },
    } })).toBe('Histórico de CDI ou Ibovespa incompleto no período solicitado. Comparação indisponível.')
})

it.each([502, 503, 504])('reports upstream HTTP %i without claiming zero data', status => {
    expect(dashboardErrorMessage({ isAxiosError: true, response: { status, data: { error: 'Falha na integração externa' } } }))
        .toBe('Dados de mercado temporariamente indisponíveis. Tente novamente mais tarde.')
})
it('sets a finite browser timeout without automatic retries', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0)
    expect(api.defaults.timeout).toBeLessThanOrEqual(60000)
})
