import { ORDER_ERROR } from '@/domain/orders';

const MAX_BODY_BYTES = 1_000_000;

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Código de error de dominio -> estado HTTP. */
export function statusForCode(code) {
  switch (code) {
    case ORDER_ERROR.INVALID_TRANSITION:
    case ORDER_ERROR.CONFLICT:
      return 409;
    case ORDER_ERROR.ORDER_NOT_FOUND:
      return 404;
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
