#!/usr/bin/env node
/* =====================================================================
   ทำให้ Wellcon PM "ติดตั้งเป็นแอป" ได้ (Chrome / Edge / Android / iPhone) + ไอคอน + ชื่อแท็บ "Wellcon PM"
     node scripts/patch-pwa.js
   - ใส่ <link rel="manifest"> + ไอคอน + theme-color 2 ที่:
       1) <head> ด้านนอก  → Chrome เห็นตอนเปิดหน้า (ปุ่มติดตั้ง)
       2) <head> ใน template ของ bundle → ยังอยู่หลัง loader แทนที่ทั้งหน้า (documentElement.replaceWith)
   - เปลี่ยน <title>Bundled Page</title> → Wellcon PM
   - รันซ้ำได้ ไม่ซ้อน (มีเครื่องหมาย wellcon-pwa) · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
   - ไฟล์ที่ใช้ (อยู่ที่ root): manifest.webmanifest · icon.svg · icon-192.png · icon-512.png · icon-maskable-512.png · apple-touch-icon.png
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const MARK = 'wellcon-pwa';
const TAGS = [
  '<meta name="' + MARK + '" content="1">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<meta name="theme-color" content="#1C1B18">',
  '<link rel="icon" href="icon.svg" type="image/svg+xml">',
  '<link rel="icon" href="icon-192.png" type="image/png" sizes="192x192">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Wellcon PM">',
  '<meta name="application-name" content="Wellcon PM">',
];
for (const f of ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  if (!fs.existsSync(path.resolve(__dirname, '..', f))) { console.error('✗ ไม่พบไฟล์ ' + f + ' ที่ root — ไม่แก้'); process.exit(2); }
}
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
let changed = 0;

// 1) <head> ด้านนอก (ก่อนบรรทัด template)
const tIdx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (tIdx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const headEnd = lines.findIndex((l) => l.trim() === '</head>');
if (headEnd < 0 || headEnd > tIdx) { console.error('✗ ไม่พบ </head> ด้านนอก'); process.exit(2); }
const outer = lines.slice(0, headEnd).join(nl);
if (!outer.includes(MARK)) {
  const ind = (lines[headEnd - 1].match(/^\s*/) || [''])[0] || '  ';
  lines.splice(headEnd, 0, ...TAGS.map((t) => ind + t));
  changed++;
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '<title>Bundled Page</title>') { lines[i] = lines[i].replace('Bundled Page', 'Wellcon PM'); changed++; break; }
}

// 2) <head> ใน template (สตริง JSON บรรทัดถัดจาก <script type="__bundler/template">)
const t2 = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[t2]);
if (enc(t) !== lines[t2]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const headClose = t.indexOf('</head>');
if (headClose < 0) { console.error('✗ ไม่พบ </head> ใน template'); process.exit(2); }
if (!t.slice(0, headClose).includes(MARK)) {
  const hasTitle = /<title>/i.test(t.slice(0, headClose));
  t = t.slice(0, headClose) + TAGS.join('\n') + '\n' + (hasTitle ? '' : '<title>Wellcon PM</title>\n') + t.slice(headClose);
  lines[t2] = enc(t);
  changed++;
}

if (!changed) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ติดตั้งเป็นแอปได้ · ไอคอน Wellcon PM)'); process.exit(0); }
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ติดตั้งเป็นแอปได้แล้ว: manifest + ไอคอน + ชื่อแท็บ "Wellcon PM" (' + changed + ' จุด)');
