import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
export const styles = StyleSheet.create({
  container: { minWidth: 0 },
  fill: { flex: 1, minHeight: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  gridList: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  gridRow: { gap: theme.spacing.md },
  card: { minHeight: theme.layout.productMinHeight, gap: theme.spacing.md, justifyContent: 'space-between', minWidth: 0 },
  pressed: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm },
  name: { fontWeight: theme.fontWeights.bold },
  hint: { fontSize: theme.fontSizes.caption },
  bottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm },
  price: { fontSize: theme.fontSizes.bodyLarge, fontWeight: theme.fontWeights.bold },
});
