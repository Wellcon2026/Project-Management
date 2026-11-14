#!/usr/bin/env node
/* =====================================================================
   v1.390.0 pd-compact — หน้า Project Management (ภาพรวมโครงการ): ส่วนหัวสีเข้ม กะทัดรัด ใช้ง่ายขึ้น
     node scripts/patch-pd-compact.js        (รันต่อจาก patch-pd-short.js)
   ผู้บริหารสั่ง: ข้อมูลโครงการใหญ่เกินไป — ทำให้กะทัดรัด ใช้งานง่าย
   1) ใช้เต็มความกว้าง: คอลัมน์ตามขนาดจอ (≥1100px = 3 คอลัมน์ · ≥760px = 2 · มือถือ = 1)
      เดิม auto-fit + แถว "1 / -1" ทำให้เกิดคอลัมน์ว่างครึ่งจอขวา
   2) ทีมงาน: เริ่มต้นพับเป็นแถวรูปโปรไฟล์ (กดดูทีม) · "ดูเพิ่ม" (คาดการณ์วันเสร็จ · ขั้นตอนงาน) เริ่มต้นพับ
      การเงิน: จอคอมเริ่มเปิด / มือถือเริ่มพับ · จำค่าที่ผู้ใช้เลือกในเครื่อง (localStorage 'wellcon_pm_pdx')
   3) ตัวอักษร / ระยะห่าง เล็กลง: ชื่อโครงการ 30→23px · ระยะขอบ 20/24→14/18 · แถบความคืบหน้า 8→6px · ตัวเลขการ์ด 17→15px
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · ไม่ต้องรัน SQL
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
const MARK = 'v1.390.0 pd-compact';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้า Project Management กะทัดรัด)'); process.exit(0); }
if (!t.includes('_pdx(S')) { console.error('✗ ต้องรัน scripts/patch-pd-short.js ก่อน'); process.exit(1); }

// ---------- โค้ด: _pdx ----------
const R = [
  ['_pdx: ค่าเริ่มต้น + จำในเครื่อง + คอลัมน์',
   "  _pdx(S, defs, tabs){ const mob=(S.vw||1440)<860; const g=(k)=>S[k]==null?!mob:!!S[k];",
   "  _pdx(S, defs, tabs){ const vw=S.vw||1440, mob=vw<860;   // " + MARK + ": จำค่าพับ/เปิดในเครื่อง · คอลัมน์ตามขนาดจอ\n" +
   "    let LS={}; try{ LS=JSON.parse(localStorage.getItem('wellcon_pm_pdx')||'{}')||{}; }catch(e){}\n" +
   "    const g=(k,d)=>S[k]!=null?!!S[k]:(LS[k]!=null?!!LS[k]:d);\n" +
   "    const tg=(k,v)=>{ try{ localStorage.setItem('wellcon_pm_pdx', JSON.stringify({ ...LS, [k]:v })); }catch(e){} this.setState({ [k]:v }); };\n" +
   "    const heroCols=vw>=1100?'minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)':(vw>=760?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)');"],
  ['_pdx: พับทีม / ดูเพิ่ม เป็นค่าเริ่มต้น',
   "    const T=g('pdxTeam'), M=g('pdxMore'), F=g('pdxMoney');",
   "    const T=g('pdxTeam',false), M=g('pdxMore',false), F=g('pdxMoney',!mob);"],
  ['_pdx: ทีม', "onTeam:()=>this.setState({ pdxTeam:!T }),", "onTeam:()=>tg('pdxTeam',!T), heroCols,"],
  ['_pdx: ดูเพิ่ม', "onMore:()=>this.setState({ pdxMore:!M }),", "onMore:()=>tg('pdxMore',!M),"],
  ['_pdx: การเงิน', "onMoney:()=>this.setState({ pdxMoney:!F })", "onMoney:()=>tg('pdxMoney',!F)"],
];

// ---------- หน้าจอ: เฉพาะส่วนหัวสีเข้มของหน้าภาพรวม ----------
const HS = '<sc-if value="{{ pdTabOverview }}" hint-placeholder-val="{{ true }}">\n        <div style="background:#1C1B18;border-radius:22px;';
const HE = '{{ pvx.on_forms }}';
const V = [
  ['กล่องหลัก: คอลัมน์ + ระยะ',
   '<div style="background:#1C1B18;border-radius:22px;padding:20px 24px;margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:22px;align-items:start">',
   '<div style="background:#1C1B18;border-radius:18px;padding:14px 18px;margin-bottom:12px;display:grid;grid-template-columns:{{ pdx.heroCols }};gap:14px 20px;align-items:start">', 1],
  ['ชื่อโครงการ', 'font-size:clamp(22px,3vw,30px);font-weight:600;color:#F4EFE6;line-height:1.12', 'font-size:clamp(18px,1.9vw,23px);font-weight:600;color:#F4EFE6;line-height:1.15', 1],
  ['ลูกค้า · วันที่', '<div style="font-size:11.5px;color:#8E876F;margin-top:6px">{{ pd.client }}', '<div style="font-size:11px;color:#8E876F;margin-top:3px">{{ pd.client }}', 1],
  ['ปุ่มลัด: ระยะบน', 'overflow-x:auto;margin-top:10px;padding-bottom:3px', 'overflow-x:auto;margin-top:8px;padding-bottom:3px', 1],
  ['ปุ่มโน้ต / Look-ahead / อัลบั้ม: ระยะบน', 'margin-top:10px;border:1px solid #3A3730;background:#26241F;border-radius:999px;padding:5px 12px', 'margin-top:7px;border:1px solid #3A3730;background:#26241F;border-radius:999px;padding:4px 11px', 1],
  ['ปุ่ม Look-ahead: ระยะบน', 'margin-top:10px;margin-left:6px;border:1px solid #3A3730;background:#26241F;border-radius:999px;padding:5px 12px', 'margin-top:7px;margin-left:6px;border:1px solid #3A3730;background:#26241F;border-radius:999px;padding:4px 11px', 1],
  ['ปุ่มอัลบั้ม: ระยะบน', 'display:inline-flex;align-items:center;margin-top:10px;margin-left:6px;border:1px solid #3A3730', 'display:inline-flex;align-items:center;margin-top:7px;margin-left:6px;border:1px solid #3A3730', 1],
  ['หัวทีมงาน: ระยะ', 'margin:16px 0 9px;padding-top:14px;border-top:1px solid #2E2C27', 'margin:11px 0 7px;padding-top:10px;border-top:1px solid #2E2C27', 1],
  ['เส้นแบ่งคอลัมน์', 'border-left:1px solid #2E2C27;padding-left:22px', 'border-left:1px solid #2E2C27;padding-left:18px', 2],
  ['แถบความคืบหน้า: บางลง', 'height:8px;border-radius:4px;background:rgba(255,255,255,.12)', 'height:6px;border-radius:3px;background:rgba(255,255,255,.12)', 4],
  ['ตัวเลขเปอร์เซ็นต์ความคืบหน้า', 'font-size:15px;font-weight:700;color:', 'font-size:13.5px;font-weight:700;color:', 4],
  ['มูลค่างาน', 'font-size:clamp(19px,2.4vw,25px);font-weight:700;color:#F4EFE6', 'font-size:clamp(17px,1.8vw,21px);font-weight:700;color:#F4EFE6', 1],
  ['ปุ่มดูเพิ่ม: ระยะ', 'margin-top:12px;border:1px dashed #4A463C;background:transparent;color:#C9A961;border-radius:10px;padding:7px 10px', 'margin-top:9px;border:1px dashed #4A463C;background:transparent;color:#C9A961;border-radius:10px;padding:5px 10px', 2],
  ['การ์ดตัวเลข: ขนาด', 'background:#292722;border-radius:13px;padding:10px 12px;min-width:0;cursor:pointer', 'background:#292722;border-radius:11px;padding:8px 10px;min-width:0;cursor:pointer', 1],
  ['การ์ดตัวเลข: ตัวเลข', '<div class="num" style="font-size:17px;font-weight:700;color:#F4EFE6;margin-top:3px;white-space:nowrap">{{ s.value }}</div>', '<div class="num" style="font-size:15px;font-weight:700;color:#F4EFE6;margin-top:2px;white-space:nowrap">{{ s.value }}</div>', 1],
];

for (const [name, a] of R) {
  const c = t.split(a).length - 1;
  if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); }
}
const s0 = t.indexOf(HS), s1 = s0 < 0 ? -1 : t.indexOf(HE, s0);
if (t.split(HS).length !== 2 || s1 < 0) { console.error('✗ หาส่วนหัวของหน้าภาพรวมไม่เจอ — ไม่แก้อะไรเลย'); process.exit(1); }
let sec = t.slice(s0, s1);
for (const [name, a, , n] of V) {
  const c = sec.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, a, b] of V) sec = sec.split(a).join(b);
t = t.slice(0, s0) + sec + t.slice(s1);
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้า Project Management กะทัดรัด: แก้ ' + (R.length + V.length) + ' จุด');
