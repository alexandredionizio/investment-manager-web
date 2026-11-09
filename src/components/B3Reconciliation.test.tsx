import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import B3Reconciliation from './B3Reconciliation'
import type { B3ReconciliationResponse } from '../types/b3Import'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

const result: B3ReconciliationResponse = {
  fileName: 'b3.xlsx', portfolioId: 6, totalRows: 2, readyRows: 1, reviewRows: 0, blockedRows: 1,
  rows: [
    { excelRow: 2, tradeDate: '2026-09-01', ticker: 'PETR4', institution: 'XP', movementType: 'Compra', assetId: 1, brokerId: 2, quantity: 1, unitPrice: 10, status: 'READY', messages: [] },
    { excelRow: 3, tradeDate: '2026-09-02', ticker: 'PETR4', institution: 'XP', movementType: 'Venda', assetId: 1, brokerId: 2, quantity: 5, unitPrice: 11, status: 'BLOCKED', messages: ['Saldo insuficiente'] },
  ],
}

describe('B3Reconciliation', () => {
  it('impede conciliar sem selecionar carteira', () => {
    const onReconcile = vi.fn()
    render(<B3Reconciliation portfolios={[{ id: 6, name: 'Minha Carteira' }]} portfolioId={null} onPortfolioChange={vi.fn()} onReconcile={onReconcile} result={null} loading={false} error="" />)
    expect(screen.getByRole('button', { name: /conferir operações/i }).hasAttribute('disabled')).toBe(true)
    expect(onReconcile).not.toHaveBeenCalled()
  })
  it('mostra bloqueios e alerta que não persiste operações', () => {
    const onReconcile = vi.fn()
    render(<B3Reconciliation portfolios={[{ id: 6, name: 'Minha Carteira' }]} portfolioId={6} onPortfolioChange={vi.fn()} onReconcile={onReconcile} result={result} loading={false} error="" />)
    expect(screen.getByText(/não grava negociações/i)).toBeTruthy()
    expect(screen.getByText('Saldo insuficiente')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /conferir operações/i }))
    expect(onReconcile).toHaveBeenCalledOnce()
  })
})
