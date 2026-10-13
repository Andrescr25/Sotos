import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  button: {
    width: theme.sizes.touchTargetCompact,
    height: theme.sizes.touchTargetCompact,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: theme.sizes.avatar, textAlign: 'center' },
  disabled: { opacity: 0.35 },
});
