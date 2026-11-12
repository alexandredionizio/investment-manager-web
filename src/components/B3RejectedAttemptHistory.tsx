import { useState } from 'react'
import api from '../services/api'
import { listB3RejectedAttempts } from '../services/b3ImportService'
import type { B3RejectedAttempt } from '../types/b3Import'

/** Consulta sob demanda: não registra rejeições e não expõe IDs técnicos. */
export default function B3RejectedAttemptHistory({ portfolioId }: { portfolioId: number }) {
  const [attempts, setAttempts] = useState<B3RejectedAttempt[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      setAttempts(await listB3RejectedAttempts(api, portfolioId))
    } catch {
      setError('Não foi possível consultar as tentativas rejeitadas. Verifique a conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <section aria-label="Histórico de importações rejeitadas" style={{ marginTop: 24 }}>
      <h3>Importações rejeitadas</h3>
      <p>Tentativas confirmadas que não puderam ser gravadas. A prévia e a conciliação não geram registros neste histórico.</p>
      <button type="button" onClick={() => void load()} disabled={loading}>
        {loading ? 'Consultando...' : attempts === null ? 'Consultar rejeições' : 'Atualizar rejeições'}
      </button>
      {error && <p role="alert">{error}</p>}
      {attempts !== null && (
        attempts.length === 0 ? <p role="status">Nenhuma tentativa rejeitada encontrada nesta carteira.</p> :
          <ol>
            {attempts.map(attempt => <li key={attempt.id}>
              <details>
                <summary>{attempt.fileName} — {new Date(attempt.rejectedAt).toLocaleString('pt-BR')}</summary>
                <p>{attempt.reason}</p>
                {attempt.rows.length > 0 && <ul>{attempt.rows.map(row =>
                  <li key={row.excelRow}>Linha {row.excelRow}: {row.reason}</li>
                )}</ul>}
              </details>
            </li>)}
          </ol>
      )}
    </section>
  )
}
