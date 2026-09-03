import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db, schema } from '@/db';
import { canWatchLesson } from '@/lib/access';
import { SESSION_COOKIE, readSessionValue } from '@/lib/session';
import { signedUrl } from '@/lib/signing';

/**
 * 段5.3 — 署名を発行する唯一の場所。
 *
 * 順番が全て。 誰か -> 何を見ようとしているか -> 見てよいか -> ここで初めて署名する。
 * 逆にすると「先に署名を作ってから権利を見る」ことになり、
 * 例外やreturn漏れで署名だけが漏れる形の事故が起きる。
 */

const TTL_SEC = 300;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const secret = process.env.SIGNING_SECRET;
  const base = process.env.VIDEO_WORKER_BASE;
  if (!secret || !base) return new Response('server misconfigured', { status: 500 });

  const { id } = await ctx.params;
  const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, id) });
  if (!lesson) return new Response('not found', { status: 404 });

  const jar = await cookies();
  const userId = await readSessionValue(secret, jar.get(SESSION_COOKIE)?.value);

  const enrollment = userId
    ? await db.query.enrollments.findFirst({
        where: and(
          eq(schema.enrollments.userId, userId),
          eq(schema.enrollments.courseId, lesson.courseId),
        ),
      })
    : null;

  const decision = canWatchLesson(lesson, enrollment ?? null);
  if (!decision.allowed) {
    return new Response('forbidden', {
      status: 403,
      headers: { 'x-deny-reason': decision.reason },
    });
  }

  const url = await signedUrl(secret, base, `/${lesson.storageKey}/source.mp4`, TTL_SEC);
  return Response.redirect(url, 302);
}
