#!/usr/bin/env node
/* =====================================================================
   ปิด Level Gate ทั้งระบบ (ทุกบัญชี · ทุกตำแหน่ง) — คำสั่งผู้บริหาร 11/11/2026
     node scripts/patch-level-off.js        (รันต่อจาก patch-pd-short.js)
   featOn('level') → false เสมอ: ซ่อนเมนู "การมีส่วนร่วม · Level Gate" · การ์ดคะแนนในหน้าโครงการ · ปุ่มคะแนนของผู้รับผิดชอบ · ป๊อปอัปแต้ม
   ระบบยังเก็บประวัติกิจกรรม (engagement) ไว้เบื้องหลังสำหรับหน้า "การใช้งานระบบ" · เปิดกลับ: ลบบรรทัด LEVEL_OFF แล้วอัปโหลดใหม่
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
if (t.includes('LEVEL_OFF')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ปิด Level Gate)'); process.exit(0); }
const a = "  featOn(key, acc){\n    if(key==='ai') return this.aiAllowed(acc);";
if (t.split(a).length - 1 !== 1) { console.error('✗ หา featOn ไม่เจอ — ไม่แก้'); process.exit(1); }
t = t.replace(a, "  featOn(key, acc){\n    if(key==='level') return false;   // LEVEL_OFF v1.373.1: ปิด Level Gate ทั้งระบบ (คำสั่งผู้บริหาร 11/11/2026)\n    if(key==='ai') return this.aiAllowed(acc);");
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ปิด Level Gate ทั้งระบบ (featOn level = false)');
