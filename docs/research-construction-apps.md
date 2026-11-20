# ศึกษาซอฟต์แวร์ก่อสร้างที่จัดการข้อมูลและรูปจำนวนมาก — บทเรียนสำหรับ Wellcon PM / Site Work

จัดทำ: 20/11/2026 · เอกสารภายใน (โฟลเดอร์ `docs/` ไม่ถูก deploy)
คำถามจากผู้บริหาร: "ซอฟต์แวร์แบบเดียวกันจัดการข้อมูลและรูปจำนวนมากอย่างไร เราจะเรียนรู้อะไรได้บ้าง"

> **ข้อจำกัดของการค้นคว้า:** ระบบของ session นี้บล็อกการเปิดหน้าเว็บโดยตรง (help.autodesk.com, help.fieldwire.com, support.procore.com, helpcenter-prd.planradar.com ฯลฯ) ข้อมูลทั้งหมดในรายงานนี้จึงมาจาก**ผลค้นหาเว็บที่สรุปเนื้อหาของหน้าทางการ**เท่านั้น ยังไม่ได้อ่านหน้าเต็มเอง ข้อมูลที่ไม่พบในแหล่งข้อมูลจะเขียนว่า **"ไม่ยืนยัน"**
> **เรื่องที่ไม่มีเจ้าไหนเปิดเผย:** วิธีทำรูปย่อ (thumbnail) และ CDN ฝั่งหลังบ้าน ไม่พบ engineering blog ของ Procore / Autodesk / Fieldwire / PlanRadar ที่อธิบายเรื่องนี้

---

## 1. สรุปสำหรับผู้บริหาร

- **ไม่มีเจ้าไหนโหลดทุกอย่างลงเครื่องตลอดเวลา** ทุกเจ้าใช้หลัก "โหลดเฉพาะที่ต้องใช้": Procore ดูออฟไลน์ได้เฉพาะรายการที่เคยเปิดดูขณะออนไลน์ (cache) · Autodesk Build ให้ผู้ใช้เลือกโหลดรูปเฉพาะ 7/14/30/60 วันล่าสุด หรือไม่โหลดรูปเลย · Dalux ต้องกดเตรียมโปรเจกต์ไว้ใช้ออฟไลน์ก่อน
- **ใช้ความละเอียดต่างกันตามสัญญาณเน็ต** Fieldwire (Smart Sync) ถ้าใช้เน็ตมือถือจะโหลดแบบแปลนความละเอียดต่ำเท่านั้น และไม่ดึงไฟล์ล่วงหน้า พอเจอ Wi-Fi จึงโหลดครบ ทั้งแบบแปลนความละเอียดสูงแบบแบ่งเป็นชิ้น (tiles) รูป วิดีโอ และไฟล์
- **บันทึกในเครื่องก่อน แล้วค่อยส่งขึ้นระบบ (offline-first)** Procore, PlanRadar, Fieldwire, Buildertrend และ Dalux ให้สร้างหรือแก้งานแบบออฟไลน์ได้ แล้วซิงก์อัตโนมัติเมื่อกลับมาออนไลน์ PlanRadar แสดงงานที่ยังไม่ซิงก์ให้เห็นชัด (หมุดสีแดง หรือไอคอนก้อนเมฆ)
- **รูปต้องผูกกับตำแหน่งและงานเสมอ** ไม่ปล่อยไว้ในโฟลเดอร์ลอย ๆ ทุกเจ้ามีหมุดบนแบบ มีการเขียนทับบนรูป (markup) และออกรายงานรูปเป็น PDF ได้ Procore เลือกจัดหน้าได้ 1, 2 หรือ 4 รูปต่อหน้า และกรองตามตำแหน่ง/วันที่ถ่ายก่อน export ได้
- **รูปต้นฉบับห้ามแก้** PlanRadar ไม่ให้แก้รูปหลังอัปโหลด เพื่อให้ใช้เป็นหลักฐานได้ ส่วน Autodesk เวลาเขียนทับบนรูปจะทำสำเนาใหม่และเก็บต้นฉบับไว้ Raken ประทับลายน้ำ (โลโก้ / เวลา / GPS) ตั้งแต่ตอนถ่ายในแอป
- **สิ่งที่ Wellcon ควรทำก่อน (คุ้มที่สุด):** (1) ทำรูปย่อ (thumbnail) (2) ซิงก์เฉพาะส่วนที่เปลี่ยน (delta sync) แทนการดึงทุกตารางทุกครั้ง (3) คิวอัปโหลดรูปขณะออฟไลน์ พร้อมแสดงสถานะ "ยังไม่ซิงก์" (4) โหลดข้อมูลทีละโปรเจกต์
- **ความเสี่ยงที่ต้องแก้ด่วน:** ตอนนี้รูปอยู่ใน public bucket ใครได้ลิงก์ไปก็เปิดดูได้ แต่รูปงานลูกค้า luxury ควรใช้ลิงก์ชั่วคราว (signed URL) และต้องดูเรื่อง PDPA ด้วย

