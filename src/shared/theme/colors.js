/**
 * Paleta de la app. Para cambiar la identidad visual, se edita solo aquí.
 * Ninguna pantalla ni componente debe escribir colores sueltos.
 */
export const colors = {
  // Fondos
  background: '#FCF7F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F4EADF',
  overlay: 'rgba(52, 37, 31, 0.48)',

  // Líneas
  border: '#E8DED3',

  // Texto
  textPrimary: '#34251F',
  textSecondary: '#796B62',
  textInverse: '#FBEEDD',

  // Marca / acciones
  primary: '#C90000',
  primaryPressed: '#A60000',

  // Identidad del inicio: originales de Soto's sobre superficies cálidas.
  brandRed: '#C90000',
  brandRedPressed: '#A60000',
  brandCream: '#FBEEDD',
  brandCanvas: '#FCF7F0',
  brandInk: '#34251F',
  brandMuted: '#796B62',
  brandBorder: '#E8DED3',
  brandTint: '#F4EADF',
  brandOnRedMuted: 'rgba(251, 238, 221, 0.76)',
  brandOnRedBorder: 'rgba(251, 238, 221, 0.25)',
  brandOnRedSoft: 'rgba(251, 238, 221, 0.08)',

  // Semánticos
  success: '#2F794C',
  warning: '#946019',
  danger: '#B82B2B',
  info: '#3F6F93',

  // Versiones suaves para fondos de avisos, chips y selección
  primarySoft: '#FCECE5',
  successSoft: '#EAF7EC',
  warningSoft: '#FFF3D9',
  dangerSoft: '#FDECEC',
  infoSoft: '#E7F1FB',

  // Color de cada estado de pedido (las claves son los valores de ORDER_STATUS)
  status: {
    draft: '#796B62',
    new: '#3F6F93',
    in_progress: '#946019',
    ready: '#2F794C',
    delivered: '#796B62',
    cancelled: '#B82B2B',
  },
};
