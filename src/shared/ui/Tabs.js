import { View } from 'react-native';
import { styles } from '@/shared/styles/components/tabs';
import { Chip } from './Chip';
import { ChipRow } from './ChipRow';

/**
 * Pestañas de una pantalla (Insumos / Recetas, Platillos / Extras…).
 *
 * @param {Object} props
 * @param {{ key: string, label: string, icon?: string }[]} props.tabs
 * @param {string} props.value  clave de la pestaña activa
 * @param {(key: string) => void} props.onChange
 */
export function Tabs({ tabs, value, onChange }) {
  return (
    <View style={styles.tabs}>
      <ChipRow>
        {tabs.map((tab) => (
          <Chip key={tab.key} label={tab.label} icon={tab.icon} selected={value === tab.key} onPress={() => onChange(tab.key)} />
        ))}
      </ChipRow>
    </View>
  );
}
