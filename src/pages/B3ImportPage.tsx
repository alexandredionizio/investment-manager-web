import { useCallback, useRef, useState } from 'react'
import Header from '../components/Header'
import B3ImportPreview from '../components/B3ImportPreview'
import B3IncomePreview from '../components/B3IncomePreview'
import B3ExpectedIncomePreview from '../components/B3ExpectedIncomePreview'
import './B3ImportPage.css'
import B3Reconciliation from '../components/B3Reconciliation'
import B3ImportCommit from '../components/B3ImportCommit'
import B3RejectedAttemptHistory from '../components/B3RejectedAttemptHistory'
import { findAllPortfolios } from '../services/portfolioService'
import type { PortfolioResponse } from '../types/portfolio'
import { useEffect } from 'react'
import api from '../services/api'
import { registrationFailure } from '../utils/b3RegistrationFailure'
import { userFacingApiMessage } from '../utils/userFacingApiMessage'
import { previewB3Spreadsheet, autoRegisterB3Spreadsheet, reconcileB3Spreadsheet, commitB3Spreadsheet } from '../services/b3ImportService'
import type { B3PreviewResponse, B3ReconciliationResponse, B3ImportCommitResponse } from '../types/b3Import'

type RegistrationProgress = {
    file: File
    portfolioId: number
    offset: number
    totalTickers: number
    createdAssets: number
    createdBrokers: number
    reusedAssets: number
    reusedBrokers: number
    unresolved: Set<string>
}

export default function B3ImportPage() {
    const [activeTab, setActiveTab] = useState<'movements' | 'incomes' | 'expected'>('movements')
    const requestVersion = useRef(0)
    const reconciliationVersion = useRef(0)
    const commitVersion = useRef(0)
    const [confirmationVersion, setConfirmationVersion] = useState(0)
    const registrationProgress = useRef<RegistrationProgress | null>(null)
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
        registrationProgress.current = null
        setRegistrationMessage('')
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
        if (!file || !portfolioId || reconciling) return
        const version = ++reconciliationVersion.current
        setConfirmationVersion(previous => previous + 1)
        setReconciling(true)
        setReconciliation(null)
        setReconciliationError('')
        try {
            let progress = registrationProgress.current
            if (!progress || progress.file !== file || progress.portfolioId !== portfolioId ||
                (progress.totalTickers > 0 && progress.offset >= progress.totalTickers && progress.unresolved.size > 0)) {
                progress = { file, portfolioId, offset: 0, totalTickers: 0,
                    createdAssets: 0, createdBrokers: 0, reusedAssets: 0, reusedBrokers: 0,
                    unresolved: new Set<string>() }
                registrationProgress.current = progress
            }
            do {
                const offset = progress.offset
                const registration = await autoRegisterB3Spreadsheet(api, file, portfolioId, offset)
                if (version !== reconciliationVersion.current) return
                if (registration.nextOffset <= offset || registration.nextOffset > registration.totalTickers ||
                    (progress.totalTickers && progress.totalTickers !== registration.totalTickers))
                    throw new Error('Paginação de ativos inconsistente na API B3.')
                progress.createdAssets += registration.createdAssets
                progress.createdBrokers += registration.createdBrokers
                progress.reusedAssets += registration.reusedAssets
                progress.reusedBrokers += registration.reusedBrokers
                registration.unresolvedTickers.forEach(ticker => progress.unresolved.add(ticker))
                progress.offset = registration.nextOffset
                progress.totalTickers = registration.totalTickers
                setRegistrationMessage(`Identificando ativos: ${progress.offset} de ${progress.totalTickers}. ` +
                    `${progress.unresolved.size} sem identificação segura.`)
            } while (progress.offset < progress.totalTickers)
            setRegistrationMessage(`${progress.createdAssets} ativos e ${progress.createdBrokers} corretoras cadastrados; ` +
                `${progress.reusedAssets} ativos e ${progress.reusedBrokers} corretoras reutilizados.`)
            if (progress.unresolved.size > 0) {
                setRegistrationMessage('Ativos sem identificação segura (suas operações não serão importadas): ' +
                    [...progress.unresolved].join(', ') + '. As demais operações serão conciliadas.')
            }
            const result = await reconcileB3Spreadsheet(api, file, portfolioId)
            if (version === reconciliationVersion.current) setReconciliation(result)
        } catch (error: unknown) {
            if (version === reconciliationVersion.current) {
                const progress = registrationProgress.current
                setReconciliationError(registrationFailure(error, progress?.offset ?? 0, progress?.totalTickers ?? 0))
            }
        } finally {
            if (version === reconciliationVersion.current) setReconciling(false)
        }
    }

    const commit = async () => {
        if (!file || !portfolioId || !reconciliation || reconciliation.totalRows === 0 || committing) return
        const version = ++commitVersion.current
        setCommitting(true)
        setCommitError('')
        try {
            const result = await commitB3Spreadsheet(api, file, portfolioId)
            if (version === commitVersion.current) {
                setCommitResult(result)
                setReconciliation(null)
            }
        } catch (error: unknown) {
            if (version === commitVersion.current) {
                const response = error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { message?: string } } }).response
                    : undefined
                setCommitError(userFacingApiMessage(response?.data?.message,
                    'Não foi possível obter a confirmação. Consulte o histórico de transações antes de tentar novamente.'))
            }
        } finally {
            if (version === commitVersion.current) setCommitting(false)
        }
    }

    const [file, setFile] = useState<File | null>(null)
    const [registrationMessage, setRegistrationMessage] = useState('')

    const onFileChanged = useCallback(() => {
        requestVersion.current += 1
        resetReconciliation()
        setFile(null)
        setRegistrationMessage('')
    }, [])

    const onPreviewLoaded = useCallback((selectedFile: File, _preview: B3PreviewResponse) => {
        setFile(selectedFile)
        setRegistrationMessage('')
    }, [])

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
                {file && <p role="status">Os ativos e corretoras serão cadastrados automaticamente pela identificação confirmada no arquivo B3, ao conferir as operações. Não é necessário cadastrá-los individualmente.</p>}
                {file && registrationMessage && <p role="status">{registrationMessage}</p>}
                {file && <B3Reconciliation
                    portfolios={portfolios}
                    portfolioId={portfolioId}
                    onPortfolioChange={choosePortfolio}
                    onReconcile={() => void reconcile()}
                    result={reconciliation}
                    loading={reconciling || committing}
                    error={reconciliationError}
                />}
                {file && <B3ImportCommit
                    key={`${file.name}-${file.lastModified}-${portfolioId ?? 'sem-carteira'}-${confirmationVersion}`}
                    reconciliation={reconciliation}
                    loading={committing || reconciling}
                    error={commitError}
                    result={commitResult}
                    onCommit={commit}
                />}
                {file && portfolioId !== null &&
                    <B3RejectedAttemptHistory key={`${portfolioId}-${commitResult?.status ?? 'none'}-${commitResult?.batchId ?? 'none'}`} portfolioId={portfolioId} />}
                </section>
            </main>
        </>
    )
}
