import { useState } from 'react'
import { saveSelectedPortfolioId } from '../services/selectedPortfolio'
import type { B3ImportCommitResponse, B3ReconciliationResponse } from '../types/b3Import'

type Props = {
  reconciliation: B3ReconciliationResponse | null
  loading: boolean
  error: string
  result: B3ImportCommitResponse | null
  onCommit: () => Promise<void>
}

/** Somente um ato expresso do usuário permite a primeira gravação B3. */
export default function B3ImportCommit({ reconciliation, loading, error, result, onCommit }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  if (!reconciliation && !result) return null
  const safe = reconciliation !== null && reconciliation.totalRows > 0

  return (
    <section aria-labelledby="b3-import-commit-title" style={{ marginTop: 30, border: '1px solid #7775', borderRadius: 10, padding: 20 }}>
      <h3 id="b3-import-commit-title">Confirmar importação B3</h3>
      {result ? (
        <div role="status">
          <p><strong>{result.status === 'IMPORTED' ? 'Importação concluída.' :
            result.status === 'PARTIALLY_IMPORTED' ? 'Importação parcial concluída.' :
            result.status === 'NO_ELIGIBLE_ROWS' ? 'Nenhuma negociação elegível foi importada.' :
            'Este lote já havia sido importado.'}</strong></p>
          <p>{result.status === 'ALREADY_IMPORTED' ? result.rows.length : result.importedRows} operações {result.status === 'ALREADY_IMPORTED' ? 'já vinculadas' : 'novas vinculadas'} à carteira; {result.rejectedRows ?? 0} operações pendentes registradas para revisão.</p>
          <p>{result.status === 'ALREADY_IMPORTED'
            ? 'Nenhuma operação adicional foi registrada nesta tentativa.'
            : 'Confira as posições e o histórico de rejeições. Uma pendência pode ser arquivada após conferência da correção; o histórico não será apagado.'}</p>
          <p><a href={`/portfolios/${result.portfolioId}`}>Ver posições da carteira</a> · <a href="/dashboard" onClick={() => saveSelectedPortfolioId(result.portfolioId)}>Ver indicadores</a></p>
        </div>
      ) : !safe ? (
        <p role="status">Não há operações na simulação. Nenhuma operação será gravada.</p>
      ) : (
        <>
          <p><strong>{reconciliation.readyRows} operações pré-analisadas como aptas</strong> e {reconciliation.reviewRows + reconciliation.blockedRows} pendentes.
            Para proteger saldos, o servidor excluirá todas as operações de um ativo se alguma linha desse ativo estiver pendente.</p>
          <p><strong>Atenção:</strong> a confirmação registra compras e vendas na carteira selecionada. Confira os dados antes de continuar; correções posteriores exigem procedimento auditável.</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: 'fit-content', maxWidth: '100%', margin: '16px 0 0', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={loading}
              onChange={event => setConfirmed(event.target.checked)}
              style={{ width: 18, height: 18, minWidth: 18, maxWidth: 18, flex: '0 0 18px', margin: '2px 0 0', padding: 0, accentColor: '#193f70', cursor: loading ? 'not-allowed' : 'pointer' }}
            />
            <span style={{ flex: '1 1 auto', minWidth: 0, lineHeight: 1.5 }}>
              Confirmo a importação apenas das operações elegíveis e o registro das pendências no histórico, sem movimentar os ativos pendentes.
            </span>
          </label>
          <div style={{ marginTop: 16 }}>
            <button type="button" disabled={!confirmed || loading} onClick={() => void onCommit()}>
              {loading ? 'Importando...' : `Importar operações elegíveis e registrar pendências`}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    </section>
  )
}
