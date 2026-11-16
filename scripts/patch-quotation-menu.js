#!/usr/bin/env node
/* =====================================================================
   v1.414.0 quotation-menu — การ์ด / เมนู "Quotation Maker" ใน Wellcon PM → เปิดหน้าแยก /quotation.html?pid=<id>
     node scripts/patch-quotation-menu.js        (รันหลัง patch-top-fit.js)
   1) หน้าในโครงการ: เมนู "Quotation Maker · ใบเสนอราคาด่วน" (ต่อจาก งานเพิ่ม · VO Tracker) — เฉพาะผู้มีสิทธิ์ดูตัวเลขเงิน
   2) การ์ดหน้าแรก: ชุดเริ่มต้นของ QS · QS Manager · Director มี "Quotation Maker"
      — ตำแหน่ง / คนที่ตั้งการ์ดเองแล้วไม่เปลี่ยน (Admin เพิ่มได้ที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน)
   3) ปิดทั้งระบบ / รายโครงการ ได้ที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน (สวิตช์ 'tab:quo' — หน้า quotation.html ตรวจสวิตช์เดียวกัน)
   - ตัวหน้า: quotation.html + quotation.js (ข้อมูล app_state 'quotations' · ไฟล์แบบ bucket general-photo/quotation/) · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.414.0 quotation-menu';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เมนู Quotation Maker)'); process.exit(0); }
if (!t.includes('v1.394.0 auto-pr-menu')) { console.error('✗ ต้องรัน scripts/patch-auto-pr-menu.js ก่อน'); process.exit(1); }

const R = [
  ['เมนูในโครงการ (เฉพาะผู้มีสิทธิ์ดูตัวเลขเงิน)', "['aw','งานเพิ่ม · VO Tracker (QS)']]:[])", "['aw','งานเพิ่ม · VO Tracker (QS)'],['quo','Quotation Maker · ใบเสนอราคาด่วน ↗']]:[])"],
  ['เปิดหน้าแยก', "  _qmOpen(pid){",
   "  _quoOpen(pid){ try{ window.location.href='/quotation.html?'+(pid?'pid='+encodeURIComponent(pid):'')+(this.IS_STAGING()?(pid?'&':'')+'env=staging':''); }catch(e){} }   // " + MARK + "\n  _qmOpen(pid){"],
  ['การ์ด → เปิดหน้าแยก', "if(k==='apr'){ this._aprOpen(pid); return; }", "if(k==='quo'){ this._quoOpen(pid); return; } if(k==='apr'){ this._aprOpen(pid); return; }"],
  ['เมนู → เปิดหน้าแยก', "if(k==='apr'){ this._aprOpen(_pdPid); return; }", "if(k==='quo'){ this._quoOpen(_pdPid); return; } if(k==='apr'){ this._aprOpen(_pdPid); return; }"],
  ['หมวดสี', "fin:'fin', aw:'fin',", "fin:'fin', aw:'fin', quo:'fin',"],
  ['สีประจำการ์ด', "'tab:apr':'#D97706',", "'tab:apr':'#D97706','tab:quo':'#0D5C63',"],
  ['ไอคอนการ์ด', "const I={ qc:", "const I={ quo:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h5M8 17h3M16 12.5v6M14.2 14h2.7a1.2 1.2 0 0 1 0 2.4h-1.8a1.2 1.2 0 0 0 0 2.4h2.7', qc:"],
  ['คำอธิบายการ์ด', "const SUB={ apr:", "const SUB={ quo:'AI อ่านแบบ · ถอดรายการ · ส่งอนุมัติ · พิมพ์ใบเสนอราคา', apr:"],
  ['การ์ดเริ่มต้น: QS / QS Manager', "const QS=['tab:apr','tab:qm','tab:aw',", "const QS=['tab:quo','tab:apr','tab:qm','tab:aw',"],
  ['การ์ดเริ่มต้น: Director', "const DIR=['tab:plan','tab:delay','tab:fin','tab:changes',", "const DIR=['tab:plan','tab:delay','tab:fin','tab:changes','tab:quo',"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เมนู Quotation Maker: แก้ ' + R.length + ' จุด');
