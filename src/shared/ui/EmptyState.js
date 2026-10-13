import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { cardStyles as styles } from '@/shared/styles/components/cards';
import { Icon } from './Icon';
import { Text } from './Text';

export function EmptyState({ icon = 'receipt-outline', title, message, children, style }) {
  return (
    <View style={[commonStyles.empty, style]}>
      <View style={commonStyles.iconWell}><Icon name={icon} color="primary" /></View>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      {message ? <Text variant="caption" color="textSecondary" style={commonStyles.emptyText}>{message}</Text> : null}
      {children}
    </View>
  );
}
