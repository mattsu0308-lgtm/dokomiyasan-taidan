import type { PlaceholderCategory, RecipeViewModel } from "@/lib/data/types";

/**
 * 画像アセットのパス定義とフォールバックユーティリティ。
 *
 * 画像本体は ChatGPT Images で生成後に public/images/ 配下へ配置する
 * (docs/design-asset-pipeline.md 参照)。
 * 「画像が未配置でもビルド・表示が成立する」ことがこのモジュールの責務:
 * UI 側は RecipeThumb コンポーネント経由で、画像の読み込みに失敗したら
 * CSS プレースホルダ(グラデーション+絵文字)に自動フォールバックする。
 */

export const IMAGES = {
  heroKitchen: "/images/illustrations/hero-kitchen.png",
  emptySearch: "/images/illustrations/empty-search.png",
  ogBackground: "/images/og/recipe-og-bg.png",
  icons: {
    timeSaving: "/images/icons/icon-time-saving.png",
    microwave: "/images/icons/icon-microwave.png",
    refreshing: "/images/icons/icon-refreshing.png",
    hearty: "/images/icons/icon-hearty.png",
    kids: "/images/icons/icon-kids.png",
    tiredNight: "/images/icons/icon-tired-night.png",
    lessDishes: "/images/icons/icon-less-dishes.png",
    weeknight: "/images/icons/icon-weeknight.png",
  },
} as const;

interface PlaceholderStyle {
  /** 生成画像を配置したときに使われるパス */
  src: string;
  /** 画像未配置時の CSS フォールバック */
  emoji: string;
  gradient: string;
  label: string;
}

const PLACEHOLDERS: Record<PlaceholderCategory, PlaceholderStyle> = {
  default: {
    src: "/images/placeholders/default-recipe.png",
    emoji: "🍽️",
    gradient: "linear-gradient(160deg, #fbeed7 0%, #f3ece2 100%)",
    label: "レシピ",
  },
  pork: {
    src: "/images/placeholders/placeholder-pork.png",
    emoji: "🥓",
    gradient: "linear-gradient(160deg, #f7d9cc 0%, #f3ece2 100%)",
    label: "豚肉レシピ",
  },
  chicken: {
    src: "/images/placeholders/placeholder-chicken.png",
    emoji: "🍗",
    gradient: "linear-gradient(160deg, #f8e3c9 0%, #f3ece2 100%)",
    label: "鶏肉レシピ",
  },
  egg: {
    src: "/images/placeholders/placeholder-egg.png",
    emoji: "🍳",
    gradient: "linear-gradient(160deg, #fbeed7 0%, #f8e3c9 100%)",
    label: "卵レシピ",
  },
  cheese: {
    src: "/images/placeholders/placeholder-cheese.png",
    emoji: "🧀",
    gradient: "linear-gradient(160deg, #fbecc8 0%, #f3ece2 100%)",
    label: "チーズレシピ",
  },
  vegetable: {
    src: "/images/placeholders/placeholder-vegetable.png",
    emoji: "🥬",
    gradient: "linear-gradient(160deg, #dcebe2 0%, #f3ece2 100%)",
    label: "野菜レシピ",
  },
  microwave: {
    src: "/images/placeholders/placeholder-microwave.png",
    emoji: "⏱️",
    gradient: "linear-gradient(160deg, #ece4f0 0%, #f3ece2 100%)",
    label: "レンジレシピ",
  },
  "rice-bowl": {
    src: "/images/placeholders/placeholder-rice-bowl.png",
    emoji: "🍚",
    gradient: "linear-gradient(160deg, #f3ece2 0%, #fbeed7 100%)",
    label: "ごはんレシピ",
  },
};

/**
 * レシピの表示用画像URLを解決する。
 * 実サムネ(thumbnailUrl)→ カテゴリ別プレースホルダ画像 の順。
 * 返したパスのファイルが未配置の場合は、RecipeThumb が CSS フォールバックを表示する。
 */
export function getRecipeImageUrl(
  recipe: Pick<RecipeViewModel, "thumbnailUrl" | "placeholderCategory">,
): string {
  return recipe.thumbnailUrl ?? PLACEHOLDERS[recipe.placeholderCategory].src;
}

export function getPlaceholderStyle(
  category: PlaceholderCategory,
): PlaceholderStyle {
  return PLACEHOLDERS[category];
}
