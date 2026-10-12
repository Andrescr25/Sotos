/**
 * Adapta un `pg.Pool` a la forma mínima que usa createPostgresStore.
 * @param {import('pg').Pool} pool
 */
export function createPgDb(pool) {
  return {
    query: (text, params) => pool.query(text, params),

    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (text, params) => client.query(text, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    close: () => pool.end(),
  };
}
