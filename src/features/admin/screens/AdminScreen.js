import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/features/auth';
import { useMenu } from '@/features/menu/useMenu';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/screens/admin';
import { ActionCard, Banner, MetricCard, Text } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { useUsers } from '../hooks/useUsers';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { mobile } = useResponsiveLayout();
  const { users, pendingCount, loading: usersLoading, error: usersError } = useUsers();
  const { menu, loading: menuLoading } = useMenu();
  const name = user?.name?.split(' ')[0] || 'equipo';

  return (
    <WorkspaceScreen section="admin" title="Administración" subtitle="Tu restaurante, en buenas manos." scroll>
      <View style={[styles.hero, mobile && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <Text color="primary" style={styles.eyebrow}>CADA PEDIDO CUENTA</Text>
          <Text style={[styles.heroTitle, mobile && styles.heroTitleMobile]}>{`Hola, ${name}.\nHagamos un gran turno.`}</Text>
          <Text color="textSecondary" style={styles.heroDescription}>Gestiona tu menú, acompaña a tu equipo y mantén cada pedido en movimiento.</Text>
        </View>
        {!mobile ? <BrandLogo profile decorative style={styles.heroLogo} /> : null}
      </View>
      {pendingCount > 0 ? <Banner tone="warning" message={`${pendingCount} ${pendingCount === 1 ? 'cuenta espera' : 'cuentas esperan'} que le asignes un acceso.`} /> : null}
      <View style={styles.metrics}>
        <MetricCard label="Productos disponibles" value={menuLoading || !menu ? '—' : menu.products.filter((product) => product.active).length} icon="restaurant-outline" hint="En el menú" />
        <MetricCard label="Personas del equipo" value={usersLoading || usersError ? '—' : users.length} icon="people-outline" hint="Cuentas del restaurante" />
        <MetricCard label="Accesos pendientes" value={usersLoading || usersError ? '—' : pendingCount} icon="person-add-outline" hint="Por asignar" color={pendingCount ? 'warning' : 'success'} />
      </View>
      <View style={styles.section}>
        <Text variant="title" style={styles.sectionTitle}>Todo en su lugar</Text>
        <View style={styles.actions}>
          <ActionCard title="Menú: platillos, bebidas y extras" description="Organiza lo que servimos, sus precios y las opciones de cada producto." icon="restaurant-outline" onPress={() => router.push('/admin/menu')} />
          <ActionCard title={pendingCount ? `Usuarios y accesos (${pendingCount} pendientes)` : 'Usuarios y accesos'} description="Invita a tu equipo y administra sus accesos desde un solo lugar." icon="people-outline" onPress={() => router.push('/admin/usuarios')} />
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="title" style={styles.sectionTitle}>El servicio en marcha</Text>
        <View style={styles.actions}>
          <ActionCard title="Abrir Caja" description="Toma pedidos, personaliza cada orden y coordina las entregas." icon="receipt-outline" onPress={() => router.push('/caja')} />
          <ActionCard title="Abrir Cocina" description="Consulta los pedidos y acompaña cada preparación hasta que esté lista." icon="flame-outline" onPress={() => router.push('/cocina')} />
        </View>
      </View>
    </WorkspaceScreen>
  );
}
