// ============================================================
//  Supabase 接続設定
//  下の2つの値を、あなたの Supabase プロジェクトの値に置き換えてください。
//  取得場所: Supabase ダッシュボード → Project Settings → API
//    - SUPABASE_URL      … 「Project URL」
//    - SUPABASE_ANON_KEY … 「Project API keys」の "anon public"
//
//  ※ anon キーはブラウザに公開されても安全な公開鍵です（データは
//     RLS: 行レベルセキュリティで、ログイン本人の行だけに保護されます）。
//     service_role キーは絶対にここに書かないでください。
// ============================================================
window.APP_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
};
