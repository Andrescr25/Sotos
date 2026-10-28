import { parseWholeNumber } from './numbers';

describe('parseWholeNumber', () => {
  it('lee enteros, con espacios alrededor', () => {
    expect(parseWholeNumber('8')).toBe(8);
    expect(parseWholeNumber('  12 ')).toBe(12);
    expect(parseWholeNumber('0')).toBe(0);
    expect(parseWholeNumber('007')).toBe(7);
  });

  it('rechaza lo que no es un entero: vacío, decimales, signos, letras y separadores', () => {
    for (const text of ['', '   ', '1.5', '1,5', '-3', '+3', 'ocho', '8 porciones', '1.000', null, undefined, '1234567890']) {
      expect(parseWholeNumber(text)).toBeNull();
    }
  });
});
