import { Pressable, ScrollView, View } from 'react-native';
import { calculateItemTotal, isValidCustomerName } from '@/domain/orders';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/orderSummary';
import { formatColones } from '@/shared/utils/money';
import { Banner, Button, EmptyState, Icon, Stepper, Text, TextField } from '@/shared/ui';

/**
 * Resumen del pedido en construcción: líneas con su cantidad, extras y
 * observaciones, nota general, total y botón de enviar a cocina.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/order').Order} props.order
 * @param {boolean} props.sending
 * @param {(itemId: string, quantity: number) => void} props.onQuantity  cantidad 0 elimina la línea
 * @param {(itemId: string) => void} props.onEditNotes
 * @param {(itemId: string) => void} props.onRemove
 * @param {(note: string) => void} props.onNoteChange
 * @param {(name: string) => void} props.onCustomerChange  nombre del cliente (obligatorio)
 * @param {() => void} props.onSend
 */
export function OrderSummary({
  order,
  sending,
  onQuantity,
  onEditNotes,
  onRemove,
  onNoteChange,
  onCustomerChange,
  onSend,
  scrollable = true,
}) {
  const Details = scrollable ? ScrollView : View;
  const empty = order.items.length === 0;
  const hasName = isValidCustomerName(order.customerName);

  return (
    <View style={[commonStyles.card, styles.panel, scrollable && styles.fill]}>
      <View style={commonStyles.rowBetween}>
        <Text variant="title">Pedido actual</Text>
        <Text color="textSecondary">{order.totals.itemCount} unidades</Text>
      </View>

      <Details style={scrollable ? styles.details : styles.detailsContent} contentContainerStyle={scrollable ? styles.detailsContent : undefined} keyboardShouldPersistTaps="handled">
        <TextField
          label="Nombre del cliente *"
          value={order.customerName}
          onChangeText={onCustomerChange}
          autoCapitalize="words"
          placeholder="¿A nombre de quién va la cuenta?"
          error={!hasName && !empty ? 'Obligatorio para enviar el pedido' : undefined}
        />

        {empty ? (
          <EmptyState title="Tu pedido empieza aquí" message="Toca un producto para agregarlo al pedido." />
        ) : (
          <View style={styles.linesContent}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.line}>
                <View style={commonStyles.rowBetween}>
                  <Text variant="bodyLarge" style={styles.lineName}>
                    {item.quantity} × {item.name}
                  </Text>
                  <Text variant="bodyLarge">{formatColones(calculateItemTotal(item))}</Text>
                </View>

                {item.extras.map((extra) => (
                  <Text key={extra.extraId} color="textSecondary" style={styles.detail}>
                    + {extra.quantity} × {extra.name} ({formatColones(extra.unitPrice * extra.quantity)})
                  </Text>
                ))}
                {item.notes.map((note) => (
                  <Text key={note} color="danger" style={styles.detail}>
                    • {note}
                  </Text>
                ))}

                <View style={styles.lineActions}>
                  <Stepper value={item.quantity} min={0} onChange={(value) => onQuantity(item.id, value)} />
                  <View style={commonStyles.row}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Observaciones de ${item.name}`}
                      onPress={() => onEditNotes(item.id)}
                      style={styles.iconButton}
                    >
                      <Icon name="chatbubble-ellipses" color="textSecondary" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar ${item.name}`}
                      onPress={() => onRemove(item.id)}
                      style={styles.iconButton}
                    >
                      <Icon name="trash" color="danger" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <TextField
          placeholder="Nota para todo el pedido (opcional)"
          value={order.note}
          onChangeText={onNoteChange}
          autoCapitalize="sentences"
        />

      </Details>

      <View style={commonStyles.divider} />

      <View style={commonStyles.rowBetween}>
        <Text variant="title">Total</Text>
        <Text variant="headline" color="primary">{formatColones(order.totals.total)}</Text>
      </View>

      {empty ? <Banner tone="info" message="Agrega productos para poder enviar el pedido." /> : null}
      {!empty && !hasName ? (
        <Banner tone="warning" message="Escribe el nombre del cliente para poder enviar el pedido." />
      ) : null}

      <Button
        icon="send"
        label={sending ? 'Enviando…' : 'Enviar pedido a cocina'}
        onPress={onSend}
        disabled={empty || !hasName || sending}
        style={styles.send}
      />
    </View>
  );
}
