/**
 * 段4.1 の実装。**これは壊れている状態**。
 *
 * 動画をR2の公開バケットに置き、その公開URLをそのまま <video src> に渡している。
 * この形だと、URLさえ分かれば誰でも再生できる。ログインも購入も関係ない。
 * 実際に匿名で叩くと 200 が返り、Range リクエストにも 206 を返すので
 * プレイヤーからそのまま流せる(検証結果は docs/breakage/l41.md)。
 *
 * 直すのは段5。公開をやめて、視聴のたびに期限つきの署名URLを発行する形にする。
 */

const publicBase = process.env.R2_PUBLIC_BASE;

export function videoUrl(storageKey: string): string {
  if (!publicBase) throw new Error('R2_PUBLIC_BASE is not set');
  return `${publicBase}/${storageKey}/source.mp4`;
}
