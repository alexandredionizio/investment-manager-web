import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import B3RejectedAttemptHistory from './B3RejectedAttemptHistory'
import { listB3RejectedAttempts, resolveB3RejectedRow } from '../services/b3ImportService'

vi.mock('../services/b3ImportService', () => ({ listB3RejectedAttempts: vi.fn(), resolveB3RejectedAttempt: vi.fn(), resolveB3RejectedRow: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('B3RejectedAttemptHistory', () => {
  it('consulta somente após ação do usuário e apresenta linhas sem IDs internos', async () => {
    vi.mocked(listB3RejectedAttempts).mockResolvedValue([{ id: 81, fileName: 'negociacao.xlsx',
      rejectedAt: '2026-11-12T15:00:00-03:00', reason: 'Conciliação alterada',
      rows: [{ excelRow: 4, reason: 'Quantidade inválida' }] }])
    render(<B3RejectedAttemptHistory portfolioId={6} />)
    expect(listB3RejectedAttempts).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar rejeições' }))
    await waitFor(() => expect(listB3RejectedAttempts).toHaveBeenCalledTimes(1))
    expect(listB3RejectedAttempts).toHaveBeenCalledWith(expect.anything(), 6)
    await waitFor(() => expect(screen.getByText(/negociacao.xlsx/)).toBeTruthy())
    fireEvent.click(screen.getByText(/negociacao.xlsx/))
    expect(screen.getByRole('region', { name: 'Histórico de importações rejeitadas' }).textContent)
      .toMatch(/Linha\s*4\s*:\s*Quantidade inválida/)
    expect(screen.getByRole('region', { name: 'Histórico de importações rejeitadas' }).textContent)
      .not.toMatch(/Lote #81|Carteira #6|ID 81/)
  })
  it('permite arquivar pendência com justificativa sem apagar seu histórico', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(listB3RejectedAttempts)
      .mockResolvedValueOnce([{ id: 91, fileName: 'b3.xlsx', rejectedAt: '2026-11-15T19:00:00-03:00',
        reason: 'Importação parcial', resolutionStatus: 'OPEN', rows: [{ excelRow: 10, ticker: 'BARI11', reason: 'Sem cadastro', resolutionStatus: 'OPEN' }] }])
      .mockResolvedValueOnce([{ id: 91, fileName: 'b3.xlsx', rejectedAt: '2026-11-15T19:00:00-03:00',
        reason: 'Importação parcial', resolutionStatus: 'OPEN', rows: [{ excelRow: 10, ticker: 'BARI11', reason: 'Sem cadastro', resolutionStatus: 'RESOLVED' }] }])
    render(<B3RejectedAttemptHistory portfolioId={6} />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar rejeições' }))
    await waitFor(() => expect(screen.getByText(/b3.xlsx/)).toBeTruthy())
    fireEvent.click(screen.getByText(/b3.xlsx/))
    fireEvent.change(screen.getByLabelText(/Motivo da resolução/),
      { target: { value: 'Ativo corrigido e importado em novo arquivo B3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar linha 10 após conferência' }))
    await waitFor(() => expect(resolveB3RejectedRow).toHaveBeenCalledWith(
      expect.anything(), 6, 91, 10, 'Ativo corrigido e importado em novo arquivo B3'))
    await waitFor(() => expect(screen.getByText(/Arquivada/)).toBeTruthy())
    expect(screen.getByText(/Linha 10 \(BARI11\)/)).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('falha de consulta não é apresentada como histórico vazio', async () => {
    vi.mocked(listB3RejectedAttempts).mockRejectedValue(new Error('indisponível'))
    render(<B3RejectedAttemptHistory portfolioId={6} />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar rejeições' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível consultar/))
    expect(screen.queryByText(/Nenhuma tentativa rejeitada/)).toBeNull()
  })
})
