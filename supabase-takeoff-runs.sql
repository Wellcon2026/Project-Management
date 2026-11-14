-- =====================================================================
-- Wellcon PM : Takeoff · วัดหน้างาน v1.7.0 — "ความยาวหลายช่วง" (บัว / ผนังหลายด้าน รวมเป็นรายการเดียว)
-- รันใน Supabase โปรเจกต์ botecmzshubflokkdant (Wellcon-pm) → SQL Editor → Run  (รันซ้ำได้)
--
-- เพิ่มคอลัมน์ runs (jsonb) ให้ takeoff_field_measures ทั้ง public และ staging:
--   runs = ตำแหน่งเริ่มของแต่ละช่วงใน pts (ไม่นับช่วงแรก) เช่น [4, 7] = pts[0..3] · pts[4..6] · pts[7..]
--   null = เส้นเดียวต่อเนื่อง (ข้อมูลเดิมทั้งหมด)
--   pts ยังเป็นรายการจุดเรียงต่อกันเหมือนเดิม → แอปอื่นที่อ่าน pts ยังอ่านได้ · qty บันทึกเป็นผลรวมทุกช่วง (สูตร takeoff-engine เดิม)
--
-- ย้อนกลับ: alter table <schema>.takeoff_field_measures drop column if exists runs;
-- =====================================================================
do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if to_regclass(s || '.takeoff_field_measures') is null then raise notice 'skip % (ยังไม่มีตารางวัดหน้างาน)', s; continue; end if;
    execute format('alter table %1$I.takeoff_field_measures add column if not exists runs jsonb null', s);
  end loop;
end $$;
