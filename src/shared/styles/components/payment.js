import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  totalCard: {
    ...commonStyles.card,
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primarySoft,
  },
  group: commonStyles.group,
  chips: commonStyles.chips,
  actions: { gap: theme.spacing.sm },
  confirm: { minHeight: theme.sizes.touchTarget },

  // Resultado del efectivo: vuelto (verde) o lo que falta (rojo).
  result: { ...commonStyles.card, alignItems: 'center', gap: theme.spacing.xs },
  resultChange: { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success },
  resultShort: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },

  // Resumen del pago ya registrado (comprobante).
  summary: { ...commonStyles.card, gap: theme.spacing.sm },
  summaryRow: commonStyles.rowBetween,
});
