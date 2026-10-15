import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { getExtrasForProduct, getProductsByCategory, getSellableCategories } from '@/domain/menu';
import { ORDER_STATUS, createOrderItem, formatOrderNumber } from '@/domain/orders';
import { useAuth } from '@/features/auth';
import { useMenu } from '@/features/menu/useMenu';
import { useLiveOrders } from '@/features/orders/useLiveOrders';
import { PERMISSIONS, can } from '@/domain/users';
import { orderService } from '@/services';
import { getErrorMessage } from '@/shared/errors/messages';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/screens/cashier';
import { Banner, Button, Chip, Spinner, Text } from '@/shared/ui';
import { NotesSheet } from '../components/NotesSheet';
import { OrderSummary } from '../components/OrderSummary';
import { ProductGrid } from '../components/ProductGrid';
import { ProductOptionsSheet } from '../components/ProductOptionsSheet';
import { ReadyOrdersSheet } from '../components/ReadyOrdersSheet';
import { ReceiptSheet } from '../components/ReceiptSheet';
import { useOrderDraft } from '../hooks/useOrderDraft';

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
  const { split: wide } = useResponsiveLayout();
  const workspaceScroll = useRef(null);
  const summaryOffset = useRef(0);
  const sendingRef = useRef(false);

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
  const [lastSentOrder, setLastSentOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [error, setError] = useState(null);

  const categories = useMemo(() => (menu ? getSellableCategories(menu) : []), [menu]);
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
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const sent = await orderService.sendToKitchen(draft.order, user);
      setNotice(`Pedido ${formatOrderNumber(sent.number)} de ${sent.customerName} enviado a cocina.`);
      draft.reset();
      setLastSentOrder(sent);
      setReceiptOrder(sent);
    } catch (caught) {
      // El borrador se conserva: se puede reintentar sin volver a armarlo.
      setError(getErrorMessage(caught));
    } finally {
      sendingRef.current = false;
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
      scrollable={wide}
      sending={sending}
      onQuantity={draft.setQuantity}
      onEditNotes={setNotesItemId}
      onRemove={draft.remove}
      onNoteChange={draft.setNote}
      onCustomerChange={draft.setCustomerName}
      onSend={send}
    />
  );

  const catalog = (
    <View style={wide ? styles.catalog : styles.catalogNarrow}>
      <View style={styles.catalogHeader}>
        <Text variant="title">Nuestro menú</Text>
        <Text variant="caption" color="textSecondary">{products.length} productos</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoriesContent}>
        {categories.map((category) => (
          <Chip key={category.id} label={category.name} icon={category.icon ?? undefined} selected={category.id === activeCategoryId} onPress={() => setCategoryId(category.id)} />
        ))}
      </ScrollView>
      <ProductGrid products={products} withOptions={withOptions} onPick={pickProduct} scrollable={wide} />
    </View>
  );

  return (
    <WorkspaceScreen
      section="cashier"
      title="Caja"
      subtitle="Cada pedido empieza con una buena atención."
      back={router.canGoBack()}
      actions={
        <>
          {!wide ? <Button compact variant="secondary" icon="receipt-outline" label={`Ver pedido (${draft.order.totals.itemCount})`} onPress={() => workspaceScroll.current?.scrollTo({ y: summaryOffset.current, animated: true })} /> : null}
          {lastSentOrder ? <Button compact variant="secondary" icon="print-outline" label={`Comprobante ${formatOrderNumber(lastSentOrder.number)}`} onPress={() => setReceiptOrder(lastSentOrder)} /> : null}
          <Button compact variant={ready.orders.length ? 'primary' : 'secondary'} icon="bag-check-outline" label={`Listos (${ready.orders.length})`} onPress={() => setReadyOpen(true)} />
        </>
      }
    >
      {notice ? <Banner tone="success" message={notice} style={styles.banner} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner tone="error" message={error} style={styles.banner} onDismiss={() => setError(null)} /> : null}
      {menuError ? <Banner tone="error" message={getErrorMessage(menuError)} style={styles.banner} /> : null}
      {!ready.connected ? (
        <Banner tone="warning" message="Sin conexión con el servidor: reconectando…" style={styles.banner} />
      ) : null}

      {loading ? (
        <Spinner message="Cargando menú…" />
      ) : categories.length === 0 ? (
        <View style={styles.emptyMenu}>
          <Text variant="title">Aún no hay productos en el menú</Text>
          <Text color="textSecondary" style={styles.emptyMenuText}>
            {can(user.role, PERMISSIONS.MENU_MANAGE)
              ? 'Agrega tus platillos y bebidas para empezar a tomar pedidos.'
              : 'Pide al administrador que agregue los platillos y bebidas.'}
          </Text>
          {can(user.role, PERMISSIONS.MENU_MANAGE) ? (
            <Button icon="restaurant" label="Ir al menú" onPress={() => router.push('/admin/menu')} />
          ) : null}
        </View>
      ) : (
        wide ? (
          <View style={styles.body}>
            {catalog}
            <View style={styles.summaryWide}>{summary}</View>
          </View>
        ) : (
          <ScrollView ref={workspaceScroll} contentContainerStyle={styles.bodyNarrow} keyboardShouldPersistTaps="handled">
            {catalog}
            <View style={styles.summaryNarrow} onLayout={(event) => { summaryOffset.current = event.nativeEvent.layout.y; }}>{summary}</View>
          </ScrollView>
        )
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

      {receiptOrder ? <ReceiptSheet key={receiptOrder.id} order={receiptOrder} onClose={() => setReceiptOrder(null)} /> : null}

      {readyOpen ? (
        <ReadyOrdersSheet
          orders={ready.orders}
          busyId={deliveringId}
          onDeliver={deliver}
          onPrint={(order) => { setReadyOpen(false); setReceiptOrder(order); }}
          onClose={() => setReadyOpen(false)}
        />
      ) : null}
    </WorkspaceScreen>
  );
}
