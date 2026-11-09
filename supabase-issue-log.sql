-- =====================================================================
-- Wellcon · Site Issues (ติดตามงาน / ปัญหาหน้างาน) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ Wellcon-pm → SQL Editor → New query → วางทั้งไฟล์ → Run
-- รันซ้ำได้ · ไม่ลบ / ไม่แก้ข้อมูลเดิม · สร้างตารางใหม่ 1 ตาราง ทั้ง schema public (ใช้งานจริง) และ staging (ทดสอบ)
--
-- issue_log : 1 แถว = 1 เรื่อง (ปักหมุดบนแบบชุดเดียวกับ Defect Check — แบบ/พื้นที่ยังอยู่ที่ app_state 'defectPlans')
--   โครงสร้างเหมือน punch_log ทุกอย่าง : id · project · data (jsonb) · updated_at · updated_by
--   data = { n, cat, title, detail, impact, sev, resp, due, status, tags:[{k,label,ext,by,at}], area, pinOn, x, y, photo…, log:[…] }
--
-- ไม่แตะตารางเดิม (punch_log / accounts / projects / app_state) · ไม่มีคอลัมน์ราคา
-- ข้อจำกัด (เหมือนตาราง *_log ทุกตาราง): ทุกแอปใช้บัญชีฐานข้อมูลกลาง สิทธิ์ "ใครเห็นโครงการไหน" เช็กที่หน้าเว็บ
-- =====================================================================

create extension if not exists "pgcrypto";

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
      create table if not exists %1$I.issue_log (
        id          text primary key,
        project     text,
        data        jsonb not null default '{}'::jsonb,
        updated_at  timestamptz not null default now(),
        updated_by  text
      );
      create index if not exists issue_log_project_idx on %1$I.issue_log (project);
      alter table %1$I.issue_log enable row level security;
    $f$, s);

    execute format('grant all on %1$I.issue_log to anon, authenticated, service_role', s);
    execute format('drop policy if exists issue_log_all on %1$I.issue_log', s);
    execute format('create policy issue_log_all on %1$I.issue_log for all using (true) with check (true)', s);
    execute format('drop trigger if exists issue_log_touch on %1$I.issue_log', s);
    execute format('create trigger issue_log_touch before update on %1$I.issue_log for each row execute function public.wc_touch()', s);

    -- realtime: เห็นการแก้ของเพื่อนทันที + แจ้งแถวที่ถูกลบได้ถูกต้อง
    execute format('alter table %1$I.issue_log replica identity full', s);
    begin
      execute format('alter publication supabase_realtime add table %1$I.issue_log', s);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ตรวจผล: ต้องได้ true ทุกช่อง 2 แถว (public + staging)
select s.schema_name,
       to_regclass(s.schema_name || '.issue_log') is not null as has_table,
       exists (select 1 from pg_policies p where p.schemaname = s.schema_name and p.tablename = 'issue_log') as has_policy,
       exists (select 1 from pg_publication_tables t where t.pubname = 'supabase_realtime' and t.schemaname = s.schema_name and t.tablename = 'issue_log') as has_realtime
from information_schema.schemata s
where s.schema_name in ('public','staging')
order by 1;
