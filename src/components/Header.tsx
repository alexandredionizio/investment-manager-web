import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Header.css'

function Header() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    function handleLogout() {
        localStorage.removeItem('token')
        setMenuOpen(false)
        navigate('/login')
    }

    function handleNavigation() {
        setMenuOpen(false)
    }

    return (
        <header className="app-header">
            <div className="header-content">
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
                        <NavLink
                            to="/dashboard"
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            Dashboard
                        </NavLink>

                        <NavLink
                            to="/portfolios"
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            Carteiras
                        </NavLink>

                        <NavLink
                            to="/transactions"
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            Transações
                        </NavLink>

                        <NavLink
                            to="/incomes"
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            Proventos
                        </NavLink>

                        <NavLink
                            to="/assets"
                            onClick={handleNavigation}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            Ativos
                        </NavLink>
                    </nav>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Sair
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Header