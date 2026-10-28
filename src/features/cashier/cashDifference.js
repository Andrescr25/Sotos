import { formatColones } from '@/shared/utils/money';

/**
 * Cómo se muestra la diferencia del efectivo contado contra el esperado.
 * Positivo sobra, negativo falta, cero cuadra.
 *
 * @param {number} difference
 * @returns {{ label: string, caption: string, color: 'success' | 'warning' | 'danger', kind: 'exact' | 'over' | 'short' }}
 */
export function describeDifference(difference) {
  if (difference === 0) {
    return { kind: 'exact', color: 'success', caption: 'Diferencia', label: 'Cuadra' };
  }
  if (difference > 0) {
    return { kind: 'over', color: 'warning', caption: 'Sobra en caja', label: formatColones(difference) };
  }
  return { kind: 'short', color: 'danger', caption: 'Falta en caja', label: formatColones(-difference) };
}
