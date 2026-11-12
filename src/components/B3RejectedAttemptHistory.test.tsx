import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import B3RejectedAttemptHistory from './B3RejectedAttemptHistory'
import { listB3RejectedAttempts } from '../services/b3ImportService'

vi.mock('../services/b3ImportService', () => ({ listB3RejectedAttempts: vi.fn() }))
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
    expect(screen.getByText('Linha 4: Quantidade inválida')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Histórico de importações rejeitadas' }).textContent)
      .not.toMatch(/Lote #81|Carteira #6|ID 81/)
  })
  it('falha de consulta não é apresentada como histórico vazio', async () => {
    vi.mocked(listB3RejectedAttempts).mockRejectedValue(new Error('indisponível'))
    render(<B3RejectedAttemptHistory portfolioId={6} />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar rejeições' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível consultar/))
    expect(screen.queryByText(/Nenhuma tentativa rejeitada/)).toBeNull()
  })
})
