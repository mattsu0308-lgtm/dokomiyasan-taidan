# デザイン・画像生成パイプライン

## 1. このドキュメントの目的

MVP v0.1では、アプリ実装とグラフィック設計を分離する。
このドキュメントは、PWAの世界観・画像アセット・生成プロンプト・レビュー基準を
一箇所にまとめ、誰が(Codex/ChatGPT Images/実装者)何をやるかを固定するためのもの。

## 2. 役割分担

### Claude Code
- MVP全体の設計管理
- Next.js / Supabase / データモデル / ページ構成の実装管理
- Codexに依頼するグラフィックタスクの切り出し
- Codexが作成した画像仕様・プロンプト・レビュー基準をdocsへ反映
- 実装側への画像差し込み指示を整理

### Codex(グラフィック担当 / アートディレクター)
- PWA全体のビジュアルコンセプト整理
- カラーパレット設計
- 画像アセット一覧の作成(用途・サイズ・保存先・ファイル名)
- ChatGPT Images用の英語プロンプト作成
- 生成画像のレビュー基準作成
- UIに入れたときの見え方の指示
- サムネカード・ヒーロー・空状態・カテゴリチップのビジュアル方針作成
- 画像内に文字を入れないルールの徹底
- 実装者向けの画像差し込み指示書作成

**CodexにNext.js実装そのものは丸投げしない。**
必要に応じて、実装者向けの指示書を作らせる。

### ChatGPT Images
- Codexが作成したプロンプトをもとに画像を生成する
- 生成対象: ヒーローイラスト、空状態画像、カテゴリ用アイコン、
  プレースホルダーサムネ、OG背景
- **画像内に日本語文字・英字・数字・ロゴ・透かしは入れない**

## 3. ビジュアルコンセプト

このPWAは、まっちのInstagramに埋もれた過去レシピを、
フォロワーが自分で探せる「レシピ図鑑」。

**目指す雰囲気**:
- あたたかい
- 清潔感がある
- 家庭的
- スマホで見やすい
- Instagramから来ても違和感がない
- レシピアプリというより、保存した投稿を探す感覚
- 男性料理家感より、家族の夜ごはん感
- 忙しい30〜40代が疲れた夜でも探しやすい

**避ける方向**:
- 高級レストラン風
- フードデリバリーアプリ風
- 近未来AI風
- 企業向けSaaS風
- 子どもっぽすぎる手描き感
- ごちゃごちゃした装飾
- 画像内の日本語文字

## 4. カラーパレット

Tailwind(`src/app/globals.css` の CSS変数)と画像生成プロンプトで共用する。

| 役割 | 方向 | HEX候補 |
|---|---|---|
| base | あたたかい白 / 生成り | `#FAF6F0`(深め: `#F3ECE2`) |
| primary | やさしいオレンジ / テラコッタ | `#E07A5F`(濃: `#C96146`) |
| secondary | 淡いグリーン | `#81B29A`(淡: `#DCEBE2`) |
| accent | 卵・チーズを連想する淡い黄色 | `#F2CC8F`(淡: `#FBEED7`) |
| text | 濃いブラウン / チャコール | `#3D2C29`(弱: `#6F5F58`) |
| muted | 薄いベージュ / グレージュ | `#E8E0D5` |

## 5. 必要画像アセット一覧

| # | アセット | 用途 | 保存先・ファイル名 | 比率 |
|---|---|---|---|---|
| 1 | ホーム用ヒーローイラスト | ホーム上部 | `public/images/illustrations/hero-kitchen.png` | 16:9 |
| 2 | 検索0件の空状態イラスト | 検索結果0件時 | `public/images/illustrations/empty-search.png` | 1:1 |
| 3 | カテゴリアイコン(8種) | タグチップ・まとめの補助 | `public/images/icons/icon-time-saving.png` / `icon-microwave.png` / `icon-refreshing.png` / `icon-hearty.png` / `icon-kids.png` / `icon-tired-night.png` / `icon-less-dishes.png` / `icon-weeknight.png` | 1:1 |
| 4 | サムネ用プレースホルダー(8種) | 実サムネがないレシピ | `public/images/placeholders/default-recipe.png` / `placeholder-pork.png` / `placeholder-chicken.png` / `placeholder-egg.png` / `placeholder-cheese.png` / `placeholder-vegetable.png` / `placeholder-microwave.png` / `placeholder-rice-bowl.png` | 9:16 |
| 5 | OG画像背景 | 将来のSNSシェア用(MVPでは背景のみ) | `public/images/og/recipe-og-bg.png` | 1200×630 |

内容の想定:
- ヒーロー: 夜の家庭のキッチン、スマホ、湯気のある夜ごはん、あたたかい家庭感
- 空状態: 空のお皿、虫眼鏡、スマホ、少しの食材
- カテゴリ: 時短/レンジ/さっぱり/がっつり/子どもウケ/疲れた夜/洗い物少ない/平日夜

