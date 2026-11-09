import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import B3AssetRegistration from './B3AssetRegistration'
import type { B3MatchResponse } from '../types/b3Import'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const matches: B3MatchResponse = {
  fileName: 'sample.xlsx', totalRows: 2, matchedRows: 0, reviewRows: 2, invalidRows: 0,
  rows: [2, 3].map(excelRow => ({ excelRow, ticker: 'ITSA4', institution: 'ITAU', assetStatus: 'NOT_FOUND', assetId: null, brokerStatus: 'MATCHED', brokerId: 1, brokerSuggestions: [], messages: [] })),
}
describe('B3AssetRegistration', () => {
  it('agrupa por ticker e nunca cadastra durante a consulta', async () => {
    const onLookup = vi.fn().mockResolvedValue({ ticker: 'ITSA4', name: 'Itaúsa', type: 'STOCK', exchange: 'B3', assetId: null, requiresReview: false })
    const onRegister = vi.fn()
    render(<B3AssetRegistration matches={matches} loading={false} onLookup={onLookup} onRegister={onRegister} />)
    expect(screen.getByText(/2 negociações pendentes/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar catálogo B3' }))
    await waitFor(() => expect(screen.getByText(/ITSA4 — Itaúsa/)).toBeTruthy())
    expect(onRegister).not.toHaveBeenCalled()
  })
  it('somente cadastra após confirmação explícita', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onLookup = vi.fn().mockResolvedValue({ ticker: 'ITSA4', name: 'Itaúsa', type: 'STOCK', exchange: 'B3', assetId: null, requiresReview: false })
    const onRegister = vi.fn().mockResolvedValue({ ticker: 'ITSA4', assetId: 42, created: true })
    render(<B3AssetRegistration matches={matches} loading={false} onLookup={onLookup} onRegister={onRegister} />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar catálogo B3' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar cadastro de ITSA4' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cadastro de ITSA4' }))
    expect(onRegister).not.toHaveBeenCalled()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cadastro de ITSA4' }))
    await waitFor(() => expect(onRegister).toHaveBeenCalledWith('ITSA4'))
  })
})
