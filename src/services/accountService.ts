import { isAxiosError } from 'axios'
import api from './api'
import { clearSelectedPortfolioId } from './selectedPortfolio'
import { userFacingApiMessage } from '../utils/userFacingApiMessage'
import type { LoginResponse } from '../types/auth'

export type AccountAction = 'register' | 'confirm-email' | 'resend-confirmation' | 'forgot-password' | 'reset-password'
export async function accountAction(action: AccountAction, body: Record<string, string>) {
  return (await api.post<{ message: string }>(`/auth/${action}`, body)).data
}
export async function authOptions() {
  return (await api.get<{ googleEnabled: boolean }>('/auth/options')).data
}
export function googleLoginUrl() {
  const base = (api.defaults.baseURL ?? '/api/v1').replace(/\/+$/, '').replace(/\/api(?:\/v\d+)?$/, '')
  return `${base}/oauth2/authorization/google`
}
export async function completeGoogleLogin() {
  return (await api.post<LoginResponse>('/auth/google/exchange', {}, { withCredentials: true })).data
}
export function saveLogin(response: LoginResponse) {
  clearSelectedPortfolioId()
  localStorage.setItem('token', response.token)
}
export function accountError(error: unknown): string {
  const fallback = 'Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.'
  if (!isAxiosError(error)) return fallback
  if (error.response?.status === 429) return 'Muitas tentativas. Aguarde antes de tentar novamente.'
  const fields = error.response?.data?.fields
  if (fields && typeof fields === 'object') {
    const messages = Object.values(fields).filter((value): value is string => typeof value === 'string')
    if (messages.length) return messages.map(value => userFacingApiMessage(value, fallback)).join(' ')
  }
  return userFacingApiMessage(error.response?.data?.message, fallback)
}
