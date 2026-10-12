import { StyleSheet, View } from 'react-native';
import { formatOrderNumber } from '@/domain/orders';
import { OrderItemsList } from '@/features/orders/components/OrderItemsList';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { formatClockTime } from '@/shared/utils/time';
import { Button, Sheet, Text } from '@/shared/ui';

/**
 * Pedidos que cocina ya dejó listos y esperan ser entregados al cliente.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/order').Order[]} props.orders
 * @param {string | null} props.busyId
 * @param {(order: import('@/domain/orders/order').Order) => void} props.onDeliver
 * @param {() => void} props.onClose
 */
export function ReadyOrdersSheet({ orders, busyId, onDeliver, onClose }) {
  return (
    <Sheet visible title="Listos para entregar" onClose={onClose}>
      {orders.length === 0 ? (
        <Text color="textSecondary">No hay pedidos listos por ahora.</Text>
      ) : (
        orders.map((order) => (
          <View key={order.id} style={[commonStyles.card, styles.card]}>
            <View style={commonStyles.rowBetween}>
              <Text variant="headline">{formatOrderNumber(order.number)}</Text>
              <Text color="textSecondary">{formatClockTime(order.createdAt)}</Text>
            </View>
            {order.customerName ? (
              <Text variant="title">{order.customerName}</Text>
            ) : null}
            <OrderItemsList items={order.items} />
            <Button
              icon="bag-check"
              label={busyId === order.id ? 'Un momento…' : 'Marcar como entregado'}
              disabled={busyId === order.id}
              onPress={() => onDeliver(order)}
            />
          </View>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md, backgroundColor: theme.colors.successSoft },
});
