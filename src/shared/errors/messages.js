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
  invalid_role: 'El rol no es válido.',

  // Pedidos
  empty_order: 'Agrega al menos un producto antes de enviar.',
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
