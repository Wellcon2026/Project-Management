#!/usr/bin/env node
/* =====================================================================
   คัดลอก Photo Editor (PM) → แอป Layboard แยก (repo Wellcon2026/layboard · layboard.vercel.app)
     node scripts/sync-photo-to-layboard.js /path/to/layboard        (รันใหม่ทุกครั้งที่แก้ photo.html / photoedit.js)
   - สร้าง photo-editor.html (โหมด SOLO: window.PE_CFG = { solo: true } — ไม่ใช้บัญชี Wellcon PM · ไม่มี 🏠 / ออกจากระบบ / แท็ก)
   - คัดลอก photoedit.js · vendor/utif.js · vendor/pako_inflate.min.js · vendor/LICENSES-PHOTO.txt · photo-icon.svg
   - Layboard แยกเปิดผ่าน editPhoto() → photoEditSolo() → photo-editor.html?embed=1 (ใน PM ใช้ LB_PM.photoEdit → /photo.html)
   - หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs'), path = require('path');
const dst = process.argv[2]; if (!dst || !fs.existsSync(path.join(dst, 'Layboard.dc.html'))) { console.error('ใช้: node scripts/sync-photo-to-layboard.js <โฟลเดอร์ repo layboard>'); process.exit(2); }
const root = path.resolve(__dirname, '..'); const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let h = rd('photo.html');
const R = [
  ['manifest', '<link rel="manifest" href="photo.webmanifest">\n', ''],
  ['apple icon', '<link rel="apple-touch-icon" href="photo-apple-touch-icon.png">\n', ''],
  ['ชื่อหน้า', '<title>Photo Editor · Wellcon</title>', '<title>Photo Editor · Layboard</title>'],
  ['supabase', '<script src="vendor/supabase.js"></script>\n', ''],
  ['wctag', '<script src="wctag.js?v=1.2.2"></script>\n', ''],
  ['pm-nav', /<script src="pm-nav\.js\?v=[\d.]+"><\/script>\n/, ''],
  ['โหมด SOLO', /<script src="photoedit\.js\?v=([\d.]+)"><\/script>/, (m, v) => '<script>window.PE_CFG = { solo: true };</script>\n<script src="photoedit.js?v=' + v + '"></script>'],
];
for (const [name, a, b] of R) { const hit = typeof a === 'string' ? h.split(a).length - 1 : (h.match(new RegExp(a.source, 'g')) || []).length; if (hit !== 1) { console.error('✗ ' + name + ': เจอ ' + hit + ' ที่ (ต้อง 1) — ไม่เขียนไฟล์'); process.exit(1); } h = h.replace(a, b); }
h = h.split('aria-label="กลับ Wellcon PM"').join('aria-label="กลับ Layboard"');
fs.writeFileSync(path.join(dst, 'photo-editor.html'), h);
fs.mkdirSync(path.join(dst, 'vendor'), { recursive: true });
for (const f of ['photoedit.js', 'vendor/utif.js', 'vendor/pako_inflate.min.js', 'vendor/LICENSES-PHOTO.txt', 'photo-icon.svg']) fs.copyFileSync(path.join(root, f), path.join(dst, f));
console.log('✓ คัดลอก Photo Editor → ' + dst + ' (photo-editor.html · photoedit.js · vendor/ · photo-icon.svg)');
