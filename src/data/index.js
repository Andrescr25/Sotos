import { createMemoryMenuRepository } from './memory/createMemoryMenuRepository';
import { createMemoryOrderRepository } from './memory/createMemoryOrderRepository';
import { createRemoteOrderRepository } from './remote/createRemoteOrderRepository';

/**
 * Punto único donde se elige qué implementación de datos usa la app.
 *
 * - Con EXPO_PUBLIC_API_URL definida (archivo .env): servidor real (Render).
 * - Sin ella: memoria, para desarrollar sin servidor (un solo dispositivo).
 *
 * Expo solo reemplaza `process.env.EXPO_PUBLIC_*` con acceso estático.
 * Estas variables quedan visibles dentro de la app: no son secretos.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const apiKey = process.env.EXPO_PUBLIC_API_KEY;

export const orderRepository = apiUrl
  ? createRemoteOrderRepository({ baseUrl: apiUrl, apiKey })
  : createMemoryOrderRepository();

// El menú sigue siendo de ejemplo (memoria). Se servirá desde el backend
// cuando exista la administración de productos.
export const menuRepository = createMemoryMenuRepository();
