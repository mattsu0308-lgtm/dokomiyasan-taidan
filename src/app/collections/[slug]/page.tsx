import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDataProvider } from "@/lib/data";
import { RecipeGrid } from "@/components/RecipeCard";

// 静的エクスポート: 全まとめ slug をビルド時に列挙して静的生成する
export async function generateStaticParams() {
  const collections = await getDataProvider().listCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getDataProvider().getCollection(slug);
  return { title: collection?.title ?? "まとめ" };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getDataProvider().getCollection(slug);
  if (!collection) notFound();

  return (
    <main className="px-4 pt-4">
      <Link
        href="/collections"
        className="mb-3 inline-block text-[13px] text-ink-soft"
      >
        ← まとめ一覧
      </Link>
      <h1 className="text-xl font-bold">{collection.title}</h1>
      <p className="mb-5 mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        {collection.description}
      </p>
      <RecipeGrid recipes={collection.recipes} />
    </main>
  );
}
