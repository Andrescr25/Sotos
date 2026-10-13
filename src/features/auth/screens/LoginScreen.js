import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { devAccounts } from '@/config/runtime';
import { getErrorMessage } from '@/shared/errors/messages';
import { theme } from '@/shared/theme';
import { Banner, Icon, Screen, Text } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { useAuth } from '../AuthProvider';
import { LoginBrandPanel } from '../components/LoginBrandPanel';
import { LoginField } from '../components/LoginField';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const wide = width / Math.max(fontScale, 1) >= theme.auth.breakpoint;
  const large = width >= theme.auth.largeBreakpoint;
  const compact = width < theme.auth.compactBreakpoint;
  const passwordRef = useRef(null);
  const submittingRef = useRef(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const canSubmit = Boolean(username.trim() && password) && !busy;

  async function submit() {
    if (submittingRef.current || !username.trim() || !password) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await login({ username: username.trim(), password });
      router.replace('/');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.layout, wide && styles.layoutWide]}>
            <LoginBrandPanel wide={wide} large={large} compact={compact} />

            <View style={[styles.formPanel, !wide && styles.formPanelMobile, compact && styles.formPanelCompact]}>
              <View style={styles.form}>
                <View style={styles.welcome}>
                  {wide ? (
                    <View style={styles.formBrand}>
                      <BrandLogo profile decorative />
                      <View style={styles.brandCaption}>
                        <Text color="brandInk" style={styles.brandName}>Soto’s</Text>
                        <Text color="brandMuted" style={styles.eyebrow}>PORTAL DEL EQUIPO</Text>
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.welcomeCopy}>
                    <Text accessibilityRole="header" color="brandInk" style={[styles.title, !wide && styles.titleMobile]}>
                      Qué bueno verte.
                    </Text>
                    <Text color="brandMuted" style={styles.description}>
                      Inicia sesión y hagamos que cada pedido cuente.
                    </Text>
                  </View>
                </View>

                <View style={styles.fields}>
                  {error ? <Banner tone="error" message={error} /> : null}
                  <LoginField
                    label="Usuario"
                    icon="person-outline"
                    placeholder="Tu nombre de usuario"
                    value={username}
                    onChangeText={setUsername}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!busy}
                  />
                  <LoginField
                    ref={passwordRef}
                    label="Contraseña"
                    icon="lock-closed-outline"
                    placeholder="Tu contraseña"
                    value={password}
                    onChangeText={setPassword}
                    password
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    editable={!busy}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={busy ? 'Entrando…' : 'Entrar'}
                    accessibilityState={{ disabled: !canSubmit, busy }}
                    disabled={!canSubmit}
                    onPress={submit}
                    style={({ pressed }) => [
                      styles.submit,
                      pressed && styles.submitPressed,
                      !canSubmit && styles.submitDisabled,
                    ]}
                  >
                    <Text color="brandCream" style={styles.submitText}>{busy ? 'Entrando…' : 'Entrar'}</Text>
                    {busy ? (
                      <ActivityIndicator size="small" color={theme.colors.brandCream} />
                    ) : (
                      <Icon name="arrow-forward" size="sm" color="brandCream" />
                    )}
                  </Pressable>
                </View>

                <View style={styles.invitationNote}>
                  <View style={styles.noteIcon}><Icon name="mail-outline" size="sm" color="brandMuted" /></View>
                  <View style={styles.noteCopy}>
                    <Text color="brandInk" style={styles.noteTitle}>¿Es tu primer día?</Text>
                    <Text color="brandMuted" style={styles.noteText}>
                      Tu administrador te enviará un enlace para crear tu contraseña.
                    </Text>
                  </View>
                </View>

                {devAccounts.length > 0 ? (
                  <DevAccounts
                    accounts={devAccounts}
                    disabled={busy}
                    onPick={(account) => {
                      setUsername(account.username);
                      setPassword(account.password);
                      setError(null);
                    }}
                  />
                ) : null}

                <View style={styles.footer}>
                  <View style={styles.footerRule} />
                  <View style={styles.footerLabel}>
                    <Icon name="lock-closed-outline" size="sm" color="brandMuted" />
                    <Text color="brandMuted" style={styles.footerText}>Un espacio exclusivo para nuestro equipo</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Solo en modo desarrollo sin servidor: atajos a las cuentas de ejemplo. */
