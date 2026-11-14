/**
 * Testes para o categorizador de itens
 */

import { normalizeItemName } from '../categorizer';

describe('normalizeItemName', () => {
  it('deve converter para minúsculas', () => {
    expect(normalizeItemName('ARROZ')).toBe('arroz');
    expect(normalizeItemName('Leite')).toBe('leite');
  });

  it('deve remover acentos', () => {
    expect(normalizeItemName('açúcar')).toBe('acucar');
    expect(normalizeItemName('maçã')).toBe('maca');
    expect(normalizeItemName('pão')).toBe('pao');
    expect(normalizeItemName('feijão')).toBe('feijao');
  });

  it('deve remover espaços extras', () => {
    expect(normalizeItemName('  arroz  ')).toBe('arroz');
    expect(normalizeItemName('arroz integral')).toBe('arroz integral');
  });

  it('deve lidar com texto vazio', () => {
    expect(normalizeItemName('')).toBe('');
    expect(normalizeItemName('   ')).toBe('');
  });

  it('deve processar nomes compostos corretamente', () => {
    expect(normalizeItemName('Papel Higiênico')).toBe('papel higienico');
    expect(normalizeItemName('Água Sanitária')).toBe('agua sanitaria');
  });
});

// TODO: Adicionar testes para categorizeItem quando mock do DB estiver disponível
// describe('categorizeItem', () => {
//   it('deve categorizar arroz como alimentos', async () => {
//     // Mock do DB
//     const result = await categorizeItem('arroz', 'user-id', mockDb);
//     expect(result.categorySlug).toBe('alimentos');
//     expect(result.source).toBe('dictionary');
//   });
// });
