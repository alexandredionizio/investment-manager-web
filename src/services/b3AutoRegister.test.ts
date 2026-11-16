import { describe, expect, it, vi } from 'vitest'
import { autoRegisterB3Spreadsheet, commitB3Spreadsheet } from './b3ImportService'

describe('IM-064: cadastro automático pela própria planilha B3', () => {
  it('IM-064: só confirma importação parcial no endpoint dedicado, com consentimento', async () => {
    const post = vi.fn().mockResolvedValue({ data: {
      batchId: 10, portfolioId: 9, status: 'PARTIALLY_IMPORTED',
      importedRows: 10, rejectedRows: 3, rows: [],
    } })
    const file = new File(['excel'], 'b3.xlsx')
    const api = { post, defaults: { baseURL: 'http://localhost:8080/api/v1' } }
    const response = await commitB3Spreadsheet(api as never, file, 9)
    expect(response.status).toBe('PARTIALLY_IMPORTED')
    expect(post.mock.calls[0][0]).toBe('http://localhost:8080/api/imports/b3/commit-partial')
    expect(post.mock.calls[0][2].params).toEqual({ portfolioId: 9, confirmed: true })
  })

  it('reenvia o arquivo original, usa o lote solicitado e mantém o endpoint autenticado', async () => {
    const result = {
      createdAssets: 2, createdBrokers: 1, reusedAssets: 0, reusedBrokers: 0,
      unresolvedTickers: [], totalRows: 10, nextOffset: 5, totalTickers: 8,
    }
    const post = vi.fn().mockResolvedValue({ data: result })
    const file = new File(['excel'], 'negociacoes.xlsx')
    const api = { post, defaults: { baseURL: 'http://localhost:8080/api/v1' } }
    expect(await autoRegisterB3Spreadsheet(api as never, file, 9, 0)).toEqual(result)
    expect(post).toHaveBeenCalledOnce()
    const [url, form, config] = post.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/imports/b3/auto-register')
    expect((form as FormData).get('file')).toBe(file)
    expect(config.params).toEqual({ portfolioId: 9, offset: 0 })
  })
})
