import { useRouter } from 'expo-router';
import { ComingSoon } from '@/shared/ui';

/** Toma de pedidos: Categorías → Productos → Extras → Resumen → Enviar a cocina. */
export default function CashierScreen() {
  const router = useRouter();
  return (
    <ComingSoon
      icon="receipt"
      title="Caja"
      description="Aquí se tomarán los pedidos y se enviarán a cocina."
      onBack={() => router.back()}
    />
  );
}
