import { seedRecipes, seedCollections } from "@/data/seed-recipes";
import type {
  CollectionViewModel,
  CollectionWithRecipes,
  DataProvider,
  RecipeQuery,
  RecipeViewModel,
  SeedRecipe,
} from "./types";

/**
 * ローカル seed データを使う DataProvider 実装(MVP v0.1)。
 * 検索は「タグ一致を主軸+タイトル/キャプションの部分一致を補助」にしていて、
 * 将来の Supabase 実装(タグ結合+pg_trgm)と同じ結果方針になるようにしている。
 */

function toViewModel(r: SeedRecipe): RecipeViewModel {
  return {
    id: r.id,
    title: r.title,
    captionRaw: r.captionRaw,
    permalink: r.permalink,
    thumbnailUrl: r.thumbnailUrl ?? null,
    placeholderCategory: r.placeholderCategory ?? "default",
    postedAt: r.postedAt,
    viewCount: r.viewCount ?? null,
    manualScore: r.manualScore ?? null,
    cuisine: r.cuisine ?? null,
    difficulty: r.difficulty ?? null,
    timeMinutes: r.timeMinutes ?? null,
    ingredientTags: r.ingredientTags,
    moodTags: r.moodTags,
  };
}

function searchText(r: SeedRecipe): string {
  return [r.title, r.captionRaw, ...r.ingredientTags, ...r.moodTags, r.cuisine ?? ""]
    .join(" ")
    .toLowerCase();
}

function matchesKeyword(r: SeedRecipe, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  // 空白区切りは AND 検索
  return kw.split(/[\s　]+/).every((part) => searchText(r).includes(part));
}

function matchesTags(r: SeedRecipe, tags: string[]): boolean {
  const own = new Set([...r.ingredientTags, ...r.moodTags]);
  return tags.every((t) => own.has(t));
}

function sortRecipes(list: SeedRecipe[], sort: RecipeQuery["sort"]): SeedRecipe[] {
  const byNewest = (a: SeedRecipe, b: SeedRecipe) =>
    b.postedAt.localeCompare(a.postedAt);
  if (sort === "newest") return [...list].sort(byNewest);
  // recommended: manual_score 降順 → 新着順(view_count が将来入ればここに追加)
  return [...list].sort(
    (a, b) => (b.manualScore ?? 0) - (a.manualScore ?? 0) || byNewest(a, b),
  );
}

export const seedProvider: DataProvider = {
  async listRecipes(query: RecipeQuery = {}): Promise<RecipeViewModel[]> {
    let list = seedRecipes.filter((r) => {
      if (query.keyword && !matchesKeyword(r, query.keyword)) return false;
      if (query.tags?.length && !matchesTags(r, query.tags)) return false;
      return true;
    });
    list = sortRecipes(list, query.sort ?? "recommended");
    if (query.limit) list = list.slice(0, query.limit);
    return list.map(toViewModel);
  },

  async getRecipe(id: string): Promise<RecipeViewModel | null> {
    const r = seedRecipes.find((x) => x.id === id);
    return r ? toViewModel(r) : null;
  },

  async getRelatedRecipes(id: string, limit = 6): Promise<RecipeViewModel[]> {
    const base = seedRecipes.find((x) => x.id === id);
    if (!base) return [];
    const baseIngredients = new Set(base.ingredientTags);
    const baseMoods = new Set(base.moodTags);
    return seedRecipes
      .filter((r) => r.id !== id)
      .map((r) => {
        const ingredientOverlap = r.ingredientTags.filter((t) =>
          baseIngredients.has(t),
        ).length;
        const moodOverlap = r.moodTags.filter((t) => baseMoods.has(t)).length;
        return { r, score: ingredientOverlap * 2 + moodOverlap };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => toViewModel(x.r));
  },

  async listTagNames(): Promise<{ ingredient: string[]; mood: string[] }> {
    const count = new Map<string, number>();
    const bump = (t: string) => count.set(t, (count.get(t) ?? 0) + 1);
    const ingredient = new Set<string>();
    const mood = new Set<string>();
    for (const r of seedRecipes) {
      r.ingredientTags.forEach((t) => {
        ingredient.add(t);
        bump(t);
      });
      r.moodTags.forEach((t) => {
        mood.add(t);
        bump(t);
      });
    }
    const byUsage = (a: string, b: string) =>
      (count.get(b) ?? 0) - (count.get(a) ?? 0) || a.localeCompare(b, "ja");
    return {
      ingredient: [...ingredient].sort(byUsage),
      mood: [...mood].sort(byUsage),
    };
  },

  async listCollections(): Promise<CollectionViewModel[]> {
    return seedCollections.map((c) => ({
      slug: c.slug,
      title: c.title,
      description: c.description,
      recipeCount: c.recipeIds.length,
    }));
  },

  async getCollection(slug: string): Promise<CollectionWithRecipes | null> {
    const c = seedCollections.find((x) => x.slug === slug);
    if (!c) return null;
    const byId = new Map(seedRecipes.map((r) => [r.id, r]));
    const recipes = c.recipeIds
      .map((id) => byId.get(id))
      .filter((r): r is SeedRecipe => Boolean(r))
      .map(toViewModel);
    return {
      slug: c.slug,
      title: c.title,
      description: c.description,
      recipeCount: recipes.length,
      recipes,
    };
  },
};
