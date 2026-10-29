import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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
import { theme } from '@/shared/theme';
import { Banner, Button, Chip, ChipRow, Column, Columns, EmptyState, Spinner, Text } from '@/shared/ui';
import { NotesSheet } from '../components/NotesSheet';
import { OrderSummary } from '../components/OrderSummary';
import { PaymentSheet } from '../components/PaymentSheet';
import { ProductGrid } from '../components/ProductGrid';
import { ProductOptionsSheet } from '../components/ProductOptionsSheet';
import { ReadyOrdersSheet } from '../components/ReadyOrdersSheet';
import { ReceiptSheet } from '../components/ReceiptSheet';
import { useOrderDraft } from '../hooks/useOrderDraft';

const READY_ONLY = [ORDER_STATUS.READY];
const NOTICE_MS = 6000;

/**
 * Toma de pedidos: Categorías → Productos → Extras → Resumen → Cobro → Cocina.
 * El pedido solo se envía a cocina cuando se confirma el pago.
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
  const bodyOffset = useRef(0);
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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
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

  function openPayment() {
    setError(null);
    setPaymentError(null);
    setPaymentOpen(true);
  }

  async function send(payment) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setPaymentError(null);
    setNotice(null);
    try {
      const sent = await orderService.sendToKitchen(draft.order, user, payment);
      setPaymentOpen(false);
      setNotice(`Pedido ${formatOrderNumber(sent.number)} de ${sent.customerName} cobrado y enviado a cocina.`);
      draft.reset();
      setLastSentOrder(sent);
      setReceiptOrder(sent);
    } catch (caught) {
      // El borrador se conserva y el cobro sigue abierto: se puede reintentar
      // sin volver a armar el pedido ni a escribir el pago.
      setPaymentError(getErrorMessage(caught));
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
      onSend={openPayment}
    />
  );

  const catalog = (
    <Column>
      <View style={styles.catalogHeader}>
        <Text variant="title">Nuestro menú</Text>
        <Text variant="caption" color="textSecondary">{products.length} productos</Text>
      </View>
      <ChipRow scroll="always">
        {categories.map((category) => (
          <Chip key={category.id} label={category.name} icon={category.icon ?? undefined} selected={category.id === activeCategoryId} onPress={() => setCategoryId(category.id)} />
        ))}
      </ChipRow>
      <ProductGrid products={products} withOptions={withOptions} onPick={pickProduct} scrollable={wide} />
    </Column>
  );

  return (
    <WorkspaceScreen
      section="cashier"
      title="Caja"
      subtitle="Cada pedido empieza con una buena atención."
      back={router.canGoBack()}
      scroll={!wide}
      scrollRef={workspaceScroll}
      actions={
        <>
          {!wide ? <Button compact variant="secondary" icon="receipt-outline" label={`Ver pedido (${draft.order.totals.itemCount})`} onPress={() => workspaceScroll.current?.scrollTo({ y: bodyOffset.current + summaryOffset.current, animated: true })} /> : null}
          {can(user.role, PERMISSIONS.CASH_CLOSE) ? <Button compact variant="secondary" icon="wallet-outline" label="Cierre de caja" onPress={() => router.push('/caja/cierre')} /> : null}
          {lastSentOrder ? <Button compact variant="secondary" icon="print-outline" label={`Comprobante ${formatOrderNumber(lastSentOrder.number)}`} onPress={() => setReceiptOrder(lastSentOrder)} /> : null}
          <Button compact variant={ready.orders.length ? 'primary' : 'secondary'} icon="bag-check-outline" label={`Listos (${ready.orders.length})`} onPress={() => setReadyOpen(true)} />
        </>
      }
    >
      {notice ? <Banner tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
      {menuError ? <Banner tone="error" message={getErrorMessage(menuError)} /> : null}
      {!ready.connected ? <Banner tone="warning" message="Sin conexión con el servidor: reconectando…" /> : null}

      {loading ? (
        <Spinner message="Cargando menú…" />
      ) : categories.length === 0 ? (
        <EmptyState
          card
          icon="restaurant-outline"
          title="Aún no hay productos en el menú"
          message={
            can(user.role, PERMISSIONS.MENU_MANAGE)
              ? 'Agrega tus platillos y bebidas para empezar a tomar pedidos.'
              : 'Pide al administrador que agregue los platillos y bebidas.'
          }
        >
          {can(user.role, PERMISSIONS.MENU_MANAGE) ? (
            <Button icon="restaurant" label="Ir al menú" onPress={() => router.push('/admin/menu')} />
          ) : null}
        </EmptyState>
      ) : (
        <Columns wide={wide} fill onLayout={(event) => { bodyOffset.current = event.nativeEvent.layout.y; }}>
          {catalog}
          <Column width={theme.layout.summaryWidth} onLayout={(event) => { summaryOffset.current = event.nativeEvent.layout.y; }}>{summary}</Column>
        </Columns>
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

      {paymentOpen ? (
        <PaymentSheet
          order={draft.order}
          busy={sending}
          error={paymentError}
          onConfirm={send}
          onClose={() => setPaymentOpen(false)}
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
