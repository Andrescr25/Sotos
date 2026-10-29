import { useState } from 'react';
import { View } from 'react-native';
import { formatOrderNumber } from '@/domain/orders';
import { OrderItemsList } from '@/features/orders/components/OrderItemsList';
import { PaymentSummary } from '@/features/orders/components/PaymentSummary';
import { receiptService } from '@/services/receiptService';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/receipt';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { Banner, ChipField, Sheet, Text } from '@/shared/ui';

const PAPER_OPTIONS = theme.printing.paperWidths.map((width) => ({ key: width, label: `${width} mm` }));

/** El pedido ya está guardado: imprimir es opcional y se puede reintentar. */
export function ReceiptSheet({ order, onClose }) {
  const [paperWidth, setPaperWidth] = useState(theme.printing.defaultPaperWidth);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [opened, setOpened] = useState(false);

  async function print() {
    setError(null);
    setOpened(false);
    setPrinting(true);
    try {
      // El adaptador abre la pestaña de forma síncrona dentro del toque.
      await receiptService.printOrder(order, { paperWidth });
      setOpened(true);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Sheet
      visible
      title={`Comprobante ${formatOrderNumber(order.number)}`}
      onClose={onClose}
      primaryAction={{ icon: 'print-outline', label: printing ? 'Abriendo impresión…' : 'Imprimir comprobante', onPress: print, disabled: printing || !receiptService.supported }}
      secondaryAction={{ label: 'Seguir tomando pedidos', onPress: onClose }}
    >
      <Banner tone="success" message={order.payment ? 'El pago quedó registrado y el pedido ya fue enviado a cocina. Puedes imprimir su comprobante o seguir atendiendo.' : 'El pedido ya fue enviado a cocina. Puedes imprimir su comprobante o seguir atendiendo.'} />
      <View style={styles.confirmation}>
        <View style={commonStyles.rowBetween}><Text variant="title">{order.customerName}</Text><Text color="success">{formatOrderNumber(order.number)}</Text></View>
        <OrderItemsList items={order.items} />
        <View style={styles.total}><Text variant="title">Total</Text><Text variant="title">{formatColones(order.totals.total)}</Text></View>
      </View>
      <PaymentSummary order={order} />
      <ChipField label="Ancho del papel" options={PAPER_OPTIONS} isSelected={(width) => paperWidth === width} onSelect={setPaperWidth} />
      {error ? <Banner tone="error" message={error} /> : null}
      {opened ? <Banner tone="info" message="Se abrió la vista de impresión. Confirma la impresora y el papel; si cancelas, puedes intentarlo de nuevo." /> : null}
      <Text variant="caption" color="textSecondary">Usa la impresora configurada en Android. Si no aparece, activa su servicio de impresión en Ajustes de la tablet.</Text>
      {!receiptService.supported ? <Banner tone="info" message="Para imprimir este comprobante, abre el sistema en Chrome en tu tablet." /> : null}
      <Text variant="caption" color="textSecondary">Este ticket es un comprobante del pedido. La factura electrónica de Hacienda se integrará en una etapa posterior.</Text>
    </Sheet>
  );
}
