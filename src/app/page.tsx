import { Suspense } from "react";
import Link from "next/link";
import { getDataProvider } from "@/lib/data";
import { HomeRecipeList } from "./HomeRecipeList";
import { TodayPicks } from "./TodayPicks";

export default async function HomePage() {
  const provider = getDataProvider();
  // ビルド時の曜日。クライアント(TodayPicks)が閲覧日の曜日へ更新する
  const buildDayIndex = new Date().getDay();
  const [collections, allRecipes] = await Promise.all([
    provider.listCollections(),
    provider.listRecipes({ sort: "newest" }),
  ]);

  return (
    <main className="px-4 pt-5">
      <header className="mb-5">
        <h1 className="text-xl font-bold">まっちのレシピ図鑑</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Instagramのレシピを、食材や気分からさがせます
        </p>
      </header>

      {/* 今日のおすすめ(曜日で変化・クライアント) */}
      <Suspense>
        <TodayPicks allRecipes={allRecipes} buildDayIndex={buildDayIndex} />
      </Suspense>

      {/* まとめ */}
      <section className="mb-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-bold">まとめ</h2>
          <Link href="/collections" className="text-[12px] text-primary-deep">
            すべて見る
          </Link>
        </div>
        <div className="relative">
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pr-10">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="flex w-56 flex-none flex-col justify-between rounded-2xl bg-accent-soft p-4 active:opacity-80"
              >
                <p className="text-sm font-bold leading-snug">{c.title}</p>
                <p className="mt-2 text-[12px] text-ink-soft">
                  {c.recipeCount}品のレシピ
                </p>
              </Link>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/70 to-transparent" />
        </div>
      </section>

      {/* 全レシピ(並び替え・折りたたみはクライアント) */}
      <Suspense>
        <HomeRecipeList allRecipes={allRecipes} />
      </Suspense>
    </main>
  );
}
