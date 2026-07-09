"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { filterAndSortRecipes } from "@/lib/data/filter";
import type { RecipeSort, RecipeViewModel } from "@/lib/data/types";
import { RecipeGrid } from "@/components/RecipeCard";

/**
 * ホームの「レシピ一覧」セクション(クライアント)。
 * 静的エクスポートのため並び替えは URL クエリ(?sort=newest)を
 * useSearchParams で読んでクライアント側で行う。
 */
export function HomeRecipeList({
  allRecipes,
}: {
  allRecipes: RecipeViewModel[];
}) {
  const searchParams = useSearchParams();
  const sort: RecipeSort =
    searchParams.get("sort") === "newest" ? "newest" : "recommended";
  const recipes = filterAndSortRecipes(allRecipes, { sort });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">レシピ一覧</h2>
        <div className="flex gap-1.5 text-[12px]">
          <Link
            href="/"
            className={`rounded-full px-3 py-1 ${
              sort === "recommended"
                ? "bg-primary font-bold text-white"
                : "bg-cream-deep text-ink-soft"
            }`}
          >
            おすすめ順
          </Link>
          <Link
            href="/?sort=newest"
            className={`rounded-full px-3 py-1 ${
              sort === "newest"
                ? "bg-primary font-bold text-white"
                : "bg-cream-deep text-ink-soft"
            }`}
          >
            新着順
          </Link>
        </div>
      </div>
      <RecipeGrid recipes={recipes} />
    </section>
  );
}
