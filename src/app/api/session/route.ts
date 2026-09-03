import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db, schema } from '@/db';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, createSessionValue } from '@/lib/session';

function secret(): string {
  const s = process.env.SIGNING_SECRET;
  if (!s) throw new Error('SIGNING_SECRET is not set');
  return s;
}

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (!email || !password) return new Response('bad request', { status: 400 });

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  // ユーザーが居ないときも居るときも同じ応答にする。
  // 「そのメールアドレスは登録されていません」は、登録済みかどうかを教えてしまう。
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return new Response('unauthorized', { status: 401 });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionValue(secret(), user.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return Response.json({ id: user.id, email: user.email, role: user.role });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
