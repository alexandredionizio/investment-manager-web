import { useMemo, useState } from 'react'
import type { B3AssetCandidate, B3AssetRegistrationResponse, B3MatchResponse } from '../types/b3Import'

type Props = {
  matches: B3MatchResponse | null
  loading: boolean
  onLookup: (ticker: string) => Promise<B3AssetCandidate>
  onRegister: (ticker: string) => Promise<B3AssetRegistrationResponse>
}

export default function B3AssetRegistration({ matches, loading, onLookup, onRegister }: Props) {
  const [candidateByTicker, setCandidateByTicker] = useState<Record<string, B3AssetCandidate>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const unresolved = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const row of matches?.rows ?? []) {
      if (row.assetStatus !== 'NOT_FOUND' || !row.ticker?.trim()) continue
      grouped.set(row.ticker, (grouped.get(row.ticker) ?? 0) + 1)
    }
    return [...grouped].sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  async function lookup(ticker: string) {
    setBusy(ticker); setError(''); setMessage('')
    try {
      const candidate = await onLookup(ticker)
      if (candidate.ticker !== ticker || candidate.requiresReview) throw new Error('Identificação não é inequívoca; revisão necessária.')
      setCandidateByTicker(previous => ({ ...previous, [ticker]: candidate }))
    } catch {
      setError(`Não foi possível validar ${ticker} no catálogo B3. Nenhum cadastro foi alterado.`)
    } finally { setBusy(null) }
  }

  async function register(ticker: string) {
    const candidate = candidateByTicker[ticker]
    if (!candidate || busy || loading || !window.confirm(`Cadastrar ${candidate.ticker} — ${candidate.name} (${candidate.type}, ${candidate.exchange})? Apenas o ativo será cadastrado; nenhuma compra ou venda será importada.`)) return
    setBusy(ticker); setError(''); setMessage('')
    try {
      const result = await onRegister(ticker)
      setCandidateByTicker(previous => { const next = { ...previous }; delete next[ticker]; return next })
      setMessage(`Ativo ${ticker} ${result.created ? 'cadastrado' : 'reconhecido'}. Correspondências atualizadas.`)
    } catch { setError(`Não foi possível cadastrar ${ticker}. Revise a identificação antes de tentar novamente.`) }
    finally { setBusy(null) }
  }

  if (!matches || unresolved.length === 0) return null
  return <section className="b3-matching" aria-labelledby="b3-asset-registration-title">
    <h3 id="b3-asset-registration-title">Identificação de ativos da B3</h3>
    <p>Consulte os dados do catálogo e confirme individualmente o cadastro de cada ativo. Não são criadas transações.</p>
    <div className="b3-broker-groups">
      {unresolved.map(([ticker, count]) => {
        const candidate = candidateByTicker[ticker]
        return <div className="b3-broker-group" key={ticker}>
          <p><strong>{ticker}</strong> — {count} {count === 1 ? 'negociação pendente' : 'negociações pendentes'}</p>
          <button type="button" disabled={busy !== null || loading} onClick={() => void lookup(ticker)}>
            {busy === ticker ? 'Consultando...' : 'Consultar catálogo B3'}
          </button>
          {candidate && <div>
            <p>Encontrado: <strong>{candidate.ticker} — {candidate.name}</strong> ({candidate.type}, {candidate.exchange})</p>
            <button type="button" disabled={busy !== null || loading} onClick={() => void register(ticker)}>
              Confirmar cadastro de {ticker}
            </button>
          </div>}
        </div>
      })}
    </div>
    {message && <p role="status" className="b3-match-success">{message}</p>}
    {error && <p role="alert" className="b3-match-error">{error}</p>}
  </section>
}
