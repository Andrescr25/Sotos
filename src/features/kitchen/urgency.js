import { KITCHEN_CONFIG } from './config';

/**
 * Qué tan atrasado va un pedido según el tiempo desde que llegó a cocina.
 * @param {number | null} elapsedMs
 * @param {typeof KITCHEN_CONFIG} [config]
 * @returns {'ok' | 'warn' | 'urgent'}
 */
export function getUrgency(elapsedMs, config = KITCHEN_CONFIG) {
  if (elapsedMs === null || elapsedMs === undefined) return 'ok';
  if (elapsedMs >= config.urgentAfterMs) return 'urgent';
  if (elapsedMs >= config.warnAfterMs) return 'warn';
  return 'ok';
}
