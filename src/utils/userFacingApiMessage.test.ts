import { describe, expect, it } from 'vitest'
import { userFacingApiMessage } from './userFacingApiMessage'

describe('IM-058 — mensagens externas seguras', () => {
    const fallback = 'Não foi possível concluir a operação.'
    it('remove IDs internos nas mensagens legadas da API', () => {
        expect(userFacingApiMessage('Carteira não encontrada com o id: 18', fallback)).toBe(fallback)
        expect(userFacingApiMessage('Provento não encontrado com o ID: 123', fallback)).toBe(fallback)
        expect(userFacingApiMessage('Conflito: portfolio_id=18', fallback)).toBe(fallback)
    })
    it('preserva mensagens de negócio sem IDs técnicos', () => {
        expect(userFacingApiMessage('Não há saldo suficiente para vender PETR4.', fallback))
            .toBe('Não há saldo suficiente para vender PETR4.')
    })
    it('usa mensagem segura quando não existe resposta legível', () => {
        expect(userFacingApiMessage(undefined, fallback)).toBe(fallback)
        expect(userFacingApiMessage('', fallback)).toBe(fallback)
    })
})
