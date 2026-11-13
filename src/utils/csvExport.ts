/**
 * Exporta exatamente os dados visíveis no histórico, sem identificadores internos.
 * Os campos são tratados como texto para impedir fórmulas em aplicativos de planilha.
 */
export function createCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
    function cell(value: string | number | null | undefined): string {
        const raw = String(value ?? '')
        const safe = /^[\s]*[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw
        return `"${safe.replace(/"/g, '""')}"`
    }
    return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n') + '\r\n'
}

export function downloadCsv(name: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const blob = new Blob([createCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
}

/** Nome de exportação legível, sem IDs de carteira nem caracteres de caminho. */
export function csvExportFilename(prefix: 'proventos' | 'transacoes', portfolioName?: string | null, date = new Date()): string {
    const slug = (portfolioName || 'todas').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'carteira'
    const yyyyMmDd = date.toISOString().slice(0, 10)
    return `${prefix}-${slug}-${yyyyMmDd}.csv`
}