## 6. ChatGPT Images用プロンプト集

各プロンプトは必ず「用途・構図・描くもの・色味・雰囲気・スタイル・アスペクト比・禁止事項」
を含み、末尾に `No text, no letters, no numbers, no logos, no watermark.` を入れる。

共通スタイル(全プロンプトに適用):
> Style: modern flat illustration, soft rounded shapes, minimal details, warm off-white background (#FAF6F0), gentle terracotta orange accents (#E07A5F), pale green secondary accents (#81B29A), soft pale yellow highlights (#F2CC8F), subtle shadows.
> Mood: warm, helpful, calm, beginner-friendly, not childish.

### hero-kitchen.png

```
Create a warm, clean flat illustration for a mobile recipe discovery PWA.

Scene: a cozy home kitchen in the evening, a smartphone on the counter, a steaming homemade dinner, soft kitchen light, warm family dinner atmosphere.

Style: modern flat illustration, soft rounded shapes, minimal details, warm off-white background, gentle terracotta orange accents, pale green secondary accents, subtle shadows.

Mood: warm, helpful, calm, beginner-friendly, not childish.

Composition: horizontal hero image with some empty space for UI text overlay.

No text, no letters, no numbers, no logos, no watermark.

Aspect ratio: 16:9.
```

### empty-search.png

```
Create a small, friendly flat illustration for the "no search results" state of a mobile recipe app.

Scene: an empty plate on a warm counter, a magnifying glass leaning against it, a smartphone lying nearby, one or two small vegetables (a tomato, a green leaf) placed casually.

Style: modern flat illustration, soft rounded shapes, minimal details, warm off-white background (#FAF6F0), gentle terracotta orange accents (#E07A5F), pale green secondary accents (#81B29A), subtle shadows.

Mood: gentle and encouraging, not sad, not childish.

Composition: centered subject with generous empty margin so it can sit small in the middle of a mobile screen.

No text, no letters, no numbers, no logos, no watermark.

Aspect ratio: 1:1.
```

### カテゴリアイコン(8種共通テンプレート)

```
Create a simple flat icon for a Japanese home-cooking recipe app category chip.

Subject: {SUBJECT}

Style: single friendly object, modern flat illustration, soft rounded shapes, thick simple forms readable at 32px, warm off-white background (#FAF6F0), terracotta orange (#E07A5F) and pale green (#81B29A) accents.

Mood: warm, homey, clean.

Composition: one centered object filling about 70% of the canvas.

No text, no letters, no numbers, no logos, no watermark.

Aspect ratio: 1:1.
```

`{SUBJECT}` の指定:

| ファイル | SUBJECT |
|---|---|
| icon-time-saving.png | a kitchen timer with a small steam swirl (time-saving cooking) |
| icon-microwave.png | a friendly microwave oven with a warm glow inside |
| icon-refreshing.png | a small glass bowl with a slice of lemon and a green leaf (light, refreshing food) |
| icon-hearty.png | a big rice bowl piled high with food, steam rising (hearty meal) |
| icon-kids.png | a cute kids' plate with a small flag on the food (kid-friendly meal) |
| icon-tired-night.png | a cozy bowl of soup with steam, under a small crescent moon (easy dinner on a tired night) |
| icon-less-dishes.png | a single pan with a lid and one spoon (one-pan, fewer dishes) |
| icon-weeknight.png | a simple dinner plate with cutlery and a small clock motif (weeknight dinner) |

### サムネ用プレースホルダー(8種共通テンプレート)

```
Create a vertical placeholder illustration for a recipe card in a mobile app (9:16 card).

Subject: {SUBJECT} shown as a simple, appetizing flat illustration on a warm plain background.

Style: modern flat illustration, soft rounded shapes, minimal details, warm background in off-white/cream tones (#FAF6F0 to #F3ECE2), terracotta (#E07A5F), pale green (#81B29A) and soft yellow (#F2CC8F) accents, subtle shadows.

Mood: homemade dinner, warm, clean, not luxurious.

Composition: single dish centered in the upper two-thirds, generous plain space around it so a Japanese title can be overlaid with HTML/CSS below.

No text, no letters, no numbers, no logos, no watermark.

Aspect ratio: 9:16.
```

`{SUBJECT}` の指定:

| ファイル | SUBJECT |
|---|---|
| default-recipe.png | a steaming home-cooked meal on a simple plate |
| placeholder-pork.png | a plate of stir-fried thin pork slices with vegetables |
| placeholder-chicken.png | a plate of juicy grilled chicken pieces |
| placeholder-egg.png | a fluffy omelet on a plate with a soft yolk |
| placeholder-cheese.png | a dish with melted cheese stretching from it |
| placeholder-vegetable.png | a fresh vegetable side dish in a small bowl |
| placeholder-microwave.png | a heat-proof glass bowl of steaming food with a microwave hinted in the background |
| placeholder-rice-bowl.png | a Japanese donburi rice bowl topped with savory meat and an egg yolk |

### recipe-og-bg.png

```
Create a background image for social media link previews (OG image) of a Japanese home-cooking recipe app.

Scene: a warm tabletop seen from above, edges decorated sparsely with small flat illustrations of dishes, vegetables and kitchen tools, large empty area in the center-left for overlaid Japanese text (added later with HTML/CSS).

Style: modern flat illustration, soft rounded shapes, warm off-white base (#FAF6F0), terracotta (#E07A5F), pale green (#81B29A), soft yellow (#F2CC8F) accents.

Mood: warm, homey, clean.

No text, no letters, no numbers, no logos, no watermark.

Aspect ratio: 1200x630 (about 1.9:1).
```

## 7. 生成画像のレビュー基準

採用前に全項目をチェックする:

- [ ] Instagramから来たユーザーに違和感がないか
- [ ] 料理アプリとして清潔感があるか
- [ ] 家庭の夜ごはん感があるか
- [ ] AIっぽすぎないか
- [ ] 高級すぎないか
- [ ] 子どもっぽすぎないか
- [ ] 日本語や謎文字が入っていないか
- [ ] スマホ画面で小さくても意味が伝わるか
- [ ] 9:16サムネカードに入れたときに破綻しないか
- [ ] 背景がごちゃつきすぎていないか
- [ ] UIテキストをHTML/CSSで重ねても読みやすい余白があるか

## 8. 実装者向け画像差し込み指示

- **保存先・ファイル名**: §5の一覧どおりに配置する(パスは
  `src/lib/design/assets.ts` の `IMAGES` / `PLACEHOLDERS` と一致している)
- **配置するだけで反映される**: コード変更は不要。`RecipeThumb` /
  `FallbackImage` が同じパスを参照しており、ファイルが無い間は
  CSSフォールバック(グラデーション+絵文字)を表示している
- **fallback画像**: レシピの `thumbnailUrl` が無い場合は
  `placeholderCategory` に応じたプレースホルダー画像 → それも無ければ
  CSSフォールバック、の順で解決される(`getRecipeImageUrl()`)
- **alt の付け方**: レシピ画像の alt はレシピ名。装飾イラスト(ヒーロー・
  空状態)は `alt=""` で装飾扱いにする
- **9:16カードでの表示ルール**: `object-cover` で埋める。被写体は上2/3に
  収まっている前提(プロンプト側で指定済み)
- **画像内に文字を入れない**: タイトル・タグ・CTA・説明文は必ず
  Next.js側でHTML/CSSとして表示する
- **画像未配置でもビルドは落ちない**: 画像の存在を前提にした import は
  しない(パスは文字列参照のみ)

## 9. Codexへの依頼テンプレート

```
あなたはInstagramレシピ図鑑PWAのグラフィック担当です。

Next.js実装そのものではなく、PWAの世界観・画像アセット設計・ChatGPT Images用プロンプト作成・生成画像のレビュー基準作成を担当してください。

目的は、まっちのInstagramに埋もれた過去レシピを、フォロワーがスマホで探しやすく、作りたくなる"レシピ図鑑"として見せることです。

雰囲気は、あたたかい、清潔感、家庭的、スマホで見やすい、Instagramから来ても違和感がない、家族の夜ごはん感。避けるのは、高級レストラン風、近未来AI風、フードデリバリー風、企業向けSaaS風、子どもっぽすぎる手描き感、画像内の日本語文字です。

MVP v0.1に必要な画像アセットを洗い出し、それぞれの用途・サイズ・保存先・ファイル名・ChatGPT Images用英語プロンプト・レビュー基準を作成してください。

画像内には日本語文字・英字・数字・ロゴ・透かしを入れない前提にしてください。UI上の日本語はHTML/CSSで表示します。

Next.js実装、Instagram API連携、画像生成API連携、cron、管理画面作り込み、AI検索は行わないでください。
```

## 10. やってはいけないこと

- Codexに今回の主担当としてNext.js実装を丸投げする
- CodexにInstagram API連携をさせる
- Codexに画像生成API連携を実装させる
- 画像内に日本語文字を入れる前提にする
- 画像がないとビルド失敗する実装にする
- グラフィックを作り込みすぎてMVP v0.1の実装を遅らせる
- 高級感・AI感・企業感に寄せすぎる
- サムネやヒーローに情報を詰め込みすぎる
- MVP v0.1の範囲を超える
