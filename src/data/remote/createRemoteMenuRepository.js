/**
 * Repositorio del menú que habla con el servidor. Cumple `MenuRepository`.
 *
 * @param {Object} deps
 * @param {ReturnType<import('./createHttpClient').createHttpClient>} deps.http
 * @param {ReturnType<import('./createRealtimeClient').createRealtimeClient>} deps.realtime
 * @returns {import('@/data/contracts').MenuRepository}
 */
export function createRemoteMenuRepository({ http, realtime }) {
  const segment = (value) => encodeURIComponent(value);

  return {
    async getMenu() {
      return (await http.get('/menu')).menu;
    },

    async create(collection, input) {
      const { menu, id } = await http.post(`/menu/${collection}`, input);
      return { menu, id };
    },

    async update(collection, id, patch) {
      return (await http.patch(`/menu/${collection}/${segment(id)}`, patch)).menu;
    },

    async remove(collection, id) {
      return (await http.delete(`/menu/${collection}/${segment(id)}`)).menu;
    },

    async move(collection, id, direction) {
      return (await http.post(`/menu/${collection}/${segment(id)}/move`, { direction })).menu;
    },

    async addQuickNote(text) {
      return (await http.post('/menu/quick-notes', { text })).menu;
    },

    async removeQuickNote(text) {
      return (await http.delete(`/menu/quick-notes?text=${segment(text)}`)).menu;
    },

    async loadSample() {
      return (await http.post('/menu/sample')).menu;
    },

    subscribe(listener) {
      return realtime.subscribe((event) => {
        if (event.type === 'menu:changed' || event.type === 'connection') listener(event);
      });
    },
  };
}
