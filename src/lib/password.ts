import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/**
 * 段3.2 — パスワードの保存。
 *
 * 平文でもSHA-256単発でもなく、遅いハッシュ(scrypt)を使う。
 * 速いハッシュは総当たりも速いという、それだけの理由。
 * salt を1件ごとに変えるのは、同じパスワードの人が同じ値にならないようにするため。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1] ?? '', 'base64');
  const expected = Buffer.from(parts[2] ?? '', 'base64');
  if (expected.length !== KEYLEN) return false;
  const actual = await scrypt(password, salt, KEYLEN);
  return timingSafeEqual(actual, expected);
}