---

## 2. ตารางเปรียบเทียบ

| ผลิตภัณฑ์ | 1. การเก็บ/ส่งรูป | 2. ออฟไลน์และการซิงก์ | 3. การผูกรูปกับงาน | 4. ฟีเจอร์ที่น่าเอามาใช้ |
|---|---|---|---|---|
| **Procore** | อัปโหลดทางเว็บ: ไฟล์เกิน 5 MB อาจหมดเวลา และแนะนำให้ย่อไฟล์ · ส่งรูปทางอีเมล: ไม่เกิน 2 MB/รูป · thumbnail/CDN: ไม่ยืนยัน | ดูออฟไลน์ได้เฉพาะรายการที่เคยเปิดไว้ (cache) · งานที่ทำออฟไลน์ส่งขึ้นระบบเมื่อต่อเน็ตได้ · การจัดการ conflict: ไม่ยืนยัน | ปักรูปบนหมุดในแบบได้ (ต้องเผยแพร่ markup ก่อน รูปจึงเข้าอัลบั้ม "Photos from Drawings") · มีอัลบั้มและมุมมองไทม์ไลน์ · กรองตามตำแหน่งได้ · ดูบนแผนที่ (Maps, เปิดใช้ทั่วไป 08/01/2025) | ส่งออก PDF 1/2/4 รูปต่อหน้า · เทียบแบบ 2 revision ซ้อนกัน (Overlay) · Punch list |
| **Autodesk Build** | thumbnail/CDN: ไม่ยืนยัน · Autodesk เคยประกาศเหตุขัดข้องเรื่องรูปโหลดช้าและดูรูปไม่ได้ | เลือกได้ตั้งแต่โหลดโปรเจกต์ครั้งแรก: รูปทั้งหมด / 7, 14, 30, 60 วันล่าสุด / ไม่โหลดรูป · รูปที่อยู่นอกช่วงกดโหลดเองได้ · ถ้ามีคนลบงานบนเว็บก่อนที่เครื่องจะซิงก์ การแก้ไขในเครื่องจะถูกทิ้ง | ปักหมุด issue และแนบรูปบน sheet ได้ · เขียนทับรูปบนมือถือ = สร้างสำเนา ต้นฉบับยังอยู่ · ใช้ GPS และแผนที่ได้ | เทียบ sheet 2 version (สีซ้อนทับ หรือวางคู่กัน) · ส่งออกรายงานรูปเป็น PDF |
| **Fieldwire** | แบบแปลนมีทั้งความละเอียดต่ำ และความละเอียดสูงแบบ tiles · การบีบอัดรูป: ไม่ยืนยัน | Smart Sync: ใช้เน็ตมือถือโหลดแบบความละเอียดต่ำเท่านั้น และไม่ดึงไฟล์ล่วงหน้า · ใช้ Wi-Fi โหลดทั้งหมด · ปิดแอปแล้วการซิงก์จะหยุด เปิดใหม่จึงทำต่อ (แนะนำให้เปิด background refresh) · รูปที่ถ่ายออฟไลน์ยังมีพิกัด GPS | หมุดงาน/Punch บนแบบ · เขียนทับบนรูปได้ (มีเครื่องมือเส้นตรง) · ตัดส่วนของแบบแนบไปกับงานได้ | รายงาน PDF รวม checklist ข้อความ และรูป · ตั้งเวลาส่งรายงานอัตโนมัติให้ผู้รับเหมาแต่ละรายได้ · ผู้รับไม่ต้องมีบัญชีก็รับรายงานได้ |
| **PlanRadar** | แก้รูปหลังอัปโหลดไม่ได้ (เพื่อให้ใช้เป็นหลักฐาน) · ขนาดรูปและการบีบอัด: ไม่ยืนยัน | ดู สร้าง และแก้ ticket ได้ขณะออฟไลน์ · ticket ที่ยังไม่ซิงก์แสดงเป็นหมุดสีแดง และไอคอนก้อนเมฆ · คนอื่นจะเห็นงานนั้นหลังซิงก์แล้ว · ถ้ามี workflow อนุมัติแทรกเข้ามา งานจะไปอยู่ใน "Failed Ticket Updates" | หมุด ticket บนแบบ มีสีตามสถานะ · พอถ่ายรูปเสร็จจะเปิดหน้าแก้รูปทันที (ข้อความ สติกเกอร์ พู่กัน) · มีช่อง "Photos (before)" · มีหัวข้อ "Allow GPS Position for Photos" (รายละเอียดไม่ยืนยัน) | ส่งออกรายงานเป็น PDF/Excel · แนบรูปในรายงานได้สูงสุด 50 รูป · ดูรูป 360° ได้ |
| **Raken** | ไม่ยืนยัน | ประทับลายน้ำได้ตอนถ่ายโดยไม่ต้องต่อเน็ต | ลายน้ำ: โลโก้ ชื่อบริษัท ชื่อโปรเจกต์ เวลา พิกัด GPS และตำแหน่ง (ใช้ได้เฉพาะรูปที่ถ่ายในแอป ไม่ใช่รูปจากคลังภาพ) | Daily report |
| **Buildertrend** | ไม่ยืนยัน | บันทึก Daily Log ออฟไลน์ได้ (แอปเวอร์ชัน 9.15 ขึ้นไป) และซิงก์อัตโนมัติ · รูปแนบออฟไลน์: ไม่ยืนยัน | แนบรูปหรือวิดีโอหลายไฟล์ใน log ได้ | Daily Log สำหรับผู้รับเหมาช่วง |
| **Dalux** | ไม่ยืนยัน | ต้องเตรียมโปรเจกต์ไว้ใช้ออฟไลน์ก่อน และต้องโหลดโฟลเดอร์ "Inbox" ไว้ด้วยจึงจะสร้างงานใหม่ได้ | รูปมี geotag · ดูรูปที่ถ่ายต่อเนื่องเป็นชุด แล้วเขียนทับได้เร็ว (release 2026.4) | — |
| **SnagR** | ไม่ยืนยัน | ฟอร์มใช้ออฟไลน์ได้ (จากเว็บรีวิวบุคคลที่สาม) | บันทึก defect บนแบบ | รายงาน PDF อัตโนมัติ |

