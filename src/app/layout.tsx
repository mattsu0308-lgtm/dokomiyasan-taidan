import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "まっちのレシピ図鑑",
    template: "%s | まっちのレシピ図鑑",
  },
  description:
    "Instagramに埋もれた過去レシピを、食材や気分から探せるレシピ図鑑。気になったらInstagramの動画で作り方をチェック。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "レシピ図鑑",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto min-h-dvh max-w-lg pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
