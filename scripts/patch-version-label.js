#!/usr/bin/env node
/* =====================================================================
   เปลี่ยน "ป้ายเวอร์ชัน + วันที่อัปเดต" ที่ผู้ใช้เห็น (หน้า login และมุมหน้าจอ) ใน index.html
   ใช้เมื่อขึ้นงานที่ทำด้วยสคริปต์ patch (ไม่ได้มาจาก canvas) ให้ผู้ใช้รู้ว่ามีอัปเดต
     node scripts/patch-version-label.js v1.363.1 "8 พ.ย. 2569"
   - เปลี่ยนเฉพาะ "ข้อความที่แสดง" — ไม่แตะ APP_VER() (ตัวล็อกเวอร์ชัน)
     เหตุผล: ถ้าเพิ่ม APP_VER แล้วไฟล์จาก canvas รอบหน้ายังเป็นเลขเดิม ทุกเครื่องจะถูกล็อกเป็น "เวอร์ชันเก่า" (อ่านอย่างเดียว)
   - ไม่ใช่ขั้นตอนประจำหลังอัปโหลดจาก canvas (canvas มีเลขเวอร์ชันของตัวเอง)
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const [ver, date] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(ver || '') || !date) { console.error('ใช้: node scripts/patch-version-label.js v1.363.1 "8 พ.ย. 2569"'); process.exit(2); }

const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }

// ป้ายเวอร์ชัน: <span class="num" ...>vX.Y.Z</span> (หน้า login + มุมหน้าจอ)
const reBadge = /(<span class="num" style="[^"]*border-radius:6px">)v\d+\.\d+\.\d+(<\/span>)/g;
const nB = (t.match(reBadge) || []).length;
// วันที่: <span class="num" ...>อัปเดต ...</span>
const reDate = /(<span class="num" style="font-size:10\.5px;color:#8E876F">อัปเดต )[^<]+(<\/span>)/g;
const nD = (t.match(reDate) || []).length;
if (nB < 1 || nD !== 1) { console.error('✗ หาป้ายเวอร์ชัน (' + nB + ') / วันที่ (' + nD + ') ไม่ครบ — ไม่แก้'); process.exit(1); }
t = t.replace(reBadge, (m, a, b) => a + ver + b).replace(reDate, (m, a, b) => a + date + b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ป้ายเวอร์ชัน ' + nB + ' จุด → ' + ver + ' · วันที่ → ' + date + ' (APP_VER ไม่เปลี่ยน)');
