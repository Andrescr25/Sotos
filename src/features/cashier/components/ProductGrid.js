import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PRODUCT_KIND } from '@/domain/menu';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { Icon, Text } from '@/shared/ui';

/**
 * Productos de la categoría elegida. Un toque agrega una unidad; si el
 * producto tiene extras se abre la ventana de opciones.
 *
 * @param {Object} props
 * @param {import('@/domain/menu/types').Product[]} props.products
 * @param {Set<string> | string[]} props.withOptions  ids de productos con extras disponibles
 * @param {(product: import('@/domain/menu/types').Product) => void} props.onPick
 */
export function ProductGrid({ products, withOptions, onPick }) {
  const optionIds = new Set(withOptions);

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {products.map((product) => (
        <Pressable
          key={product.id}
          accessibilityRole="button"
          accessibilityLabel={`${product.name}, ${formatColones(product.price)}`}
          onPress={() => onPick(product)}
          style={({ pressed }) => [commonStyles.card, styles.card, pressed && styles.pressed]}
        >
          <Icon
            name={product.kind === PRODUCT_KIND.DRINK ? 'cafe' : 'fast-food'}
            size="lg"
            color="primary"
          />
          <Text variant="bodyLarge" style={styles.name}>
            {product.name}
          </Text>
          <Text variant="title">{formatColones(product.price)}</Text>
          {optionIds.has(product.id) ? (
            <Text variant="caption" color="textSecondary">
              Con extras
            </Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    flexGrow: 1,
    flexBasis: 170,
    maxWidth: 260,
    minHeight: 150,
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  pressed: { backgroundColor: theme.colors.primarySoft },
  name: { fontWeight: theme.fontWeights.bold },
});
