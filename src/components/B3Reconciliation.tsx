import type { B3ReconciliationResponse } from '../types/b3Import'

type Props = {
  portfolios: Array<{ id: number; name: string }>
  portfolioId: number | null
  onPortfolioChange: (id: number | null) => void
  onReconcile: () => void
  result: B3ReconciliationResponse | null
  loading: boolean
  error: string
}

export default function B3Reconciliation({ portfolios, portfolioId, onPortfolioChange, onReconcile, result, loading, error }: Props) {
  return <section aria-labelledby="b3-reconciliation-title" style={{ marginTop: 30 }}>
    <h3 id="b3-reconciliation-title">Conciliação financeira (simulação)</h3>
    <p>Confira possíveis duplicidades e saldos cronológicos antes da importação. <strong>Esta etapa não grava negociações nem altera posições.</strong></p>
    <label htmlFor="b3-reconciliation-portfolio">Carteira de destino: </label>
    <select id="b3-reconciliation-portfolio" value={portfolioId ?? ''} disabled={loading} onChange={e => onPortfolioChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Selecione uma carteira</option>
      {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>{' '}
    <button type="button" disabled={!portfolioId || loading} onClick={onReconcile}>
      {loading ? 'Conferindo...' : 'Conferir operações sem gravar'}
    </button>
    {error && <p role="alert">{error}</p>}
    {result && <div>
      <p role="status"><strong>{result.readyRows} aptas para pré-análise, {result.reviewRows} para revisão, {result.blockedRows} bloqueadas</strong> — {result.totalRows} linhas na carteira selecionada.</p>
      <p>“Apta” significa apenas ausência de problemas detectados nesta simulação. Não autoriza importação automática.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead><tr><th>Linha</th><th>Data</th><th>Ativo</th><th>Movimento</th><th>Quantidade</th><th>Status</th><th>Observações</th></tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.excelRow}>
            <td>{row.excelRow}</td><td>{row.tradeDate ?? '—'}</td><td>{row.ticker}</td><td>{row.movementType}</td>
            <td>{row.quantity ?? '—'}</td>
            <td><strong>{row.status === 'READY' ? 'Pré-análise apta' : row.status === 'REVIEW' ? 'Revisar' : 'Bloqueada'}</strong></td>
            <td>{row.messages.join('; ') || 'Sem alerta identificado'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>}
  </section>
}
