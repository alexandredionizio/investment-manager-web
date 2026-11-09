import type { AxiosInstance } from 'axios'
import type { B3PreviewResponse } from '../types/b3Import'

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