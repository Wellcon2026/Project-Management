#!/usr/bin/env node
/* =====================================================================
   v1.454.0 demo-inapp — วิธีใช้ทีละขั้น อยู่ "ในหน้าใช้งาน" แทนปุ่มบนการ์ด (ผู้บริหารสั่ง 21/11/2026: ปุ่มบนการ์ดดูรก)
     node scripts/patch-demo-inapp.js        (รันหลัง patch-feature-demo.js)
   - ลบปุ่ม "▶ ดู Demo วิธีใช้" ออกจากการ์ดหน้าแรก
   - ปุ่ม "? วิธีใช้หน้านี้" (หัวหน้าเดิม) → หน้าที่มี Demo เปิดสาธิตทีละขั้น (wcdemo.js) · หน้าที่ไม่มี Demo ใช้คำแนะนำสั้นแบบเดิม
   - แอปแยก (Quotation Maker · ใบขอซื้อ · Takeoff · ราคากลาง · PDF · Photo · Layboard) / Notes / Setup มีปุ่ม ? วิธีใช้ ที่หัวหน้าของตัวเอง
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
const MARK = 'v1.454.0 demo-inapp';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (demo-inapp)'); process.exit(0); }
if (!t.includes('v1.451.0 feature-demo')) { console.error('✗ ต้องรัน scripts/patch-feature-demo.js ก่อน'); process.exit(1); }
const edits = [
  ['ลบปุ่มบนการ์ด', '<span class="wcdemo-b" role="button" tabindex="0" title="ดูวิธีใช้ทีละขั้น — ไม่เล่นเอง กดถัดไปเอง" data-demo="{{ t.key }}" data-has="{{ t.demo }}">ดู Demo วิธีใช้</span>', '<!-- ' + MARK + ': วิธีใช้อยู่ในหน้าใช้งาน -->'],
  ['ปุ่ม ? วิธีใช้หน้านี้ → Demo', '    if(!t||!S.me) return none;',
    "    const _dk=(()=>{ const sc=S.screen; const k=inProj?('tab:'+(S.pdTab||'overview')):(sc==='calendar'?'tab:cal':sc==='subcon'?'tab:subcon':sc==='memo'?'tab:memo':('nav:'+sc)); return (typeof window!=='undefined'&&window.WCDemo&&window.WCDemo.has(k))?k:''; })();   /* " + MARK + " */\n"
    + "    if(_dk&&S.me) return { ...none, pageTipHas:true, onPageTipToggle:()=>{ try{ window.WCDemo.open(_dk); }catch(e){} } };\n    if(!t||!S.me) return none;"],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ demo-inapp: ' + edits.length + ' จุด');
