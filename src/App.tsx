import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PortfoliosPage = lazy(() => import('./pages/PortfoliosPage'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const PortfolioDetailsPage = lazy(() => import('./pages/PortfolioDetailsPage'))
const IncomesPage = lazy(() => import('./pages/IncomesPage'))
const AssetsPage = lazy(() => import('./pages/AssetsPage'))
const B3ImportPage = lazy(() => import('./pages/B3ImportPage'))
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'
import './styles/tokens.css'
import './styles/design-system.css'

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<p role="status">Carregando pÃ¡gina...</p>}>
                <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/portfolios" element={<ProtectedRoute><PortfoliosPage /></ProtectedRoute>} />
                <Route path="/portfolios/:id" element={<ProtectedRoute><PortfolioDetailsPage /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
                <Route path="/incomes" element={<ProtectedRoute><IncomesPage /></ProtectedRoute>} />
                <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
                <Route path="/import/b3" element={<ProtectedRoute><B3ImportPage /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

export default App
