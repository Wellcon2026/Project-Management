#!/usr/bin/env node
/* =====================================================================
   หน้าแรก (หน้างานของฉัน / หน้าทำงานของฉัน) ของทุกคน: ตัดการ์ด "Project Management" ออก → ใส่การ์ด "ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)" แทนที่ตำแหน่งเดิม
     node scripts/patch-work-pr.js        (รันต่อจาก patch-mango-link.js)
   - ทุกตำแหน่ง รวมรายการที่ Super Admin จัดไว้แล้ว (แปลงตอนแสดง · ไม่ซ้ำถ้ามีการ์ด Mango อยู่แล้ว) · การ์ด Project Management ไม่ขึ้นในแผงเพิ่มการ์ดอีก
   - ค่าตั้งต้นตำแหน่ง Director / Super Admin: tab:overview → tab:mango
   - เปลี่ยนชื่อเมนูเป็น "ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)" · หน้า Project Management ยังเปิดได้จากเมนูในโครงการ
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์
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
if (t.includes('WORK_PR v1.374.1')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (การ์ด PR แทน Project Management)'); process.exit(0); }
if (!t.includes('_mgOpen(')) { console.error('✗ ต้องรัน scripts/patch-mango-link.js ก่อน'); process.exit(1); }
const EDITS = [
  ['ชื่อเมนู', "['mango','Mango · ใบขอซื้อ / ใบสั่งจ้าง']", "['mango','ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)']"],
  ['หน้าแรก: แทนการ์ด Project Management', "    let list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';",
    "    let list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';\n    { const o=[]; list.forEach(k=>{ const v=k==='tab:overview'?'tab:mango':k; if(o.indexOf(v)<0) o.push(v); }); list=o; }   // WORK_PR v1.374.1 ผู้บริหารสั่ง: ตัดการ์ด Project Management · ใส่ PR (Mango) แทน — ทุกคน"],
  ['หน้าแรก: ไม่แสดงการ์ด Project Management', "    const info=(key)=>{\n      if(key==='dhome'){", "    const info=(key)=>{ if(key==='tab:overview') return null;\n      if(key==='dhome'){"],
  ['ค่าตั้งต้น Director', "const DIR=['tab:overview','tab:plan',", "const DIR=['tab:mango','tab:plan',"],
  ['ค่าตั้งต้น Super Admin', "superadmin:['tab:overview','tab:plan',", "superadmin:['tab:mango','tab:plan',"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าแรกทุกคน: การ์ด "ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)" แทน "Project Management"');
