#!/usr/bin/env node
/* =====================================================================
   v1.451.0 feature-demo — ปุ่ม "▶ ดู Demo วิธีใช้" บนการ์ดทุกฟังก์ชัน (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-feature-demo.js        (รันหลัง patch-feature-titles.js)
   - โหลด wcdemo.js (WCDemo) · การ์ดที่มี Demo แสดงปุ่มเด่น (ปุ่มดำ ▶ ทอง) ที่ท้ายการ์ด
   - กดปุ่ม = เปิดหน้าสาธิต 7–10 ขั้น ไม่เล่นเอง · กดการ์ดส่วนอื่น = เข้าหน้าตามเดิม
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const DEMO_VER = '1.3.0';
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.451.0 feature-demo';
const verFix = () => { const re = /wcdemo\.js\?v=[0-9.]+/; const m = t.match(re); if (m && m[0] !== 'wcdemo.js?v=' + DEMO_VER) { t = t.replace(re, 'wcdemo.js?v=' + DEMO_VER); return true; } return false; };
if (t.includes(MARK)) { if (verFix()) { lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl)); console.log('✓ อัปเดตเวอร์ชัน wcdemo.js → ' + DEMO_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (feature-demo)'); process.exit(0); }
if (!t.includes('v1.448.0 en-title')) { console.error('✗ ต้องรัน scripts/patch-feature-titles.js ก่อน'); process.exit(1); }
const FNS = t.match(/<script src="\/wcfn\.js\?v=[0-9.]+"><\/script><!-- v1\.447\.0 feature-names -->/);
if (!FNS) { console.error('✗ หาแท็ก wcfn.js ไม่เจอ'); process.exit(1); }
const edits = [
  ['หัวหน้า: โหลด wcdemo.js', FNS[0], FNS[0] + '\n<script src="/wcdemo.js?v=' + DEMO_VER + '"></script><!-- ' + MARK + ' -->'],
  ['การ์ด: มี Demo ไหม', "ttl:this.FNT(t.key,t.label), th:this.FNTH(t.key),",
    "ttl:this.FNT(t.key,t.label), th:this.FNTH(t.key), demo:((typeof window!=='undefined'&&window.WCDemo&&window.WCDemo.has(t.key))?'1':''),   /* " + MARK + " */"],
  ['แม่แบบ: การ์ด (ตัวจับ)', 'class="wkt" style="display:flex;flex-direction:column;gap:10px;', 'class="wkt" data-demo-card="1" style="display:flex;flex-direction:column;gap:10px;'],
  ['แม่แบบ: ปุ่ม Demo', '<span style="font-size:11.5px;color:#8C877D;line-height:1.45;text-wrap:pretty">{{ t.sub }}</span>',
    '<span style="font-size:11.5px;color:#8C877D;line-height:1.45;text-wrap:pretty">{{ t.sub }}</span><span class="wcdemo-b" role="button" tabindex="0" title="ดูวิธีใช้ทีละขั้น — ไม่เล่นเอง กดถัดไปเอง" data-demo="{{ t.key }}" data-has="{{ t.demo }}">ดู Demo วิธีใช้</span>'],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ feature-demo: ' + edits.length + ' จุด · wcdemo.js?v=' + DEMO_VER);
