import { useState } from 'react';
import { theme } from '@/shared/theme';
import { TextInput, View } from 'react-native';
import { styles } from '@/shared/styles/components/textField';
import { Text } from './Text';

/**
 * Campo de texto con etiqueta y mensaje de error. Recibe las mismas
 * propiedades que TextInput (value, onChangeText, secureTextEntry...).
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 */
export function TextField({ label, error, style, multiline, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? inputProps.placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, focused && styles.focused, error && styles.inputError]}
        {...inputProps}
        onFocus={(event) => { setFocused(true); inputProps.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); inputProps.onBlur?.(event); }}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
