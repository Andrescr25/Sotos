import { createMemoryAccountRepositories } from './memory/createMemoryAccountRepositories';
import { createMemoryOrderRepository } from './memory/createMemoryOrderRepository';

/**
 * Repositorios en memoria para desarrollar sin servidor: un solo dispositivo y
 * las cuentas de ejemplo de data/seed/users.
 */
export function createInMemoryRepositories() {
  const accounts = createMemoryAccountRepositories();

  return {
    orderRepository: createMemoryOrderRepository({ getActor: accounts.getCurrentUser }),
    authRepository: accounts.authRepository,
    userRepository: accounts.userRepository,
  };
}
