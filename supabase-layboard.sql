-- =====================================================================
-- Wellcon PM · Layboard (Presentation Board ในโครงการ) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ Wellcon-pm → SQL Editor → New query → วางทั้งไฟล์ → Run
-- รันซ้ำได้ · ไม่ลบ / ไม่แก้ข้อมูลเดิม · สร้างตารางใหม่ 1 ตาราง ทั้ง schema public (ใช้งานจริง) และ staging (ทดสอบ)
--
-- layboard_kv : ที่เก็บงานนำเสนอ Layboard ของแต่ละโครงการ (แยกจากฐานข้อมูลของแอป Layboard เดิม 100%)
--   key     = 'p:<project id>:<ชื่อข้อมูล>'  เช่น p:pMVC:workspace · p:pMVC:doc:d123 · p:pMVC:comments:d123
--   project = รหัสโครงการ PM (ใช้แยกพื้นที่ตามโครงการ)
--   รูปภาพไม่อยู่ในตารางนี้ — อยู่ที่ Storage bucket general-photo/layboard/<project id>/
-- =====================================================================

create or replace function public.wc_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

do $$
declare
  s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then
      raise notice 'skip schema % (not found)', s;
      continue;
    end if;

    execute format($f$
      create table if not exists %1$I.layboard_kv (
        key         text primary key,
        project     text,
        value       jsonb,
        updated_at  timestamptz not null default now(),
        updated_by  text
      );
      create index if not exists layboard_kv_project_idx on %1$I.layboard_kv (project);
      alter table %1$I.layboard_kv enable row level security;
    $f$, s);

    execute format('grant all on %1$I.layboard_kv to anon, authenticated, service_role', s);
    execute format('drop policy if exists layboard_kv_all on %1$I.layboard_kv', s);
    execute format('create policy layboard_kv_all on %1$I.layboard_kv for all using (true) with check (true)', s);
    execute format('drop trigger if exists layboard_kv_touch on %1$I.layboard_kv', s);
    execute format('create trigger layboard_kv_touch before update on %1$I.layboard_kv for each row execute function public.wc_touch()', s);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ตรวจผล: ต้องได้ true ทุกช่อง 2 แถว (public + staging)
select s.schema_name,
       to_regclass(s.schema_name || '.layboard_kv') is not null as has_table,
       exists (select 1 from pg_policies p where p.schemaname = s.schema_name and p.tablename = 'layboard_kv') as has_policy
from information_schema.schemata s
where s.schema_name in ('public','staging')
order by 1;
