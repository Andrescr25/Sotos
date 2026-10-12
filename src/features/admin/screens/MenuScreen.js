import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PRODUCT_KIND_LABELS, isMenuEmpty } from '@/domain/menu';
import { SessionBar } from '@/features/auth';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { Banner, Button, Chip, Icon, Screen, Spinner, Text, TextField } from '@/shared/ui';
import { CategoryFormSheet } from '../components/CategoryFormSheet';
import { ExtraFormSheet } from '../components/ExtraFormSheet';
import { MenuItemRow } from '../components/MenuItemRow';
import { ProductFormSheet } from '../components/ProductFormSheet';
import { useMenuAdmin } from '../hooks/useMenuAdmin';

const TABS = [
  { key: 'products', label: 'Platillos y bebidas' },
  { key: 'extras', label: 'Extras' },
  { key: 'categories', label: 'Categorías' },
  { key: 'notes', label: 'Observaciones' },
];

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

/**
 * Menú del restaurante (solo administrador): platillos, bebidas, extras,
 * categorías y observaciones frecuentes. Caja lo recibe en vivo.
 */
export default function MenuScreen() {
  const router = useRouter();
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
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <View style={commonStyles.row}>
          <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={() => router.back()} />
          <Text variant="headline" style={styles.title}>Menú</Text>
        </View>
        <SessionBar />
      </View>

      {error ? <Banner tone="error" message={getErrorMessage(error)} style={styles.banner} onDismiss={admin.clearError} /> : null}

      {admin.loading || !menu ? (
        <Spinner message="Cargando menú…" />
      ) : (
        <>
          {isMenuEmpty(menu) ? (
            <View style={[commonStyles.card, styles.empty]}>
              <Icon name="restaurant" size="lg" color="primary" />
              <Text variant="title">Tu menú está vacío</Text>
              <Text color="textSecondary" style={styles.emptyText}>
                Empieza creando una categoría y luego tus platillos y bebidas, o carga un menú de
                ejemplo y edítalo a tu gusto.
              </Text>
              <View style={styles.emptyActions}>
                <Button icon="add-circle" label="Crear mi primera categoría" onPress={() => { setTab('categories'); openSheet({ type: 'category' }); }} />
                <Button
                  variant="secondary"
                  icon="sparkles"
                  label="Cargar menú de ejemplo"
                  onPress={admin.loadSampleMenu}
                  disabled={admin.busy}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.tabs}>
            {TABS.map((item) => (
              <Chip key={item.key} label={item.label} selected={tab === item.key} onPress={() => setTab(item.key)} />
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {tab === 'products' ? (
              <>
                <View style={styles.toolbar}>
                  <View style={styles.filters}>
                    <Chip label="Todas" selected={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
                    {[...menu.categories].sort(bySortOrder).map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        selected={categoryFilter === category.id}
                        onPress={() => setCategoryFilter(category.id)}
                      />
                    ))}
                  </View>
                  <Button
                    icon="add-circle"
                    label="Nuevo producto"
                    disabled={menu.categories.length === 0}
                    onPress={() =>
                      openSheet({ type: 'product', defaultCategoryId: categoryFilter === 'all' ? null : categoryFilter })
                    }
                  />
                </View>

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
                <View style={styles.toolbar}>
                  <Text color="textSecondary" style={styles.hint}>
                    Los extras se asignan a cada producto al crearlo o editarlo.
                  </Text>
                  <Button icon="add-circle" label="Nuevo extra" onPress={() => openSheet({ type: 'extra' })} />
                </View>
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
                <View style={styles.toolbar}>
                  <Text color="textSecondary" style={styles.hint}>
                    Las categorías son los botones que ve el cajero para encontrar los productos.
                  </Text>
                  <Button icon="add-circle" label="Nueva categoría" onPress={() => openSheet({ type: 'category' })} />
                </View>
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
          </ScrollView>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg, gap: theme.spacing.lg },
  title: { marginLeft: theme.spacing.lg },
  banner: { marginBottom: theme.spacing.md },
  empty: { alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  emptyText: { textAlign: 'center', maxWidth: 560 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, flexShrink: 1 },
  hint: { flexShrink: 1 },
  noteForm: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.md },
  noteInput: { flex: 1 },
  notes: { gap: theme.spacing.sm },
  noteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  noteText: { flex: 1 },
});
