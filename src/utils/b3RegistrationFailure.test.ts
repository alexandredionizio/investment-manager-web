import { describe, expect, it } from 'vitest'
import { registrationFailure } from './b3RegistrationFailure'

describe('IM-064: diagnóstico da identificação B3', () => {
  it('informa o lote e o ticker fornecido pelo backend sem expor autenticação', () => {
    const result = registrationFailure({ response: { status: 503, data: {
      message: 'Falha ao consultar o catálogo para BARI11: serviço indisponível',
    } } }, 5, 55)
    expect(result).toContain('lote iniciado em 6 de 55')
    expect(result).toContain('HTTP 503')
    expect(result).toContain('BARI11')
    expect(result).toContain('retomar desse lote')
  })
  it('não inventa motivo quando o servidor não responde', () => {
    expect(registrationFailure(null, 0, 0)).toContain('Falha de comunicação')
  })
})
