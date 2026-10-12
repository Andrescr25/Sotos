import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ROLE_LABELS, ROLES } from '@/domain/users';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Button, Screen, Text } from '@/shared/ui';

/**
 * Selector de rol provisional para desarrollo. Se reemplazará por el inicio
 * de sesión real, que enviará a cada usuario a la ruta de su rol.
 */
const ENTRIES = [
  { role: ROLES.CASHIER, href: '/caja', icon: 'receipt' },
  { role: ROLES.COOK, href: '/cocina', icon: 'flame' },
  { role: ROLES.ADMIN, href: '/admin', icon: 'settings' },
];

export default function Home() {
  const router = useRouter();

  return (
    <Screen style={commonStyles.center}>
      <View style={styles.content}>
        <Text variant="display">Sotos</Text>
        <Text color="textSecondary">Entrar como…</Text>
        {ENTRIES.map(({ role, href, icon }) => (
          <Button
            key={role}
            label={ROLE_LABELS[role]}
            icon={icon}
            onPress={() => router.push(href)}
            style={styles.button}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: theme.spacing.lg },
  button: { minWidth: 320 },
});
