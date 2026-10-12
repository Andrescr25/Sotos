import { Platform } from 'react-native';

const KEY = 'sotos.session';

/**
 * Almacenamiento persistente del token de sesión.
 * - iOS/Android: llavero del sistema (expo-secure-store), cifrado.
 * - Web: localStorage (solo para desarrollo en el navegador).
 */
export function createTokenStorage() {
  if (Platform.OS === 'web') {
    return {
      async get() {
        try {
          return globalThis.localStorage?.getItem(KEY) ?? null;
        } catch {
          return null;
        }
      },
      async set(token) {
        try {
          globalThis.localStorage?.setItem(KEY, token);
        } catch {
          // navegación privada o almacenamiento bloqueado
        }
      },
      async remove() {
        try {
          globalThis.localStorage?.removeItem(KEY);
        } catch {
          // ídem
        }
      },
    };
  }

  // Se carga solo en dispositivos: el módulo no existe en web.
  const SecureStore = require('expo-secure-store');
  return {
    get: () => SecureStore.getItemAsync(KEY),
    set: (token) => SecureStore.setItemAsync(KEY, token),
    remove: () => SecureStore.deleteItemAsync(KEY),
  };
}
