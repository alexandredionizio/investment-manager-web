import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from './Header'

afterEach(cleanup)

describe('Sidebar responsive navigation', () => {
    it('collapses when navigating and expands through the explicit toggle', () => {
        const { container } = render(<MemoryRouter><Header /></MemoryRouter>)
        const sidebar = container.querySelector('.app-header')!
        if (sidebar.classList.contains('is-collapsed')) {
            fireEvent.click(screen.getByRole('button', { name: 'Expandir menu lateral' }))
        }
        expect(sidebar.classList.contains('is-collapsed')).toBe(false)
        fireEvent.click(screen.getByRole('link', { name: 'Importar B3' }))
        expect(sidebar.classList.contains('is-collapsed')).toBe(true)
        fireEvent.click(screen.getByRole('button', { name: 'Expandir menu lateral' }))
        expect(sidebar.classList.contains('is-collapsed')).toBe(false)
    })
    it('collapses when interacting with the page outside the navigation', () => {
        const { container } = render(<MemoryRouter><><Header /><main><button>Conteúdo da página</button></main></></MemoryRouter>)
        fireEvent.click(screen.getByRole('button', { name: 'Conteúdo da página' }))
        expect(container.querySelector('.app-header')?.classList.contains('is-collapsed')).toBe(true)
    })
})
