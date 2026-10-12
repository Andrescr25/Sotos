import { Redirect } from 'expo-router';
import { AREA_ROUTES } from '@/config/routes';
import { getHomeArea } from '@/domain/users';
import { useAuth } from '@/features/auth';

/**
 * Punto de entrada: lleva a cada persona a donde corresponde según su cuenta.
 * No hay selector de rol: el acceso lo asigna el administrador.
 */
export default function Index() {
  const { status, user } = useAuth();

  if (status !== 'signedIn') return <Redirect href="/login" />;

  const area = getHomeArea(user);
  return <Redirect href={area ? AREA_ROUTES[area] : '/pendiente'} />;
}
