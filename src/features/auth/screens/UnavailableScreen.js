import { getErrorMessage } from '@/shared/errors/messages';
import { Banner, Button } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';

/** No se pudo contactar al servidor al abrir la app (sin conexión o servidor caído). */
export default function UnavailableScreen() {
  const { restoreError, retry } = useAuth();

  return (
    <AuthCard icon="cloud-offline" title="Sin conexión" subtitle="No se pudo contactar con el servidor.">
      <Banner tone="warning" message={getErrorMessage(restoreError)} />
      <Button label="Reintentar" icon="refresh" onPress={retry} />
    </AuthCard>
  );
}
