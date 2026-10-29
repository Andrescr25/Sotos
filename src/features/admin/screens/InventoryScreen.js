import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { RECIPE_KIND, STOCK_STATUS, getStockStatus } from '@/domain/inventory';
import { PRODUCT_KIND_LABELS } from '@/domain/menu';
import { useMenu } from '@/features/menu/useMenu';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { commonStyles } from '@/shared/styles/commonStyles';
import { getErrorMessage } from '@/shared/errors/messages';
import { styles } from '@/shared/styles/screens/inventory';
import { Banner, Button, EmptyState, Spinner, Tabs, Text, Toolbar } from '@/shared/ui';
import { InventoryItemFormSheet } from '../components/InventoryItemFormSheet';
import { InventoryItemRow } from '../components/InventoryItemRow';
import { RecipeRow } from '../components/RecipeRow';
import { RecipeSheet } from '../components/RecipeSheet';
import { StockAdjustSheet } from '../components/StockAdjustSheet';
import { useInventoryAdmin } from '../hooks/useInventoryAdmin';

const TABS = [
  { key: 'items', label: 'Insumos', icon: 'cube-outline' },
  { key: 'recipes', label: 'Recetas', icon: 'restaurant-outline' },
];

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;
const byName = (a, b) => a.name.localeCompare(b.name, 'es');

/**
 * Inventario (solo administrador). Los insumos son lo que se compra (un paquete
 * de papas) y rinden cierta cantidad de porciones; la receta de cada platillo,
 * bebida o extra dice cuántas porciones usa. Cada venta descuenta sola.
 */
