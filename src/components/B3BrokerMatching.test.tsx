import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import B3BrokerMatching from './B3BrokerMatching'
import type { B3MatchResponse } from '../types/b3Import'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const matches: B3MatchResponse = {
  fileName: 'teste.xlsx', totalRows: 3, matchedRows: 1, reviewRows: 2, invalidRows: 0,
  rows: [
    { excelRow: 2, ticker: 'PETR4', institution: 'XP', assetStatus: 'MATCHED', assetId: 13, brokerStatus: 'MATCHED', brokerId: 1, brokerSuggestions: [], messages: [] },
    { excelRow: 3, ticker: 'ITUB4', institution: 'ITAU', assetStatus: 'MATCHED', assetId: 1, brokerStatus: 'NOT_FOUND', brokerId: null, brokerSuggestions: [], messages: [] },
    { excelRow: 4, ticker: 'ITSA4', institution: 'ITAU', assetStatus: 'NOT_FOUND', assetId: null, brokerStatus: 'NOT_FOUND', brokerId: null, brokerSuggestions: [], messages: [] },
  ],
}

describe('B3BrokerMatching', () => {
  it('agrupa instituições pendentes e não permite confirmar sem escolher uma corretora', () => {
    render(<B3BrokerMatching matches={matches} brokers={[{ id: 1, name: 'XP Investimentos' }]} loading={false} error="" onRetry={() => {}} onConfirmAlias={vi.fn()} />)
    expect(screen.getByText(/ITAU/)).toBeTruthy()
    expect(screen.getByText(/2 negociações/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirmar associação' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/ITSA4/)).toBeTruthy()
  })

  it('cadastra corretora nova somente após confirmação explícita', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onRegisterBroker = vi.fn().mockResolvedValue(undefined)
    render(<B3BrokerMatching matches={matches} brokers={[{ id: 1, name: 'XP Investimentos' }]}
      loading={false} error="" onRetry={() => {}} onConfirmAlias={vi.fn()} onRegisterBroker={onRegisterBroker} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar nova corretora' }))
    const field = screen.getByLabelText('Nome da nova corretora para ITAU')
    fireEvent.change(field, { target: { value: 'Itaú Corretora' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar novo cadastro' }))
    await waitFor(() => expect(onRegisterBroker).toHaveBeenCalledWith('ITAU', 'Itaú Corretora'))
  })

  it('solicita confirmação explícita antes de salvar uma associação', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onConfirmAlias = vi.fn().mockResolvedValue(undefined)
    render(<B3BrokerMatching matches={matches} brokers={[{ id: 1, name: 'XP Investimentos' }]} loading={false} error="" onRetry={() => {}} onConfirmAlias={onConfirmAlias} />)
    fireEvent.change(screen.getByLabelText('Corretora correspondente no IM'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar associação' }))
    await waitFor(() => expect(onConfirmAlias).toHaveBeenCalledWith('ITAU', 1))
  })
})
