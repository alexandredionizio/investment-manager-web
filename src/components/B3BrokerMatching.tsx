import { useMemo, useState } from 'react'
import type { B3BrokerOption, B3MatchResponse } from '../types/b3Import'
import './B3BrokerMatching.css'

type Props = {
  matches: B3MatchResponse | null
  brokers: B3BrokerOption[]
  loading: boolean
  error: string
  onRetry: () => void
  onConfirmAlias: (institution: string, brokerId: number) => Promise<void>
  onRegisterBroker?: (institution: string, brokerName: string) => Promise<void>
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response
    if (response?.status === 409) return 'Essa associação ou corretora já existe. Utilize a lista de corretoras cadastradas.'
    if (response?.status === 400) return 'Dados recusados pelo servidor. Confira o nome e a corretora.'
  }
  return 'Não foi possível salvar a associação. Tente novamente.'
}

export default function B3BrokerMatching(props: Props) {
  return <B3BrokerMatchingContent key={props.matches?.fileName ?? 'sem-arquivo'} {...props} />
}

function B3BrokerMatchingContent({ matches, brokers, loading, error, onRetry, onConfirmAlias, onRegisterBroker }: Props) {
  const [selectedByInstitution, setSelectedByInstitution] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [registeringInstitution, setRegisteringInstitution] = useState<string | null>(null)
  const [newBrokerNames, setNewBrokerNames] = useState<Record<string, string>>({})

  const unresolved = useMemo(() => {
    const groups = new Map<string, { name: string; count: number; suggestions: B3BrokerOption[] }>()
    for (const row of matches?.rows ?? []) {
      if (row.brokerStatus === 'MATCHED' || !row.institution?.trim()) continue
      const key = row.institution.trim().toLocaleUpperCase('pt-BR')
      const previous = groups.get(key)
      if (previous) previous.count += 1
      else groups.set(key, { name: row.institution.trim(), count: 1, suggestions: row.brokerSuggestions ?? [] })
    }
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [matches])

  const unknownAssets = useMemo(() => {
    const tickers = new Set((matches?.rows ?? []).filter(row => row.assetStatus !== 'MATCHED').map(row => row.ticker))
    return Array.from(tickers).sort()
  }, [matches])

  async function confirm(institution: string) {
    const brokerId = Number(selectedByInstitution[institution])
    if (!Number.isInteger(brokerId) || brokerId <= 0 || saving) return
    const broker = brokers.find(option => option.id === brokerId)
    if (!broker || !window.confirm(`Associar "${institution}" da B3 à corretora "${broker.name}"? Esta escolha será reutilizada em futuras importações.`)) return
    setSaving(institution)
    setSaveError('')
    setSuccess('')
    try {
      await onConfirmAlias(institution, brokerId)
      setSuccess(`Associação "${institution}" → "${broker.name}" salva.`)
      setSelectedByInstitution(previous => ({ ...previous, [institution]: '' }))
    } catch (failure) {
      setSaveError(errorMessage(failure))
    } finally {
      setSaving(null)
    }
  }

  async function registerBroker(institution: string) {
    const brokerName = (newBrokerNames[institution] ?? '').trim().replace(/\s+/g, ' ')
    if (!onRegisterBroker || !brokerName || brokerName.length > 100 || saving) return
    if (!window.confirm(`Cadastrar a corretora "${brokerName}" e associá-la à instituição B3 "${institution}"?`)) return
    setSaving(institution)
    setSaveError('')
    setSuccess('')
    try {
      await onRegisterBroker(institution, brokerName)
      setRegisteringInstitution(null)
      setNewBrokerNames(previous => ({ ...previous, [institution]: '' }))
      setSuccess(`Corretora "${brokerName}" cadastrada e associada a "${institution}".`)
    } catch (failure) {
      setSaveError(errorMessage(failure))
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="b3-matching" aria-labelledby="b3-matching-title">
      <h3 id="b3-matching-title">Conferência de ativos e corretoras</h3>
      <p>O sistema consulta os cadastros existentes. Nenhuma compra, venda ou posição será gravada nesta etapa.</p>
      {loading && <p role="status">Conferindo correspondências...</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div>}
      {matches && (
        <>
          <div className="b3-matching-summary" aria-label="Resumo de correspondências">
            <span><strong>{matches.totalRows}</strong> linhas</span>
            <span><strong>{matches.matchedRows}</strong> identificadas</span>
            <span><strong>{matches.reviewRows}</strong> para revisão</span>
            <span><strong>{matches.invalidRows}</strong> inválidas</span>
          </div>
          {unresolved.length > 0 ? (
            <>
              <h4>Instituições que precisam de associação</h4>
              <p>Escolha somente uma corretora que você tenha certeza de ser a mesma instituição. A escolha valerá para todas as linhas indicadas e será salva para futuras importações.</p>
              {brokers.length === 0 && <p role="status">Nenhuma corretora cadastrada. Cadastre a instituição no Investment Manager antes de associá-la.</p>}
              <div className="b3-broker-groups">
                {unresolved.map(({ name, count, suggestions }) => (
                  <div className="b3-broker-group" key={name}>
                    <div><strong>{name}</strong> <span>— {count} {count === 1 ? 'negociação' : 'negociações'}</span></div>
                    {suggestions.length > 0 && <p>Sugestão (não confirmada): {suggestions.map(s => s.name).join(', ')}</p>}
                    <label htmlFor={`b3-broker-${name}`}>Corretora correspondente no IM</label>
                    <select
                      id={`b3-broker-${name}`}
                      value={selectedByInstitution[name] ?? ''}
                      onChange={event => setSelectedByInstitution(prev => ({ ...prev, [name]: event.target.value }))}
                      disabled={saving !== null || loading || brokers.length === 0}
                    >
                      <option value="">Selecione somente se reconhecer a corretora</option>
                      {brokers.map(option => <option key={option.id} value={String(option.id)}>{option.name}</option>)}
                    </select>
                    <button type="button" onClick={() => void confirm(name)} disabled={!selectedByInstitution[name] || saving !== null || loading}>
                      {saving === name ? 'Salvando...' : 'Confirmar associação'}
                    </button>
                    {onRegisterBroker && (
                      <div className="b3-registration">
                        <button type="button" aria-expanded={registeringInstitution === name}
                          onClick={() => { setRegisteringInstitution(current => current === name ? null : name); setSaveError('') }}
                          disabled={saving !== null || loading}>
                          {registeringInstitution === name ? 'Cancelar cadastro' : 'Cadastrar nova corretora'}
                        </button>
                        {registeringInstitution === name && (
                          <div className="b3-registration-fields">
                            <label htmlFor={`b3-new-broker-${name}`}>Nome da nova corretora para {name}</label>
                            <input id={`b3-new-broker-${name}`} maxLength={100} type="text"
                              placeholder="Nome da corretora" value={newBrokerNames[name] ?? ''}
                              onChange={event => setNewBrokerNames(prev => ({ ...prev, [name]: event.target.value }))}
                              disabled={saving !== null || loading} />
                            <button type="button" disabled={!newBrokerNames[name]?.trim() || saving !== null || loading}
                              onClick={() => void registerBroker(name)}>
                              {saving === name ? 'Cadastrando...' : 'Confirmar novo cadastro'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : <p>Não há instituições pendentes de associação neste arquivo.</p>}
          {unknownAssets.length > 0 && (
            <p className="b3-matching-note"><strong>Ativos ainda não identificados:</strong> {unknownAssets.join(', ')}. A identificação de novos ativos será tratada na próxima etapa; não há cadastro automático nesta tela.</p>
          )}
          {success && <p role="status" className="b3-match-success">{success}</p>}
          {saveError && <p role="alert" className="b3-match-error">{saveError}</p>}
          <p className="b3-matching-note">“Identificada” significa apenas que ativo e corretora correspondem a cadastros internos; não confirma elegibilidade, saldo nem ausência de duplicidade.</p>
        </>
      )}
    </section>
  )
}
