import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeading } from './PageHeading'
import { MetricTile } from './MetricTile'
import { StatusNotice } from './StatusNotice'
import { SurfaceCard } from './SurfaceCard'

describe('Investment Manager UI system', () => {
    it('shares semantic headings and surfaces', () => {
        render(<><PageHeading title="Carteiras" description="Acompanhe" /><SurfaceCard title="Minhas carteiras">Conteúdo</SurfaceCard></>)
        expect(screen.getByRole('heading', { name: 'Carteiras' })).toBeTruthy()
        expect(screen.getByRole('heading', { name: 'Minhas carteiras' })).toBeTruthy()
    })
    it('does not invent figures for an unavailable metric', () => {
        render(<MetricTile label="Patrimônio" value="Indisponível" />)
        expect(screen.getByText('Indisponível')).toBeTruthy()
    })
    it('marks technical errors as alerts', () => {
        render(<StatusNotice kind="error">Cotação indisponível</StatusNotice>)
        expect(screen.getByRole('alert').textContent).toContain('Cotação indisponível')
    })
})
