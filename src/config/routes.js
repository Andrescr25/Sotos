import { AREAS } from '@/domain/users';

/** Ruta de la pantalla principal de cada zona de trabajo. */
export const AREA_ROUTES = Object.freeze({
  [AREAS.CASHIER]: '/caja',
  [AREAS.KITCHEN]: '/cocina',
  [AREAS.ADMIN]: '/admin',
});
