import { describeDifference } from './cashDifference';

describe('diferencia del cierre de caja', () => {
  it('cero cuadra', () => {
    expect(describeDifference(0)).toMatchObject({ kind: 'exact', color: 'success', label: 'Cuadra' });
  });

  it('positivo sobra y se muestra sin signo', () => {
    expect(describeDifference(1_500)).toMatchObject({ kind: 'over', color: 'warning', label: '₡1.500', caption: 'Sobra en caja' });
  });

  it('negativo falta y se muestra sin signo', () => {
    expect(describeDifference(-2_000)).toMatchObject({ kind: 'short', color: 'danger', label: '₡2.000', caption: 'Falta en caja' });
  });
});
