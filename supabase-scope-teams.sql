-- =====================================================================
-- Wellcon PM : Quick Measure v1.5 — แบ่งขอบเขตงานตามทีม (Scope Markup)
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant → SQL Editor → Run  (รันซ้ำได้ · เพิ่มอย่างเดียว ไม่ลบข้อมูล)
--
-- สิ่งที่ทำ (ทั้ง schema public และ staging):
--   1) takeoff_scope_teams : ทีม / ผู้รับเหมาช่วงของแต่ละโครงการ (ชื่อ · หมวดงาน · สีประจำทีม)
--   2) takeoff_field_measures.team_id : พื้นที่/ความยาว/จุดที่วัด → มอบให้ทีมไหน
-- สิ่งที่ไม่ทำ: ไม่มีคอลัมน์ราคา · ไม่แตะตาราง takeoff_* ของ QS · ไม่ลบข้อมูล
-- =====================================================================
do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    execute format($f$
      create table if not exists %1$I.takeoff_scope_teams (
        id             uuid primary key default gen_random_uuid(),
        pm_project_id  text not null,
        name           text not null,
        trade          text not null default '',      -- หมวดงาน เช่น ฝ้า / พื้น / Built-in
        color          text not null default '#2F6FB0',
        co_ref         text null,                     -- id ผู้รับเหมาในแอป Defect (ถ้านำเข้ามา)
        sort           int  not null default 0,
        created_by     text,
        created_email  text,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        deleted_at     timestamptz null
      );
      create index if not exists takeoff_scope_teams_pm_idx on %1$I.takeoff_scope_teams (pm_project_id);
      alter table %1$I.takeoff_field_measures add column if not exists team_id uuid null;
      create index if not exists takeoff_field_measures_team_idx on %1$I.takeoff_field_measures (team_id) where team_id is not null;
    $f$, s);
    execute format('revoke all on %1$I.takeoff_scope_teams from anon', s);
    execute format('grant select, insert, update, delete on %1$I.takeoff_scope_teams to authenticated', s);
    execute format('alter table %1$I.takeoff_scope_teams enable row level security', s);
    execute format('drop policy if exists takeoff_scope_teams_rw on %1$I.takeoff_scope_teams', s);
    execute format('create policy takeoff_scope_teams_rw on %1$I.takeoff_scope_teams for all to authenticated using (true) with check (true)', s);
    execute format('drop trigger if exists takeoff_scope_teams_touch on %1$I.takeoff_scope_teams', s);
    execute format('create trigger takeoff_scope_teams_touch before update on %1$I.takeoff_scope_teams for each row execute function public.wc_touch()', s);
  end loop;
end $$;
notify pgrst, 'reload schema';
