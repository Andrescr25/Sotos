import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService as defaultAuthService } from '@/services';
import { deepEqual } from '@/shared/utils/deepEqual';

/**
 * Estado de sesión de la app.
 *
 *   loading      recuperando la sesión guardada en el dispositivo
 *   signedOut    sin sesión → login
 *   signedIn     con sesión; `user.role` puede ser null (acceso pendiente)
 *   unavailable  no se pudo contactar al servidor al arrancar (se puede reintentar)
 *
 * Mientras hay sesión se mantiene la suscripción en tiempo real: si el
 * administrador cambia el rol de esta cuenta, la pantalla cambia sola.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children, service = defaultAuthService }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  const restore = useCallback(async () => {
    setState({ status: 'loading', user: null, error: null });
    try {
      const user = await service.restore();
      setState(user ? { status: 'signedIn', user, error: null } : { status: 'signedOut', user: null, error: null });
    } catch (error) {
      setState({ status: 'unavailable', user: null, error });
    }
  }, [service]);

  useEffect(() => {
    restore();
  }, [restore]);

  const signedIn = state.status === 'signedIn';
  useEffect(() => {
    if (!signedIn) return undefined;

    return service.subscribe((event) => {
      if (event.type === 'session:expired') {
        setState({ status: 'signedOut', user: null, error: null });
      } else if (event.type === 'user:updated') {
        setState((previous) => {
          if (previous.status !== 'signedIn') return previous;
          if (!event.user.active) return { status: 'signedOut', user: null, error: null };
          return deepEqual(previous.user, event.user)
            ? previous
            : { status: 'signedIn', user: event.user, error: null };
        });
      }
    });
  }, [signedIn, service]);

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      restoreError: state.error,
      retry: restore,

      async login(input) {
        const user = await service.login(input);
        setState({ status: 'signedIn', user, error: null });
        return user;
      },

      /** Datos de la cuenta a la que pertenece un enlace de invitación. */
      getInvitation: (token) => service.getInvitation(token),

      /** El empleado crea su contraseña con el enlace y queda con la sesión abierta. */
      async acceptInvitation(token, password) {
        const user = await service.acceptInvitation(token, password);
        setState({ status: 'signedIn', user, error: null });
        return user;
      },

      async logout() {
        await service.logout();
        setState({ status: 'signedOut', user: null, error: null });
      },

      /** Vuelve a leer la cuenta (pantalla "pendiente de acceso"). */
      async refresh() {
        const user = await service.refresh();
        setState((previous) => (previous.status === 'signedIn' ? { status: 'signedIn', user, error: null } : previous));
        return user;
      },
    }),
    [state, restore, service],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
