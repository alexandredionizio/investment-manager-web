import { useState } from 'react'
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
      <h3 id="b3-import-commit-title">IM-042 — Importação definitiva B3</h3>
      {result ? (
        <div role="status">
          <p><strong>{result.status === 'IMPORTED' ? 'Importação concluída.' : 'Este lote já havia sido importado.'}</strong></p>
          <p>Lote #{result.batchId} — Carteira #{result.portfolioId} — {result.status === 'IMPORTED' ? result.importedRows : result.rows.length} transações vinculadas.</p>
          <p>Confira as posições e o histórico da carteira. Não importe novamente o mesmo lote.</p>
        </div>
      ) : !safe ? (
        <p role="status">A importação está bloqueada: resolva todas as linhas em revisão ou bloqueadas e refaça a conciliação. Nenhuma operação será gravada.</p>
      ) : (
        <>
          <p>Carteira #{reconciliation.portfolioId}: <strong>{reconciliation.totalRows} operações</strong> aptas na simulação. O backend revalidará todos os saldos antes de gravar em uma única transação.</p>
          <p><strong>Atenção:</strong> este botão cria compras e vendas reais no banco de dados de testes. Não existe exclusão de transações pela interface.</p>
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
