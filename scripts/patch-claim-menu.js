#!/usr/bin/env node
/* =====================================================================
   เพิ่มเมนู "Claim · เคลมความเสียหาย" (หน้าแยก claim.html) เข้า index.html ของ Wellcon PM
     node scripts/patch-claim-menu.js
   - เมนูหน้าโครงการ (ต่อจาก VO / SI / EOT) · ปุ่มบน "หน้างานของฉัน" (ค่าเริ่มต้นตำแหน่งหน้างาน) · ไอคอน · คำอธิบาย
   - กดแล้วเปิด /claim.html?pid=<id> (+ &env=staging)
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
if (t.includes('_claimOpen(')) { console.log('✓ มีเมนู Claim อยู่แล้ว ไม่ต้องแก้'); process.exit(0); }
const CLAIM_ICON = 'M12 2l8 4v6c0 5-3.4 9.3-8 10-4.6-.7-8-5-8-10V6zM12 8v5M12 16.5h.01';
const EDITS = [
  ['เมนูหน้าโครงการ', "['changes','VO / SI / EOT · งานเพิ่ม-ลด'],['delay',", "['changes','VO / SI / EOT · งานเพิ่ม-ลด'],['claim','Claim · เคลมความเสียหาย'],['delay',"],
  ['ลำดับเมนู (ต่อจาก VO / SI / EOT)', "const after={ takeoff:'daily', qm:'daily',", "const after={ takeoff:'daily', qm:'daily', claim:'changes',"],
  ['กดเมนู → เปิดหน้า Claim', "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{ if(k==='qm'){ this._qmOpen(_pdPid); return; }", "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{ if(k==='qm'){ this._qmOpen(_pdPid); return; } if(k==='claim'){ this._claimOpen(_pdPid); return; }"],
  ['ปุ่มหน้าแรก → เปิดหน้า Claim', "_openTab(pid,k){ if(k==='qm'){ this._qmOpen(pid); return; }", "_claimOpen(pid){ if(!pid) return; try{ window.location.href='/claim.html?pid='+encodeURIComponent(pid)+(this.IS_STAGING()?'&env=staging':''); }catch(e){} }\n  _openTab(pid,k){ if(k==='qm'){ this._qmOpen(pid); return; } if(k==='claim'){ this._claimOpen(pid); return; }"],
  ['หมวดสีเมนู', "spo:'fin', changes:'fin',", "spo:'fin', changes:'fin', claim:'fin',"],
  ['ไอคอน', "qm:'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',", "qm:'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', claim:'" + CLAIM_ICON + "',"],
  ['คำอธิบายปุ่ม', "qm:'วัดบนแบบ QS / แบบที่อัปโหลด · โน้ต · CSV → ส่ง QS ตรวจ',", "qm:'วัดบนแบบ QS / แบบที่อัปโหลด · โน้ต · CSV → ส่ง QS ตรวจ', claim:'งานเสียหายจากผู้อื่น · น้ำรั่ว · เจาะฝ้า → เคลมเงิน + วัน',"],
  ['ปุ่มตั้งต้นหน้าแรก Site', "'tab:changes','tab:delay','tab:handover'];", "'tab:changes','tab:claim','tab:delay','tab:handover'];"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่มเมนู "Claim · เคลมความเสียหาย" ใน index.html แล้ว');
