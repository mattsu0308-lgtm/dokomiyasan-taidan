import Link from "next/link";
import type { RecipeViewModel } from "@/lib/data/types";
import { getRecipeImageUrl } from "@/lib/design/assets";
import { RecipeThumb } from "./RecipeThumb";

export function RecipeCard({ recipe }: { recipe: RecipeViewModel }) {
  const badges = [
    recipe.timeMinutes != null ? `${recipe.timeMinutes}分` : null,
    recipe.difficulty,
  ].filter(Boolean);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block active:opacity-80"
      aria-label={recipe.title}
    >
      <RecipeThumb
        src={getRecipeImageUrl(recipe)}
        alt={recipe.title}
        category={recipe.placeholderCategory}
      />
      <div className="px-1 pt-2">
        <p className="line-clamp-2 text-sm font-bold leading-snug">
          {recipe.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ink-soft">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-cream-deep px-2 py-0.5"
            >
              {b}
            </span>
          ))}
          {recipe.moodTags.slice(0, 2).map((t) => (
            <span key={t} className="text-primary-deep">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function RecipeGrid({ recipes }: { recipes: RecipeViewModel[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}
