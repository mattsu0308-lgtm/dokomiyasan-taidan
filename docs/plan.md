# 実装計画: Instagramレシピ図鑑PWA

作成: 2026-07-08(MVP v0.1 実装時点)

## 位置づけ

「レシピ検索PWA」ではなく、
**「Instagramに埋もれた過去投稿を、フォロワーが自分で探せる"レシピ図鑑"に変えるPWA」**。

将来の販売時はアプリ単体ではなく
**「Instagramレシピ資産化パック」**(過去投稿の取り込み+タグ設計+Meta連携伴走+
プロフィール導線設計+運用改善)として展開する(README参照)。

## MVPの検証目的

フォロワーがプロフィールリンクから来て、レシピを探して、Instagram動画に戻るか。
この体験に価値があるかをまず確かめる。全部入りの完成版を最初から作らない。

## 前提となる事実(Metaエクスポート棚卸し 2026-07-09)

- リールは189本(2024-07〜2026-06)。キャプション・投稿日時は `reels.json` から取得可能
  → **Phase 2の全件投入はInstagram API不要**(エクスポート由来のCSVで可能)
- **投稿別の再生数・保存数・リーチはエクスポートに存在しない**
  → `view_count` は nullable。人気順は `manual_score` / `posted_at` で代替
- エクスポートZIP・フォロワー一覧・コメント等の個人情報はGit管理・外部送信しない

## MVP v0.1 スコープ

**入れたもの**: 公開4ページ(ホーム/さがす/詳細/まとめ)、キーワード検索+タグ絞り込み、
IG動画CTA、seed 36件(全件ダミー明示)、拡張可能なDBスキーマ、PWA manifest。

**後回し(Phase 2〜4)**: Instagram API連携 / cron / トークン自動更新 / views自動取得 /
特集自動生成 / 辞書管理画面 / マルチテナントUI / 管理画面 / PWAオフライン作り込み / AI検索。

## 技術構成

- Next.js(App Router, TypeScript, Tailwind v4)、モバイルファースト
- データアクセス層(`src/lib/data/`)を1枚挟み、v0.1はローカルseedで動作。
  Supabase(スキーマは `supabase/migrations/0001_init.sql`)には
  同じ `DataProvider` インターフェースの実装を追加して差し替える
- PWA: manifest+アイコンのみ(service workerなし。必要になったら最小限のfetch handlerを追加)
- LLM API: ランタイム不使用

## サムネイルの責務分担

- ローカルseed: `thumbnailUrl`(v0.1の表示用)
- DB: `thumbnail_path` nullable(将来Supabase Storage保存前提)
- UI: `RecipeViewModel.thumbnailUrl` のみを見る(Storage実装詳細に依存しない)
- データアクセス層: seed/DBの値を `RecipeViewModel` に変換して返す
- 画像未配置でもビルド・表示が成立する(`src/lib/design/assets.ts` + フォールバック)
- 代表レシピ10〜20件は実サムネに差し替えやすい構造(`thumbnailUrl` にURL/パスを設定するだけ)

## 検索・タグ設計

- タグ検索が主軸。キーワードは title / caption / search_text / タグ名の部分一致(補助)
- 「豚肉」で豚こま/豚バラ/豚ひき肉が全部出るのは**seed側のタグ正規化**で保証
- **感情・用途タグが差別化要素**(Instagram運用上の検索意図に寄せる):
  - 食材: 豚肉 / 鶏肉 / ひき肉 / 牛肉 / 卵 / 豆腐 / キャベツ / もやし / なす / じゃがいも / 玉ねぎ / トマト / きのこ / チーズ / ごはん / 麺 / 鮭 / ツナ缶 など
  - 気分・用途: 時短 / レンジ / さっぱり / がっつり / ヘルシー / こってり / 子どもウケ / **疲れた夜** / **洗い物少ない** / 平日夜 / 作り置き / おつまみ / 節約 / **夫が作れる** / 週末ごちそう

## データ投入ルール

- 実データ(`reels_cleaned.csv`)がリポジトリにない間は、実データ投入をしない
- seedは**明確にダミーとわかるサンプル**(タイトル【サンプル】+ permalink SAMPLE)
  またはユーザー提供データのみ。**実在投稿の中身を推測して作らない**
- CSVスキーマは `docs/csv-import-schema.md`、サンプルは `examples/reels_cleaned.sample.csv`

## 運用コスト

自分用MVPはVercel/Supabase無料枠で月額0円を目指す。
ただし、他クリエイターへの商用提供・販売・継続運用では無料枠に依存せず、
Vercel Pro等の有料プランまたは別ホスティングを前提にする。
「完全無料で販売できる」という表現は使わない。

## ロードマップ

| Phase | 内容 |
|---|---|
| 0 | 設計修正・README/docs整備(完了) |
| 1 | MVP v0.1: 土台+公開4ページ+検索+タグ+IGリンク+manifest(このリポジトリ) |
| 2 | 実データ投入: `reels_cleaned.csv` 由来の189本+初期タグ設計、まとめ追加、クリック計測 |
| 3 | 自分用Instagram連携: API同期・サムネ保存、**views取得は任意**、トークン期限管理+手動復旧導線 |
| 4 | 販売検証: 他クリエイター1人で試験導入、Metaアプリ作成の画面共有伴走(docs/meta-integration-policy.md)、導入手順書、商用ホスティング/保守費の明記 |

## 検証(Phase 1完了条件)

- `npm run build` が通り、全ページがスマホ幅で崩れず表示される
- 「豚肉」検索で豚こま/豚バラ/豚ひき肉レシピが全て出る(タグ経由)
- タグの組み合わせ絞り込みが機能し、URLで共有できる
- 詳細ページのCTAがInstagram permalinkを開く
- 画像未配置でもビルド・表示が成立する
- manifestが存在し、iPhone Safariの「ホーム画面に追加」でstandalone表示される
  (Chromeのinstall prompt・Lighthouse installable判定は必須にしない)
