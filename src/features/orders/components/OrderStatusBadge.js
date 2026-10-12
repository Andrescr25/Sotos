import { StyleSheet, View } from 'react-native';
import { ORDER_STATUS_LABELS } from '@/domain/orders';
import { theme } from '@/shared/theme';
import { Text } from '@/shared/ui';

/** Etiqueta con el color del estado del pedido (colores en shared/theme). */
export function OrderStatusBadge({ status }) {
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.status[status] }]}>
      <Text variant="label" color="textInverse">
        {ORDER_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
});
