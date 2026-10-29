import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { cardStyles as styles } from '@/shared/styles/components/cards';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Estado vacío: icono, título, explicación y, opcionalmente, las acciones para
 * empezar (`children`). Con `card` se dibuja como tarjeta (pantallas de lista).
 */
export function EmptyState({ icon = 'receipt-outline', title, message, card = false, children, style }) {
  return (
    <View style={[commonStyles.empty, card && commonStyles.card, style]}>
      <View style={commonStyles.iconWell}><Icon name={icon} color="primary" /></View>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      {message ? <Text variant="caption" color="textSecondary" style={commonStyles.emptyText}>{message}</Text> : null}
      {children}
    </View>
  );
}
