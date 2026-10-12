import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Dirección que se envía al empleado para que cree su contraseña.
 *
 * - Web (la app publicada): el mismo dominio desde el que el administrador usa
 *   la app, que es el que el empleado también va a abrir.
 * - Apps nativas / Expo Go: `Linking.createURL` (esquema de la app).
 * - `EXPO_PUBLIC_APP_URL` fija el dominio a mano (por ejemplo, si el
 *   administrador usa la app desde otro dominio que el del personal).
 *
 * @param {string} token
 * @returns {string}
 */
export function buildInviteUrl(token) {
  const path = `/invitacion/${token}`;

  const override = process.env.EXPO_PUBLIC_APP_URL;
  if (override) return `${override.replace(/\/+$/, '')}${path}`;

  if (Platform.OS === 'web') return `${globalThis.location?.origin ?? ''}${path}`;

  return Linking.createURL(path);
}

/**
 * Mensaje listo para pegar en WhatsApp u otro chat.
 * @param {{ name: string, url: string, isReset?: boolean }} data
 */
export function buildInviteMessage({ name, url, isReset = false }) {
  const intent = isReset ? 'crear una contraseña nueva' : 'entrar a Sotos y crear tu contraseña';
  return `Hola ${name}, este es tu enlace para ${intent}: ${url}`;
}

/** Enlace para abrir WhatsApp con el mensaje escrito (el administrador elige el contacto). */
export function buildWhatsAppUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
