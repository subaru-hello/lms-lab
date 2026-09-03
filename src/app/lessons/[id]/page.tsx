import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema } from '@/db';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, id) });
  if (!lesson) notFound();

  // 動画URLをページに埋め込まない。ここで渡すのは「署名を取りに行く経路」だけで、
  // 権利チェックはその経路の中でやる(src/app/api/lessons/[id]/video/route.ts)。
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '1.3rem' }}>{lesson.title}</h1>
      <video src={`/api/lessons/${lesson.id}/video`} controls style={{ width: '100%' }} />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        {lesson.isPreview
          ? 'この回はプレビュー。権利がなくても見られる。'
          : '有効なEnrollmentがあるときだけ、5分だけ有効な署名URLへ転送される。'}
      </p>
    </main>
  );
}
