import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { Text } from './Text';

/**
 * Una línea "dato ........ valor" (resúmenes, cuadres, totales). Si no caben
 * en una línea, el valor baja en vez de cortarse.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string | number} props.value
 * @param {boolean} [props.strong]  línea destacada (totales)
 * @param {keyof typeof import('@/shared/theme').theme.colors} [props.tone]  color del valor
 */
export function DataRow({ label, value, strong = false, tone = 'textPrimary', style }) {
  return (
    <View style={[commonStyles.rowBetween, style]}>
      <Text variant={strong ? 'title' : 'body'} color={strong ? 'textPrimary' : 'textSecondary'}>{label}</Text>
      <Text variant={strong ? 'title' : 'label'} color={tone}>{value}</Text>
    </View>
  );
}
