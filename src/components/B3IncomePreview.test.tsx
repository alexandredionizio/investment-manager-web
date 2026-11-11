import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import B3IncomePreview from './B3IncomePreview'
import { previewB3Incomes, reconcileB3Incomes, commitB3Incomes } from '../services/b3IncomeService'
import { findAllPortfolios } from '../services/portfolioService'

vi.mock('../services/b3IncomeService', () => ({ previewB3Incomes: vi.fn(), reconcileB3Incomes: vi.fn(), commitB3Incomes: vi.fn() }))
vi.mock('../services/portfolioService', () => ({ findAllPortfolios: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

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
})
