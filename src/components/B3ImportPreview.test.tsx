import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import B3ImportPreview from './B3ImportPreview'

const sample = {
  fileName: 'negociacao.xlsx', totalRows: 2, validRows: 1, invalidRows: 1,
  rows: [
    { excelRow: 2, tradeDate: '2026-09-01', movementType: 'Compra', market: 'Mercado à Vista', expiry: '-', institution: 'XP', ticker: 'PETR4', quantity: 100, unitPrice: 32.5, totalValue: 3250, errors: [], warnings: [] },
    { excelRow: 3, tradeDate: '2026-09-02', movementType: 'Venda', market: 'Mercado à Vista', expiry: '-', institution: 'XP', ticker: 'ITUB4', quantity: 5, unitPrice: 20, totalValue: 100, errors: ['Data inválida'], warnings: ['Revisar operação'] },
  ],
}

describe('B3ImportPreview', () => {
  it('mostra a prévia sem solicitar gravação de transações', async () => {
    const previewFile = vi.fn().mockResolvedValue(sample)
    render(<B3ImportPreview previewFile={previewFile} />)
    const input = screen.getByLabelText('Planilha de negociações') as HTMLInputElement
    const file = new File(['teste'], 'negociacao.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar negociações' }))
    await waitFor(() => expect(previewFile).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('PETR4')).toBeTruthy()
    expect(screen.getByText('ITUB4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Com erros (1)' }))
    expect(screen.queryByText('PETR4')).toBeNull()
    expect(screen.getByText('ITUB4')).toBeTruthy()
    expect(screen.getByText('Erro: Data inválida')).toBeTruthy()
  })

  it('não envia extensões diferentes de xlsx', () => {
    const previewFile = vi.fn()
    render(<B3ImportPreview previewFile={previewFile} />)
    fireEvent.change(screen.getByLabelText('Planilha de negociações'), {
      target: { files: [new File(['x'], 'dados.csv')] },
    })
    expect(screen.getByRole('alert').textContent).toContain('.xlsx')
    expect(previewFile).not.toHaveBeenCalled()
  })
})
