import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import api from '../services/api'
import PortfoliosPage from './PortfoliosPage'
import PortfolioDetailsPage from './PortfolioDetailsPage'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('shows unsupported valuation instead of claiming no portfolios exist', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 1, name: 'Mista' }] }
        throw { isAxiosError: true, response: { status: 404, data: {
            status: 404, error: 'Cotação não suportada', message: 'CRYPTO não possui fonte de preço implementada.',
        } } }
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MemoryRouter><PortfoliosPage /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('CRYPTO')
    expect(screen.queryByText('Nenhuma carteira encontrada.')).toBeNull()
})

it('ends detail loading and explains unsupported valuation', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios/1') return { data: { id: 1, name: 'Mista' } }
        throw { isAxiosError: true, response: { status: 404, data: {
            status: 404, error: 'Cotação não suportada', message: 'FIXED_INCOME não possui fonte de preço implementada.',
        } } }
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MemoryRouter initialEntries={['/portfolios/1']}><Routes>
        <Route path="/portfolios/:id" element={<PortfolioDetailsPage />} />
    </Routes></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('FIXED_INCOME')
    expect(screen.queryByText('Carregando carteira...')).toBeNull()
    expect(screen.queryByText('Nenhuma posição encontrada.')).toBeNull()
})

const unavailable = { isAxiosError: true, response: { status: 503, data: { status: 503, error: 'Falha na integração externa' } } }
const accounting = [{ assetId: 1, assetTicker: 'TEST11', quantity: 10, averagePrice: 10, totalCost: 100 }]

it('keeps portfolio identity and accounting when market provider fails', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 1, name: 'Minha carteira' }] }
        if (url === '/portfolios/1/positions') return { data: accounting }
        throw unavailable
    })
    render(<MemoryRouter><PortfoliosPage /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Dados de mercado temporariamente indisponíveis')
    expect(screen.getByText('Minha carteira')).toBeTruthy()
    expect(screen.getByText(/100,00/)).toBeTruthy()
    expect(screen.queryByText(/0,00%/)).toBeNull()
    expect(screen.getByRole('button', { name: /Ver carteira/ })).toBeTruthy()
})

it('keeps accounting positions in detail without invented market values', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios/1') return { data: { id: 1, name: 'Minha carteira' } }
        if (url === '/portfolios/1/positions') return { data: accounting }
        throw unavailable
    })
    render(<MemoryRouter initialEntries={['/portfolios/1']}><Routes>
        <Route path="/portfolios/:id" element={<PortfolioDetailsPage />} />
    </Routes></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Dados de mercado temporariamente indisponíveis')
    expect(screen.getByText('Minha carteira')).toBeTruthy()
    expect(screen.getByText('TEST11')).toBeTruthy()
    expect(screen.getByText(/Custo total:.*100,00/)).toBeTruthy()
    expect(screen.queryByText('Nenhuma posição encontrada.')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
})

it('keeps the portfolios page focused on consultation rather than management', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 3, name: 'Reserva' }] }
        throw unavailable
    })
    render(<MemoryRouter><PortfoliosPage /></MemoryRouter>)
    expect(await screen.findByText('Reserva')).toBeTruthy()
    expect(screen.getByText('Crie ou renomeie carteiras pelo seletor do Dashboard.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Renomear/ })).toBeNull()
    expect(screen.queryByLabelText('Nome da carteira')).toBeNull()
})

it('returns from portfolio details to the portfolios list with one click', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 1, name: 'Minha carteira' }] }
        if (url === '/portfolios/1') return { data: { id: 1, name: 'Minha carteira' } }
        if (url === '/portfolios/1/positions/valuations') return { data: [] }
        if (url === '/portfolios/1/positions') return { data: [] }
        throw unavailable
    })
    render(<MemoryRouter initialEntries={['/portfolios/1']}><Routes>
        <Route path="/portfolios" element={<PortfoliosPage />} />
        <Route path="/portfolios/:id" element={<PortfolioDetailsPage />} />
    </Routes></MemoryRouter>)
    const back = screen.getByRole('link', { name: 'Voltar para Carteiras' })
    expect(back.getAttribute('href')).toBe('/portfolios')
    fireEvent.click(back)
    expect(await screen.findByText('Minhas carteiras')).toBeTruthy()
    expect(await screen.findByText('Minha carteira')).toBeTruthy()
})

it('offers navigation back even when loading the portfolio fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(unavailable)
    render(<MemoryRouter initialEntries={['/portfolios/1']}><Routes>
        <Route path="/portfolios/:id" element={<PortfolioDetailsPage />} />
    </Routes></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Voltar para Carteiras' }).getAttribute('href')).toBe('/portfolios')
    expect(await screen.findByRole('alert')).toBeTruthy()
})

// IM-061: não bloquear a primeira navegação à lista com chamadas de mercado.
it('shows the portfolio list before a slow valuation request completes', async () => {
    let finishValuation!: (value: { data: unknown[] }) => void
    const market = new Promise<{ data: unknown[] }>(resolve => { finishValuation = resolve })
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 31, name: 'Carteira rápida' }] }
        if (url === '/portfolios/31/positions/valuations') return market
        throw unavailable
    })
    render(<MemoryRouter><PortfoliosPage /></MemoryRouter>)
    expect(await screen.findByText('Carteira rápida')).toBeTruthy()
    expect(screen.queryByText('Carregando carteiras...')).toBeNull()
    expect(screen.getAllByText('Calculando...').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Ver carteira/ })).toBeTruthy()
    finishValuation({ data: [] })
    await waitFor(() => expect(screen.queryByText('Calculando...')).toBeNull())
})

it('keeps listed portfolios visible when one valuation is unavailable', async () => {
    vi.spyOn(api, 'get').mockImplementation(async url => {
        if (url === '/portfolios') return { data: [{ id: 32, name: 'Carteira preservada' }] }
        throw unavailable
    })
    render(<MemoryRouter><PortfoliosPage /></MemoryRouter>)
    expect(await screen.findByText('Carteira preservada')).toBeTruthy()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByText('Nenhuma carteira encontrada.')).toBeNull()
})
