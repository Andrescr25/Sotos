import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';
export const styles = StyleSheet.create({
  panel: { gap: theme.spacing.lg, minHeight: 0, borderTopWidth: theme.layout.accentBorder, borderTopColor: theme.colors.primary },
  panelCompact: { gap: theme.spacing.md, padding: theme.spacing.md },
  fill: { flex: 1 },
  details: { flex: 1, minHeight: 0 },
  detailsContent: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xs },
  linesContent: { gap: theme.spacing.lg },
  line: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lineName: { flex: 1, minWidth: 0, fontWeight: theme.fontWeights.bold },
  detail: { marginLeft: theme.spacing.md, fontSize: theme.fontSizes.caption },
  lineActions: { ...commonStyles.rowBetween, marginTop: theme.spacing.sm },
  send: { minHeight: theme.sizes.touchTarget },
});
