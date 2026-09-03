/**
 * 段5.3 の検証。デプロイした Worker に対して、実際に叩いて挙動を確かめる。
 *
 *   node --env-file=.env --import tsx scripts/verify-signing.ts
 *
 * ここで確かめたいのは「署名が無いと落ちる」だけではない。
 * 署名を持っていても、パスを差し替えたり期限を伸ばしたりできないこと、
 * そして期限が切れたら同じURLが使えなくなること。
 */
import { signPath } from '../src/lib/signing';

const BASE = process.env.WORKER_BASE ?? 'https://lms-lab-video.octpsubaru.workers.dev';
const SECRET = process.env.SIGNING_SECRET;
if (!SECRET) throw new Error('SIGNING_SECRET is not set');

const PATH = '/lessons/2/source.mp4';
const nowSec = () => Math.floor(Date.now() / 1000);

async function url(path: string, expSec: number, secret = SECRET!): Promise<string> {
  const { exp, sig } = await signPath(secret, path, expSec);
  return `${BASE}${path}?exp=${exp}&sig=${sig}`;
}

type Case = { name: string; url: string; expect: number; headers?: Record<string, string> };

async function run(c: Case) {
  const res = await fetch(c.url, { headers: c.headers ?? {} });
  const body = await res.arrayBuffer();
  const reason = res.headers.get('x-deny-reason') ?? '-';
  const ok = res.status === c.expect;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name}\n` +
      `        status=${res.status} (期待 ${c.expect})  bytes=${body.byteLength}  reason=${reason}`,
  );
  return ok;
}

async function main() {
  const valid = await url(PATH, nowSec() + 300);
  const expired = await url(PATH, nowSec() - 1);
  const otherKey = await url(PATH, nowSec() + 300, 'wrong-secret');
  // 別パス用に署名したものを、このパスに使い回そうとする
  const swapped = (await url('/lessons/1/source.mp4', nowSec() + 300)).replace(
    '/lessons/1/',
    '/lessons/2/',
  );

  const cases: Case[] = [
    { name: '署名なし（段4.1で通っていた形）', url: `${BASE}${PATH}`, expect: 403 },
    { name: '正しい署名', url: valid, expect: 200 },
    { name: '正しい署名 + Range', url: valid, expect: 206, headers: { Range: 'bytes=0-1023' } },
    { name: '期限切れ', url: expired, expect: 403 },
    { name: '鍵が違う', url: otherKey, expect: 403 },
    { name: '別パスの署名を使い回す', url: swapped, expect: 403 },
    { name: '存在しないキー', url: await url('/lessons/999/source.mp4', nowSec() + 300), expect: 404 },
  ];

  let allOk = true;
  for (const c of cases) allOk = (await run(c)) && allOk;
  console.log(allOk ? '\nすべて期待どおり' : '\n期待と違う結果あり');
  process.exit(allOk ? 0 : 1);
}

main();