export default function InventoryScreen() {
  const admin = useInventoryAdmin();
  const { inventory } = admin;
  const { menu } = useMenu();

  const [tab, setTab] = useState('items');
  // { type: 'item', item? } | { type: 'adjust', item } | { type: 'recipe', kind, target }
  const [sheet, setSheet] = useState(null);

  const closeSheet = () => {
    setSheet(null);
    admin.clearError();
  };
  const openSheet = (next) => {
    admin.clearError();
    setSheet(next);
  };

  const items = useMemo(() => [...(inventory?.items ?? [])].sort(byName), [inventory]);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const toRestock = items.filter((item) => getStockStatus(item) !== STOCK_STATUS.OK).length;

  const categoriesById = useMemo(
    () => new Map((menu?.categories ?? []).map((category) => [category.id, category])),
    [menu],
  );
  const products = useMemo(
    () =>
      [...(menu?.products ?? [])].sort(
        (a, b) =>
          (categoriesById.get(a.categoryId)?.sortOrder ?? 0) - (categoriesById.get(b.categoryId)?.sortOrder ?? 0) ||
          bySortOrder(a, b),
      ),
    [menu, categoriesById],
  );

  const error = admin.loadError ?? (sheet ? null : admin.actionError);
  const recipeLines = (kind, id) => inventory?.recipes[kind][id] ?? [];

  return (
    <WorkspaceScreen section="inventory" title="Inventario" subtitle="Cuánto queda de cada insumo y cuánto gasta cada platillo." back scroll>
      {error ? <Banner tone="error" message={getErrorMessage(error)} onDismiss={admin.clearError} /> : null}

      {admin.loading || !inventory ? (
        <Spinner message="Cargando inventario…" />
      ) : (
        <>
          {items.length === 0 ? (
            <EmptyState
              card
              icon="cube-outline"
              title="Todavía no hay insumos"
              message="Un insumo es lo que compras, por ejemplo un paquete de papas. Dices cuántas porciones rinde (8, por ejemplo) y en la receta de cada platillo cuántas usa: cada venta rebaja esas porciones sola."
            >
              <Button icon="add-circle" label="Crear mi primer insumo" onPress={() => { setTab('items'); openSheet({ type: 'item' }); }} />
            </EmptyState>
          ) : null}

          <Tabs tabs={TABS} value={tab} onChange={setTab} />

          <View style={commonStyles.section}>
            {tab === 'items' ? (
              <>
                <Toolbar hint="El stock se actualiza solo con cada venta. Ajústalo cuando compres, haya merma o hagas un conteo.">
                  <Button icon="add-circle" label="Nuevo insumo" onPress={() => openSheet({ type: 'item' })} />
                </Toolbar>

                {toRestock > 0 ? (
                  <Banner tone="warning" message={`${toRestock} ${toRestock === 1 ? 'insumo está agotado o por reponer' : 'insumos están agotados o por reponer'}.`} />
                ) : null}

                {items.map((item) => (
                  <InventoryItemRow
                    key={item.id}
                    item={item}
                    busy={admin.busy}
                    onAdjust={() => openSheet({ type: 'adjust', item })}
                    onEdit={() => openSheet({ type: 'item', item })}
                  />
                ))}
              </>
            ) : null}

            {tab === 'recipes' ? (
              <>
                <Text color="textSecondary">
                  La receta dice cuánto gasta UNA unidad vendida. Lo que no tenga receta no descuenta inventario.
                </Text>
                {items.length === 0 ? <Banner tone="info" message="Primero crea tus insumos en la pestaña “Insumos”." /> : null}
                {!menu || (products.length === 0 && menu.extras.length === 0) ? (
                  <Text color="textSecondary">Todavía no hay productos en el menú.</Text>
                ) : null}

                {products.map((product) => (
                  <RecipeRow
                    key={product.id}
                    title={product.name}
                    subtitle={[PRODUCT_KIND_LABELS[product.kind], categoriesById.get(product.categoryId)?.name].filter(Boolean).join(' · ')}
                    icon={product.kind === 'drink' ? 'cafe-outline' : 'fast-food-outline'}
                    lines={recipeLines(RECIPE_KIND.PRODUCTS, product.id)}
                    itemsById={itemsById}
                    busy={admin.busy || items.length === 0}
                    onEdit={() => openSheet({ type: 'recipe', kind: RECIPE_KIND.PRODUCTS, target: product })}
                  />
                ))}

                {menu?.extras.length ? <Text variant="title" style={styles.sectionTitle}>Extras</Text> : null}
                {[...(menu?.extras ?? [])].sort(bySortOrder).map((extra) => (
                  <RecipeRow
                    key={extra.id}
                    title={extra.name}
                    subtitle="Extra"
                    icon="add-circle-outline"
                    lines={recipeLines(RECIPE_KIND.EXTRAS, extra.id)}
                    itemsById={itemsById}
                    busy={admin.busy || items.length === 0}
                    onEdit={() => openSheet({ type: 'recipe', kind: RECIPE_KIND.EXTRAS, target: extra })}
                  />
                ))}
              </>
            ) : null}
          </View>
        </>
      )}

      {sheet?.type === 'item' ? (
        <InventoryItemFormSheet
          key={sheet.item?.id ?? 'new-item'}
          item={sheet.item ?? null}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(data) => (sheet.item ? admin.updateItem(sheet.item.id, data) : admin.createItem(data))}
          onDelete={() => admin.deleteItem(sheet.item.id)}
          onClose={closeSheet}
        />
      ) : null}

      {sheet?.type === 'adjust' ? (
        <StockAdjustSheet
          key={sheet.item.id}
          item={itemsById.get(sheet.item.id) ?? sheet.item}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(adjustment) => admin.adjustStock(sheet.item.id, adjustment)}
          onClose={closeSheet}
        />
      ) : null}

      {sheet?.type === 'recipe' ? (
        <RecipeSheet
          key={`${sheet.kind}-${sheet.target.id}`}
          title={sheet.target.name}
          items={items}
          lines={recipeLines(sheet.kind, sheet.target.id)}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(lines) => admin.setRecipe(sheet.kind, sheet.target.id, lines)}
          onClose={closeSheet}
        />
      ) : null}
    </WorkspaceScreen>
  );
}
