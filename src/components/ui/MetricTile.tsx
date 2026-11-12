import type { ReactNode } from 'react'

interface MetricTileProps { label: string; value: ReactNode; detail?: ReactNode; tone?: 'positive' | 'negative' | 'neutral' }

export function MetricTile({ label, value, detail, tone = 'neutral' }: MetricTileProps) {
    return <article className="im-metric-tile"><span className="im-metric-label">{label}</span>
        <strong className={`im-metric-value im-metric-value--${tone}`}>{value}</strong>
        {detail && <small>{detail}</small>}
    </article>
}
