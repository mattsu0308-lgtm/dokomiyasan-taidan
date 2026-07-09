import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDataProvider } from "@/lib/data";
import { getRecipeImageUrl } from "@/lib/design/assets";
import { RecipeThumb } from "@/components/RecipeThumb";
import { RecipeGrid } from "@/components/RecipeCard";

// 静的エクスポート: 全レシピIDをビルド時に列挙して静的生成する
export async function generateStaticParams() {
  const recipes = await getDataProvider().listRecipes();
  return recipes.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getDataProvider().getRecipe(id);
  return { title: recipe?.title ?? "レシピ" };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = getDataProvider();
  const recipe = await provider.getRecipe(id);
  if (!recipe) notFound();

  const related = await provider.getRelatedRecipes(id, 6);
  const badges = [
    recipe.cuisine ? `${recipe.cuisine}風` : null,
    recipe.timeMinutes != null ? `約${recipe.timeMinutes}分` : null,
    recipe.difficulty,
  ].filter((b): b is string => Boolean(b));

  return (
    <main className="px-4 pt-4">
      <Link href="/" className="mb-3 inline-block text-[13px] text-ink-soft">
        ← もどる
      </Link>

      <div className="mx-auto max-w-60">
        <RecipeThumb
          src={getRecipeImageUrl(recipe)}
          alt={recipe.title}
          category={recipe.placeholderCategory}
        />
      </div>

      <h1 className="mt-4 text-lg font-bold leading-snug">{recipe.title}</h1>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <span
            key={b}
            className="rounded-full bg-cream-deep px-2.5 py-1 text-[12px] text-ink-soft"
          >
            {b}
          </span>
        ))}
      </div>

      {/* CTA: Instagram の動画へ(モバイルではIGアプリにディープリンクされる) */}
      <a
        href={recipe.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-full bg-primary py-3.5 text-center text-[15px] font-bold text-white active:bg-primary-deep"
      >
        Instagramで動画を見る
      </a>

      {/* タグ */}
      <section className="mt-5">
        <div className="flex flex-wrap gap-2">
          {[...recipe.ingredientTags, ...recipe.moodTags].map((t) => (
            <Link
              key={t}
              href={`/search?tags=${encodeURIComponent(t)}`}
              className="rounded-full border border-muted bg-white px-3 py-1.5 text-[13px]"
            >
              #{t}
            </Link>
          ))}
        </div>
      </section>

      {/* キャプション */}
      <section className="mt-5 rounded-2xl bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">投稿キャプション</h2>
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
          {recipe.captionRaw}
        </p>
      </section>

      {/* 関連レシピ */}
      {related.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">にているレシピ</h2>
          <RecipeGrid recipes={related} />
        </section>
      )}
    </main>
  );
}
