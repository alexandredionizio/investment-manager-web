import api from './api'
import type { AssetResponse } from '../types/asset'

export async function findAllAssets(): Promise<AssetResponse[]> {
    const response = await api.get<AssetResponse[]>('/assets')

    return response.data
}
export type HistoricalIdentifier = {
    kind: 'TICKER' | 'ISIN'
    value: string
    exchange: string
    source: string
    observedName: string
    effectiveDate: string | null
}

export async function findAssetIdentifiers(assetId: number): Promise<HistoricalIdentifier[]> {
    const response = await api.get<HistoricalIdentifier[]>(`/assets/${assetId}/identifiers`)
    return response.data
}
