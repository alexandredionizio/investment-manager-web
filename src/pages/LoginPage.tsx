import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/authService'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setErrorMessage('')
        setLoading(true)

        try {
            const response = await login({
                email,
                password,
            })

            localStorage.setItem('token', response.token)

            navigate('/dashboard')
        } catch (error) {
            console.error('Erro ao realizar login:', error)

            setErrorMessage('E-mail ou senha inválidos.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main>
            <h1>Investment Manager</h1>
            <h2>Login</h2>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">E-mail</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password">Senha</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                {errorMessage && (
                    <p>{errorMessage}</p>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </main>
    )
}

export default LoginPage