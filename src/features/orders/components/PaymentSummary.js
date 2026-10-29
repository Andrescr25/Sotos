import { View } from 'react-native';
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '@/domain/payments';
import { commonStyles } from '@/shared/styles/commonStyles';
import { formatColones } from '@/shared/utils/money';
import { DataRow } from '@/shared/ui';

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

  return (
    <View style={commonStyles.panel}>
      <DataRow label="Pagó con" value={PAYMENT_METHOD_LABELS[payment.method]} />
      {payment.method === PAYMENT_METHOD.CASH ? (
        <>
          <DataRow label="Recibido" value={formatColones(payment.tendered)} />
          <DataRow strong label="Vuelto" value={formatColones(payment.change)} tone="success" />
        </>
      ) : null}
    </View>
  );
}
