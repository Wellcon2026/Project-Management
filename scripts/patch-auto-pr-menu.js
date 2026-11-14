#!/usr/bin/env node
/* =====================================================================
   v1.394.0 auto-pr-menu — เมนู / การ์ด "Auto PR · ใบขอซื้อ" ใน Wellcon PM → เปิดหน้าแยก /auto-pr.html?pid=<id>
     node scripts/patch-auto-pr-menu.js
   1) หน้าในโครงการ: เมนู "Auto PR · ใบขอซื้อ" (ก่อนเมนู ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)) — กดแล้วเปิด auto-pr.html (แท็บเดิม)
   2) การ์ดหน้าแรก: ชุดเริ่มต้นของ Site Manager · หัวหน้าช่าง · PM มี "Auto PR · ใบขอซื้อ" (ต่อจาก PR Mango)
      — ตำแหน่ง / คนที่ตั้งการ์ดเองแล้วไม่เปลี่ยน (Admin เพิ่มได้ที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน)
   3) ปิดทั้งระบบได้ที่ ตั้งค่าระบบ → ฟังก์ชันทั้งระบบ (เหมือนหน้าอื่น)
   - ไม่ต้องรัน SQL (ข้อมูล app_state 'autoPR') · รันซ้ำได้ ไม่ซ้อน · รันหลัง patch-card-admin.js
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
const MARK = 'v1.394.0 auto-pr-menu';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เมนู Auto PR)'); process.exit(0); }

const R = [
  ['เมนูในโครงการ', "['mango','ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)']", "['apr','Auto PR · ใบขอซื้อ'],['mango','ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)']"],
  ['เปิดหน้าแยก', "  _qmOpen(pid){",
   "  _aprOpen(pid){ if(!pid) return; try{ window.location.href='/auto-pr.html?pid='+encodeURIComponent(pid)+(this.IS_STAGING()?'&env=staging':''); }catch(e){} }   // " + MARK + "\n  _qmOpen(pid){"],
  ['การ์ด → เปิดหน้าแยก', "if(k==='qm'){ this._qmOpen(pid); return; }", "if(k==='apr'){ this._aprOpen(pid); return; } if(k==='qm'){ this._qmOpen(pid); return; }"],
  ['เมนู → เปิดหน้าแยก', "if(k==='qm'){ this._qmOpen(_pdPid); return; }", "if(k==='apr'){ this._aprOpen(_pdPid); return; } if(k==='qm'){ this._qmOpen(_pdPid); return; }"],
  ['หมวดสี', "qm:'ops', rfi:'ops'", "qm:'ops', apr:'ops', rfi:'ops'"],
  ['คำอธิบายการ์ด', "const SUB={ qc:", "const SUB={ apr:'ใบขอซื้อกรอกให้อัตโนมัติ · พิมพ์ / ส่ง LINE', qc:"],
  ['การ์ดเริ่มต้น: Site Manager', "const SM=['tab:daily','tab:qc','tab:mango',", "const SM=['tab:daily','tab:qc','tab:mango','tab:apr',"],
  ['การ์ดเริ่มต้น: หัวหน้าช่าง', "const SITE=['tab:daily','tab:qc','tab:dwg','tab:plan','tab:mango',", "const SITE=['tab:daily','tab:qc','tab:dwg','tab:plan','tab:mango','tab:apr',"],
  ['การ์ดเริ่มต้น: PM', "'tab:delay','tab:changes','tab:mango','tab:rfi'", "'tab:delay','tab:changes','tab:mango','tab:apr','tab:rfi'"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เมนู Auto PR: แก้ ' + R.length + ' จุด');
