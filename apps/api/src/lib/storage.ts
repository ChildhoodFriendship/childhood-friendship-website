import type { Env } from '../config/env.js';

export interface StoredFileInfo { url: string; pathname: string; size: number; contentType: string }

/** Archivio file astratto: in produzione Vercel Blob, nei test un'implementazione finta. */
export interface FileStorage {
  /** Token monouso con cui il browser carica direttamente un file in `pathname`. */
  createUploadToken(pathname: string, opts: { maxBytes: number; contentType: string }): Promise<string>;
  /** Metadati di un file già caricato, o null se non esiste. */
  head(pathname: string): Promise<StoredFileInfo | null>;
  remove(url: string): Promise<void>;
}

/** Vercel Blob (richiede BLOB_READ_WRITE_TOKEN). Caricamento diretto dal browser: niente limite di 4,5 MB delle Functions. */
export function createBlobStorage(env: Env): FileStorage | null {
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return {
    async createUploadToken(pathname, opts) {
      const { generateClientTokenFromReadWriteToken } = await import('@vercel/blob/client');
      return generateClientTokenFromReadWriteToken({
        token,
        pathname,
        maximumSizeInBytes: opts.maxBytes,
        allowedContentTypes: [opts.contentType],
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 15 * 60_000
      });
    },
    async head(pathname) {
      const { head, BlobNotFoundError } = await import('@vercel/blob');
      try {
        const b = await head(pathname, { token });
        return { url: b.url, pathname: b.pathname, size: b.size, contentType: b.contentType };
      } catch (err) {
        if (err instanceof BlobNotFoundError) return null;
        throw err;
      }
    },
    async remove(url) {
      const { del } = await import('@vercel/blob');
      await del(url, { token });
    }
  };
}

/** Tipi di file accettati come materiali di progetto. */
export const ALLOWED_FILE_TYPES = [
  /^image\/(png|jpe?g|webp|gif|svg\+xml|heic|heif|avif)$/,
  /^application\/pdf$/,
  /^application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint)$/,
  /^application\/(zip|x-zip-compressed)$/,
  /^text\/(plain|csv)$/,
  /^video\/(mp4|quicktime|webm)$/,
  /^audio\/(mpeg|mp4|x-m4a|wav)$/
];
export const isAllowedFileType = (t: string): boolean => ALLOWED_FILE_TYPES.some((re) => re.test(t));
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Nome file sicuro per il percorso (minuscole, trattini, estensione conservata). */
export function safeFileName(name: string): string {
  const base = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return (cleaned || 'file').slice(-80);
}
