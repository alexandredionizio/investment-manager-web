/** Nunca expõe tokens ou cabeçalhos; exibe o erro de domínio retornado pelo backend. */
export function registrationFailure(error: unknown, offset: number, total: number): string {
  const response = error && typeof error === 'object' && 'response' in error
    ? (error as { response?: { status?: number; data?: { message?: string } } }).response
    : undefined
  const message = response?.data?.message ||
    (error instanceof Error ? error.message : 'Falha de comunicação com o servidor.')
  const status = response?.status ? `HTTP ${response.status}. ` : ''
  return `Identificação interrompida no lote iniciado em ${offset + 1}${total ? ` de ${total}` : ''}. ${status}${message} ` +
    'Nenhuma negociação foi importada. Clique novamente para retomar desse lote.'
}
