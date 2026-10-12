import { emptyMenu, normalizeMenu } from '@/domain/menu';
import { MENU_SCHEMA } from './schema';

const DOCUMENT_ID = 'main';

/**
 * Almacén del menú sobre Postgres: un único documento JSONB.
 * Usa la misma forma de `db` que los demás almacenes.
 *
 * @param {Object} db  { query(text, params), transaction(fn), close() }
 * @returns {import('./contracts').MenuStore}
 */
export function createPostgresMenuStore(db) {
  return {
    async init() {
      for (const statement of MENU_SCHEMA) {
        await db.query(statement);
      }
    },

    async getMenu() {
      const { rows } = await db.query('SELECT data FROM menu_documents WHERE id = $1', [DOCUMENT_ID]);
      return normalizeMenu(rows[0]?.data);
    },

    async updateMenu(apply) {
      return db.transaction(async (tx) => {
        // Garantiza que la fila exista y la bloquea: dos administradores que
        // editen a la vez se aplican uno tras otro, sin pisarse.
        await tx.query(
          'INSERT INTO menu_documents (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING',
          [DOCUMENT_ID, JSON.stringify(emptyMenu())],
        );
        const { rows } = await tx.query(
          'SELECT data FROM menu_documents WHERE id = $1 FOR UPDATE',
          [DOCUMENT_ID],
        );

        const current = normalizeMenu(rows[0].data);
        const next = normalizeMenu(apply(current));

        await tx.query(
          'UPDATE menu_documents SET data = $2::jsonb, updated_at = now() WHERE id = $1',
          [DOCUMENT_ID, JSON.stringify(next)],
        );
        return next;
      });
    },

    async close() {
      await db.close?.();
    },
  };
}