---

## 3. วิธีจัดการรูปของแต่ละเจ้า

**Procore**
- อัปโหลดรูปทางเว็บ ไฟล์ที่ใหญ่เกิน 5 MB อาจหมดเวลา Procore แนะนำให้ย่อไฟล์ก่อน · ส่งรูปทางอีเมลได้ไม่เกิน 2 MB/รูป · รองรับ jpg, png, gif, bmp และ tif (แต่ tif ดูในระบบไม่ได้) — https://support.procore.com/products/online/user-guide/project-level/photos/tutorials/upload-photos · https://support.procore.com/products/online/user-guide/project-level/photos/tutorials/email-photos-inbound
- ใช้ออฟไลน์ได้เฉพาะรายการที่เคยเปิดดูขณะออนไลน์ — https://support.procore.com/faq/can-i-use-procores-mobile-application-offline · https://support.procore.com/procore-mobile-ios/user-guide/photos-ios/permissions
- ส่งออก PDF ได้ทั้งจากอัลบั้มและไทม์ไลน์ (1/2/4 รูปต่อหน้า) และส่งออกเฉพาะรูปที่ผ่านตัวกรอง — https://support.procore.com/products/online/user-guide/project-level/photos/tutorials/export-photos-as-a-pdf · https://v2.support.procore.com/product-manuals/photos-project/tutorials/search-for-and-filter-photos
- ปักรูปบนแบบ และเทียบแบบแบบ Overlay — https://support.procore.com/products/online/user-guide/project-level/drawings/tutorials/add-photos-to-a-drawing · https://support.procore.com/products/online/user-guide/project-level/drawings/tutorials/compare-drawings-in-the-drawings-tool-open-beta

