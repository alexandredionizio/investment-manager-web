import '../pages/B3ImportPage.css'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { previewB3Incomes, reconcileB3Incomes, commitB3Incomes } from '../services/b3IncomeService'
import { findAllPortfolios } from '../services/portfolioService'
import type { PortfolioResponse } from '../types/portfolio'
import type { B3IncomePreviewResponse, B3IncomeReconciliationResponse, B3IncomeCommitResponse, B3IncomeCommitEntry } from '../types/b3Income'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (value: number | null) => value == null ? '—' : money.format(value)

export default function B3IncomePreview() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<B3IncomePreviewResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
  const [portfolioId, setPortfolioId] = useState<number | null>(null)
  const [reconciled, setReconciled] = useState<B3IncomeReconciliationResponse | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [error, setError] = useState('')
  const [chosen, setChosen] = useState<Record<number, boolean>>({})
  const [accepted, setAccepted] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [committed, setCommitted] = useState<B3IncomeCommitResponse | null>(null)
  const seq = useRef(0)

  function choose(e: ChangeEvent<HTMLInputElement>) {
    seq.current += 1
    setFile(e.target.files?.[0] ?? null)
    setResult(null)
    setReconciled(null)
    setChosen({}); setAccepted(false); setCommitted(null)
    setError('')
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file || busy) return
    if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setError('Envie um Excel .xlsx de até 10 MB.'); return
    }
    const current = ++seq.current
    setBusy(true); setError(''); setResult(null)
    try {
      const response = await previewB3Incomes(file)
      if (current === seq.current) {
        setResult(response)
        setReconciled(null)
        setChosen({}); setAccepted(false); setCommitted(null)
        try {
          const available = await findAllPortfolios()
          if (current === seq.current) setPortfolios(available)
        } catch {
          if (current === seq.current) setError('Não foi possível consultar as carteiras. Tente novamente.')
        }
      }
    } catch {
      if (current === seq.current) setError('Não foi possível ler o extrato de Movimentação. Confira o layout e a conexão com a API.')
    } finally {
      if (current === seq.current) setBusy(false)
    }
  }

  async function reconcile() {
    if (!file || portfolioId == null || reconciling || busy || !result) return
    const current = ++seq.current
    setReconciling(true)
    setError('')
    setReconciled(null)
    setChosen({}); setAccepted(false); setCommitted(null)
    try {
      const response = await reconcileB3Incomes(file, portfolioId)
      if (current === seq.current) setReconciled(response)
    } catch {
      if (current === seq.current) setError('Não foi possível conciliar os proventos. Confira a carteira e o backend atualizado.')
    } finally {
      if (current === seq.current) setReconciling(false)
    }
  }

  const candidates = reconciled?.rows.filter(r => r.assetId != null && (r.status === 'READY' || r.status === 'REVIEW_AMOUNT')) ?? []
  const selections: B3IncomeCommitEntry[] = candidates.filter(r => chosen[r.excelRow])
    .map(r => ({ excelRow: r.excelRow, confirmAmountDifference: r.status === 'REVIEW_AMOUNT' }))
  const canCommit = !committing && !busy && !reconciling && accepted && !!file && portfolioId != null &&
    selections.length > 0

  async function commit() {
    if (!canCommit || !file || portfolioId == null) return
    const current = ++seq.current
    setCommitting(true); setError(''); setCommitted(null)
    try {
      const response = await commitB3Incomes(file, portfolioId, selections)
      if (current === seq.current) {
        setCommitted(response)
        setAccepted(false)
        setChosen({})
        const refreshed = await reconcileB3Incomes(file, portfolioId)
        if (current === seq.current) setReconciled(refreshed)
      }
    } catch {
      if (current === seq.current) setError('A importação foi rejeitada. Confira os ativos, os valores e os possíveis pagamentos duplicados. Nenhum registro do lote deve ser gravado parcialmente.')
    } finally {
      if (current === seq.current) setCommitting(false)
    }
  }

  return <section className="dashboard-card" aria-labelledby="b3-income-heading" style={{ marginTop: '1.5rem' }}>
    <h2 id="b3-income-heading">Proventos Recebidos da B3</h2>
    <ol className="b3-income-steps" aria-label="Etapas da importação de proventos">
      <li className={result ? 'completed' : 'current'} aria-current={!result ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">{result ? '✓' : '1'}</span><span>Arquivo</span>
      </li>
      <li className={result ? 'current' : 'upcoming'} aria-current={result ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">2</span><span>Conferência</span>
      </li>
      <li className={committed ? 'completed' : canCommit ? 'current' : 'upcoming'} aria-current={canCommit ? 'step' : undefined}>
        <span className="b3-income-step-icon" aria-hidden="true">{committed ? '✓' : '3'}</span><span>Confirmação</span>
      </li>
    </ol>
    <p>Envie a planilha de <strong>Movimentação</strong> da B3. Identificamos dividendos, JCP e rendimentos para conferência. <strong>Nenhum provento será gravado nesta etapa.</strong></p>
    <form onSubmit={submit}>
      <label htmlFor="b3-income-file">Planilha de movimentação (.xlsx)</label>{' '}
      <input id="b3-income-file" type="file" accept=".xlsx" onChange={choose} />
      <p className="b3-import-file-help">Excel (.xlsx), até 10 MB.</p>
      <button type="submit" disabled={!file || busy}>{busy ? 'Analisando...' : 'Pré-visualizar proventos recebidos'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result && <div aria-live="polite">
      <p><strong>{result.incomeRows}</strong> proventos identificados; {result.skippedRows} outros movimentos ignorados.</p>
      <p>A data do extrato é a data do crédito recebido. Não é necessário informar data-base.</p>
      <p className="b3-income-pending" role="status">Somente proventos com ativo cadastrado, dados válidos e sem suspeita de duplicidade podem ser importados. Confira e confirme os créditos selecionados.</p>
      <div style={{ margin: '1rem 0', display: 'flex', gap: '.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div><label htmlFor="b3-income-portfolio">Carteira de destino</label>
          <select id="b3-income-portfolio" value={portfolioId ?? ''} onChange={e => {
            seq.current += 1
            setPortfolioId(e.target.value ? Number(e.target.value) : null)
            setReconciled(null)
            setChosen({}); setAccepted(false); setCommitted(null)
          }}><option value="">Selecione a carteira</option>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <button type="button" disabled={portfolioId == null || busy || reconciling} onClick={() => void reconcile()}>
          {reconciling ? 'Conferindo...' : 'Conferir ativos e duplicidades'}
        </button>
      </div>
      {reconciled && <div role="region" aria-label="Resultado da conciliação de proventos">
        <p>{reconciled.identified} ativos identificados; {reconciled.blocked} registros bloqueados; {reconciled.needsReview} exigem conferência.</p>
        <table className="b3-table"><thead><tr><th>Linha</th><th>Ativo</th><th>Situação</th><th>Pendências</th></tr></thead>
          <tbody>{reconciled.rows.map(r => <tr key={r.excelRow}><td>{r.excelRow}</td><td>{r.ticker ?? '—'}</td>
            <td>{r.status === 'BLOCKED' ? 'Bloqueado' : r.status === 'POSSIBLE_DUPLICATE' ? 'Possível duplicidade' : r.status === 'REVIEW_AMOUNT' ? 'Revisar diferença no valor' : 'Pronto para importar'}</td>
            <td>{r.messages.join(' ')}{r.status === 'REVIEW_AMOUNT' && r.expectedAmount != null
              ? ` Previsão: ${fmt(r.expectedAmount)}; crédito efetivo: ${fmt(result.rows.find(x => x.excelRow === r.excelRow)?.creditedAmount ?? null)}.` : ''}</td></tr>)}</tbody>
        </table>
        {candidates.length > 0 && <div style={{ marginTop: '1rem' }}>
          <h3>Confirmar proventos identificados</h3>
          <p>Os registros bloqueados e as possíveis duplicidades não serão importados. Para divergências de valor, confira a previsão e o crédito e autorize explicitamente a baixa pelo valor realmente recebido.</p>
          <div style={{ overflowX: 'auto' }}><table className="b3-table">
            <thead><tr><th>Importar</th><th>Ativo</th><th>Pagamento</th><th>Valor creditado</th></tr></thead>
            <tbody>{candidates.map(r => {
              const income = result.rows.find(x => x.excelRow === r.excelRow)
              return <tr key={r.excelRow}>
                <td><input type="checkbox" aria-label={`Importar linha ${r.excelRow}`} checked={!!chosen[r.excelRow]} onChange={e => { setChosen(v => ({ ...v, [r.excelRow]: e.target.checked })); setAccepted(false) }} /></td>
                <td>{r.ticker}{r.status === 'REVIEW_AMOUNT' ? ' (diferença confirmada ao selecionar)' : ''}</td><td>{income?.paymentDate ?? '—'}</td><td>{fmt(income?.creditedAmount ?? null)}</td>

              </tr>
            })}</tbody>
          </table></div>
          <label style={{ display: 'block', marginTop: '1rem' }}>
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
            {' '}Confirmo os proventos recebidos selecionados, os valores efetivamente creditados pela B3 e, quando indicadas, as diferenças em relação às previsões.
          </label>
          <button type="button" disabled={!canCommit} onClick={() => void commit()}>{committing ? 'Importando...' : `Confirmar importação de ${selections.length} provento(s)`}</button>
        </div>}
        {committed && <p role="status">Importação concluída: {committed.imported} provento(s), total creditado {fmt(committed.totalCredited)}.</p>}
      </div>}
      <div style={{ overflowX: 'auto' }}><table className="b3-table">
        <thead><tr><th>Linha</th><th>Pagamento</th><th>Tipo</th><th>Produto B3</th><th>Instituição</th><th>Qtde.</th><th>Unitário</th><th>Valor creditado</th><th>Conferência</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.excelRow}>
          <td>{row.excelRow}</td><td>{row.paymentDate ?? '—'}</td><td>{row.movement}</td><td>{row.product}</td><td>{row.institution}</td><td>{row.quantity ?? '—'}</td><td>{fmt(row.unitPrice)}</td><td>{fmt(row.creditedAmount)}</td>
          <td>{row.errors.map((s, i) => <p key={`e${i}`} role="alert">{s}</p>)}{row.warnings.map((s, i) => <p key={`w${i}`}>{s}</p>)}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </section>
}
