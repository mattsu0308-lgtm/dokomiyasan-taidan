/**
 * データモデルの型定義。
 *
 * サムネイルの責務分担:
 * - ローカルseed:       `thumbnailUrl` を持つ(v0.1 の表示はこれを使用)
 * - DB(将来):          `thumbnail_path`(Supabase Storage のパス)を持つ
 * - UI:                 `RecipeViewModel.thumbnailUrl` のみを見る
 * - データアクセス層:    seed / DB の値を RecipeViewModel に変換して返す
 *
 * UI コンポーネントは Supabase Storage の実装詳細に依存しない。
 */

export type TagKind = "ingredient" | "mood";

export type Cuisine = "和" | "洋" | "中" | "韓" | "エスニック" | "その他";

export type Difficulty = "かんたん" | "ふつう" | "本格";

/** 画像未配置時に使うプレースホルダのカテゴリ(src/lib/design/assets.ts と対応) */
export type PlaceholderCategory =
  | "default"
  | "pork"
  | "chicken"
  | "egg"
  | "cheese"
  | "vegetable"
  | "microwave"
  | "rice-bowl";

/** ローカル seed データの1レシピ(将来は DB の recipes 行に対応) */
export interface SeedRecipe {
  id: string;
  source: "manual" | "instagram";
  instagramMediaId?: string;
  title: string;
  captionRaw: string;
  permalink: string;
  /** v0.1 表示用。未設定ならプレースホルダにフォールバック */
  thumbnailUrl?: string;
  postedAt: string; // ISO 8601
  /** 投稿別再生数は Meta エクスポートに存在しないため nullable */
  viewCount?: number;
  /** 人気順の手動代替スコア(大きいほど上位) */
  manualScore?: number;
  cuisine?: Cuisine;
  difficulty?: Difficulty;
  timeMinutes?: number;
  ingredientTags: string[];
  moodTags: string[];
  placeholderCategory?: PlaceholderCategory;
}

/** UI が参照する唯一のレシピ表現 */
export interface RecipeViewModel {
  id: string;
  title: string;
  captionRaw: string;
  permalink: string;
  /** 解決済みのサムネURL。null ならプレースホルダ表示 */
  thumbnailUrl: string | null;
  placeholderCategory: PlaceholderCategory;
  postedAt: string;
  viewCount: number | null;
  manualScore: number | null;
  cuisine: Cuisine | null;
  difficulty: Difficulty | null;
  timeMinutes: number | null;
  ingredientTags: string[];
  moodTags: string[];
}

export interface SeedCollection {
  slug: string;
  title: string;
  description: string;
  recipeIds: string[];
}

export interface CollectionViewModel {
  slug: string;
  title: string;
  description: string;
  recipeCount: number;
}

export interface CollectionWithRecipes extends CollectionViewModel {
  recipes: RecipeViewModel[];
}

export type RecipeSort = "recommended" | "newest";

export interface RecipeQuery {
  /** キーワード(title / captionRaw / searchText / タグ名 の部分一致) */
  keyword?: string;
  /** タグ名での絞り込み(すべてに一致 = AND) */
  tags?: string[];
  sort?: RecipeSort;
  limit?: number;
}

/**
 * データアクセス層のインターフェース。
 * v0.1 は seed 実装のみ。Supabase 実装は同じインターフェースで差し替える。
 */
export interface DataProvider {
  listRecipes(query?: RecipeQuery): Promise<RecipeViewModel[]>;
  getRecipe(id: string): Promise<RecipeViewModel | null>;
  /** 共通の食材タグを持つ関連レシピ */
  getRelatedRecipes(id: string, limit?: number): Promise<RecipeViewModel[]>;
  listTagNames(): Promise<{ ingredient: string[]; mood: string[] }>;
  listCollections(): Promise<CollectionViewModel[]>;
  getCollection(slug: string): Promise<CollectionWithRecipes | null>;
}
