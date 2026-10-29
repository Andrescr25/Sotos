import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { AREAS, canAccessArea } from '@/domain/users';
import { useAuth } from '@/features/auth/AuthProvider';
import { SessionBar } from '@/features/auth/components/SessionBar';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { workspaceStyles as styles } from '@/shared/styles/layout/workspace';
import { Icon, Screen, Text } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { PageHeader } from './PageHeader';

const NAVIGATION = [
  { key: 'admin', label: 'Resumen', icon: 'grid-outline', route: '/admin', area: AREAS.ADMIN },
  { key: 'menu', label: 'Menú', icon: 'restaurant-outline', route: '/admin/menu', area: AREAS.ADMIN },
  { key: 'inventory', label: 'Inventario', icon: 'cube-outline', route: '/admin/inventario', area: AREAS.ADMIN },
  { key: 'users', label: 'Equipo', icon: 'people-outline', route: '/admin/usuarios', area: AREAS.ADMIN },
  { key: 'cashier', label: 'Caja', icon: 'receipt-outline', route: '/caja', area: AREAS.CASHIER },
  { key: 'closing', label: 'Cierre', icon: 'wallet-outline', route: '/caja/cierre', area: AREAS.CASHIER },
  { key: 'kitchen', label: 'Cocina', icon: 'flame-outline', route: '/cocina', area: AREAS.KITCHEN },
];

/**
 * Marco compartido: identidad, navegación autorizada y espacio de trabajo adaptable.
 *
 * - `scroll`: toda la página se desplaza como una sola (listas, formularios,
 *   resúmenes). Sin `scroll`, el contenido llena la altura y cada panel se
 *   desplaza por dentro (Caja y cocina en pantallas anchas).
 * - Con `scroll` y poco espacio vertical (teléfono, poca altura) la cabecera
 *   —"Volver", título y acciones— se desplaza junto con el contenido en vez de
 *   quedarse fija y robarle la mitad de la pantalla.
 * - `scrollRef` permite a la pantalla desplazarse a un punto (p. ej. "Ver pedido").
 *
 * Los avisos y paneles que se pasen como hijos quedan separados por el mismo
 * espacio: no hace falta darles margen.
 */
export function WorkspaceScreen({ section, title, subtitle, actions, back = false, scroll = false, scrollRef, children }) {
  const router = useRouter();
  const { user } = useAuth();
  const { sidebar, mobile, compact, short, padding } = useResponsiveLayout();
  const links = NAVIGATION.filter((item) => canAccessArea(user, item.area));
  const header = (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      onBack={back ? () => (router.canGoBack() ? router.back() : router.replace('/admin')) : undefined}
    />
  );
  const headerScrolls = scroll && compact;

  function navigation(item, horizontal = false) {
    const selected = item.key === section;
    const color = horizontal ? (selected ? 'primary' : 'textSecondary') : (selected ? 'brandRed' : 'brandCream');
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={`Ir a ${item.label}`}
        accessibilityState={{ selected }}
        onPress={() => { if (!selected) router.push(item.route); }}
        style={({ pressed }) => [
          styles.navItem,
          horizontal && styles.mobileNavItem,
          selected && (horizontal ? styles.mobileNavSelected : styles.navSelected),
          pressed && !selected && styles.navPressed,
        ]}
      >
        <Icon name={item.icon} size="sm" color={color} />
        <Text color={color} style={styles.navLabel}>{item.label}</Text>
      </Pressable>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.frame}>
        {sidebar ? (
          <View style={styles.sidebar}>
            <View>
              <BrandLogo style={styles.sidebarLogo} />
              <Text color="brandOnRedMuted" style={styles.sidebarCaption}>EL ESPACIO DEL EQUIPO</Text>
            </View>
            <View style={styles.sidebarLinks}>{links.map((item) => navigation(item))}</View>
            {/* Decorativo: con poca altura se omite para que la navegación no se salga de la pantalla. */}
            {!short ? (
              <View style={styles.sidebarFooter}>
                <Icon name="restaurant-outline" color="brandCream" />
                <Text color="brandCream" style={styles.sidebarMotto}>{'Buen equipo.\nBuen servicio.'}</Text>
                <Text variant="caption" color="brandOnRedMuted">Cada pedido cuenta.</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.workspace}>
          <View style={[styles.topbar, mobile && styles.topbarMobile]}>
            <View style={styles.brand}>
              {!sidebar ? <BrandLogo profile style={styles.topLogo} /> : null}
              {!mobile ? (
                <View>
                  <Text style={styles.brandTitle}>Soto’s · Equipo</Text>
                  <Text variant="caption" color="textSecondary">Todo para un gran servicio</Text>
                </View>
              ) : null}
            </View>
            <SessionBar compact={mobile} />
          </View>
          {!sidebar && links.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNav} contentContainerStyle={styles.mobileNavContent}>
              {links.map((item) => navigation(item, true))}
            </ScrollView>
          ) : null}
          <View style={[styles.content, { padding }]}>
            {headerScrolls ? null : header}
            {scroll ? (
              <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {headerScrolls ? header : null}
                {children}
              </ScrollView>
            ) : <View style={[styles.body, styles.bodyFill]}>{children}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
