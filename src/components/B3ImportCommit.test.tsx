import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import B3ImportCommit from './B3ImportCommit'
import type { B3ReconciliationResponse } from '../types/b3Import'

afterEach(cleanup)
const ready: B3ReconciliationResponse = {
  fileName: 'teste.xlsx', portfolioId: 6, totalRows: 2,
  readyRows: 2, reviewRows: 0, blockedRows: 0, rows: [],
}

describe('B3ImportCommit', () => {
  it('nunca importa sem ato de confirmação', () => {
    const onCommit = vi.fn(async () => {})
    render(<B3ImportCommit reconciliation={ready} loading={false} error="" result={null} onCommit={onCommit} />)
    const button = screen.getByRole('button', { name: /importar definitivamente/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })
  it('bloqueia lote em revisão', () => {
    const onCommit = vi.fn(async () => {})
    render(<B3ImportCommit reconciliation={{ ...ready, readyRows: 1, reviewRows: 1 }} loading={false} error="" result={null} onCommit={onCommit} />)
    expect(screen.queryByRole('button', { name: /importar definitivamente/i })).toBeNull()
    expect(screen.getByText(/importação está bloqueada/i)).toBeTruthy()
    expect(onCommit).not.toHaveBeenCalled()
  })
  it('apresenta os dados do lote persistido sem novo botão de gravação', () => {
    render(<B3ImportCommit reconciliation={null} loading={false} error="" result={{
      batchId: 91, portfolioId: 6, status: 'IMPORTED', importedRows: 2,
      rows: [{ excelRow: 2, transactionId: 80 }, { excelRow: 3, transactionId: 81 }],
    }} onCommit={vi.fn()} />)
    expect(screen.getByText(/Importação concluída/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /importar definitivamente/i })).toBeNull()
  })
})
