import { useState } from 'react';
import { View } from 'react-native';
import {
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  calculateChange,
  suggestTenderedAmounts,
} from '@/domain/payments';
import { styles } from '@/shared/styles/components/payment';
import { formatColones, parseColones } from '@/shared/utils/money';
import { Banner, Button, Chip, Sheet, Text, TextField } from '@/shared/ui';

const METHOD_ICONS = {
  [PAYMENT_METHOD.CASH]: 'cash-outline',
  [PAYMENT_METHOD.CARD]: 'card-outline',
  [PAYMENT_METHOD.SINPE]: 'phone-portrait-outline',
};

/**
 * Cobro del pedido, antes de enviarlo a cocina. El pedido solo sale cuando
 * se confirma el pago: en efectivo se pide con cuánto paga el cliente y se
 * calcula el vuelto; con tarjeta o SINPE Móvil se confirma que ya se recibió.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/order').Order} props.order  borrador a cobrar
 * @param {boolean} props.busy  se está enviando
 * @param {string | null} [props.error]  por qué falló el último intento
 * @param {(payment: { method: string, tendered?: number }) => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export function PaymentSheet({ order, busy, error, onConfirm, onClose }) {
  const total = order.totals.total;
  const [method, setMethod] = useState(null);
  const [tenderedText, setTenderedText] = useState('');

  const isCash = method === PAYMENT_METHOD.CASH;
  const tendered = parseColones(tenderedText);
  const change = tendered === null ? null : calculateChange(total, tendered);
  const canConfirm = !busy && method !== null && (!isCash || (change !== null && change >= 0));

  function confirm() {
    if (!canConfirm) return;
    onConfirm(isCash ? { method, tendered } : { method });
  }

  return (
    <Sheet
      visible
      testID="payment-sheet"
      title="Cobrar pedido"
      onClose={busy ? () => {} : onClose}
      footer={
        <View style={styles.actions}>
          <Button
            icon="checkmark-circle"
            label={busy ? 'Enviando…' : 'Confirmar pago y enviar a cocina'}
            onPress={confirm}
            disabled={!canConfirm}
            style={styles.confirm}
          />
          <Button variant="secondary" label="Volver al pedido" onPress={onClose} disabled={busy} />
        </View>
      }
    >
      <View style={styles.totalCard}>
        <Text color="textSecondary">{`Pedido de ${order.customerName}`}</Text>
        <Text variant="caption" color="textSecondary">Total a cobrar</Text>
        <Text variant="display" color="primary">{formatColones(total)}</Text>
      </View>

      <View style={styles.group}>
        <Text variant="label">¿Cómo paga el cliente?</Text>
        <View style={styles.chips}>
          {PAYMENT_METHODS.map((option) => (
            <Chip
              key={option}
              label={PAYMENT_METHOD_LABELS[option]}
              icon={METHOD_ICONS[option]}
              selected={method === option}
              disabled={busy}
              onPress={() => setMethod(option)}
            />
          ))}
        </View>
      </View>

      {isCash ? (
        <View style={styles.group}>
          <TextField
            label="¿Con cuánto paga el cliente?"
            value={tenderedText}
            onChangeText={setTenderedText}
            keyboardType="numeric"
            placeholder="Ej. 10000"
            editable={!busy}
          />
          <View style={styles.chips}>
            <Chip label="Exacto" selected={tendered === total} disabled={busy} onPress={() => setTenderedText(String(total))} />
            {suggestTenderedAmounts(total).map((amount) => (
              <Chip
                key={amount}
                label={formatColones(amount)}
                selected={tendered === amount}
                disabled={busy}
                onPress={() => setTenderedText(String(amount))}
              />
            ))}
          </View>

          {change === null ? (
            <Text variant="caption" color="textSecondary">Escribe o elige cuánto entregó el cliente para calcular el vuelto.</Text>
          ) : change < 0 ? (
            <View style={[styles.result, styles.resultShort]} accessibilityLiveRegion="polite">
              <Text variant="caption" color="danger">Falta para completar el total</Text>
              <Text variant="headline" color="danger">{formatColones(-change)}</Text>
            </View>
          ) : (
            <View style={[styles.result, styles.resultChange]} accessibilityLiveRegion="polite">
              <Text variant="caption" color="success">{change === 0 ? 'Pago exacto' : 'Vuelto para el cliente'}</Text>
              <Text variant="headline" color="success">{formatColones(change)}</Text>
            </View>
          )}
        </View>
      ) : null}

      {method === PAYMENT_METHOD.CARD ? (
        <Banner tone="info" message={`Cobra ${formatColones(total)} en el datáfono y confirma cuando el pago sea aprobado.`} />
      ) : null}
      {method === PAYMENT_METHOD.SINPE ? (
        <Banner tone="info" message={`Confirma que el SINPE Móvil por ${formatColones(total)} ya llegó a la cuenta del restaurante.`} />
      ) : null}

      {error ? <Banner tone="error" message={error} /> : null}
      <Text variant="caption" color="textSecondary">El pedido solo se envía a cocina cuando confirmas el pago.</Text>
    </Sheet>
  );
}
