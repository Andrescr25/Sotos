import { View } from 'react-native';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/domain/payments';
import { styles } from '@/shared/styles/screens/cashClosing';
import { formatColones } from '@/shared/utils/money';
import { formatDateTime } from '@/shared/utils/time';
import { Banner, Text } from '@/shared/ui';

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/**
 * Lo cobrado desde el último cierre, por forma de pago.
 *
 * @param {Object} props
 * @param {import('@/domain/cashClosing').SalesSummary} props.sales
 * @param {string | null} props.since  desde cuándo (ISO)
 */
export function SalesBreakdown({ sales, since }) {
  const { cancelled } = sales;

  return (
    <View style={styles.card}>
      <View style={styles.group}>
        <Text variant="title">Ventas por cerrar</Text>
        {since ? <Text variant="caption" color="textSecondary">{`Desde ${formatDateTime(since)}`}</Text> : null}
      </View>

      <View style={styles.row}>
        <Text color="textSecondary">{plural(sales.orderCount, 'pedido cobrado', 'pedidos cobrados')}</Text>
        <Text variant="headline" color="primary">{formatColones(sales.total)}</Text>
      </View>

      <View style={styles.divider} />

      {PAYMENT_METHODS.map((method) => (
        <View key={method} style={styles.row}>
          <Text>{PAYMENT_METHOD_LABELS[method]}</Text>
          <Text variant="label">{`${plural(sales.byMethod[method].count, 'pedido', 'pedidos')} · ${formatColones(sales.byMethod[method].total)}`}</Text>
        </View>
      ))}

      {cancelled.count > 0 ? (
        <Banner
          tone="warning"
          message={`${plural(cancelled.count, 'pedido cobrado se canceló', 'pedidos cobrados se cancelaron')} por ${formatColones(cancelled.total)}. No suma a las ventas: revisa que ese dinero se haya devuelto.`}
        />
      ) : null}
    </View>
  );
}
