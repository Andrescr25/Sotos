import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { formatColones } from '@/shared/utils/money';
import { formatDateTime } from '@/shared/utils/time';
import { ListRow, Text } from '@/shared/ui';
import { describeDifference } from '../cashDifference';

/**
 * Cierres anteriores, del más reciente al más antiguo.
 *
 * @param {Object} props
 * @param {import('@/domain/cashClosing').CashClosing[]} props.closings
 */
export function ClosingHistory({ closings }) {
  return (
    <View style={commonStyles.section}>
      <Text variant="title">Cierres anteriores</Text>
      {closings.length === 0 ? (
        <Text color="textSecondary">Aún no se ha cerrado la caja.</Text>
      ) : (
        closings.map((closing) => {
          const difference = describeDifference(closing.cash.difference);
          return (
            <ListRow
              key={closing.id}
              icon="wallet-outline"
              title={`Cierre #${closing.number}`}
              subtitle={[`${formatDateTime(closing.closedAt)} · ${closing.closedBy.name}`, closing.note].filter(Boolean).join(' · ')}
              value={formatColones(closing.sales.total)}
              detail={`Efectivo contado ${formatColones(closing.cash.counted)} · ${difference.kind === 'exact' ? 'Cuadró' : `${difference.caption}: ${difference.label}`}`}
              detailColor={difference.color}
            />
          );
        })
      )}
    </View>
  );
}
