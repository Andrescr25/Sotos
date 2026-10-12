import { PERMISSIONS, can } from '@/domain/users/permissions';
import { deepEqual } from '@/shared/utils/deepEqual';
import { ORDER_ERROR } from './orderErrors';
import { ORDER_STATUS, getTransitionPermission } from './orderStatus';
import { calculateOrderTotals } from './pricing';

/**
 * Quién puede guardar este cambio. Se evalúa con el usuario de la SESIÓN, no
 * con el que venga escrito en el pedido:
 *
 * - El cambio debe estar firmado por ese mismo usuario (nadie actúa a nombre de otro).
 * - Su rol debe tener el permiso de la transición (crear/enviar, empezar, listo...).
 *
 * Se usa junto a `checkOrderWrite`, dentro de la misma operación atómica.
 *
 * @param {import('./order').Order | null} existing
 * @param {import('./order').Order} incoming
 * @param {import('@/domain/users/roles').User} user  usuario autenticado
 * @returns {WriteVerdict}
 */
export function checkOrderActor(existing, incoming, user) {
  const fail = (message) => ({ ok: false, code: ORDER_ERROR.FORBIDDEN, message });

  const lastChange = incoming.statusHistory[incoming.statusHistory.length - 1];
  if (!user || lastChange.by?.id !== user.id) {
    return fail('El cambio debe estar firmado por el usuario que inició sesión');
  }
  if (!existing && incoming.createdBy?.id !== user.id) {
    return fail('El pedido debe quedar a nombre de quien lo envía');
  }

  const permission = existing
    ? getTransitionPermission(existing.status, incoming.status)
    : PERMISSIONS.ORDER_SEND;
  if (!permission || !can(user.role, permission)) {
    return fail('Tu rol no tiene permiso para realizar esta acción');
  }
  return { ok: true };
}

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
 * La identidad y el rol de quien guarda se verifican aparte con
 * `checkOrderActor`, usando el usuario de la sesión.
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
