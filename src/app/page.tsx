import { Suspense } from "react";
import Link from "next/link";
import { getDataProvider } from "@/lib/data";
import { RecipeCard } from "@/components/RecipeCard";
import { HomeRecipeList } from "./HomeRecipeList";

/**
 * 曜日ごとのおすすめテーマ(ルールベース、AI不使用)。
 * 平日は手数の少ないもの、週末は少し余裕のあるものに寄せる。
 * 静的エクスポートのため曜日判定はビルド時。おすすめ枠はタグ #{tag} を
 * 「すべて見る」導線で補い、ビルド時点のテーマ8件を並べる。
 */
const DAY_THEMES: { label: string; tag: string }[] = [
  { label: "日曜日は、作り置きの日", tag: "作り置き" },
  { label: "月曜日は、とにかく時短で", tag: "時短" },
  { label: "火曜日は、レンジにおまかせ", tag: "レンジ" },
  { label: "水曜日は、家族が喜ぶ一品", tag: "子どもウケ" },
  { label: "木曜日は、がんばらない日", tag: "疲れた夜" },
  { label: "金曜日は、おつまみで乾杯", tag: "おつまみ" },
  { label: "土曜日は、ちょっとごちそう", tag: "週末ごちそう" },
];

export default async function HomePage() {
  const provider = getDataProvider();
  const theme = DAY_THEMES[new Date().getDay()];
  const [todayRecipes, collections, allRecipes] = await Promise.all([
    provider.listRecipes({ tags: [theme.tag], sort: "recommended", limit: 8 }),
    provider.listCollections(),
    provider.listRecipes({ sort: "recommended" }),
  ]);

  return (
    <main className="px-4 pt-5">
      <header className="mb-5">
        <h1 className="text-xl font-bold">まっちのレシピ図鑑</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Instagramのレシピを、食材や気分からさがせます
        </p>
      </header>

      {/* 今日のおすすめ */}
      <section className="mb-7">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-bold">今日のおすすめ</h2>
          <Link
            href={`/search?tags=${encodeURIComponent(theme.tag)}`}
            className="text-[12px] text-primary-deep"
          >
            #{theme.tag} をすべて見る
          </Link>
        </div>
        <p className="mb-3 text-[13px] text-ink-soft">{theme.label}</p>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
          {todayRecipes.map((r) => (
            <div key={r.id} className="w-32 flex-none">
              <RecipeCard recipe={r} />
            </div>
          ))}
        </div>
      </section>

      {/* まとめ */}
      <section className="mb-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-bold">まとめ</h2>
          <Link href="/collections" className="text-[12px] text-primary-deep">
            すべて見る
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
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
      </section>

      {/* 全レシピ(並び替えはクライアント) */}
      <Suspense>
        <HomeRecipeList allRecipes={allRecipes} />
      </Suspense>
    </main>
  );
}
