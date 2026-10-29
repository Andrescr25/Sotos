import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';

/** Lo propio de Caja; columnas, categorías, avisos y estado vacío son componentes compartidos. */
export const styles = StyleSheet.create({
  catalogHeader: commonStyles.rowBetween,
});
