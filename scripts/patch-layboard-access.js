#!/usr/bin/env node
/* =====================================================================
   Layboard · Presentation — เปิดสิทธิ์รายคนได้ (สวิตช์ในหน้าจัดการผู้ใช้ เหมือน ผู้ช่วย AI / Level Gate)
     node scripts/patch-layboard-access.js      (รันหลัง patch-layboard-menu.js)
   - ค่าเริ่มต้นเปิด: Super Admin · Director · PM / PM Manager · Site Manager · หัวหน้าช่าง · Designer · Design Manager
   - ตำแหน่งอื่น (QS · จัดซื้อ · บัญชี · ธุรการ · จป. ฯลฯ) — Super Admin เปิดรายคนได้ที่หน้าจัดการผู้ใช้ → ใช้ได้ทันที
   - เปิดสิทธิ์แล้ว: เห็นเมนูในโครงการ + การ์ดบนหน้าแรกของฉันต่อท้ายให้อัตโนมัติ · ปิดสิทธิ์: ซ่อนทั้งเมนูและการ์ด (หน้า /layboard/ ก็เข้าไม่ได้)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
if (t.includes('_LAY_DEF(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (สิทธิ์ Layboard รายคน)'); process.exit(0); }
const E = [
  ['สวิตช์ในหน้าจัดการผู้ใช้', "{ key:'level', label:'Level Gate',", (a) => "{ key:'lay',   label:'Layboard · Presentation', note:'บอร์ดนำเสนองานในโครงการ · ค่าเริ่มต้นเปิด: ผู้บริหาร · PM · Site · Designer' },\n    " + a],
  ['ค่าเริ่มต้นตามตำแหน่ง', "if(key==='rec') return a.roleKey==='superadmin';", (a) => a + "\n    if(key==='lay') return this._LAY_DEF().indexOf(a.roleKey)>=0;   // v1.366.2 layboard-access"],
  ['รายชื่อตำแหน่งค่าเริ่มต้น', "  featDefault(key, a){", (a) => "  _LAY_DEF(){ return ['superadmin','director','pm','pm_mgr','sitemgr','site','designer','design_mgr']; }\n" + a],
  ['เมนูในโครงการตามสิทธิ์', "['lay','Layboard · Presentation'],", () => "...(this.featOn('lay')?[['lay','Layboard · Presentation']]:[]),"],
  ['เปิดหน้า Layboard ตามสิทธิ์', "_layOpen(pid){ if(!pid) return; this._pmHandoff();", () => "_layOpen(pid){ if(!pid) return; if(!this.featOn('lay')){ this.showToast('ยังไม่ได้เปิดสิทธิ์ Layboard ให้บัญชีนี้ — แจ้ง Super Admin'); return; } this._pmHandoff();"],
  ['การ์ดหน้าแรกต่อท้ายเมื่อเปิดสิทธิ์', "let list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';", (a) => a + "\n    if(!isSuper && this.featOn('lay') && list.length && list.indexOf('tab:lay')<0) list=[...list,'tab:lay'];   // v1.366.2 layboard-access"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Layboard: เปิดสิทธิ์รายคนได้ที่หน้าจัดการผู้ใช้');
