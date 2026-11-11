#!/usr/bin/env node
/* =====================================================================
   เมนู "Mango · ใบขอซื้อ / ใบสั่งจ้าง" — ลิงก์เปิดหน้า Office Service ของ Mango ERP (แท็บใหม่)
     node scripts/patch-mango-link.js        (รันต่อจาก patch-dom-guard.js)
   - เมนูหน้าโครงการ (ต่อจาก Claim) · ปุ่มบนหน้าแรกของ Site / QS · ไอคอน · คำอธิบาย
   - เปิดเว็บ Mango ตรง (login ของ Mango เอง) — ไม่ฝัง (iframe) เพราะมือถือมักหลุด login
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
if (t.includes('_mgOpen(')) { console.log('✓ มีเมนู Mango อยู่แล้ว ไม่ต้องแก้'); process.exit(0); }
const URL_OF = 'https://wellcon-interior.mangoanywhere.com/production.anywhere/page/transaction/of/';
const ICON = 'M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h8.2a2 2 0 0 0 2-1.6L21 8H6M10 21h.01M18 21h.01';
const EDITS = [
  ['เมนูหน้าโครงการ', "['claim','Claim · เคลมความเสียหาย'],", "['claim','Claim · เคลมความเสียหาย'],['mango','Mango · ใบขอซื้อ / ใบสั่งจ้าง'],"],
  ['ลำดับเมนู (ต่อจาก Claim)', "const after={ takeoff:'daily', qm:'daily', claim:'changes',", "const after={ takeoff:'daily', qm:'daily', claim:'changes', mango:'claim',"],
  ['กดเมนู → เปิด Mango', "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{ if(k==='qm'){ this._qmOpen(_pdPid); return; }", "const pdTabs=pdTabDefs.map(([k,l])=>({ label:l, onPress:()=>{ if(k==='mango'){ this._mgOpen(); return; } if(k==='qm'){ this._qmOpen(_pdPid); return; }"],
  ['ปุ่มหน้าแรก → เปิด Mango', "_openTab(pid,k){ if(k==='qm'){ this._qmOpen(pid); return; }",
    "// v1.374.0 ลิงก์ Mango ERP (หน้า Office Service: ใบขอซื้อ · สถานะใบขอซื้อ · ใบสั่งจ้าง) · แท็บใหม่ · login ของ Mango เอง\n  _mgOpen(){ const u='" + URL_OF + "'; let w=null; try{ w=window.open(u,'_blank','noopener'); }catch(e){} if(!w){ try{ window.location.href=u; }catch(e){} } }\n  _openTab(pid,k){ if(k==='mango'){ this._mgOpen(); return; } if(k==='qm'){ this._qmOpen(pid); return; }"],
  ['หมวดสีเมนู', "changes:'fin', claim:'fin',", "changes:'fin', claim:'fin', mango:'fin',"],
  ['ไอคอน', "claim:'M12 2l8 4v6c0 5-3.4 9.3-8 10-4.6-.7-8-5-8-10V6zM12 8v5M12 16.5h.01',", "claim:'M12 2l8 4v6c0 5-3.4 9.3-8 10-4.6-.7-8-5-8-10V6zM12 8v5M12 16.5h.01', mango:'" + ICON + "',"],
  ['คำอธิบายปุ่ม', "claim:'งานเสียหายจากผู้อื่น · น้ำรั่ว · เจาะฝ้า → เคลมเงิน + วัน',", "claim:'งานเสียหายจากผู้อื่น · น้ำรั่ว · เจาะฝ้า → เคลมเงิน + วัน', mango:'เปิด Mango ERP · ใบขอซื้อ (PR) · สถานะ PR · ใบสั่งจ้าง (WO)',"],
  ['ปุ่มตั้งต้นหน้าแรก Site', "'tab:changes','tab:claim','tab:delay','tab:handover','tab:lay'];", "'tab:changes','tab:claim','tab:mango','tab:delay','tab:handover','tab:lay'];"],
  ['ปุ่มตั้งต้นหน้าแรก QS', "const QS=['tab:qm','tab:aw','tab:changes','tab:claim',", "const QS=['tab:qm','tab:aw','tab:changes','tab:claim','tab:mango',"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่มเมนู "Mango · ใบขอซื้อ / ใบสั่งจ้าง" ใน index.html แล้ว');
