-- =====================================================================
-- Wellcon PM : ตัวกัน QS Tracking (ขั้นต่อจาก supabase-qs-track-patch.sql) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant (Wellcon-pm) → SQL Editor → Run  (รันซ้ำได้)
-- ถ้าขึ้น "Potential issue detected" ให้กด Run query (เตือนเพราะ drop trigger if exists ของตัวกันเอง — ไม่ลบข้อมูล)
--
-- ทำไม: ตอนนี้ PM เวอร์ชันใหม่บันทึก QS Tracking ทีละแถวแล้ว แต่ (1) เครื่องที่เปิดหน้า PM เก่าค้างไว้ หรือ
--       (2) index.html ใหม่จาก canvas ที่ยังไม่มีโค้ดทีละแถว ยังส่ง "ทั้งก้อน" ทับได้ → แถวที่แอป Take-off เพิ่มหายเงียบ
-- ทำอะไร (ทั้ง public และ staging):
--   1) qs_track_patch เดิม + 1 บรรทัด: ติดป้าย "แก้ทีละแถว" ระหว่างทำงาน
--   2) trigger qs_track_guard บน app_state: แถว qsInv / qsBid / qsDoc / qsVo ถ้าถูกแก้หรือลบโดยไม่มีป้ายนี้ → ปฏิเสธ
--      (แอปจะขึ้นว่าบันทึกไม่สำเร็จ แทนที่ข้อมูลจะหาย — แก้โดยรีเฟรชหน้า / รัน patch หลังอัปโหลดจาก canvas)
--   3) qs_track_ready() : แอป Take-off เปิดให้แก้ QS Tracking เฉพาะเมื่อตัวกันพร้อม
-- ไม่แตะแถวอื่นของ app_state · ไม่แก้/ไม่ลบข้อมูล
-- ย้อนกลับ: drop trigger qs_track_guard on app_state (ทั้ง 2 schema)
-- หมายเหตุ: ถ้ารัน supabase-staging.sql (ก๊อปข้อมูลจริงลง staging ใหม่) ตาราง staging.app_state ถูกสร้างใหม่ → รันไฟล์นี้ซ้ำ
-- =====================================================================

