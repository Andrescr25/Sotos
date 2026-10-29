import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';
export const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.xl, padding: theme.spacing.xl },
  pending: { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
  disabled: { opacity: 0.65 },
  identity: { flexGrow: 1, flexShrink: 1, flexBasis: theme.layout.userIdentityBasis, minWidth: 0, gap: theme.spacing.sm },
  name: { fontWeight: theme.fontWeights.bold },
  controls: { flexShrink: 1, maxWidth: '100%', gap: theme.spacing.md, flexGrow: 1, flexBasis: theme.layout.userControlsBasis, minWidth: 0 },
  roles: commonStyles.chips,
});
