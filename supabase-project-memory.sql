-- Wellcon PM · Project Memory (ความจำถาวรต่อโครงการ ให้ผู้ช่วย AI ใช้อ้างอิง)
-- รันใน Supabase SQL Editor · รันได้ทั้ง public (ของจริง) และ staging — สลับบรรทัด set search_path
set search_path to staging;   -- เปลี่ยนเป็น public ตอนใช้กับของจริง
create table if not exists project_memory (
  id text primary key,
  project text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
grant all on project_memory to anon, authenticated, service_role;
alter table project_memory enable row level security;
drop policy if exists project_memory_all on project_memory;
create policy project_memory_all on project_memory for all using (true) with check (true);
drop trigger if exists project_memory_touch on project_memory;
create trigger project_memory_touch before update on project_memory for each row execute function public.wc_touch();
alter table project_memory replica identity full;
do $$ begin execute 'alter publication supabase_realtime add table '||current_schema()||'.project_memory'; exception when duplicate_object then null; end $$;
select current_schema() as schema, count(*) as rows from project_memory;
