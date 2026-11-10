import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ReactNode } from 'react'
import api from '../services/api'
import DashboardPage from './DashboardPage'

// Only chart layout is replaced; the page, HTTP services and state transitions are real.
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    LineChart: ({ data }: { data: unknown }) => <pre data-testid="chart">{JSON.stringify(data)}</pre>,
    CartesianGrid: () => null, Line: () => null, Legend: () => null,
    Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}))

const portfolio = { id: 1, name: 'Principal', description: '', createdAt: '2026-09-20' }
const transaction = { id: 1, portfolioId: 1, assetId: 1, quantity: 100, type: 'BUY', transactionDate: '2026-09-20' }
const position = { assetId: 1, assetTicker: 'ITUB4', quantity: 100, averagePrice: 10, totalCost: 1000,
    currentPrice: 10, currentValue: 1000, profitLoss: 0, profitabilityPercent: 0 }
const point = { date: '2026-09-21', dailyReturn: 0, cumulativeReturn: 0 }
const comparison = { date: '2026-09-21', portfolioReturn: 0, cdiReturn: null, ibovReturn: 0 }
let populated: boolean
let override: (url: string, config?: AxiosRequestConfig) => unknown
const unchanged = Symbol('default response')

function httpError(status?: number, data: unknown = {}) {
    return { isAxiosError: true, response: status ? { status, data } : undefined }
}

beforeEach(() => {
    populated = false
    override = () => unchanged
    vi.spyOn(api, 'get').mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
        const replaced = await override(url, config)
        if (replaced !== unchanged) return { data: replaced } as AxiosResponse
        const id = Number(url.match(/portfolios?\/(\d+)/)?.[1] ?? 1)
        let data: unknown
        if (url === '/portfolios') data = [portfolio]
        else if (url.startsWith('/transactions/portfolio/')) data = populated ? [{ ...transaction, portfolioId: id }] : []
        else if (url.endsWith('/positions/valuations')) data = populated ? [position] : []
        else if (url.endsWith('/incomes') || url.includes('/incomes/portfolio/')) data = []
        else if (url.endsWith('/realized-results')) data = []
        else if (url.endsWith('/returns')) data = { portfolioId: id, startDate: '2026-09-20', endDate: '2026-09-21', totalReturn: populated ? 0 : null, points: populated ? [point] : [] }
        else if (url.endsWith('/history')) data = { portfolioId: id, period: config?.params.period, startDate: '2026-09-20', endDate: '2026-09-21', granularity: 'DAILY', points: populated ? [{ date: '2026-09-21', value: 1000 }] : [] }
        else if (url.endsWith('/benchmark-comparison')) data = populated ? [comparison] : []
        else throw new Error('Unexpected request: ' + url)
        return { data } as AxiosResponse
    })
})

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const open = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>)
const card = (label: string) => screen.getByText(label, { exact: true }).closest('article')!
const ready = async () => {
    await screen.findByText('Patrimônio atual', { exact: true })
    await waitFor(() => expect(card('Patrimônio atual').textContent).not.toContain('Carregando...'))
}

