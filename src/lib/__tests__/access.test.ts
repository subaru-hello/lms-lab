import { describe, expect, it } from 'vitest';
import { canWatch, canWatchLesson } from '../access';

const NOW = new Date('2026-09-03T12:00:00Z');
const past = new Date('2026-09-02T12:00:00Z');
const future = new Date('2026-09-04T12:00:00Z');

describe('canWatch', () => {
  it('Enrollment が無ければ拒否', () => {
    expect(canWatch(null, NOW)).toEqual({ allowed: false, reason: 'no_enrollment' });
  });

  it('無期限(expiresAt=null)は許可', () => {
    expect(canWatch({ expiresAt: null, revokedAt: null }, NOW)).toEqual({ allowed: true });
  });

  it('期限が未来なら許可', () => {
    expect(canWatch({ expiresAt: future, revokedAt: null }, NOW)).toEqual({ allowed: true });
  });

  it('期限が過去なら拒否', () => {
    expect(canWatch({ expiresAt: past, revokedAt: null }, NOW)).toEqual({
      allowed: false,
      reason: 'expired',
    });
  });

  it('期限ちょうどは拒否(境界は閉じる)', () => {
    expect(canWatch({ expiresAt: NOW, revokedAt: null }, NOW)).toEqual({
      allowed: false,
      reason: 'expired',
    });
  });

  it('返金で剥がされていれば、期限が未来でも拒否', () => {
    expect(canWatch({ expiresAt: future, revokedAt: past }, NOW)).toEqual({
      allowed: false,
      reason: 'revoked',
    });
  });

  it('無期限でも剥がされていれば拒否', () => {
    expect(canWatch({ expiresAt: null, revokedAt: past }, NOW)).toEqual({
      allowed: false,
      reason: 'revoked',
    });
  });
});

describe('canWatchLesson', () => {
  it('プレビュー回は Enrollment なしでも見られる', () => {
    expect(canWatchLesson({ isPreview: true }, null, NOW)).toEqual({ allowed: true });
  });

  it('プレビュー回は期限切れの人でも見られる', () => {
    expect(canWatchLesson({ isPreview: true }, { expiresAt: past, revokedAt: null }, NOW)).toEqual({
      allowed: true,
    });
  });

  it('プレビューでない回は権利が要る', () => {
    expect(canWatchLesson({ isPreview: false }, null, NOW)).toEqual({
      allowed: false,
      reason: 'no_enrollment',
    });
  });
});
