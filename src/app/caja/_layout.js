import { Stack } from 'expo-router';

/** Cada zona de trabajo tiene su propia pila de pantallas, sin encabezado nativo. */
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