function DevAccounts({ accounts, onPick, disabled }) {
  return (
    <View style={styles.dev}>
      <Text color="brandMuted" style={styles.noteText}>Modo desarrollo · Cuentas de ejemplo</Text>
      <View style={styles.devChips}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityLabel={account.username}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onPick(account)}
            style={({ pressed }) => [styles.devChip, pressed && styles.devChipPressed]}
          >
            <Text color="brandInk" style={styles.noteText}>{account.username}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const { auth, colors, spacing, radius, fontWeights } = theme;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { padding: 0, backgroundColor: colors.brandCanvas },
  scroll: { flexGrow: 1, padding: auth.pagePadding, alignItems: 'center', justifyContent: 'center' },
  scrollCompact: { padding: auth.pagePaddingCompact },
  layout: { width: '100%', maxWidth: auth.maxWidth },
  layoutWide: { flexDirection: 'row', flexGrow: 1, minHeight: auth.panelMinHeight },
  formPanel: { flex: 1, minWidth: 0, padding: auth.formPadding, justifyContent: 'center', alignItems: 'center' },
  formPanelMobile: { flex: undefined, paddingVertical: auth.formMobilePadding, paddingHorizontal: spacing.lg },
  formPanelCompact: { paddingHorizontal: spacing.sm },
  form: { width: '100%', maxWidth: auth.formMaxWidth, gap: spacing.xxl },
  welcome: { gap: spacing.xxl },
  formBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandCaption: { flex: 1, gap: spacing.xs },
  brandName: { fontSize: auth.body, fontWeight: fontWeights.bold },
  eyebrow: { fontSize: auth.eyebrow, letterSpacing: auth.tracking, fontWeight: fontWeights.medium },
  welcomeCopy: { gap: spacing.md },
  title: { fontSize: auth.heading, fontWeight: '800', letterSpacing: auth.headingTracking },
  titleMobile: { fontSize: auth.headingMobile, letterSpacing: -1 },
  description: { fontSize: auth.body, lineHeight: auth.bodyLine },
  fields: { gap: spacing.xl },
  submit: {
    minHeight: auth.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, backgroundColor: colors.brandRed, marginTop: spacing.xs,
  },
  submitPressed: { backgroundColor: colors.brandRedPressed },
  submitDisabled: { opacity: 0.48 },
  submitText: { fontSize: auth.body, fontWeight: fontWeights.bold },
  invitationNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderColor: colors.brandBorder, borderRadius: radius.lg, padding: spacing.lg,
  },
  noteIcon: {
    width: auth.iconWellSize, minHeight: auth.iconWellSize, borderRadius: radius.md,
    backgroundColor: colors.brandTint, justifyContent: 'center', alignItems: 'center',
  },
  noteCopy: { flex: 1, gap: spacing.xs },
  noteTitle: { fontSize: auth.caption, fontWeight: fontWeights.bold },
  noteText: { fontSize: auth.caption, lineHeight: auth.bodyLine - spacing.xs },
  footer: { gap: spacing.lg, marginTop: spacing.lg },
  footerRule: { height: 1, backgroundColor: colors.brandBorder },
  footerLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  footerText: { flexShrink: 1, fontSize: auth.eyebrow, lineHeight: auth.bodyLine - spacing.sm },
  dev: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.brandTint },
  devChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  devChip: {
    minHeight: auth.iconButtonSize, paddingHorizontal: spacing.md, justifyContent: 'center',
    borderRadius: radius.sm, backgroundColor: colors.brandCanvas, borderWidth: 1, borderColor: colors.brandBorder,
  },
  devChipPressed: { backgroundColor: colors.brandCream },
});
