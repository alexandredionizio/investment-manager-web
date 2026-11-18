import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../services/authService'
import { accountError, authOptions, googleLoginUrl, saveLogin } from '../services/accountService'
import './auth-pages.css'
import googleLogo from '../assets/google-g.png'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleStatus, setGoogleStatus] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading')
    const submitting = useRef(false)
    const [params] = useSearchParams()
    async function checkGoogle() {
        setGoogleStatus('loading')
        try { setGoogleStatus((await authOptions()).googleEnabled ? 'enabled' : 'disabled') }
        catch { setGoogleStatus('error') }
    }
    useEffect(() => { void checkGoogle() }, [])

    const navigate = useNavigate()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (submitting.current) return
        submitting.current = true

        setErrorMessage('')
        setLoading(true)

        try {
            const response = await login({
                email,
                password,
            })

            saveLogin(response)

            navigate('/dashboard', { replace: true })
        } catch (error) {
            setErrorMessage(accountError(error))
        } finally {
            setLoading(false)
            submitting.current = false
        }
    }

    return (
        <main className="auth-page"><section className="auth-panel" aria-labelledby="login-title">
            <p className="auth-brand">Investment Manager</p>
            <h1 id="login-title">Entrar</h1>
            {params.get('error') === 'google' && <p role="alert" className="auth-error">Não foi possível entrar com Google. Tente novamente ou use o método original da sua conta.</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">E-mail</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email" required maxLength={150} disabled={loading}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password">Senha</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password" required maxLength={72} disabled={loading}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                <div className="auth-password-tools"><Link to="/forgot-password">Esqueci minha senha</Link></div>
                {errorMessage && (
                    <p role="alert" className="auth-error">{errorMessage}</p>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
            <div className="auth-divider" aria-hidden="true"><span>ou</span></div>
            <button className="auth-google-button" type="button" disabled={loading || googleStatus !== 'enabled'}
                aria-describedby={googleStatus !== 'enabled' ? 'google-status' : undefined}
                onClick={() => { if (!submitting.current) { submitting.current=true; setLoading(true); window.location.assign(googleLoginUrl()) } }}>
                <img src={googleLogo} width={20} height={20} alt="" aria-hidden="true" />
                <span>Continuar com Google</span>
            </button>
            {googleStatus !== 'enabled' && <div className="auth-google-note" id="google-status" role="status">
                {googleStatus === 'loading' ? 'Verificando login com Google...' : googleStatus === 'disabled'
                    ? 'Login com Google ainda não está habilitado.' : 'Não foi possível consultar o login com Google.'}
                {googleStatus === 'error' && <button className="auth-retry" type="button" onClick={() => void checkGoogle()}>Tentar novamente</button>}
            </div>}
            <nav className="auth-links auth-login-links" aria-label="Acesso à conta">
                <div className="auth-signup"><span>Ainda não tem uma conta?</span>
                    <Link to="/register" className="auth-create-link">Criar conta
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                    </Link>
                </div>
                <Link className="auth-resend-link" to="/resend-confirmation">Reenviar confirmação de e-mail</Link>
            </nav>
        </section></main>
    )
}

export default LoginPage
