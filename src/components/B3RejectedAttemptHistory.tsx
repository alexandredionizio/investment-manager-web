import { useState } from 'react'
import api from '../services/api'
import { listB3RejectedAttempts, resolveB3RejectedAttempt, resolveB3RejectedRow } from '../services/b3ImportService'
import type { B3RejectedAttempt } from '../types/b3Import'

/** Evidência imutável. Arquivar uma pendência nunca apaga as linhas da B3. */
export default function B3RejectedAttemptHistory({ portfolioId }: { portfolioId: number }) {
  const [attempts, setAttempts] = useState<B3RejectedAttempt[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const load = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      setAttempts(await listB3RejectedAttempts(api, portfolioId))
    } catch {
      setError('Não foi possível consultar as pendências. Verifique a conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  const resolve = async (attempt: B3RejectedAttempt, excelRow?: number) => {
    const key = `${attempt.id}:${excelRow ?? 'all'}`
    const note = notes[key]?.trim() ?? ''
    if (note.length < 10) {
      setError('Descreva a conferência realizada (mínimo 10 caracteres).')
      return
    }
    if (!window.confirm('Confirma que a pendência foi corrigida e reimportada? O histórico original será preservado.')) return
    setWorkingId(key)
    setError('')
    try {
      if (excelRow !== undefined)
        await resolveB3RejectedRow(api, portfolioId, attempt.id, excelRow, note)
      else
        await resolveB3RejectedAttempt(api, portfolioId, attempt.id, note)
      setAttempts(await listB3RejectedAttempts(api, portfolioId))
    } catch {
      setError('Não foi possível arquivar. É necessário ter importado a correção em um lote posterior.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <section aria-label="Histórico de importações rejeitadas" style={{ marginTop: 24 }}>
      <h3>Importações rejeitadas e pendências</h3>
      <p>Negociações não gravadas, inclusive as excluídas de importações parciais.
        Corrija os dados e reimporte apenas as operações faltantes. Os registros de auditoria são preservados.</p>
      <button type="button" onClick={() => void load()} disabled={loading}>
        {loading ? 'Consultando...' : attempts === null ? 'Consultar rejeições' : 'Atualizar rejeições'}
      </button>
      {error && <p role="alert">{error}</p>}
      {attempts !== null && (
        attempts.length === 0 ? <p role="status">Nenhuma pendência encontrada nesta carteira.</p> :
          <ol>
            {attempts.map(attempt => {
              const allResolved = attempt.rows.length > 0
                ? attempt.rows.every(row => row.resolutionStatus === 'RESOLVED')
                : attempt.resolutionStatus === 'RESOLVED'
              return <li key={attempt.id}>
                <details>
                  <summary>{attempt.fileName} — {new Date(attempt.rejectedAt).toLocaleString('pt-BR')} —
                    {' '}{allResolved ? 'Arquivada' : 'Com pendências'}</summary>
                  <p>{attempt.reason}</p>
                  {attempt.rows.length > 0 && <ul>{attempt.rows.map(row => {
                    const key = `${attempt.id}:${row.excelRow}`
                    return <li key={row.excelRow}>
                      Linha {row.excelRow}{row.ticker ? ` (${row.ticker})` : ''}: {row.reason}
                      {' — '}{row.resolutionStatus === 'RESOLVED' ? 'Resolvida' : 'Pendente'}
                      {row.resolutionStatus !== 'RESOLVED' && <div>
                        <label htmlFor={`resolve-note-${key}`}>Motivo da resolução da linha {row.excelRow}</label>
                        <input id={`resolve-note-${key}`} type="text" maxLength={1000}
                          placeholder="Ex.: operação corrigida e reimportada em novo arquivo"
                          value={notes[key] ?? ''}
                          onChange={event => setNotes(value => ({ ...value, [key]: event.target.value }))}/>
                        <button type="button" disabled={workingId !== null || (notes[key]?.trim().length ?? 0) < 10}
                          onClick={() => void resolve(attempt, row.excelRow)}>
                          {workingId === key ? 'Arquivando...' : `Arquivar linha ${row.excelRow} após conferência`}
                        </button>
                      </div>}
                    </li>
                  })}</ul>}
                  {attempt.rows.length === 0 && attempt.resolutionStatus !== 'RESOLVED' && <div>
                    <label htmlFor={`resolve-note-${attempt.id}`}>Motivo da resolução da tentativa</label>
                    <input id={`resolve-note-${attempt.id}`} type="text" maxLength={1000}
                      value={notes[`${attempt.id}:all`] ?? ''}
                      onChange={event => setNotes(value => ({ ...value, [`${attempt.id}:all`]: event.target.value }))}/>
                    <button type="button" disabled={workingId !== null || (notes[`${attempt.id}:all`]?.trim().length ?? 0) < 10}
                      onClick={() => void resolve(attempt)}>Arquivar tentativa após conferência</button>
                  </div>}
                </details>
              </li>
            })}
          </ol>
      )}
    </section>
  )
}
