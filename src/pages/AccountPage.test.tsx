import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountPage from './AccountPage'
import LoginPage from './LoginPage'
import { accountAction, authOptions, completeGoogleLogin, saveLogin } from '../services/accountService'
import { login } from '../services/authService'

vi.mock('../services/accountService', async importOriginal => ({
  ...await importOriginal<typeof import('../services/accountService')>(),
  accountAction: vi.fn(), authOptions: vi.fn(), completeGoogleLogin: vi.fn(), saveLogin: vi.fn(),
}))
vi.mock('../services/authService', () => ({ login: vi.fn() }))
beforeEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/'); localStorage.clear() })
afterEach(cleanup)
const password = 'Uma frase de senha 123!'
function page(mode: Parameters<typeof AccountPage>[0]['mode']) {
  render(<MemoryRouter><AccountPage mode={mode} /></MemoryRouter>)
}
function fillPassword(confirmation = password) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirmation } })
}
describe('contas e autenticação', () => {
  it('valida confirmação e impede envios simultâneos de cadastro', async () => {
    let finish!: (value: { message: string }) => void
    vi.mocked(accountAction).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    page('register')
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Pessoa Teste' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'person@example.test' } })
    fillPassword('Outra frase de senha 123!')
    const form = screen.getByRole('button', { name: 'Criar conta' }).closest('form')!
    fireEvent.submit(form)
    expect(screen.getByRole('alert').textContent).toContain('não coincidem')
    expect(accountAction).not.toHaveBeenCalled()
    fillPassword(); fireEvent.submit(form); fireEvent.submit(form)
    expect(accountAction).toHaveBeenCalledOnce()
    expect(accountAction).toHaveBeenCalledWith('register', { name: 'Pessoa Teste', email: 'person@example.test', password, confirmation: password })
    finish({ message: 'Confira seu e-mail.' })
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Confira seu e-mail.')
    expect(screen.getByRole('link', { name: 'Solicitar novo e-mail de confirmação' })).toBeTruthy()
  })
  it('não consome confirmação automaticamente e remove token da URL', async () => {
    window.history.replaceState(null, '', '/confirm-email#token=secret-token')
    vi.mocked(accountAction).mockResolvedValue({ message: 'E-mail confirmado.' })
    page('confirm-email')
    expect(window.location.hash).toBe(''); expect(accountAction).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e-mail' }))
    await screen.findByRole('status')
    expect(accountAction).toHaveBeenCalledWith('confirm-email', { token: 'secret-token' })
    expect(document.body.textContent).not.toContain('secret-token')
  })
  it('mostra link expirado e permite nova recuperação', async () => {
    window.history.replaceState(null, '', '/reset-password#token=expired')
    vi.mocked(accountAction).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { message: 'Link inválido, expirado ou já utilizado.' } } })
    page('reset-password'); fillPassword()
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    expect((await screen.findByRole('alert')).textContent).toContain('expirado')
    expect(screen.getByRole('link', { name: 'Solicitar novo link de recuperação' }).getAttribute('href')).toBe('/forgot-password')
  })
  it('recuperação apresenta resposta genérica', async () => {
    vi.mocked(accountAction).mockResolvedValue({ message: 'Se a conta for elegível, você receberá um e-mail.' })
    page('forgot-password')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'person@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    expect((await screen.findByRole('status')).textContent).toContain('Se a conta for elegível')
  })
  it('não informa sucesso quando SMTP falha', async () => {
    vi.mocked(accountAction).mockRejectedValue({ isAxiosError: true, response: { status: 503, data: { message: 'O serviço de e-mail está indisponível.' } } })
    page('resend-confirmation')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'person@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar confirmação' }))
    expect((await screen.findByRole('alert')).textContent).toContain('indisponível')
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('mantém login tradicional e oferece os novos caminhos', async () => {
    vi.mocked(authOptions).mockResolvedValue({ googleEnabled: true })
    vi.mocked(login).mockResolvedValue({ token: 'jwt' })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar com Google' }).hasAttribute('disabled')).toBe(false))
    expect(screen.getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/register')
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'legacy@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'old-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(saveLogin).toHaveBeenCalledWith({ token: 'jwt' }))
  })
  it('explica ativação pendente no login', async () => {
    vi.mocked(authOptions).mockResolvedValue({ googleEnabled: false })
    vi.mocked(login).mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { message: 'Confirme seu e-mail antes de entrar.' } } })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pending@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Confirme seu e-mail')
  })
  it('distingue Google desabilitado de uma falha de conexão', async () => {
    vi.mocked(authOptions).mockResolvedValue({ googleEnabled: false })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(await screen.findByText('Login com Google ainda não está habilitado.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continuar com Google' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Continuar com Google' }).querySelector('img')?.getAttribute('alt')).toBe('')
  })
  it('permite consultar novamente o Google após uma falha de conexão', async () => {
    vi.mocked(authOptions).mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({ googleEnabled: true })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(await screen.findByText('Não foi possível consultar o login com Google.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar com Google' }).hasAttribute('disabled')).toBe(false))
    expect(authOptions).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Não foi possível consultar o login com Google.')).toBeNull()
  })
  it('troca o login Google apenas uma vez mesmo em StrictMode', async () => {
    vi.mocked(completeGoogleLogin).mockResolvedValue({ token: 'google-jwt' })
    render(<StrictMode><MemoryRouter><AccountPage mode="google" /></MemoryRouter></StrictMode>)
    await waitFor(() => expect(saveLogin).toHaveBeenCalledWith({ token: 'google-jwt' }))
    expect(completeGoogleLogin).toHaveBeenCalledOnce()
  })
  it('mostra falha Google sem armazenar login', async () => {
    vi.mocked(completeGoogleLogin).mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { message: 'A autenticação expirou.' } } })
    page('google')
    expect((await screen.findByRole('alert')).textContent).toContain('expirou')
    expect(saveLogin).not.toHaveBeenCalled()
  })
})
