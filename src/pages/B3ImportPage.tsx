import Header from '../components/Header'
import B3ImportPreview from '../components/B3ImportPreview'
import api from '../services/api'
import { previewB3Spreadsheet } from '../services/b3ImportService'

export default function B3ImportPage() {
    return (
        <>
            <Header />
            <main style={{ maxWidth: 1440, margin: '0 auto', padding: '2rem 1rem' }}>
                <B3ImportPreview previewFile={(file) => previewB3Spreadsheet(api, file)} />
            </main>
        </>
    )
}
