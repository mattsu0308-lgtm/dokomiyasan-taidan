"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { filterAndSortRecipes } from "@/lib/data/filter";
import type { RecipeViewModel } from "@/lib/data/types";
import { RecipeCard } from "@/components/RecipeCard";

/**
 * 曜日ごとのおすすめテーマ(ルールベース、AI不使用)。
 * 平日は手数の少ないもの、週末は少し余裕のあるものに寄せる。
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

/**
 * 「今日のおすすめ」(クライアント)。
 * 静的サイトなので曜日はビルド時に固定されてしまう。それを避けるため、
 * サーバーが渡したビルド時曜日(buildDayIndex)で初期描画してハイドレーションを
 * 合わせ、マウント後に「見ている日の曜日」へ更新する。
 */
export function TodayPicks({
  allRecipes,
  buildDayIndex,
}: {
  allRecipes: RecipeViewModel[];
  buildDayIndex: number;
}) {
  const [day, setDay] = useState(buildDayIndex);
  useEffect(() => {
    setDay(new Date().getDay());
  }, []);

  const theme = DAY_THEMES[day];
  const picks = filterAndSortRecipes(allRecipes, {
    tags: [theme.tag],
    sort: "newest",
    limit: 8,
  });

  return (
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
      <p className="mb-3 text-[13px] text-ink-soft">
        {theme.label}
        <span className="ml-2 text-[11px] text-ink-soft/70">よこにスクロール →</span>
      </p>
      <div className="relative">
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pr-10">
          {picks.map((r) => (
            <div key={r.id} className="w-32 flex-none">
              <RecipeCard recipe={r} />
            </div>
          ))}
        </div>
        {/* 右端フェード: まだ先にカードがあることを示す */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/70 to-transparent" />
      </div>
    </section>
  );
}
