import { View } from 'react-native';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { workspaceStyles as styles } from '@/shared/styles/layout/workspace';
import { Button, IconButton, Text } from '@/shared/ui';

/**
 * Cabecera de página: título, explicación y acciones. Con poco espacio vertical
 * (`compact`) "Volver" pasa a ser un botón de icono junto al título, y con muy
 * poca altura (`short`) se omite la explicación. `WorkspaceScreen` decide si la
 * cabecera queda fija o se desplaza con la página.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 * @param {() => void} [props.onBack]  si se da, muestra "Volver"
 */
export function PageHeader({ title, subtitle, actions, onBack }) {
  const { mobile, compact, short } = useResponsiveLayout();

  return (
    <View style={[styles.pageHeader, compact && styles.pageHeaderCompact]}>
      {onBack && !compact ? (
        <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={onBack} style={styles.back} />
      ) : null}
      <View style={styles.pageHeaderRow}>
        {onBack && compact ? <IconButton icon="arrow-back" label="Volver" onPress={onBack} /> : null}
        <View style={styles.headingCopy}>
          <Text variant="headline" accessibilityRole="header" style={[styles.title, mobile && styles.titleMobile]}>{title}</Text>
          {subtitle && !short ? <Text color="textSecondary" style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}
