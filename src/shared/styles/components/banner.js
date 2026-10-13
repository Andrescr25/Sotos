import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  message: { flex: 1 },
});
