#!/usr/bin/env node
/* =====================================================================
   v1.439.0 search-hl — ไฮไลต์คำค้นทุกหน้า (ผู้บริหารสั่ง 20/11/2026)
     node scripts/patch-search-hl.js        (รันหลัง patch-note-hub.js)
   - โหลด /wchl.js ในแอปหลัก (หน้าแยก *.html ใส่ <script src="/wchl.js"> เองในไฟล์)
   - wchl.js ใช้ CSS Custom Highlight API: ไม่แก้ DOM ของหน้า · ช่องค้นหาที่มีคำ ≥ 2 ตัวอักษร → ไฮไลต์ + ป้าย "พบ n จุด ▲ ▼"
   - รันซ้ำได้: อัปเดตเลขเวอร์ชัน wchl.js?v= ให้ตรง HL_VER
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
const MARK = 'v1.439.0 search-hl';
const HL_VER = '1.0.0';
if (t.includes(MARK)) { const t2 = t.replace(/\/wchl\.js\?v=[0-9.]+/g, '/wchl.js?v=' + HL_VER);
  if (t2 !== t) { lines[idx] = enc(t2); fs.writeFileSync(file, lines.join(nl)); console.log('✓ search-hl มีแล้ว · อัปเดต wchl.js?v=' + HL_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (search-hl)'); process.exit(0); }
if (!t.includes('v1.438.0 note-hub')) { console.error('✗ ต้องรัน scripts/patch-note-hub.js ก่อน'); process.exit(1); }
const A = '<!-- v1.438.0 note-hub -->';
if (t.split(A).length - 1 !== 1) { console.error('✗ หาจุดใส่สคริปต์เจอ ' + (t.split(A).length - 1) + ' ที่ (ต้องเจอ 1)'); process.exit(1); }
t = t.replace(A, A + '\n<script src="/wchl.js?v=' + HL_VER + '"></script><!-- ' + MARK + ' -->');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ search-hl: ใส่ wchl.js ในแอปหลัก');
