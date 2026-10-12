import { createMemoryAccountRepositories } from './memory/createMemoryAccountRepositories';
import { createMemoryMenuRepository } from './memory/createMemoryMenuRepository';
import { createMemoryOrderRepository } from './memory/createMemoryOrderRepository';

/**
 * Repositorios en memoria para desarrollar sin servidor: un solo dispositivo,
 * con las cuentas y el menú de ejemplo de data/seed.
 */
export function createInMemoryRepositories() {
  const accounts = createMemoryAccountRepositories();

  return {
    orderRepository: createMemoryOrderRepository({ getActor: accounts.getCurrentUser }),
    menuRepository: createMemoryMenuRepository({ getActor: accounts.getCurrentUser }),
    authRepository: accounts.authRepository,
    userRepository: accounts.userRepository,
  };
}
