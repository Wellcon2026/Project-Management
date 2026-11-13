-- =====================================================================
-- Wellcon : ระบบแท็ก (แจ้งเตือนเฉพาะคนที่ถูกแท็ก) — ใช้ร่วมทุกแอป (PM · Claim · Quick Measure · Defect Check · Site Issues · Survey)
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant → SQL Editor → Run  (รันซ้ำได้ · เพิ่มอย่างเดียว ไม่ลบข้อมูล)
--   1 แถว = 1 คนที่ถูกแท็ก · seen_at = เห็น popup แล้ว · done_at = กดเสร็จ / รับทราบแล้ว
--   kind: tag = แท็กให้รับทราบ · approve = ขออนุมัติ
-- =====================================================================
do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    execute format($f$
      create table if not exists %1$I.wc_tags (
        id          uuid primary key default gen_random_uuid(),
        app         text not null default 'pm',
        project     text null,
        ref_type    text not null default '',
        ref_id      text not null default '',
        title       text not null default '',
        note        text null,
        url         text null,
        kind        text not null default 'tag' check (kind in ('tag','approve')),
        to_email    text not null,
        to_name     text null,
        from_email  text null,
        from_name   text null,
        created_at  timestamptz not null default now(),
        seen_at     timestamptz null,
        done_at     timestamptz null
      );
      create index if not exists wc_tags_to_idx on %1$I.wc_tags (to_email, done_at);
      create index if not exists wc_tags_ref_idx on %1$I.wc_tags (app, ref_type, ref_id);
    $f$, s);
    execute format('revoke all on %1$I.wc_tags from anon', s);
    execute format('grant select, insert, update on %1$I.wc_tags to authenticated', s);
    execute format('alter table %1$I.wc_tags enable row level security', s);
    execute format('drop policy if exists wc_tags_rw on %1$I.wc_tags', s);
    execute format('create policy wc_tags_rw on %1$I.wc_tags for all to authenticated using (true) with check (true)', s);
  end loop;
end $$;
notify pgrst, 'reload schema';
