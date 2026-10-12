import { useRouter } from 'expo-router';
import { ComingSoon } from '@/shared/ui';

/** Pantalla de cocina: tarjetas de pedidos con estado y tiempo transcurrido. */
export default function KitchenScreen() {
  const router = useRouter();
  return (
    <ComingSoon
      icon="flame"
      title="Cocina"
      description="Aquí llegarán los pedidos nuevos para prepararlos."
      onBack={() => router.back()}
    />
  );
}
