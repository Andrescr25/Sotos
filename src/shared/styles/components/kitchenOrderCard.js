import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  card: { gap: theme.spacing.md, borderLeftWidth: theme.layout.accentBorder },
  arrived: { backgroundColor: theme.colors.infoSoft },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  customer: { fontWeight: theme.fontWeights.bold },
  action: { minHeight: theme.sizes.touchTarget },
  hint: { textAlign: 'center' },
});
