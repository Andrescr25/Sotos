import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  /** Escritorio y tablet: un botón debajo del otro, a todo lo ancho. */
  stacked: { gap: theme.spacing.sm },
  /** Compacto: lado a lado (el principal a la derecha) y, si no caben, uno debajo del otro. */
  inline: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: theme.spacing.sm },
  primary: { flexGrow: 2, flexShrink: 1, flexBasis: 200, minWidth: 0 },
  secondary: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0 },
});
