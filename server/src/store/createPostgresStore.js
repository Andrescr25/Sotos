import { ORDER_ERROR } from '@/domain/orders';
import { ORDER_SCHEMA } from './schema';

const LIST_LIMIT = 1000;

/**
 * Almacén de pedidos sobre Postgres.
 *
 * Recibe `db` con la forma `{ query(text, params), transaction(fn), close() }`
 * (ver createPgDb). Así el mismo SQL se prueba contra Postgres real en memoria.
 *
 * @param {Object} db
 * @returns {import('./contracts').OrderStore}
 */
export function createPostgresStore(db) {
  return {
    async init() {
      for (const statement of ORDER_SCHEMA) {
        await db.query(statement);
      }
    },

    async getOrder(id) {
      const { rows } = await db.query('SELECT data FROM orders WHERE id = $1', [id]);
      return rows[0]?.data ?? null;
    },

    async listOrders({ statuses, createdById } = {}) {
      const { rows } = await db.query(
        `SELECT data FROM orders
          WHERE ($1::text[] IS NULL OR status = ANY($1::text[]))
            AND ($2::text IS NULL OR created_by_id = $2)
          ORDER BY created_at ASC, id ASC
          LIMIT ${LIST_LIMIT}`,
        [statuses ?? null, createdById ?? null],
      );
      return rows.map((row) => row.data);
    },

    async saveOrder(order, check, onCreated) {
      return db.transaction(async (tx) => {
        // Bloquea la fila: otra tablet que intente cambiar el mismo pedido
        // espera aquí y luego será evaluada contra el estado ya actualizado.
        const { rows } = await tx.query('SELECT data FROM orders WHERE id = $1 FOR UPDATE', [order.id]);
        const existing = rows[0]?.data ?? null;

        const verdict = check(existing);
        if (!verdict.ok) return verdict;

        const json = JSON.stringify(order);
        if (existing) {
          await tx.query(
            'UPDATE orders SET status = $2, updated_at = $3, data = $4::jsonb WHERE id = $1',
            [order.id, order.status, order.updatedAt, json],
          );
        } else {
          const inserted = await tx.query(
            `INSERT INTO orders (id, number, status, created_by_id, created_at, updated_at, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [order.id, order.number, order.status, order.createdBy.id, order.createdAt, order.updatedAt, json],
          );
          // Otro dispositivo insertó el mismo id justo antes (no había fila que bloquear).
          if (inserted.rows.length === 0) {
            return {
              ok: false,
              code: ORDER_ERROR.CONFLICT,
              message: 'El pedido ya fue creado desde otro dispositivo',
            };
          }
          // Mismo `COMMIT` que el pedido: si esto falla, el pedido tampoco se guarda.
          await onCreated?.(tx);
        }
        return { ok: true, order };
      });
    },

    async nextOrderNumber(day) {
      const { rows } = await db.query(
        `INSERT INTO order_counters (day, last_number) VALUES ($1::date, 1)
         ON CONFLICT (day) DO UPDATE SET last_number = order_counters.last_number + 1
         RETURNING last_number`,
        [day],
      );
      return rows[0].last_number;
    },

    async close() {
      await db.close?.();
    },
  };
}
