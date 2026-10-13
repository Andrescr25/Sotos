import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { cardStyles as styles } from '@/shared/styles/components/cards';
import { Icon } from './Icon';
import { Text } from './Text';

export function MetricCard({ label, value, icon, hint, color = 'primary' }) {
  return (
    <View style={[commonStyles.card, styles.metric]}>
      <View style={styles.metricTop}>
        <Text color="textSecondary" style={styles.metricLabel}>{label}</Text>
        <Icon name={icon} size="sm" color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <View style={styles.badge}><Text variant="caption" color="textSecondary">{hint}</Text></View> : null}
    </View>
  );
}
