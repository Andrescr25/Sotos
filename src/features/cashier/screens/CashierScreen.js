import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { getActiveCategories, getExtrasForProduct, getProductsByCategory } from '@/domain/menu';
import { ORDER_STATUS, createOrderItem, formatOrderNumber } from '@/domain/orders';
import { SessionBar, useAuth } from '@/features/auth';
import { useLiveOrders } from '@/features/orders/useLiveOrders';
import { orderService } from '@/services';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Banner, Button, Chip, Screen, Spinner, Text } from '@/shared/ui';
import { NotesSheet } from '../components/NotesSheet';
import { OrderSummary } from '../components/OrderSummary';
import { ProductGrid } from '../components/ProductGrid';
import { ProductOptionsSheet } from '../components/ProductOptionsSheet';
import { ReadyOrdersSheet } from '../components/ReadyOrdersSheet';
import { useMenu } from '../hooks/useMenu';
import { useOrderDraft } from '../hooks/useOrderDraft';

const WIDE_BREAKPOINT = 900;
const READY_ONLY = [ORDER_STATUS.READY];
const NOTICE_MS = 6000;

/**
 * Toma de pedidos: Categorías → Productos → Extras → Resumen → Enviar a cocina.
 * Los pedidos que cocina deja listos aparecen en "Listos" para entregarlos.
 *
 * Al cerrar sesión la pantalla puede renderizarse un instante sin usuario
 * antes de que la ruta protegida la desmonte; por eso el espacio de trabajo
 * solo existe cuando hay un usuario.
 */
export default function CashierScreen() {
  const { user } = useAuth();
  return user ? <CashierWorkspace user={user} /> : null;
}

function CashierWorkspace({ user }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const { menu, loading, error: menuError } = useMenu();
  const draft = useOrderDraft(user);
  const ready = useLiveOrders({ statuses: READY_ONLY });

  const [categoryId, setCategoryId] = useState(null);
  const [picked, setPicked] = useState(null); // producto con opciones abierto
  const [notesItemId, setNotesItemId] = useState(null);
  const [readyOpen, setReadyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [deliveringId, setDeliveringId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const categories = useMemo(() => (menu ? getActiveCategories(menu) : []), [menu]);
  const activeCategoryId = categoryId ?? categories[0]?.id ?? null;
  const products = useMemo(
    () => (menu && activeCategoryId ? getProductsByCategory(menu, activeCategoryId) : []),
    [menu, activeCategoryId],
  );
  const withOptions = useMemo(
    () => (menu ? products.filter((product) => getExtrasForProduct(menu, product).length > 0).map((p) => p.id) : []),
    [menu, products],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function pickProduct(product) {
    setError(null);
    if (withOptions.includes(product.id)) {
      setPicked(product);
    } else {
      draft.add(createOrderItem({ product }));
    }
  }

  async function send() {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const sent = await orderService.sendToKitchen(draft.order, user);
      setNotice(`Pedido ${formatOrderNumber(sent.number)} enviado a cocina.`);
      draft.reset();
    } catch (caught) {
      // El borrador se conserva: se puede reintentar sin volver a armarlo.
      setError(getErrorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  async function deliver(order) {
    setDeliveringId(order.id);
    setError(null);
    try {
      await orderService.markDelivered(order.id, user);
    } catch (caught) {
      setError(getErrorMessage(caught));
      ready.reload();
    } finally {
      setDeliveringId(null);
    }
  }

  const notesItem = draft.order.items.find((item) => item.id === notesItemId) ?? null;

  const summary = (
    <OrderSummary
      order={draft.order}
      sending={sending}
      onQuantity={draft.setQuantity}
      onEditNotes={setNotesItemId}
      onRemove={draft.remove}
      onNoteChange={draft.setNote}
      onSend={send}
    />
  );

  return (
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <View style={commonStyles.row}>
          {router.canGoBack() ? (
            <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={() => router.back()} />
          ) : null}
          <Text variant="headline" style={styles.title}>
            Caja
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            compact
            variant={ready.orders.length > 0 ? 'primary' : 'secondary'}
            icon="bag-check"
            label={`Listos (${ready.orders.length})`}
            onPress={() => setReadyOpen(true)}
          />
          <SessionBar />
        </View>
      </View>

      {notice ? <Banner tone="success" message={notice} style={styles.banner} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner tone="error" message={error} style={styles.banner} onDismiss={() => setError(null)} /> : null}
      {menuError ? <Banner tone="error" message={getErrorMessage(menuError)} style={styles.banner} /> : null}
      {!ready.connected ? (
        <Banner tone="warning" message="Sin conexión con el servidor: reconectando…" style={styles.banner} />
      ) : null}

      {loading ? (
        <Spinner message="Cargando menú…" />
      ) : (
        <View style={[styles.body, !wide && styles.bodyNarrow]}>
          <View style={styles.catalog}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoriesContent}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  icon={category.icon ?? undefined}
                  selected={category.id === activeCategoryId}
                  onPress={() => setCategoryId(category.id)}
                />
              ))}
            </ScrollView>
            <ProductGrid products={products} withOptions={withOptions} onPick={pickProduct} />
          </View>

          <View style={wide ? styles.summaryWide : styles.summaryNarrow}>{summary}</View>
        </View>
      )}

      {picked && menu ? (
        <ProductOptionsSheet
          key={picked.id}
          product={picked}
          extras={getExtrasForProduct(menu, picked)}
          quickNotes={menu.quickNotes}
          onAdd={(item) => {
            draft.add(item);
            setPicked(null);
          }}
          onClose={() => setPicked(null)}
        />
      ) : null}

      {notesItem && menu ? (
        <NotesSheet
          key={notesItem.id}
          item={notesItem}
          quickNotes={menu.quickNotes}
          onSave={(notes) => {
            draft.setNotes(notesItem.id, notes);
            setNotesItemId(null);
          }}
          onClose={() => setNotesItemId(null)}
        />
      ) : null}

      {readyOpen ? (
        <ReadyOrdersSheet
          orders={ready.orders}
          busyId={deliveringId}
          onDeliver={deliver}
          onClose={() => setReadyOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg, gap: theme.spacing.lg, flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  title: { marginLeft: theme.spacing.lg },
  banner: { marginBottom: theme.spacing.md },
  body: { flex: 1, flexDirection: 'row', gap: theme.spacing.lg },
  bodyNarrow: { flexDirection: 'column' },
  catalog: { flex: 1, gap: theme.spacing.md },
  categories: { flexGrow: 0 },
  categoriesContent: { gap: theme.spacing.sm },
  summaryWide: { width: 400 },
  summaryNarrow: { flex: 1, minHeight: 320 },
});
