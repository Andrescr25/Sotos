import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

/** Lo propio de los formularios en modales; grupos, chips y filas salen de `commonStyles`. */
export const styles = StyleSheet.create({
  section: { gap: theme.spacing.md },
  iconChip: { minWidth: theme.sizes.touchTargetCompact, paddingHorizontal: theme.spacing.md },
  optionInfo: { flexGrow: 1, flexShrink: 1, flexBasis: theme.layout.optionInfoBasis, minWidth: 0 },
});
