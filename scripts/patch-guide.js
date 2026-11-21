#!/usr/bin/env node
/* =====================================================================
   v1.456.0 guide — สอนแบบจูงมือบนหน้าจอจริง (ผู้บริหารสั่ง 21/11/2026 · ระยะ 1)
     node scripts/patch-guide.js        (รันหลัง patch-daily-redesign.js · patch-demo-inapp.js)
   - โหลด wcguide.js (WCGuide) · ปุ่ม "? วิธีใช้" เปิดการสอนแบบจูงมือเมื่อหน้านั้นมีบทสอน (ไม่มี → สรุปทีละขั้นแบบเดิม)
   - ใส่ "เครื่องหมาย" data-g ให้จุดที่บทสอน Daily Report ชี้: ปุ่มวันนี้ · ตัวเลข · 14 วัน · คนเข้างาน · ทางลัดงาน · งานที่ทำ · ปัญหา · รูป · ส่งออก
     (บทสอนชี้ด้วยเครื่องหมาย ไม่ผูกกับตำแหน่ง — ปรับหน้าตาแล้วไม่พัง · หาไม่เจอ = อธิบายกลางจอ ไม่ค้าง)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const GUIDE_VER = '1.5.5';
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.456.0 guide';
const verFix = () => { const re = /wcguide\.js\?v=[0-9.]+/; const m = t.match(re); if (m && m[0] !== 'wcguide.js?v=' + GUIDE_VER) { t = t.replace(re, 'wcguide.js?v=' + GUIDE_VER); return true; } return false; };
if (t.includes(MARK)) { if (verFix()) { lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl)); console.log('✓ อัปเดตเวอร์ชัน wcguide.js → ' + GUIDE_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (guide)'); process.exit(0); }
if (!t.includes('v1.455.0 daily-redesign')) { console.error('✗ ต้องรัน scripts/patch-daily-redesign.js ก่อน'); process.exit(1); }
// 1) โหลด wcguide.js หลัง wcdemo.js
const DS = t.match(/<script src="\/wcdemo\.js\?v=[0-9.]+"><\/script><!-- v1\.451\.0 feature-demo -->/);
if (!DS) { console.error('✗ หาแท็ก wcdemo.js ไม่เจอ'); process.exit(1); }
t = t.replace(DS[0], () => DS[0] + '\n<script src="/wcguide.js?v=' + GUIDE_VER + '"></script><!-- ' + MARK + ' -->');
// 2) เครื่องหมาย data-g ในหน้า Daily Report
const s0 = t.indexOf('<sc-if value="{{ pdTabDaily }}"'); if (s0 < 0) { console.error('✗ หาหน้า Daily Report ไม่เจอ'); process.exit(1); }
const end = (() => { const re = /<sc-if\b|<\/sc-if>/g; re.lastIndex = s0; let d = 0, m; while ((m = re.exec(t))) { if (m[0] === '</sc-if>') { d--; if (d === 0) return m.index; } else d++; } return -1; })();
const marks = [];   // [ตำแหน่งต้นแท็ก, ชื่อแท็ก, เครื่องหมาย]
const inR = (i) => i > s0 && i < end;
const all = (k) => { const a = []; let i = s0; while ((i = t.indexOf(k, i + 1)) >= 0 && i < end) a.push(i); return a; };
const tagAt = (pos, name) => { const i = t.lastIndexOf('<' + name, pos); return inR(i) ? i : -1; };
const need = (n, c, w) => { if (c !== w) { console.error('✗ ' + n + ': เจอ ' + c + ' ที่ (ต้องเจอ ' + w + ')'); process.exit(1); } };
let L;
L = all('sc-camel-on-click="{{ onDlToday }}"'); need('ปุ่มวันนี้', L.length, 2); L.forEach(p => marks.push([tagAt(p, 'button'), 'button', 'dl-today']));
L = all('grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">\n              <sc-for list="{{ dlStats }}"'); need('ตัวเลข', L.length, 1); marks.push([tagAt(L[0], 'div'), 'div', 'dl-stats']);
L = all('<sc-for list="{{ dlDays }}"'); need('14 วัน', L.length, 1); { const g = tagAt(L[0], 'div'); marks.push([t.lastIndexOf('<div', g - 1), 'div', 'dl-days']); }
L = all('<sc-for list="{{ r.crewRows }}"'); need('คนเข้างาน', L.length, 1); marks.push([tagAt(L[0], 'div'), 'div', 'dl-crew']);
L = all('<sc-for list="{{ r.workChips }}"'); need('ทางลัดงาน', L.length, 1); marks.push([tagAt(L[0], 'div'), 'div', 'dl-chips']);
L = all('sc-camel-on-change="{{ r.onWork }}"'); need('งานที่ทำ', L.length, 1); marks.push([tagAt(L[0], 'textarea'), 'textarea', 'dl-work']);
L = all('sc-camel-on-change="{{ r.onProblem }}"'); need('ปัญหา', L.length, 1); marks.push([tagAt(L[0], 'textarea'), 'textarea', 'dl-prob']);
L = all('sc-camel-on-change="{{ r.onPhotos }}"'); need('รูป', L.length, 1); marks.push([tagAt(L[0], 'label'), 'label', 'dl-photo']);
L = all('sc-camel-on-click="{{ r.onWord }}"'); need('ส่งออก', L.length, 1); marks.push([tagAt(tagAt(L[0], 'button'), 'div'), 'div', 'dl-export']);
for (const [p, n, g] of marks) if (p < 0 || t.slice(p, p + n.length + 1) !== '<' + n) { console.error('✗ เครื่องหมาย ' + g + ': หาแท็กไม่เจอ'); process.exit(1); }
marks.sort((a, b) => b[0] - a[0]).forEach(([p, n, g]) => { t = t.slice(0, p + n.length + 1) + ' data-g="' + g + '"' + t.slice(p + n.length + 1); });
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ guide: wcguide.js?v=' + GUIDE_VER + ' · เครื่องหมาย Daily Report ' + marks.length + ' จุด');
