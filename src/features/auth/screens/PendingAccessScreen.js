import { useState } from 'react';
import { getErrorMessage } from '@/shared/errors/messages';
import { Banner, Button, Text } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';

/**
 * Cuenta sin rol asignado. No hay nada que elegir aquí: el administrador
 * asigna el acceso y esta pantalla cambia sola (llega por tiempo real).
 */
export default function PendingAccessScreen() {
  const { user, refresh, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function check() {
    setBusy(true);
    setError(null);
    try {
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      icon="hourglass"
      title="Acceso pendiente"
      subtitle={`Hola ${user?.name ?? ''}. Tu cuenta está lista, pero un administrador todavía debe asignarte tu acceso.`}
    >
      {error ? <Banner tone="error" message={error} /> : null}
      <Banner tone="info" message="Esta pantalla se actualiza sola cuando te den acceso." />
      <Text color="textSecondary" variant="caption" style={{ textAlign: 'center' }}>
        Si ya te lo asignaron y no cambia, toca “Actualizar”.
      </Text>

      <Button label={busy ? 'Revisando…' : 'Actualizar'} icon="refresh" onPress={check} disabled={busy} />
      <Button label="Cerrar sesión" icon="log-out" variant="secondary" onPress={logout} />
    </AuthCard>
  );
}
