import { ORDER_ERROR } from '@/domain/orders';
import { MENU_ERROR } from '@/domain/menu';
import { USER_ERROR } from '@/domain/users';
import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

const MAX_BODY_BYTES = 1_000_000;

/** Error con estado HTTP explícito (rutas inexistentes, cuerpo inválido...). */
export class HttpError extends AppError {
  constructor(status, code, message) {
    super(code, message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Código de error de la aplicación -> estado HTTP. */
export function statusForCode(code) {
  switch (code) {
    case COMMON_ERROR.UNAUTHORIZED:
    case USER_ERROR.INVALID_CREDENTIALS:
      return 401;
    case COMMON_ERROR.FORBIDDEN:
    case USER_ERROR.ACCOUNT_DISABLED:
      return 403;
    case ORDER_ERROR.ORDER_NOT_FOUND:
    case USER_ERROR.USER_NOT_FOUND:
    case MENU_ERROR.CATEGORY_NOT_FOUND:
    case MENU_ERROR.PRODUCT_NOT_FOUND:
    case MENU_ERROR.EXTRA_NOT_FOUND:
    case MENU_ERROR.NOTE_NOT_FOUND:
    case USER_ERROR.INVITATION_INVALID:
      return 404;
    case USER_ERROR.INVITATION_USED:
    case USER_ERROR.INVITATION_EXPIRED:
      return 410;
    case ORDER_ERROR.INVALID_TRANSITION:
    case ORDER_ERROR.CONFLICT:
    case USER_ERROR.USERNAME_TAKEN:
    case USER_ERROR.LAST_ADMIN:
    case MENU_ERROR.DUPLICATE_NAME:
    case MENU_ERROR.DUPLICATE_NOTE:
    case MENU_ERROR.CATEGORY_NOT_EMPTY:
    case MENU_ERROR.MENU_NOT_EMPTY:
      return 409;
    case COMMON_ERROR.RATE_LIMITED:
      return 429;
    case COMMON_ERROR.INTERNAL:
      return 500;
    default:
      return 400;
  }
}

export async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'El cuerpo es demasiado grande');
    chunks.push(chunk);
  }
  if (size === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'bad_json', 'El cuerpo no es JSON válido');
  }
}

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** IP del cliente; detrás del proxy de Render viene en X-Forwarded-For. */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

/** Token del encabezado `Authorization: Bearer <token>` o null. */
export function getBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
