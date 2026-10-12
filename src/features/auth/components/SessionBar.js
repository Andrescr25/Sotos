import { StyleSheet, View } from 'react-native';
import { ROLE_LABELS } from '@/domain/users';
import { theme } from '@/shared/theme';
import { Button, Icon, Text } from '@/shared/ui';
import { useAuth } from '../AuthProvider';

/** Quién tiene la sesión abierta y el botón para salir. Va en el encabezado de cada zona. */
export function SessionBar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <View style={styles.bar}>
      <Icon name="person-circle" size="lg" color="textSecondary" />
      <View style={styles.identity}>
        <Text variant="label">{user.name}</Text>
        <Text variant="caption" color="textSecondary">
          {user.role ? ROLE_LABELS[user.role] : 'Sin acceso asignado'}
        </Text>
      </View>
      <Button compact variant="secondary" icon="log-out" label="Salir" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  identity: { alignItems: 'flex-start' },
});
