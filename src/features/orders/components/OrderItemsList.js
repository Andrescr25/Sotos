import { View } from 'react-native';
import { styles } from '@/shared/styles/components/orderItems';
import { Text } from '@/shared/ui';

/**
 * Líneas de un pedido tal como las lee cocina:
 *
 *   2 × Hamburguesa clásica
 *     + 1 × Queso extra
 *     • Sin cebolla
 *
 * @param {Object} props
 * @param {import('@/domain/orders/orderItem').OrderItem[]} props.items
 * @param {'normal' | 'large'} [props.size]  large = tarjetas de cocina, legibles a distancia
 */
export function OrderItemsList({ items, size = 'normal' }) {
  const large = size === 'large';

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Text variant={large ? 'title' : 'bodyLarge'}>
            {item.quantity} × {item.name}
          </Text>
          {item.extras.map((extra) => (
            <Text key={extra.extraId} variant={large ? 'bodyLarge' : 'body'} color="textSecondary" style={styles.detail}>
              + {extra.quantity} × {extra.name}
            </Text>
          ))}
          {item.notes.map((note) => (
            <Text
              key={note}
              variant={large ? 'bodyLarge' : 'body'}
              color="danger"
              style={[styles.detail, styles.note]}
            >
              • {note}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
