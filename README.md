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
- v1.7.0 เลเยอร์ (= งาน · ซ่อน/แสดง · วาดในเลเยอร์ · จำใน localStorage `qm_lhide_*` / `qm_layer_*` / `qm_wallh_*`) · ความยาวหลายช่วง: คอลัมน์ `runs` jsonb (SQL: `supabase-takeoff-runs.sql`) · pts ยังเรียงต่อกันเหมือนเดิม · qty = ผลรวม `E.measure` ของแต่ละช่วง (`runsOf()` · `lenMeasure()`)

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
node scripts/patch-card-drag.js
node scripts/patch-card-reset.js
node scripts/patch-card-color.js
node scripts/patch-nav-pagebar.js
node scripts/patch-page-access.js
node scripts/patch-feat-proj.js     # เปิด-ปิดหน้าแยกรายโครงการ (app_state 'featProj')
node scripts/patch-daily-ot.js      # แจ้ง OT ในรายงานประจำวัน (อัตราจาก app_state 'claimRates')
node scripts/patch-rate-card.js     # อัตรากลาง: การ์ดในตั้งค่าระบบ + ตัวคำนวณ VO / EOT (app_state 'claimRates')
node scripts/patch-top-home.js      # มือถือ: ปุ่มหน้าแรกซ้ายสุดในแถบบนของแอปหลัก
node scripts/patch-rate-mat.js      # อัตรากลาง: หมวดวัสดุมาตรฐาน + เมนูดรอปดาวน์เลือกหมวด
node scripts/patch-rfi-issue.js     # RFI / RFA: ออกเอกสารถึง Owner / Designer / Consult (ผู้รับจากคู่สัญญา · ตรวจก่อนออก · พิมพ์ / PDF · ติดตาม)
node scripts/patch-top-fit.js       # จอคอม: แถบปุ่มด้านบนย่อป้ายปุ่มทีละขั้นให้พอดีจอ — หน้าไม่เลื่อนแนวนอน (มือถือ / แท็บเล็ตไม่เปลี่ยน)
node scripts/patch-quotation-menu.js   # การ์ด / เมนู "Quotation Maker" → เปิดหน้าแยก quotation.html (QS · QS Manager · Director)
node scripts/patch-access-page.js      # ตั้งค่าระบบ: ปุ่ม "ตารางสิทธิ์ตามตำแหน่ง" → access.html · สิทธิ์พิเศษรายคน (app_state workUserAdd)
node scripts/patch-pdf-menu.js         # การ์ด / เมนู "PDF Maker" → เปิดหน้าแยก pdf.html (ทุกตำแหน่ง · ไม่ต้องเลือกโครงการ)
node scripts/patch-photo-menu.js       # การ์ด / เมนู "Photo Editor" → เปิดหน้าแยก photo.html (ทุกตำแหน่ง · ไม่ต้องเลือกโครงการ)
node scripts/patch-price-hub.js        # การ์ด / เมนู "ทำราคา · เลือกเครื่องมือ" → หน้าต่างเลือก วัด → ทำราคา → เคลม → ติดตาม VO (v1.429.0)
node scripts/patch-pricing-principles.js   # ตั้งค่าระบบ → อัตรากลาง: กล่องเตือน + "อ่านหลักการคิดราคา" (app_state pricingPrinciples) (v1.431.0)
node scripts/patch-pricebook-menu.js      # ราคากลาง: การ์ด tab:pbook → /pricebook.html · อัตรากลางในตั้งค่าระบบดูได้อย่างเดียว · แถวในหน้าต่างทำราคา
node scripts/patch-card-gate.js           # หน้าแรก: รอสิทธิ์จากเซิร์ฟเวอร์ก่อนแสดงการ์ด · ตรวจสวิตช์ปิดทั้งระบบทุกการ์ด
node scripts/patch-photo-storage.js       # รูป Defect / รายงานประจำวัน / รายการทั่วไป ขึ้นคลังไฟล์ · Word ดึงรูปจากลิงก์
node scripts/patch-perm-early.js          # โหลดสิทธิ์ (app_state) เสร็จก่อน → หน้าแรกไม่ต้องรอตารางใหญ่
node scripts/patch-perm-fetch.js          # รอสิทธิ์เกิน 2 วินาที → ดึงค่าสิทธิ์จาก app_state ตรง · ปุ่มลองอีกครั้ง
node scripts/patch-img-shrink.js          # ย่อรูป > 500 KB ก่อนอัปโหลด (ไฟล์แนบทั่วไป / ทะเบียนเอกสาร / คลังความรู้)
node scripts/patch-delta-sync.js          # ซิงก์รอบต่อไปดึงเฉพาะแถวที่เปลี่ยน (id + updated_at) แล้วประกอบชุดเต็มให้ _liveMerge
node scripts/patch-note-hub.js            # การ์ด "บันทึก · งานของฉัน" ทุกตำแหน่ง (wcnote.js) · โน้ตลงปฏิทิน / เชื่อมแผนงาน · ลิงก์ ?wnote=
node scripts/patch-search-hl.js           # ไฮไลต์คำค้นทุกหน้า (wchl.js · CSS Highlight API) — หน้าแยกใส่ <script src="/wchl.js"> ในไฟล์
node scripts/patch-note-time.js           # ปฏิทินแสดงเวลาของบันทึก (HH:MM · ข้อความ) — ฟอร์มเวลาอยู่ใน wcnote.js
node scripts/patch-ux-mobile.js           # มือถือ: ออกจากระบบอยู่ในเมนู ⋮ · ชื่อหน้า 2 บรรทัด · หน้าแรกกะทัดรัด · ตัวหนังสือ ≥ 12 px · ข้อความผิดพลาดภาษาไทย
node scripts/patch-project-setup.js       # การ์ด "ตั้งค่าโครงการ" (wcsetup.js) · % ความครบ · Director แก้คู่สัญญาได้
node scripts/patch-layboard-photo.js    # Layboard: ปุ่ม "แต่งรูป (Photo Editor)" (แก้ layboard/index.html · sync-layboard.js เรียกให้อัตโนมัติ)
node scripts/patch-sess-guard.js        # หลายหน้าต่างในเครื่องเดียว = ผู้ใช้คนเดียว · กันหน้าต่างอื่นเขียนทับผู้ใช้ (แก้ออกจากระบบแล้วเข้าเป็นคนอื่น)
```
```bash
node scripts/patch-proc-sheet.js
```
```bash
node scripts/patch-sheet-zoom.js
```
```bash
node scripts/patch-sheet-shared.js
```
```bash
node scripts/patch-pd-compact.js
```
```bash
node scripts/patch-pd-cockpit.js
```
```bash
node scripts/patch-pd-cockpit2.js
```
```bash
node scripts/patch-progress-manual.js
```
```bash
node scripts/patch-auto-pr-menu.js
node scripts/patch-apr-label.js
node scripts/patch-vo-si-tag.js
node scripts/patch-sync-a.js
node scripts/patch-sync-b.js
node scripts/patch-sync-c.js
node scripts/patch-sync-d.js
node scripts/patch-whatsnew.js      # หน้าต่างแจ้งเตือนอัปเดต (wcnews.js + whatsnew.json)
node scripts/patch-layboard-th.js   # ข้อความ Layboard เป็นภาษาไทย (แก้ layboard/index.html — รันอีกครั้งเมื่ออัปโหลด Layboard ชุดใหม่)
```
(เมนู Takeoff · วัดหน้างาน · QS Tracking บันทึกทีละแถว · ซ่อนแท็บ Takeoff เดิม — เปิดกลับด้วย `?legacyTakeoff=1` · ติดตั้งเป็นแอป + ไอคอน Wellcon PM · หน้าแรกของฉันตามตำแหน่ง · กันรูป/ข้อมูลหายจาก realtime · เมนู Claim · หน้า Home เลือกโครงการ · หน้าภาพรวมโครงการแบบสั้น · หน้าแรกตามบทบาททุกตำแหน่ง · ปุ่มหน้าแรก + ออกจากระบบทุกหน้า · รายงานประจำวัน คนเข้างานแยกตาม trade · คะแนน Level Gate เห็นเฉพาะ Admin / Director / HR · Site Issues ติดตามงาน · จัดเรียงการ์ดหน้าทำงาน · Super Admin เห็นทุกเมนู · เมนู Layboard · ล็อกอินกันรหัสถูกแต่ขึ้นผิด · เลือกภาษาก่อนพิมพ์ · เมนู As-Built & Survey · หน้าแรกแบบใหม่ (ตัวเลขหลัก · ต้องดูแล · รายการโครงการแถวเดียว) · หน้าภาพรวมโครงการแบบสั้น v2 (พับส่วนรอง) · นับการเปิดแอป + ปุ่มการใช้งานระบบ · ปิด Level Gate ทั้งระบบ · กันแอปพัง removeChild · เมนูลิงก์ Mango ใบขอซื้อ / ใบสั่งจ้าง · หน้าแรกทุกคน: การ์ด PR (Mango) แทน Project Management · แผนงาน: คอลัมน์ผู้สร้างกิจกรรม · การ์ดหน้าแรกรายคน · การ์ดตัวเลขสรุปแตะได้ · Defect Check รวม Survey (ตัด Site Issues) · Drawing Log: ผู้อัปเดต + วันที่ · Revision Note หลายรายการ · ตั้งค่าระบบ: การ์ดหน้าแรก & ฟังก์ชัน ตามตำแหน่ง / รายคน / ทั้งระบบ · เลือกขอบเขต คนเดียว / ทั้งตำแหน่ง · ลิงก์ Google Sheet หน้าจัดซื้อวัสดุ · ย่อ Google Sheet เต็มกรอบ · เอาแถบ Mango ออก · ชีตหลัก / ซูม / ความสูง ใช้ร่วมทั้งโครงการ · หน้า Project Management แบบใหม่ Project Cockpit · ความคืบหน้ากรอกเองเท่านั้น · เมนู Auto PR)

## แจ้งเตือนอัปเดต · "มีอะไรใหม่" (ตั้งแต่ 14/11/2026 · PM v1.401.0)
- ไฟล์แยก `wcnews.js` + ข้อมูล `whatsnew.json` (ใหม่สุดอยู่บน: `{ v, d, t, items[] }`) — โหลดจาก `index.html` ต่อจาก `wctag.js`
- **มีอัปเดตใหม่**: เปิดแอปค้างไว้แล้ว `whatsnew.json` บนเซิร์ฟเวอร์มีเวอร์ชันสูงกว่าเลขใน `<script src="/wcnews.js?v=…">` → หน้าต่าง "อัปเดตเลย" (โหลดหน้าใหม่ข้าม cache) / "ภายหลัง" (เตือนอีกใน 30 นาที)
  · ตรวจตอนเปิดแอป · ทุก 5 นาที · เมื่อกลับมาเปิดจอ · ไม่โหลดหน้าใหม่เอง
- **มีอะไรใหม่**: หลังเข้าสู่ระบบ ถ้าเวอร์ชันบนสุดยังไม่เคยเห็นในเครื่องนั้น (localStorage `wellcon_pm_news_seen`) → แสดง 1 ครั้ง · กดป้ายเลขเวอร์ชันเพื่อดูย้อนหลัง
- **ทุกครั้งที่ขึ้นงาน**: ① เพิ่มรายการบนสุดใน `whatsnew.json` (ภาษาที่ผู้ใช้อ่านเข้าใจ · ไม่มีราคา / ต้นทุน) ② `node scripts/patch-version-label.js vX.Y.Z "D พ.ย. 2569"` — เปลี่ยนป้ายเวอร์ชัน + เลขใน `wcnews.js?v=` และเตือนถ้า `whatsnew.json` ยังไม่มีเวอร์ชันนั้น
- ไม่เกี่ยวกับ `APP_VER()` (ตัวล็อกเวอร์ชันเก่าห้ามเขียนข้อมูล — แถบสีส้ม) ซึ่งยังทำงานตามเดิม

## Photo Editor · แต่งรูปผลงาน (ตั้งแต่ 17/11/2026 · PM v1.420.0)
- หน้าแยก `photo.html` + `photoedit.js` (`?env=staging` = ข้อมูลทดสอบ) — เปิดจากการ์ด / เมนู "Photo Editor" (`scripts/patch-photo-menu.js`) · ติดตั้งเป็นไอคอนแยกได้ (`photo.webmanifest`) แต่ใช้การเข้าสู่ระบบของ Wellcon PM
- ทำงานในเบราว์เซอร์ทั้งหมด (canvas + JS ล้วน) — รูปไม่ถูกอัปโหลด · บันทึกลงเครื่องเท่านั้น (ผู้บริหารเลือก 17/11/2026)
- สิทธิ์: การ์ด `tab:photo` (ไม่ต้องเลือกโครงการ · ชุดเริ่มต้นทุกตำแหน่ง) · ปิดทั้งระบบ = `featGlobal['tab:photo']=false`
- เรขาคณิต: หน่วยสัมพัทธ์ (ศูนย์กลางภาพ = 0 · ด้านยาว = 1) · oriented (หมุน 90° / กลับด้าน) → เส้นนำ (homography) → ปรับมุมมองเอง → ปรับเอียง → ครอป · ไฟล์จริงวาดใหม่จากต้นฉบับ (ไม่ขยายจากภาพตัวอย่าง)
- โหมดฝัง `photo.html?embed=1` (จาก Layboard · `layboard/pm-gate.js` `LB_PM.photoEdit`): parent ส่ง `{t:'pe-open', blob, name}` หลังได้ `pe-ready` · ได้ `pe-done` (blob JPEG) / `pe-cancel` · ตรวจ origin เดียวกันทุกข้อความ
- แสง · สี (`s.lc`): `applyLC()` ก่อน `applyFx()` · แปลงไฟล์ / ย่อรูป: `BT` · `decodeAny()` (PSD เอง · TIFF ด้วย `vendor/utif.js` + `vendor/pako_inflate.min.js`) · ZIP `makeZip()` · ตั้งค่าจำใน `localStorage.wpe_batch_v1`
- Layboard แอปแยกใช้สำเนา: `node scripts/sync-photo-to-layboard.js <โฟลเดอร์ repo layboard>` (สร้าง photo-editor.html โหมด SOLO) — แก้ photo.html / photoedit.js แล้วต้องคัดลอกใหม่
- เปลี่ยนชื่อหลายรูป (v1.4.0): `RN` · `rnPlan()` (ชื่อ + เลขรัน) · โหมดโฟลเดอร์ `rnPickDir()` → `rnLoadDir()` → `rnApply()` / `rnMove()` (File System Access API · Chrome / Edge บนคอม · ไม่ทับไฟล์ · คืนชื่อเดิมเมื่อผิดพลาด · `rnUndo()`) · โหมดเลือกรูป `rnZip()` (ZIP ชื่อใหม่)
- ชุดทดสอบเรียกใช้ `window.__PE` (APP · geo · cropRect · buildJpeg · autoAngle · guidedG · RN · rnPlan · rnLoadDir · rnApply)

## PDF Maker · แก้ไขเอกสาร PDF (ตั้งแต่ 17/11/2026 · PM v1.419.0)
- หน้าแยก `pdf.html` + `pdfmaker.js` (`?env=staging` = ข้อมูลทดสอบ) — เปิดจากการ์ด / เมนู "PDF Maker" (`scripts/patch-pdf-menu.js`) · ติดตั้งเป็นไอคอนแยกได้ (`pdf.webmanifest` · ไอคอน `pdf-icon*.png/svg`) แต่ใช้การเข้าสู่ระบบของ Wellcon PM
- ทำงานในเบราว์เซอร์ทั้งหมด: pdf.js (แสดงหน้า) + pdf-lib (`vendor/pdf-lib.min.js` · สร้างไฟล์) — ไฟล์ไม่ถูกอัปโหลด · ไม่มีตาราง / bucket ใหม่
- สิทธิ์: การ์ด `tab:pdf` (ไม่ต้องเลือกโครงการ · อยู่ในชุดเริ่มต้นทุกตำแหน่ง) · ปิดทั้งระบบ = `featGlobal['tab:pdf']=false` · ตำแหน่งที่ตั้งชุดการ์ดไว้ต้องมี `tab:pdf` (หรือการ์ดรายคน / สิทธิ์พิเศษรายคน)
- ลายเซ็น / ตรา: `localStorage['wpdf_sigs_<email>']` ในเครื่องนั้นเท่านั้น — ห้ามย้ายไปเก็บใน bucket สาธารณะ
- ภาษาไทย: ข้อความที่พิมพ์ / ค่าในฟอร์ม วาดด้วย canvas (IBM Plex Sans Thai ×4) แล้วฝังเป็น PNG · ฟอร์มถูก flatten ตอนบันทึก
- แก้ข้อความ = ปิดทับ · ติ๊ก "ลบข้อความเดิมจริง" = หน้านั้นบันทึกเป็นภาพ JPEG 200 dpi · metadata Subject บันทึกผู้แก้ / วันที่ / จำนวนลายเซ็น / จุดปิดทับ
- ชุดทดสอบเรียกใช้ `window.__PDFM` (APP · buildPdf)

## ตารางสิทธิ์ตามตำแหน่ง · สิทธิ์พิเศษรายคน (ตั้งแต่ 17/11/2026 · PM v1.418.0)
- หน้าแยก `access.html` + `access.js` (`?env=staging` = ข้อมูลทดสอบ) — เปิดจาก ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน → ปุ่ม "ตารางสิทธิ์ตามตำแหน่ง ↗" (`scripts/patch-access-page.js`)
- เข้าได้: Super Admin · ผู้มีสิทธิ์ "จัดการผู้ใช้" ระดับแก้ไขที่ไม่ใช่ผู้ช่วยจัดทีม (กติกาเดียวกับ `_cardAdminOk`)
- **ใช้ข้อมูลชุดเดียวกับแอปหลัก** (อ่านล่าสุด → แก้เฉพาะหัวข้อ → เขียน): `workPages` { roleKey: [การ์ด] } = ช่อง ✓ · `featGlobal` = สวิตช์ "เปิดใช้" ทั้งระบบ · `featRole[rk].money` = สิทธิ์ดูตัวเลขเงิน (ต้องมีจึงเห็นการ์ดที่มี ฿) · `workUserAdd` { email: [การ์ด] } = สิทธิ์พิเศษรายคน (ใหม่ · รวมเข้า `WORK_USER_ADD`) · `workUser` = การ์ดรายคนแบบเดิม (หน้านี้ทำได้แค่ "กลับไปใช้ชุดตามตำแหน่ง")
- ตาราง: กลุ่มเหมือนไฟล์ Excel (PM = pm + pm_mgr · Designer = designer + design_mgr · QS = qs + qs_mgr · Finance = fin + fin_mgr · HR = hr + hr_mgr · Admin = office) — กดครั้งเดียวมีผลทั้งกลุ่ม · ◐ = บางตำแหน่งในกลุ่ม · ติ๊ก "แยกทุกตำแหน่ง" = 19 ตำแหน่งแยกกัน (รวมจัดซื้อ · สโตร์ · โรงงาน · หัวหน้าช่าง · จป. · คนขับรถ) · Material Log = คู่ `tab:mat` / `tab:procm`
- Excel: ดาวน์โหลด (ชีต "ตำแหน่ง × ฟีเจอร์" · ✓ / ○ / – / ◐) · นำเข้า: อ่านชีตที่มี "ตำแหน่ง × ฟีเจอร์" จับคู่ตามชื่อฟีเจอร์ + หัวคอลัมน์ตำแหน่ง → แสดงรายการที่จะเปลี่ยน → ยืนยันจึงบันทึก (◐ และเมนูหลักที่เว้นว่าง = ไม่แตะ · รับไฟล์ `Wellcon_PM_Feature_by_Position_DRAFT.xlsx` ที่ผู้บริหารอนุมัติได้ตรง ๆ)
- แอปหลัก: Layboard ไม่เติมการ์ดให้เองแล้ว ถ้าตำแหน่งนั้นตั้งชุดการ์ดไว้ (ตารางเป็นตัวกำหนด) · Quotation Maker (v1.5.0) นับสิทธิ์พิเศษรายคนตอนตรวจสิทธิ์เข้าหน้า

## ราคากลาง · Price Book (ตั้งแต่ 19/11/2026 · PM v1.432.0)
- หน้าแยก `pricebook.html` + `pricebook.js` (`?env=staging` = ข้อมูลทดสอบ) · ExcelJS 4.4.0 ที่ `vendor/exceljs.min.js` (MIT · `vendor/LICENSES-EXCEL.txt`) โหลดเมื่อกด Excel
- ข้อมูลชุดเดียวของบริษัท (รวมอัตรากลางเดิม): app_state `priceBook` = `{ v:{ ver, eff, pubAt, pubBy, cfg:{ ohp, ot }, items:[{ id, code, kind, g, n, spec, u, mat, lab, rate, t, eff, rev, src, srcNote, st }] } }` · `priceBookReq` (คำขอแก้ / นำเข้า) · `priceBookHist` (ฉบับเก่า 20 ฉบับ)
- ครั้งแรกที่เปิด: ย้ายจาก `claimRates` (ค่าแรงช่าง + รายการ) เป็นฉบับ 1 อัตโนมัติ
- เปลี่ยนราคา: แก้ในหน้า / นำเข้า Excel → คำขอ → QS → Director → Admin (Super Admin) → เผยแพร่ฉบับใหม่ + วันที่มีผล · แจ้งเตือนผ่านระบบแท็ก (`ref_type` `pbreq`)
- เผยแพร่แล้วเขียน `claimRates` รูปแบบเดิม (เฉพาะรายการที่ใช้อยู่ + `code` / `spec`) → แอปหลัก / Quotation Maker / Claim (Site Work) / OT อ่านได้โดยไม่ต้องแก้
- สิทธิ์: ตารางสิทธิ์ตามตำแหน่ง / รายคน แถว "ราคากลาง" (`tab:pbook`) · ปิดทั้งระบบที่สวิตช์ `tab:pbook`
- Quotation Maker v1.10.0: เลือกจากราคากลาง (รหัส · สเปก · หมวด) · ปรับราคาได้ ระบบเก็บราคาฐาน (`rkBase`) และแสดง "ราคากลาง ±x%" ให้ผู้อนุมัติเห็น
- หลักการ: `docs/pricing-principles.md` ข้อ 2.2 (ฉบับ 2) · คำตอบผู้บริหาร: `docs/pricebook-decisions.md`

## หลักการคิดราคาของระบบ (ตั้งแต่ 19/11/2026 · PM v1.431.0)
- ต้นฉบับ: `docs/pricing-principles.md` (ไม่ deploy — `.vercelignore`) · ฉบับในแอป: app_state `pricingPrinciples` = `{ v:{ ver, at, md } }` (อ่านได้เฉพาะผู้ที่เข้าสู่ระบบ)
- แสดงที่: ตั้งค่าระบบ → อัตรากลาง (กล่องเตือน + ปุ่ม "อ่านหลักการ") · หน้าต่าง "ทำราคา · เลือกเครื่องมือ" (ลิงก์สำหรับผู้มีสิทธิ์ตัวเลขเงิน) — `_pricingDoc()` (`scripts/patch-pricing-principles.js`)
- แก้เนื้อหา: แก้ไฟล์ .md (ผ่านผู้บริหาร + บันทึกในส่วนประวัติการตัดสินใจ) แล้วอัปเดตแถว: `update public.app_state set data = jsonb_build_object('v', jsonb_build_object('ver','<ฉบับ>','at','<DD/MM/YYYY>','md', <เนื้อหาไฟล์>)) where id = 'pricingPrinciples';`

## ทำราคา · เลือกเครื่องมือ (ตั้งแต่ 18/11/2026 · PM v1.429.0)
- การ์ด / เมนูในโครงการ `tab:price` → `_priceHub(pid)` (`scripts/patch-price-hub.js`) — ทางเข้าเดียวของงานทำราคา ไม่รวมแอป: ① วัดปริมาณ (Takeoff · วัดหน้างาน · QS Take-off แอปแยก) ② ทำราคาเสนอลูกค้า = **Quotation Maker ที่เดียว** (`/quotation.html?pid=&new=1&kind=`) ③ เรียกเก็บค่าเสียหายจากผู้ทำ = Claim ④ ติดตามจนเข้าสัญญา = VO Tracker
- กติกา: ลูกค้าจ้างซ่อม → Quotation Maker (งานซ่อม) · คนอื่นทำเสียหาย → Claim · งานใหญ่ / ประมูล → BOQ Excel กับฝ่ายประมาณราคา · หน้า VO / SI / EOT และฟอร์มใบเสนอราคาในหน้าออกหนังสือปิดทั้งระบบ (ไม่ใช้ทำราคาแล้ว)
- Claim → Quotation Maker (v1.430.0): ปุ่ม "🛠 ดึงจากเรื่องใน Claim" / ลิงก์ `quotation.html?pid=&claim=<id>` — คัดลอกเรื่อง · รูป · แบบที่ตีกรอบ · รายการราคาจาก app_state `damageClaims` (อ่านอย่างเดียว) · ใบเก็บ `q.clm`

## Quotation Maker · ใบเสนอราคาด่วนสำหรับ QS (ตั้งแต่ 16/11/2026 · PM v1.414.0)
- หน้าแยก `quotation.html` + `quotation.js` (`&env=staging` = ข้อมูลทดสอบ) — เปิดจากการ์ด / เมนู "Quotation Maker" (`scripts/patch-quotation-menu.js`) · `?pid=<id>` งานในโครงการ · ไม่มี `pid` = เลือกเอง / งานใหม่นอกโครงการ · `?q=<id>` เปิดใบตรง ๆ (ลิงก์แจ้งเตือน) · `?tk=<root folder id>` ผูกงานในแอป QS Take-off (โครงการ PM → แสดงใบของโครงการนั้น · งาน Tender → งานใหม่นอกโครงการ · `&new=1` เริ่มใบใหม่ทันที) · `?wsso=<ตั๋ว>` เข้าสู่ระบบครั้งเดียวจากแอป QS Take-off (v1.2.0 · `sso_redeem` ชุดเดียวกับ PM ⇄ Site Work — ตั๋วใช้ครั้งเดียว อายุ 2 นาที · เครื่องที่ยังไม่เคยเปิด Wellcon PM ต้องเปิด PM หนึ่งครั้งก่อน) · แท็บ "Quotation Maker ↗" อยู่ใน repository wellcon-qs-takeoff v1.8.0 (`openQuo()`)
- ใช้กับงานไม่ซับซ้อน: พื้นที่เดียว · เฟอร์นิเจอร์ · งานซ่อมความเสียหาย · งานเปลี่ยนแบบ (Design Change)
- สิทธิ์เข้าหน้า = การ์ด `tab:quo` (ชุดเริ่มต้น: `qs` · `qs_mgr` · `director` · Super Admin เข้าได้เสมอ) + ในแอปหลักต้องมีสิทธิ์ "ตัวเลขเงินโครงการ" · ปิดทั้งระบบ / รายโครงการด้วยสวิตช์ `tab:quo` (`featGlobal` / `featProj`)
- ข้อมูล: app_state `quotations` = `{ <pid> | '_new': [ { id, no (QT-YYMM-NNN · ฉบับแก้ไข -R1), pid, kind: area|furn|damage|dco, title, area, desc, cust, attn, site, atts[{ id, kind, name, path, url, w, h, marks[{ x, y, w, h, t }], inAi, inPrint, src }], items[{ id, sec, desc, spec, unit, qty, rate, rk, ai{ conf, basis }, chk, src }], prelimPct, ohpPct, discount, ohpShow, valid, lead, pay, assume, excl, memo, form, lang, ai{…}, status: draft|sent|returned|approved|issued|cancelled, by*, ap*, log[] } ] }` — บันทึกแบบอ่าน-รวม-เขียนรายใบ · PM หลักไม่อ่าน/เขียนคีย์นี้ · ไม่ต้องรัน SQL
- ไฟล์แบบ: bucket `general-photo` โฟลเดอร์ `quotation/<id ใบ>/` (รูป JPEG ด้านยาวไม่เกิน 2,800px · PDF แปลงเป็นรูปรายหน้า) · กรอบพื้นที่เก็บเป็นสัดส่วน 0–1 ของรูป
- เชื่อม QS Take-off (อ่านอย่างเดียว ไม่เขียนตาราง `takeoff_*`): เลือกแบบจาก `takeoff_folders` / `takeoff_files` (bucket `takeoff-drawings` · ทั้งโครงการ PM และงาน Tender) → คัดลอกมาแนบ · ดึงปริมาณที่ QS ส่งต่อผ่าน `takeoff_pm_feed`
- AI: Supabase function `ai-assistant` ตัวเดียวกับแอปหลัก (โควตาเดียวกัน) — ส่งรูปแบบทั้งแผ่น (ย่อด้านยาว 1,568px) + ภาพขยายเฉพาะกรอบ สูงสุด 8 ภาพ · ชื่อรายการอัตรากลาง (ไม่มีราคา) · ตอบเป็น JSON `{ summary, items[{ sec, desc, spec, unit, qty, basis, conf, rk }], assume, excl, questions }` · **AI ไม่ใส่ราคา** · รายการจาก AI ต้องติ๊ก "ตรวจแล้ว" ก่อนส่งอนุมัติ
- ราคา: จากอัตรากลาง (app_state `claimRates`) หรือ QS กรอกเอง (ผู้อนุมัติเห็นว่ารายการไหนกรอกเอง) · ยอด = ค่างาน + Preliminary % + OH&P % − ส่วนลด → ไม่รวม VAT → VAT 7% · เตือนเมื่อ Preliminary นอก 8–20% / OH&P นอก 10–15%
- เอกสารลูกค้า (`docHtml`): แบบฟอร์ม Wellcon · OH&P รวมอยู่ในราคา / หน่วย (ไม่แสดงกำไร — เลือกแสดงเป็นบรรทัดแยกได้) · ลายน้ำ DRAFT จนกว่าจะอนุมัติ · แนบแบบพร้อมกรอบพื้นที่ท้ายเอกสาร · ไทย หรือ อังกฤษ / ไทย · ฟอร์มของ Owner = คัดลอกตาราง (คั่นแท็บ) ไปวางใน Excel
- สร้าง / แก้ไข / ลบ (v1.3.0): ปุ่ม ⋯ ในรายการ = `rowMenu()` (เปิดดู · แก้ไข · ทำสำเนา `duplicate()` · ลบ `removeQ()`) · แก้ไข = `editMode()`: ร่าง / ส่งกลับ แก้ตรง · รออนุมัติ ดึงกลับ · อนุมัติแล้ว สร้างฉบับ Rev. · ลบ = `canDelete()`: ร่าง / ส่งกลับ / ยกเลิกแล้ว (ผู้จัดทำ · QS Manager · ผู้บริหาร) · รออนุมัติ (ผู้จัดทำ · ผู้บริหาร — ปิดคำขออนุมัติ) · อนุมัติแล้ว / ส่งลูกค้าแล้ว ต้องยกเลิกก่อน · ลบ = `deleted:true` + `delAt` / `delBy` (ซ่อนจากรายการ ข้อมูลและประวัติยังอยู่ใน app_state)
- ขั้นตอน: `draft` → `sent` (แจ้ง QS Manager · ไม่มีก็ Director ผ่าน `WCTag.send` app `Quotation Maker` ref_type `quo`) → `approved` / `returned` → `issued` · `cancelled` — `transition()` อ่านล่าสุดแล้วตรวจสถานะก่อนเขียน · ห้ามอนุมัติใบของตัวเอง
- งานเปลี่ยนแบบ (v1.7.0 · kind `dco`): แบบแนบ `side` old / new / cmp · ⇆ เทียบแบบ (คู่กัน · เลื่อนเทียบ · ซ้อนสี · จัดตำแหน่งอัตโนมัติ · AI สรุปความต่าง) · `q.dco` ข้อมูลคำสั่ง (ผู้สั่ง · เอกสารอ้างอิง · วันที่ได้รับ → นับ 48 ชม. · เหตุผล · สถานะงานเดิม · EOT · lead time · วันที่ต้องได้คำตอบ) · รายการ `grp` add / omit / abort — งานลดใช้ราคาตามสัญญา (ไม่บวก OH&P / Preliminary) หักจากยอด · ดึงงานลดจาก app_state `projRefBoq` (ห้ามใช้ตาราง `boq` ราคาซื้อ) · อนุมัติแล้ว "ส่งเข้า VO Tracker" → upsert ตาราง `additional_work` id `quo_<id ใบ>` (AW-NNN · draft / quoted · ไม่มีต้นทุน) — v1.7.1 ไม่เขียน `changes` (หน้า VO / SI / EOT ปิดทั้งระบบ)

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
- สคริปต์: `scripts/patch-card-admin.js` (รันหลัง `patch-work-user.js`) → `scripts/patch-card-scope.js` → `scripts/patch-card-drag.js` (v1.402.0 ลากการ์ดไปวางตำแหน่งที่ต้องการ · คอมลากทั้งแถว · มือถือลากที่ ⋮⋮) → `scripts/patch-card-reset.js` (v1.403.0 ปุ่มคืนค่าเริ่มต้นของตำแหน่ง · การ์ด + ลำดับ + ฟังก์ชัน) → `scripts/patch-card-color.js` (v1.404.0 สีประจำการ์ด + การเคลื่อนไหวของปุ่ม) → `scripts/patch-nav-pagebar.js` (v1.405.0 เอารายการหน้าในโครงการออกจากแถบซ้าย · แถบ "หน้าในโครงการ" แสดงทุกขนาดจอ) → `scripts/patch-page-access.js` (v1.406.0 ยกเลิกแถบดรอปดาวน์ · สิทธิ์เข้าหน้าในโครงการตามการ์ดที่เปิดให้)

## ความคืบหน้าโครงการ = กรอกเองเท่านั้น (ตั้งแต่ 14/11/2026 · v1.393.0)
- ทีมติดตามงานใน Google Sheet (แถบ "ลิงก์ Google Sheet" ในหน้าโครงการ) — ตารางในแอปยังใช้ได้ แต่ **ไม่นับเป็นความคืบหน้า**
- `projPct(p)` = `p.progress` (ช่อง "ความคืบหน้า %" ในตารางโครงการ) · `projPctKnown` / `projPctLabel` ("—" เมื่อยังไม่กรอก) · `planPct` = ค่าเดียวกัน
- `physPct` / `_projAutoPct` ยังอยู่ในโค้ดแต่ไม่ถูกใช้คำนวณ % โครงการแล้ว

## Auto PR · ใบขอซื้อ (ตั้งแต่ 14/11/2026 · v1.394.0)
- หน้าแยก `auto-pr.html` + `auto-pr.js` (`&env=staging` = ข้อมูลทดสอบ) — เปิดจากเมนู "ใบขอซื้อ · ใบขอจ้าง" ในหน้าโครงการ (`scripts/patch-auto-pr-menu.js` · ชื่อเมนู `scripts/patch-apr-label.js`)
- เข้าสู่ระบบด้วย session ของ Wellcon PM ในเครื่อง (แบบ Quick Measure) · เห็นเฉพาะโครงการที่ได้รับมอบหมาย
- ข้อมูล: app_state `autoPR` = `{ <pid>: [ { id, no, date, proj, types[], area, items[{ name, qty, unit, code, need, remark }], by, byTitle, pm, status: draft|sent } ] }` — บันทึกแบบอ่าน-รวม-เขียนรายใบ · PM หลักไม่อ่าน/เขียนคีย์นี้
- ใบ PR พิมพ์ / PDF ตามฟอร์มกระดาษ "Purchase Requisition (PR) ใบขอซื้อ" · ไม่มีราคา · ใบจริงยังต้องลงนาม ผู้ขอซื้อ → QS → PM
- v1.1.0 ขั้นตอน: `draft` → `sent` (รอ QS) → `approved` (รอจัดซื้อ) / `returned` → `ordered` (เลข Mango · `eta`) → `received` · `cancelled` — `transition()` อ่านล่าสุดแล้วตรวจสถานะก่อนเขียน
- ผู้รับผิดชอบ: QS = `qs`/`qs_mgr` ในทีมโครงการ (ไม่มี → QS Manager) · จัดซื้อ = `proc` ในทีมโครงการ (ไม่มี → ทุกคนฝ่ายจัดซื้อ) · แจ้งเตือนผ่าน `WCTag.send` (ref_type `apr`) + `/api/line` ไปกลุ่มใน app_state `autoPRCfg` { pid | `_all`: { line } }
- SLA 24 ชม. (`escQs` / `escProc`) ตรวจฝั่งเครื่องผู้ใช้ตอนเปิดแอป (ยังไม่มีตัวตั้งเวลาฝั่งเซิร์ฟเวอร์)
- v1.2.0 ใบ PR = รูปแบบ "ใบขอซื้อ/ขอจ้าง" ของ Mango (`formHtml`) · ช่องเพิ่ม: pr `vendor` · `subName` · `note` · `deliverTo` · `buyType` · `system` · item `code` (รหัสต้นทุน) · `mat` (รหัสวัสดุ) · ส่งออก `mgCsv()` (UTF-8 BOM) / `mgRows()` (TSV)
- v1.3.0 รายการวัสดุโครงการ: app_state `autoPRCat_<pid>` = `{ sources:[{ id, name, kind: file|gsheet, url, count, tabs, at, by }], items:[{ id, src, cat, name, spec, unit, qty, code, area }] }` · item ใน PR มี `catId` (นับ "ขอไปแล้ว" จากใบสถานะ sent / approved / ordered / received)
- นำเข้า: `vendor/xlsx.full.min.js` (SheetJS 0.18.5 · Apache-2.0) โหลดตอนใช้ · Google Sheet ผ่าน `/api/sheet?url=` (Vercel function · ดึง export xlsx จาก docs.google.com เท่านั้น) · คอลัมน์ราคาไม่ถูกอ่าน (`RX_PRICE`)
