import { createHttpClient } from './remote/createHttpClient';
import { createRealtimeClient } from './remote/createRealtimeClient';
import { createRemoteAccountRepositories } from './remote/createRemoteAccountRepositories';
import { createRemoteMenuRepository } from './remote/createRemoteMenuRepository';
import { createRemoteOrderRepository } from './remote/createRemoteOrderRepository';
import { createSessionStore } from './session/createSessionStore';
import { createTokenStorage } from './session/createTokenStorage';

/**
 * Repositorios que hablan con el servidor (Render).
 * @param {string} apiUrl
 */
export function createRemoteRepositories(apiUrl) {
  const session = createSessionStore({ storage: createTokenStorage() });
  const http = createHttpClient({ baseUrl: apiUrl, session });
  const realtime = createRealtimeClient({ baseUrl: apiUrl, session });
  const accounts = createRemoteAccountRepositories({ http, realtime, session });

  return {
    orderRepository: createRemoteOrderRepository({ http, realtime }),
    menuRepository: createRemoteMenuRepository({ http, realtime }),
    authRepository: accounts.authRepository,
    userRepository: accounts.userRepository,
  };
}
