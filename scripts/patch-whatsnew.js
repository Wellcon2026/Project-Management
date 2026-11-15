#!/usr/bin/env node
/* =====================================================================
   v1.401.0 whatsnew — ผู้บริหารสั่ง 14/11/2026: Wellcon PM มีหน้าต่างแจ้งเตือนเมื่อมีอัปเดต (แบบเดียวกับ Site Work)
     node scripts/patch-whatsnew.js        (รันต่อจาก patch-sync-d.js)
   ใส่ <script src="/wcnews.js?v=1.401.0"> ต่อจาก wctag.js ใน index.html
   · wcnews.js (ไฟล์แยก): "มีอัปเดตใหม่ — อัปเดตเลย" เมื่อเซิร์ฟเวอร์ใหม่กว่าเครื่องนี้ · "มีอะไรใหม่" 1 ครั้งหลังอัปเดต · กดป้ายเลขเวอร์ชันเพื่อดูย้อนหลัง
   · ข้อมูลใน whatsnew.json (ใหม่สุดอยู่บน) · เลขใน ?v= = เวอร์ชันของเครื่องนี้ — patch-version-label.js เปลี่ยนให้พร้อมป้ายเวอร์ชัน
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.401.0 whatsnew';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าต่างแจ้งเตือนอัปเดต)'); process.exit(0); }
if (!t.includes('v1.400.0 sync-d')) { console.error('✗ ต้องรัน scripts/patch-sync-d.js ก่อน'); process.exit(1); }

const m = /<script src="\/wctag\.js\?v=[0-9.]+"><\/script>/.exec(t);
const R = [
  ['ตัวแจ้งเตือนอัปเดต (ต่อจาก wctag.js)', m ? m[0] : '<<ไม่พบ wctag.js>>', (m ? m[0] : '') + '\n<script src="/wcnews.js?v=1.401.0"></script><!-- ' + MARK + ' -->'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าต่างแจ้งเตือนอัปเดต: แก้ ' + R.length + ' จุด');
