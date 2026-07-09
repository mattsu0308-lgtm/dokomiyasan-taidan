-- ============================================================
--  勤怠アプリ  Supabase セットアップSQL
--  Supabase ダッシュボード → SQL Editor に貼り付けて一度だけ実行してください。
--  勤怠テーブルと、行レベルセキュリティ（本人の行だけ読み書き可）を作成します。
-- ============================================================

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date  date not null,
  clock_in   text,
  clock_out  text,
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

-- 行レベルセキュリティを有効化
alter table public.attendance enable row level security;

-- 既存ポリシーがあれば作り直す
drop policy if exists "attendance_select_own" on public.attendance;
drop policy if exists "attendance_insert_own" on public.attendance;
drop policy if exists "attendance_update_own" on public.attendance;
drop policy if exists "attendance_delete_own" on public.attendance;

-- 自分の行だけ参照・追加・更新・削除できる
create policy "attendance_select_own" on public.attendance
  for select using (auth.uid() = user_id);

create policy "attendance_insert_own" on public.attendance
  for insert with check (auth.uid() = user_id);

create policy "attendance_update_own" on public.attendance
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attendance_delete_own" on public.attendance
  for delete using (auth.uid() = user_id);
