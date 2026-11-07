#!/usr/bin/env node
/* =====================================================================
   อัปเดต takeoff-engine.js (สูตรคำนวณถอดแบบ) จาก repo wellcon-qs-takeoff
   ห้ามแก้สูตรในไฟล์ engine ฝั่ง PM — แก้ที่ QS แล้วรันสคริปต์นี้

   ใช้:  node scripts/sync-engine.js            → เช็กเวอร์ชัน + คัดลอกถ้าไม่ตรง
         node scripts/sync-engine.js --check    → เช็กอย่างเดียว (ไม่ตรง = exit 1)
         node scripts/sync-engine.js --from <path ของ takeoff-engine.js ฝั่ง QS>
   ค่าเริ่มต้น: ../wellcon-qs-takeoff/takeoff-engine.js (โฟลเดอร์ข้าง ๆ repo นี้)
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const check = args.includes('--check');
const fi = args.indexOf('--from');
const root = path.resolve(__dirname, '..');
const src = fi >= 0 ? path.resolve(args[fi + 1]) : path.resolve(root, '..', 'wellcon-qs-takeoff', 'takeoff-engine.js');
const dst = path.join(root, 'takeoff-engine.js');

const ver = (txt) => { const m = /const ENGINE_VERSION\s*=\s*'([^']+)'/.exec(txt || ''); return m ? m[1] : null; };
const load = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };

const a = load(src), b = load(dst);
if (!a) { console.error('ไม่พบไฟล์ engine ของ QS: ' + src); process.exit(2); }
const va = ver(a), vb = ver(b);
if (!va) { console.error('ไฟล์ QS ไม่มี ENGINE_VERSION — ไม่คัดลอก'); process.exit(2); }
console.log('QS engine : ' + va + '  (' + src + ')');
console.log('PM engine : ' + (vb || '(ไม่มี)') + '  (' + dst + ')');

const same = a.replace(/\r\n/g, '\n') === (b || '').replace(/\r\n/g, '\n');
if (same) { console.log('✓ ตรงกันทุกบรรทัด ไม่ต้องอัปเดต'); process.exit(0); }
if (va === vb) console.warn('⚠ ENGINE_VERSION เท่ากันแต่เนื้อไฟล์ต่างกัน — มีคนแก้ไฟล์ฝั่ง PM? จะเขียนทับด้วยของ QS');
if (check) { console.error('✗ ไม่ตรงกัน — รัน  node scripts/sync-engine.js  เพื่ออัปเดต'); process.exit(1); }

// เช็กว่าโหลดได้และมีฟังก์ชันที่ Quick Measure ใช้ ก่อนเขียนทับ
const tmp = path.join(root, '.engine-check.tmp.js');
fs.writeFileSync(tmp, a);
try {
  delete require.cache[tmp];
  const E = require(tmp);
  ['measure', 'polyLength', 'centroid', 'scaleFromCalibration', 'scaleFromRatio'].forEach(k => { if (typeof E[k] !== 'function') throw new Error('ไม่มีฟังก์ชัน ' + k); });
  const q = E.measure({ type: 'area', pts: [[0, 0], [100, 0], [100, 100], [0, 100]] }, 10);
  if (!q || Math.abs(q.q - 1) > 1e-9) throw new Error('ทดสอบสูตรพื้นที่ไม่ผ่าน');
} catch (e) { fs.unlinkSync(tmp); console.error('✗ engine ใหม่ใช้ไม่ได้: ' + e.message + ' — ไม่คัดลอก'); process.exit(1); }
fs.unlinkSync(tmp);

fs.writeFileSync(dst, a);
console.log('✓ อัปเดตแล้ว ' + (vb || '-') + ' → ' + va + ' · อย่าลืม commit takeoff-engine.js และอัปเดต PROGRESS.md');
