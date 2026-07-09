import type { RecipeViewModel, RecipeQuery } from "./types";

/**
 * レシピの絞り込み・並び替えの純粋関数。
 *
 * サーバー(seed-provider)・クライアント(SearchClient/HomeList)の両方から使う。
 * 静的エクスポート構成では検索がクライアントで走るため、同じロジックを
 * ここ1箇所に置いて結果方針を一致させる。
 */

/**
 * 表記ゆれの吸収。異なる書き方(漢字/ひらがな/カタカナ)を代表語に寄せてから
 * 照合するので、「鳥」「とり」「トリ」どれで検索しても鶏レシピが出る。
 * 検索対象・検索語の両方に同じ正規化をかける。
 */
const SYNONYMS: [RegExp, string][] = [
  [/鳥|とり|トリ/g, "鶏"],
  [/ぶた|ブタ/g, "豚"],
  [/牛肉|ぎゅう|ビーフ/g, "牛"],
  [/挽き肉|挽肉|ひき肉|ミンチ/g, "ひき肉"],
  [/玉子|たまご|タマゴ/g, "卵"],
  [/とうふ|トウフ/g, "豆腐"],
  [/たまねぎ|タマネギ/g, "玉ねぎ"],
  [/ジャガイモ|じゃがいも|馬鈴薯/g, "じゃが芋"],
  [/なす|ナス|茄子/g, "なす"],
  [/もやし|モヤシ/g, "もやし"],
  [/きゃべつ|キャベツ/g, "キャベツ"],
  [/きのこ|キノコ|茸/g, "きのこ"],
  [/ちーず|チーズ/g, "チーズ"],
  [/ごはん|ご飯|ライス/g, "ごはん"],
  [/めん|麺|ヌードル/g, "麺"],
  [/さけ|サケ|鮭|サーモン/g, "鮭"],
];

function normalize(s: string): string {
  let out = s.toLowerCase();
  for (const [re, rep] of SYNONYMS) out = out.replace(re, rep);
  return out;
}

function searchText(r: RecipeViewModel): string {
  return normalize(
    [r.title, r.captionRaw, ...r.ingredientTags, ...r.moodTags, r.cuisine ?? ""].join(" "),
  );
}

export function matchesKeyword(r: RecipeViewModel, keyword: string): boolean {
  const kw = normalize(keyword.trim());
  if (!kw) return true;
  const text = searchText(r);
  // 空白区切りは AND 検索
  return kw.split(/[\s　]+/).every((part) => text.includes(part));
}

export function matchesTags(r: RecipeViewModel, tags: string[]): boolean {
  const own = new Set([...r.ingredientTags, ...r.moodTags]);
  return tags.every((t) => own.has(t));
}

export function sortRecipes(
  list: RecipeViewModel[],
  sort: RecipeQuery["sort"],
): RecipeViewModel[] {
  // 古い順: 最初の投稿からたどれる。それ以外は新しい順(既定)。
  if (sort === "oldest") {
    return [...list].sort((a, b) => a.postedAt.localeCompare(b.postedAt));
  }
  return [...list].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
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
  list = sortRecipes(list, query.sort ?? "newest");
  if (query.limit) list = list.slice(0, query.limit);
  return list;
}
