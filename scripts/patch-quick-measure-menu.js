#!/usr/bin/env node
/* =====================================================================
   เพิ่มเมนู "วัดพื้นที่ด่วน (มือถือ)" เข้า index.html ของ Wellcon PM (ไฟล์ bundle จาก canvas)
   - แก้เฉพาะข้อความ 8 จุดในหน้า (เมนูหน้าโครงการ + ไอคอน + ปุ่มหน้าแรก Site) ไม่แตะ login / accounts / role
   - รันซ้ำได้: ถ้ามีเมนูอยู่แล้วจะไม่ทำอะไร · ถ้าหาจุดที่ต้องแก้ไม่เจอ/เจอหลายจุด จะหยุดโดยไม่เขียนไฟล์
   - ใช้หลังอัปโหลด index.html ใหม่จาก canvas (ถ้า canvas ยังไม่มีเมนูนี้):  node scripts/patch-quick-measure-menu.js
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
if (t.includes('_qmOpen(')) { console.log('✓ มีเมนูวัดพื้นที่ด่วนอยู่แล้ว ไม่ต้องแก้'); process.exit(0); }

const EDITS = [
  ['เมนูหน้าโครงการ', "['takeoff','Takeoff · ถอดปริมาณ & PR'],", "['takeoff','Takeoff · ถอดปริมาณ & PR'],['qm','วัดพื้นที่ด่วน (มือถือ)'],"],
  ['กดเมนู → เปิดหน้า Quick Measure', "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{", "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{ if(k==='qm'){ this._qmOpen(_pdPid); return; }"],
  ['ลำดับเมนู (ต่อจาก Takeoff)', "const after={ takeoff:'daily',", "const after={ takeoff:'daily', qm:'takeoff',"],
  ['หมวดสีเมนู', "daily:'ops', takeoff:'ops', rfi:'ops'", "daily:'ops', takeoff:'ops', qm:'ops', rfi:'ops'"],
  ['ไอคอน', "takeoff:'M2 20h20M5 20V9l7-5 7 5v11M9 20v-6h6v6',", "takeoff:'M2 20h20M5 20V9l7-5 7 5v11M9 20v-6h6v6', qm:'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',"],
  ['คำอธิบายปุ่ม', "takeoff:'วัดพื้นที่ / ความยาว / นับจำนวน → เปิด PR',", "takeoff:'วัดพื้นที่ / ความยาว / นับจำนวน → เปิด PR', qm:'มือถือ · วัดห้องบนแบบของ QS → ส่งให้ QS ตรวจ',"],
  ['ปุ่มหน้าแรก → เปิดหน้า Quick Measure', "_openTab(pid,k){ ", "_qmOpen(pid){ if(!pid) return; try{ window.location.href='/quick-measure.html?pid='+encodeURIComponent(pid)+(this.IS_STAGING()?'&env=staging':''); }catch(e){} }\n  _openTab(pid,k){ if(k==='qm'){ this._qmOpen(pid); return; } "],
  ['ปุ่มตั้งต้นหน้าแรก Site', "const SITE=['tab:qc','tab:takeoff',", "const SITE=['tab:qc','tab:takeoff','tab:qm',"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b);
  console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่มเมนู "วัดพื้นที่ด่วน (มือถือ)" ใน index.html แล้ว');
