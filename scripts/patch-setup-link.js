#!/usr/bin/env node
/* =====================================================================
   v1.444.0 setup-link — "ตั้งค่าโครงการ" ส่งข้อมูลให้แอปอื่น (ผู้บริหารสั่ง 20/11/2026)
     node scripts/patch-setup-link.js        (รันหลัง patch-project-setup.js)
   - ช่องใหม่ในโครงการ: siteAddr (ที่อยู่หน้างาน / สถานที่ส่งของ) — นับในความครบของข้อมูล (_setupScore)
   - แอปที่ดึงไปใช้: Quotation Maker 1.11.0 (ลูกค้า · เรียน · ที่อยู่ · เลขภาษี · สถานที่) · ใบขอซื้อ 1.11.0 (สถานที่ส่งของ) · Claim ใน Site Work (หนังสือถึง Owner · เรียน Consult)
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
const MARK = 'v1.444.0 setup-link';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (setup-link)'); process.exit(0); }
if (!t.includes('v1.443.0 project-setup')) { console.error('✗ ต้องรัน scripts/patch-project-setup.js ก่อน'); process.exit(1); }
const A = "chk(String(p.contractNo||'').trim(),'เลขที่สัญญา','main');";
const B = A + " chk(String(p.siteAddr||'').trim(),'ที่อยู่หน้างาน / ส่งของ','main');   /* " + MARK + " */";
const c = t.split(A).length - 1; if (c !== 1) { console.error('✗ ความครบของข้อมูล: หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); }
t = t.replace(A, B);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ setup-link: นับที่อยู่หน้างานในความครบของข้อมูล');
