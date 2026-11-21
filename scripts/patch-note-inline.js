#!/usr/bin/env node
/* =====================================================================
   v1.449.0 note-inline — โน้ตทุกที่ใช้หน้าตาเดียวกัน (ผู้บริหารสั่ง 21/11/2026: "same data serve the user same function make them the same")
     node scripts/patch-note-inline.js        (รันหลัง patch-note-hub.js)
   - กระดานโน้ตเดิม 2 ที่ (หน้า Home "โน้ตงานสำคัญ · ทุกโครงการ" และ พื้นที่ทำงานของฉัน "โน้ต · ทุกโครงการ")
     → แทนด้วยช่อง <div data-wn-host> ที่ wcnote.js (1.4.0+) วางหน้า Notes · บันทึก · งานของฉัน ชุดเดียวกันลงไป
     (แท็บ ส่วนตัว / สาธารณะ / แท็กถึงฉัน / งานค้าง · การ์ด · การเรียงวันที่ · ตัวแก้ไข เหมือนกันทุกที่)
   - ข้อมูลชุดเดิม (app_state notes) — ไม่ย้าย / ไม่แปลงข้อมูล
   - window.__wnBridge = () => this._noteBridge()   (ให้ wcnote.js ใช้วางช่องอัตโนมัติ)
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
const MARK = 'v1.449.0 note-inline';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (note-inline)'); process.exit(0); }
if (!t.includes('v1.438.0 note-hub')) { console.error('✗ ต้องรัน scripts/patch-note-hub.js ก่อน'); process.exit(1); }
const divEnd = (s) => { const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m; while ((m = re.exec(t))) { if (m[0] === '</div>') { d--; if (d === 0) return m.index + 6; } else d++; } return -1; };
// กระดานโน้ต: [ชื่อ, จุดเริ่มกลุ่ม (sc-if), div ของกระดาน, ช่องใหม่]
const BOARDS = [
  ['หน้า Home · โน้ตงานสำคัญ', '<sc-if value="{{ exd.notesOpen }}"', '<div style="margin-top:16px;padding-top:15px;border-top:1px solid #ECE6DA">',
    '<div data-wn-host="home" data-wn-tab="proj" style="margin-top:16px"><!-- ' + MARK + ': หน้า Notes ชุดเดียวกัน (wcnote.js) --></div>'],
  ['พื้นที่ทำงานของฉัน · โน้ต', '<sc-if value="{{ nbShowNotes }}"', '<div style="background:#1C1B18;border-radius:18px;padding:16px 16px 18px;margin-bottom:16px">',
    '<div data-wn-host="space" style="margin-bottom:16px"><!-- ' + MARK + ': หน้า Notes ชุดเดียวกัน (wcnote.js) --></div>'],
];
const plan = [];
for (const [n, grp, div, host] of BOARDS) {
  const g = t.indexOf(grp); if (g < 0 || t.indexOf(grp, g + 1) >= 0) { console.error('✗ ' + n + ': หากลุ่มไม่เจอ / เจอหลายที่'); process.exit(1); }
  let s = -1, e = -1; for (let x = t.indexOf(div, g); x >= 0 && x - g < 12000; x = t.indexOf(div, x + 1)) { const y = divEnd(x); if (y > 0 && t.slice(x, y).includes('{{ hnPubItems }}')) { s = x; e = y; break; } }   // กลุ่มนี้มี div หน้าตาเดียวกันหลายอัน — เลือกอันที่เป็นกระดานโน้ต
  if (s < 0) { console.error('✗ ' + n + ': หากระดานโน้ตไม่เจอ'); process.exit(1); }
  const blk = t.slice(s, e);
  const hn = (blk.match(/\{\{ hn\w+ \}\}/g) || []).length;
  if (e < 0 || hn < 20 || !blk.includes('{{ hnPubItems }}') || !blk.includes('{{ hnPrivItems }}')) { console.error('✗ ' + n + ': ขอบเขตกระดานไม่ตรง (hn=' + hn + ')'); process.exit(1); }
  plan.push([s, e, host, n]);
}
plan.sort((a, b) => b[0] - a[0]).forEach(([s, e, host]) => { t = t.slice(0, s) + host + t.slice(e); });
const A = "onCmdOpen:()=>this.cmdOpen('go'),";
if (t.split(A).length !== 2) { console.error('✗ bridge: หาจุดแก้ไม่เจอ'); process.exit(1); }
t = t.replace(A, () => A + " _wnBr:((typeof window!=='undefined'&&!window.__wnBridge)?((window.__wnBridge=()=>this._noteBridge()),1):0),   /* " + MARK + " */");
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ note-inline: แทนกระดานโน้ต ' + plan.length + ' ที่ ด้วยหน้า Notes ชุดเดียวกัน · bridge');
