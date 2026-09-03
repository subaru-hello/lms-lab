import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema } from '@/db';
import { videoUrl } from '@/lib/storage';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, id) });
  if (!lesson) notFound();

  // 段4.1 では権利チェックをしていない。canWatch を呼んでいないことに注目。
  // この時点では「置いて、再生する」だけができている状態。
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '1.3rem' }}>{lesson.title}</h1>
      <video src={videoUrl(lesson.storageKey)} controls style={{ width: '100%' }} />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        いまはR2の公開バケットに置いてあるので、このURLを知っている人は誰でも再生できる。
      </p>
    </main>
  );
}
