import type { ReactNode } from 'react'

interface PageHeadingProps { title: string; description: string; actions?: ReactNode; className?: string }

/** Page heading shared by all investment pages; business data stays in each page. */
export function PageHeading({ title, description, actions, className = '' }: PageHeadingProps) {
    return <div className={`page-heading im-page-heading ${className}`.trim()}>
        <div><h1>{title}</h1><p>{description}</p></div>
        {actions && <div className="im-page-actions">{actions}</div>}
    </div>
}
