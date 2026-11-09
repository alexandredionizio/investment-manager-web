import type { AxiosInstance } from 'axios'
import type { B3PreviewResponse, B3MatchResponse, B3BrokerOption, B3BrokerAliasResponse, B3BrokerRegistrationResponse } from '../types/b3Import'

/**
 * Pré-visualiza negociações da B3 sem gravar transações.
 * Reutiliza o Axios existente e sua autenticação JWT.
 */
export async function previewB3Spreadsheet(
    api: Pick<AxiosInstance, 'post' | 'defaults'>,
    file: File,
): Promise<B3PreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const baseURL = (api.defaults.baseURL ?? '').replace(/\/+$/, '')

  // A API de importação usa /api/imports, não /api/v1.
  // Remove o prefixo de versionamento quando presente.
  const apiRoot = baseURL.replace(/\/api(?:\/v\d+)?$/i, '')

  const endpoint = `${apiRoot}/api/imports/b3/preview`

  // Não definir Content-Type: o navegador adiciona o multipart boundary.
  const { data } = await api.post<B3PreviewResponse>(endpoint, formData)

  return data
}

/** Evita /api/v1/api/... e mantém o interceptor de JWT do Axios. */
function b3Endpoint(api: Pick<AxiosInstance, 'defaults'>, suffix: string): string {
  const baseURL = (api.defaults.baseURL ?? '').replace(/\/+$/, '')
  const root = baseURL.replace(/\/api(?:\/v\d+)?$/i, '')
  return `${root}/api/imports/b3/${suffix}`
}

export async function matchB3Spreadsheet(api: Pick<AxiosInstance, 'post' | 'defaults'>, file: File): Promise<B3MatchResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<B3MatchResponse>(b3Endpoint(api, 'matches'), formData)
  return data
}

export async function listB3BrokerOptions(api: Pick<AxiosInstance, 'get' | 'defaults'>): Promise<B3BrokerOption[]> {
  const { data } = await api.get<B3BrokerOption[]>(b3Endpoint(api, 'broker-options'))
  return data
}

export async function confirmB3BrokerAlias(api: Pick<AxiosInstance, 'post' | 'defaults'>, institution: string, brokerId: number): Promise<B3BrokerAliasResponse> {
  const { data } = await api.post<B3BrokerAliasResponse>(b3Endpoint(api, 'broker-aliases'), { institution, brokerId })
  return data
}

/** Cadastra corretora e associa o nome da B3 na mesma transação backend. */
export async function registerB3Broker(
  api: Pick<AxiosInstance, 'post' | 'defaults'>,
  institution: string,
  brokerName: string,
): Promise<B3BrokerRegistrationResponse> {
  const { data } = await api.post<B3BrokerRegistrationResponse>(
    b3Endpoint(api, 'broker-registration'),
    { institution, brokerName },
  )
  return data
}