do $$
declare
  s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    if to_regclass(s || '.app_state') is null then continue; end if;

    -- 1) qs_track_patch + ป้าย
    -- 2b) ฟังก์ชันหลัก
    execute format($f$
      create or replace function %1$I.qs_track_patch(p_key text, p_ops jsonb, p_by text default null)
      returns jsonb
      language plpgsql
      security invoker
      set search_path = %1$I, pg_temp
      as $fn$
      declare
        v   jsonb;
        op  jsonb;
        t   text;
        gi  int;
        cur jsonb;
        n   int := 0;
      begin
        if p_key not in ('qsInv','qsBid','qsDoc','qsVo') then
          raise exception 'qs_track_patch: key %% not allowed', p_key;   -- %% เพราะอยู่ใน format()
        end if;
        if p_ops is null or jsonb_typeof(p_ops) <> 'array' then
          raise exception 'qs_track_patch: p_ops must be an array';
        end if;
        perform set_config('wc.qs_patch', '1', true);   -- บอกตัวกันว่าเป็นการแก้ทีละแถว (มีผลเฉพาะคำสั่งนี้)
        insert into app_state (id, data) values (p_key, jsonb_build_object('v', '[]'::jsonb)) on conflict (id) do nothing;
        select a.data->'v' into v from app_state a where a.id = p_key for update;   -- ล็อกแถว: เครื่องอื่นรอจนเสร็จ
        if v is null or jsonb_typeof(v) <> 'array' then v := '[]'::jsonb; end if;

        for op in select x from jsonb_array_elements(p_ops) x loop
          t := op->>'op';
          if p_key = 'qsVo' and t in ('gput','gdel','gorder') then
            if t = 'gput' then
              select e.x into cur from jsonb_array_elements(v) e(x) where e.x->>'key' = op->>'key' limit 1;
              v := qs_track__flat(v, jsonb_build_object('op','put','id',op->>'key','after',op->>'after',
                     'row', (coalesce(op->'meta','{}'::jsonb) - 'rows') ||
                            jsonb_build_object('rows', coalesce(cur->'rows', op->'rows', '[]'::jsonb))), 'key');
            elsif t = 'gdel' then
              v := qs_track__flat(v, jsonb_build_object('op','del','id',op->>'key'), 'key');
            else
              v := qs_track__flat(v, jsonb_build_object('op','order','ids',op->'keys'), 'key');
            end if;
          elsif p_key = 'qsVo' then
            gi := null;
            select e.i - 1 into gi from jsonb_array_elements(v) with ordinality e(x, i) where e.x->>'key' = op->>'g' limit 1;
            if gi is null then continue; end if;          -- กลุ่มถูกลบไปแล้วโดยเครื่องอื่น → ข้าม
            v := jsonb_set(v, array[gi::text, 'rows'], qs_track__flat(v->gi->'rows', op, 'id'));
          else
            v := qs_track__flat(v, op, 'id');
          end if;
          n := n + 1;
        end loop;

        update app_state a set data = jsonb_set(coalesce(a.data, '{}'::jsonb), '{v}', v),
                               updated_by = coalesce(p_by, a.updated_by), updated_at = now()
         where a.id = p_key;
        return jsonb_build_object('ok', true, 'ops', n);
      end
      $fn$;
    $f$, s);


    -- 2) ตัวกัน
    execute format($f$
      create or replace function %1$I.qs_track_guard()
      returns trigger
      language plpgsql
      as $fn$
      begin
        if coalesce(current_setting('wc.qs_patch', true), '') <> '1' then
          if tg_op = 'DELETE' then
            raise exception 'QS Tracking (%%) ลบทั้งก้อนไม่ได้', old.id using errcode = 'P0001';
          elsif new.data is distinct from old.data or new.id is distinct from old.id then
            raise exception 'QS Tracking (%%) ต้องบันทึกทีละแถว — แอปเวอร์ชันเก่า กรุณารีเฟรชหน้า', old.id using errcode = 'P0001';
          end if;
        end if;
        return case when tg_op = 'DELETE' then old else new end;
      end
      $fn$;
    $f$, s);
    execute format('drop trigger if exists qs_track_guard on %1$I.app_state', s);
    execute format('create trigger qs_track_guard before update or delete on %1$I.app_state for each row
                    when (old.id in (''qsInv'',''qsBid'',''qsDoc'',''qsVo'')) execute function %1$I.qs_track_guard()', s);
    -- 3) ให้แอป Take-off เช็กได้ว่าตัวกันพร้อมแล้ว (พร้อม = เปิดให้แก้ · ไม่พร้อม = อ่านอย่างเดียวเหมือนเดิม)
    execute format($f$
      create or replace function %1$I.qs_track_ready()
      returns boolean
      language sql
      stable
      set search_path = %1$I, pg_temp
      as $fn$
        select exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname = %2$L and c.relname = 'app_state' and t.tgname = 'qs_track_guard' and t.tgenabled <> 'D')
           and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname = %2$L and p.proname = 'qs_track_patch' and p.prosrc like '%%wc.qs_patch%%')
      $fn$;
    $f$, s, s);
    execute format('revoke all on function %1$I.qs_track_patch(text, jsonb, text) from public, anon', s);
    execute format('grant execute on function %1$I.qs_track_patch(text, jsonb, text) to authenticated', s);
    execute format('revoke all on function %1$I.qs_track_ready() from public, anon', s);
    execute format('grant execute on function %1$I.qs_track_ready() to authenticated', s);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ตรวจผล: true ทุกช่อง 2 แถว
select s.schema_name,
       exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = s.schema_name and c.relname = 'app_state' and t.tgname = 'qs_track_guard') as has_guard,
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = s.schema_name and p.proname = 'qs_track_patch' and p.prosrc like '%wc.qs_patch%') as patch_sets_flag,
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = s.schema_name and p.proname = 'qs_track_ready') as has_ready_fn
from information_schema.schemata s
where s.schema_name in ('public','staging')
order by 1;
