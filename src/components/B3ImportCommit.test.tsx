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
  it('IM-044: nova conciliação exige nova confirmação explícita', () => {
    const onCommit = vi.fn(async () => {})
    const view = (generation: number) => <B3ImportCommit key={`reconciliation-${generation}`} reconciliation={ready}
      loading={false} error="" result={null} onCommit={onCommit} />
    const { rerender } = render(view(1))
    fireEvent.click(screen.getByRole('checkbox'))
    expect((screen.getByRole('button', { name: /importar definitivamente/i }) as HTMLButtonElement).disabled).toBe(false)
    rerender(view(2))
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button', { name: /importar definitivamente/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(onCommit).not.toHaveBeenCalled()
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
    expect(screen.getByRole('link', { name: 'Ver posições da carteira' }).getAttribute('href')).toBe('/portfolios/6')
    expect(screen.getByRole('link', { name: 'Ver indicadores' }).getAttribute('href')).toBe('/dashboard')
    expect(screen.getByRole('status').textContent).not.toMatch(/Lote #|Carteira #|banco de dados de testes/)
  })
  it('reimportação idempotente comunica ausência de novo lançamento e não expõe identificadores técnicos', () => {
    const onCommit = vi.fn(async () => {})
    render(<B3ImportCommit reconciliation={null} loading={false} error="" result={{
      batchId: 91, portfolioId: 6, status: 'ALREADY_IMPORTED', importedRows: 0,
      rows: [{ excelRow: 2, transactionId: 80 }, { excelRow: 3, transactionId: 81 }],
    }} onCommit={onCommit} />)
    expect(screen.getByText(/Este lote já havia sido importado/i)).toBeTruthy()
    expect(screen.getByText(/Nenhuma operação adicional foi registrada/i)).toBeTruthy()
    expect(screen.getByText(/2 operações vinculadas/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /importar definitivamente/i })).toBeNull()
    expect(screen.getByRole('status').textContent).not.toMatch(/91|80|81|Carteira #|Lote #/)
    expect(onCommit).not.toHaveBeenCalled()
  })
  it('resumo pré-confirmação não expõe IDs nem chama ambiente de produção de testes', () => {
    render(<B3ImportCommit reconciliation={ready} loading={false} error="" result={null} onCommit={vi.fn()} />)
    expect(screen.getByText(/2 operações/, { selector: 'strong' })).toBeTruthy()
    expect(screen.getByText(/registra compras e vendas na carteira selecionada/i)).toBeTruthy()
    expect(screen.queryByText(/banco de dados de testes|Carteira #6|IM-042/i)).toBeNull()
  })
})
