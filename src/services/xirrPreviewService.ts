import type { XirrPreview } from '../types/xirrPreview';

/**
 * Integra com o cliente HTTP autenticado já existente no projeto.
 * Recebe o cliente por parâmetro para não duplicar tratamento de JWT/baseURL.
 * A baseURL desse cliente deve incluir /api/v1 (padrão a conferir no projeto).
 */
export interface HttpGetClient {
  get<T>(url: string): Promise<{ data: T }>;
}

export async function getXirrPreview(
  client: HttpGetClient,
  portfolioId: number,
): Promise<XirrPreview> {
  if (!Number.isSafeInteger(portfolioId) || portfolioId <= 0) {
    throw new Error('Carteira inválida para consulta de XIRR.');
  }
  const result = await client.get<XirrPreview>(`/portfolios/${portfolioId}/xirr-preview`);
  return result.data;
}
