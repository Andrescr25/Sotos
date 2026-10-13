import { Pressable, View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/menuItemRow';
import { Icon, Text, Toggle } from '@/shared/ui';

/** La misma fila sirve para productos, extras y categorías; los controles se apilan. */
export function MenuItemRow({ title, subtitle, price, icon = 'restaurant-outline', active, busy, onToggleActive, onMoveUp, onMoveDown, onEdit }) {
  return (
    <View style={[commonStyles.card, styles.row, !active && styles.hidden]}>
      <View style={styles.identity}>
        <View style={commonStyles.iconWell}><Icon name={icon} color="primary" /></View>
        <View style={styles.info}>
          <Text variant="bodyLarge" style={styles.title}>{title}</Text>
          {subtitle ? <Text variant="caption" color="textSecondary">{subtitle}</Text> : null}
        </View>
      </View>
      {price ? <Text style={styles.price}>{price}</Text> : null}
      <View style={styles.controls}>
        <Toggle label="Visible" value={active} disabled={busy} onValueChange={onToggleActive} />
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${title}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={onMoveUp} style={commonStyles.iconButton}><Icon name="chevron-up" size="sm" color="textSecondary" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Bajar ${title}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={onMoveDown} style={commonStyles.iconButton}><Icon name="chevron-down" size="sm" color="textSecondary" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${title}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={onEdit} style={commonStyles.iconButton}><Icon name="create-outline" size="sm" color="primary" /></Pressable>
        </View>
      </View>
    </View>
  );
}
