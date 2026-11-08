#!/usr/bin/env node
/* =====================================================================
   แผน ก ขั้น 5 — Takeoff ตัวเดียวของ PM (แก้ index.html ที่มาจาก canvas)
   - ซ่อนแท็บ "Takeoff · ถอดปริมาณ & PR" เดิมจากเมนู (โค้ดและข้อมูลเดิมยังอยู่ครบ ไม่ลบอะไร)
     เปิดกลับได้: ต่อท้ายลิงก์ PM ด้วย ?legacyTakeoff=1 หรือในเครื่องนั้นตั้ง localStorage wc_tko_legacy = 1
   - เปลี่ยนชื่อเมนู "วัดพื้นที่ด่วน (มือถือ)" → "Takeoff · วัดหน้างาน" (ใช้ได้ทั้งคอมและมือถือแล้ว)
   - ไม่แตะ login / accounts / role · รันซ้ำได้ · หาจุดไม่เจอ = หยุดโดยไม่เขียนไฟล์
   ลำดับหลังอัปโหลด index.html ใหม่จาก canvas:
     node scripts/patch-quick-measure-menu.js   (ถ้ายังไม่มีเมนู)
     node scripts/patch-qs-track-rowsync.js
     node scripts/patch-takeoff-unify.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('ไม่พบส่วน template ใน index.html — รูปแบบไฟล์เปลี่ยน ไม่แก้'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้ (ป้องกันไฟล์เสีย)'); process.exit(2); }
if (t.includes('_tkoLegacyOn(')) { console.log('✓ ทำขั้น 5 ไว้แล้ว ไม่ต้องแก้'); process.exit(0); }
if (!t.includes('_qmOpen(')) { console.error('✗ ยังไม่มีเมนูวัดพื้นที่ด่วน — รัน node scripts/patch-quick-measure-menu.js ก่อน'); process.exit(1); }

const EDITS = [
  ['ซ่อนแท็บเดิม + เปลี่ยนชื่อเมนู',
    "['takeoff','Takeoff · ถอดปริมาณ & PR'],['qm','วัดพื้นที่ด่วน (มือถือ)'],",
    "...(this._tkoLegacyOn()?[['takeoff','Takeoff เดิม (เก็บถาวร)']]:[]),['qm','Takeoff · วัดหน้างาน'],"],
  ['ลำดับเมนู (ต่อจากรายงานประจำวัน)', "const after={ takeoff:'daily', qm:'takeoff',", "const after={ takeoff:'daily', qm:'daily',"],
  ['คำอธิบายปุ่ม', "qm:'มือถือ · วัดห้องบนแบบของ QS → ส่งให้ QS ตรวจ',", "qm:'วัดบนแบบ QS / แบบที่อัปโหลด · โน้ต · CSV → ส่ง QS ตรวจ',"],
  ['สวิตช์เปิดแท็บเดิมกลับ', "_openTab(pid,k){ ",
    "_tkoLegacyOn(){ try{ return /[?&]legacyTakeoff=1/.test(window.location.search)||window.localStorage.getItem('wc_tko_legacy')==='1'; }catch(e){ return false; } }\n  _openTab(pid,k){ "],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b);
  console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ซ่อนแท็บ Takeoff เดิม (เปิดกลับ: ?legacyTakeoff=1) และเปลี่ยนชื่อเมนูเป็น "Takeoff · วัดหน้างาน" แล้ว');
