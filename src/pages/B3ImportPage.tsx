import { useCallback, useRef, useState } from 'react'
import Header from '../components/Header'
import B3ImportPreview from '../components/B3ImportPreview'
import B3BrokerMatching from '../components/B3BrokerMatching'
import B3AssetRegistration from '../components/B3AssetRegistration'
import B3Reconciliation from '../components/B3Reconciliation'
import { findAllPortfolios } from '../services/portfolioService'
import type { PortfolioResponse } from '../types/portfolio'
import { useEffect } from 'react'
import api from '../services/api'
import { previewB3Spreadsheet, matchB3Spreadsheet, listB3BrokerOptions, confirmB3BrokerAlias, registerB3Broker, lookupB3Asset, registerB3Asset, reconcileB3Spreadsheet } from '../services/b3ImportService'
import type { B3MatchResponse, B3BrokerOption, B3PreviewResponse, B3ReconciliationResponse } from '../types/b3Import'

export default function B3ImportPage() {
    const requestVersion = useRef(0)
    const reconciliationVersion = useRef(0)
    const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
    const [portfolioId, setPortfolioId] = useState<number | null>(null)
    const [reconciliation, setReconciliation] = useState<B3ReconciliationResponse | null>(null)
    const [reconciling, setReconciling] = useState(false)
    const [reconciliationError, setReconciliationError] = useState('')
    useEffect(() => {
        let active = true
        void findAllPortfolios().then(items => { if (active) setPortfolios(items) })
            .catch(() => { if (active) setReconciliationError('Não foi possível carregar as carteiras.') })
        return () => { active = false }
    }, [])
    const resetReconciliation = () => {
        reconciliationVersion.current += 1
        setReconciliation(null)
        setReconciliationError('')
        setReconciling(false)
    }
    const choosePortfolio = (id: number | null) => {
        setPortfolioId(id)
        resetReconciliation()
    }
    const reconcile = async () => {
        if (!file || !portfolioId || pending) return
        const version = ++reconciliationVersion.current
        setReconciling(true)
        setReconciliation(null)
        setReconciliationError('')
        try {
            const result = await reconcileB3Spreadsheet(api, file, portfolioId)
            if (version === reconciliationVersion.current) setReconciliation(result)
        } catch {
            if (version === reconciliationVersion.current) setReconciliationError('Conciliação indisponível. Confira a carteira e a autenticação.')
        } finally {
            if (version === reconciliationVersion.current) setReconciling(false)
        }
    }

    const [file, setFile] = useState<File | null>(null)
    const [matches, setMatches] = useState<B3MatchResponse | null>(null)
    const [brokers, setBrokers] = useState<B3BrokerOption[]>([])
    const [pending, setPending] = useState(false)
    const [matchingError, setMatchingError] = useState('')

    const onFileChanged = useCallback(() => {
        requestVersion.current += 1
        resetReconciliation()
        setFile(null)
        setMatches(null)
        setBrokers([])
        setPending(false)
        setMatchingError('')
    }, [])

    const loadMatches = useCallback(async (selectedFile: File) => {
        const currentVersion = ++requestVersion.current
        resetReconciliation()
        setPending(true)
        setMatchingError('')
        try {
            const [result, available] = await Promise.all([
                matchB3Spreadsheet(api, selectedFile),
                listB3BrokerOptions(api),
            ])
            if (requestVersion.current !== currentVersion) return
            setMatches(result)
            setBrokers(available)
        } catch {
            if (requestVersion.current === currentVersion) {
                setMatchingError('Não foi possível conferir os cadastros. A pré-visualização permanece disponível; tente novamente.')
            }
        } finally {
            if (requestVersion.current === currentVersion) setPending(false)
        }
    }, [])

    const onPreviewLoaded = useCallback((selectedFile: File, _preview: B3PreviewResponse) => {
        setFile(selectedFile)
        setMatches(null)
        void loadMatches(selectedFile)
    }, [loadMatches, setFile, setMatches])

    const saveAlias = useCallback(async (institution: string, brokerId: number) => {
        if (!file) throw new Error('Selecione novamente a planilha antes de confirmar.')
        await confirmB3BrokerAlias(api, institution, brokerId)
        await loadMatches(file)
    }, [file, loadMatches])

    const registerBroker = useCallback(async (institution: string, brokerName: string) => {
        if (!file) throw new Error('Selecione novamente a planilha antes de cadastrar.')
        await registerB3Broker(api, institution, brokerName)
        await loadMatches(file)
    }, [file, loadMatches])

    const confirmAsset = useCallback(async (ticker: string) => {
        if (!file) throw new Error('Selecione novamente a planilha.')
        const result = await registerB3Asset(api, ticker)
        await loadMatches(file)
        return result
    }, [file, loadMatches])

    return (
        <>
            <Header />
            <main style={{ maxWidth: 1440, margin: '0 auto', padding: '2rem 1rem' }}>
                <B3ImportPreview
                    previewFile={(selectedFile) => previewB3Spreadsheet(api, selectedFile)}
                    onFileChanged={onFileChanged}
                    onPreviewLoaded={onPreviewLoaded}
                />
                {file && (
                    <B3BrokerMatching
                        matches={matches}
                        brokers={brokers}
                        loading={pending}
                        error={matchingError}
                        onRetry={() => void loadMatches(file)}
                        onConfirmAlias={saveAlias}
                        onRegisterBroker={registerBroker}
                    />
                )}
                {file && (
                    <B3AssetRegistration
                        matches={matches}
                        loading={pending}
                        onLookup={(ticker) => lookupB3Asset(api, ticker)}
                        onRegister={confirmAsset}
                    />
                )}
                {file && <B3Reconciliation
                    portfolios={portfolios}
                    portfolioId={portfolioId}
                    onPortfolioChange={choosePortfolio}
                    onReconcile={() => void reconcile()}
                    result={reconciliation}
                    loading={reconciling || pending}
                    error={reconciliationError}
                />}
            </main>
        </>
    )
}
