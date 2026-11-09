import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PortfoliosPage from './pages/PortfoliosPage'
import TransactionsPage from './pages/TransactionsPage'
import PortfolioDetailsPage from './pages/PortfolioDetailsPage'
import IncomesPage from './pages/IncomesPage'
import AssetsPage from './pages/AssetsPage'
import B3ImportPage from './pages/B3ImportPage'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
    return (
        <BrowserRouter>
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
        </BrowserRouter>
    )
}

export default App
