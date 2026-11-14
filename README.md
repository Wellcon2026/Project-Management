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
- v1.5.0 แบ่งขอบเขตงานตามทีม: ตาราง `takeoff_scope_teams` (ชื่อ · หมวดงาน · สี) + คอลัมน์ `takeoff_field_measures.team_id` (SQL: `supabase-scope-teams.sql`) · หน้า "แบ่งงานตามทีม" + ใบขอบเขตงาน (พิมพ์ / PDF / ส่งรูป) · ไม่มีราคา
- v1.6.0 จอคอม (กว้าง ≥ 1000px): รายการที่วัดเป็นตาราง + แผงสรุป · เลือกแบบ / ทีม เป็น grid · ปุ่มหลักอยู่แถบบน · มือถือแสดงแบบเดิม (`DK()` ใน quick-measure.js + `@media (min-width:1000px)` ใน quick-measure.html)

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
```bash
node scripts/patch-level-off.js
```
```bash
node scripts/patch-dom-guard.js
```
```bash
node scripts/patch-mango-link.js
```
```bash
node scripts/patch-work-pr.js
```
```bash
node scripts/patch-plan-by.js
```
```bash
node scripts/patch-work-user.js
node scripts/patch-kpi-go.js
node scripts/patch-defect-survey.js
node scripts/patch-site-work-menu.js
```
```bash
node scripts/patch-tags.js
```
```bash
node scripts/patch-claim-sitework.js
```
```bash
node scripts/patch-sso.js
```
```bash
node scripts/patch-dwg-upd.js
```
```bash
node scripts/patch-card-admin.js
```
```bash
node scripts/patch-card-scope.js
```
```bash
node scripts/patch-proc-sheet.js
```
(เมนู Takeoff · วัดหน้างาน · QS Tracking บันทึกทีละแถว · ซ่อนแท็บ Takeoff เดิม — เปิดกลับด้วย `?legacyTakeoff=1` · ติดตั้งเป็นแอป + ไอคอน Wellcon PM · หน้าแรกของฉันตามตำแหน่ง · กันรูป/ข้อมูลหายจาก realtime · เมนู Claim · หน้า Home เลือกโครงการ · หน้าภาพรวมโครงการแบบสั้น · หน้าแรกตามบทบาททุกตำแหน่ง · ปุ่มหน้าแรก + ออกจากระบบทุกหน้า · รายงานประจำวัน คนเข้างานแยกตาม trade · คะแนน Level Gate เห็นเฉพาะ Admin / Director / HR · Site Issues ติดตามงาน · จัดเรียงการ์ดหน้าทำงาน · Super Admin เห็นทุกเมนู · เมนู Layboard · ล็อกอินกันรหัสถูกแต่ขึ้นผิด · เลือกภาษาก่อนพิมพ์ · เมนู As-Built & Survey · หน้าแรกแบบใหม่ (ตัวเลขหลัก · ต้องดูแล · รายการโครงการแถวเดียว) · หน้าภาพรวมโครงการแบบสั้น v2 (พับส่วนรอง) · นับการเปิดแอป + ปุ่มการใช้งานระบบ · ปิด Level Gate ทั้งระบบ · กันแอปพัง removeChild · เมนูลิงก์ Mango ใบขอซื้อ / ใบสั่งจ้าง · หน้าแรกทุกคน: การ์ด PR (Mango) แทน Project Management · แผนงาน: คอลัมน์ผู้สร้างกิจกรรม · การ์ดหน้าแรกรายคน · การ์ดตัวเลขสรุปแตะได้ · Defect Check รวม Survey (ตัด Site Issues) · Drawing Log: ผู้อัปเดต + วันที่ · Revision Note หลายรายการ · ตั้งค่าระบบ: การ์ดหน้าแรก & ฟังก์ชัน ตามตำแหน่ง / รายคน / ทั้งระบบ · เลือกขอบเขต คนเดียว / ทั้งตำแหน่ง · ลิงก์ Google Sheet หน้าจัดซื้อวัสดุ)

