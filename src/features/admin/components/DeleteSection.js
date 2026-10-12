import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Banner, Button } from '@/shared/ui';

/**
 * Eliminar en dos pasos (primero "Eliminar", luego "Sí, eliminar"), dentro de
 * la misma ventana: en tablets y en la web no se puede confiar en `Alert`.
 *
 * @param {Object} props
 * @param {string} props.itemLabel  p. ej. "producto", "extra", "categoría"
 * @param {string} [props.note]  consecuencias, p. ej. "Se quitará de los productos que lo ofrecen."
 * @param {boolean} props.busy
 * @param {() => void} props.onConfirm
 */
export function DeleteSection({ itemLabel, note, busy, onConfirm }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button
        variant="secondary"
        icon="trash"
        label={`Eliminar ${itemLabel}`}
        onPress={() => setAsking(true)}
        disabled={busy}
      />
    );
  }

  return (
    <View style={styles.confirm}>
      <Banner tone="warning" message={`¿Eliminar este ${itemLabel}? ${note ?? ''}`.trim()} />
      <View style={styles.actions}>
        <Button
          variant="danger"
          icon="trash"
          label="Sí, eliminar"
          onPress={onConfirm}
          disabled={busy}
          style={styles.action}
        />
        <Button
          variant="secondary"
          label="Cancelar"
          onPress={() => setAsking(false)}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { flex: 1 },
});
