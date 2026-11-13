/** IM-058: evita expor identificadores internos retornados pela API em alertas. */
export function userFacingApiMessage(raw: unknown, fallback: string): string {
    if (typeof raw !== 'string' || !raw.trim()) return fallback
    const message = raw.trim()
    // IDs internos e detalhes técnicos não têm significado para o usuário final.
    if (/\b(?:id|ids|identificador(?:es)?|chave prim[aá]ria|primary key)\s*(?:\w+\s*)?[:=#]\s*\d+\b/i.test(message)
        || /\b(?:id|identificador)\s+(?:do|da|de|com|interno)\s*(?:\w+\s*)?[:=#]?\s*\d+\b/i.test(message)
        || /\b(?:portfolio_id|asset_id|transaction_id|broker_id|income_id|batch_id)\s*[:=#]?\s*\d+\b/i.test(message)) {
        return fallback
    }
    return message
}
