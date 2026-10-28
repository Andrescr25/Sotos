import { View } from 'react-native';
import { styles } from '@/shared/styles/screens/cashClosing';
import { formatColones } from '@/shared/utils/money';
import { formatDateTime } from '@/shared/utils/time';
import { Text } from '@/shared/ui';
import { describeDifference } from '../cashDifference';

/**
 * Cierres anteriores, del más reciente al más antiguo.
 *
 * @param {Object} props
 * @param {import('@/domain/cashClosing').CashClosing[]} props.closings
 */
export function ClosingHistory({ closings }) {
  return (
    <View style={styles.history}>
      <Text variant="title">Cierres anteriores</Text>
      {closings.length === 0 ? (
        <Text color="textSecondary">Aún no se ha cerrado la caja.</Text>
      ) : (
        closings.map((closing) => {
          const difference = describeDifference(closing.cash.difference);
          return (
            <View key={closing.id} style={styles.historyRow}>
              <View style={styles.row}>
                <View style={styles.historyIdentity}>
                  <Text variant="bodyLarge">{`Cierre #${closing.number}`}</Text>
                  <Text variant="caption" color="textSecondary">{`${formatDateTime(closing.closedAt)} · ${closing.closedBy.name}`}</Text>
                </View>
                <Text variant="title" color="primary">{formatColones(closing.sales.total)}</Text>
              </View>
              <View style={styles.row}>
                <Text color="textSecondary">{`Efectivo contado ${formatColones(closing.cash.counted)}`}</Text>
                <Text variant="label" color={difference.color}>
                  {difference.kind === 'exact' ? 'Cuadró' : `${difference.caption}: ${difference.label}`}
                </Text>
              </View>
              {closing.note ? <Text variant="caption" color="textSecondary">{closing.note}</Text> : null}
            </View>
          );
        })
      )}
    </View>
  );
}
