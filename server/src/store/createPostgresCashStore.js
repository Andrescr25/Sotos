import { CASH_SCHEMA } from './schema';

/** Llave del bloqueo que serializa los cierres de caja (un solo cierre a la vez). */
const CLOSING_LOCK_KEY = 7_204_001;

/** Pedidos con cobro que ningún cierre ha cubierto todavía, del más antiguo al más nuevo. */
const PENDING_ORDERS_SQL = `
  SELECT o.data FROM orders o
   WHERE jsonb_typeof(o.data -> 'payment') = 'object'
     AND NOT EXISTS (SELECT 1 FROM cash_closing_orders c WHERE c.order_id = o.id)
   ORDER BY o.created_at ASC, o.id ASC`;

const LATEST_CLOSING_SQL = 'SELECT data FROM cash_closings ORDER BY number DESC LIMIT 1';

/**
 * Almacén de cierres de caja sobre Postgres. Lee los pedidos de la tabla
 * `orders` (el almacén de pedidos debe haberse inicializado antes).
 *
 * @param {Object} db  { query(text, params), transaction(fn), close() }
 * @returns {import('./contracts').CashStore}
 */
export function createPostgresCashStore(db) {
  return {
    async init() {
      for (const statement of CASH_SCHEMA) {
        await db.query(statement);
      }
    },

    async getPending() {
      const { rows: orders } = await db.query(PENDING_ORDERS_SQL);
      const { rows: latest } = await db.query(LATEST_CLOSING_SQL);
      return { orders: orders.map((row) => row.data), previous: latest[0]?.data ?? null };
    },

    async createClosing(id, build) {
      return db.transaction(async (tx) => {
        // Un cierre a la vez: el segundo espera aquí y ya no encuentra los
        // pedidos que el primero cubrió. (La clave primaria de
        // cash_closing_orders es la red de seguridad si esto fallara.)
        await tx.query('SELECT pg_advisory_xact_lock($1::bigint)', [CLOSING_LOCK_KEY]);

        // Reintento seguro: si el cierre ya se guardó pero la respuesta se
        // perdió, se devuelve el mismo cierre en lugar de duplicarlo.
        const existing = await tx.query('SELECT data FROM cash_closings WHERE id = $1', [id]);
        if (existing.rows[0]) return existing.rows[0].data;

        const { rows: orders } = await tx.query(PENDING_ORDERS_SQL);
        const { rows: latest } = await tx.query(LATEST_CLOSING_SQL);
        const pending = orders.map((row) => row.data);

        // Si las reglas lo rechazan, lanza y la transacción se revierte entera.
        const closing = build({ orders: pending, previous: latest[0]?.data ?? null });

        await tx.query(
          'INSERT INTO cash_closings (id, number, closed_at, data) VALUES ($1, $2, $3, $4::jsonb)',
          [closing.id, closing.number, closing.closedAt, JSON.stringify(closing)],
        );
        await tx.query(
          `INSERT INTO cash_closing_orders (order_id, closing_id)
           SELECT unnest($1::text[]), $2`,
          [pending.map((order) => order.id), closing.id],
        );
        return closing;
      });
    },

    async listClosings({ limit = 30 } = {}) {
      const { rows } = await db.query('SELECT data FROM cash_closings ORDER BY number DESC LIMIT $1', [limit]);
      return rows.map((row) => row.data);
    },

    async close() {
      await db.close?.();
    },
  };
}
