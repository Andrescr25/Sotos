/**
 * Mensajes para el usuario según el `code` de un error. Un solo lugar para
 * redactar (y traducir) lo que ve el personal del restaurante.
 */
const MESSAGES = {
  // Conexión y sesión
  network: 'No hay conexión con el servidor. Revisa el WiFi e intenta de nuevo.',
  unauthorized: 'Tu sesión terminó. Inicia sesión de nuevo.',
  forbidden: 'Tu cuenta no tiene permiso para hacer esto.',
  rate_limited: 'Demasiados intentos. Espera un momento e intenta de nuevo.',

  // Cuentas
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  account_disabled: 'Tu cuenta está deshabilitada. Habla con el administrador.',
  username_taken: 'Ese usuario ya existe. Elige otro.',
  invalid_name: 'Escribe tu nombre (entre 2 y 60 caracteres).',
  invalid_username:
    'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.',
  invalid_password: 'La contraseña debe tener al menos 6 caracteres.',
  last_admin: 'Debe quedar al menos un administrador activo.',
  user_not_found: 'La cuenta ya no existe.',
  invitation_invalid: 'Este enlace no es válido. Revisa que esté completo o pide uno nuevo al administrador.',
  invitation_expired: 'Este enlace venció. Pide uno nuevo al administrador.',
  invitation_used: 'Este enlace ya se usó. Si olvidaste tu contraseña, pide uno nuevo al administrador.',
  invalid_role: 'El rol no es válido.',

  // Menú
  menu_invalid_name: 'El nombre debe tener entre 1 y 60 caracteres.',
  menu_invalid_price: 'El precio debe ser un número entero de colones (sin decimales).',
  menu_invalid_kind: 'Elige si es un platillo o una bebida.',
  menu_invalid_icon: 'El icono no es válido.',
  menu_invalid_note: 'La observación debe tener entre 1 y 40 caracteres.',
  menu_invalid_active: 'El estado no es válido.',
  menu_duplicate_name: 'Ya existe uno con ese nombre.',
  menu_duplicate_note: 'Esa observación ya existe.',
  category_not_found: 'La categoría ya no existe.',
  product_not_found: 'El producto ya no existe.',
  extra_not_found: 'El extra ya no existe.',
  note_not_found: 'La observación ya no existe.',
  category_not_empty: 'La categoría todavía tiene productos. Elimínalos o muévelos primero (o desactívala).',
  menu_not_empty: 'El menú de ejemplo solo se puede cargar cuando el menú está vacío.',

  // Pedidos
  empty_order: 'Agrega al menos un producto antes de enviar.',
  customer_name_required: 'Escribe el nombre del cliente para poder enviar el pedido.',
  conflict: 'Otro dispositivo cambió este pedido. Se actualizó la lista.',
  invalid_transition: 'Este pedido ya cambió de estado en otro dispositivo.',
  order_not_found: 'El pedido ya no existe.',
  extra_quantity_exceeded: 'No puedes pedir más extras que unidades del producto.',
  product_unavailable: 'Este producto no está disponible.',
};

/**
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  const code = error && typeof error === 'object' ? error.code : undefined;
  return (code && MESSAGES[code]) || fallback;
}
