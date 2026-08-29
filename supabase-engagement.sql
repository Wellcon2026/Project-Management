-- Wellcon PM · Level Gate (การมีส่วนร่วมรายโครงการ)
-- รันครั้งเดียวใน Supabase → SQL Editor · รันซ้ำได้ปลอดภัย
-- ตารางนี้เป็น ledger แบบ append-only (แต่ละกิจกรรม = 1 แถว) จึงไม่มีการเซฟทับกัน

create table if not exists public.engagement (
  id          text primary key,
  project     text,
  data        jsonb not null default '{}'::jsonb,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

create index if not exists engagement_project_idx on public.engagement (project);
create index if not exists engagement_updated_idx on public.engagement (updated_at desc);

alter table public.engagement enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='engagement' and policyname='engagement_all') then
    create policy engagement_all on public.engagement for all using (true) with check (true);
  end if;
end $$;

-- เปิด realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='engagement') then
    alter publication supabase_realtime add table public.engagement;
  end if;
end $$;
