-- =====================================================================
-- Wellcon PM : ย้าย Takeoff เดิม → วัดพื้นที่ด่วน ใน "ข้อมูลจริง" (แผน ก ขั้น 2 ปิดท้าย) — DRAFT รอคุณบัญชาอนุมัติ
-- ต้องรัน supabase-takeoff-legacy-migrate.sql มาก่อน (รันแล้ว 08/11/2026: backup + ฟังก์ชัน + staging ย้ายจริงผ่าน)
-- ทำ: ย้ายจริงใน public (รันซ้ำได้ ไม่ซ้ำแถว) · ไม่ลบ/ไม่แก้ app_state 'takeoff' เดิม (แท็บเดิมยังใช้ได้)
-- ย้อนกลับ: delete from public.takeoff_field_measures where legacy_id is not null;
--          delete from public.takeoff_field_sheets   where legacy_id is not null;
-- =====================================================================
select 'public (ย้ายจริง)' as run, public.takeoff_legacy_migrate(false) as result
union all
select 'public (รันซ้ำ ต้องไม่เพิ่ม)', public.takeoff_legacy_migrate(false);
