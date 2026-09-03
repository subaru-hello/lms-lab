/**
 * 段5.1 — 署名URLの中身を手で作る。
 *
 * ライブラリを使う前に、何が署名されていて何が守られるのかを見えるようにしておく。
 * 守りたいのは2つだけ。
 *   1. 誰かが別のパスに書き換えて使い回せないこと  -> パスを署名に含める
 *   2. 拾われたURLが永久に使えないこと            -> 期限を署名に含める
 *
 * 署名するのは「パス + 期限」であって、ユーザーIDではない。
 * 「この人が見てよいか」は署名を発行する前に確認する(段5.3)。
 * 署名は「確認済みである」という短命の証拠でしかない。
 */

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64url(new Uint8Array(sig));
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** タイミング攻撃を避けるため、長さと内容を定数時間で比べる */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type SignedParams = { exp: number; sig: string };

/** path は先頭スラッシュ付きの絶対パス。expiresAtSec は秒(UNIX時刻)。 */
export async function signPath(
  secret: string,
  path: string,
  expiresAtSec: number,
): Promise<SignedParams> {
  const sig = await hmac(secret, `${path}\n${expiresAtSec}`);
  return { exp: expiresAtSec, sig };
}

export async function signedUrl(
  secret: string,
  base: string,
  path: string,
  ttlSec: number,
  now: Date = new Date(),
): Promise<string> {
  const exp = Math.floor(now.getTime() / 1000) + ttlSec;
  const { sig } = await signPath(secret, path, exp);
  return `${base}${path}?exp=${exp}&sig=${sig}`;
}

export type VerifyFailure = 'missing_params' | 'malformed_exp' | 'expired' | 'bad_signature';
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailure };

export async function verifySignedPath(
  secret: string,
  path: string,
  params: { exp: string | null; sig: string | null },
  now: Date = new Date(),
): Promise<VerifyResult> {
  if (!params.exp || !params.sig) return { ok: false, reason: 'missing_params' };
  const exp = Number(params.exp);
  if (!Number.isInteger(exp)) return { ok: false, reason: 'malformed_exp' };

  // 期限より先に署名を検証する。順番を逆にすると、署名が壊れているURLに対して
  // 「期限切れ」と答えてしまい、攻撃者に期限だけを教えることになる。
  const expected = await hmac(secret, `${path}\n${exp}`);
  if (!timingSafeEqual(expected, params.sig)) return { ok: false, reason: 'bad_signature' };

  if (exp <= Math.floor(now.getTime() / 1000)) return { ok: false, reason: 'expired' };
  return { ok: true };
}
