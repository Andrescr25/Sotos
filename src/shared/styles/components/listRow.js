import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

const { spacing, layout, fontWeights } = theme;

export const styles = StyleSheet.create({
  row: { ...commonStyles.card, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.lg },
  rowCompact: { gap: spacing.md, padding: spacing.md },
  muted: { opacity: 0.65 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexGrow: 1, flexShrink: 1, flexBasis: layout.rowInfoBasis, minWidth: 0 },
  info: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontWeight: fontWeights.bold },
  aside: { alignItems: 'flex-end', gap: spacing.xs, flexShrink: 1, minWidth: 0 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
});
