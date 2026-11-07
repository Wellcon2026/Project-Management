-- =====================================================================
-- Wellcon PM : QS Tracking บันทึกทีละแถว (ทางเลือก ก) — DRAFT รอคุณบัญชาตรวจก่อนรัน
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant (Wellcon-pm) → SQL Editor → Run  (รันซ้ำได้)
-- ถ้าขึ้น "Potential issue detected" ให้กด Run query (เตือนเพราะ create or replace function — ไม่ลบข้อมูล)
--
-- สิ่งที่ทำ (ทั้ง schema public และ staging):
--   1) BACKUP: คัดลอก 4 แถว qsInv / qsBid / qsDoc / qsVo ของ app_state ไปตาราง app_state_backup_qs_20261107
--      (ทำครั้งเดียว — รันซ้ำไม่ทับ backup เดิม · ปิดสิทธิ์ทุกคน อ่านได้จาก Supabase Dashboard เท่านั้น เพราะมีราคา)
--   2) ฟังก์ชัน qs_track_patch(p_key, p_ops, p_by) : แก้ "ทีละแถว" ใน app_state แบบล็อกแถวก่อนแก้
--      → 2 แอปแก้พร้อมกันคนละแถว ไม่ทับกัน · รูปข้อมูลเดิมไม่เปลี่ยน (ยังเป็นรายการเดิม) ไม่ต้องย้ายข้อมูล
--      คำสั่งที่รับ: put (เพิ่ม/แก้แถว) · del (ลบแถว) · order (เรียงใหม่) · qsVo: gput / gdel / gorder (กลุ่มโครงการ)
--      ใช้ได้เฉพาะ 4 คีย์นี้เท่านั้น
--
-- สิ่งที่ไม่ทำ: ไม่แก้/ไม่ลบข้อมูลเดิม · ไม่แตะ accounts / projects / role / login · ไม่สร้างตารางใหม่ที่แอปใช้
-- ย้อนกลับ: drop function qs_track_patch / qs_track__flat (PM เวอร์ชันใหม่จะกลับไปส่งทั้งก้อนเองอัตโนมัติ)
--          ข้อมูล: update app_state set data = b.data from app_state_backup_qs_20261107 b where app_state.id = b.id
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

    -- 1) Backup (ครั้งเดียว)
    if to_regclass(s || '.app_state_backup_qs_20261107') is null then
      execute format('create table %1$I.app_state_backup_qs_20261107 as
                        select a.*, now() as backed_up_at from %1$I.app_state a where a.id in (''qsInv'',''qsBid'',''qsDoc'',''qsVo'')', s);
      execute format('alter table %1$I.app_state_backup_qs_20261107 enable row level security', s);
      execute format('revoke all on %1$I.app_state_backup_qs_20261107 from anon, authenticated', s);
    end if;

    -- 2a) ตัวช่วย: แก้รายการ (jsonb array) ทีละแถว ตาม key ที่ระบุ (id หรือ key)
    execute format($f$
      create or replace function %1$I.qs_track__flat(arr jsonb, op jsonb, idk text)
      returns jsonb
      language plpgsql
      immutable
      set search_path = %1$I, pg_temp
      as $fn$
      declare
        t   text := op->>'op';
        id  text := op->>'id';
        k   int;
        pos int := 0;
      begin
        if arr is null or jsonb_typeof(arr) <> 'array' then arr := '[]'::jsonb; end if;
        if t = 'put' then
          if id is null or op->'row' is null or jsonb_typeof(op->'row') <> 'object' then return arr; end if;
          select e.i - 1 into k from jsonb_array_elements(arr) with ordinality e(x, i) where e.x->>idk = id limit 1;
          if k is not null then
            return jsonb_set(arr, array[k::text], op->'row');
          end if;
          if op->>'after' is not null then
            select e.i into pos from jsonb_array_elements(arr) with ordinality e(x, i) where e.x->>idk = op->>'after' limit 1;
            pos := coalesce(pos, 0);
          end if;
          return coalesce((select jsonb_agg(z.x order by z.o) from (
                   select e.x, (e.i * 2)::int as o from jsonb_array_elements(arr) with ordinality e(x, i)
                   union all select op->'row', pos * 2 + 1) z), jsonb_build_array(op->'row'));
        elsif t = 'del' then
          return coalesce((select jsonb_agg(e.x order by e.i) from jsonb_array_elements(arr) with ordinality e(x, i)
                           where coalesce(e.x->>idk, '') <> coalesce(id, '')), '[]'::jsonb);
        elsif t = 'order' then
          if jsonb_typeof(op->'ids') <> 'array' then return arr; end if;
          return coalesce((select jsonb_agg(e.x order by coalesce(o.n, 1000000000), e.i)
                           from jsonb_array_elements(arr) with ordinality e(x, i)
                           left join jsonb_array_elements_text(op->'ids') with ordinality o(v, n) on o.v = e.x->>idk), '[]'::jsonb);
        end if;
        return arr;
      end
      $fn$;
    $f$, s);

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

    execute format('revoke all on function %1$I.qs_track__flat(jsonb, jsonb, text) from public, anon', s);
    execute format('revoke all on function %1$I.qs_track_patch(text, jsonb, text) from public, anon', s);
    execute format('grant execute on function %1$I.qs_track__flat(jsonb, jsonb, text) to authenticated', s);
    execute format('grant execute on function %1$I.qs_track_patch(text, jsonb, text) to authenticated', s);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ตรวจผล: ต้องได้ true ทุกช่อง 2 แถว และ backup_rows = 4
select s.schema_name,
       to_regclass(s.schema_name || '.app_state_backup_qs_20261107') is not null as has_backup,
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = s.schema_name and p.proname = 'qs_track_patch') as has_patch_fn
from information_schema.schemata s
where s.schema_name in ('public','staging')
order by 1;
select 'public' as schema_name, count(*) as backup_rows from public.app_state_backup_qs_20261107
union all
select 'staging', count(*) from staging.app_state_backup_qs_20261107;
