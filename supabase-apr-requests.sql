-- =====================================================================
-- Wellcon : ใบขอซื้อ · ใบขอจ้าง — ย้ายจาก app_state 'autoPR' (ข้อมูลก้อนเดียว) → ตารางของตัวเอง 1 ใบ = 1 แถว
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant → SQL Editor → Run  (รันซ้ำได้ · เพิ่มอย่างเดียว ไม่ลบข้อมูล)
--   เหตุผล (ผู้บริหารอนุมัติ 14/11/2026 — ใช้ทุกโครงการ ข้อมูลจะเยอะ):
--   1) PM และ QS กดอนุมัติพร้อมกัน → แบบเดิมเขียนทับทั้งก้อน การอนุมัติของอีกคนอาจหาย
--      แบบใหม่: แก้ทีละแถว + ตรวจเลขเวอร์ชัน (ver) — ชนกันระบบอ่านใหม่แล้วทำซ้ำให้เอง
--   2) แบบเดิมทุกเครื่องโหลดใบทุกโครงการทั้งก้อนทุก 60 วินาที → แบบใหม่โหลดเฉพาะที่เปลี่ยน
--   ไม่มีสิทธิ์ลบแถว (ลบร่าง / ยกเลิก = ตั้งค่าในแถว เก็บประวัติไว้ตรวจสอบ)
--   ข้อมูลเดิมใน app_state 'autoPR' คัดลอกเข้าตาราง และ "เก็บไว้เป็นสำรอง" ไม่ลบ
-- =====================================================================
create or replace function public.wc_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    execute format($f$
      create table if not exists %1$I.apr_requests (
        id          text primary key,
        pid         text not null,
        no          text not null default '',
        doc         text not null default 'pr' check (doc in ('pr','wo')),
        status      text not null default 'draft',
        by_email    text null,
        deleted     boolean not null default false,
        data        jsonb not null default '{}'::jsonb,
        ver         integer not null default 1,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        updated_by  text null
      );
      create index if not exists apr_requests_pid_idx on %1$I.apr_requests (pid, updated_at desc);
      create index if not exists apr_requests_status_idx on %1$I.apr_requests (status);
      create index if not exists apr_requests_upd_idx on %1$I.apr_requests (updated_at desc);
    $f$, s);
    -- v1.9.0: เลขที่ไม่ซ้ำในโครงการเดียวกัน (สองคนสร้างพร้อมกัน → แอปขยับเลขแล้วลองใหม่) · updated_at = เวลาเซิร์ฟเวอร์ (ไม่ขึ้นกับนาฬิกาเครื่อง)
    execute format('create unique index if not exists apr_requests_pid_no_uq on %1$I.apr_requests (pid, no) where no <> ''''', s);
    execute format('drop trigger if exists apr_requests_touch on %1$I.apr_requests', s);
    execute format('create trigger apr_requests_touch before insert or update on %1$I.apr_requests for each row execute function public.wc_touch()', s);
    execute format('revoke all on %1$I.apr_requests from anon', s);
    execute format('revoke delete, truncate on %1$I.apr_requests from authenticated', s);   -- ไม่มีสิทธิ์ลบแถว (schema public ให้สิทธิ์ทั้งหมดเป็นค่าเริ่มต้น)
    execute format('grant select, insert, update on %1$I.apr_requests to authenticated', s);
    execute format('alter table %1$I.apr_requests enable row level security', s);
    execute format('drop policy if exists apr_requests_rw on %1$I.apr_requests', s);
    execute format('create policy apr_requests_rw on %1$I.apr_requests for all to authenticated using (true) with check (true)', s);

    -- คัดลอกใบเดิมจาก app_state 'autoPR' { v: { pid: [pr] } } (ใบที่มีอยู่แล้วในตาราง ไม่ทับ)
    if exists (select 1 from information_schema.tables where table_schema = s and table_name = 'app_state') then
      execute format($f$
        insert into %1$I.apr_requests (id, pid, no, doc, status, by_email, deleted, data, ver, created_at, updated_at, updated_by)
        select pr->>'id', p.key, coalesce(pr->>'no',''),
               case when pr->>'doc' = 'wo' or coalesce(pr->>'no','') like 'WO-%%' then 'wo' else 'pr' end,
               coalesce(nullif(pr->>'status',''),'draft'), lower(pr->>'byEmail'),
               coalesce((pr->>'deleted')::boolean, false), pr, 1,
               coalesce(to_timestamp(nullif(pr->>'at','')::double precision / 1000), now()),
               coalesce(to_timestamp(nullif(pr->>'upd','')::double precision / 1000), now()),
               'migrate:app_state'
        from %1$I.app_state a,
             jsonb_each(coalesce(a.data->'v','{}'::jsonb)) p,
             jsonb_array_elements(case when jsonb_typeof(p.value) = 'array' then p.value else '[]'::jsonb end) pr
        where a.id = 'autoPR' and coalesce(pr->>'id','') <> ''
        on conflict (id) do nothing
      $f$, s);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
