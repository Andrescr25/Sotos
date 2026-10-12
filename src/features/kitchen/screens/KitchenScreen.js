import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { KITCHEN_STATUSES, ORDER_STATUS } from '@/domain/orders';
import { SessionBar, useAuth } from '@/features/auth';
import { useLiveOrders } from '@/features/orders/useLiveOrders';
import { orderService } from '@/services';
import { getErrorMessage } from '@/shared/errors/messages';
import { useNow } from '@/shared/hooks/useNow';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Banner, Button, Screen, Spinner, Text } from '@/shared/ui';
import { KitchenOrderCard } from '../components/KitchenOrderCard';

const WIDE_BREAKPOINT = 900;

/** Columnas del tablero: cada una agrupa un estado y define su acción. */
const COLUMNS = [
  {
    status: ORDER_STATUS.NEW,
    title: 'Nuevos',
    action: { label: 'Empezar preparación', icon: 'flame', run: 'startPreparation' },
  },
  {
    status: ORDER_STATUS.IN_PROGRESS,
    title: 'En preparación',
    action: { label: 'Marcar como listo', icon: 'checkmark-circle', run: 'markReady' },
  },
  {
    status: ORDER_STATUS.READY,
    title: 'Listos',
    hint: 'Esperando que caja los entregue',
  },
];

/**
 * Pantalla de cocina: los pedidos llegan solos (tiempo real) y se muestran
 * como tarjetas grandes agrupadas por estado, del más antiguo al más nuevo.
 */
export default function KitchenScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders, loading, error, connected, reload } = useLiveOrders({ statuses: KITCHEN_STATUSES });
  const now = useNow(1000);
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const grouped = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        orders: orders.filter((order) => order.status === column.status),
      })),
    [orders],
  );

  const runAction = useCallback(
    async (order, run) => {
      setBusyId(order.id);
      setActionError(null);
      try {
        await orderService[run](order.id, user);
      } catch (caught) {
        setActionError(getErrorMessage(caught));
        reload(); // otro dispositivo pudo haber cambiado el pedido
      } finally {
        setBusyId(null);
      }
    },
    [user, reload],
  );

  const renderColumn = (column) => (
    <View key={column.status} style={[styles.column, wide && styles.columnWide]}>
      <View style={styles.columnHeader}>
        <Text variant="title">{column.title}</Text>
        <View style={[styles.count, { backgroundColor: theme.colors.status[column.status] }]}>
          <Text variant="label" color="textInverse">
            {column.orders.length}
          </Text>
        </View>
      </View>

      {column.orders.length === 0 ? (
        <Text color="textSecondary" style={styles.empty}>
          Sin pedidos
        </Text>
      ) : (
        column.orders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            now={now}
            action={column.action ?? null}
            hint={column.hint}
            busy={busyId === order.id}
            onAction={() => runAction(order, column.action.run)}
          />
        ))
      )}
    </View>
  );

  return (
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <View style={commonStyles.row}>
          {router.canGoBack() ? (
            <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={() => router.back()} />
          ) : null}
          <Text variant="headline" style={styles.title}>
            Cocina
          </Text>
        </View>
        <SessionBar />
      </View>

      {!connected ? (
        <Banner tone="warning" message="Sin conexión con el servidor. Reconectando… los pedidos nuevos no llegarán hasta que vuelva." style={styles.banner} />
      ) : null}
      {error ? <Banner tone="error" message={getErrorMessage(error)} style={styles.banner} onDismiss={reload} /> : null}
      {actionError ? (
        <Banner tone="error" message={actionError} style={styles.banner} onDismiss={() => setActionError(null)} />
      ) : null}

      {loading ? (
        <Spinner message="Cargando pedidos…" />
      ) : wide ? (
        <View style={styles.board}>
          {grouped.map((column) => (
            <ScrollView key={column.status} style={styles.columnScroll} contentContainerStyle={styles.columnContent}>
              {renderColumn(column)}
            </ScrollView>
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.columnContent}>{grouped.map(renderColumn)}</ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg, gap: theme.spacing.lg },
  title: { marginLeft: theme.spacing.lg },
  banner: { marginBottom: theme.spacing.md },
  board: { flex: 1, flexDirection: 'row', gap: theme.spacing.lg },
  columnScroll: { flex: 1 },
  columnContent: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  column: { gap: theme.spacing.md },
  columnWide: { flex: 1 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  count: {
    minWidth: 36,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  empty: { paddingVertical: theme.spacing.lg },
});
