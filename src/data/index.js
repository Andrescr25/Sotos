import { apiUrl, isRemote } from '@/config/runtime';
import { createMemoryAccountRepositories } from './memory/createMemoryAccountRepositories';
import { createMemoryMenuRepository } from './memory/createMemoryMenuRepository';
import { createMemoryOrderRepository } from './memory/createMemoryOrderRepository';
import { createHttpClient } from './remote/createHttpClient';
import { createRealtimeClient } from './remote/createRealtimeClient';
import { createRemoteAccountRepositories } from './remote/createRemoteAccountRepositories';
import { createRemoteOrderRepository } from './remote/createRemoteOrderRepository';
import { createSessionStore } from './session/createSessionStore';
import { createTokenStorage } from './session/createTokenStorage';

/**
 * Punto único donde se elige qué implementación de datos usa la app.
 *
 * - Con EXPO_PUBLIC_API_URL definida (archivo .env.local): servidor real (Render).
 * - Sin ella: memoria, para desarrollar sin servidor (un solo dispositivo,
 *   con las cuentas de ejemplo de data/seed/users).
 */

function createRemote() {
  const session = createSessionStore({ storage: createTokenStorage() });
  const http = createHttpClient({ baseUrl: apiUrl, session });
  const realtime = createRealtimeClient({ baseUrl: apiUrl, session });
  const accounts = createRemoteAccountRepositories({ http, realtime, session });
  return {
    orderRepository: createRemoteOrderRepository({ http, realtime }),
    ...accounts,
  };
}

function createInMemory() {
  const accounts = createMemoryAccountRepositories();
  return {
    orderRepository: createMemoryOrderRepository({ getActor: accounts.getCurrentUser }),
    authRepository: accounts.authRepository,
    userRepository: accounts.userRepository,
  };
}

const repositories = isRemote ? createRemote() : createInMemory();

export const { orderRepository, authRepository, userRepository } = repositories;

// El menú sigue siendo de ejemplo (memoria). Se servirá desde el backend
// cuando exista la administración de productos.
export const menuRepository = createMemoryMenuRepository();
