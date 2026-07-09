# 勤怠アプリ（自分用）

フリーランス・在宅ワーク向けの、シンプルな勤怠打刻＆報告用Webアプリです。
出勤・退勤をワンタップで打刻し、月次一覧の確認とCSVダウンロードができます。

**メールでログインするクラウド同期型**なので、スマホでもPCでも
同じURL・同じアカウントでログインすれば、同じ記録を見られます。
フロントは静的サイト（HTML / CSS / JavaScript）、データ保存と認証は
無料の [Supabase](https://supabase.com/) を使います。

## 主な機能

- **打刻**: 「出勤」「退勤」ボタンで現在時刻を記録し、稼働時間を自動計算
- **本日の状態**: 出勤・退勤時刻と稼働時間をトップに表示
- **月次一覧**: 「記録を見る」ボタンで開き、月ごとの出勤・退勤・稼働時間と、稼働日数・合計稼働を表示（初期は非表示ですっきり）
- **手修正**: 打刻忘れや間違いを各日の「修正」から編集・削除
- **CSVダウンロード**: 選択中の月を `日付,曜日,出勤,退勤,稼働時間` 形式で出力（Excelで文字化けしないBOM付きUTF-8）
- **メールログイン＋クラウド同期**: マジックリンク認証。どの端末からでも同じ記録
- **レスポンシブ**: スマホ・PCどちらでも使えるレイアウト

---

## セットアップ（初回のみ・約5〜10分）

クラウド同期には無料の Supabase プロジェクトが必要です。以下を一度だけ行えばOKです。

### 1. Supabase プロジェクトを作る

1. [supabase.com](https://supabase.com/) に登録・ログイン（無料）
2. 「New project」でプロジェクトを作成（リージョンは `Northeast Asia (Tokyo)` などが近くて快適）

### 2. データベースを用意する

1. Supabase ダッシュボードの左メニュー **SQL Editor** を開く
2. このリポジトリの [`supabase-setup.sql`](./supabase-setup.sql) の中身を全部コピーして貼り付け、**Run** を実行
   （勤怠テーブルと、本人の行だけ読み書きできるセキュリティ設定が作られます）

### 3. 接続キーを `config.js` に設定する

1. ダッシュボード **Project Settings → API** を開く
2. 次の2つをコピーし、[`config.js`](./config.js) の該当箇所に貼り付ける
   - **Project URL** → `SUPABASE_URL`
   - **Project API keys** の `anon` `public` → `SUPABASE_ANON_KEY`

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci...（anon public キー）",
};
```

> `anon` キーはブラウザに公開されても安全な公開鍵です。データは行レベルセキュリティ（RLS）で
> ログイン本人の行だけに保護されます。`service_role` キーは絶対に置かないでください。

### 4. ログイン用メールを有効にする

- Supabase の **Authentication → Providers → Email** が有効（初期状態でON）であればOK。
- 公開URL（後述）を **Authentication → URL Configuration → Site URL / Redirect URLs** に登録しておくと、
  マジックリンクから確実にアプリへ戻れます。

---

## 公開手順（Netlify）

どの端末からも同じURLで使えるよう、Netlifyへの公開をおすすめします。

### 方法A: GitHub連携（推奨）

1. [Netlify](https://app.netlify.com/) にログイン
2. 「Add new site」→「Import an existing project」→ GitHub を選択
3. このリポジトリ `dokomiyasan-taidan` を選択
4. 設定はデフォルトのままでOK（`netlify.toml` により publish directory = ルート、build command = 空）
5. 「Deploy」を実行
6. 発行されたURL（例 `https://xxxx.netlify.app`）を、上記「4. ログイン用メール」の Site URL / Redirect URLs に登録

### 方法B: ドラッグ＆ドロップ

1. [Netlify Drop](https://app.netlify.com/drop) を開く
2. このフォルダ（`index.html` などが入ったフォルダ）をドラッグ＆ドロップ

公開後に発行されたURLをスマホのホーム画面に追加すると、アプリのように使えます。

## 使い方

1. 公開URLを開き、メールアドレスを入力して「ログインリンクを送る」
2. 届いたメールのリンクを押すとログイン完了（各端末で最初に1回）
3. 「出勤」「退勤」で打刻。記録は自動でクラウドに保存され、他の端末でも同じ記録が見られます

## データについて

- データはクラウド（Supabase）に保存され、ログインすればどの端末からでも同じ記録を見られます。
- 通信できる環境（ネット接続）が必要です。
- 手元に残したいときは **CSVダウンロード** で書き出せます。

## 技術構成

- 素の HTML / CSS / JavaScript（フレームワーク・ビルド不要）
- 認証・データ保存: Supabase（Auth マジックリンク ＋ PostgreSQL、RLSで本人のみアクセス）
- ファイル構成:
  - `index.html` … 画面構成（ログイン画面＋アプリ本体）
  - `styles.css` … スタイル（モバイルファースト）
  - `app.js` … 認証・打刻・集計・CSV出力などのロジック
  - `config.js` … Supabase の接続設定（あなたの値を記入）
  - `supabase-setup.sql` … テーブルとセキュリティ設定の作成SQL
  - `netlify.toml` … Netlify向け静的配信設定
