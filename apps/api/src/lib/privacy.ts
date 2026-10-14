import { createHmac, randomBytes } from 'node:crypto';

/**
 * Pseudonimizzazione degli indirizzi IP (GDPR art. 4.5 e 25): si salva solo un HMAC con chiave segreta,
 * non reversibile senza la chiave (a differenza di un semplice hash, che per IPv4 si inverte per forza bruta).
 * La chiave è derivata dal segreto dell'app; senza configurazione ne viene generata una casuale per processo.
 */
let key: Buffer = randomBytes(32);

export function setPseudonymKey(secret: string): void {
  key = createHmac('sha256', secret).update('cf:pseudonym:v1').digest();
}

export function pseudonym(value: string): string {
  return createHmac('sha256', key).update(value).digest('base64url').slice(0, 22);
}

export const pseudonymIp = (ip: string | undefined | null): string | null => (ip ? pseudonym(`ip:${ip}`) : null);

/** Versione dell'informativa privacy accettata nel form contatti (aggiornare quando cambia il testo). */
export const PRIVACY_POLICY_VERSION = '2026-10-15';
