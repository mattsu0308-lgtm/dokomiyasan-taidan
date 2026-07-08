import type { DataProvider } from "./types";
import { seedProvider } from "./seed-provider";

/**
 * データアクセス層の入口。UI はここから取得した DataProvider だけを使う。
 *
 * v0.1: ローカル seed 実装のみ。
 * 将来: SUPABASE_URL / SUPABASE_ANON_KEY が設定されたら、同じ
 * DataProvider インターフェースを実装した supabase-provider に差し替える
 * (UI・ページ側の変更は不要)。
 */
export function getDataProvider(): DataProvider {
  return seedProvider;
}

export * from "./types";
