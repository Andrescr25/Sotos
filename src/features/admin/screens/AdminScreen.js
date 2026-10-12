import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SessionBar } from '@/features/auth';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Banner, Button, Screen, Text } from '@/shared/ui';
import { useUsers } from '../hooks/useUsers';

/**
 * Inicio del administrador: gestión de accesos y atajos a las demás zonas
 * (el administrador tiene acceso total). Productos, reportes y configuración
 * llegarán en etapas posteriores.
 */
export default function AdminScreen() {
  const router = useRouter();
  const { pendingCount } = useUsers();

  return (
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <Text variant="headline">Administración</Text>
        <SessionBar />
      </View>

      {pendingCount > 0 ? (
        <Banner
          tone="warning"
          message={`${pendingCount} ${pendingCount === 1 ? 'cuenta espera' : 'cuentas esperan'} que le asignes un acceso.`}
        />
      ) : null}

      <View style={styles.actions}>
        <Button
          icon="people"
          label={pendingCount > 0 ? `Usuarios y accesos (${pendingCount} pendientes)` : 'Usuarios y accesos'}
          onPress={() => router.push('/admin/usuarios')}
        />
        <Button icon="receipt" variant="secondary" label="Abrir Caja" onPress={() => router.push('/caja')} />
        <Button icon="flame" variant="secondary" label="Abrir Cocina" onPress={() => router.push('/cocina')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.xl, gap: theme.spacing.lg },
  actions: { marginTop: theme.spacing.xl, gap: theme.spacing.md, maxWidth: 520 },
});