**Autodesk Build**
- ตัวเลือกโหลดรูปตามช่วงเวลา ช่วงเวลานับย้อนหลังโดยไม่รวมวันนี้ และรูปที่โหลดแล้วยังเก็บไว้ในเครื่อง — https://help.autodesk.com/cloudhelp/ENU/Build-Mobile/files/download-project/Download_Project_Initial.html · https://help.autodesk.com/cloudhelp/ENU/Build-Mobile/files/download-project/Mobile_Download_Projects_FAQs.html
- ถ้ามีคนลบงานบนเว็บก่อน การแก้ไขในเครื่องจะถูกทิ้ง — https://help.autodesk.com/cloudhelp/ENU/Build-Mobile/files/download-project/Mobile_Sync_Troubleshooting.html
- เขียนทับรูปบนมือถือ = สร้างสำเนา ต้นฉบับยังอยู่ · ส่งออกรายงานรูปได้ — https://help.autodesk.com/cloudhelp/ENU/Build-Gallery/files/Photos_iOS.html · https://help.autodesk.com/cloudhelp/ENU/Build-Gallery/files/Photos_Web.html
- ประกาศเหตุขัดข้องเรื่องรูป — https://health.autodesk.com/incidents/phtlx6t3b5bq

**Fieldwire**
- Smart Sync: ใช้เน็ตมือถือโหลดแบบความละเอียดต่ำ ใช้ Wi-Fi โหลดทั้งหมด · ปิด Smart Sync = โหลด tiles ความละเอียดสูง รูป และไฟล์ ผ่านเน็ตมือถือด้วย · ตั้งค่าแยกรายผู้ใช้ — https://help.fieldwire.com/hc/en-us/articles/115005841383 · https://help.fieldwire.com/hc/en-us/articles/360000567343
- แบบบนมือถืออาจไม่คมเท่าบนเว็บ — https://help.fieldwire.com/hc/en-us/articles/47573554986129-Why-do-plans-look-blurry-or-pixelated-in-Fieldwire-and-how-can-I-fix-it
- ใช้ออฟไลน์ได้ "แม้อยู่ในอุโมงค์หรือชั้นใต้ดิน" (ข้อความการตลาด) — https://www.fieldwire.com/lp/field-management-software/
- รายงาน Punch และการตั้งเวลาส่งรายงาน — https://www.fieldwire.com/blog/use-fieldwire-to-manage-punch-lists/ · https://www.fieldwire.com/construction-reports/

