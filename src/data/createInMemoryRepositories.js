import { createMemoryAccountRepositories } from './memory/createMemoryAccountRepositories';
import { createMemoryCashClosingRepository } from './memory/createMemoryCashClosingRepository';
import { createMemoryInventoryRepository } from './memory/createMemoryInventoryRepository';
import { createMemoryMenuRepository } from './memory/createMemoryMenuRepository';
import { createMemoryOrderRepository } from './memory/createMemoryOrderRepository';

/**
 * Repositorios en memoria para desarrollar sin servidor: un solo dispositivo,
 * con las cuentas y el menú de ejemplo de data/seed.
 */
export function createInMemoryRepositories() {
  const accounts = createMemoryAccountRepositories();
  const inventoryRepository = createMemoryInventoryRepository({ getActor: accounts.getCurrentUser });
  const orderRepository = createMemoryOrderRepository({
    getActor: accounts.getCurrentUser,
    onOrderCreated: inventoryRepository.consumeOrder,
  });

  return {
    orderRepository,
    inventoryRepository,
    cashClosingRepository: createMemoryCashClosingRepository({
      orderRepository,
      getActor: accounts.getCurrentUser,
    }),
    menuRepository: createMemoryMenuRepository({ getActor: accounts.getCurrentUser }),
    authRepository: accounts.authRepository,
    userRepository: accounts.userRepository,
  };
}
