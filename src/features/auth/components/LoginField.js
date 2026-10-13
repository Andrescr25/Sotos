import { forwardRef, useId, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui';

/** Campo del acceso con foco visible y un control táctil para la contraseña. */
export const LoginField = forwardRef(function LoginField({ label, icon, password = false, ...props }, ref) {
  const labelId = useId();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text nativeID={labelId} color="brandInk" style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.focused]}>
        <Icon name={icon} size="sm" color={focused ? 'brandRed' : 'brandMuted'} />
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={theme.colors.brandMuted}
          secureTextEntry={password && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible((previous) => !previous)}
            style={({ pressed }) => [styles.visibility, pressed && styles.pressed]}
          >
            <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size="sm" color="brandMuted" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const { auth, colors, spacing, radius, fontWeights } = theme;

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: auth.caption, fontWeight: fontWeights.bold },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: auth.fieldHeight, paddingLeft: spacing.lg, paddingRight: spacing.xs,
    borderWidth: 1, borderColor: colors.brandBorder, borderRadius: radius.md,
    backgroundColor: colors.brandCanvas,
  },
  focused: { borderColor: colors.brandRed, backgroundColor: colors.surface },
  input: {
    flex: 1, minWidth: 0, minHeight: auth.fieldHeight,
    paddingVertical: spacing.md, color: colors.brandInk, fontSize: auth.body,
  },
  visibility: {
    width: auth.iconButtonSize, minHeight: auth.iconButtonSize,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
  },
  pressed: { backgroundColor: colors.brandTint },
});
