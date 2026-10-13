import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, flexWrap: 'wrap', padding: theme.spacing.lg },
  hidden: { opacity: 0.65 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexGrow: 1, flexShrink: 1, flexBasis: theme.layout.rowInfoBasis, minWidth: 0 },
  info: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  title: { fontWeight: theme.fontWeights.bold },
  price: { fontSize: theme.fontSizes.bodyLarge, fontWeight: theme.fontWeights.bold },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, maxWidth: '100%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
});