**PlanRadar**
- การทำงานออฟไลน์ หมุดสีแดงสำหรับงานที่ยังไม่ซิงก์ และ Failed Ticket Updates — https://helpcenter-prd.planradar.com/en/working-offline/
- หน้าแก้รูป · ห้ามแก้รูปหลังอัปโหลด · ช่องรูปก่อนแก้ — https://helpcenter-prd.planradar.com/en/photo-editor/ · https://helpcenter-prd.planradar.com/en/add-attachments-to-tickets/
- แนบรูปในรายงาน PDF ได้สูงสุด 50 รูป — https://helpcenter-prd.planradar.com/en/attach-photos-to-project-reports/
- รีวิวผู้ใช้: หลังลงหน้างานทั้งวันและถ่ายรูปไว้มาก การซิงก์ใช้เวลานาน — https://www.capterra.com/p/156698/DefectRadar/reviews/

**Raken / Buildertrend / Dalux**
- Raken ลายน้ำ — https://help.rakenapp.com/en/articles/8927010-photo-watermarks-in-raken
- Buildertrend Daily Log ออฟไลน์ — https://buildertrend.com/blog/offline-time-clock-daily-logs/ · https://buildertrend.com/help-article/daily-logs-on-mobile/
- Dalux ออฟไลน์และ geotag — https://support.dalux.com/hc/articles/28263982197276 · https://support.dalux.com/hc/articles/26931251181724

---

## 4. สิ่งที่ Wellcon ควรนำมาใช้ (เรียงจากผลกระทบสูงและใช้แรงน้อย ไปหาใช้แรงมาก)

**สิ่งที่เรามีแล้ว:** หมุดบนแบบ · เขียนทับบนรูป · รูปอยู่ใน Supabase Storage (public bucket) เป็น JPEG ~1280px q0.72
**สิ่งที่ยังไม่มี:** รูปย่อ (thumbnail) · ซิงก์เฉพาะส่วนที่เปลี่ยน (delta sync) · โหลดข้อมูลทีละโปรเจกต์ · คิวอัปโหลดขณะออฟไลน์

| ลำดับ | สิ่งที่ควรทำ | ได้แนวคิดจาก | ผลกระทบ / แรงที่ใช้ |
|---|---|---|---|
| 1 | **ทำรูปย่อ ~320px (q~0.6) ตอนอัปโหลด** แล้วใช้รูปย่อในรายการ/กริดทั้งหมด เปิดรูปเต็มเฉพาะตอนแตะดู ทำได้ 2 ทาง: ย่อในเครื่องผู้ใช้ก่อนอัปโหลด (ไม่มีค่าใช้จ่ายเพิ่ม) หรือใช้ Supabase Image Transformations (มีค่าใช้จ่ายตามจำนวนรูปต้นฉบับ ดูข้อ 5) · เพิ่ม `loading="lazy"` ให้ทุก `<img>` | Fieldwire (ต่ำ/สูงตามเน็ต) | สูง / น้อย |
| 2 | **Delta sync:** แต่ละตารางมีคอลัมน์ `updated_at` เครื่องจำเวลาที่ซิงก์ครั้งล่าสุด แล้วดึงเฉพาะแถว `updated_at > last_sync` · ใช้ soft delete (`deleted_at`) เพื่อให้รู้ว่ามีแถวถูกลบ | PlanRadar / Procore (บันทึกในเครื่อง → ซิงก์) | สูงมาก / ปานกลาง |
| 3 | **คิวอัปโหลดออฟไลน์:** เก็บรูปที่ยังไม่ขึ้นระบบไว้ใน IndexedDB แล้วอัปโหลดต่อเมื่อมีเน็ต (ลองใหม่อัตโนมัติ) · แสดงป้าย "ยังไม่ซิงก์ (n)" และหมุดคนละสีบนแบบ · มีหน้า "ส่งไม่สำเร็จ" ให้ผู้ใช้กดส่งใหม่เอง | PlanRadar (หมุดแดง / Failed updates) · Fieldwire | สูง / ปานกลาง |
| 4 | **โหลดทีละโปรเจกต์ + ตัวเลือกช่วงรูป:** โหลดเฉพาะโปรเจกต์ที่ผู้ใช้เปิดอยู่ และมีตัวเลือก "เตรียมใช้ออฟไลน์" ที่โหลดรูปย่อ 7/30 วันล่าสุด · ใช้เน็ตมือถือไม่โหลดรูปเต็มล่วงหน้า | Autodesk (7/14/30/60 วัน) · Fieldwire Smart Sync · Dalux | สูง / ปานกลาง |
| 5 | **ย้ายไป private bucket + signed URL** (ลิงก์หมดอายุ) | — (ข้อควรระวัง ข้อ 5) | สูง (ความปลอดภัย) / ปานกลาง |
| 6 | **ลายน้ำตอนถ่าย:** วันที่-เวลา · ชื่อโปรเจกต์ · ห้อง/โซน (ไม่บังคับ GPS เพราะงานในอาคาร GPS ไม่แม่น) · เก็บต้นฉบับไว้ ไม่แก้ทับ (markup = สำเนาใหม่) | Raken · Autodesk · PlanRadar | กลาง / น้อย |
| 7 | **คู่รูปก่อน/หลังแก้ใน Punch list** + รายงาน PDF 1/2/4 รูปต่อหน้า กรองตามห้อง/วัน/ผู้รับผิดชอบได้ | PlanRadar · Procore | กลาง / น้อย |
| 8 | **ตั้งเวลาส่งรายงาน Punch ที่ยังค้าง** ให้ผู้รับผิดชอบแต่ละราย | Fieldwire | กลาง / ปานกลาง |
| 9 | **เทียบแบบ 2 revision แบบซ้อนกัน** (Drawing log) | Procore · Autodesk | กลาง / มาก |

