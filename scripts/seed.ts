/**
 * Supabase へ seed データを投入するスクリプト(依存パッケージなし・REST 直叩き)。
 *
 * 環境変数がある場合のみ動作する:
 *   SUPABASE_URL              例: https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY service_role キー(サーバー専用。公開しない)
 *
 * 実行: npx tsx scripts/seed.ts
 * 前提: supabase/migrations/0001_init.sql 適用済みの「空の」プロジェクト。
 *       冪等ではないので、再投入する場合は先にテーブルを空にすること。
 */
import { randomUUID } from "node:crypto";
import { seedRecipes, seedCollections } from "../src/data/seed-recipes";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CREATOR_SLUG = process.env.CREATOR_SLUG ?? "macchi";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定のためスキップしました。\n" +
      "Supabase プロジェクトを作成し、環境変数を設定してから再実行してください。",
  );
  process.exit(0);
}

async function insert(table: string, rows: unknown[], params = ""): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`${table} への投入に失敗: ${res.status} ${await res.text()}`);
  }
}

async function main(): Promise<void> {
  const creatorId = randomUUID();
  await insert("creators", [
    {
      id: creatorId,
      slug: CREATOR_SLUG,
      display_name: "まっち",
      instagram_username: "macchi_recipi",
    },
  ]);
  console.log(`creators: 1件 (slug=${CREATOR_SLUG})`);

  // タグ(食材 / 気分)を洗い出して投入
  const tagIds = new Map<string, string>(); // `${kind}:${name}` -> id
  const tagRows: unknown[] = [];
  for (const r of seedRecipes) {
    for (const [kind, names] of [
      ["ingredient", r.ingredientTags],
      ["mood", r.moodTags],
    ] as const) {
      for (const name of names) {
        const key = `${kind}:${name}`;
        if (!tagIds.has(key)) {
          const id = randomUUID();
          tagIds.set(key, id);
          tagRows.push({ id, creator_id: creatorId, kind, name });
        }
      }
    }
  }
  await insert("tags", tagRows);
  console.log(`tags: ${tagRows.length}件`);

  const recipeIds = new Map<string, string>(); // seed id -> uuid
  const recipeRows = seedRecipes.map((r) => {
    const id = randomUUID();
    recipeIds.set(r.id, id);
    return {
      id,
      creator_id: creatorId,
      source: r.source,
      instagram_media_id: r.instagramMediaId ?? null,
      title: r.title,
      caption_raw: r.captionRaw,
      permalink: r.permalink,
      thumbnail_path: null,
      posted_at: r.postedAt,
      view_count: r.viewCount ?? null,
      manual_score: r.manualScore ?? null,
      cuisine: r.cuisine ?? null,
      difficulty: r.difficulty ?? null,
      time_minutes: r.timeMinutes ?? null,
      status: "published",
      search_text: [r.title, ...r.ingredientTags, ...r.moodTags].join(" "),
    };
  });
  await insert("recipes", recipeRows);
  console.log(`recipes: ${recipeRows.length}件`);

  const recipeTagRows: unknown[] = [];
  for (const r of seedRecipes) {
    const rid = recipeIds.get(r.id)!;
    for (const [kind, names] of [
      ["ingredient", r.ingredientTags],
      ["mood", r.moodTags],
    ] as const) {
      for (const name of names) {
        recipeTagRows.push({
          recipe_id: rid,
          tag_id: tagIds.get(`${kind}:${name}`)!,
        });
      }
    }
  }
  await insert("recipe_tags", recipeTagRows);
  console.log(`recipe_tags: ${recipeTagRows.length}件`);

  for (const c of seedCollections) {
    const collectionId = randomUUID();
    await insert("collections", [
      {
        id: collectionId,
        creator_id: creatorId,
        slug: c.slug,
        title: c.title,
        description: c.description,
        published: true,
      },
    ]);
    await insert(
      "collection_items",
      c.recipeIds.map((rid, i) => ({
        collection_id: collectionId,
        recipe_id: recipeIds.get(rid)!,
        position: i,
      })),
    );
  }
  console.log(`collections: ${seedCollections.length}件`);
  console.log("seed 投入が完了しました。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
