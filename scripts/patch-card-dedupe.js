#!/usr/bin/env node
/* =====================================================================
   v1.452.0 card-dedupe — ข้อ 2: การ์ด "Material Log" ซ้ำ 2 ใบ (Super Admin) (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-card-dedupe.js
   - แท็บ 'proc' (จัดซื้อวัสดุ) กับ 'procm' (Material Log · จัดซื้อวัสดุ) เปิดหน้าเดียวกัน → ชุดการ์ดทั้งหมดของ Super Admin เหลือ 'tab:procm' ใบเดียว
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.452.0 card-dedupe';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (card-dedupe)'); process.exit(0); }
const A = "const all=['dhome','tab:setup', ...defs.map(d=>'tab:'+d[0]),";
if (t.split(A).length !== 2) { console.error('✗ ชุดการ์ด Super Admin: หาจุดแก้ไม่เจอ'); process.exit(1); }
t = t.replace(A, () => "const all=['dhome','tab:setup', ...defs.map(d=>'tab:'+d[0]).filter(k=>k!=='tab:proc'),   /* " + MARK + ": proc = procm หน้าเดียวกัน */");
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ card-dedupe: การ์ด Material Log เหลือใบเดียว');
