import { View } from 'react-native';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/listRow';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Fila de una lista de administración: icono, título y datos a la izquierda,
 * una cifra a la derecha (`aside`) y los controles debajo cuando no caben
 * (`children`). La usan el menú, el inventario y las recetas.
 *
 * @param {Object} props
 * @param {string} [props.icon]
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.detail]  línea destacada bajo el subtítulo
 * @param {keyof typeof import('@/shared/theme').theme.colors} [props.detailColor]
 * @param {string} [props.value]  cifra destacada a la derecha (un precio)
 * @param {import('react').ReactNode} [props.aside]  bloque a la derecha con más de una línea (stock…)
 * @param {boolean} [props.muted]  oculto o desactivado
 * @param {import('react').ReactNode} [props.children]  controles (botones, interruptores)
 */
export function ListRow({ icon = 'restaurant-outline', title, subtitle, detail, detailColor = 'primary', value, aside, muted = false, children, style }) {
  const { compact } = useResponsiveLayout();
  return (
    <View style={[styles.row, compact && styles.rowCompact, muted && styles.muted, style]}>
      <View style={styles.identity}>
        <View style={commonStyles.iconWell}><Icon name={icon} color="primary" /></View>
        <View style={styles.info}>
          <Text variant="bodyLarge" style={styles.title}>{title}</Text>
          {subtitle ? <Text variant="caption" color="textSecondary">{subtitle}</Text> : null}
          {detail ? <Text variant="caption" color={detailColor}>{detail}</Text> : null}
        </View>
      </View>
      {value ? <Text variant="bodyLarge" style={styles.title}>{value}</Text> : null}
      {aside ? <View style={styles.aside}>{aside}</View> : null}
      {children ? <View style={styles.controls}>{children}</View> : null}
    </View>
  );
}
