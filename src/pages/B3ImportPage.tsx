import { useCallback, useRef, useState } from 'react'
import Header from '../components/Header'
import B3ImportPreview from '../components/B3ImportPreview'
import B3BrokerMatching from '../components/B3BrokerMatching'
import api from '../services/api'
import { previewB3Spreadsheet, matchB3Spreadsheet, listB3BrokerOptions, confirmB3BrokerAlias, registerB3Broker } from '../services/b3ImportService'
import type { B3MatchResponse, B3BrokerOption, B3PreviewResponse } from '../types/b3Import'

export default function B3ImportPage() {
    const requestVersion = useRef(0)
    const [file, setFile] = useState<File | null>(null)
    const [matches, setMatches] = useState<B3MatchResponse | null>(null)
    const [brokers, setBrokers] = useState<B3BrokerOption[]>([])
    const [pending, setPending] = useState(false)
    const [matchingError, setMatchingError] = useState('')

    const onFileChanged = useCallback(() => {
        requestVersion.current += 1
        setFile(null)
        setMatches(null)
        setBrokers([])
        setPending(false)
        setMatchingError('')
    }, [])

    const loadMatches = useCallback(async (selectedFile: File) => {
        const currentVersion = ++requestVersion.current
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
    }, [loadMatches])

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
            </main>
        </>
    )
}
