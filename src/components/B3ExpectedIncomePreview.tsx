import { useRef, useState } from 'react'
import { previewB3ExpectedIncomes, reconcileB3ExpectedIncomes, commitB3ExpectedIncomes } from '../services/b3ExpectedIncomeService'
import { findAllPortfolios } from '../services/portfolioService'
import type { PortfolioResponse } from '../types/portfolio'
import type { B3ExpectedIncomePreviewResponse, B3ExpectedIncomeReconciliationResponse, B3ExpectedIncomeCommitResponse } from '../types/b3ExpectedIncome'

const money = (amount: number | null) => amount == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
const date = (value: string | null) => value ? value.split('-').reverse().join('/') : '—'

export default function B3ExpectedIncomePreview() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<B3ExpectedIncomePreviewResponse | null>(null)
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
  const [portfolioId, setPortfolioId] = useState<number | null>(null)
  const [reconciled, setReconciled] = useState<B3ExpectedIncomeReconciliationResponse | null>(null)
  const [chosen, setChosen] = useState<Record<number, boolean>>({})
  const [accepted, setAccepted] = useState(false)
  const [committed, setCommitted] = useState<B3ExpectedIncomeCommitResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const resetConfirmation = () => { setReconciled(null); setChosen({}); setAccepted(false); setCommitted(null) }
  const preview = async () => {
    if (!file || busy) return
    if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) { setError('Envie um Excel .xlsx de até 10 MB.'); return }
    const current = ++generation.current
    setBusy(true); setError(''); setResult(null); resetConfirmation()
    try {
      const response = await previewB3ExpectedIncomes(file)
      if (generation.current !== current) return
      setResult(response)
      try { const p = await findAllPortfolios(); if (generation.current === current) setPortfolios(p) }
      catch { if (generation.current === current) setError('Não foi possível carregar as carteiras.') }
    } catch { if (generation.current === current) setError('Não foi possível conferir o arquivo Eventos. Confira o layout e a API.') }
    finally { if (generation.current === current) setBusy(false) }
  }
  const reconcile = async () => {
    if (!file || portfolioId == null || busy) return
    const current = ++generation.current
    setBusy(true); setError(''); resetConfirmation()
    try { const data = await reconcileB3ExpectedIncomes(file, portfolioId); if (generation.current === current) setReconciled(data) }
    catch { if (generation.current === current) setError('Não foi possível conciliar os eventos previstos.') }
    finally { if (generation.current === current) setBusy(false) }
  }
  const candidates = reconciled?.rows.filter(row => row.status === 'READY' && row.assetId != null) ?? []
  const rows = candidates.filter(row => chosen[row.excelRow]).map(row => row.excelRow)
  const canCommit = !!file && portfolioId != null && accepted && rows.length > 0 && !busy
  const commit = async () => {
    if (!canCommit || !file || portfolioId == null) return
    const current = ++generation.current
    setBusy(true); setError(''); setCommitted(null)
    try {
      const outcome = await commitB3ExpectedIncomes(file, portfolioId, rows)
      if (generation.current !== current) return
      setCommitted(outcome); setChosen({}); setAccepted(false)
      const updated = await reconcileB3ExpectedIncomes(file, portfolioId)
      if (generation.current === current) setReconciled(updated)
    } catch { if (generation.current === current) setError('Importação rejeitada. Confira possíveis duplicidades; verifique o histórico antes de tentar novamente.') }
    finally { if (generation.current === current) setBusy(false) }
  }
  return <section className="dashboard-card" style={{ marginTop: '1.5rem' }} aria-labelledby="expected-income-heading">
    <h2 id="expected-income-heading">Proventos Previstos da B3</h2>
    <ol className="b3-income-steps" aria-label="Etapas da importação de proventos previstos">
      <li className={result ? 'completed' : 'current'} aria-current={!result ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">{result ? '✓' : '1'}</span><span>Arquivo</span>
      </li>
      <li className={result && !committed ? 'current' : committed ? 'completed' : 'upcoming'} aria-current={result && !committed ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">{committed ? '✓' : '2'}</span><span>Conferência</span>
      </li>
      <li className={committed ? 'completed' : canCommit ? 'current' : 'upcoming'} aria-current={canCommit ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">{committed ? '✓' : '3'}</span><span>Confirmação</span>
      </li>
    </ol>
    <p>Envie a planilha de <strong>Eventos</strong> da B3. Identificamos dividendos, JCP e rendimentos previstos para conferência. <strong>Somente eventos selecionados e confirmados serão registrados como previstos, nunca como recebidos.</strong></p>
    <form onSubmit={e => { e.preventDefault(); void preview() }}>
      <label htmlFor="b3-expected-file">Planilha de Eventos (.xlsx)</label>
      <input id="b3-expected-file" type="file" accept=".xlsx" onChange={e => {
        generation.current += 1; setFile(e.target.files?.[0] ?? null); setResult(null); resetConfirmation(); setError(''); setBusy(false)
      }} />
      <p className="b3-import-file-help">Excel (.xlsx), até 10 MB.</p>
      <button type="submit" disabled={!file || busy}>{busy ? 'Conferindo eventos...' : 'Pré-visualizar proventos previstos'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result && <div role="region" aria-label="Prévia de proventos previstos">
      <p>{result.recognizedRows} evento(s) identificado(s); {result.skippedRows} linha(s) não relacionadas ignoradas.</p>
      <p className="b3-income-pending">São previsões, não créditos recebidos. Valores previstos não integram os proventos recebidos do Dashboard.</p>
      <div style={{ margin: '1rem 0', display: 'flex', gap: '.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div><label htmlFor="b3-expected-portfolio">Carteira de destino</label>
          <select id="b3-expected-portfolio" value={portfolioId ?? ''} onChange={e => {
            generation.current += 1; setPortfolioId(e.target.value ? Number(e.target.value) : null); resetConfirmation()
          }}><option value="">Selecione a carteira</option>{portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <button type="button" disabled={portfolioId == null || busy} onClick={() => void reconcile()}>{busy ? 'Conferindo...' : 'Conferir ativos e duplicidades'}</button>
      </div>
      {reconciled && <div role="region" aria-label="Resultado da conciliação de eventos previstos">
        <p>{reconciled.ready} eventos aptos; {reconciled.blocked} bloqueados.</p>
        <table className="b3-table"><thead><tr><th>Linha</th><th>Ativo</th><th>Situação</th><th>Pendências</th></tr></thead>
          <tbody>{reconciled.rows.map(r => <tr key={r.excelRow}><td>{r.excelRow}</td><td>{r.ticker ?? '—'}</td>
            <td>{r.status === 'READY' ? 'Pronto para importar' : 'Bloqueado'}</td><td>{r.messages.join(' ')}</td></tr>)}</tbody>
        </table>
        {candidates.length > 0 && <div style={{ marginTop: '1rem' }}>
          <h3>Confirmar proventos previstos</h3>
          <p>Selecione apenas os eventos que deseja registrar como previsões. Nenhum crédito será lançado na carteira.</p>
          <div style={{ overflowX: 'auto' }}><table className="b3-table"><thead><tr><th>Importar</th><th>Ativo</th><th>Pagamento previsto</th><th>Valor líquido previsto</th></tr></thead>
            <tbody>{candidates.map(r => { const item = result.rows.find(x => x.excelRow === r.excelRow); return <tr key={r.excelRow}>
              <td><input type="checkbox" aria-label={`Importar previsão linha ${r.excelRow}`} checked={!!chosen[r.excelRow]}
                onChange={e => { setChosen(v => ({ ...v, [r.excelRow]: e.target.checked })); setAccepted(false) }} /></td>
              <td>{r.ticker}</td><td>{date(item?.expectedPaymentDate ?? null)}</td><td>{money(item?.expectedNetAmount ?? null)}</td>
            </tr> })}</tbody>
          </table></div>
          <label style={{ display: 'block', marginTop: '1rem' }}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />{' '}Confirmo a importação dos eventos selecionados apenas como proventos previstos, sem registrar recebimentos.</label>
          <button type="button" disabled={!canCommit} onClick={() => void commit()}>{busy ? 'Importando...' : `Confirmar importação de ${rows.length} previsão(ões)`}</button>
        </div>}
        {committed && <p role="status">Previsões registradas: {committed.imported} evento(s), total previsto {money(committed.totalExpectedNet)}. Nenhum crédito foi lançado.</p>}
      </div>}
      <div style={{ overflowX: 'auto' }}><table className="b3-table"><thead><tr><th>Linha</th><th>Ativo B3</th><th>Evento</th><th>Data prevista</th><th>Instituição</th><th>Qtde.</th><th>Valor líquido previsto</th><th>Conferência</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.excelRow}>
          <td>{row.excelRow}</td><td>{row.product}</td><td>{row.eventType}</td><td>{date(row.expectedPaymentDate)}</td><td>{row.institution}</td><td>{row.quantity ?? '—'}</td><td>{money(row.expectedNetAmount)}</td>
          <td>{row.errors.map((s,i) => <p role="alert" key={`err${i}`}>{s}</p>)}{row.warnings.map((s,i) => <p key={`warn${i}`}>{s}</p>)}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </section>
}
