import { useRouter } from 'expo-router';
import { ComingSoon } from '@/shared/ui';

/** Administración: productos, usuarios, reportes y configuración (pendiente). */
export default function AdminScreen() {
  const router = useRouter();
  return (
    <ComingSoon
      icon="settings"
      title="Administración"
      description="Productos, usuarios, reportes y configuración llegarán en una etapa posterior."
      onBack={() => router.back()}
    />
  );
}
