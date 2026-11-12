import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Header.css'
import { clearSelectedPortfolioId } from '../services/selectedPortfolio'

let sidebarCollapsed = false

function Header() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(() => sidebarCollapsed)

    function updateCollapsed(next: boolean) {
        sidebarCollapsed = next
        setCollapsed(next)
    }

    // Collapse the desktop sidebar when the user interacts with the page content.
    useEffect(() => {
        function handlePageClick(event: MouseEvent) {
            if (event.target instanceof Element && !event.target.closest('.app-header')) {
                updateCollapsed(true)
            }
        }
        document.addEventListener('click', handlePageClick)
        return () => document.removeEventListener('click', handlePageClick)
    }, [])

    function handleLogout() {
        localStorage.removeItem('token')
        clearSelectedPortfolioId()
        setMenuOpen(false)
        navigate('/login')
    }

    function handleNavigation() {
        setMenuOpen(false)
        updateCollapsed(true)
    }

    return (
        <header className={`app-header ${collapsed ? 'is-collapsed' : ''}`}>
            <div className="header-content">
                <button type="button" className="sidebar-collapse-toggle"
                    aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                    aria-expanded={!collapsed}
                    onClick={() => updateCollapsed(!collapsed)}
                    title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}>
                    <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
                </button>
                <div className="brand">
                    <span className="brand-icon">IM</span>
                    <span>Investment Manager</span>
                </div>

                <button
                    type="button"
                    className="mobile-menu-button"
                    onClick={() => setMenuOpen((current) => !current)}
                    aria-label="Abrir menu de navegação"
                    aria-expanded={menuOpen}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`header-navigation ${menuOpen ? 'open' : ''}`}>
                    <nav className="main-nav">
                        <NavLink to="/dashboard" onClick={handleNavigation} title={'Dashboard'} aria-label={'Dashboard'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">▦</span><span className="sidebar-nav-text">Dashboard</span></NavLink>
                        <NavLink to="/portfolios" onClick={handleNavigation} title={'Carteiras'} aria-label={'Carteiras'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">▣</span><span className="sidebar-nav-text">Carteiras</span></NavLink>
                        <NavLink to="/transactions" onClick={handleNavigation} title={'Transações'} aria-label={'Transações'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">⇄</span><span className="sidebar-nav-text">Transações</span></NavLink>
                        <NavLink to="/incomes" onClick={handleNavigation} title={'Proventos'} aria-label={'Proventos'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">◈</span><span className="sidebar-nav-text">Proventos</span></NavLink>
                        <NavLink to="/assets" onClick={handleNavigation} title={'Ativos'} aria-label={'Ativos'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">◇</span><span className="sidebar-nav-text">Ativos</span></NavLink>
                        <NavLink to="/import/b3" onClick={handleNavigation} title={'Importar B3'} aria-label={'Importar B3'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="sidebar-nav-icon" aria-hidden="true">⇧</span><span className="sidebar-nav-text">Importar B3</span></NavLink>
                    </nav>

                    <button type="button" className="logout-button" onClick={handleLogout}><span className="sidebar-nav-icon" aria-hidden="true">↪</span><span className="sidebar-nav-text">Sair</span></button>
                </div>
            </div>
        </header>
    )
}

export default Header
