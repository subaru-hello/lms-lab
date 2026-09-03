/**
 * 視聴する権利があるかを判定する唯一の場所。
 *
 * この関数がこのリポジトリの主人公。動画の署名URLを発行する経路も、
 * 進捗を書き込む経路も、最終的にここを通す。判定が複数箇所に散ると
 * 「片方だけ直して片方が素通し」という壊れ方をする(S5.2で実演する)。
 */

export type Enrollment = {
  /** null は無期限(買い切り) */
  expiresAt: Date | null;
  /** 返金・チャージバックで剥がされた時刻。null なら有効 */
  revokedAt: Date | null;
};

export type WatchDenial =
  | 'no_enrollment'
  | 'revoked'
  | 'expired';

export type WatchDecision =
  | { allowed: true }
  | { allowed: false; reason: WatchDenial };

export function canWatch(
  enrollment: Enrollment | null | undefined,
  now: Date = new Date(),
): WatchDecision {
  if (!enrollment) return { allowed: false, reason: 'no_enrollment' };
  if (enrollment.revokedAt !== null && enrollment.revokedAt <= now) {
    return { allowed: false, reason: 'revoked' };
  }
  if (enrollment.expiresAt !== null && enrollment.expiresAt <= now) {
    return { allowed: false, reason: 'expired' };
  }
  return { allowed: true };
}

/**
 * プレビュー回は Enrollment なしで見られる(業務ルール3)。
 * ここを canWatch に混ぜないのは、「権利の判定」と「そもそも権利が要るか」を
 * 分けておかないと、プレビュー判定のバグが権利判定のバグになるため。
 */
export function canWatchLesson(
  lesson: { isPreview: boolean },
  enrollment: Enrollment | null | undefined,
  now: Date = new Date(),
): WatchDecision {
  if (lesson.isPreview) return { allowed: true };
  return canWatch(enrollment, now);
}
