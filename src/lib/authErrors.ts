import type { TFunction } from 'i18next';

/**
 * Supabase devuelve los errores de acceso en ingles y sin traducir. En un taller
 * eso deja al usuario con un "Invalid login credentials" que no le dice nada.
 *
 * GoTrue expone un `code` estable desde supabase-js 2.x, que es lo que se mira
 * primero. Cuando falta (errores de red, o respuestas antiguas) se recurre al
 * texto en ingles, que es lo unico que llega. Si no se reconoce ninguno de los
 * dos, se muestra el mensaje original: mejor en ingles que en blanco.
 */
const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'credencialesInvalidas',
  email_not_confirmed: 'correoSinConfirmar',
  user_already_exists: 'cuentaYaExiste',
  email_exists: 'cuentaYaExiste',
  weak_password: 'contrasenaDebil',
  same_password: 'contrasenaRepetida',
  user_banned: 'cuentaDesactivada',
  signup_disabled: 'registroCerrado',
  email_address_invalid: 'correoNoValido',
  validation_failed: 'datosNoValidos',
  over_request_rate_limit: 'demasiadosIntentos',
  over_email_send_rate_limit: 'demasiadosCorreos',
  otp_expired: 'enlaceCaducado',
  captcha_failed: 'captchaFallido',
};

const POR_TEXTO: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'credencialesInvalidas'],
  [/email not confirmed/i, 'correoSinConfirmar'],
  [/already registered|already exists/i, 'cuentaYaExiste'],
  [/known to be weak|password should be at least/i, 'contrasenaDebil'],
  [/should be different from the old password/i, 'contrasenaRepetida'],
  [/user is banned/i, 'cuentaDesactivada'],
  [/signups not allowed|signup is disabled/i, 'registroCerrado'],
  [/unable to validate email|invalid format/i, 'correoNoValido'],
  [/rate limit|too many requests/i, 'demasiadosIntentos'],
  [/expired|invalid token/i, 'enlaceCaducado'],
  [/failed to fetch|network/i, 'sinConexion'],
];

export function traducirErrorAuth(error: unknown, t: TFunction): string {
  const code = (error as { code?: string } | null)?.code;
  const mensaje = (error as { message?: string } | null)?.message ?? '';

  const clave =
    (code ? POR_CODIGO[code] : undefined) ??
    POR_TEXTO.find(([patron]) => patron.test(mensaje))?.[1];

  return clave ? t(`authUI.auth.errors.${clave}`) : mensaje;
}
