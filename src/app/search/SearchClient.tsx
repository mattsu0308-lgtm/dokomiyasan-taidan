"use client";

import { useSearchParams } from "next/navigation";
import { filterAndSortRecipes } from "@/lib/data/filter";
import type { RecipeViewModel } from "@/lib/data/types";
import { RecipeGrid } from "@/components/RecipeCard";
import { TagChip } from "@/components/TagChip";
import { FallbackImage } from "@/components/FallbackImage";
import { IMAGES } from "@/lib/design/assets";

/** ?q=キーワード&tags=タグ1,タグ2 形式。URLだけで検索状態を共有できる */
function buildHref(q: string, tags: string[]): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tags.length) params.set("tags", tags.join(","));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/**
 * 検索UI(クライアント)。静的エクスポートのため、全レシピを props で受け取り、
 * URL クエリ(q / tags)は useSearchParams で読んでクライアント側で絞り込む。
 * フィルタロジックはサーバー(seed-provider)と共通の filter.ts を使う。
 */
export function SearchClient({
  allRecipes,
  tagNames,
}: {
  allRecipes: RecipeViewModel[];
  tagNames: { ingredient: string[]; mood: string[] };
}) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const selectedTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);

  const results = filterAndSortRecipes(allRecipes, {
    keyword: q || undefined,
    tags: selectedTags.length ? selectedTags : undefined,
    sort: "newest",
  });

  const toggleHref = (tag: string) =>
    buildHref(
      q,
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag],
    );

  const hasCondition = Boolean(q) || selectedTags.length > 0;

  return (
    <main className="px-4 pt-5">
      <h1 className="mb-4 text-xl font-bold">さがす</h1>

      {/* キーワード検索(GET フォーム → URL 共有可能) */}
      <form action="/search" method="get" className="mb-5">
        {selectedTags.length > 0 && (
          <input type="hidden" name="tags" value={selectedTags.join(",")} />
        )}
        <div className="flex items-center gap-2 rounded-full border border-muted bg-white px-4 py-2.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-5 w-5 flex-none text-ink-soft"
            aria-hidden
          >
            <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
            <path d="m16 16 5 5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={q}
            key={q}
            placeholder="食材やレシピ名でさがす(例: 豚肉)"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft/60"
          />
        </div>
      </form>

      {/* 食材チップ */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-bold">食材からさがす</h2>
        <div className="flex flex-wrap gap-2">
          {tagNames.ingredient.map((t) => (
            <TagChip
              key={t}
              label={t}
              href={toggleHref(t)}
              selected={selectedTags.includes(t)}
            />
          ))}
        </div>
      </section>

      {/* 気分・シーンチップ */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold">気分・シーンからさがす</h2>
        <div className="flex flex-wrap gap-2">
          {tagNames.mood.map((t) => (
            <TagChip
              key={t}
              label={`#${t}`}
              href={toggleHref(t)}
              selected={selectedTags.includes(t)}
            />
          ))}
        </div>
      </section>

      {/* 結果 */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">
            {hasCondition ? `検索結果 ${results.length}件` : `すべてのレシピ ${results.length}件`}
          </h2>
          {hasCondition && (
            <a href="/search" className="text-[12px] text-primary-deep">
              条件をクリア
            </a>
          )}
        </div>
        {results.length > 0 ? (
          <RecipeGrid recipes={results} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FallbackImage
              src={IMAGES.emptySearch}
              alt=""
              emoji="🍽️"
              className="h-32 w-32"
            />
            <p className="text-sm font-bold">
              この条件のレシピは見つかりませんでした
            </p>
            <p className="text-[13px] text-ink-soft">
              タグを減らすか、別のキーワードで試してみてください
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
