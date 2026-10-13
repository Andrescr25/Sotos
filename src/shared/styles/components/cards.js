import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
const { colors, spacing, radius, fontSizes, fontWeights, layout } = theme;

export const cardStyles = StyleSheet.create({
  action: { flexBasis: layout.actionCardBasis, flexGrow: 1, minWidth: 0, gap: spacing.lg, padding: spacing.xl },
  pressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  actionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionCopy: { gap: spacing.sm },
  actionTitle: { fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.bold },
  description: { fontSize: fontSizes.caption },
  metric: { flexBasis: layout.statCardBasis, flexGrow: 1, minWidth: 0, gap: spacing.md, padding: spacing.xl },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metricLabel: { flex: 1, fontSize: fontSizes.caption },
  metricValue: { fontSize: fontSizes.headline, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  emptyTitle: { textAlign: 'center', fontWeight: fontWeights.bold },
});
