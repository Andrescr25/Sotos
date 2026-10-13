import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { KITCHEN_STATUSES, ORDER_STATUS } from '@/domain/orders';
import { useAuth } from '@/features/auth';
import { useLiveOrders } from '@/features/orders/useLiveOrders';
import { orderService } from '@/services';
import { getErrorMessage } from '@/shared/errors/messages';
import { useNow } from '@/shared/hooks/useNow';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/screens/kitchen';
import { theme } from '@/shared/theme';
import { Banner, EmptyState, Spinner, Text } from '@/shared/ui';
import { KitchenOrderCard } from '../components/KitchenOrderCard';

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
  const { user } = useAuth();
  const { orders, loading, error, connected, reload } = useLiveOrders({ statuses: KITCHEN_STATUSES });
  const now = useNow(1000);
  const { board: wide } = useResponsiveLayout();

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
        <Text style={styles.columnTitle}>{column.title}</Text>
        <View style={[styles.count, { backgroundColor: theme.colors.status[column.status] }]}>
          <Text variant="label" color="textInverse">
            {column.orders.length}
          </Text>
        </View>
      </View>

      {column.orders.length === 0 ? (
        <EmptyState icon={column.status === ORDER_STATUS.NEW ? 'receipt-outline' : column.status === ORDER_STATUS.IN_PROGRESS ? 'flame-outline' : 'bag-check-outline'} title="Sin pedidos" message={column.status === ORDER_STATUS.READY ? 'Aquí aparecerán los pedidos listos para entregar.' : 'Cada pedido aparecerá aquí cuando llegue a esta etapa.'} />
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
    <WorkspaceScreen section="kitchen" title="Cocina" subtitle="Todo a su tiempo. Todo en su punto.">
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
    </WorkspaceScreen>
  );
}
