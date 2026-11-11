import B3ExpectedIncomePreview from './B3ExpectedIncomePreview'
import { previewB3ExpectedIncomes, reconcileB3ExpectedIncomes, commitB3ExpectedIncomes } from '../services/b3ExpectedIncomeService'
import { findAllPortfolios } from '../services/portfolioService'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../services/b3ExpectedIncomeService', () => ({ previewB3ExpectedIncomes: vi.fn(), reconcileB3ExpectedIncomes: vi.fn(), commitB3ExpectedIncomes: vi.fn() }))
vi.mock('../services/portfolioService', () => ({ findAllPortfolios: vi.fn() }))
const report = { fileName: 'eventos.xlsx', totalRows: 1, recognizedRows: 1, skippedRows: 0,
  rows: [{ excelRow: 2, product: 'PETR4', eventType: 'Dividendo', type: 'DIVIDEND' as const, expectedPaymentDate: '2026-12-01',
    institution: 'CORRETORA', account: '1', quantity: 100, unitPrice: 0.5, expectedNetAmount: 40, errors: [], warnings: [] }] }
const file = new File(['teste'], 'eventos.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
afterEach(() => {
  cleanup()
})
describe('Proventos previstos B3', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(previewB3ExpectedIncomes).mockResolvedValue(report); vi.mocked(findAllPortfolios).mockResolvedValue([{id: 1, name: 'Teste'}] as Awaited<ReturnType<typeof findAllPortfolios>>) })
  it('apenas pré-visualiza, sem registrar crédito automaticamente', async () => {
    render(<B3ExpectedIncomePreview />)
    expect(screen.getByRole('list', { name: 'Etapas da importação de proventos previstos' }).querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByText('Excel (.xlsx), até 10 MB.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Planilha de Eventos (.xlsx)'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos previstos' }))
    expect(await screen.findByText('PETR4')).toBeTruthy()
    expect(screen.getByText(/R\$\s*40,00/)).toBeTruthy()
    expect(commitB3ExpectedIncomes).not.toHaveBeenCalled()
  })
  it('exige carteira, conciliação, seleção e confirmação antes de registrar previsão', async () => {
    vi.mocked(reconcileB3ExpectedIncomes).mockResolvedValue({ portfolioId: 1, total: 1, ready: 1, blocked: 0,
      rows: [{ excelRow: 2, ticker: 'PETR4', assetId: 10, status: 'READY', messages: [] }] })
    vi.mocked(commitB3ExpectedIncomes).mockResolvedValue({ imported: 1, totalExpectedNet: 40 })
    render(<B3ExpectedIncomePreview />)
    fireEvent.change(screen.getByLabelText('Planilha de Eventos (.xlsx)'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar proventos previstos' }))
    await screen.findByText('PETR4')
    await waitFor(() => expect(findAllPortfolios).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Carteira de destino'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir ativos e duplicidades' }))
    await screen.findByText('Pronto para importar')
    expect(commitB3ExpectedIncomes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Importar previsão linha 2'))
    fireEvent.click(screen.getByLabelText(/Confirmo a importação dos eventos selecionados/))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação de 1 previsão(ões)' }))
    await waitFor(() => expect(commitB3ExpectedIncomes).toHaveBeenCalledOnce())
    expect(await screen.findByText(/Previsões registradas: 1 evento/)).toBeTruthy()
  })
})
