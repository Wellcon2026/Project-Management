-- =====================================================================
-- Wellcon PM : ย้าย Takeoff เดิม → วัดพื้นที่ด่วน (แผน ก ขั้น 1–2) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant (Wellcon-pm) → SQL Editor → Run  (รันซ้ำได้ ไม่ซ้ำแถว)
-- ถ้าขึ้น "Potential issue detected" ให้กด Run query (เตือนเพราะ drop constraint/alter table ของตารางวัดพื้นที่ด่วนเอง — ไม่ลบข้อมูล)
--
-- ไฟล์นี้ทำ (ทั้ง public และ staging):
--   1) BACKUP แถว app_state 'takeoff' → ตาราง app_state_backup_takeoff_20261108 (ครั้งเดียว · ปิดสิทธิ์ทุกคน)
--      ** ไม่ลบ/ไม่แก้ app_state 'takeoff' เดิม — แท็บ Takeoff เดิมยังใช้ได้เหมือนเดิม **
--   2) เพิ่มคอลัมน์ให้ตารางวัดพื้นที่ด่วน (ไม่มีราคา):
--        legacy_id (กันย้ายซ้ำ) · color · pattern · count_per (ตัวคูณนับจุด) · waste_pct (% เผื่อ)
--        และอนุญาตชนิด 'note' (โน้ตบนแบบ) สำหรับฟีเจอร์ที่จะยกมาจาก Takeoff เดิม
--   3) ฟังก์ชัน takeoff_legacy_migrate(p_dry) : แปลงข้อมูลเดิม → takeoff_field_sheets / takeoff_field_measures
--        แผ่นแบบ: ลิงก์ general-photo → storage_path · หน้า PDF 1,2,… → 0,1,… · พิกัดเดิมเป็น "จุด PDF" → page_r = 1
--                 สเกล เมตร/จุด → มม./จุด (×1000)
--        รูปที่วัด: poly → พื้นที่ (หักออกตามเดิม) · line → ความยาว (ผนัง: ความสูง ม. → มม.) · count → นับจุด (× ตัวคูณ)
--                   zone → พื้นที่ "โซน/ห้อง" · note → โน้ต · ปริมาณคำนวณสูตรเดียวกับ takeoff-engine.js (ไม่มีสเกล = ว่าง)
--        p_dry = true → ไม่เขียนอะไร คืนรายงานว่าจะย้ายอะไรบ้าง
--   4) staging: ก๊อปแถว 'takeoff' ของข้อมูลจริงมาใส่ staging (ถ้า staging ยังไม่มี) แล้ว "ย้ายจริง" ใน staging เพื่อทดสอบ
--      public: "ทดลองย้าย" (dry run) เท่านั้น — การย้ายจริงใน public ทำในไฟล์ถัดไป หลังทดสอบผ่านและคุณบัญชาอนุมัติ
--
-- ย้อนกลับ: delete from takeoff_field_measures where legacy_id is not null; delete from takeoff_field_sheets where legacy_id is not null;
-- =====================================================================

