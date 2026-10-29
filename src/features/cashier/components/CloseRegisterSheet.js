import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { formatColones } from '@/shared/utils/money';
import { Banner, DataRow, Sheet } from '@/shared/ui';
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
      primaryAction={{ icon: 'lock-closed-outline', label: busy ? 'Cerrando…' : 'Confirmar cierre', onPress: onConfirm, disabled: busy }}
      secondaryAction={{ label: 'Revisar de nuevo', onPress: onClose, disabled: busy }}
    >
      <View style={commonStyles.panel}>
        <DataRow label="Ventas del cierre" value={formatColones(sales.total)} />
        <DataRow label="Efectivo esperado" value={formatColones(cash.expected)} />
        <DataRow label="Efectivo contado" value={formatColones(cash.counted)} />
        <View style={commonStyles.divider} />
        <DataRow strong label={summary.kind === 'exact' ? 'La caja' : summary.caption} value={summary.label} tone={summary.color} />
      </View>

      <Banner tone="warning" message="Al cerrar, los pedidos cobrados hasta ahora quedan incluidos en este cierre y no se pueden volver a cerrar." />
      {error ? <Banner tone="error" message={error} /> : null}
    </Sheet>
  );
}
