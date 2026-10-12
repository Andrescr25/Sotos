import { Pressable, StyleSheet, View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Icon, Text, Toggle } from '@/shared/ui';

/**
 * Renglón de la lista del menú: nombre, detalle, precio, visibilidad, orden
 * y editar. Sirve para productos, extras y categorías.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.price]  ya formateado
 * @param {string} [props.icon]
 * @param {boolean} props.active
 * @param {boolean} props.busy
 * @param {(active: boolean) => void} props.onToggleActive
 * @param {() => void} props.onMoveUp
 * @param {() => void} props.onMoveDown
 * @param {() => void} props.onEdit
 */
export function MenuItemRow({ title, subtitle, price, icon, active, busy, onToggleActive, onMoveUp, onMoveDown, onEdit }) {
  return (
    <View style={[commonStyles.card, styles.row, !active && styles.hidden]}>
      {icon ? <Icon name={icon} color="primary" /> : null}

      <View style={styles.info}>
        <Text variant="bodyLarge" style={styles.title}>{title}</Text>
        {subtitle ? <Text color="textSecondary">{subtitle}</Text> : null}
      </View>

      {price ? <Text variant="title">{price}</Text> : null}

      <Toggle label="Visible" value={active} disabled={busy} onValueChange={onToggleActive} />

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${title}`} disabled={busy} onPress={onMoveUp} style={styles.iconButton}>
          <Icon name="chevron-up" color="textSecondary" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Bajar ${title}`} disabled={busy} onPress={onMoveDown} style={styles.iconButton}>
          <Icon name="chevron-down" color="textSecondary" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${title}`} onPress={onEdit} style={styles.iconButton}>
          <Icon name="create" color="primary" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, flexWrap: 'wrap' },
  hidden: { opacity: 0.55 },
  info: { flexGrow: 1, flexShrink: 1, minWidth: 160, gap: theme.spacing.xs },
  title: { fontWeight: theme.fontWeights.bold },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
});
