-- ============================================================
-- Wellcon PM · สร้างชุดทดสอบ (STAGING) แยกจากของจริง 100%
-- รันใน Supabase → SQL Editor → New query → Run
-- รันซ้ำได้: ทุกครั้งที่รัน = ล้างข้อมูลทดสอบ แล้วก๊อปจากของจริงใหม่
-- ไม่แตะ schema public (ของจริง) แม้แต่แถวเดียว
-- ============================================================

create schema if not exists staging;
grant usage on schema staging to anon, authenticated, service_role;

do $$
declare
  t text;
  tables text[] := array[
    'projects','accounts','boq','drawings','material_log','submittals','changes','billing',
    'additional_work','jobs','items','staff','movements','receipts','transfers',
    'rfi_log','punch_log','daily_reports','plans','site_po','bonds','facilities',
    'credit_lines','qs_jobs','quotes','memos','engagement','app_state'
  ];
begin
  foreach t in array tables loop
    -- ข้ามตารางที่ยังไม่มีในของจริง
    if not exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      continue;
    end if;
    -- 1) โครงสร้างเหมือน public ทุกอย่าง (คอลัมน์ · default · PK)
    execute format('drop table if exists staging.%I', t);
    execute format('create table staging.%I (like public.%I including all)', t, t);
    -- 2) ก๊อปข้อมูล (ยกเว้น backup ก้อนใหญ่ใน app_state)
    if t='app_state' then
      execute format('insert into staging.%I select * from public.%I where id not like ''backup%%''', t, t);
    else
      execute format('insert into staging.%I select * from public.%I', t, t);
    end if;
    -- 3) สิทธิ์ + RLS เหมือนของจริง (เปิดให้แอปอ่าน-เขียนได้)
    execute format('grant all on staging.%I to anon, authenticated, service_role', t);
    execute format('alter table staging.%I enable row level security', t);
    execute format('drop policy if exists %I on staging.%I', t||'_all', t);
    execute format('create policy %I on staging.%I for all using (true) with check (true)', t||'_all', t);
    -- 4) updated_at อัตโนมัติ + realtime
    execute format('drop trigger if exists %I on staging.%I', t||'_touch', t);
    execute format('create trigger %I before update on staging.%I for each row execute function public.wc_touch()', t||'_touch', t);
    execute format('alter table staging.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table staging.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ปิด "โหมดพักระบบ" และปลดล็อกเวอร์ชันในชุดทดสอบ (กันค่าที่ก๊อปมาล็อกหน้า)
delete from staging.app_state where id in ('maint','appVer','kick_all');

-- ตรวจผล: จำนวนแถวชุดทดสอบเทียบของจริง
select 'accounts' as tbl, (select count(*) from staging.accounts) as staging, (select count(*) from public.accounts) as production
union all select 'projects', (select count(*) from staging.projects), (select count(*) from public.projects)
union all select 'engagement', (select count(*) from staging.engagement), (select count(*) from public.engagement)
union all select 'drawings', (select count(*) from staging.drawings), (select count(*) from public.drawings);
