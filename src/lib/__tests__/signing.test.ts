import { describe, expect, it } from 'vitest';
import { signPath, signedUrl, verifySignedPath } from '../signing';

const SECRET = 'dev-secret';
const NOW = new Date('2026-09-03T12:00:00Z');
const nowSec = Math.floor(NOW.getTime() / 1000);
const PATH = '/lessons/2/source.mp4';

describe('verifySignedPath', () => {
  it('自分で署名したものは通る', async () => {
    const { exp, sig } = await signPath(SECRET, PATH, nowSec + 60);
    expect(await verifySignedPath(SECRET, PATH, { exp: String(exp), sig }, NOW)).toEqual({
      ok: true,
    });
  });

  it('パスを書き換えると落ちる（署名にパスが入っているため）', async () => {
    const { exp, sig } = await signPath(SECRET, PATH, nowSec + 60);
    expect(
      await verifySignedPath(SECRET, '/lessons/9/source.mp4', { exp: String(exp), sig }, NOW),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('期限を伸ばすと落ちる（署名に期限が入っているため）', async () => {
    const { sig } = await signPath(SECRET, PATH, nowSec + 60);
    expect(
      await verifySignedPath(SECRET, PATH, { exp: String(nowSec + 99999), sig }, NOW),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('鍵が違えば落ちる', async () => {
    const { exp, sig } = await signPath(SECRET, PATH, nowSec + 60);
    expect(await verifySignedPath('other-secret', PATH, { exp: String(exp), sig }, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('期限切れは落ちる', async () => {
    const { exp, sig } = await signPath(SECRET, PATH, nowSec - 1);
    expect(await verifySignedPath(SECRET, PATH, { exp: String(exp), sig }, NOW)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('期限ちょうどは落ちる（境界は閉じる）', async () => {
    const { exp, sig } = await signPath(SECRET, PATH, nowSec);
    expect(await verifySignedPath(SECRET, PATH, { exp: String(exp), sig }, NOW)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('パラメータが無ければ落ちる', async () => {
    expect(await verifySignedPath(SECRET, PATH, { exp: null, sig: null }, NOW)).toEqual({
      ok: false,
      reason: 'missing_params',
    });
  });

  it('expが数値でなければ落ちる', async () => {
    expect(await verifySignedPath(SECRET, PATH, { exp: 'soon', sig: 'x' }, NOW)).toEqual({
      ok: false,
      reason: 'malformed_exp',
    });
  });

  it('署名が壊れているときは、期限切れではなく署名エラーを返す（期限を漏らさない）', async () => {
    expect(
      await verifySignedPath(SECRET, PATH, { exp: String(nowSec - 99999), sig: 'garbage' }, NOW),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('signedUrl は exp と sig を付けたURLを返す', async () => {
    const url = await signedUrl(SECRET, 'https://example.com', PATH, 60, NOW);
    const u = new URL(url);
    expect(u.pathname).toBe(PATH);
    expect(Number(u.searchParams.get('exp'))).toBe(nowSec + 60);
    expect(u.searchParams.get('sig')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
