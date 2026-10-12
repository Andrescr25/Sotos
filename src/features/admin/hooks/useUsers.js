import { useCallback, useEffect, useMemo, useState } from 'react';
import { userService as defaultUserService } from '@/services';

/** Cuentas que necesitan atención primero (sin rol), luego por nombre. */
function sortForAdmin(users) {
  const pendingFirst = (user) => (user.active && !user.role ? 0 : 1);
  return [...users].sort(
    (a, b) => pendingFirst(a) - pendingFirst(b) || a.name.localeCompare(b.name, 'es'),
  );
}

/**
 * Lista de cuentas para el administrador. Se recarga sola cuando alguien se
 * registra o cambia una cuenta (tiempo real).
 *
 * @param {{ service?: ReturnType<typeof import('@/services/userService').createUserService> }} [options]
 */
export function useUsers({ service = defaultUserService } = {}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setUsers(await service.list());
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    load();
    return service.subscribe(() => {
      load();
    });
  }, [load, service]);

  /** Ejecuta un cambio sobre una cuenta y recarga. Devuelve el error, si lo hubo. */
  const change = useCallback(
    async (id, action) => {
      setBusyId(id);
      try {
        await action();
        setError(null);
        return null;
      } catch (caught) {
        setError(caught);
        return caught;
      } finally {
        await load();
        setBusyId(null);
      }
    },
    [load],
  );

  const sorted = useMemo(() => sortForAdmin(users), [users]);
  const pendingCount = useMemo(
    () => users.filter((user) => user.active && !user.role).length,
    [users],
  );

  return {
    users: sorted,
    pendingCount,
    loading,
    error,
    busyId,
    reload: load,
    assignRole: (id, role) => change(id, () => service.assignRole(id, role)),
    setActive: (id, active) => change(id, () => service.setActive(id, active)),
  };
}
