import { formatColones } from './money';
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
