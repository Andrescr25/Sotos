import { deepEqual } from '@/shared/utils/deepEqual';
import { ORDER_ERROR } from './orderErrors';
import { ORDER_STATUS, getTransitionPermission } from './orderStatus';
import { calculateOrderTotals } from './pricing';

/**
 * Reglas que todo almacenamiento (memoria, servidor...) debe hacer cumplir al
 * guardar un pedido. Así el servidor no confía ciegamente en lo que envía una
 * tablet y dos dispositivos no se pisan entre sí.
 *
 * - Un pedido llega al almacenamiento ya enviado a cocina (estado "new").
 * - Después solo puede avanzar por transiciones válidas, de una en una.
 * - Las líneas, el número y quién lo tomó no cambian una vez guardado.
 * - `existing` es lo que hay guardado (o null) leído dentro de la misma
 *   transacción que la escritura: así se detectan escrituras concurrentes.
 *
 * Nota: el historial lleva a quién hizo cada cambio, pero todavía no se
 * verifica su rol en el servidor (falta autenticación real).
 *
 * @typedef {{ ok: true } | { ok: false, code: string, message: string }} WriteVerdict
 *
 * @param {import('./order').Order | null} existing
 * @param {import('./order').Order} incoming
 * @returns {WriteVerdict}
 */
export function checkOrderWrite(existing, incoming) {
  const fail = (code, message) => ({ ok: false, code, message });

  if (
    !incoming ||
    typeof incoming.id !== 'string' ||
    !Array.isArray(incoming.items) ||
    !Array.isArray(incoming.statusHistory) ||
    incoming.statusHistory.length === 0
  ) {
    return fail(ORDER_ERROR.INVALID_ORDER, 'El pedido no tiene la forma esperada');
  }

  const lastChange = incoming.statusHistory[incoming.statusHistory.length - 1];
  if (lastChange.status !== incoming.status) {
    return fail(ORDER_ERROR.INVALID_ORDER, 'El historial no coincide con el estado del pedido');
  }

  const totals = calculateOrderTotals(incoming.items);
  if (
    incoming.totals?.subtotal !== totals.subtotal ||
    incoming.totals?.total !== totals.total ||
    incoming.totals?.itemCount !== totals.itemCount
  ) {
    return fail(ORDER_ERROR.INVALID_ORDER, 'Los totales no coinciden con las líneas del pedido');
  }

  if (!existing) {
    if (incoming.status !== ORDER_STATUS.NEW) {
      return fail(
        ORDER_ERROR.INVALID_TRANSITION,
        'Un pedido nuevo debe guardarse en estado "new" (enviado a cocina)',
      );
    }
    if (!Number.isInteger(incoming.number) || incoming.number < 1) {
      return fail(ORDER_ERROR.INVALID_NUMBER, 'El número de pedido no es válido');
    }
    if (incoming.items.length === 0) {
      return fail(ORDER_ERROR.EMPTY_ORDER, 'El pedido no tiene productos');
    }
    return { ok: true };
  }

  if (!getTransitionPermission(existing.status, incoming.status)) {
    return fail(
      ORDER_ERROR.INVALID_TRANSITION,
      `El pedido ya está en "${existing.status}"; no puede pasar a "${incoming.status}"`,
    );
  }

  // Debe ser exactamente el historial guardado + un cambio nuevo. Si otro
  // dispositivo cambió el pedido mientras tanto, esto no se cumple.
  const extendsHistory =
    incoming.statusHistory.length === existing.statusHistory.length + 1 &&
    existing.statusHistory.every(
      (change, index) =>
        incoming.statusHistory[index].status === change.status &&
        incoming.statusHistory[index].at === change.at,
    );
  if (!extendsHistory) {
    return fail(
      ORDER_ERROR.CONFLICT,
      'El pedido cambió en otro dispositivo; vuelve a cargarlo e intenta de nuevo',
    );
  }

  const unchanged =
    incoming.number === existing.number &&
    incoming.type === existing.type &&
    incoming.tableId === existing.tableId &&
    incoming.note === existing.note &&
    incoming.createdAt === existing.createdAt &&
    incoming.createdBy?.id === existing.createdBy.id &&
    deepEqual(incoming.items, existing.items);
  if (!unchanged) {
    return fail(
      ORDER_ERROR.INVALID_ORDER,
      'Un pedido enviado a cocina no puede cambiar sus productos ni su número',
    );
  }

  return { ok: true };
}
