import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

const { colors, spacing } = theme;

export const styles = StyleSheet.create({
  banner: commonStyles.banner,
  page: { gap: spacing.xl, paddingBottom: spacing.xl },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  columnsNarrow: { gap: spacing.xl },
  column: { flex: 1, minWidth: 0, gap: spacing.lg },
  card: { ...commonStyles.card, gap: spacing.lg },
  group: commonStyles.group,
  row: commonStyles.rowBetween,
  divider: commonStyles.divider,

  // Cuánto sobra o falta: verde si cuadra, ámbar si sobra, rojo si falta.
  difference: { ...commonStyles.card, alignItems: 'center', gap: spacing.xs },
  differenceExact: { backgroundColor: colors.successSoft, borderColor: colors.success },
  differenceOver: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  differenceShort: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },

  // Historial
  history: { gap: spacing.md },
  historyRow: { ...commonStyles.card, gap: spacing.sm },
  historyIdentity: { flex: 1, minWidth: 0, gap: spacing.xs },

  actions: { gap: spacing.sm },
  confirm: { minHeight: theme.sizes.touchTarget },
});