do $$
declare
  s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    if to_regclass(s || '.takeoff_field_measures') is null then raise notice 'skip % (ยังไม่มีตารางวัดพื้นที่ด่วน)', s; continue; end if;

    -- 1) Backup (ครั้งเดียว)
    if to_regclass(s || '.app_state_backup_takeoff_20261108') is null then
      execute format('create table %1$I.app_state_backup_takeoff_20261108 as
                        select a.*, now() as backed_up_at from %1$I.app_state a where a.id = ''takeoff''', s);
      execute format('alter table %1$I.app_state_backup_takeoff_20261108 enable row level security', s);
      execute format('revoke all on %1$I.app_state_backup_takeoff_20261108 from anon, authenticated', s);
    end if;

    -- 2) คอลัมน์เพิ่ม
    execute format('alter table %1$I.takeoff_field_sheets   add column if not exists legacy_id text', s);
    execute format('alter table %1$I.takeoff_field_measures add column if not exists legacy_id text', s);
    execute format('alter table %1$I.takeoff_field_measures add column if not exists color text', s);
    execute format('alter table %1$I.takeoff_field_measures add column if not exists pattern text', s);
    execute format('alter table %1$I.takeoff_field_measures add column if not exists count_per numeric not null default 1', s);
    execute format('alter table %1$I.takeoff_field_measures add column if not exists waste_pct numeric null', s);
    execute format('create unique index if not exists takeoff_field_sheets_legacy_uq on %1$I.takeoff_field_sheets (legacy_id)', s);
    execute format('create unique index if not exists takeoff_field_measures_legacy_uq on %1$I.takeoff_field_measures (legacy_id)', s);
    execute format('alter table %1$I.takeoff_field_measures drop constraint if exists takeoff_field_measures_type_check', s);
    execute format('alter table %1$I.takeoff_field_measures add constraint takeoff_field_measures_type_check check (type in (''area'',''length'',''count'',''note''))', s);

    -- 3) ฟังก์ชันย้ายข้อมูล
    execute format($f$
      create or replace function %1$I.takeoff_legacy_migrate(p_dry boolean default true)
      returns jsonb
      language plpgsql
      security invoker
      set search_path = %1$I, pg_temp
      as $fn$
      declare
        v jsonb; pid text; proj jsonb; sh jsonb; m jsonb; it jsonb;
        sid uuid; mm numeric; path text; kind text; typ text; P jsonb;
        a numeric; per numeric; L numeric; i int; n int; h numeric; q numeric; u text; perim numeric;
        ns int := 0; nm int := 0; skip_s int := 0; skip_m int := 0; noscale int := 0;
        pre constant text := '/storage/v1/object/public/general-photo/';
      begin
        select a0.data->'v' into v from app_state a0 where a0.id = 'takeoff';
        if v is null or jsonb_typeof(v) <> 'object' then return jsonb_build_object('ok', true, 'note', 'ไม่มีข้อมูล Takeoff เดิม'); end if;

        for pid, proj in select key, value from jsonb_each(v) loop
          -- แผ่นแบบ
          for sh in select x from jsonb_array_elements(coalesce(proj->'sheets','[]'::jsonb)) x loop
            if exists (select 1 from takeoff_field_sheets t where t.legacy_id = 'tk:' || pid || ':' || (sh->>'id')) then skip_s := skip_s + 1; continue; end if;
            path := sh->>'src';
            if path is null or position(pre in path) = 0 then skip_s := skip_s + 1; continue; end if;   -- ไฟล์อยู่ในเครื่องผู้ใช้ ย้ายไม่ได้
            path := substr(path, position(pre in path) + length(pre));
            mm := case when (sh->>'mpu') ~ '^[0-9.eE+-]+$' and (sh->>'mpu')::numeric > 0 then (sh->>'mpu')::numeric * 1000 else null end;
            ns := ns + 1;
            if not p_dry then
              insert into takeoff_field_sheets (pm_project_id, name, storage_path, mime_type, page, page_r, mm_per_px, created_by, legacy_id)
              values (pid, coalesce(sh->>'name',''), path,
                      case when sh->>'type' = 'pdf' then 'application/pdf' else 'image/jpeg' end,
                      greatest(coalesce((sh->>'page')::int, 1) - 1, 0),
                      case when sh->>'type' = 'pdf' then 1 else null end,   -- พิกัดเดิมของ PDF = จุด PDF (ตัวคูณ 1)
                      mm, 'ย้ายจาก Takeoff เดิม', 'tk:' || pid || ':' || (sh->>'id'))
              on conflict (legacy_id) do nothing;
            end if;
          end loop;

          -- รูปที่วัด
          for m in select x from jsonb_array_elements(coalesce(proj->'marks','[]'::jsonb)) x loop
            if exists (select 1 from takeoff_field_measures t where t.legacy_id = 'tk:' || pid || ':' || (m->>'id')) then skip_m := skip_m + 1; continue; end if;
            select t.id, t.mm_per_px into sid, mm from takeoff_field_sheets t where t.legacy_id = 'tk:' || pid || ':' || (m->>'sid');
            if sid is null and not p_dry then skip_m := skip_m + 1; continue; end if;
            if p_dry then
              select case when (x->>'mpu') ~ '^[0-9.eE+-]+$' and (x->>'mpu')::numeric > 0 then (x->>'mpu')::numeric * 1000 end
                into mm from jsonb_array_elements(coalesce(proj->'sheets','[]'::jsonb)) x where x->>'id' = m->>'sid' limit 1;
            end if;
            select x into it from jsonb_array_elements(coalesce(proj->'items','[]'::jsonb)) x where x->>'id' = m->>'itemId' limit 1;
            kind := coalesce(it->>'kind', '');
            P := coalesce(m->'pts', '[]'::jsonb); n := jsonb_array_length(P);
            typ := case m->>'type' when 'poly' then 'area' when 'zone' then 'area' when 'line' then 'length'
                                   when 'count' then 'count' when 'note' then 'note' else null end;
            if typ is null then skip_m := skip_m + 1; continue; end if;
            per := case when typ = 'count' and (it->>'per') ~ '^[0-9.]+$' and (it->>'per')::numeric > 0 then (it->>'per')::numeric else 1 end;
            h := case when typ = 'length' and kind = 'wall' and (it->>'height') ~ '^[0-9.]+$' then (it->>'height')::numeric * 1000 else null end;
            q := null; u := null; perim := null;
            -- สูตรเดียวกับ takeoff-engine.js (measure)
            if typ = 'count' then q := n * per; u := 'จุด';
            elsif typ = 'area' and n >= 3 then
              u := 'ตร.ม.';
              if mm is not null then
                a := 0; L := 0;
                for i in 0 .. n - 1 loop
                  a := a + (P->i->>0)::numeric * (P->((i + 1) %% n)->>1)::numeric - (P->((i + 1) %% n)->>0)::numeric * (P->i->>1)::numeric;
                  L := L + sqrt(power((P->((i + 1) %% n)->>0)::numeric - (P->i->>0)::numeric, 2) + power((P->((i + 1) %% n)->>1)::numeric - (P->i->>1)::numeric, 2));
                end loop;
                q := abs(a) / 2 * mm * mm / 1e6; perim := L * mm / 1000;
                if coalesce((m->>'deduct')::boolean, false) then q := -q; end if;
              end if;
            elsif typ = 'length' and n >= 2 then
              u := case when h > 0 then 'ตร.ม.' else 'ม.' end;
              if mm is not null then
                L := 0;
                for i in 1 .. n - 1 loop
                  L := L + sqrt(power((P->i->>0)::numeric - (P->(i - 1)->>0)::numeric, 2) + power((P->i->>1)::numeric - (P->(i - 1)->>1)::numeric, 2));
                end loop;
                q := L * mm / 1000; if h > 0 then q := q * h / 1000; end if;
              end if;
            end if;
            if typ in ('area','length') and mm is null then noscale := noscale + 1; end if;
            nm := nm + 1;
            if not p_dry then
              insert into takeoff_field_measures (pm_project_id, source, sheet_id, page, mm_per_px, type, pts, name, work, height_mm, deduct,
                                                  qty, unit, perimeter_m, engine_version, status, note, created_by, created_role, color, count_per, waste_pct, legacy_id)
              select pid, 'upload', sid, t.page, mm, typ, P,
                     case when m->>'type' = 'zone' then coalesce(m->>'name','') else '' end,
                     case when m->>'type' = 'zone' then 'โซน/ห้อง' when m->>'type' = 'note' then 'โน้ต' else coalesce(it->>'name','') end,
                     h, coalesce((m->>'deduct')::boolean, false), q, u, perim, 'legacy→1.1.0', 'field',
                     nullif(concat_ws(' · ', case when m->>'type' = 'note' then m->>'text' end, nullif(it->>'trade',''), 'ย้ายจาก Takeoff เดิม'), ''),
                     'ย้ายจาก Takeoff เดิม', 'legacy', it->>'color', per,
                     case when (it->>'waste') ~ '^[0-9.]+$' then (it->>'waste')::numeric end,
                     'tk:' || pid || ':' || (m->>'id')
                from takeoff_field_sheets t where t.id = sid
              on conflict (legacy_id) do nothing;
            end if;
          end loop;
        end loop;

        return jsonb_build_object('ok', true, 'dry_run', p_dry, 'sheets', ns, 'measures', nm,
                                  'measures_without_scale', noscale, 'skipped_sheets', skip_s, 'skipped_measures', skip_m);
      end
      $fn$;
    $f$, s);
    execute format('revoke all on function %1$I.takeoff_legacy_migrate(boolean) from public, anon, authenticated', s);   -- รันได้จาก SQL Editor เท่านั้น
  end loop;
end $$;

-- 4) ทดสอบ: staging ใช้สำเนาข้อมูลจริง แล้วย้ายจริง (staging เท่านั้น)
insert into staging.app_state (id, data, updated_by)
select id, data, 'copy-for-legacy-migrate-test' from public.app_state where id = 'takeoff'
on conflict (id) do nothing;

notify pgrst, 'reload schema';

select 'staging (ย้ายจริง)' as run, staging.takeoff_legacy_migrate(false) as result
union all
select 'staging (รันซ้ำ ต้องไม่เพิ่ม)', staging.takeoff_legacy_migrate(false)
union all
select 'public (ทดลอง ไม่เขียน)', public.takeoff_legacy_migrate(true);
