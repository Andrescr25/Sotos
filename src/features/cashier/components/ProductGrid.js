import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { PRODUCT_KIND } from '@/domain/menu';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/productGrid';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { EmptyState, Icon, Text } from '@/shared/ui';

/** La cuadrícula se calcula sobre su ancho real, incluyendo el panel del pedido. */
export function ProductGrid({ products, withOptions, onPick, scrollable = true }) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useResponsiveLayout();
  const optionIds = useMemo(() => new Set(withOptions), [withOptions]);
  const minWidth = (width / fontScale < theme.layout.mobileBreakpoint
    ? theme.layout.productMobileMinWidth : theme.layout.productMinWidth) * fontScale;
  const columns = Math.max(1, Math.min(theme.layout.productMaxColumns, Math.floor((width + theme.spacing.md) / (minWidth + theme.spacing.md))));
  const cardWidth = width > 0 ? (width - theme.spacing.md * (columns - 1)) / columns : undefined;
  const empty = <EmptyState title="Sin productos en esta categoría" message="Elige otra categoría para continuar." />;

  function renderProduct(product) {
    return (
      <Pressable
        key={product.id}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatColones(product.price)}`}
        onPress={() => onPick(product)}
        style={({ pressed }) => [commonStyles.card, styles.card, { width: cardWidth }, pressed && styles.pressed]}
      >
        <View style={styles.top}>
          <View style={commonStyles.iconWell}><Icon name={product.kind === PRODUCT_KIND.DRINK ? 'cafe-outline' : 'fast-food-outline'} color="primary" /></View>
          {optionIds.has(product.id) ? <Icon name="options-outline" size="sm" color="textSecondary" /> : null}
        </View>
        <View style={commonStyles.group}>
          <Text style={styles.name}>{product.name}</Text>
          <Text color="textSecondary" style={styles.hint}>{optionIds.has(product.id) ? 'Con extras' : 'Listo para agregar'}</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.price}>{formatColones(product.price)}</Text>
          <Icon name="add-circle-outline" size="sm" color="primary" />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, scrollable && styles.fill]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {scrollable ? (
        <FlatList
          key={columns}
          data={products}
          numColumns={columns}
          keyExtractor={(product) => product.id}
          renderItem={({ item }) => renderProduct(item)}
          ListEmptyComponent={empty}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridList}
          style={styles.fill}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.grid}>{products.length ? products.map(renderProduct) : empty}</View>
      )}
    </View>
  );
}
