import api from './api'
import type { BrokerResponse } from '../types/broker'

export async function findAllBrokers(): Promise<BrokerResponse[]> {
    const response = await api.get<BrokerResponse[]>('/brokers')

    return response.data
}