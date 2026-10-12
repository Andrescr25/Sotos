import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/shared/theme';

/** Contenedor base de toda pantalla: área segura, fondo y padding estándar. */
export function Screen({ style, ...rest }) {
  return <SafeAreaView style={[styles.screen, style]} {...rest} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
});
