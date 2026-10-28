/**
 * Cierres de caja que habla con el servidor. Cumple `CashClosingRepository`.
 * El servidor calcula todo con sus pedidos; aquí solo viajan lo contado, el
 * fondo inicial y la observación.
 *
 * @param {Object} deps
 * @param {ReturnType<import('./createHttpClient').createHttpClient>} deps.http
 * @returns {import('@/data/contracts').CashClosingRepository}
 */
export function createRemoteCashClosingRepository({ http }) {
  return {
    async getPending() {
      return (await http.get('/cash-closings/pending')).pending;
    },

    async close(input) {
      return (await http.post('/cash-closings', input)).closing;
    },

    async list({ limit } = {}) {
      const query = limit ? `?limit=${encodeURIComponent(limit)}` : '';
      return (await http.get(`/cash-closings${query}`)).closings;
    },
  };
}
