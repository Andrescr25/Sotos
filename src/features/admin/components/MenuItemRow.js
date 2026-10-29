import { IconButton, ListRow, Toggle } from '@/shared/ui';

/** La misma fila sirve para productos, extras y categorías; los controles se acomodan solos. */
export function MenuItemRow({ title, subtitle, price, icon = 'restaurant-outline', active, busy, onToggleActive, onMoveUp, onMoveDown, onEdit }) {
  return (
    <ListRow icon={icon} title={title} subtitle={subtitle} value={price} muted={!active}>
      <Toggle label="Visible" value={active} disabled={busy} onValueChange={onToggleActive} />
      <IconButton icon="chevron-up" label={`Subir ${title}`} disabled={busy} onPress={onMoveUp} />
      <IconButton icon="chevron-down" label={`Bajar ${title}`} disabled={busy} onPress={onMoveDown} />
      <IconButton icon="create-outline" label={`Editar ${title}`} color="primary" disabled={busy} onPress={onEdit} />
    </ListRow>
  );
}
