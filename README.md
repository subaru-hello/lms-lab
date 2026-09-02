# udemy-lms

Udemy講座「TypeScriptで作るLMS: 買った人にだけ動画を見せる、を実装しきる」の制作リポジトリ。

- 貫く問い・カリキュラム: `docs/curriculum.md`
- 業務ルールの正: `docs/domain-requirements.md`
- 収録規約(実装過程の見せ方を含む): `docs/recording.md`
- ラフ台本: `docs/scripts/sectionNN.md`

技術構成: Next.js(App Router) + TypeScript(strict) + Postgres(Drizzle) + Cloudflare R2 + Stripe。

## 制作順

台本を全部書いてから収録に入らない。マイルストーンごとに「実装 → ラフ台本 → 収録 → 通し視聴」を一巡させる。

- M1 パイロット: docs 3点 → S1実装+台本 → Udemyテスト動画審査 → S1収録4本 → 通し視聴で規約確定
- M2: S2〜S3(データモデルと権限)
- M3: S4〜S5(山場)
- M4: S6〜S7(決済と進捗)
- M5: S8〜S9 + 無料プレビュー設定 + 公開

**M1 を終えるまで M2 以降の台本を書かない。**
