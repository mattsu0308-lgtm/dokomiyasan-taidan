import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的サイトとして書き出す(Cloudflare Pages に 0 円で載せるため)。
  // データは全てローカル seed のため SSR/API 不要。out/ に生成される。
  output: "export",
  // 各ルートを /path/index.html にして静的ホスティングで扱いやすくする
  trailingSlash: true,
};

export default nextConfig;
