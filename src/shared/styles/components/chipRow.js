import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  /** `maxWidth` evita que, dentro de una fila que se parte en líneas, la tira se salga de la pantalla en vez de deslizarse. */
  scroller: { flexGrow: 0, flexShrink: 1, maxWidth: '100%' },
  scrollerContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xs },
});
