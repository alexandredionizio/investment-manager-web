import api from './api'
import type { AssetResponse } from '../types/asset'

export async function findAllAssets(): Promise<AssetResponse[]> {
    const response = await api.get<AssetResponse[]>('/assets')

    return response.data
}