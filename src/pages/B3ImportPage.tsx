import { useCallback, useRef, useState } from 'react'
import Header from '../components/Header'
import B3ImportPreview from '../components/B3ImportPreview'
import B3IncomePreview from '../components/B3IncomePreview'
import B3ExpectedIncomePreview from '../components/B3ExpectedIncomePreview'
import './B3ImportPage.css'
import B3BrokerMatching from '../components/B3BrokerMatching'
import B3AssetRegistration from '../components/B3AssetRegistration'
import B3Reconciliation from '../components/B3Reconciliation'
import B3ImportCommit from '../components/B3ImportCommit'
import B3RejectedAttemptHistory from '../components/B3RejectedAttemptHistory'
import { findAllPortfolios } from '../services/portfolioService'
import type { PortfolioResponse } from '../types/portfolio'
import { useEffect } from 'react'
import api from '../services/api'
import { previewB3Spreadsheet, matchB3Spreadsheet, listB3BrokerOptions, confirmB3BrokerAlias, registerB3Broker, lookupB3Asset, registerB3Asset, reconcileB3Spreadsheet, commitB3Spreadsheet } from '../services/b3ImportService'
import type { B3MatchResponse, B3BrokerOption, B3PreviewResponse, B3ReconciliationResponse, B3ImportCommitResponse } from '../types/b3Import'

export default function B3ImportPage() {
    const [activeTab, setActiveTab] = useState<'movements' | 'incomes' | 'expected'>('movements')
    const requestVersion = useRef(0)
    const reconciliationVersion = useRef(0)
    const commitVersion = useRef(0)
    const [confirmationVersion, setConfirmationVersion] = useState(0)
    const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
    const [portfolioId, setPortfolioId] = useState<number | null>(null)
    const [reconciliation, setReconciliation] = useState<B3ReconciliationResponse | null>(null)
    const [commitResult, setCommitResult] = useState<B3ImportCommitResponse | null>(null)
    const [committing, setCommitting] = useState(false)
    const [commitError, setCommitError] = useState('')
    const [reconciling, setReconciling] = useState(false)
    const [reconciliationError, setReconciliationError] = useState('')
    useEffect(() => {
        let active = true
        void findAllPortfolios().then(items => { if (active) setPortfolios(items) })
            .catch(() => { if (active) setReconciliationError('Não foi possível carregar as carteiras.') })
        return () => { active = false }
    }, [])
    const resetReconciliation = () => {
        commitVersion.current += 1
        setCommitResult(null)
        setCommitError('')
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
        setConfirmationVersion(previous => previous + 1)
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

    const commit = async () => {
        if (!file || !portfolioId || !reconciliation || reconciliation.readyRows !== reconciliation.totalRows ||
            reconciliation.reviewRows !== 0 || reconciliation.blockedRows !== 0 || committing) return
        const version = ++commitVersion.current
        setCommitting(true)
        setCommitError('')
        try {
            const result = await commitB3Spreadsheet(api, file, portfolioId)
            if (version === commitVersion.current) {
                setCommitResult(result)
                setReconciliation(null)
            }
        } catch {
            if (version === commitVersion.current)
                setCommitError('Não foi possível obter a confirmação. Consulte o histórico de transações antes de tentar novamente.')
        } finally {
            if (version === commitVersion.current) setCommitting(false)
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

    // A linha do tempo reflete o estado efetivo da importação, sem alterar o fluxo existente.
    const movementsStep = commitResult ? 4 :
        reconciliation && reconciliation.readyRows === reconciliation.totalRows &&
        reconciliation.reviewRows === 0 && reconciliation.blockedRows === 0 ? 3 :
        file ? 2 : 1

    return (
        <>
            <Header />
            <main className="im-b3-page">
                <h1 style={{ marginBottom: '0.4rem' }}>Importar B3</h1>
                <p style={{ marginTop: 0, color: '#526785' }}>Selecione o tipo de informação que deseja importar.</p>
                <div className="b3-import-tabs" role="tablist" aria-label="Tipo de importação B3">
                    <button type="button" role="tab" id="b3-movements-tab" aria-controls="b3-movements-panel"
                        aria-selected={activeTab === 'movements'} className={activeTab === 'movements' ? 'active' : ''}
                        onClick={() => setActiveTab('movements')}>Negociações</button>
                    <button type="button" role="tab" id="b3-incomes-tab" aria-controls="b3-incomes-panel"
                        aria-selected={activeTab === 'incomes'} className={activeTab === 'incomes' ? 'active' : ''}
                        onClick={() => setActiveTab('incomes')}>Proventos Recebidos</button>
                    <button type="button" role="tab" id="b3-expected-tab" aria-controls="b3-expected-panel"
                        aria-selected={activeTab === 'expected'} className={activeTab === 'expected' ? 'active' : ''}
                        onClick={() => setActiveTab('expected')}>Proventos Previstos</button>
                </div>
                <section id="b3-expected-panel" role="tabpanel" aria-labelledby="b3-expected-tab" hidden={activeTab !== 'expected'}>
                    <B3ExpectedIncomePreview />
                </section>
                <section id="b3-incomes-panel" role="tabpanel" aria-labelledby="b3-incomes-tab" hidden={activeTab !== 'incomes'}>
                    <B3IncomePreview />
                </section>
                <section id="b3-movements-panel" role="tabpanel" aria-labelledby="b3-movements-tab" hidden={activeTab !== 'movements'}>
                <B3ImportPreview
                    steps={
                        <ol className="b3-income-steps" aria-label="Etapas da importação de movimentações">
                                            {(['Arquivo', 'Conferência', 'Confirmação'] as const).map((label, index) => {
                                                const order = index + 1
                                                const complete = movementsStep > order
                                                const current = movementsStep === order
                                                return <li key={label} className={complete ? 'completed' : current ? 'current' : 'upcoming'}
                                                    aria-current={current ? 'step' : undefined}>
                                                    <span className="b3-income-step-icon" aria-hidden="true">{complete ? '✓' : order}</span>
                                                    <span>{label}</span>
                                                </li>
                                            })}
                                        </ol>
                    }
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
                    loading={reconciling || pending || committing}
                    error={reconciliationError}
                />}
                {file && <B3ImportCommit
                    key={`${file.name}-${file.lastModified}-${portfolioId ?? 'sem-carteira'}-${confirmationVersion}`}
                    reconciliation={reconciliation}
                    loading={committing || reconciling || pending}
                    error={commitError}
                    result={commitResult}
                    onCommit={commit}
                />}
                {file && portfolioId !== null &&
                    <B3RejectedAttemptHistory key={portfolioId} portfolioId={portfolioId} />}
                </section>
            </main>
        </>
    )
}
