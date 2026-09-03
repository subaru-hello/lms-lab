/// <reference types="@cloudflare/workers-types" />

import { verifySignedPath } from '../src/lib/signing';

/**
 * 段5.3 — R2の前に立って、署名を検証してから動画を返す。
 *
 * ここが「動画の実体を取りに行く経路」の唯一の関門。
 * 段4.1 ではこの関門が無く、公開バケットのURLを知っているだけで再生できた。
 *
 * この Worker は「署名が正しいか」しか見ない。
 * 「この人が見てよいか」を判断するのはアプリ側で、判断が済んでから署名を発行する。
 * 役割を分けているのは、動画1本を配る経路にDBを覗きに行かせないため。
 */

export interface Env {
  VIDEOS: R2Bucket;
  SIGNING_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    const verdict = await verifySignedPath(env.SIGNING_SECRET, path, {
      exp: url.searchParams.get('exp'),
      sig: url.searchParams.get('sig'),
    });
    if (!verdict.ok) {
      // 理由をヘッダに出すのは開発用。なぜ落ちたかが分からないと段5.4で詰む。
      return new Response('forbidden', {
        status: 403,
        headers: { 'x-deny-reason': verdict.reason },
      });
    }

    const key = path.replace(/^\//, '');
    // Range ヘッダが無いのに { range: request.headers } を渡すと、R2 は範囲なしの
    // range を埋めて返してくる。そのまま分岐すると Range を要求していない相手に
    // 206 を返してしまうので、ヘッダの有無で明示的に分ける。
    const rangeHeader = request.headers.get('range');
    const object = await env.VIDEOS.get(
      key,
      rangeHeader ? { range: request.headers } : undefined,
    );
    if (object === null) return new Response('not found', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    // 署名付きURLは短命なので、共有キャッシュに載せない
    headers.set('cache-control', 'private, max-age=0, no-store');

    const range = object.range;
    if (rangeHeader && range && 'offset' in range) {
      const offset = range.offset ?? 0;
      const length = range.length ?? object.size - offset;
      headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set('content-length', String(length));
      return new Response(request.method === 'HEAD' ? null : object.body, { status: 206, headers });
    }

    headers.set('content-length', String(object.size));
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers });
  },
} satisfies ExportedHandler<Env>;