describe('Dashboard data availability', () => {
    it('shows incomplete benchmark history without hiding portfolio metrics or inventing returns', async () => {
        populated = true
        override = url => {
            if (url.endsWith('/benchmark-comparison')) throw httpError(503, { error: 'Histórico de benchmark incompleto' })
            return unchanged
        }
        open()
        await ready()
        expect(await screen.findByText('Histórico de CDI ou Ibovespa incompleto no período solicitado. Comparação indisponível.')).toBeTruthy()
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
        expect(within(screen.getByRole('heading', { name: 'Rentabilidade ponderada' }).closest('section')!).queryByTestId('chart')).toBeNull()
    })

    it('keeps unsupported valuation explicit without partial totals or invented returns', async () => {
        populated = true
        const message = 'Cotação e avaliação de mercado indisponíveis para BTC: a classe CRYPTO não possui fonte de preço implementada.'
        override = url => {
            if (['/positions/valuations', '/history', '/returns', '/benchmark-comparison'].some(path => url.endsWith(path))) {
                throw httpError(404, { status: 404, error: 'Cotação não suportada', message })
            }
            return unchanged
        }
        open()
        await ready()
        expect(card('Patrimônio atual').textContent).toContain('Indisponível')
        expect(card('Patrimônio atual').textContent).not.toContain('0,00')
        expect(screen.getAllByRole('alert').some(node => node.textContent?.includes(message))).toBe(true)
        expect(screen.queryAllByTestId('chart')).toHaveLength(0)
        expect(screen.queryByText(/Esta carteira ainda não possui transações/)).toBeNull()
        expect(card('Proventos recebidos').textContent).toContain('0,00')
    })

    it('includes past and today payments but excludes future registered income', async () => {
        populated = true
        override = url => url.includes('/incomes/portfolio/') ? [
            { totalAmount: 10, received: true, paymentDate: '2026-10-30' },
            { totalAmount: 20, received: true, paymentDate: '2026-10-31' },
            { totalAmount: 1000, received: false, paymentDate: '2026-11-01' },
        ] : unchanged
        open()
        await ready()
        await waitFor(() => expect(card('Proventos recebidos').textContent).toContain('30,00'))
        expect(card('Proventos recebidos').textContent).not.toContain('1.030,00')
    })

    it('shows real zero received when every registered payment is future', async () => {
        populated = true
        override = url => url.includes('/incomes/portfolio/') ? [{ totalAmount: 1000, received: false }] : unchanged
        open()
        await ready()
        await waitFor(() => expect(card('Proventos recebidos').textContent).toContain('0,00'))
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('does not classify missing payment status as future or zero', async () => {
        override = url => url.includes('/incomes/portfolio/') ? [{ totalAmount: 1000 }] : unchanged
        open()
        await ready()
        await waitFor(() => expect(card('Proventos recebidos').textContent).toContain('Indisponível'))
        expect(card('Proventos recebidos').textContent).not.toContain('0,00')
    })

    it('does not turn an income request failure into received zero', async () => {
        override = url => { if (url.includes('/incomes/portfolio/')) throw httpError(500); return unchanged }
        open()
        await ready()
        await waitFor(() => expect(card('Proventos recebidos').textContent).toContain('Indisponível'))
        expect(screen.getAllByRole('alert').some(node => node.textContent?.includes('HTTP 500'))).toBe(true)
    })
    it('renders a newly created empty portfolio without errors or invented returns', async () => {
        open()
        await ready()
        expect(screen.getByText(/Esta carteira ainda não possui transações/)).toBeTruthy()
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
        expect(screen.getAllByText('Sem dados suficientes')).toHaveLength(4)
        expect(card('Patrimônio atual').textContent).toContain('0,00')
        expect(screen.queryByText('+0,00%')).toBeNull()
        expect(screen.getByText('Nenhum histórico disponível.')).toBeTruthy()
    })

    it('distinguishes no portfolios from an empty existing portfolio', async () => {
        override = url => url === '/portfolios' ? [] : unchanged
        open()
        expect(await screen.findByText('Nenhuma carteira encontrada.')).toBeTruthy()
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
    })

    it('does not call a portfolio-list failure an empty account', async () => {
        override = url => { if (url === '/portfolios') throw httpError(500); return unchanged }
        open()
        expect((await screen.findByRole('alert')).textContent).toContain('HTTP 500')
        expect(screen.queryByText('Nenhuma carteira encontrada.')).toBeNull()
        expect(screen.queryByText('Patrimônio atual')).toBeNull()
    })

    it('shows actual zero returns and retains null benchmark gaps', async () => {
        populated = true
        open()
        await ready()
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
        expect(screen.queryByText('Sem dados suficientes')).toBeNull()
        expect(screen.getAllByText('+0,00%').length).toBeGreaterThanOrEqual(3)
        const charts = screen.getAllByTestId('chart').map(chart => chart.textContent).join('')
        expect(charts).toContain('"cdiReturnPercent":null')
        expect(charts).toContain('"ibovReturnPercent":0')
        expect(screen.getByText(/CDI indisponível no período/)).toBeTruthy()
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('does not call an initial purchase an empty portfolio or 0% return', async () => {
        override = url => url.startsWith('/transactions/portfolio/') ? [transaction] : unchanged
        open()
        await ready()
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
        expect(screen.getAllByText('Sem dados suficientes').length).toBeGreaterThan(0)
        expect(screen.queryByText('+0,00%')).toBeNull()
    })

    it.each([500, 404, 400, 503, undefined])('preserves other metrics and shows a failed return request (%s)', async status => {
        populated = true
        override = (url, config) => { if (url.endsWith('/returns') && config?.params.period === 'ALL') throw httpError(status); return unchanged }
        open()
        await ready()
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
        expect(screen.getAllByText('+0,00%').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Indisponível').length).toBeGreaterThan(0)
        expect(screen.getAllByRole('alert').map(node => node.textContent).join(' ')).toContain(status ? 'HTTP ' + status : 'conexão ou tempo limite')
        expect(screen.queryByText('Nenhuma rentabilidade mensal disponível.')).toBeNull()
    })

    it('distinguishes explicit missing quotes from generic HTTP failures', async () => {
        populated = true
        override = url => { if (url.endsWith('/positions/valuations')) throw httpError(404, { status: 404, error: 'Cotação indisponível' }); return unchanged }
        open()
        await ready()
        expect(card('Patrimônio atual').textContent).toContain('Indisponível')
        expect(card('Patrimônio atual').textContent).not.toContain('0,00')
        expect(screen.getAllByRole('alert').some(node => node.textContent?.includes('Cotação indisponível'))).toBe(true)
        expect(screen.queryByText('Nenhuma posição encontrada.')).toBeNull()
        expect(screen.getAllByText('+0,00%').length).toBeGreaterThan(0)
    })

    it.each([null, {}, { portfolioId: 1, startDate: '2026-09-20', endDate: '2026-09-21', totalReturn: null, points: [point] }])('rejects malformed successful return payloads', async invalid => {
        populated = true
        override = (url, config) => url.endsWith('/returns') && config?.params.period === 'ALL' ? invalid : unchanged
        open()
        await ready()
        expect(screen.getAllByRole('alert').some(node => node.textContent?.includes('Resposta inválida'))).toBe(true)
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
        expect(screen.queryByText('Nenhuma rentabilidade mensal disponível.')).toBeNull()
    })

    it.each([401, 403])('keeps authorization failures visible without empty/zero metrics (%s)', async status => {
        override = url => { if (url.endsWith('/returns')) throw httpError(status); return unchanged }
        open()
        await screen.findByRole('alert')
        expect(screen.queryByText('Patrimônio atual')).toBeNull()
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
        expect(screen.queryByText('+0,00%')).toBeNull()
    })

    it('does not infer an empty portfolio when transactions fail to load', async () => {
        override = url => { if (url.startsWith('/transactions/portfolio/')) throw httpError(500); return unchanged }
        open()
        await ready()
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
        expect(screen.getByRole('alert').textContent).toContain('Transações:')
    })

    it('clears the old comparison when changing periods fails', async () => {
        populated = true
        override = (url, config) => { if (url.endsWith('/benchmark-comparison') && config?.params.period === 'THREE_MONTHS') throw httpError(500); return unchanged }
        open()
        await ready()
        const section = screen.getByRole('heading', { name: 'Rentabilidade ponderada' }).closest('section')!
        expect(within(section).getByTestId('chart')).toBeTruthy()
        fireEvent.click(within(section).getByRole('button', { name: '3M' }))
        await waitFor(() => expect(within(section).queryByTestId('chart')).toBeNull())
        expect((await within(section).findByRole('alert')).textContent).toContain('HTTP 500')
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
    })

    it('clears values when switching from a populated portfolio to an empty one', async () => {
        populated = true
        override = url => url === '/portfolios' ? [portfolio, { ...portfolio, id: 2, name: 'Nova' }] : unchanged
        open()
        await ready()
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
        populated = false
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        fireEvent.click(screen.getByRole('button', { name: 'Selecionar Nova' }))
        await screen.findByText(/Esta carteira ainda não possui transações/)
        expect(card('Patrimônio atual').textContent).toContain('0,00')
        expect(screen.queryByText('+0,00%')).toBeNull()
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('renders available data while benchmark remains pending, then shows its technical error', async () => {
        populated = true
        let rejectComparison!: (reason: unknown) => void
        const pending = new Promise((_resolve, reject) => { rejectComparison = reject })
        override = url => url.endsWith('/benchmark-comparison') ? pending : unchanged
        open()
        await ready()
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
        expect(screen.getByText('Carregando rentabilidade...')).toBeTruthy()
        const comparisonSection = screen.getByRole('heading', { name: 'Rentabilidade ponderada' }).closest('section')!
        expect((within(comparisonSection).getByRole('button', { name: '3M' }) as HTMLButtonElement).disabled).toBe(true)
        expect((screen.getByRole('button', { name: 'Carteira' }) as HTMLButtonElement).disabled).toBe(false)
        expect(screen.queryByText('Carregando dados da carteira...')).toBeNull()
        await act(async () => rejectComparison(httpError(500)))
        expect(screen.getAllByRole('alert').some(node => node.textContent?.includes('HTTP 500'))).toBe(true)
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
    })

    it('does not display a pending position as zero or as an empty portfolio', async () => {
        populated = true
        let resolvePositions!: (value: unknown) => void
        const pending = new Promise(resolve => { resolvePositions = resolve })
        override = url => url.endsWith('/positions/valuations') ? pending : unchanged
        open()
        await screen.findByText('Patrimônio atual', { exact: true })
        await waitFor(() => expect(card('Proventos recebidos').textContent).toContain('0,00'))
        expect(card('Patrimônio atual').textContent).toContain('Carregando...')
        expect(card('Patrimônio atual').textContent).not.toContain('0,00')
        expect(screen.queryByText(/Esta carteira ainda/)).toBeNull()
        await act(async () => resolvePositions([position]))
        expect(card('Patrimônio atual').textContent).toContain('1.000,00')
    })

    it('ignores a late response belonging to the previous portfolio', async () => {
        populated = true
        let resolveComparison!: (value: unknown) => void
        const pending = new Promise(resolve => { resolveComparison = resolve })
        override = url => {
            if (url === '/portfolios') return [portfolio, { ...portfolio, id: 2, name: 'Nova' }]
            if (url === '/portfolios/1/benchmark-comparison') return pending
            return unchanged
        }
        open()
        await ready()
        populated = false
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        fireEvent.click(screen.getByRole('button', { name: 'Selecionar Nova' }))
        await screen.findByText(/Esta carteira ainda não possui transações/)
        await act(async () => resolveComparison([comparison]))
        expect(screen.queryAllByTestId('chart')).toHaveLength(0)
        expect(screen.queryByText('+0,00%')).toBeNull()
        expect(screen.getByRole('button', { name: 'Carteira' }).textContent).toContain('Nova')
    })
})


it('preserves valid valuation and full accounting without treating missing SOL as zero', async () => {
    populated = true
    override = url => url.endsWith('/positions/valuations') ? [position, {
        ...position, assetId: 2, assetTicker: 'SOL', totalCost: 500,
        currentPrice: null, currentValue: null, profitLoss: null, profitabilityPercent: null,
        valuationStatus: 'UNAVAILABLE', reason: 'Criptomoeda sem suporte de avaliação',
    }] : unchanged
    open()
    await screen.findByText('Patrimônio parcialmente avaliado', { exact: true })
    expect(card('Patrimônio parcialmente avaliado').textContent).toContain('1.000,00')
    expect(card('Custo investido').textContent).toContain('1.500,00')
    expect(card('Resultado não realizado').textContent).toContain('0,00')
    expect(card('Resultado não realizado').textContent).not.toContain('500,00')
    expect(screen.getByText('Criptomoeda sem suporte de avaliação')).toBeTruthy()
})

it('labels mixed CDI availability accurately and keeps gaps in chart data', async () => {
    populated = true
    override = url => url.endsWith('/benchmark-comparison') ? [comparison, { ...comparison, date: '2026-09-22', cdiReturn: 0.001 }] : unchanged
    open()
    await ready()
    expect(screen.getByText(/CDI parcialmente disponível/)).toBeTruthy()
    expect(screen.queryByText(/CDI indisponível no período/)).toBeNull()
    const charts = screen.getAllByTestId('chart').map(p => p.textContent).join('')
    expect(charts).toContain('"cdiReturnPercent":null')
    expect(charts).toContain('"cdiReturnPercent":0.1')
})

describe('IM-051: gerenciamento pelo seletor do Dashboard', () => {
    it('cria e seleciona uma carteira no proprio Dashboard', async () => {
        const create = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 8, name: 'Reserva', description: '' } })
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        fireEvent.click(screen.getByRole('button', { name: '+ Criar nova carteira' }))
        fireEvent.change(screen.getByLabelText('Nome da nova carteira'), { target: { value: ' Reserva ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Criar e selecionar' }))
        await waitFor(() => expect(create).toHaveBeenCalledWith('/portfolios', { name: 'Reserva' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Carteira' }).textContent).toContain('Reserva'))
        expect(screen.getByText('Carteira criada e selecionada.')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        expect(screen.getByRole('button', { name: 'Selecionar Reserva' })).toBeTruthy()
    })

    it('renomeia a carteira selecionada sem alterar sua identificacao', async () => {
        const rename = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...portfolio, name: 'Nova' } })
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Ações da carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Renomear carteira selecionada' }))
        fireEvent.change(screen.getByLabelText('Novo nome da carteira'), { target: { value: ' Nova ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }))
        await waitFor(() => expect(rename).toHaveBeenCalledWith('/portfolios/1/name', { name: 'Nova' }))
        expect(screen.getByRole('button', { name: 'Carteira' }).textContent).toContain('Nova')
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        expect(screen.getByRole('button', { name: 'Selecionar Nova' })).toBeTruthy()
    })
})


describe('IM-053: UX do gerenciamento de carteiras', () => {
    it('mantém a lista de seleção livre das ações de gerenciamento', async () => {
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Carteira' }))
        const menu = screen.getByLabelText('Carteiras disponíveis')
        expect(menu.querySelectorAll('button').length).toBe(2)
        expect(screen.queryByRole('button', { name: 'Excluir carteira selecionada' })).toBeNull()
        expect(screen.getByRole('button', { name: 'Selecionar Principal' })).toBeTruthy()
    })

    it('abre a confirmação fora da lista rolável', async () => {
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Ações da carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Excluir carteira selecionada' }))
        const dialog = screen.getByRole('dialog', { name: 'Confirmar exclusão de carteira' })
        expect(dialog.textContent).toContain('Excluir carteira definitivamente?')
        expect(screen.queryByLabelText('Carteiras disponíveis')).toBeNull()
    })
})

describe('IM-053: exclusão segura de carteiras', () => {
    it('exige confirmação pelo nome exato antes de excluir', async () => {
        const remove = vi.spyOn(api, 'delete').mockResolvedValue({ status: 204 })
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Ações da carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Excluir carteira selecionada' }))
        const confirm = screen.getByRole('button', { name: 'Excluir definitivamente' }) as HTMLButtonElement
        expect(confirm.disabled).toBe(true)
        fireEvent.change(screen.getByLabelText('Digite o nome exato da carteira para confirmar'), { target: { value: 'Outra' } })
        expect(confirm.disabled).toBe(true)
        expect(remove).not.toHaveBeenCalled()
        fireEvent.change(screen.getByLabelText('Digite o nome exato da carteira para confirmar'), { target: { value: 'Principal' } })
        expect(confirm.disabled).toBe(false)
        fireEvent.click(confirm)
        await waitFor(() => expect(remove).toHaveBeenCalledWith('/portfolios/1'))
        await screen.findByText('Nenhuma carteira encontrada.')
        expect(screen.queryByRole('button', { name: 'Selecionar Principal' })).toBeNull()
    })

    it('cancelamento não executa exclusão', async () => {
        const remove = vi.spyOn(api, 'delete')
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Ações da carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Excluir carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByRole('button', { name: 'Excluir definitivamente' })).toBeNull()
        expect(remove).not.toHaveBeenCalled()
    })

    it('falha no DELETE mantém a carteira disponível', async () => {
        vi.spyOn(api, 'delete').mockRejectedValue(new Error('falha'))
        open()
        await ready()
        fireEvent.click(screen.getByRole('button', { name: 'Ações da carteira selecionada' }))
        fireEvent.click(screen.getByRole('button', { name: 'Excluir carteira selecionada' }))
        fireEvent.change(screen.getByLabelText('Digite o nome exato da carteira para confirmar'), { target: { value: 'Principal' } })
        fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Não foi possível excluir a carteira. Nenhum dado foi removido da interface.')
        expect(screen.getByRole('button', { name: 'Carteira' }).textContent).toContain('Principal')
    })
})
