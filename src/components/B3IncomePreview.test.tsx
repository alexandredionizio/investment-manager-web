import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import B3IncomePreview from './B3IncomePreview'
import { previewB3Incomes, reconcileB3Incomes, commitB3Incomes } from '../services/b3IncomeService'
import { findAllPortfolios } from '../services/portfolioService'

vi.mock('../services/b3IncomeService', () => ({ previewB3Incomes: vi.fn(), reconcileB3Incomes: vi.fn(), commitB3Incomes: vi.fn() }))
vi.mock('../services/portfolioService', () => ({ findAllPortfolios: vi.fn() }))

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

describe('IM-054: prévia de proventos B3', () => {
  it('não chama a API antes da confirmação e nunca cadastra proventos', async () => {
    vi.mocked(findAllPortfolios).mockResolvedValue([{ id: 3, name: 'Carteira Teste' } as Awaited<ReturnType<typeof findAllPortfolios>>[number]])
    vi.mocked(previewB3Incomes).mockResolvedValue({
      fileName: 'movimentacao.xlsx', totalRows: 1, incomeRows: 1, skippedRows: 0,
      rows: [{ excelRow: 2, paymentDate: '2026-11-10', movement: 'Dividendo',
        product: 'PETR4', institution: 'CORRETORA', type: 'DIVIDEND', quantity: 100,
        unitPrice: 0.5, creditedAmount: 50, errors: [], warnings: ['Data-base não informada'] }],
    })
    render(<B3IncomePreview />)
    expect(screen.getByText('Arquivo').closest('li')?.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Excel (.xlsx), até 10 MB.')).toBeTruthy()
    expect(previewB3Incomes).not.toHaveBeenCalled()
    const file = new File(['arquivo fictício'], 'movimentacao.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(screen.getByLabelText('Planilha de movimentação (.xlsx)'), { target: { files: [file] } })
    expect(previewB3Incomes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos recebidos' }))
    await waitFor(() => expect(previewB3Incomes).toHaveBeenCalledOnce())
    expect(await screen.findByText('PETR4')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Etapas da importação de proventos' }).querySelector('li[aria-current="step"]')?.textContent).toContain('Conferência')
    expect(screen.getByText(/Somente proventos com ativo cadastrado/)).toBeTruthy()
    expect(screen.getByText(/Nenhum provento será gravado nesta etapa/)).toBeTruthy()
    expect(reconcileB3Incomes).not.toHaveBeenCalled()
    await screen.findByRole('option', { name: 'Carteira Teste' })
    fireEvent.change(screen.getByLabelText('Carteira de destino'), { target: { value: '3' } })
    vi.mocked(reconcileB3Incomes).mockResolvedValue({portfolioId: 3, total: 1, identified: 1, blocked: 0, needsReview: 1,
      rows: [{ excelRow: 2, ticker: 'PETR4', assetId: 5, status: 'READY', messages: ['Crédito recebido na B3'] }] })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir ativos e duplicidades' }))
    await waitFor(() => expect(reconcileB3Incomes).toHaveBeenCalledWith(file, 3))
    expect(await screen.findByRole('region', { name: 'Resultado da conciliação de proventos' })).toBeTruthy()
    expect(commitB3Incomes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Importar linha 2' }))
    expect(screen.getByRole('button', { name: 'Confirmar importação de 1 provento(s)' }).hasAttribute('disabled')).toBe(true)
    expect(commitB3Incomes).not.toHaveBeenCalled()
  })
  it('exige confirmação da divergência antes de liquidar a previsão pelo crédito efetivo', async () => {
    vi.mocked(findAllPortfolios).mockResolvedValue([{ id: 3, name: 'Teste' } as Awaited<ReturnType<typeof findAllPortfolios>>[number]])
    vi.mocked(previewB3Incomes).mockResolvedValue({ fileName: 'movimentacao.xlsx', totalRows: 1, incomeRows: 1, skippedRows: 0,
      rows: [{ excelRow: 2, paymentDate: '2026-11-16', movement: 'Rendimento', product: 'HGLG11',
        institution: 'XP', type: 'FII_INCOME', quantity: 54, unitPrice: 1.17,
        creditedAmount: 63.18, errors: [], warnings: [] }] })
    vi.mocked(reconcileB3Incomes).mockResolvedValue({ portfolioId: 3, total: 1, identified: 1, blocked: 0, needsReview: 1,
      rows: [{ excelRow: 2, ticker: 'HGLG11', assetId: 5, status: 'REVIEW_AMOUNT',
        expectedIncomeId: 7, expectedAmount: 60.00, messages: ['Divergência'] }] })
    vi.mocked(commitB3Incomes).mockResolvedValue({ imported: 1, totalCredited: 63.18, incomeIds: [91] })
    render(<B3IncomePreview />)
    const file = new File(['arquivo fictício'], 'movimentacao.xlsx')
    fireEvent.change(screen.getByLabelText('Planilha de movimentação (.xlsx)'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos recebidos' }))
    await screen.findByRole('option', { name: 'Teste' })
    fireEvent.change(screen.getByLabelText('Carteira de destino'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir ativos e duplicidades' }))
    expect(await screen.findByText('Revisar diferença no valor')).toBeTruthy()
    expect(screen.getByText(/Previsão: R\$ 60,00/)).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Importar linha 2' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar importação de 1 provento(s)' })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo os proventos recebidos selecionados/ }))
    fireEvent.click(confirm)
    await waitFor(() => expect(commitB3Incomes).toHaveBeenCalledWith(file, 3,
      [{ excelRow: 2, confirmAmountDifference: true }]))
    expect((await screen.findByRole('link', { name: 'Ver proventos da carteira' })).getAttribute('href')).toBe('/incomes')
    expect(screen.getByRole('link', { name: 'Ver indicadores atualizados' }).getAttribute('href')).toBe('/dashboard')
  })

  it('IM-039: mostra linha, movimento e motivo das exclusões sem gerar lançamentos', async () => {
    vi.mocked(findAllPortfolios).mockResolvedValue([])
    vi.mocked(previewB3Incomes).mockResolvedValue({
      fileName: 'movimentacao.xlsx', totalRows: 2, incomeRows: 0, skippedRows: 2,
      rows: [], skippedDetails: [
        { lineNumber: 2, movement: 'Transferência', reason: 'Movimentação não reconhecida como provento' },
        { lineNumber: 3, movement: 'Direito de Subscrição', reason: 'Sem lançamento automático' },
      ],
    })
    render(<B3IncomePreview />)
    const file = new File(['arquivo fictício'], 'movimentacao.xlsx')
    fireEvent.change(screen.getByLabelText('Planilha de movimentação (.xlsx)'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos recebidos' }))
    const region = await screen.findByRole('region', { name: 'Movimentações ignoradas da B3' })
    expect(region.textContent).toContain('Transferência')
    expect(region.textContent).toContain('Direito de Subscrição')
    expect(region.textContent).toContain('Movimentação não reconhecida como provento')
    expect(region.textContent).toContain('Sem lançamento automático')
    expect(region.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(region.querySelectorAll('tbody tr')[0].textContent).toContain('2')
    expect(region.querySelectorAll('tbody tr')[1].textContent).toContain('3')
    expect(reconcileB3Incomes).not.toHaveBeenCalled()
    expect(commitB3Incomes).not.toHaveBeenCalled()
  })

  it('IM-039: avisa quando a API antiga informa ignorados sem detalhes', async () => {
    vi.mocked(findAllPortfolios).mockResolvedValue([])
    vi.mocked(previewB3Incomes).mockResolvedValue({
      fileName: 'movimentacao.xlsx', totalRows: 1, incomeRows: 0, skippedRows: 1, rows: [],
    })
    render(<B3IncomePreview />)
    fireEvent.change(screen.getByLabelText('Planilha de movimentação (.xlsx)'), {
      target: { files: [new File(['arquivo fictício'], 'movimentacao.xlsx')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos recebidos' }))
    expect(await screen.findByText(/O detalhamento das linhas ignoradas não foi fornecido pela API/)).toBeTruthy()
    expect(commitB3Incomes).not.toHaveBeenCalled()
  })

})
