import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

const { colors, spacing } = theme;

export const styles = StyleSheet.create({
  base: { ...commonStyles.card, alignItems: 'center', gap: spacing.xs },
  /** Poca altura: la explicación a la izquierda y la cifra a la derecha, en una sola fila. */
  compact: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md },
  copy: { flexShrink: 1, minWidth: 0, gap: spacing.xs },
  primary: { backgroundColor: colors.primarySoft },
  success: { backgroundColor: colors.successSoft, borderColor: colors.success },
  warning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
});
