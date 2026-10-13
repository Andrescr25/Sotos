import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/shared/styles/components/screen';

/** Contenedor base de toda pantalla: área segura, fondo y padding estándar. */
export function Screen({ style, ...rest }) {
  return <SafeAreaView style={[styles.screen, style]} {...rest} />;
}
