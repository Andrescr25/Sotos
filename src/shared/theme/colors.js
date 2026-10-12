/**
 * Paleta de la app. Para cambiar la identidad visual, se edita solo aquí.
 * Ninguna pantalla ni componente debe escribir colores sueltos.
 */
export const colors = {
  // Fondos
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEEF1',
  overlay: 'rgba(0, 0, 0, 0.45)',

  // Líneas
  border: '#D9DDE3',

  // Texto
  textPrimary: '#1B1F24',
  textSecondary: '#5B6470',
  textInverse: '#FFFFFF',

  // Marca / acciones
  primary: '#E8590C',
  primaryPressed: '#C94A08',

  // Semánticos
  success: '#2F9E44',
  warning: '#F08C00',
  danger: '#E03131',
  info: '#1C7ED6',

  // Versiones suaves para fondos de avisos, chips y selección
  primarySoft: '#FFF0E6',
  successSoft: '#EAF7EC',
  warningSoft: '#FFF4E0',
  dangerSoft: '#FDECEC',
  infoSoft: '#E7F1FB',

  // Color de cada estado de pedido (las claves son los valores de ORDER_STATUS)
  status: {
    draft: '#868E96',
    new: '#1C7ED6',
    in_progress: '#F08C00',
    ready: '#2F9E44',
    delivered: '#868E96',
    cancelled: '#E03131',
  },
};
