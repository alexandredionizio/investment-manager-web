import type { ComponentPropsWithoutRef } from 'react'

type SurfaceCardProps = ComponentPropsWithoutRef<'section'> & { title?: string; description?: string }

/** Neutral section surface. Preserves native section semantics and caller event handlers. */
export function SurfaceCard({ title, description, className = '', children, ...props }: SurfaceCardProps) {
    return <section className={`dashboard-card im-surface ${className}`.trim()} {...props}>
        {title && <div className="im-surface-heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>}
        {children}
    </section>
}
