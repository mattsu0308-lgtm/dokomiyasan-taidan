import Link from "next/link";
import type { Metadata } from "next";
import { getDataProvider } from "@/lib/data";

export const metadata: Metadata = { title: "まとめ" };

export default async function CollectionsPage() {
  const collections = await getDataProvider().listCollections();

  return (
    <main className="px-4 pt-5">
      <h1 className="mb-1 text-xl font-bold">まとめ</h1>
      <p className="mb-5 text-[13px] text-ink-soft">
        テーマ別にえらんだレシピのまとめです
      </p>
      <div className="flex flex-col gap-3">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="rounded-2xl bg-accent-soft p-5 active:opacity-80"
          >
            <p className="text-base font-bold">{c.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              {c.description}
            </p>
            <p className="mt-2 text-[12px] font-bold text-primary-deep">
              {c.recipeCount}品を見る →
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
