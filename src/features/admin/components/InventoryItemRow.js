import { STOCK_STATUS, describeStock, getStockStatus } from '@/domain/inventory';
import { styles } from '@/shared/styles/components/inventory';
import { Button, IconButton, ListRow, Text } from '@/shared/ui';

const STATUS = {
  [STOCK_STATUS.OK]: { color: 'textPrimary', label: null },
  [STOCK_STATUS.LOW]: { color: 'warning', label: 'Por reponer' },
  [STOCK_STATUS.OUT]: { color: 'danger', label: 'Agotado' },
};

/**
 * Un insumo con lo que queda: unidades y fracciones ("2 y 3/8 paquetes") y las
 * porciones exactas. Avisa si hay que reponerlo.
 *
 * @param {Object} props
 * @param {import('@/domain/inventory').InventoryItem} props.item
 * @param {boolean} props.busy
 * @param {() => void} props.onAdjust
 * @param {() => void} props.onEdit
 */
export function InventoryItemRow({ item, busy, onAdjust, onEdit }) {
  const status = STATUS[getStockStatus(item)];
  const perUnit =
    item.portionsPerUnit === 1 ? `Se cuenta por ${item.unit}` : `${item.portionsPerUnit} porciones por ${item.unit}`;

  return (
    <ListRow
      icon="cube-outline"
      title={item.name}
      subtitle={perUnit}
      aside={
        <>
          <Text color={status.color} style={styles.stockValue}>{describeStock(item)}</Text>
          <Text variant="caption" color="textSecondary">{`${item.stock} ${Math.abs(item.stock) === 1 ? 'porción' : 'porciones'}`}</Text>
          {status.label ? <Text variant="caption" color={status.color}>{status.label}</Text> : null}
        </>
      }
    >
      <Button compact variant="secondary" icon="swap-vertical-outline" label="Ajustar stock" accessibilityLabel={`Ajustar stock de ${item.name}`} onPress={onAdjust} disabled={busy} />
      <IconButton icon="create-outline" label={`Editar ${item.name}`} color="primary" disabled={busy} onPress={onEdit} />
    </ListRow>
  );
}
