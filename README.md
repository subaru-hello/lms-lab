# lms-lab — 壊れるシステム・壊れないシステム / LMS編

動画を売るサービス（LMS）を実際に作り、**わざと壊して、壊れている画面を見せてから直す**シリーズの実装リポジトリ。

貫く問い: **買った人にだけ、期限つきで、動画を見せる。**

技術構成: Next.js(App Router) + TypeScript(strict) + Postgres(Drizzle) + Cloudflare R2 + Stripe。

## このリポジトリの読み方

レクチャー/記事の単位で git タグを打つ。**壊れている実装もタグとして残す**（ここがこのリポジトリの主眼）。

```
lNN-start     その回の開始状態
lNN-broken    わざと壊れている実装（記事で「破れる」ところ）
lNN-gate      途中の到達点（関門は立ったが、その段はまだ終わっていない）
lNN-complete  その段が終わって動く状態
```

`git diff lNN-broken lNN-complete` が、そのまま「何が足りなかったか」の答えになる。

> 注意: このリポジトリのタグは軽量タグなので `git push --follow-tags` では送られない。
> `git push origin --tags` を使う。気づかないと、手元にはタグがあるのに
> 読者からは1つも見えない状態になる（実際に一度そうなった）。

## 5つの破れ方

| # | 何が起きるか | タグ |
|---|---|---|
| 1 | 公開バケットに置いた動画URLは、シークレットウィンドウで誰でも再生できる | `l41-broken` |
| 2 | m3u8だけ署名しても、セグメントが素通しで落とせる | `l52-broken` |
| 3 | 署名の寿命を10秒にすると、90分の動画は途中で止まる | `l54-broken` |
| 4 | 決済の成功リダイレクトを直叩きすると、払わずに受講権が手に入る | `l62-broken` |
| 5 | 同じWebhookを二度投げると、受講権が二重に増える | `l63-broken` |

## ドキュメント

- `docs/curriculum.md` — 実装ロードマップ（9セクション40段）
- `docs/domain-requirements.md` — 業務ルールの正
- `docs/distribution.md` — 記事とShortsへの割り付け
- `docs/recording.md` — Short収録規約
