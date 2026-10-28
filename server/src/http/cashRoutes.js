import { buildCashPending, createCashClosing } from '@/domain/cashClosing';
import { PERMISSIONS } from '@/domain/users';
import { HttpError, readJson } from './httpUtils';
import { requirePermission } from './permissions';

const DEFAULT_LIST_LIMIT = 30;
const MAX_LIST_LIMIT = 100;

/**
 * Cierre de caja. Todo lo calcula el servidor con los pedidos que tiene
 * guardados: de la tablet solo se aceptan lo contado, el fondo inicial y una
 * observación. Cada cierre se aplica de forma atómica y de uno en uno.
 *
 * @param {Object} deps
 * @param {import('../store/contracts').CashStore} deps.cashStore
 * @param {() => Date} deps.now
 */
export function createCashRoutes({ cashStore, now }) {
  return [
    {
      method: 'GET',
      pattern: /^\/cash-closings\/pending$/,
      async handler({ user }) {
        requirePermission(user, PERMISSIONS.CASH_CLOSE);
        const { orders, previous } = await cashStore.getPending();
        return { status: 200, body: { pending: buildCashPending({ orders, previous }) } };
      },
    },

    {
      method: 'GET',
      pattern: /^\/cash-closings$/,
      async handler({ url, user }) {
        requirePermission(user, PERMISSIONS.CASH_CLOSE);
        const requested = Number(url.searchParams.get('limit'));
        const limit = Number.isInteger(requested) && requested > 0
          ? Math.min(requested, MAX_LIST_LIMIT)
          : DEFAULT_LIST_LIMIT;
        return { status: 200, body: { closings: await cashStore.listClosings({ limit }) } };
      },
    },

    {
      method: 'POST',
      pattern: /^\/cash-closings$/,
      async handler({ req, user }) {
        requirePermission(user, PERMISSIONS.CASH_CLOSE);
        const body = await readJson(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new HttpError(400, 'bad_json', 'El cuerpo debe ser un objeto');
        }

        const closing = await cashStore.createClosing(body.id, ({ orders, previous }) =>
          createCashClosing({
            id: body.id,
            orders,
            previous,
            openingFloat: body.openingFloat,
            countedCash: body.countedCash,
            note: body.note ?? '',
            user,
            now: now(),
          }),
        );
        return { status: 200, body: { closing } };
      },
    },
  ];
}
