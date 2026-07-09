"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { filterAndSortRecipes } from "@/lib/data/filter";
import type { RecipeSort, RecipeViewModel } from "@/lib/data/types";
import { RecipeGrid } from "@/components/RecipeCard";

const INITIAL = 12; // 最初に見せる件数
const STEP = 30; // 「もっと見る」で増える件数

/**
 * ホームの「レシピ一覧」セクション(クライアント)。
 * ・並び替え(新しい順/古い順)は URL クエリ(?sort=oldest)で共有可能
 * ・全件を一度に出すと縦に長すぎるので、初期 INITIAL 件→「もっと見る」で追加
 */
export function HomeRecipeList({
  allRecipes,
}: {
  allRecipes: RecipeViewModel[];
}) {
  const searchParams = useSearchParams();
  const sort: RecipeSort =
    searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const [visible, setVisible] = useState(INITIAL);

  // 並び替えを切り替えたら先頭から見せ直す
  useEffect(() => {
    setVisible(INITIAL);
  }, [sort]);

  const recipes = filterAndSortRecipes(allRecipes, { sort });
  const shown = recipes.slice(0, visible);
  const remaining = recipes.length - shown.length;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">レシピ一覧</h2>
        <div className="flex gap-1.5 text-[12px]">
          <Link
            href="/"
            scroll={false}
            className={`rounded-full px-3 py-1 ${
              sort === "newest"
                ? "bg-primary font-bold text-white"
                : "bg-cream-deep text-ink-soft"
            }`}
          >
            新しい順
          </Link>
          <Link
            href="/?sort=oldest"
            scroll={false}
            className={`rounded-full px-3 py-1 ${
              sort === "oldest"
                ? "bg-primary font-bold text-white"
                : "bg-cream-deep text-ink-soft"
            }`}
          >
            古い順
          </Link>
        </div>
      </div>

      <RecipeGrid recipes={shown} />

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + STEP)}
            className="rounded-full border border-primary bg-white px-6 py-2.5 text-sm font-bold text-primary-deep active:bg-cream-deep"
          >
            もっと見る（残り{remaining}件）
          </button>
        </div>
      )}
    </section>
  );
}
