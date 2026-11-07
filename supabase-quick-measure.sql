-- =====================================================================
-- Wellcon PM : Quick Measure (วัดพื้นที่ด่วนบนมือถือ) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant (Wellcon-pm) → SQL Editor → Run  (รันซ้ำได้ ไม่ลบข้อมูล)
-- แนะนำ: Backup ก่อนรัน · ถ้า Supabase ขึ้น "Potential issue detected" ให้กด Run query
--   (เตือนเพราะมีคำสั่ง drop policy / drop trigger if exists ของตารางใหม่ 2 ตารางนี้เอง — ไม่ลบข้อมูล)
--
-- สิ่งที่ทำ (ทั้ง schema public และ staging):
--   1) takeoff_field_sheets   : รูปถ่าย / PDF ที่ PM หรือ Site Manager อัปโหลดเองหน้างาน + สเกลที่ตั้งเอง
--   2) takeoff_field_measures : ตัวเลขที่ PM / Site Manager วัด (แยกจากตัวเลขของ QS 100%)
--        สถานะ  field = วัดหน้างาน · submitted = รอ QS ตรวจ · accepted = QS รับแล้ว · returned = QS ส่งกลับ
--
-- สิ่งที่ไม่ทำ:
--   • ไม่แตะตาราง takeoff_* ของ QS (takeoff_files / takeoff_items / takeoff_handoffs / ...) — อ่านผ่าน takeoff_pm_feed เท่านั้น
--   • ไม่แตะตารางของ PM (accounts / projects / app_state / role)
--   • ไม่มีคอลัมน์ราคาใด ๆ · ไม่ลบข้อมูล
--
-- ข้อจำกัด (เหมือนตาราง takeoff_* ทุกตาราง): ทุกแอปใช้บัญชีฐานข้อมูลกลางบัญชีเดียว
--   สิทธิ์ "ใครเห็นโครงการไหน" จึงเช็กที่หน้าเว็บ ไม่ใช่ที่ฐานข้อมูล
-- =====================================================================

do $$
declare
  s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then
      raise notice 'skip schema % (not found)', s;
      continue;
    end if;

    -- 1) แผ่นแบบ/รูปถ่ายที่อัปโหลดเองหน้างาน
    execute format($f$
      create table if not exists %1$I.takeoff_field_sheets (
        id             uuid primary key default gen_random_uuid(),
        pm_project_id  text not null,
        name           text not null default '',
        storage_path   text not null,                 -- bucket general-photo (ที่ PM ใช้อยู่) โฟลเดอร์ quick-measure/
        mime_type      text,
        page           int  not null default 0,       -- หน้า PDF (เริ่ม 0)
        page_r         numeric null,                  -- ตัวคูณ render PDF (ใช้ตั้งสเกล 1:N)
        mm_per_px      numeric null check (mm_per_px is null or mm_per_px > 0),
        created_by     text,
        created_email  text,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        deleted_at     timestamptz null
      );
      create index if not exists takeoff_field_sheets_pm_idx on %1$I.takeoff_field_sheets (pm_project_id);
    $f$, s);

    -- 2) ตัวเลขที่วัดหน้างาน
    execute format($f$
      create table if not exists %1$I.takeoff_field_measures (
        id             uuid primary key default gen_random_uuid(),
        pm_project_id  text not null,
        source         text not null check (source in ('qs','upload')),
        qs_file_id     uuid null,                     -- แบบที่ QS ส่งต่อ (อ้างอิงเฉย ๆ ไม่ผูก FK เพื่อแยกจากตาราง QS)
        sheet_id       uuid null references %1$I.takeoff_field_sheets(id) on delete set null,
        page           int  not null default 0,
        mm_per_px      numeric null,                  -- สเกลที่ใช้ตอนวัด (เก็บไว้ตรวจย้อน)
        type           text not null check (type in ('area','length','count')),
        pts            jsonb not null default '[]'::jsonb,
        name           text not null default '',      -- ชื่อห้อง/โซน
        work           text not null default '',      -- งาน เช่น พื้น / ฝ้า / ผนัง / บัว
        height_mm      numeric null check (height_mm is null or height_mm >= 0),
        deduct         boolean not null default false,
        qty            numeric null,                  -- ปริมาณ (ไม่มีราคา)
        unit           text,
        perimeter_m    numeric null,
        engine_version text,
        status         text not null default 'field' check (status in ('field','submitted','accepted','returned')),
        note           text,
        qs_note        text,
        created_by     text,
        created_email  text,
        created_role   text,
        submitted_by   text,
        submitted_at   timestamptz null,
        reviewed_by    text,
        reviewed_at    timestamptz null,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        deleted_at     timestamptz null
      );
      create index if not exists takeoff_field_measures_pm_idx on %1$I.takeoff_field_measures (pm_project_id);
      create index if not exists takeoff_field_measures_status_idx on %1$I.takeoff_field_measures (status) where deleted_at is null;
    $f$, s);

    -- สิทธิ์ + RLS (รูปแบบเดียวกับตาราง takeoff_* ของ QS)
    execute format('revoke all on %1$I.takeoff_field_sheets, %1$I.takeoff_field_measures from anon', s);
    execute format('grant select, insert, update, delete on %1$I.takeoff_field_sheets, %1$I.takeoff_field_measures to authenticated', s);
    execute format('alter table %1$I.takeoff_field_sheets enable row level security', s);
    execute format('alter table %1$I.takeoff_field_measures enable row level security', s);
    execute format('drop policy if exists takeoff_field_sheets_rw on %1$I.takeoff_field_sheets', s);
    execute format('drop policy if exists takeoff_field_measures_rw on %1$I.takeoff_field_measures', s);
    execute format('create policy takeoff_field_sheets_rw on %1$I.takeoff_field_sheets for all to authenticated using (true) with check (true)', s);
    execute format('create policy takeoff_field_measures_rw on %1$I.takeoff_field_measures for all to authenticated using (true) with check (true)', s);
    execute format('drop trigger if exists takeoff_field_sheets_touch on %1$I.takeoff_field_sheets', s);
    execute format('drop trigger if exists takeoff_field_measures_touch on %1$I.takeoff_field_measures', s);
    execute format('create trigger takeoff_field_sheets_touch before update on %1$I.takeoff_field_sheets for each row execute function public.wc_touch()', s);
    execute format('create trigger takeoff_field_measures_touch before update on %1$I.takeoff_field_measures for each row execute function public.wc_touch()', s);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ตรวจผล: ต้องได้ true ทุกช่อง 2 แถว (public + staging)
select s.schema_name,
       to_regclass(s.schema_name || '.takeoff_field_sheets')   is not null as has_sheets,
       to_regclass(s.schema_name || '.takeoff_field_measures') is not null as has_measures,
       exists (select 1 from pg_policies p where p.schemaname = s.schema_name and p.tablename = 'takeoff_field_measures') as has_policy
from information_schema.schemata s
where s.schema_name in ('public','staging')
order by 1;
