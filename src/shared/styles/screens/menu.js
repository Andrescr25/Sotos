import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';

/** Lo propio del menú; pestañas, barra, filas, avisos y estado vacío son componentes compartidos. */
export const styles = StyleSheet.create({
  noteForm: { ...commonStyles.toolbar, alignItems: 'flex-end' },
  noteInput: { flexGrow: 1, flexBasis: theme.layout.rowInfoBasis, minWidth: 0 },
  notes: { gap: theme.spacing.sm },
  noteRow: { ...commonStyles.rowBetween },
  noteText: { flex: 1, minWidth: 0 },
});