> ข้อ 2–4 คือคำตอบตรงของคำถาม "เขาจัดการข้อมูลเยอะได้อย่างไร" — **ไม่มีเจ้าไหนดึงข้อมูลทั้งหมดทุกครั้ง**

---

## 5. ข้อควรระวัง

- **ค่าใช้จ่าย:** Supabase Image Transformations แผน Pro ให้ใช้ฟรี 100 รูปต้นฉบับต่อรอบบิล ส่วนที่เกินคิด $5 ต่อ 1,000 รูป (ปัดขึ้นเป็นชุดละ 1,000) — https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations · ถ้ามีรูปหน้างานหลายพันรูปต่อเดือน **การทำรูปย่อในเครื่องผู้ใช้ก่อนอัปโหลดจะถูกกว่า** · โควตาพื้นที่และ egress ของแผน Pro: ไม่ยืนยัน (ตัวเลขที่พบมาจากเว็บบุคคลที่สาม ต้องเช็กที่ https://supabase.com/pricing)
- **Signed URL กับการแปลงรูป:** เอกสารทางการระบุว่าส่ง transform ไปพร้อมตอนสร้าง signed URL ได้ แต่เอกสารของ Nuxt (บุคคลที่สาม) บอกว่าใช้ได้กับ public bucket เท่านั้น — **ไม่ยืนยัน** ต้องทดสอบก่อน — https://supabase.com/docs/guides/storage/serving/image-transformations
- **ความเป็นส่วนตัวของลูกค้า luxury:** ใน public bucket ใครได้ลิงก์ไปก็เปิดได้ตลอด (เช่น ลิงก์ที่หลุดในไลน์กลุ่ม) รูปบ้านพักส่วนตัวหรือห้องในโรงแรมอาจขัดข้อตกลงรักษาความลับ (NDA) ของลูกค้า ควรใช้ private bucket + signed URL อายุสั้น และตั้งชื่อไฟล์ให้เดายาก
- **PDPA:** รูปหน้างานที่เห็นหน้าคนงาน ลูกค้า หรือป้ายทะเบียนรถ ถือเป็นข้อมูลส่วนบุคคล ควรระบุวัตถุประสงค์การเก็บ จำกัดสิทธิ์การเข้าถึง และกำหนดระยะเวลาเก็บรักษา · ร่างแนวปฏิบัติ PDPC (เปิดรับฟังความเห็น 07/07/2026) ยังไม่เป็นฉบับสุดท้าย — https://www.tilleke.com/insights/thailands-public-consultation-on-proposed-pdpa-guidelines-key-updates · ควรให้ฝ่ายกฎหมายตรวจก่อนใช้
- **พิกัด GPS ในรูป:** EXIF ของรูปอาจระบุพิกัดบ้านลูกค้า ควรลบ EXIF ออกตอนย่อรูป (canvas re-encode ลบให้อยู่แล้ว) แล้วเก็บตำแหน่งเป็นชื่อห้อง/โซนแทน
- **Conflict:** Autodesk ทิ้งการแก้ไขในเครื่องถ้างานนั้นถูกลบไปแล้วบนเว็บ ส่วน PlanRadar ใส่ไว้ในรายการส่งไม่สำเร็จ · Wellcon ต้องเลือกกติกาให้ชัด (แนะนำ: ข้อมูลที่บันทึกล่าสุดชนะเป็นรายช่อง และมีหน้าให้ดูรายการส่งไม่สำเร็จ)

---

## 6. แหล่งอ้างอิง

**หมายเหตุ:** ทุก URL ด้านล่างได้มาจาก**ผลค้นหาเว็บ** (WebSearch) ซึ่งสรุปเนื้อหาของหน้านั้น — ไม่ได้เปิดหน้าโดยตรงเพราะ network ของ session บล็อกโดเมนเหล่านี้ ถ้าจะใช้ตัวเลขใดเป็นข้อมูลอ้างอิงทางการ ควรเปิดตรวจหน้าจริงอีกครั้ง

- Procore: support.procore.com/products/online/user-guide/project-level/photos/tutorials/upload-photos · …/email-photos-inbound · …/export-photos-as-a-pdf · v2.support.procore.com/product-manuals/photos-project/tutorials/search-for-and-filter-photos · support.procore.com/faq/can-i-use-procores-mobile-application-offline · support.procore.com/procore-mobile-ios/user-guide/photos-ios/permissions · support.procore.com/products/online/user-guide/project-level/drawings/tutorials/add-photos-to-a-drawing · …/compare-drawings-in-the-drawings-tool-open-beta
- Autodesk: help.autodesk.com/cloudhelp/ENU/Build-Mobile/files/download-project/Download_Project_Initial.html · …/Mobile_Download_Projects_FAQs.html · …/Mobile_Sync_Troubleshooting.html · help.autodesk.com/cloudhelp/ENU/Build-Gallery/files/Photos_iOS.html · …/Photos_Web.html · health.autodesk.com/incidents/phtlx6t3b5bq
- Fieldwire: help.fieldwire.com/hc/en-us/articles/115005841383 · …/360000567343 · …/47573554986129 · fieldwire.com/lp/field-management-software/ · fieldwire.com/blog/use-fieldwire-to-manage-punch-lists/ · fieldwire.com/construction-reports/
- PlanRadar: helpcenter-prd.planradar.com/en/working-offline/ · …/photo-editor/ · …/add-attachments-to-tickets/ · …/attach-photos-to-project-reports/ · capterra.com/p/156698/DefectRadar/reviews/
- Raken: help.rakenapp.com/en/articles/8927010-photo-watermarks-in-raken
- Buildertrend: buildertrend.com/blog/offline-time-clock-daily-logs/ · buildertrend.com/help-article/daily-logs-on-mobile/
- Dalux: support.dalux.com/hc/articles/28263982197276 · support.dalux.com/hc/articles/26931251181724
- SnagR (บุคคลที่สาม): softwarefinder.com/construction/snagr
- Supabase: supabase.com/docs/guides/storage/serving/image-transformations · supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations
- PDPA: tilleke.com/insights/thailands-public-consultation-on-proposed-pdpa-guidelines-key-updates
