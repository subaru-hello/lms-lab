import { db, schema } from './index';

/**
 * 開発用の最小データ。講師1人・受講者2人・コース1本・レッスン2本。
 * 受講者Aは有効なEnrollment、受講者Bは期限切れ。403の実演に使う。
 */
async function main() {
  const [instructor] = await db
    .insert(schema.users)
    .values({ email: 'instructor@example.com', passwordHash: 'dev', role: 'instructor' })
    .returning();
  const [alice] = await db
    .insert(schema.users)
    .values({ email: 'alice@example.com', passwordHash: 'dev' })
    .returning();
  const [bob] = await db
    .insert(schema.users)
    .values({ email: 'bob@example.com', passwordHash: 'dev' })
    .returning();
  if (!instructor || !alice || !bob) throw new Error('failed to seed users');

  const [course] = await db
    .insert(schema.courses)
    .values({
      instructorId: instructor.id,
      title: '動画に鍵をかける',
      priceJpy: 3000,
      status: 'published',
    })
    .returning();
  if (!course) throw new Error('failed to seed course');

  await db.insert(schema.lessons).values([
    { courseId: course.id, title: '第1回 はじめに', position: 1, storageKey: 'lessons/1', isPreview: true },
    { courseId: course.id, title: '第2回 本編', position: 2, storageKey: 'lessons/2' },
  ]);

  await db.insert(schema.enrollments).values([
    { userId: alice.id, courseId: course.id, expiresAt: null },
    { userId: bob.id, courseId: course.id, expiresAt: new Date(Date.now() - 86_400_000) },
  ]);

  console.log('seeded: alice=有効 / bob=期限切れ');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
