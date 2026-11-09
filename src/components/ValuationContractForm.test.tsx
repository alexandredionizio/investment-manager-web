import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../services/api'
import ValuationContractForm from './ValuationContractForm'
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('starts without invented rates and saves confirmed contractual data', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null })
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    const onSaved = vi.fn().mockResolvedValue(undefined)
    render(<ValuationContractForm portfolioId={1} assetId={2} assetType="FIXED_INCOME" onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Complementar contrato' }))
    const product = await screen.findByLabelText('Produto')
    expect((screen.getByLabelText('Taxa efetiva anual (%)') as HTMLInputElement).value).toBe('')
    fireEvent.change(product, { target: { value: 'CDB' } })
    fireEvent.change(screen.getByLabelText('Data de aplicação'), { target: { value: '2026-01-05' } })
    fireEvent.change(screen.getByLabelText('Vencimento final'), { target: { value: '2027-01-05' } })
    fireEvent.change(screen.getByLabelText('Remuneração'), { target: { value: 'PRE_FIXED' } })
    fireEvent.change(screen.getByLabelText('Convenção de juros'), { target: { value: 'BUSINESS_252' } })
    fireEvent.change(screen.getByLabelText('Taxa efetiva anual (%)'), { target: { value: '12.5' } })
    fireEvent.click(screen.getByLabelText(/Confirmo pagamento único/))
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar contrato' }).closest('form')!)
    await screen.findByText('Contrato salvo.')
    expect(put).toHaveBeenCalledWith('/portfolios/1/assets/2/valuation-contract', expect.objectContaining({
        annualRate: 12.5, applicationDate: '2026-01-05', bulletPaymentConfirmed: true,
        brazilResidentIndividual: false, cdiPercent: null,
    }))
    expect(onSaved).toHaveBeenCalledOnce()
})
it('keeps invalid contract visible and reports backend validation', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null })
    vi.spyOn(api, 'put').mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Contrato incompatível' } } })
    const onSaved = vi.fn()
    render(<ValuationContractForm portfolioId={1} assetId={2} assetType="TREASURE" onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Complementar contrato' }))
    await screen.findByLabelText('Produto')
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar contrato' }).closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Contrato incompatível'))
    expect(onSaved).not.toHaveBeenCalled()
})
