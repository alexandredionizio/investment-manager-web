import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { XirrPreviewCard } from './XirrPreviewCard'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('IM-031.5 — XIRR anualizada prévia', () => {
  it('exibe a taxa anualizada apenas para resultado provisório válido', async () => {
    const loadPreview = vi.fn().mockResolvedValue({ status: 'PROVISIONAL_XIRR', annualRate: 0.12, notice: 'Prévia sujeita a conciliação' })
    render(<XirrPreviewCard portfolioId={17} loadPreview={loadPreview} />)
    expect(await screen.findByText('12,00% ao ano')).toBeTruthy()
    expect(screen.getByLabelText('Informações sobre XIRR')).toBeTruthy()
    expect(screen.getByText(/Confira os extratos antes de considerar a taxa definitiva/i)).toBeTruthy()
    expect(loadPreview).toHaveBeenCalledWith(17)
  })

  it('explica ausência de fluxos e não inventa rentabilidade', async () => {
    const loadPreview = vi.fn().mockResolvedValue({ status: 'INSUFFICIENT_OR_AMBIGUOUS_FLOWS', annualRate: null, notice: 'Sem fluxo externo suficiente' })
    render(<XirrPreviewCard portfolioId={17} loadPreview={loadPreview} />)
    expect(await screen.findByText('Sem fluxo externo suficiente')).toBeTruthy()
    expect(screen.queryByText(/% ao ano/)).toBeNull()
  })

  it('mantém indisponibilidade explícita em erro HTTP', async () => {
    render(<XirrPreviewCard portfolioId={17} loadPreview={vi.fn().mockRejectedValue(new Error('503'))} />)
    expect(await screen.findByText(/Não foi possível consultar a XIRR no momento/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignora resposta antiga ao mudar de carteira', async () => {
    let resolveFirst!: (value: { status: string, annualRate: number }) => void
    const first = new Promise<{status: string, annualRate: number}>(resolve => { resolveFirst = resolve })
    const loadPreview = vi.fn((id: number) => id === 1 ? first : Promise.resolve({ status: 'PROVISIONAL_XIRR', annualRate: 0.25 }))
    const view = render(<XirrPreviewCard portfolioId={1} loadPreview={loadPreview} />)
    view.rerender(<XirrPreviewCard portfolioId={2} loadPreview={loadPreview} />)
    expect(await screen.findByText('25,00% ao ano')).toBeTruthy()
    resolveFirst({ status: 'PROVISIONAL_XIRR', annualRate: 0.90 })
    await waitFor(() => { expect(screen.queryByText('90,00% ao ano')).toBeNull() })
  })
})
