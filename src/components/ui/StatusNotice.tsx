import type { ReactNode } from 'react'

type StatusNoticeProps = { kind: 'error' | 'empty' | 'loading' | 'info'; children: ReactNode }

export function StatusNotice({ kind, children }: StatusNoticeProps) {
    const role = kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined
    return <p className={`im-notice im-notice--${kind}`} role={role}>{children}</p>
}
