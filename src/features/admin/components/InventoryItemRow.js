import { Pressable, View } from 'react-native';
import { STOCK_STATUS, describeStock, getStockStatus } from '@/domain/inventory';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/inventory';
import { Button, Icon, Text } from '@/shared/ui';

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
    <View style={styles.row}>
      <View style={styles.identity}>
        <View style={commonStyles.iconWell}><Icon name="cube-outline" color="primary" /></View>
        <View style={styles.info}>
          <Text variant="bodyLarge" style={styles.title}>{item.name}</Text>
          <Text variant="caption" color="textSecondary">{perUnit}</Text>
        </View>
      </View>

      <View style={styles.stock}>
        <Text color={status.color} style={styles.stockValue}>{describeStock(item)}</Text>
        <Text variant="caption" color="textSecondary">{`${item.stock} ${Math.abs(item.stock) === 1 ? 'porción' : 'porciones'}`}</Text>
        {status.label ? <Text variant="caption" color={status.color}>{status.label}</Text> : null}
      </View>

      <View style={styles.controls}>
        <Button compact variant="secondary" icon="swap-vertical-outline" label="Ajustar stock" accessibilityLabel={`Ajustar stock de ${item.name}`} onPress={onAdjust} disabled={busy} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={onEdit} style={commonStyles.iconButton}>
          <Icon name="create-outline" size="sm" color="primary" />
        </Pressable>
      </View>
    </View>
  );
}
