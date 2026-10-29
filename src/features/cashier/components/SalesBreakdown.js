import { View } from 'react-native';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/domain/payments';
import { commonStyles } from '@/shared/styles/commonStyles';
import { formatColones } from '@/shared/utils/money';
import { formatDateTime } from '@/shared/utils/time';
import { Banner, DataRow, Text } from '@/shared/ui';

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
    <View style={commonStyles.panel}>
      <View style={commonStyles.group}>
        <Text variant="title">Ventas por cerrar</Text>
        {since ? <Text variant="caption" color="textSecondary">{`Desde ${formatDateTime(since)}`}</Text> : null}
      </View>

      <View style={commonStyles.rowBetween}>
        <Text color="textSecondary">{plural(sales.orderCount, 'pedido cobrado', 'pedidos cobrados')}</Text>
        <Text variant="headline" color="primary">{formatColones(sales.total)}</Text>
      </View>

      <View style={commonStyles.divider} />

      {PAYMENT_METHODS.map((method) => (
        <DataRow
          key={method}
          label={PAYMENT_METHOD_LABELS[method]}
          value={`${plural(sales.byMethod[method].count, 'pedido', 'pedidos')} · ${formatColones(sales.byMethod[method].total)}`}
        />
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
