#!/usr/bin/env node
/* =====================================================================
   v1.457.0 demo-tab — ปุ่ม ▶ DEMO ที่เดียวกันทุกหน้า (ขอบขวาของจอ) (ผู้บริหารสั่ง 21/11/2026: เปลี่ยน "วิธีใช้" เป็น Demo · ตำแหน่งเดียวกันทุกหน้า)
     node scripts/patch-demo-tab.js        (รันหลัง patch-demo-inapp.js · patch-guide.js)
   - หน้าที่มี Demo: บอกหน้าปัจจุบันให้ปุ่ม DEMO (window.__wcDemoKey) · ไม่แสดงปุ่ม "วิธีใช้หน้านี้" บนแถบบนแล้ว
   - หน้าที่ยังไม่มี Demo: ปุ่มคำแนะนำสั้นบนแถบบนเปลี่ยนชื่อเป็น "Demo"
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
const MARK = 'v1.457.0 demo-tab';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (demo-tab)'); process.exit(0); }
if (!t.includes('v1.454.0 demo-inapp')) { console.error('✗ ต้องรัน scripts/patch-demo-inapp.js ก่อน'); process.exit(1); }
const edits = [
  ['บอกหน้าปัจจุบันให้ปุ่ม DEMO', "    if(_dk&&S.me) return { ...none, pageTipHas:true, onPageTipToggle:()=>{ try{ window.WCDemo.open(_dk); }catch(e){} } };",
    "    if(typeof window!=='undefined') window.__wcDemoKey=(S.me&&_dk)||'';   /* " + MARK + ": ปุ่ม ▶ DEMO ขอบขวา (wcguide.js) */\n    if(_dk&&S.me) return none;"],
  ['ชื่อปุ่มแถบบน', '<span class="wc-t5" style="font-size:12.5px;font-weight:700;color:#8A5E14;white-space:nowrap">วิธีใช้หน้านี้</span>',
    '<span class="wc-t5" style="font-size:12.5px;font-weight:700;color:#8A5E14;white-space:nowrap">Demo</span>'],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ demo-tab: ' + edits.length + ' จุด');
