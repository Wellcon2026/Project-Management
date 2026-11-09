#!/usr/bin/env node
/* =====================================================================
   เพิ่มเมนู "Layboard · Presentation" (หน้าแยก /layboard/ — คัดลอกด้วย scripts/sync-layboard.js) เข้า Wellcon PM
     node scripts/patch-layboard-menu.js      (รันหลัง patch-site-issues.js)
   - เมนูหน้าโครงการ (กลุ่ม แบบ & วัสดุ ต่อจาก SketchUp) · ปุ่มบนหน้าแรก ออกแบบ / หน้างาน (Super Admin เห็นทุกเมนูอยู่แล้ว)
   - กดแล้วเปิด /layboard/index.html?pid=<id> (+ &env=staging) — แต่ละโครงการมีพื้นที่ Layboard แยกกัน
   - เพิ่ม Site Issues เข้ากลุ่ม "งานหน้าไซต์" ของเมนูมาตรฐานด้วย
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
if (t.includes('_layOpen(')) { console.log('✓ มีเมนู Layboard อยู่แล้ว ไม่ต้องแก้'); process.exit(0); }
const ICON = 'M3 4h18v12H3zM12 16v4M8 20h8M7 8h5M7 12h9';
const E = [
  ['เมนูหน้าโครงการ', "['skp','SketchUp Design (3D)'],", (a) => a + "['lay','Layboard · Presentation'],"],
  ['ลำดับเมนู (ต่อจาก SketchUp)', "skp:'dwg',", (a) => a + " lay:'skp',"],
  ['กดเมนู → เปิด Layboard', "if(k==='issues'){ this._issOpen(_pdPid); return; }", (a) => a + " if(k==='lay'){ this._layOpen(_pdPid); return; }"],
  ['ปุ่มหน้าแรก → เปิด Layboard', " if(k==='issues'){ this._issOpen(pid); return; }", (a) => a + " if(k==='lay'){ this._layOpen(pid); return; }"],
  ['เมธอดเปิด Layboard', "  _issOpen(pid){", (a) => "// v1.366.0 Layboard · Presentation — /layboard/ (ฐานข้อมูล PM ตาราง layboard_kv · แยกพื้นที่ตามโครงการ)\n  _layOpen(pid){ if(!pid) return; try{ window.location.href='/layboard/index.html?pid='+encodeURIComponent(pid)+(this.IS_STAGING()?'&env=staging':''); }catch(e){} }\n" + a],
  ['หมวดสีเมนู', "skp:'people',", (a) => a + " lay:'people',"],
  ['ไอคอน', "issues:'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zM12 6v4M12 13h.01',", (a) => a + " lay:'" + ICON + "',"],
  ['คำอธิบายปุ่ม', "issues:'ปักหมุดปัญหาบนแบบ · แท็กคนเกี่ยวข้อง · ติดตามคำตอบ',", (a) => a + " lay:'บอร์ดนำเสนองาน · Mood / Material board · เล่ม A4',"],
  ['กลุ่มเมนู แบบ & วัสดุ', "skp:'แบบ & วัสดุ',", (a) => a + " lay:'แบบ & วัสดุ',"],
  ['กลุ่มเมนู งานหน้าไซต์ (Site Issues)', "qc:'งานหน้าไซต์',", (a) => a + " issues:'งานหน้าไซต์',"],
  ['ปุ่มตั้งต้น ออกแบบ', "const DES=['dhome','tab:dwg','tab:skp',", (a) => a + "'tab:lay',"],
  ['ปุ่มตั้งต้น หน้างาน', "'tab:delay','tab:handover'];", () => "'tab:delay','tab:handover','tab:lay'];"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่มเมนู "Layboard · Presentation" ใน PM แล้ว');