## Layboard · Presentation (ตั้งแต่ 09/11/2026)
- หน้าแยก `/layboard/index.html?pid=<project id>` — สำเนาแอป Layboard (repo Wellcon2026/layboard) สำหรับทำงานนำเสนอในโครงการ
- ข้อมูลอยู่ในฐานข้อมูล Wellcon PM ตาราง `layboard_kv` (รัน `supabase-layboard.sql` ครั้งเดียว) — แยกจากฐานข้อมูลแอป Layboard เดิม · แยกพื้นที่ตามโครงการ (key `p:<pid>:…`) · รูปอยู่ที่ `general-photo/layboard/<pid>/`
- เข้าได้เฉพาะผู้ที่ล็อกอิน PM · ได้รับมอบหมายในโครงการนั้น · และเปิดสิทธิ์ "Layboard · Presentation" (สวิตช์ในหน้าจัดการผู้ใช้ · ค่าเริ่มต้นเปิด: ผู้บริหาร · PM · Site · Designer) (`layboard/pm-gate.js`)
- อัปเดตจาก Layboard ต้นฉบับ: `node scripts/sync-layboard.js /path/to/layboard` (pm-gate.js ไม่ถูกเขียนทับ)

## Claim · เคลมความเสียหาย (ตั้งแต่ 08/11/2026)
**ตั้งแต่ 13/11/2026 (v1.382.0) Claim มีที่เดียว = ในแอป Wellcon Site Work (`/claim` · โค้ดอยู่ repo wellcon-defect-check)** — ไม่มี Claim แยกใน PM แล้ว · ข้อมูลชุดเดียว
- เมนู **Claim · เคลมความเสียหาย** ใน PM → เปิด Site Work `/claim?pid=<id>` (แท็บใหม่ · `scripts/patch-claim-sitework.js`) · `/claim.html` ของ PM = หน้าส่งต่อ (ลิงก์ / แท็กเก่ายังใช้ได้)
- ข้อมูล: `app_state.damageClaims` = `{ <pid>: [claim] }` · `app_state.claimRates` = อัตราค่าแรงเรียกเก็บลูกค้า · PM หลักไม่อ่าน/เขียน 2 คีย์นี้ · ไม่ต้องรัน SQL
- รูป: Storage `general-photo/claims/<pid>/<claimId>/` (เก็บแค่ลิงก์ในข้อมูล)
- ปุ่ม 🏠 หน้าแรก + ออกจากระบบ ในหน้าแยก (quick-measure / usage): `pm-nav.js`
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

## ระบบแท็ก — แจ้งเตือนเหลือแบบเดียว (ตั้งแต่ 13/11/2026)
- ไฟล์กลาง `wctag.js` (ต้นฉบับอยู่ repo นี้ · คัดลอกไป repo wellcon-defect-check) · ตาราง `wc_tags` (SQL: `supabase-tags.sql` · ติดตั้งแล้ว public + staging) — 1 แถว = 1 คนที่ถูกแท็ก
- ใช้ใน: Wellcon PM (`scripts/patch-tags.js`) · Quick Measure (ผ่าน `pm-nav.js` = กระดิ่งบนหัว) · Site Work (Defect / Survey / Claim)
- คนที่ถูกแท็กเปิดแอปใดก็ได้ → popup ทันที · กระดิ่ง 🔔 = ถึงฉัน / ฉันแท็กไป · "เปิดเรื่อง" ไปหน้าเอกสารนั้นตรง ๆ
- kind `approve` = ขออนุมัติ (เช่น QS ของโครงการ) — ปิดอัตโนมัติเมื่ออนุมัติ / ส่งกลับแก้ไข

