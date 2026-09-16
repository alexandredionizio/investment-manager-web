import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { findAllAssets } from '../services/assetService'
import type {
    AssetResponse,
    AssetType,
} from '../types/asset'

function AssetsPage() {
    const [assets, setAssets] =
        useState<AssetResponse[]>([])

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
                    <h2>Ativos disponíveis</h2>

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