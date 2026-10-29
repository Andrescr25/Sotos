import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { PRODUCT_KIND_LABELS, isMenuEmpty } from '@/domain/menu';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/screens/menu';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { formatColones } from '@/shared/utils/money';
import { Banner, Button, Chip, ChipRow, EmptyState, Spinner, Tabs, Text, TextField, Toolbar } from '@/shared/ui';
import { CategoryFormSheet } from '../components/CategoryFormSheet';
import { ExtraFormSheet } from '../components/ExtraFormSheet';
import { MenuItemRow } from '../components/MenuItemRow';
import { ProductFormSheet } from '../components/ProductFormSheet';
import { useMenuAdmin } from '../hooks/useMenuAdmin';

const TABS = [
  { key: 'products', label: 'Platillos y bebidas', icon: 'restaurant-outline' },
  { key: 'extras', label: 'Extras', icon: 'add-circle-outline' },
  { key: 'categories', label: 'Categorías', icon: 'grid-outline' },
  { key: 'notes', label: 'Observaciones', icon: 'chatbubble-outline' },
];

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

/**
 * Menú del restaurante (solo administrador): platillos, bebidas, extras,
 * categorías y observaciones frecuentes. Caja lo recibe en vivo.
 */
export default function MenuScreen() {
  const admin = useMenuAdmin();
  const { menu } = admin;

  const [tab, setTab] = useState('products');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sheet, setSheet] = useState(null); // { type: 'product' | 'extra' | 'category', item?: object }
  const [noteText, setNoteText] = useState('');

  const closeSheet = () => {
    setSheet(null);
    admin.clearError();
  };
  const openSheet = (next) => {
    admin.clearError();
    setSheet(next);
  };

  const categoriesById = useMemo(
    () => new Map((menu?.categories ?? []).map((category) => [category.id, category])),
    [menu],
  );

  const products = useMemo(() => {
    if (!menu) return [];
    return menu.products
      .filter((product) => categoryFilter === 'all' || product.categoryId === categoryFilter)
      .sort(
        (a, b) =>
          (categoriesById.get(a.categoryId)?.sortOrder ?? 0) - (categoriesById.get(b.categoryId)?.sortOrder ?? 0) ||
          bySortOrder(a, b),
      );
  }, [menu, categoryFilter, categoriesById]);

  const productCountByCategory = useMemo(() => {
    const counts = new Map();
    (menu?.products ?? []).forEach((product) =>
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1),
    );
    return counts;
  }, [menu]);

  async function addNote() {
    const result = await admin.addQuickNote(noteText);
    if (result.ok) setNoteText('');
  }

  const error = admin.loadError ?? (sheet ? null : admin.actionError);

  return (
    <WorkspaceScreen section="menu" title="Menú" subtitle="Lo que servimos, siempre a mano." back scroll>
      {error ? <Banner tone="error" message={getErrorMessage(error)} onDismiss={admin.clearError} /> : null}

      {admin.loading || !menu ? (
        <Spinner message="Cargando menú…" />
      ) : (
        <>
          {isMenuEmpty(menu) ? (
            <EmptyState
              card
              icon="restaurant-outline"
              title="Tu menú está vacío"
              message="Empieza creando una categoría y luego tus platillos y bebidas, o carga un menú de ejemplo y edítalo a tu gusto."
            >
              <View style={commonStyles.actionRow}>
                <Button icon="add-circle" label="Crear mi primera categoría" onPress={() => { setTab('categories'); openSheet({ type: 'category' }); }} />
                <Button
                  variant="secondary"
                  icon="sparkles"
                  label="Cargar menú de ejemplo"
                  onPress={admin.loadSampleMenu}
                  disabled={admin.busy}
                />
              </View>
            </EmptyState>
          ) : null}

          <Tabs tabs={TABS} value={tab} onChange={setTab} />

          <View style={commonStyles.section}>
            {tab === 'products' ? (
              <>
                <Toolbar>
                  <ChipRow>
                    <Chip label="Todas" selected={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
                    {[...menu.categories].sort(bySortOrder).map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        selected={categoryFilter === category.id}
                        onPress={() => setCategoryFilter(category.id)}
                      />
                    ))}
                  </ChipRow>
                  <Button
                    icon="add-circle"
                    label="Nuevo producto"
                    disabled={menu.categories.length === 0}
                    onPress={() =>
                      openSheet({ type: 'product', defaultCategoryId: categoryFilter === 'all' ? null : categoryFilter })
                    }
                  />
                </Toolbar>

                {menu.categories.length === 0 ? (
                  <Banner tone="info" message="Primero crea una categoría en la pestaña “Categorías”." />
                ) : null}
                {products.length === 0 && menu.categories.length > 0 ? (
                  <Text color="textSecondary">No hay productos en esta vista.</Text>
                ) : null}

                {products.map((product) => (
                  <MenuItemRow
                    key={product.id}
                    title={product.name}
                    subtitle={[
                      PRODUCT_KIND_LABELS[product.kind],
                      categoriesById.get(product.categoryId)?.name,
                      product.extraIds.length > 0 ? `${product.extraIds.length} extra(s)` : null,
                      product.active ? null : 'Oculto',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    price={formatColones(product.price)}
                    icon={product.kind === 'drink' ? 'cafe-outline' : 'fast-food-outline'}
                    active={product.active}
                    busy={admin.busy}
                    onToggleActive={(active) => admin.updateProduct(product.id, { active })}
                    onMoveUp={() => admin.moveProduct(product.id, 'up')}
                    onMoveDown={() => admin.moveProduct(product.id, 'down')}
                    onEdit={() => openSheet({ type: 'product', item: product })}
                  />
                ))}
              </>
            ) : null}

            {tab === 'extras' ? (
              <>
                <Toolbar hint="Los extras se asignan a cada producto al crearlo o editarlo.">
                  <Button icon="add-circle" label="Nuevo extra" onPress={() => openSheet({ type: 'extra' })} />
                </Toolbar>
                {menu.extras.length === 0 ? <Text color="textSecondary">Todavía no hay extras.</Text> : null}
                {[...menu.extras].sort(bySortOrder).map((extra) => (
                  <MenuItemRow
                    key={extra.id}
                    title={extra.name}
                    subtitle={[
                      `Lo ofrecen ${menu.products.filter((p) => p.extraIds.includes(extra.id)).length} producto(s)`,
                      extra.active ? null : 'Oculto',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    price={formatColones(extra.price)}
                    icon="add-circle-outline"
                    active={extra.active}
                    busy={admin.busy}
                    onToggleActive={(active) => admin.updateExtra(extra.id, { active })}
                    onMoveUp={() => admin.moveExtra(extra.id, 'up')}
                    onMoveDown={() => admin.moveExtra(extra.id, 'down')}
                    onEdit={() => openSheet({ type: 'extra', item: extra })}
                  />
                ))}
              </>
            ) : null}

            {tab === 'categories' ? (
              <>
                <Toolbar hint="Las categorías son los botones que ve el cajero para encontrar los productos.">
                  <Button icon="add-circle" label="Nueva categoría" onPress={() => openSheet({ type: 'category' })} />
                </Toolbar>
                {menu.categories.length === 0 ? <Text color="textSecondary">Todavía no hay categorías.</Text> : null}
                {[...menu.categories].sort(bySortOrder).map((category) => {
                  const count = productCountByCategory.get(category.id) ?? 0;
                  return (
                    <MenuItemRow
                      key={category.id}
                      icon={category.icon ?? 'albums'}
                      title={category.name}
                      subtitle={[`${count} producto(s)`, category.active ? null : 'Oculta'].filter(Boolean).join(' · ')}
                      active={category.active}
                      busy={admin.busy}
                      onToggleActive={(active) => admin.updateCategory(category.id, { active })}
                      onMoveUp={() => admin.moveCategory(category.id, 'up')}
                      onMoveDown={() => admin.moveCategory(category.id, 'down')}
                      onEdit={() => openSheet({ type: 'category', item: category })}
                    />
                  );
                })}
              </>
            ) : null}

            {tab === 'notes' ? (
              <>
                <Text color="textSecondary">
                  Atajos que el cajero toca para agregar una observación a un producto (ej. “Sin cebolla”).
                </Text>
                <View style={styles.noteForm}>
                  <TextField
                    style={styles.noteInput}
                    placeholder="Nueva observación"
                    value={noteText}
                    onChangeText={setNoteText}
                    autoCapitalize="sentences"
                    onSubmitEditing={addNote}
                  />
                  <Button icon="add-circle" label="Agregar" onPress={addNote} disabled={admin.busy || !noteText.trim()} />
                </View>
                {menu.quickNotes.length === 0 ? <Text color="textSecondary">Todavía no hay observaciones.</Text> : null}
                <View style={styles.notes}>
                  {menu.quickNotes.map((note) => (
                    <View key={note} style={[commonStyles.card, styles.noteRow]}>
                      <Text variant="bodyLarge" style={styles.noteText}>{note}</Text>
                      <Button
                        compact
                        variant="secondary"
                        icon="trash"
                        label="Quitar"
                        disabled={admin.busy}
                        onPress={() => admin.removeQuickNote(note)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </>
      )}

      {sheet?.type === 'product' && menu ? (
        <ProductFormSheet
          key={sheet.item?.id ?? 'new-product'}
          menu={menu}
          product={sheet.item ?? null}
          defaultCategoryId={sheet.defaultCategoryId}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(data) => (sheet.item ? admin.updateProduct(sheet.item.id, data) : admin.createProduct(data))}
          onDelete={() => admin.deleteProduct(sheet.item.id)}
          onClose={closeSheet}
        />
      ) : null}

      {sheet?.type === 'extra' ? (
        <ExtraFormSheet
          key={sheet.item?.id ?? 'new-extra'}
          extra={sheet.item ?? null}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(data) => (sheet.item ? admin.updateExtra(sheet.item.id, data) : admin.createExtra(data))}
          onDelete={() => admin.deleteExtra(sheet.item.id)}
          onClose={closeSheet}
        />
      ) : null}

      {sheet?.type === 'category' ? (
        <CategoryFormSheet
          key={sheet.item?.id ?? 'new-category'}
          category={sheet.item ?? null}
          productCount={sheet.item ? productCountByCategory.get(sheet.item.id) ?? 0 : 0}
          busy={admin.busy}
          error={admin.actionError}
          onSave={(data) => (sheet.item ? admin.updateCategory(sheet.item.id, data) : admin.createCategory(data))}
          onDelete={() => admin.deleteCategory(sheet.item.id)}
          onClose={closeSheet}
        />
      ) : null}
    </WorkspaceScreen>
  );
}
