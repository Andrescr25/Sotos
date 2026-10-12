import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { calculateItemTotal } from '@/domain/orders';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { Banner, Button, Icon, Stepper, Text, TextField } from '@/shared/ui';

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
 * @param {() => void} props.onSend
 */
export function OrderSummary({ order, sending, onQuantity, onEditNotes, onRemove, onNoteChange, onSend }) {
  const empty = order.items.length === 0;

  return (
    <View style={[commonStyles.card, styles.panel]}>
      <View style={commonStyles.rowBetween}>
        <Text variant="title">Pedido actual</Text>
        <Text color="textSecondary">{order.totals.itemCount} unidades</Text>
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Icon name="receipt" size="lg" color="textSecondary" />
          <Text color="textSecondary" style={styles.emptyText}>
            Toca un producto para agregarlo al pedido.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.lines} contentContainerStyle={styles.linesContent}>
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
        </ScrollView>
      )}

      <TextField
        placeholder="Nota para todo el pedido (opcional)"
        value={order.note}
        onChangeText={onNoteChange}
        autoCapitalize="sentences"
      />

      <View style={commonStyles.divider} />

      <View style={commonStyles.rowBetween}>
        <Text variant="title">Total</Text>
        <Text variant="headline">{formatColones(order.totals.total)}</Text>
      </View>

      {empty ? <Banner tone="info" message="Agrega productos para poder enviar el pedido." /> : null}

      <Button
        icon="send"
        label={sending ? 'Enviando…' : 'Enviar pedido a cocina'}
        onPress={onSend}
        disabled={empty || sending}
        style={styles.send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: theme.spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, minHeight: 140 },
  emptyText: { textAlign: 'center' },
  lines: { flex: 1 },
  linesContent: { gap: theme.spacing.lg },
  line: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  lineName: { flex: 1, fontWeight: theme.fontWeights.bold },
  detail: { marginLeft: theme.spacing.lg },
  lineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    marginLeft: theme.spacing.sm,
  },
  send: { minHeight: 64 },
});
