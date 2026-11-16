import api from './api'

export interface ClassReturnResponse {
  assetClass: string
  status: 'AVAILABLE' | 'UNAVAILABLE'
  totalReturn: number | null
  startDate: string | null
  endDate: string | null
  reason: string | null
}

export async function findReturnsByClass(portfolioId: number, period: 'ONE_MONTH' | 'ONE_YEAR' | 'ALL'): Promise<ClassReturnResponse[]> {
  const response = await api.get<ClassReturnResponse[]>(`/portfolios/${portfolioId}/returns/by-class`, { params: { period } })
  if (!Array.isArray(response.data) || response.data.some(item =>
    !item || typeof item.assetClass !== 'string' || !['AVAILABLE', 'UNAVAILABLE'].includes(item.status) ||
    (item.totalReturn !== null && (typeof item.totalReturn !== 'number' || !Number.isFinite(item.totalReturn))))) {
    throw new Error('Resposta de rentabilidade por classe inválida')
  }
  return response.data
}


export interface AssetReturnResponse {
  assetId: number
  status: 'AVAILABLE' | 'UNAVAILABLE'
  totalReturn: number | null
  startDate: string | null
  endDate: string | null
  reason: string | null
}

// Avoid overwhelming historical quote providers when a whole class is expanded.
let activeAssetRequests = 0
const pendingAssetJobs: Array<() => void> = []
const runningAssetCalls = new Map<string, Promise<AssetReturnResponse>>()

function withAssetLimit<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      activeAssetRequests++
      job().then(resolve, reject).finally(() => {
        activeAssetRequests--
        pendingAssetJobs.shift()?.()
      })
    }
    if (activeAssetRequests < 3) start()
    else pendingAssetJobs.push(start)
  })
}

export function findReturnsByAsset(
  portfolioId: number, assetId: number, period: 'ONE_MONTH' | 'ONE_YEAR' | 'ALL',
): Promise<AssetReturnResponse> {
  const key = `${portfolioId}:${assetId}:${period}`
  const existing = runningAssetCalls.get(key)
  if (existing) return existing
  const request = withAssetLimit(async () => {
    const response = await api.get<AssetReturnResponse>(`/portfolios/${portfolioId}/returns/by-asset/${assetId}`, { params: { period } })
    const data = response.data
    if (!data || data.assetId !== assetId || !['AVAILABLE', 'UNAVAILABLE'].includes(data.status) ||
        (data.totalReturn !== null && (typeof data.totalReturn !== 'number' || !Number.isFinite(data.totalReturn)))) {
      throw new Error('Resposta de rentabilidade por ativo inválida')
    }
    return data
  })
  runningAssetCalls.set(key, request)
  void request.finally(() => { runningAssetCalls.delete(key) }).catch(() => undefined)
  return request
}
