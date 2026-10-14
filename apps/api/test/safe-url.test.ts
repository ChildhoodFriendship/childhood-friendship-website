import { describe, expect, it } from 'vitest';
import { checkPublicUrl, isPrivateAddress } from '../src/lib/safe-url.js';

describe('anti-SSRF', () => {
  it('riconosce gli indirizzi non pubblici', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.13', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    for (const ip of ['8.8.8.8', '76.76.21.21', '2606:4700::6810:84e5']) expect(isPrivateAddress(ip)).toBe(false);
  });

  it('rifiuta schemi, porte, credenziali e host interni', async () => {
    expect(await checkPublicUrl('ftp://example.com')).toEqual({ error: 'Solo URL http/https' });
    expect(await checkPublicUrl('https://example.com:8080')).toEqual({ error: 'Porta non ammessa' });
    expect(await checkPublicUrl('https://user:pw@example.com')).toEqual({ error: 'URL con credenziali non ammesso' });
    expect(await checkPublicUrl('http://127.0.0.1')).toEqual({ error: 'Indirizzo non pubblico' });
    expect(await checkPublicUrl('http://169.254.169.254/latest/meta-data')).toEqual({ error: 'Indirizzo non pubblico' });
    expect(await checkPublicUrl('localhost')).toEqual({ error: 'Indirizzo non pubblico' });
  });
});
