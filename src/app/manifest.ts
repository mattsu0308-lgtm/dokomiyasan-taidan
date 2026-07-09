import type { MetadataRoute } from "next";

// 静的エクスポート(output: export)で manifest を書き出すために必要
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "まっちのレシピ図鑑",
    short_name: "レシピ図鑑",
    description:
      "Instagramに埋もれた過去レシピを、食材や気分から探せるレシピ図鑑。",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#faf6f0",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
