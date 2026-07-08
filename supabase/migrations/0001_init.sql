-- Instagramレシピ図鑑 初期スキーマ (MVP v0.1)
--
-- 設計方針:
-- * マルチテナント対応: 全コンテンツが creator_id を持つ。MVPは creators 1行のみ。
-- * view_count は nullable。投稿別再生数はMetaエクスポートに存在せず、
--   Instagram API連携(Phase 3)でも取得できない可能性があるため、
--   人気順は manual_score / posted_at で代替できるようにする。
-- * thumbnail_path は Supabase Storage のパス(nullable)。
--   UI は thumbnailUrl(データアクセス層が解決)しか見ない。

create extension if not exists pg_trgm;

create table creators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  instagram_username text,
  avatar_url text,
  bio text,
  -- 管理者ログイン(将来)。Supabase Auth のユーザーIDを紐付ける
  owner_user_id uuid,
  created_at timestamptz not null default now()
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  source text not null default 'manual' check (source in ('instagram', 'manual')),
  instagram_media_id text,
  title text not null,
  caption_raw text not null default '',
  permalink text not null,
  -- 将来 Supabase Storage に保存する前提のパス。IGのCDN URLは期限切れするため保存しない
  thumbnail_path text,
  posted_at timestamptz,
  -- 投稿別再生数(取得できる場合のみ)。必須にしない
  view_count bigint,
  -- 人気順の手動代替スコア
  manual_score integer,
  cuisine text check (cuisine in ('和', '洋', '中', '韓', 'エスニック', 'その他')),
  difficulty text check (difficulty in ('かんたん', 'ふつう', '本格')),
  time_minutes integer,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- title + 食材タグ等を連結した検索用テキスト(タグ検索が主軸、trgm は補助)
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 手動登録では instagram_media_id が null になるため partial unique index
create unique index recipes_creator_instagram_media_unique
  on recipes (creator_id, instagram_media_id)
  where instagram_media_id is not null;

create index recipes_feed_newest_idx
  on recipes (creator_id, status, posted_at desc);
create index recipes_feed_score_idx
  on recipes (creator_id, status, manual_score desc nulls last, posted_at desc);
create index recipes_search_text_trgm_idx
  on recipes using gin (search_text gin_trgm_ops);

create table tags (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  kind text not null check (kind in ('ingredient', 'mood')),
  name text not null,
  unique (creator_id, kind, name)
);

create index tags_creator_kind_idx on tags (creator_id, kind);

create table recipe_tags (
  recipe_id uuid not null references recipes (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (creator_id, slug)
);

create table collection_items (
  collection_id uuid not null references collections (id) on delete cascade,
  recipe_id uuid not null references recipes (id) on delete cascade,
  position integer not null default 0,
  primary key (collection_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- 将来用(Phase 3 で有効化): Instagram連携のトークン保管
-- MVP v0.1 では作成しない。作成時は RLS で完全非公開(service-role のみ)にする。
--
-- create table creator_secrets (
--   creator_id uuid primary key references creators (id) on delete cascade,
--   ig_access_token text,
--   ig_token_expires_at timestamptz,
--   ig_user_id text
-- );
-- ---------------------------------------------------------------------------

-- RLS: 匿名は published なコンテンツの読み取りのみ。
-- 書き込みは server route (service-role キー) 経由のみ。
alter table creators enable row level security;
alter table recipes enable row level security;
alter table tags enable row level security;
alter table recipe_tags enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;

create policy "anon read creators" on creators
  for select using (true);

create policy "anon read published recipes" on recipes
  for select using (status = 'published');

create policy "anon read tags" on tags
  for select using (true);

create policy "anon read recipe_tags" on recipe_tags
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_tags.recipe_id and r.status = 'published'
    )
  );

create policy "anon read published collections" on collections
  for select using (published);

create policy "anon read collection_items" on collection_items
  for select using (
    exists (
      select 1 from collections c
      where c.id = collection_items.collection_id and c.published
    )
  );
