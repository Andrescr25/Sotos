import { formatColones, parseColones } from './money';
import { formatClockTime, formatElapsed } from './time';

describe('formatColones', () => {
  it('usa punto como separador de miles', () => {
    expect(formatColones(0)).toBe('₡0');
    expect(formatColones(500)).toBe('₡500');
    expect(formatColones(11_000)).toBe('₡11.000');
    expect(formatColones(1_250_000)).toBe('₡1.250.000');
  });

  it('redondea y tolera valores inválidos', () => {
    expect(formatColones(1500.6)).toBe('₡1.501');
    expect(formatColones(undefined)).toBe('₡0');
  });
});

describe('formatClockTime', () => {
  it('muestra hora de 12 horas con AM/PM', () => {
    expect(formatClockTime(new Date(2026, 9, 12, 12, 35))).toBe('12:35 PM');
    expect(formatClockTime(new Date(2026, 9, 12, 0, 5))).toBe('12:05 AM');
    expect(formatClockTime(new Date(2026, 9, 12, 15, 9))).toBe('3:09 PM');
  });
});

describe('formatElapsed', () => {
  it('muestra mm:ss y h:mm:ss', () => {
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-10)).toBe('00:00');
  });
});

describe('parseColones', () => {
  it('lee montos escritos de varias formas', () => {
    expect(parseColones('3500')).toBe(3500);
    expect(parseColones('3.500')).toBe(3500);
    expect(parseColones('₡ 3 500')).toBe(3500);
    expect(parseColones('0')).toBe(0);
  });

  it('rechaza vacío, decimales y texto', () => {
    expect(parseColones('')).toBeNull();
    expect(parseColones('   ')).toBeNull();
    expect(parseColones('12,5')).toBeNull();
    expect(parseColones('abc')).toBeNull();
    expect(parseColones('-5')).toBeNull();
    expect(parseColones(undefined)).toBeNull();
  });

  it('es la inversa de formatColones', () => {
    expect(parseColones(formatColones(1250000))).toBe(1250000);
  });
});
