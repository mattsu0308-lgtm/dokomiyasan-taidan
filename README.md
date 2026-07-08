# dokomiyasan-taidan

## ☀️ 夏の朝活ラジオ体操スタンプラリー

夏休みのラジオ体操スタンプカード風の出席スタンプアプリです。2つの動かし方があります。

### 🅰 完全無料版(おすすめ): [`gas-version/`](./gas-version/)

Googleスプレッドシート + Apps Script で動かすバージョン。**完全無料**で、
スタンプのデータはスプレッドシートに保存されるので消える心配がありません。
参加状況の確認・修正もシートを開くだけ。
→ セットアップ手順は [gas-version/README.md](./gas-version/README.md)

### 🅱 サーバー版: [`radio-taiso-stamps/`](./radio-taiso-stamps/)

Node.jsサーバーで動かすバージョン(Render等にデプロイ、または社内サーバーで起動)。
管理ページ(/admin.html)・CSVダウンロード付き。
→ 使い方は [radio-taiso-stamps/README.md](./radio-taiso-stamps/README.md)

```bash
cd radio-taiso-stamps
node server.js   # http://localhost:3000
```
