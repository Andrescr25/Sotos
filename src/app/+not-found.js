import { useRouter } from 'expo-router';
import { Button } from '@/shared/ui';
import { AuthCard } from '@/features/auth/components/AuthCard';

/** Dirección que no existe (por ejemplo, un enlace viejo). */
export default function NotFound() {
  const router = useRouter();

  return (
    <AuthCard
      icon="alert-circle"
      title="Página no encontrada"
      subtitle="La dirección no existe o ya no está disponible."
    >
      <Button label="Ir al inicio" icon="home" onPress={() => router.replace('/')} />
    </AuthCard>
  );
}
