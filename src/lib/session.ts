import { signPath, verifySignedPath } from './signing';

/**
 * 段3.2 — セッション。
 *
 * DBにセッション表を作らず、Cookieの中身に署名だけ付ける形にしている。
 * 教材として説明する量が少なくて済むのと、この講座の主題が
 * 「動画の配り方」であって「セッション管理」ではないため。
 *
 * この選択の代償ははっきりしている。**サーバー側から即座に失効させられない。**
 * 返金でEnrollmentを剥がしても、既に発行済みのセッションは期限まで生き続ける。
 * ただし視聴の可否は毎回Enrollmentを見て判断するので、
 * 「ログインは生きているが動画は見られない」という正しい状態になる。
 * ここを混同して「セッションがあるから見せてよい」と書くと穴が開く。
 */

export const SESSION_COOKIE = 'lms_session';
const TTL_SEC = 60 * 60 * 24 * 7;

/** Cookie の値は `<userId>.<exp>.<sig>`。署名対象は signing.ts と同じ仕組みを使い回す。 */
export async function createSessionValue(
  secret: string,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const exp = Math.floor(now.getTime() / 1000) + TTL_SEC;
  const { sig } = await signPath(secret, `/session/${userId}`, exp);
  return `${userId}.${exp}.${sig}`;
}

export async function readSessionValue(
  secret: string,
  value: string | undefined,
  now: Date = new Date(),
): Promise<string | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts as [string, string, string];
  const result = await verifySignedPath(secret, `/session/${userId}`, { exp, sig }, now);
  return result.ok ? userId : null;
}
