import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['student', 'instructor', 'admin']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('student'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  instructorId: uuid('instructor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  priceJpy: integer('price_jpy').notNull(),
  status: courseStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    durationSec: integer('duration_sec').notNull().default(0),
    // ここに動画URLは持たせない。URLを列に置くと、それを返す全ての経路で
    // 権利チェックが素通りする。持つのは非公開ストレージ上のキーだけで、
    // 再生用のURLは視聴のたびに署名して発行する(S5)。
    storageKey: text('storage_key').notNull(),
    // コースごとに1本だけ、Enrollmentなしで見せられる回(業務ルール3)
    isPreview: boolean('is_preview').notNull().default(false),
  },
  (t) => ({
    courseOrderIdx: uniqueIndex('lessons_course_position_idx').on(t.courseId, t.position),
  }),
);

// 支払いの事実。返金されても行は消さない(帳簿として残す)。
// Stripeのイベントと1対1で、同じイベントが二度届いても増えない。
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'restrict' }),
  amountJpy: integer('amount_jpy').notNull(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 視聴する権利。誰が・どのコースを・いつまで。
// Purchase と分けているのは、返金のときに権利だけを剥がすため。
// 同じ行に載せると「払った事実」を消さないと権利を消せなくなる。
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    // null は無期限(買い切り)。日時が入っていればその時刻で視聴不可になる。
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    // 返金・チャージバックで剥がすときはここに時刻を入れる(行は消さない)
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // 同じ人が同じコースの権利を二重に持たない(Webhookの重複対策の最後の砦)
    userCourseIdx: uniqueIndex('enrollments_user_course_idx').on(t.userId, t.courseId),
  }),
);

export const progress = pgTable(
  'progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    lastPositionSec: integer('last_position_sec').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.lessonId] }),
    lessonIdx: index('progress_lesson_idx').on(t.lessonId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  purchases: many(purchases),
  progress: many(progress),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, { fields: [courses.instructorId], references: [users.id] }),
  lessons: many(lessons),
  enrollments: many(enrollments),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, { fields: [lessons.courseId], references: [courses.id] }),
  progress: many(progress),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
  purchase: one(purchases, { fields: [enrollments.purchaseId], references: [purchases.id] }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [progress.lessonId], references: [lessons.id] }),
}));
