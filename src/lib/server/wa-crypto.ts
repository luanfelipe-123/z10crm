import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey(): Buffer {
  const raw = process.env.WA_ENCRYPTION_KEY;
  if (!raw) throw new Error('WA_ENCRYPTION_KEY não configurada.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('WA_ENCRYPTION_KEY inválida (precisa ter 32 bytes em base64).');
  return key;
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
}

export function decryptText(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return '[não foi possível descriptografar]';
  }
}
