import { PGlite } from '@electric-sql/pglite';
import { CASH_SCHEMA, INVENTORY_SCHEMA, MENU_SCHEMA, ORDER_SCHEMA, USER_SCHEMA } from './schema';

const TABLES = [
  'orders',
  'order_counters',
  'users',
  'sessions',
  'invitations',
  'menu_documents',
  'cash_closings',
  'cash_closing_orders',
  'inventory_documents',
];

async function applySchema(db) {
  for (const statement of [...USER_SCHEMA, ...ORDER_SCHEMA, ...MENU_SCHEMA, ...CASH_SCHEMA, ...INVENTORY_SCHEMA]) {
    await db.query(statement);
  }
}

describe('esquema: tablas cerradas a la API pública de Supabase', () => {
  it('activa RLS en todas las tablas y se puede ejecutar varias veces', async () => {
    const db = new PGlite();
    await applySchema(db);
    await applySchema(db);

    const { rows } = await db.query(
      `SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY($1::text[])`,
      [TABLES],
    );
    expect(rows).toHaveLength(TABLES.length);
    rows.forEach((row) => expect(row.relrowsecurity).toBe(true));
    await db.close();
  });

  it('quita los permisos a los roles de la API de Supabase (anon, authenticated, service_role)', async () => {
    const db = new PGlite();
    // Supabase crea estos roles y, por defecto, les da permisos sobre las tablas nuevas.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await db.query(`CREATE ROLE ${role}`);
    }
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);

    await applySchema(db);

    for (const role of ['anon', 'authenticated', 'service_role']) {
      for (const table of TABLES) {
        const { rows } = await db.query(
          `SELECT has_table_privilege($1, $2, 'SELECT') AS can_select,
                  has_table_privilege($1, $2, 'INSERT') AS can_insert`,
          [role, table],
        );
        expect(rows[0]).toEqual({ can_select: false, can_insert: false });
      }
    }
    await db.close();
  });
});
