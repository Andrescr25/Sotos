import { View } from 'react-native';
import { styles } from '@/shared/styles/screens/cashClosing';
import { formatColones } from '@/shared/utils/money';
import { Banner, Button, Sheet, Text } from '@/shared/ui';
import { describeDifference } from '../cashDifference';

/**
 * Última revisión antes de cerrar. Cerrar es definitivo: los pedidos cobrados
 * quedan incluidos en este cierre y no entran en otro.
 *
 * @param {Object} props
 * @param {import('@/domain/cashClosing').SalesSummary} props.sales
 * @param {{ expected: number, counted: number, difference: number }} props.cash
 * @param {boolean} props.busy
 * @param {string | null} [props.error]
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export function CloseRegisterSheet({ sales, cash, busy, error, onConfirm, onClose }) {
  const summary = describeDifference(cash.difference);

  return (
    <Sheet
      visible
      testID="close-register-sheet"
      title="¿Cerrar la caja?"
      onClose={busy ? () => {} : onClose}
      footer={
        <View style={styles.actions}>
          <Button
            icon="lock-closed-outline"
            label={busy ? 'Cerrando…' : 'Confirmar cierre'}
            onPress={onConfirm}
            disabled={busy}
            style={styles.confirm}
          />
          <Button variant="secondary" label="Revisar de nuevo" onPress={onClose} disabled={busy} />
        </View>
      }
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <Text color="textSecondary">Ventas del cierre</Text>
          <Text variant="label">{formatColones(sales.total)}</Text>
        </View>
        <View style={styles.row}>
          <Text color="textSecondary">Efectivo esperado</Text>
          <Text variant="label">{formatColones(cash.expected)}</Text>
        </View>
        <View style={styles.row}>
          <Text color="textSecondary">Efectivo contado</Text>
          <Text variant="label">{formatColones(cash.counted)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text variant="title">{summary.kind === 'exact' ? 'La caja' : summary.caption}</Text>
          <Text variant="title" color={summary.color}>{summary.label}</Text>
        </View>
      </View>

      <Banner tone="warning" message="Al cerrar, los pedidos cobrados hasta ahora quedan incluidos en este cierre y no se pueden volver a cerrar." />
      {error ? <Banner tone="error" message={error} /> : null}
    </Sheet>
  );
}
