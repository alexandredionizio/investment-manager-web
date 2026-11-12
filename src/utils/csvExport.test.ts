import { describe, expect, it } from 'vitest'
import { createCsv } from './csvExport'

describe('IM-034: exportação CSV segura', () => {
    it('usa UTF-8 BOM, separador compatível com Excel pt-BR e preserva campos com aspas', () => {
        const csv = createCsv(['Ativo', 'Corretora', 'Valor'], [['ITUB4', 'XP; "Teste"', '1.234,56']])
        expect(csv).toBe('\uFEFF"Ativo";"Corretora";"Valor"\r\n"ITUB4";"XP; ""Teste""";"1.234,56"\r\n')
    })
    it('neutraliza fórmulas nos campos importados e não cria registros', () => {
        const csv = createCsv(['Ativo', 'Corretora'], [['=SOMA(1;1)', '+CMD'], ['@malicioso', '-99']])
        expect(csv).toContain("\"'=SOMA(1;1)\"")
        expect(csv).toContain("\"'+CMD\"")
        expect(csv).toContain("\"'@malicioso\"")
        expect(csv).toContain("\"'-99\"")
    })
    it('produz somente cabeçalho quando não há linhas', () => {
        expect(createCsv(['Ativo'], [])).toBe('\uFEFF"Ativo"\r\n')
    })
})
