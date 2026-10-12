import { StyleSheet, TextInput, View } from 'react-native';
import { theme } from '@/shared/theme';
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
  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? inputProps.placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        {...inputProps}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.xs },
  input: {
    minHeight: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSizes.body,
  },
  multiline: {
    minHeight: theme.sizes.touchTarget * 1.6,
    paddingTop: theme.spacing.md,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: theme.colors.danger },
});
