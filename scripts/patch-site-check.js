#!/usr/bin/env node
/* =====================================================================
   Wellcon Site Check — รวมแอป Defect Check / Site Issues / Survey เป็นแอปเดียว (wellcon-defect-check v1.32.0+)
     node scripts/patch-site-check.js        (รันหลัง patch-site-issues.js และ patch-survey-menu.js)
   - เมนูหน้าโครงการ: ตัด "Site Issues · ติดตามงาน" (ยกเลิกแล้ว รวมเข้า Defect) · เปลี่ยนชื่อ Defect / Survey เป็น "Site Check · …"
   - ปุ่ม / การ์ด Site Issues ที่ยังค้างอยู่ (หน้าแรก / ลิงก์เดิม) → เปิด Defect ของโครงการเดียวกัน
   - Survey (ข้อมูลจริง) เปิดที่ wellcon-defect-check.vercel.app/survey (ที่อยู่เดียว · ไม่ต้องล็อกอินซ้ำ)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }

const R = [
  ['เมนูโครงการ: ตัด Site Issues · เปลี่ยนชื่อ',
   "['qc','Defect Check · ตรวจงาน (QC)'],['issues','Site Issues · ติดตามงาน'],['survey','As-Built & Survey · สำรวจหน้างาน'],",
   "['qc','Site Check · Defect ตรวจงาน (QC)'],['survey','Site Check · Survey สำรวจหน้างาน'],   /* v1.377.0 site-check: Site Issues ยกเลิก (รวมเข้า Defect) */"],
  ['ลำดับเมนู: Survey ต่อจาก Defect', "issues:'qc', survey:'issues',", "issues:'qc', survey:'qc',"],
  ['ลิงก์ Site Issues เดิม → Defect',
   "return base.replace(/\\/?$/,'/')+'issues'+(this.IS_STAGING()?'?env=staging':'')+'#/p/'+encodeURIComponent(pid)+'/mine'; }",
   "return base.replace(/\\/?$/,'/')+(this.IS_STAGING()?'?env=staging':'')+'#/p/'+encodeURIComponent(pid)+'/list'; }   // v1.377.0 site-check: Site Issues รวมเข้า Defect"],
  ['Survey: ที่อยู่เดียว',
   "(st?'https://wellcon-defect-check.vercel.app/':'https://wellcon-survey.vercel.app/')",
   "'https://wellcon-defect-check.vercel.app/'   /* v1.377.0 site-check: ที่อยู่เดียว */"],
  ['หัวหน้า Defect ใน PM', '<span style="font-weight:700;white-space:nowrap">Defect Check</span>', '<span style="font-weight:700;white-space:nowrap">Site Check · Defect</span>'],
  ['iframe title', 'title="Defect Check" allow="fullscreen;', 'title="Wellcon Site Check · Defect" allow="fullscreen;'],
];
let done = 0, had = 0;
for (const [name, a, b] of R) {
  if (t.includes(b)) { had++; continue; }
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ ' + name + ' (พบ ' + n + ' จุด) — ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); done++;
}
if (!done) { console.log('✓ มีครบแล้ว — ไม่ต้องแก้ (' + had + ' จุด)'); process.exit(0); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Wellcon Site Check — แก้ ' + done + ' จุด' + (had ? (' · มีแล้ว ' + had) : ''));
