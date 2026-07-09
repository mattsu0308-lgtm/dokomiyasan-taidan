import { Suspense } from "react";
import type { Metadata } from "next";
import { getDataProvider } from "@/lib/data";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = { title: "さがす" };

/**
 * 検索ページ。静的エクスポート構成のため、ビルド時に全レシピ・全タグを取得して
 * クライアント(SearchClient)へ渡し、絞り込みは URL クエリを見てクライアントで行う。
 */
export default async function SearchPage() {
  const provider = getDataProvider();
  const [tagNames, allRecipes] = await Promise.all([
    provider.listTagNames(),
    provider.listRecipes({ sort: "newest" }),
  ]);

  return (
    <Suspense>
      <SearchClient allRecipes={allRecipes} tagNames={tagNames} />
    </Suspense>
  );
}
