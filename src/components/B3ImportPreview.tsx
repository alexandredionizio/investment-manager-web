import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { B3PreviewResponse } from '../types/b3Import'
import './B3ImportPreview.css'

const MAX_BYTES = 10 * 1024 * 1024
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 })

export type B3ImportPreviewProps = {
  previewFile: (file: File) => Promise<B3PreviewResponse>
  onPreviewLoaded?: (file: File, result: B3PreviewResponse) => void
  onFileChanged?: () => void
}

export default function B3ImportPreview({ previewFile, onPreviewLoaded, onFileChanged }: B3ImportPreviewProps) {
  const [selected, setSelected] = useState<File | null>(null)
  const [preview, setPreview] = useState<B3PreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'invalid' | 'warnings'>('all')
  const requestId = useRef(0)

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    requestId.current += 1
    onFileChanged?.()
    const file = event.target.files?.[0] ?? null
    setSelected(file)
    setPreview(null)
    setError('')
    setFilter('all')
    if (file && !/\.xlsx$/i.test(file.name)) setError('Selecione um arquivo Excel .xlsx da B3.')
    else if (file && file.size > MAX_BYTES) setError('O arquivo deve ter no máximo 10 MB.')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || loading) return
    if (!/\.xlsx$/i.test(selected.name) || selected.size > MAX_BYTES) return
    const currentId = ++requestId.current
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const result = await previewFile(selected)
      if (requestId.current === currentId) {
        setPreview(result)
        onPreviewLoaded?.(selected, result)
      }
    } catch (failure: unknown) {
      if (requestId.current !== currentId) return
      const responseMessage = extractErrorMessage(failure)
      setError(responseMessage || 'Não foi possível ler a planilha. Confira o arquivo e tente novamente.')
    } finally {
      if (requestId.current === currentId) setLoading(false)
    }
  }

  const displayed = preview?.rows.filter((row) =>
    filter === 'all' || (filter === 'invalid' ? row.errors.length > 0 : row.warnings.length > 0),
  ) ?? []
  const warningsCount = preview?.rows.filter((row) => row.warnings.length > 0).length ?? 0

  return (
    <section aria-labelledby="b3-heading" className="b3-import-preview">
      <h2 id="b3-heading">Importação B3 — Pré-visualização</h2>
      <p>Envie a planilha de <strong>Negociação</strong> da B3 em formato .xlsx. Esta etapa apenas lê e valida o arquivo: <strong>nenhuma operação é registrada na carteira.</strong></p>
      <form onSubmit={onSubmit}>
        <label htmlFor="b3-file">Planilha de negociações</label>{' '}
        <input id="b3-file" aria-describedby="b3-file-help" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFileChange} />
        <p id="b3-file-help">Excel (.xlsx), até 10 MB.</p>
        <button type="submit" disabled={!selected || Boolean(error) || loading}>
          {loading ? 'Lendo arquivo...' : 'Pré-visualizar negociações'}
        </button>
      </form>
      {error && <p role="alert" className="b3-error">{error}</p>}
      {preview && (
        <div aria-live="polite" className="b3-results">
          <h3>Resultado: {preview.fileName}</h3>
          <p className="b3-summary"><span><strong>{preview.totalRows}</strong> linhas</span><span><strong>{preview.validRows}</strong> válidas</span><span><strong>{preview.invalidRows}</strong> inválidas</span><span><strong>{warningsCount}</strong> com avisos</span></p>
          <div className="b3-filters" role="group" aria-label="Filtrar resultado">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todas ({preview.rows.length})</button>{' '}
            <button type="button" aria-pressed={filter === 'invalid'} onClick={() => setFilter('invalid')}>Com erros ({preview.invalidRows})</button>{' '}
            <button type="button" aria-pressed={filter === 'warnings'} onClick={() => setFilter('warnings')}>Com avisos ({warningsCount})</button>
          </div>
          <div className="b3-table-scroll" role="region" aria-label="Tabela de negociações da B3" tabIndex={0}>
            <table className="b3-table">
              <caption>Negociações identificadas na planilha — somente leitura</caption>
              <thead><tr>
                <th scope="col">Linha</th><th scope="col">Data</th><th scope="col">Movimentação</th>
                <th scope="col">Mercado</th><th scope="col">Prazo</th><th scope="col">Instituição</th>
                <th scope="col">Ativo</th><th scope="col">Quantidade</th><th scope="col">Preço</th>
                <th scope="col">Valor</th><th scope="col">Validação</th>
              </tr></thead>
              <tbody>
                {displayed.map((row) => (
                  <tr key={row.excelRow} className={row.errors.length ? 'b3-row-invalid' : row.warnings.length ? 'b3-row-warning' : undefined}>
                    <td className="b3-cell-numeric">{row.excelRow}</td><td className="b3-cell-nowrap">{formatDate(row.tradeDate)}</td><td><span className={row.movementType.toLowerCase() === 'compra' ? 'b3-operation b3-operation-buy' : row.movementType.toLowerCase() === 'venda' ? 'b3-operation b3-operation-sell' : 'b3-operation'}>{row.movementType}</span></td>
                    <td>{row.market}</td><td className="b3-cell-nowrap">{row.expiry}</td><td>{row.institution}</td><td className="b3-cell-ticker">{row.ticker}</td>
                    <td className="b3-cell-numeric">{number.format(row.quantity)}</td><td className="b3-cell-numeric">{money.format(row.unitPrice)}</td><td className="b3-cell-numeric">{money.format(row.totalValue)}</td>
                    <td>
                      {row.errors.length === 0 && row.warnings.length === 0 && <span className="b3-status-ok">OK</span>}
                      {row.errors.map((message, index) => <p key={`e-${index}`} className="b3-status-error">Erro: {message}</p>)}
                      {row.warnings.map((message, index) => <p className="b3-status-warning" key={`w-${index}`}>Aviso: {message}</p>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayed.length === 0 && <p>Nenhuma linha corresponde ao filtro selecionado.</p>}
          </div>
          <p><strong>Pré-visualização apenas.</strong> A conciliação, a escolha da carteira e a confirmação da importação serão implementadas em etapas posteriores.</p>
        </div>
      )}
    </section>
  )
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function extractErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null
  const response = (error as { response?: { status?: number } }).response
  if (response?.status === 401) return 'Sessão expirada. Faça login novamente.'
  if (response?.status === 403) return 'Você não tem permissão para acessar esta funcionalidade.'
  if (response?.status === 413) return 'Arquivo grande demais para o servidor.'
  return null
}
