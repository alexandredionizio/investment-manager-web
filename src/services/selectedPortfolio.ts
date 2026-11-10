const key = 'investment-manager:selected-portfolio'

export function getSelectedPortfolioId(): number | null {
    const value = window.sessionStorage.getItem(key)
    const id = value === null ? NaN : Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function saveSelectedPortfolioId(id: number) {
    window.sessionStorage.setItem(key, String(id))
}

export function clearSelectedPortfolioId() {
    window.sessionStorage.removeItem(key)
}
