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

### หลังอัปโหลด index.html ใหม่จาก canvas (รันตามลำดับ · รันซ้ำได้ ไม่ซ้อน)
```bash
node scripts/patch-quick-measure-menu.js
```
```bash
node scripts/patch-qs-track-rowsync.js
```
```bash
node scripts/patch-takeoff-unify.js
```
```bash
node scripts/patch-pwa.js
```
```bash
node scripts/patch-work-home.js
```
```bash
node scripts/patch-realtime-bigrow.js
```
```bash
node scripts/patch-claim-menu.js
```
```bash
node scripts/patch-home-picker.js
```
```bash
node scripts/patch-project-overview.js
```
```bash
node scripts/patch-role-home.js
```
```bash
node scripts/patch-home-logout.js
```
(เมนู Takeoff · วัดหน้างาน · QS Tracking บันทึกทีละแถว · ซ่อนแท็บ Takeoff เดิม — เปิดกลับด้วย `?legacyTakeoff=1` · ติดตั้งเป็นแอป + ไอคอน Wellcon PM · หน้าแรกของฉันตามตำแหน่ง · กันรูป/ข้อมูลหายจาก realtime · เมนู Claim · หน้า Home เลือกโครงการ · หน้าภาพรวมโครงการแบบสั้น · หน้าแรกตามบทบาททุกตำแหน่ง · ปุ่มหน้าแรก + ออกจากระบบทุกหน้า)

## Claim · เคลมความเสียหาย (ตั้งแต่ 08/11/2026)
หน้าแยก ไม่อยู่ใน `index.html`: `claim.html` + `claim.js` (ใช้ `vendor/supabase.js` ร่วม)
- เปิดจากเมนู **Claim · เคลมความเสียหาย** ในหน้าโครงการ / ปุ่มบนหน้างานของฉัน → `/claim.html?pid=<id>` (`&env=staging` = ข้อมูลทดสอบ)
- ข้อมูล: `app_state.damageClaims` = `{ <pid>: [claim] }` · `app_state.claimRates` = อัตราค่าแรงเรียกเก็บลูกค้า · PM หลักไม่อ่าน/เขียน 2 คีย์นี้ · ไม่ต้องรัน SQL
- รูป: Storage `general-photo/claims/<pid>/<claimId>/` (เก็บแค่ลิงก์ในข้อมูล)
- ปุ่ม 🏠 หน้าแรก + ออกจากระบบ ในหน้าแยก (claim / quick-measure): `pm-nav.js`
- ราคาในหน้านี้ = ราคาเรียกเก็บลูกค้าเท่านั้น ห้ามใส่ต้นทุน/กำไรจริง · หนังสือเคลมเป็น DRAFT ต้องให้ผู้บริหารตรวจก่อนส่ง
