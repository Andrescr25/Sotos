import { StyleSheet, View } from 'react-native';
import {
  ORDER_STATUS,
  formatOrderNumber,
  getElapsedSinceSent,
  getStatusTime,
} from '@/domain/orders';
import { OrderItemsList } from '@/features/orders/components/OrderItemsList';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { formatClockTime, formatElapsed } from '@/shared/utils/time';
import { Banner, Button, Icon, Text } from '@/shared/ui';
import { KITCHEN_CONFIG } from '../config';
import { getUrgency } from '../urgency';

const URGENCY_COLOR = { ok: 'success', warn: 'warning', urgent: 'danger' };

/**
 * Tarjeta de un pedido en cocina: número, hora, tiempo transcurrido,
 * productos con extras y observaciones, y el botón del siguiente paso.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/order').Order} props.order
 * @param {Date} props.now
 * @param {{ label: string, icon: string } | null} props.action  siguiente paso (null = solo lectura)
 * @param {string} [props.hint]  texto cuando no hay acción
 * @param {boolean} [props.busy]
 * @param {() => void} [props.onAction]
 */
export function KitchenOrderCard({ order, now, action, hint, busy = false, onAction }) {
  const sentAt = getStatusTime(order, ORDER_STATUS.NEW);
  const elapsed = getElapsedSinceSent(order, now);
  const urgency = order.status === ORDER_STATUS.READY ? 'ok' : getUrgency(elapsed);
  const accent = theme.colors[URGENCY_COLOR[urgency]];
  const justArrived =
    order.status === ORDER_STATUS.NEW && elapsed !== null && elapsed < KITCHEN_CONFIG.newArrivalHighlightMs;

  return (
    <View style={[commonStyles.card, styles.card, { borderLeftColor: accent }, justArrived && styles.arrived]}>
      <View style={commonStyles.rowBetween}>
        <Text variant="headline">{formatOrderNumber(order.number)}</Text>
        <View style={[styles.timer, { backgroundColor: accent }]}>
          <Icon name="timer" size="sm" color="textInverse" />
          <Text variant="label" color="textInverse">
            {elapsed === null ? '--:--' : formatElapsed(elapsed)}
          </Text>
        </View>
      </View>

      <View style={commonStyles.rowBetween}>
        <Text color="textSecondary">{sentAt ? formatClockTime(sentAt) : ''}</Text>
        <Text variant="caption" color="textSecondary">
          Tomó: {order.createdBy.name}
        </Text>
      </View>

      <View style={commonStyles.divider} />

      <OrderItemsList items={order.items} size="large" />

      {order.note ? <Banner tone="warning" message={`Nota del pedido: ${order.note}`} /> : null}

      <View style={commonStyles.divider} />

      <View style={commonStyles.rowBetween}>
        <OrderStatusBadge status={order.status} />
        {justArrived ? (
          <Text variant="label" color="info">
            ¡Nuevo!
          </Text>
        ) : null}
      </View>

      {action ? (
        <Button
          label={busy ? 'Un momento…' : action.label}
          icon={action.icon}
          onPress={onAction}
          disabled={busy}
          style={styles.action}
        />
      ) : hint ? (
        <Text color="textSecondary" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md, borderLeftWidth: 8 },
  arrived: { backgroundColor: theme.colors.infoSoft },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  action: { minHeight: 64 },
  hint: { textAlign: 'center' },
});
