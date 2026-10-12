import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AREAS, canAccessArea, hasAccess } from '@/domain/users';
import { AuthProvider, useAuth } from '@/features/auth';
import UnavailableScreen from '@/features/auth/screens/UnavailableScreen';
import { theme } from '@/shared/theme';
import { Spinner } from '@/shared/ui';

/**
 * Qué pantallas existen para cada estado de sesión. El usuario no elige su
 * rol: lo que ve depende del acceso que le asignó el administrador.
 *
 *   sin sesión        → login, registro
 *   sin rol asignado  → pendiente
 *   con rol           → solo las zonas que su rol permite
 */
function AppStack() {
  const { status, user } = useAuth();

  if (status === 'loading') return <Spinner message="Cargando…" />;
  if (status === 'unavailable') return <UnavailableScreen />;

  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !hasAccess(user)}>
        <Stack.Screen name="pendiente" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessArea(user, AREAS.CASHIER)}>
        <Stack.Screen name="caja" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessArea(user, AREAS.KITCHEN)}>
        <Stack.Screen name="cocina" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessArea(user, AREAS.ADMIN)}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppStack />
    </AuthProvider>
  );
}