## เข้าสู่ระบบครั้งเดียว ข้ามแอป (ตั้งแต่ 13/11/2026 · v1.383.0)
- กดเมนู / ลิงก์ / ปุ่มที่ไปอีกแอป (Wellcon PM ⇄ Site Work ⇄ Claim) → `wctag.js` 1.1.0 ขอตั๋ว `sso_issue` (ใช้ครั้งเดียว · อายุ 2 นาที) แนบ `?wsso=` → แอปปลายทาง `sso_redeem` แล้วเข้าสู่ระบบคนเดิม · ตั๋วถูกลบออกจากแถบที่อยู่ทันที
- ลิงก์ที่ถูกส่งต่อ / เปิดซ้ำ ใช้ตั๋วไม่ได้ → ต้องเข้าสู่ระบบเอง · SQL: `supabase-sso.sql` (ติดตั้งแล้ว public + staging · ตาราง `sso_tickets` ไม่มีใครอ่านตรงได้)
- PM รับตั๋ว: `scripts/patch-sso.js` · Site Work / Claim รับตั๋วใน repo wellcon-defect-check

## Drawing Log: ผู้อัปเดต + Revision Note (ตั้งแต่ 13/11/2026 · v1.384.0)
- แก้ช่องใดในแถวแบบ → บันทึก `updBy` (ชื่อเล่น) · `updEmail` · `updAt` แสดง "อัปเดตล่าสุด ชื่อ · วันที่เวลา" ในคอลัมน์ Revision Note
- `revNotes` = ประวัติ `{ id, kind: note|file|rev|issue, text, rev, by, email, at, name? }` — note ที่พิมพ์เอง · อัปโหลดไฟล์แบบ · เปลี่ยน Rev · ออกเวอร์ชันใหม่ ลงอัตโนมัติ · แสดงล่าสุด 3 รายการ (กด "ดูทั้งหมด")
- กด "บันทึก note" = เพิ่มรายการใหม่ (ไม่ทับของเดิม) · ลบได้เฉพาะ note ของตัวเอง · `revNote` = ข้อความล่าสุด (แจ้งเตือน / LINE / Export ใช้ต่อ) · note เก่าก่อนอัปเดตแสดงเป็นรายการแรก
- สคริปต์: `scripts/patch-dwg-upd.js`

## การ์ดหน้าแรก & ฟังก์ชัน — Admin เปิด-ปิดให้ผู้ใช้ (ตั้งแต่ 14/11/2026 · v1.385.0)
- เมนู **ตั้งค่าระบบ** → ส่วน "การ์ดหน้าแรก & ฟังก์ชัน" · เห็นเฉพาะ Super Admin และผู้ได้สิทธิ์ admin ระดับแก้ไข (`_cardAdminOk`)
- **ตามตำแหน่ง**: การ์ด = `workPages[roleKey]` (ไม่มีค่า = ชุดเริ่มต้น `WORK_DEF`) · ฟังก์ชัน = app_state `featRole` `{ roleKey: { featKey: bool } }`
- **รายคน**: การ์ด = `workUser[email]` · ฟังก์ชัน = `featOff` / `aiOff` ในบัญชีผู้ใช้ (ชุดเดียวกับสวิตช์ในหน้าจัดการผู้ใช้)
- **ทั้งระบบ**: app_state `featGlobal` `{ featKey | 'tab:<pdTab>': false }` — ปิดกับทุกคน (ยกเว้น AI ของ Super Admin) · หน้าในโครงการที่ปิดจะหายทั้งเมนูและการ์ด (Project Management เปิดเสมอ)
- ลำดับ: ปิดทั้งระบบ → รายคน → ตามตำแหน่ง → ค่าเริ่มต้น (`featOn` / `aiAllowed` / `_featUserOn`) · `featGlobal` / `featRole` เขียนผ่าน `_stKeySet` เท่านั้น
- v1.386.0 เลือกขอบเขตทีละรายการ: แท็บรายคน กดสวิตช์ → 👤 คนเดียว / 👥 ทั้งตำแหน่ง · "ทั้งตำแหน่ง" = ตั้งค่าตำแหน่ง + ปรับค่ารายคนของรายการนั้นให้ทุกคนในตำแหน่ง (`_ccRoleCard` / `_ccRoleFeat`)
- สคริปต์: `scripts/patch-card-admin.js` (รันหลัง `patch-work-user.js`) → `scripts/patch-card-scope.js`
