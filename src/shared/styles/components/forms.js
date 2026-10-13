import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';

export const styles = StyleSheet.create({
  group: commonStyles.group,
  chips: commonStyles.chips,
  row: commonStyles.rowBetween,
  section: { gap: theme.spacing.md },
  linkGroup: { gap: theme.spacing.md },
  iconChip: { minWidth: theme.sizes.touchTargetCompact, paddingHorizontal: theme.spacing.md },
  optionInfo: { flexGrow: 1, flexShrink: 1, flexBasis: theme.layout.optionInfoBasis, minWidth: 0 },
});
