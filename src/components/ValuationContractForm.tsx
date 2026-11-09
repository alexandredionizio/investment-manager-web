import { useState } from 'react'
import api from '../services/api'
import { isAxiosError } from 'axios'

type Terms = {
    instrument: string; maturityDate: string; applicationDate: string | null
    rateType: string | null; dayCount: string | null; annualRate: number | null
    cdiPercent: number | null; ipcaLagMonths: number | null; conversionDate: string | null
    brazilResidentIndividual: boolean; bulletPaymentConfirmed: boolean
}
const fixedOptions = [['CDB', 'CDB'], ['LCI', 'LCI'], ['LCA', 'LCA']]
const treasuryOptions = [
    ['TESOURO_SELIC', 'Tesouro Selic'], ['TESOURO_PREFIXADO', 'Tesouro Prefixado'],
    ['TESOURO_PREFIXADO_JUROS', 'Tesouro Prefixado com Juros Semestrais'],
    ['TESOURO_IPCA', 'Tesouro IPCA+'], ['TESOURO_IPCA_JUROS', 'Tesouro IPCA+ com Juros Semestrais'],
    ['TESOURO_RENDA', 'Tesouro RendA+'],
]
const empty: Terms = { instrument: '', maturityDate: '', applicationDate: null, rateType: null,
    dayCount: null, annualRate: null, cdiPercent: null, ipcaLagMonths: null,
    conversionDate: null, brazilResidentIndividual: false, bulletPaymentConfirmed: false }

export default function ValuationContractForm({ portfolioId, assetId, assetType, onSaved }: {
    portfolioId: number; assetId: number; assetType: string; onSaved: () => Promise<void>
}) {
    const [terms, setTerms] = useState<Terms | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)
    const treasury = assetType === 'TREASURE'
    const endpoint = '/portfolios/' + portfolioId + '/assets/' + assetId + '/valuation-contract'
    const update = (key: keyof Terms, value: string | number | boolean | null) => setTerms(current => current && ({ ...current, [key]: value }))
    async function open() {
        setBusy(true); setError(''); setSaved(false)
        try { const response = await api.get<Terms | null>(endpoint); setTerms(response.data || { ...empty }) }
        catch { setError('Não foi possível carregar o contrato. Tente novamente.') }
        finally { setBusy(false) }
    }
    async function save(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true); setError('')
        try {
            await api.put(endpoint, terms)
            await onSaved(); setTerms(null); setSaved(true)
        } catch (e) {
            setError(isAxiosError(e) && typeof e.response?.data?.message === 'string'
                ? e.response.data.message : 'Não foi possível salvar ou atualizar a avaliação. Confira os dados do contrato.')
        } finally { setBusy(false) }
    }
    const field = (key: keyof Terms, label: string, type: 'date' | 'number', required = true) => <label>
        {label}<input type={type} required={required} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined}
            value={String(terms?.[key] ?? '')} onChange={e => update(key, e.target.value === '' ? null : type === 'number' ? Number(e.target.value) : e.target.value)} />
    </label>
    return <div>
        {error && <p role="alert">{error}</p>}
        {saved && <p role="status">Contrato salvo.</p>}
        {!terms ? <button type="button" disabled={busy} onClick={open}>Complementar contrato</button> : <form className="valuation-contract-form" onSubmit={save}>
            <p>Informe somente condições confirmadas no contrato. Cada aplicação de renda fixa deve ter seu próprio ativo, com pagamento único no vencimento.</p>
            <label>Produto<select required value={terms.instrument} onChange={e => update('instrument', e.target.value)}>
                <option value="">Selecione</option>{(treasury ? treasuryOptions : fixedOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
            {field('maturityDate', 'Vencimento final', 'date')}
            {treasury && terms.instrument === 'TESOURO_RENDA' && <>
                {field('conversionDate', 'Primeiro pagamento (conversão)', 'date')}
                <p>RendA+: 240 parcelas mensais; vencimento final 239 meses após a conversão. Avaliação disponível somente na acumulação.</p>
            </>}
            {!treasury && <>
                {field('applicationDate', 'Data de aplicação', 'date')}
                <label>Remuneração<select required value={terms.rateType ?? ''} onChange={e => update('rateType', e.target.value)}>
                    <option value="">Selecione</option><option value="PRE_FIXED">Prefixado</option><option value="CDI_PERCENT">Percentual do CDI</option><option value="IPCA_PLUS">IPCA + taxa fixa</option>
                </select></label>
                <label>Convenção de juros<select required value={terms.dayCount ?? ''} onChange={e => update('dayCount', e.target.value)}>
                    <option value="">Selecione</option><option value="BUSINESS_252">Dias úteis ANBIMA / 252</option><option value="ACT_365">Dias corridos / 365</option>
                </select></label>
                {terms.rateType === 'CDI_PERCENT' ? field('cdiPercent', 'Percentual do CDI (%)', 'number') : field('annualRate', 'Taxa efetiva anual (%)', 'number')}
                {terms.rateType === 'IPCA_PLUS' && <>
                    <label>Defasagem IPCA<select required value={terms.ipcaLagMonths ?? ''} onChange={e => update('ipcaLagMonths', Number(e.target.value))}>
                        <option value="">Selecione</option><option value="1">1 mês</option><option value="2">2 meses</option>
                    </select></label>
                    <p>Use somente contratos com IPCA mensal observado, pro rata geométrico em dias corridos e aniversário no dia da aplicação (1 a 28).</p>
                </>}
                <label><input type="checkbox" required checked={terms.bulletPaymentConfirmed} onChange={e => update('bulletPaymentConfirmed', e.target.checked)} />Confirmo pagamento único no vencimento, sem cupons nem amortizações intermediárias.</label>
                <label><input type="checkbox" checked={terms.brazilResidentIndividual} onChange={e => update('brazilResidentIndividual', e.target.checked)} />Confirmo pessoa física residente no Brasil para simular o líquido, sem taxas/custódia.</label>
            </>}
            <button type="submit" disabled={busy}>Salvar contrato</button>
            <button type="button" disabled={busy} onClick={() => setTerms(null)}>Cancelar</button>
        </form>}
    </div>
}
