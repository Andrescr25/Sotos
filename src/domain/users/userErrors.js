import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

export const USER_ERROR = Object.freeze({
  INVALID_NAME: 'invalid_name',
  INVALID_USERNAME: 'invalid_username',
  INVALID_PASSWORD: 'invalid_password',
  USERNAME_TAKEN: 'username_taken',
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_DISABLED: 'account_disabled',
  USER_NOT_FOUND: 'user_not_found',
  INVALID_ROLE: 'invalid_role',
  /** Quitarle el acceso al único administrador activo dejaría el sistema sin gestión. */
  LAST_ADMIN: 'last_admin',
  /** El enlace de invitación no existe (mal copiado o reemplazado por uno nuevo). */
  INVITATION_INVALID: 'invitation_invalid',
  INVITATION_EXPIRED: 'invitation_expired',
  /** El enlace ya se usó: cada invitación sirve una sola vez. */
  INVITATION_USED: 'invitation_used',
  FORBIDDEN: COMMON_ERROR.FORBIDDEN,
  UNAUTHORIZED: COMMON_ERROR.UNAUTHORIZED,
  NETWORK: COMMON_ERROR.NETWORK,
});

/** Error de regla de negocio de usuarios y accesos. */
export class UserError extends AppError {
  /**
   * @param {string} code uno de USER_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'UserError';
  }
}
