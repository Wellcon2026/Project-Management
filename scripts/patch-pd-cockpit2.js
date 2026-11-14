#!/usr/bin/env node
/* =====================================================================
   v1.392.0 pd-cockpit2 — Project Cockpit: ตัดส่วนที่ไม่ใช้ / จะไม่ถูกต้องเมื่อย้ายการติดตามงานไป Google Sheet
     node scripts/patch-pd-cockpit2.js        (รันต่อจาก patch-pd-cockpit.js)
   ผู้บริหารสั่ง 14/11/2026:
   1) เอาการ์ดฟังก์ชันหลัก (Site Work · รายงานประจำวัน · Claim …) ออก — ใช้เมนู "หน้าในโครงการ" แทน
   2) เอาการ์ด "งานเสร็จจริง" ออก — คำนวณจาก % แผนงานในแอป ซึ่งจะไม่ถูกอัปเดตเมื่อติดตามงานใน Google Sheet
   3) ตัวเลขที่ใช้ % แผนงานเดียวกันก็เอาออกด้วย:
      · การ์ดไทม์ไลน์: "เทียบแผนงาน: ช้า/เร็วกว่าแผน" → "คงเหลือ n วัน · ขั้นงาน" (% ไทม์ไลน์ใช้วันในสัญญา ยังถูกต้อง)
      · แผง 📊: เอา "คาดการณ์วันงานเสร็จ" ออก · เปลี่ยนชื่อเป็น "📊 ขั้นตอนงาน"
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.392.0 pd-cockpit2';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Cockpit: ตัดการ์ดฟังก์ชัน / งานเสร็จจริง / คาดการณ์)'); process.exit(0); }
if (!t.includes('v1.391.0 pd-cockpit')) { console.error('✗ ต้องรัน scripts/patch-pd-cockpit.js ก่อน'); process.exit(1); }
const die = (m) => { console.error('✗ ' + m + ' — ไม่แก้ไฟล์'); process.exit(1); };
const once = (a, name) => { const n = t.split(a).length - 1; if (n !== 1) die('จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1)'); return t.indexOf(a); };
const endOf = (i) => { const name = t.slice(i + 1).match(/^[\w-]+/)[0]; const re = new RegExp('<' + name + '\\b|</' + name + '>', 'g'); re.lastIndex = i + 1; let d = 1, m;
  while ((m = re.exec(t))) { d += m[0][1] === '/' ? -1 : 1; if (d === 0) return m.index + m[0].length; } die('หาแท็กปิดของ <' + name + '> ไม่เจอ'); };

// ตำแหน่งที่จะตัด (ตรวจครบก่อน แล้วตัดจากท้ายขึ้นมา)
const cuts = [];
{ const a = once('<sc-if value="{{ pdx.qHas }}" hint-placeholder-val="{{ true }}"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,142px),1fr));gap:7px">', 'การ์ดฟังก์ชันหลัก');
  let e = endOf(a); if (t[e] === '\n') e++; const ls = t.lastIndexOf('\n', a) + 1; cuts.push([t.slice(ls, a).trim() === '' ? ls : a, e]); }
{ const a = once('<div sc-camel-on-click="{{ pd.goPlan }}" title="ไปที่แผนงาน · ความคืบหน้า — {{ pd.workHint }}"', 'การ์ดงานเสร็จจริง'); cuts.push([a, endOf(a)]); }
{ const c0 = once('<!-- v1.391.0 pd-cockpit -->', 'Cockpit');
  const a = t.indexOf('<sc-if value="{{ pd.fcShow }}"', c0); if (a < 0) die('หาคาดการณ์วันเสร็จในแผง 📊 ไม่เจอ');
  if (t.indexOf('<sc-if value="{{ pd.fcShow }}"', a + 1) >= 0) die('พบคาดการณ์วันเสร็จมากกว่า 1 จุด'); cuts.push([a, endOf(a)]); }
const R = [
  ['การ์ดไทม์ไลน์: บรรทัดล่าง',
   '<div class="num" style="font-size:10px;font-weight:600;margin-top:6px;line-height:1.4;color:{{ pd.tlGapColor }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ pd.tlNote }}</div>',
   '<div class="num" style="font-size:10px;font-weight:600;margin-top:6px;line-height:1.4;color:{{ pd.contractLeftColor }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ pd.contractLeftLabel }} {{ pd.contractLeft }} · {{ pd.phase }}</div>'],
  ['แผง 📊: ชื่อ', "['prog','📊 คาดการณ์ & ขั้นตอนงาน']", "['prog','📊 ขั้นตอนงาน']"],
  ['เครื่องหมาย', '<!-- v1.391.0 pd-cockpit -->', '<!-- v1.391.0 pd-cockpit --><!-- ' + MARK + ': ตัดการ์ดฟังก์ชัน · งานเสร็จจริง · เทียบแผน · คาดการณ์ (ติดตามงานใน Google Sheet) -->'],
];
for (const [name, a] of R) once(a, name);
cuts.sort((x, y) => y[0] - x[0]).forEach(([a, b]) => { t = t.slice(0, a) + t.slice(b); });
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Cockpit: ตัด ' + cuts.length + ' ส่วน · แก้ ' + R.length + ' จุด');
