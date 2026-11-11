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
```bash
node scripts/patch-daily-crew.js
```
```bash
node scripts/patch-level-private.js
```
```bash
node scripts/patch-site-issues.js
```
```bash
node scripts/patch-work-arrange.js
```
```bash
node scripts/patch-work-all.js
```
```bash
node scripts/patch-layboard-menu.js
```
```bash
node scripts/patch-layboard-access.js
```
```bash
node scripts/patch-login-robust.js
```
```bash
node scripts/patch-print-lang.js
```
```bash
node scripts/patch-print-translate.js
```
```bash
node scripts/patch-survey-menu.js
```
```bash
node scripts/patch-exec-dash.js
```
```bash
node scripts/patch-pd-short.js
```
```bash
node scripts/patch-usage.js
```
(เมนู Takeoff · วัดหน้างาน · QS Tracking บันทึกทีละแถว · ซ่อนแท็บ Takeoff เดิม — เปิดกลับด้วย `?legacyTakeoff=1` · ติดตั้งเป็นแอป + ไอคอน Wellcon PM · หน้าแรกของฉันตามตำแหน่ง · กันรูป/ข้อมูลหายจาก realtime · เมนู Claim · หน้า Home เลือกโครงการ · หน้าภาพรวมโครงการแบบสั้น · หน้าแรกตามบทบาททุกตำแหน่ง · ปุ่มหน้าแรก + ออกจากระบบทุกหน้า · รายงานประจำวัน คนเข้างานแยกตาม trade · คะแนน Level Gate เห็นเฉพาะ Admin / Director / HR · Site Issues ติดตามงาน · จัดเรียงการ์ดหน้าทำงาน · Super Admin เห็นทุกเมนู · เมนู Layboard · ล็อกอินกันรหัสถูกแต่ขึ้นผิด · เลือกภาษาก่อนพิมพ์ · เมนู As-Built & Survey · หน้าแรกแบบใหม่ (ตัวเลขหลัก · ต้องดูแล · รายการโครงการแถวเดียว) · หน้าภาพรวมโครงการแบบสั้น v2 (พับส่วนรอง) · นับการเปิดแอป + ปุ่มการใช้งานระบบ)

## Layboard · Presentation (ตั้งแต่ 09/11/2026)
- หน้าแยก `/layboard/index.html?pid=<project id>` — สำเนาแอป Layboard (repo Wellcon2026/layboard) สำหรับทำงานนำเสนอในโครงการ
- ข้อมูลอยู่ในฐานข้อมูล Wellcon PM ตาราง `layboard_kv` (รัน `supabase-layboard.sql` ครั้งเดียว) — แยกจากฐานข้อมูลแอป Layboard เดิม · แยกพื้นที่ตามโครงการ (key `p:<pid>:…`) · รูปอยู่ที่ `general-photo/layboard/<pid>/`
- เข้าได้เฉพาะผู้ที่ล็อกอิน PM · ได้รับมอบหมายในโครงการนั้น · และเปิดสิทธิ์ "Layboard · Presentation" (สวิตช์ในหน้าจัดการผู้ใช้ · ค่าเริ่มต้นเปิด: ผู้บริหาร · PM · Site · Designer) (`layboard/pm-gate.js`)
- อัปเดตจาก Layboard ต้นฉบับ: `node scripts/sync-layboard.js /path/to/layboard` (pm-gate.js ไม่ถูกเขียนทับ)

## Claim · เคลมความเสียหาย (ตั้งแต่ 08/11/2026)
หน้าแยก ไม่อยู่ใน `index.html`: `claim.html` + `claim.js` (ใช้ `vendor/supabase.js` ร่วม)
- เปิดจากเมนู **Claim · เคลมความเสียหาย** ในหน้าโครงการ / ปุ่มบนหน้างานของฉัน → `/claim.html?pid=<id>` (`&env=staging` = ข้อมูลทดสอบ)
- ข้อมูล: `app_state.damageClaims` = `{ <pid>: [claim] }` · `app_state.claimRates` = อัตราค่าแรงเรียกเก็บลูกค้า · PM หลักไม่อ่าน/เขียน 2 คีย์นี้ · ไม่ต้องรัน SQL
- รูป: Storage `general-photo/claims/<pid>/<claimId>/` (เก็บแค่ลิงก์ในข้อมูล)
- ปุ่ม 🏠 หน้าแรก + ออกจากระบบ ในหน้าแยก (claim / quick-measure): `pm-nav.js`
- ราคาในหน้านี้ = ราคาเรียกเก็บลูกค้าเท่านั้น ห้ามใส่ต้นทุน/กำไรจริง · หนังสือเคลมเป็น DRAFT ต้องให้ผู้บริหารตรวจก่อนส่ง

## แบบคมชัด + DXF (`wdraw.js` · ตั้งแต่ 10/11/2026)
- `wdraw.js` = Wellcon Drawing Engine — ต้นฉบับอยู่ใน repo `wellcon-defect-check` แก้ที่นั่นแล้ว copy มาที่นี่ (และ `layboard`)
- Claim: `c.plan.pdf = { pdf: url, page }` (PDF ต้นฉบับ) · `c.plan.kind = 'dxf'` + `c.plan.mm` (SVG เวกเตอร์ หน่วย มม.)
- Claim อนุมัติขั้นเดียว: `c.appr = { h, ok:{ by, role, at, amt }, back }` — QS (`qs`, `qs_mgr`) หรือ PM (`pm`, `pm_mgr`) · superadmin ได้ทุกกรณี
- Quick Measure: DXF → PNG (ด้านยาว 4096 px) + `mm_per_px` จากไฟล์ (สเกลอัตโนมัติ)
- DWG ยังไม่รองรับโดยตรง — ให้ AutoCAD "Save As → DXF" (แปลงผ่านบริการภายนอกต้องได้รับอนุมัติผู้บริหารก่อน)

## การใช้งานระบบ · Usage Dashboard (ตั้งแต่ 11/11/2026)
- หน้าแยก `/usage.html` (`&env=staging` = ข้อมูลทดสอบ) — ปุ่ม "📊 การใช้งานระบบ" บนหน้าแรก PM · เปิดได้: superadmin · director · admin · pm_mgr · qs_mgr · design_mgr · fin_mgr · hr · hr_mgr
- ข้อมูล: ฟังก์ชัน `usage_report(p_days)` (ตัวเลขสรุปเท่านั้น ไม่มีราคา) · การเปิดแอป: `usage_touch(email, app)` → ตาราง `usage_seen` (1 แถวต่อคน ต่อแอป ต่อวัน) — SQL: `supabase-usage.sql`
- แอปที่นับ: PM (`pm` · ทุก 30 นาทีที่เปิดอยู่) · Claim (`claim`) · Quick Measure (`qm`) · Defect Check / Site Issues / Survey (`dc` / `si` / `sv` จาก repo wellcon-defect-check)
- "ใช้งาน" = เปิดแอป หรือบันทึก / แก้ไขข้อมูล (updated_by ของแต่ละตาราง + engagement) · Daily Report นับวันทำงาน จ.–ส. ของโครงการที่กำลังทำงาน
