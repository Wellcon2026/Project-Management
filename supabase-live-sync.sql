-- ============================================================
-- Wellcon PM · เปิดโหมด "หลายคนแก้พร้อมกัน" ทั้งระบบ (row-level live sync)
-- รันครั้งเดียวใน Supabase → SQL Editor → New query → Run
-- รันซ้ำได้ ไม่ลบข้อมูลเดิม
--
-- ทำอะไร:
--  1) สร้างตารางรายแถวสำหรับโมดูลที่เคยเก็บเป็นก้อนเดียว
--     (RFI/RFA, Punch list, รายงานประจำวัน, แผนงาน, ใบสั่งซื้อหน้าไซต์,
--      หลักประกัน BG/LG, วงเงินย่อย, วงเงินธนาคาร, งาน QS, ใบเสนอราคา, MEMO)
--  2) เปิด replica identity full ให้ทุกตาราง เพื่อให้ realtime แจ้ง "ลบแถวไหน" ได้ถูกต้อง
--  3) ใส่ตารางทั้งหมดเข้า publication supabase_realtime
--
-- ผลลัพธ์: แต่ละคนเซฟเฉพาะแถวที่ตัวเองแก้ · ไม่เขียนทับงานคนอื่น ·
--          การแก้ของเพื่อนขึ้นบนจอทันทีไม่ต้องรีเฟรช
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function wc_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

do $$
declare
  t text;
  new_tables text[] := array[
    'rfi_log',        -- ทะเบียน RFI / RFA
    'punch_log',      -- Punch list / Defect
    'daily_reports',  -- รายงานประจำวันหน้าไซต์
    'plans',          -- แผนงาน / Look-ahead
    'site_po',        -- ใบสั่งซื้อหน้าไซต์
    'bonds',          -- หลักประกัน BG / LG / เงินสดค้ำ
    'facilities',     -- วงเงินย่อย BG / LG / OD
    'credit_lines',   -- วงเงินรวมต่อธนาคาร
    'qs_jobs',        -- งานถอดปริมาณ / ตีราคา
    'quotes',         -- ใบเสนอราคา
    'memos'           -- MEMO / บันทึกข้อความ
  ];
  all_tables text[] := array[
    'projects','accounts','boq','drawings','material_log','submittals','changes','billing',
    'additional_work','jobs','items','staff','movements','receipts','transfers',
    'rfi_log','punch_log','daily_reports','plans','site_po','bonds','facilities',
    'credit_lines','qs_jobs','quotes','memos'
  ];
begin
  -- 1) สร้างตารางใหม่ (โครงสร้างเดียวกับตารางเดิมทั้งหมด)
  foreach t in array new_tables loop
    execute format($f$
      create table if not exists public.%I (
        id          text primary key,
        project     text,
        data        jsonb not null default '{}'::jsonb,
        updated_at  timestamptz not null default now(),
        updated_by  text
      );
      create index if not exists %I on public.%I (project);
      alter table public.%I enable row level security;
    $f$, t, t||'_project_idx', t, t);

    execute format($f$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I for all using (true) with check (true);
    $f$, t||'_all', t, t||'_all', t);

    execute format($f$
      drop trigger if exists %I on public.%I;
      create trigger %I before update on public.%I
        for each row execute function wc_touch();
    $f$, t||'_touch', t, t||'_touch', t);
  end loop;

  -- 2) + 3) realtime: ส่งค่าแถวเดิมตอนลบ และเข้า publication
  foreach t in array all_tables loop
    begin
      execute format('alter table public.%I replica identity full', t);
    exception when undefined_table then null;
    end;
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_table then null;
    end;
  end loop;
end $$;

-- ตรวจผล: ควรเห็นครบ 11 ตารางใหม่
select table_name from information_schema.tables
where table_schema='public' and table_name in
  ('rfi_log','punch_log','daily_reports','plans','site_po','bonds',
   'facilities','credit_lines','qs_jobs','quotes','memos')
order by table_name;
