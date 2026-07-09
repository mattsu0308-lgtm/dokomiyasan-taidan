import type { RecipeViewModel, RecipeQuery } from "./types";

/**
 * レシピの絞り込み・並び替えの純粋関数。
 *
 * サーバー(seed-provider)・クライアント(SearchClient/HomeList)の両方から使う。
 * 静的エクスポート構成では検索がクライアントで走るため、同じロジックを
 * ここ1箇所に置いて結果方針を一致させる。
 */

function searchText(r: RecipeViewModel): string {
  return [r.title, r.captionRaw, ...r.ingredientTags, ...r.moodTags, r.cuisine ?? ""]
    .join(" ")
    .toLowerCase();
}

export function matchesKeyword(r: RecipeViewModel, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  // 空白区切りは AND 検索
  return kw.split(/[\s　]+/).every((part) => searchText(r).includes(part));
}

export function matchesTags(r: RecipeViewModel, tags: string[]): boolean {
  const own = new Set([...r.ingredientTags, ...r.moodTags]);
  return tags.every((t) => own.has(t));
}

export function sortRecipes(
  list: RecipeViewModel[],
  sort: RecipeQuery["sort"],
): RecipeViewModel[] {
  const byNewest = (a: RecipeViewModel, b: RecipeViewModel) =>
    b.postedAt.localeCompare(a.postedAt);
  if (sort === "newest") return [...list].sort(byNewest);
  // recommended: manual_score 降順 → 新着順(view_count が将来入ればここに追加)
  return [...list].sort(
    (a, b) => (b.manualScore ?? 0) - (a.manualScore ?? 0) || byNewest(a, b),
  );
}

/** キーワード・タグ・並び替え・件数上限をまとめて適用する */
export function filterAndSortRecipes(
  recipes: RecipeViewModel[],
  query: RecipeQuery = {},
): RecipeViewModel[] {
  let list = recipes.filter((r) => {
    if (query.keyword && !matchesKeyword(r, query.keyword)) return false;
    if (query.tags?.length && !matchesTags(r, query.tags)) return false;
    return true;
  });
  list = sortRecipes(list, query.sort ?? "recommended");
  if (query.limit) list = list.slice(0, query.limit);
  return list;
}
