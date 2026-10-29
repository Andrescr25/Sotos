import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/tabs';
import { Text } from './Text';

/**
 * Barra sobre una lista: una explicación a la izquierda y las acciones (o los
 * filtros) a la derecha. Si no caben, las acciones bajan.
 *
 * @param {Object} props
 * @param {string} [props.hint]
 * @param {import('react').ReactNode} props.children  acciones o filtros
 */
export function Toolbar({ hint, children, style }) {
  return (
    <View style={[commonStyles.toolbar, style]}>
      {hint ? <Text color="textSecondary" style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}
