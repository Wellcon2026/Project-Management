#!/usr/bin/env node
/* =====================================================================
   v1.440.0 note-time — บันทึกใส่เวลาได้ (ผู้บริหารขอ 20/11/2026) · ปฏิทินแสดงเวลาหน้าชื่อบันทึก
     node scripts/patch-note-time.js        (รันหลัง patch-search-hl.js)
   - _noteMs(): ชื่อในปฏิทิน = "09:00 · ข้อความ" เมื่อบันทึกมีเวลา (n.time 'HH:MM') · ฟอร์มเวลาอยู่ใน wcnote.js 1.3.0
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
const MARK = 'v1.440.0 note-time';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (note-time)'); process.exit(0); }
if (!t.includes('v1.439.0 search-hl')) { console.error('✗ ต้องรัน scripts/patch-search-hl.js ก่อน'); process.exit(1); }
const A = "title:(n.done?'✓ ':(n.vis==='private'?'🔒 ':'📝 '))+first(n.text),";
const B = "title:(n.done?'✓ ':(n.vis==='private'?'🔒 ':'📝 '))+(/^\\d{2}:\\d{2}$/.test(String(n.time||''))?n.time+' · ':'')+first(n.text), /* " + MARK + " */";
const c = t.split(A).length - 1; if (c !== 1) { console.error('✗ ชื่อบันทึกในปฏิทิน: หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); }
t = t.replace(A, B);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ note-time: ปฏิทินแสดงเวลาของบันทึก');
