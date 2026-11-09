import type { PositionMarketResponse } from '../types/position'

export default function ValuationDetails({ position }: { position: PositionMarketResponse }) {
    if (!position.valuationStatus) return null
    return <div className="valuation-details">
        <p>{position.valuationStatus === 'UNAVAILABLE' ? 'Avaliação indisponível'
            : position.valuationMethod === 'CONTRACTUAL' ? 'Remuneração contratual estimada (bruta)' : 'Marcação a mercado (BRL)'}</p>
        {position.reason && <p>{position.reason}</p>}
        {position.referenceTime && <small>Referência: {new Date(position.referenceTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. {position.source}</small>}
        {position.netValue != null && <p>Líquido estimado: {position.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
    </div>
}
