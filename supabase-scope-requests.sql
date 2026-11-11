-- =====================================================================
-- Wellcon PM : Quick Measure v1.6 — ใบขอซื้อ (PR) / ใบขอจ้าง (WO) จากขอบเขตงานของทีม → ส่งเข้า Mango
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant → SQL Editor → Run  (รันซ้ำได้ · เพิ่มอย่างเดียว ไม่ลบข้อมูล)
--
-- takeoff_scope_requests : เอกสารขอซื้อ / ขอจ้างภายใน (ร่าง → อนุมัติ → ส่งจัดซื้อ → ผูกเลขที่ Mango)
--   lines jsonb = [{ work, unit, qty, measured, code, desc, rows:[measure ids] }]  — ไม่มีราคา (ฝ่ายจัดซื้อใส่ราคาใน Mango)
-- =====================================================================
do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    execute format($f$
      create table if not exists %1$I.takeoff_scope_requests (
        id             uuid primary key default gen_random_uuid(),
        pm_project_id  text not null,
        doc_no         text not null,
        kind           text not null check (kind in ('pr','wo')),
        team_id        uuid null,
        vendor_name    text not null default '',
        mango_project  text null,
        need_date      date null,
        note           text null,
        lines          jsonb not null default '[]'::jsonb,
        status         text not null default 'draft' check (status in ('draft','approved','sent','linked','cancelled')),
        mango_no       text null,
        created_by     text, created_email text, created_role text,
        approved_by    text, approved_at timestamptz null,
        sent_by        text, sent_at timestamptz null,
        linked_by      text, linked_at timestamptz null,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        deleted_at     timestamptz null
      );
      create index if not exists takeoff_scope_requests_pm_idx on %1$I.takeoff_scope_requests (pm_project_id);
      create unique index if not exists takeoff_scope_requests_doc_uq on %1$I.takeoff_scope_requests (pm_project_id, doc_no);
    $f$, s);
    execute format('revoke all on %1$I.takeoff_scope_requests from anon', s);
    execute format('grant select, insert, update, delete on %1$I.takeoff_scope_requests to authenticated', s);
    execute format('alter table %1$I.takeoff_scope_requests enable row level security', s);
    execute format('drop policy if exists takeoff_scope_requests_rw on %1$I.takeoff_scope_requests', s);
    execute format('create policy takeoff_scope_requests_rw on %1$I.takeoff_scope_requests for all to authenticated using (true) with check (true)', s);
    execute format('drop trigger if exists takeoff_scope_requests_touch on %1$I.takeoff_scope_requests', s);
    execute format('create trigger takeoff_scope_requests_touch before update on %1$I.takeoff_scope_requests for each row execute function public.wc_touch()', s);
  end loop;
end $$;
notify pgrst, 'reload schema';
