import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Text } from './Text';

/** Indicador de carga centrado con mensaje opcional. */
export function Spinner({ message }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? <Text color="textSecondary">{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
});
