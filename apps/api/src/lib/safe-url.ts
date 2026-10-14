import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/** Reti non pubbliche: il server non deve mai contattarle per conto di un utente (SSRF). */
const PRIVATE = new BlockList();
for (const [net, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) PRIVATE.addSubnet(net, bits, 'ipv4');
for (const [net, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) PRIVATE.addSubnet(net, bits, 'ipv6');

export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return PRIVATE.check(ip, 'ipv4');
  if (v === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    return mapped ? PRIVATE.check(mapped[1]!, 'ipv4') : PRIVATE.check(ip, 'ipv6');
  }
  return true;
}

/**
 * Normalizza un URL esterno e verifica che punti solo a indirizzi pubblici (http/https, porte standard).
 * Restituisce l'URL da contattare oppure un messaggio di errore.
 */
export async function checkPublicUrl(raw: string): Promise<{ url: URL } | { error: string }> {
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { error: 'URL non valido' }; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'Solo URL http/https' };
  if (url.username || url.password) return { error: 'URL con credenziali non ammesso' };
  if (url.port && url.port !== '80' && url.port !== '443') return { error: 'Porta non ammessa' };
  try {
    const addrs = await lookup(url.hostname, { all: true, verbatim: true });
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) return { error: 'Indirizzo non pubblico' };
  } catch {
    return { error: 'Host non raggiungibile' };
  }
  return { url };
}
