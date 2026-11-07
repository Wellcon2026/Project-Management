# Wellcon PM

ระบบบริหารโครงการ — บริษัท เวลล์คอน อินทีเรีย จำกัด

`index.html` เป็นไฟล์เดียวจบ (inline ทุกอย่าง) ใช้งานแบบ offline ได้

## Deploy
Static — ไม่ต้อง build. Vercel จะ serve `index.html` ที่ root อัตโนมัติ

## Update
```bash
git add .
git commit -m "update"
git push
```

## Quick Measure — วัดพื้นที่ด่วนบนมือถือ (ตั้งแต่ 07/11/2026)
หน้าแยก ไม่อยู่ใน `index.html`: `quick-measure.html` + `quick-measure.js` + `takeoff-engine.js` + `vendor/`
- เปิดจากเมนู **วัดพื้นที่ด่วน (มือถือ)** ในหน้าโครงการ → `/quick-measure.html?pid=<id>` (`&env=staging` = ข้อมูลทดสอบ)
- ข้อมูล: ตาราง `takeoff_field_measures` + `takeoff_field_sheets` (SQL: `supabase-quick-measure.sql`) · อ่านแบบ/โซนจาก QS ผ่าน `takeoff_pm_feed` เท่านั้น · ไม่มีราคา

### อัปเดตสูตรคำนวณ (takeoff-engine.js) จาก QS
ห้ามแก้ `takeoff-engine.js` ใน repo นี้ — แก้ที่ `wellcon-qs-takeoff` แล้วคัดลอกมา:
```bash
node scripts/sync-engine.js --check
```
```bash
node scripts/sync-engine.js
```
(คำสั่งแรกเช็ก `ENGINE_VERSION` ว่าตรงกับ QS ไหม · คำสั่งที่สองคัดลอกไฟล์ใหม่ พร้อมทดสอบสูตรพื้นที่ก่อนเขียนทับ)

### ปุ่มเมนูใน index.html
`index.html` มาจาก canvas — ถ้าอัปโหลดไฟล์ใหม่จาก canvas ที่ยังไม่มีเมนูนี้ ให้รัน (รันซ้ำได้ ไม่ซ้อน):
```bash
node scripts/patch-quick-measure-menu.js
```
