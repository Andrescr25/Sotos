import { createMemoryMenuRepository } from './memory/createMemoryMenuRepository';

/**
 * Punto único donde se elige qué implementación de datos usa la app.
 *
 * - Con EXPO_PUBLIC_API_URL definida (.env.local o el build en Render):
 *   servidor real.
 * - Sin ella: memoria, para desarrollar sin servidor (un solo dispositivo,
 *   con las cuentas de ejemplo de data/seed/users).
 *
 * IMPORTANTE: la variable se lee con acceso estático y los `require` van
 * dentro de cada rama. Así, al compilar con servidor, Expo reemplaza la
 * variable por su valor y descarta la rama en memoria: las cuentas de ejemplo
 * (con contraseñas de prueba) no viajan en la app publicada.
 */
let repositories;
if (process.env.EXPO_PUBLIC_API_URL) {
  const { createRemoteRepositories } = require('./createRemoteRepositories');
  repositories = createRemoteRepositories(process.env.EXPO_PUBLIC_API_URL);
} else {
  const { createInMemoryRepositories } = require('./createInMemoryRepositories');
  repositories = createInMemoryRepositories();
}

export const { orderRepository, authRepository, userRepository } = repositories;

// El menú sigue siendo de ejemplo (memoria). Se servirá desde el backend
// cuando exista la administración de productos.
export const menuRepository = createMemoryMenuRepository();
