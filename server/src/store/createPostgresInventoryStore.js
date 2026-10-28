import { consumeOrder, emptyInventory, normalizeInventory } from '@/domain/inventory';
import { INVENTORY_SCHEMA } from './schema';

const DOCUMENT_ID = 'main';

const SELECT_FOR_UPDATE = 'SELECT data FROM inventory_documents WHERE id = $1 FOR UPDATE';
const WRITE = 'UPDATE inventory_documents SET data = $2::jsonb, updated_at = now() WHERE id = $1';

/**
 * Almacén del inventario sobre Postgres: un único documento JSONB.
 * Usa la misma forma de `db` que los demás almacenes.
 *
 * @param {Object} db  { query(text, params), transaction(fn), close() }
 * @returns {import('./contracts').InventoryStore}
 */
export function createPostgresInventoryStore(db) {
  return {
    async init() {
      for (const statement of INVENTORY_SCHEMA) {
        await db.query(statement);
      }
    },

    async getInventory() {
      const { rows } = await db.query('SELECT data FROM inventory_documents WHERE id = $1', [DOCUMENT_ID]);
      return normalizeInventory(rows[0]?.data);
    },

    async updateInventory(apply) {
      return db.transaction(async (tx) => {
        // Garantiza que la fila exista y la bloquea: dos cambios a la vez (o un
        // cambio y una venta) se aplican uno tras otro, sin pisarse.
        await tx.query(
          'INSERT INTO inventory_documents (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING',
          [DOCUMENT_ID, JSON.stringify(emptyInventory())],
        );
        const { rows } = await tx.query(SELECT_FOR_UPDATE, [DOCUMENT_ID]);

        const next = normalizeInventory(apply(normalizeInventory(rows[0].data)));
        await tx.query(WRITE, [DOCUMENT_ID, JSON.stringify(next)]);
        return next;
      });
    },

    async consumeForOrder(order, tx) {
      const run = async (conn) => {
        // Sin inventario configurado no hay nada que descontar.
        const { rows } = await conn.query(SELECT_FOR_UPDATE, [DOCUMENT_ID]);
        if (rows.length === 0) return false;

        const current = normalizeInventory(rows[0].data);
        const next = consumeOrder(current, order);
        if (next === current) return false; // el pedido no gasta nada

        await conn.query(WRITE, [DOCUMENT_ID, JSON.stringify(next)]);
        return true;
      };
      // Con `tx` va en la transacción del pedido; sin ella, en una propia.
      return tx ? run(tx) : db.transaction(run);
    },

    async close() {
      await db.close?.();
    },
  };
}
