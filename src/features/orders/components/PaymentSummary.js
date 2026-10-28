import { View } from 'react-native';
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '@/domain/payments';
import { styles } from '@/shared/styles/components/payment';
import { formatColones } from '@/shared/utils/money';
import { Text } from '@/shared/ui';

/**
 * Cómo se pagó un pedido: la forma de pago y, en efectivo, lo recibido y el
 * vuelto. No muestra nada en los pedidos anteriores al módulo de pagos.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/order').Order} props.order
 */
export function PaymentSummary({ order }) {
  const { payment } = order;
  if (!payment) return null;
  const cash = payment.method === PAYMENT_METHOD.CASH;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <Text color="textSecondary">Pagó con</Text>
        <Text variant="label">{PAYMENT_METHOD_LABELS[payment.method]}</Text>
      </View>
      {cash ? (
        <>
          <View style={styles.summaryRow}>
            <Text color="textSecondary">Recibido</Text>
            <Text variant="label">{formatColones(payment.tendered)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="title">Vuelto</Text>
            <Text variant="title" color="success">{formatColones(payment.change)}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
