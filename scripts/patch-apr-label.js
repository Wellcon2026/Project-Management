#!/usr/bin/env node
/* =====================================================================
   v1.395.0 apr-label — เมนู / การ์ด "Auto PR · ใบขอซื้อ" → "ใบขอซื้อ · ใบขอจ้าง"
     node scripts/patch-apr-label.js        (รันต่อจาก patch-auto-pr-menu.js)
   ผู้บริหารสั่ง 14/11/2026: เรียกเอกสารว่า "ใบขอซื้อ" และ "ใบขอจ้าง" · หน้าจอใช้ภาษาไทย (ผู้ใช้คุ้นเคย ทำงานคล่องกว่า)
   - เปลี่ยนเฉพาะชื่อที่แสดง · รหัสการ์ด 'apr' เดิม (ค่าตั้งการ์ดของตำแหน่ง / คน ไม่หาย)
   - ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.395.0 apr-label';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ชื่อเมนู ใบขอซื้อ · ใบขอจ้าง)'); process.exit(0); }
if (!t.includes('v1.394.0 auto-pr-menu')) { console.error('✗ ต้องรัน scripts/patch-auto-pr-menu.js ก่อน'); process.exit(1); }
const R = [
  ['ชื่อเมนู / การ์ด', "['apr','Auto PR · ใบขอซื้อ']", "['apr','ใบขอซื้อ · ใบขอจ้าง']"],
  ['คำอธิบายการ์ด', "apr:'ใบขอซื้อกรอกให้อัตโนมัติ · พิมพ์ / ส่ง LINE'", "apr:'กรอกให้อัตโนมัติ · PM + QS อนุมัติ · ติดตามถึงรับของ'   /* " + MARK + " */"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ชื่อเมนู ใบขอซื้อ · ใบขอจ้าง: แก้ ' + R.length + ' จุด');
