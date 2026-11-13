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
  const safe = reconciliation !== null && reconciliation.totalRows > 0 &&
    reconciliation.readyRows === reconciliation.totalRows &&
    reconciliation.reviewRows === 0 && reconciliation.blockedRows === 0

  return (
    <section aria-labelledby="b3-import-commit-title" style={{ marginTop: 30, border: '1px solid #7775', borderRadius: 10, padding: 20 }}>
      <h3 id="b3-import-commit-title">Confirmar importação B3</h3>
      {result ? (
        <div role="status">
          <p><strong>{result.status === 'IMPORTED' ? 'Importação concluída.' : 'Este lote já havia sido importado.'}</strong></p>
          <p>{result.status === 'IMPORTED' ? result.importedRows : result.rows.length} operações vinculadas à carteira.</p>
          <p>{result.status === 'IMPORTED'
            ? 'Confira as posições e o histórico. Os indicadores serão recalculados nas próximas consultas.'
            : 'Nenhuma operação adicional foi registrada nesta tentativa.'}</p>
          <p><a href={`/portfolios/${result.portfolioId}`}>Ver posições da carteira</a> · <a href="/dashboard" onClick={() => saveSelectedPortfolioId(result.portfolioId)}>Ver indicadores</a></p>
        </div>
      ) : !safe ? (
        <p role="status">A importação está bloqueada: resolva todas as linhas em revisão ou bloqueadas e refaça a conciliação. Nenhuma operação será gravada.</p>
      ) : (
        <>
          <p><strong>{reconciliation.totalRows} operações</strong> aptas na simulação. O servidor revalidará os saldos e a custódia antes de gravar o lote de forma atômica.</p>
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
              Confirmo a importação definitiva de todas as operações nesta carteira.
            </span>
          </label>
          <div style={{ marginTop: 16 }}>
            <button type="button" disabled={!confirmed || loading} onClick={() => void onCommit()}>
              {loading ? 'Importando...' : `Importar definitivamente ${reconciliation.totalRows} operações`}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    </section>
  )
}
