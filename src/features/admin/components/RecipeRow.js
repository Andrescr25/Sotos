import { formatPortions } from '@/domain/inventory';
import { Button, ListRow } from '@/shared/ui';

/**
 * Un producto o extra con un resumen de lo que gasta del inventario.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.icon]
 * @param {import('@/domain/inventory').RecipeLine[]} props.lines
 * @param {Map<string, import('@/domain/inventory').InventoryItem>} props.itemsById
 * @param {boolean} props.busy
 * @param {() => void} props.onEdit
 */
export function RecipeRow({ title, subtitle, icon = 'restaurant-outline', lines, itemsById, busy, onEdit }) {
  const summary = lines
    .map((line) => {
      const item = itemsById.get(line.itemId);
      return item ? `${item.name}: ${formatPortions(line.portions, item)}` : null;
    })
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      detail={summary || 'Sin receta: no descuenta inventario'}
      detailColor={summary ? 'primary' : 'textSecondary'}
    >
      <Button compact variant="secondary" icon="create-outline" label={summary ? 'Editar receta' : 'Agregar receta'} accessibilityLabel={`${summary ? 'Editar' : 'Agregar'} receta de ${title}`} onPress={onEdit} disabled={busy} />
    </ListRow>
  );
}
