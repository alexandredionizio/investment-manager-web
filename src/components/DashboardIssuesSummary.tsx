import type { DashboardIssues } from '../services/dashboardService'
import { dashboardSectionLabels } from '../services/dashboardService'

type Props = { issues: DashboardIssues }

/** Preserve every unavailable section while avoiding a wall of duplicate banners. */
export function DashboardIssuesSummary({ issues }: Props) {
    const entries = Object.entries(issues).filter((entry): entry is [keyof DashboardIssues, string] =>
        typeof entry[1] === 'string' && entry[1].trim().length > 0)

    if (entries.length === 0) return null

    const grouped = new Map<string, string[]>()
    for (const [key, message] of entries) {
        const sections = grouped.get(message) ?? []
        sections.push(dashboardSectionLabels[key])
        grouped.set(message, sections)
    }

    return (
        <section className="dashboard-error" role="alert" aria-label="Limitações na avaliação da carteira">
            <strong>Avaliação parcialmente disponível</strong>
            <p>Os resultados válidos continuam visíveis. Os cálculos abaixo dependem de dados ainda indisponíveis:</p>
            <ul style={{ marginBottom: 0, paddingLeft: '1.25rem' }}>
                {[...grouped.entries()].map(([message, sections]) => (
                    <li key={message} style={{ marginTop: '0.35rem' }}>
                        <strong>{sections.join(' / ')}:</strong> {message}
                    </li>
                ))}
            </ul>
        </section>
    )
}
