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
