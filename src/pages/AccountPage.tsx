import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { accountAction, accountError, completeGoogleLogin, saveLogin } from '../services/accountService'
import type { AccountAction } from '../services/accountService'
import './auth-pages.css'

const titles: Record<AccountAction | 'google', string> = {
  register: 'Criar conta', 'confirm-email': 'Confirmar e-mail', 'resend-confirmation': 'Reenviar confirmação',
  'forgot-password': 'Esqueci minha senha', 'reset-password': 'Redefinir senha', google: 'Entrando com Google',
}

export default function AccountPage({ mode }: { mode: AccountAction | 'google' }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  const [busy, setBusy] = useState(mode === 'google')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const submitted = useRef(false)
  const googleStarted = useRef(false)
  const navigate = useNavigate()
  const hasPassword = mode === 'register' || mode === 'reset-password'
  const needsToken = mode === 'confirm-email' || mode === 'reset-password'

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
    if (mode !== 'google' || googleStarted.current) return
    googleStarted.current = true
    void completeGoogleLogin().then(response => {
      saveLogin(response); navigate('/dashboard', { replace: true })
    }).catch(failure => setError(accountError(failure))).finally(() => setBusy(false))
  }, [mode, navigate])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitted.current || mode === 'google' || message) return
    setError('')
    if (hasPassword && (password.length < 15 || password.length > 64 || new TextEncoder().encode(password).length > 72)) {
      setError('Use de 15 a 64 caracteres. Com acentos ou emojis, o limite pode ser menor.'); return
    }
    if (hasPassword && password !== confirmation) { setError('As senhas não coincidem.'); return }
    submitted.current = true; setBusy(true)
    try {
      const body: Record<string, string> = mode === 'register' ? { name, email, password, confirmation }
        : mode === 'reset-password' ? { token, password, confirmation }
        : mode === 'confirm-email' ? { token } : { email }
      const response = await accountAction(mode, body)
      setMessage(response.message); setPassword(''); setConfirmation('')
      if (mode === 'reset-password') localStorage.removeItem('token')
    } catch (failure) { setError(accountError(failure)) }
    finally { submitted.current = false; setBusy(false) }
  }

  return <main className="auth-page"><section className="auth-panel" aria-labelledby="account-title">
    <p className="auth-brand">Investment Manager</p><h1 id="account-title">{titles[mode]}</h1>
    {mode === 'forgot-password' && <p>Informe seu e-mail para receber as instruções de recuperação.</p>}
    {mode === 'resend-confirmation' && <p>Solicite um novo link para ativar sua conta.</p>}
    {needsToken && !token && <p role="alert">Link inválido ou ausente. Solicite um novo link abaixo.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="auth-success">{message}</p>}
    {busy && mode === 'google' && <p role="status">Concluindo autenticação...</p>}
    {mode !== 'google' && !message && (!needsToken || token) && <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {mode === 'register' && <><label htmlFor="account-name">Nome completo</label>
          <input id="account-name" autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></>}
        {!needsToken && <><label htmlFor="account-email">E-mail</label>
          <input id="account-email" type="email" autoComplete="email" required maxLength={150} value={email} onChange={e => setEmail(e.target.value)} /></>}
        {hasPassword && <><label htmlFor="account-password">Nova senha</label>
          <input id="account-password" type="password" autoComplete="new-password" required minLength={15} maxLength={64} value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help" />
          <p id="password-help">Use uma frase longa e exclusiva, de 15 a 64 caracteres.</p>
          <label htmlFor="account-confirmation">Confirmar senha</label>
          <input id="account-confirmation" type="password" autoComplete="new-password" required maxLength={64} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></>}
        {mode === 'confirm-email' && <p>Confirme seu endereço de e-mail para ativar a conta.</p>}
        <button type="submit">{busy ? 'Processando...' : titles[mode]}</button>
      </fieldset>
    </form>}
    <nav className="auth-links" aria-label="Acesso à conta">
      <Link to="/login">Voltar para o login</Link>
      {(mode === 'register' || mode === 'confirm-email') && <Link to="/resend-confirmation">Solicitar novo e-mail de confirmação</Link>}
      {mode === 'reset-password' && <Link to="/forgot-password">Solicitar novo link de recuperação</Link>}
    </nav>
  </section></main>
}
