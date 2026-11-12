import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import { findAllAssets, findAssetIdentifiers } from '../services/assetService'
import type { HistoricalIdentifier } from '../services/assetService'
import type {
    AssetResponse,
    AssetType,
} from '../types/asset'

function AssetsPage() {
    const [assets, setAssets] =
        useState<AssetResponse[]>([])

    const historyRequest = useRef(0)
    const [selectedHistory, setSelectedHistory] = useState<number | null>(null)
    const [identifiers, setIdentifiers] = useState<HistoricalIdentifier[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState('')

    async function toggleHistory(assetId: number) {
        const request = ++historyRequest.current
        if (selectedHistory === assetId) {
            setSelectedHistory(null)
            return
        }
        setSelectedHistory(assetId)
        setIdentifiers([])
        setHistoryError('')
        setHistoryLoading(true)
        try {
            const result = await findAssetIdentifiers(assetId)
            if (historyRequest.current === request) setIdentifiers(result)
        } catch {
            if (historyRequest.current === request) setHistoryError('Não foi possível consultar o histórico de identificadores.')
        } finally {
            if (historyRequest.current === request) setHistoryLoading(false)
        }
    }

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState('')

    useEffect(() => {
        async function loadAssets() {
            try {
                const data = await findAllAssets()
                setAssets(data)
            } catch (error) {
                console.error(
                    'Erro ao buscar ativos:',
                    error,
                )

                setError(
                    'Não foi possível carregar os ativos.',
                )
            } finally {
                setLoading(false)
            }
        }

        loadAssets()
    }, [])

    function formatAssetType(type: AssetType) {
        switch (type) {
            case 'STOCK':
                return 'Ação'

            case 'FII':
                return 'FII'

            case 'ETF':
                return 'ETF'

            case 'CRYPTO':
                return 'Criptomoeda'

            case 'FIXED_INCOME':
                return 'Renda fixa'

            case 'TREASURE':
                return 'Tesouro Direto'
        }
    }

    return (
        <>
            <Header />

            <main className="dashboard-container">
                <div className="page-heading">
                    <h1>Ativos</h1>

                    <p>
                        Consulte os ativos disponíveis para
                        seus investimentos.
                    </p>
                </div>

                <section className="dashboard-card">
                    <h2>Ativos reconhecidos</h2>
                    <p>
                        Esta página consulta os ativos reconhecidos, inclusive os mantidos para preservar o histórico.
                        Para comprar ações, FIIs ou ETFs B3, pesquise o instrumento na tela Transações.
                        A presença nesta lista não garante elegibilidade para novas compras.
                    </p>

                    {loading ? (
                        <p>Carregando ativos...</p>
                    ) : error ? (
                        <p>{error}</p>
                    ) : assets.length === 0 ? (
                        <p>Nenhum ativo encontrado.</p>
                    ) : (
                        <div className="table-container">
                            <table className="transactions-table">
                                <thead>
                                <tr>
                                    <th>Ticker</th>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Setor</th>
                                    <th>Bolsa</th>
                                    <th>Identidade histórica</th>
                                </tr>
                                </thead>

                                <tbody>
                                {assets.map((asset) => (
                                    <tr key={asset.id}>
                                        <td className="ticker">
                                            {asset.ticker}
                                        </td>

                                        <td>
                                            {asset.name}
                                        </td>

                                        <td>
                                            {formatAssetType(
                                                asset.type,
                                            )}
                                        </td>

                                        <td>
                                            {asset.sector}
                                        </td>

                                        <td>
                                            {asset.exchange}
                                        </td>
                                        <td>
                                            <button type="button" onClick={() => void toggleHistory(asset.id)}
                                                aria-expanded={selectedHistory === asset.id}>
                                                {selectedHistory === asset.id ? 'Ocultar histórico' : 'Ver histórico'}
                                            </button>
                                            {selectedHistory === asset.id && (
                                                <div role="status">
                                                    {historyLoading ? 'Consultando histórico...' : historyError || (
                                                        identifiers.length === 0 ? 'Sem identificadores históricos confirmados.' :
                                                            identifiers.map((identifier, index) => (
                                                                <p key={`${identifier.kind}-${identifier.value}-${index}`}>
                                                                    {identifier.kind === 'ISIN' ? 'ISIN' : 'Ticker'}: {identifier.value}
                                                                    {identifier.effectiveDate ? ` (a partir de ${identifier.effectiveDate})` : ''}
                                                                </p>
                                                            ))
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </>
    )
}

export default AssetsPage