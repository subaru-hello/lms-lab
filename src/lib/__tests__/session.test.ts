import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password';
import { createSessionValue, readSessionValue } from '../session';

const SECRET = 'dev-secret';
const NOW = new Date('2026-09-03T12:00:00Z');
const USER = '11111111-2222-3333-4444-555555555555';

describe('password', () => {
  it('正しいパスワードは通る', async () => {
    const stored = await hashPassword('password');
    expect(await verifyPassword('password', stored)).toBe(true);
  });

  it('違うパスワードは落ちる', async () => {
    const stored = await hashPassword('password');
    expect(await verifyPassword('Password', stored)).toBe(false);
  });

  it('同じパスワードでも保存値は毎回変わる（saltが1件ごとに違う）', async () => {
    expect(await hashPassword('password')).not.toBe(await hashPassword('password'));
  });

  it('壊れた保存値は例外を投げずにfalseを返す', async () => {
    expect(await verifyPassword('password', 'garbage')).toBe(false);
    expect(await verifyPassword('password', 'scrypt$abc')).toBe(false);
  });
});

describe('session', () => {
  it('自分で作ったセッションは読める', async () => {
    const v = await createSessionValue(SECRET, USER, NOW);
    expect(await readSessionValue(SECRET, v, NOW)).toBe(USER);
  });

  it('userIdを差し替えると読めない（署名にuserIdが入っているため）', async () => {
    const v = await createSessionValue(SECRET, USER, NOW);
    const tampered = v.replace(USER, '99999999-2222-3333-4444-555555555555');
    expect(await readSessionValue(SECRET, tampered, NOW)).toBeNull();
  });

  it('鍵が違えば読めない', async () => {
    const v = await createSessionValue(SECRET, USER, NOW);
    expect(await readSessionValue('other', v, NOW)).toBeNull();
  });

  it('期限を過ぎたら読めない', async () => {
    const v = await createSessionValue(SECRET, USER, NOW);
    const later = new Date(NOW.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(await readSessionValue(SECRET, v, later)).toBeNull();
  });

  it('Cookieが無い・形が違うときはnull', async () => {
    expect(await readSessionValue(SECRET, undefined, NOW)).toBeNull();
    expect(await readSessionValue(SECRET, 'a.b', NOW)).toBeNull();
  });
});
