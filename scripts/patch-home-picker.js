#!/usr/bin/env node
/* =====================================================================
   หน้า Home (เลือกโครงการ) — พาเข้าโครงการให้เร็วที่สุด · เลิกใช้กล่องดำ
     node scripts/patch-home-picker.js
   1) รายการโครงการ (การ์ด / ตาราง) ขึ้นเป็นอย่างแรก ใต้หัวข้อสั้น "เลือกโครงการ"
   2) เอาคำทักทาย + วงแหวน % + ตัวเลขในกล่องดำออก
   3) สรุปการเงิน + โน้ตงานสำคัญ ย้ายไปอยู่ใต้รายการโครงการ ในกล่องพื้นขาว (เปลี่ยนสีจากธีมดำเป็นธีมสว่าง)
   4) มีโครงการเดียว → เปิดโครงการให้อัตโนมัติ (ครั้งเดียวต่อการเปิดแอป · กด Home กลับมาหน้านี้ได้)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = '<!-- v1.364.1 home-picker -->';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้า Home เลือกโครงการ)'); process.exit(0); }
const die = (m) => { console.error('✗ ' + m + ' — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); };
const one = (s, a, from) => { const i = s.indexOf(a, from || 0); if (i < 0 || s.indexOf(a, i + 1) >= 0 && !from) die('หา "' + a.slice(0, 50) + '" ไม่เจอ/เจอหลายที่'); return i; };

// ---- ตำแหน่งบล็อก ----
const P0 = one(t, '<!-- ============ PROJECT PICKER · เลือกโครงการก่อน ============ -->');
const H = t.indexOf('<div style="background:#1C1B18;border-radius:clamp(14px,4vw,20px)', P0); if (H < 0 || H - P0 > 400) die('หากล่องดำไม่เจอ');
const FIN = t.indexOf('<sc-if value="{{ ppFinShow }}"', H); if (FIN < 0 || FIN - H > 6000) die('หาสรุปการเงินไม่เจอ');
const EMP = t.indexOf('<sc-if value="{{ ppEmpty }}"', FIN); if (EMP < 0 || EMP - FIN > 60000) die('หารายการโครงการไม่เจอ');
const CARD = t.indexOf('<sc-if value="{{ ppIsCard }}"', EMP); if (CARD < 0) die('หามุมมองการ์ดไม่เจอ');
const ENDK = '\n        </sc-if>\n      </sc-if>';
const END = t.indexOf(ENDK, CARD); if (END < 0 || END - CARD > 12000) die('หาจุดจบรายการโครงการไม่เจอ');
const endC = END + '\n        </sc-if>'.length;
const head = t.slice(0, H), gone = t.slice(H, FIN), B0 = t.slice(FIN, EMP), C = t.slice(EMP, endC), tail = t.slice(endC);
if (!/สวัสดี \{\{ ppHead\.name \}\}/.test(gone) || !/ppRings/.test(gone)) die('ส่วนคำทักทาย/วงแหวนไม่ตรงที่คาด');

// ---- เปลี่ยนสีธีมดำ → สว่าง เฉพาะสรุปการเงิน + โน้ต ----
let B = B0;
const SW = [
  ['border:1px solid #3A362E;background:#292722;color:#E9E1D2', 'border:1px solid #E4DED2;background:#fff;color:#2C2A25'],
  ['border:1px solid #3A362E;background:#292722;color:#F4EFE6', 'border:1px solid #E4DED2;background:#fff;color:#2C2A25'],
  ['background:#292722;border:1px solid #3A362E', 'background:#F7F3EA;border:1px solid #E4DED2'],
  ['background:#292722;border-radius:14px', 'background:#FAF7F1;border:1px solid #ECE6DA;border-radius:14px'],
  ['background:#1C1B18;border:1px solid #3A362E;border-', 'background:#FAF7F1;border:1px solid #ECE6DA;border-'],
  ['border:1px solid #3A362E;background:transparent;color:#9A938A', 'border:1px solid #E4DED2;background:transparent;color:#8C877D'],
  ['border:1px solid #3A362E;background:transparent;color:#C9A961', 'border:1px solid #E2CB92;background:transparent;color:#8A6D3B'],
  ['height:8px;background:#3A362E;', 'height:8px;background:#EFE8DB;'],
  ['border-top:1px solid #2E2C27', 'border-top:1px solid #ECE6DA'],
  ['font-weight:800;color:#F4EFE6">', 'font-weight:800;color:#1C1B18">'],
  ['color:#F5F0E6;', 'color:#1C1B18;'],
  ['color:#A99F8C', 'color:#6E695E'],
  ['color:#7A7360', 'color:#8C877D'],
  ['color:#7FB58A', 'color:#2E7D46'],
  ['background:#7FB58A', 'background:#2E7D46'],
];
SW.forEach(([a, b]) => { B = B.split(a).join(b); });
const left = (B.match(/#292722|#3A362E|#2E2C27|#F5F0E6/g) || []);
if (left.length) die('ยังเหลือสีธีมดำ ' + left.length + ' จุด (' + [...new Set(left)].join(', ') + ')');

const HEAD = MARK + '\n        <div style="display:flex;align-items:baseline;gap:6px 12px;flex-wrap:wrap;margin:2px 0 12px">'
  + '<div style="font-size:clamp(19px,5vw,24px);font-weight:700;color:#1C1B18;line-height:1.2">เลือกโครงการ</div>'
  + '<div style="font-size:12.5px;color:#8C877D">สวัสดี {{ ppHead.name }} · {{ ppHead.role }} · แตะโครงการเพื่อเริ่มทำงาน</div></div>\n        ';
const BOX = '\n        <div style="background:#fff;border:1px solid #ECE6DA;border-radius:clamp(14px,4vw,20px);padding:2px clamp(14px,4vw,24px) clamp(16px,4vw,24px);margin-top:clamp(18px,4vw,26px)">\n          ';
t = head + HEAD + C + BOX + B + tail;

// ---- มีโครงการเดียว → เปิดให้อัตโนมัติ ----
const A1 = "const isProjPicker = S.screen==='dashboard' && !pickedPid;";
const n1 = t.split(A1).length - 1; if (n1 !== 1) die('หาเงื่อนไขหน้าเลือกโครงการไม่เจอ');
t = t.replace(A1, () => A1 + "\n    if(isProjPicker && S.loggedIn && visProjects.length===1 && !this._ppAuto1){ this._ppAuto1=true; setTimeout(()=>this.pickProj(visProjects[0].id),0); }   // v1.364.1 home-picker: มีโครงการเดียว → เข้าโครงการเลย");

lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้า Home: รายการโครงการขึ้นก่อน · เลิกกล่องดำ · โน้ต/การเงินย้ายลงล่างพื้นขาว · โครงการเดียวเปิดอัตโนมัติ');
