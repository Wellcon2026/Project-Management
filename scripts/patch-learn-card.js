#!/usr/bin/env node
/* =====================================================================
   v1.460.0 learn-card — Learning Center เป็นการ์ดฟังก์ชันแยก (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-learn-card.js        (รันหลัง patch-demo-center.js)
   - "ไม่เอาเข้ามาเป็น main หลักในหน้าทำงาน · ใช้แค่หน้า demo พอแล้ว" → เอาแถบ Demo Center ออกจาก My Space / Training
   - "learning center ให้ไปเป็นอีก feature นึง ที่ admin สามารถเปิดปิด card ได้"
     → การ์ด Learning Center ใน My Space (ข้าง Notes) · สวิตช์ 'learn' ในรายการฟังก์ชัน (ตั้งค่าระบบ → การ์ด & ฟังก์ชัน)
       ปิดได้ทั้งระบบ / ตามตำแหน่ง / รายคน (featOn · ค่าเริ่มต้นเปิดให้ทุกคน)
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
const MARK = 'v1.460.0 learn-card';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (learn-card)'); process.exit(0); }
if (!t.includes('v1.459.0 demo-center')) { console.error('✗ ต้องรัน scripts/patch-demo-center.js ก่อน'); process.exit(1); }
const one = (name, a, b) => { const n = t.split(a).length - 1; if (n !== 1) { console.error('✗ ' + name + ': เจอ ' + n + ' ที่ (ต้องเจอ 1)'); process.exit(1); } t = t.replace(a, () => b); };
// 1) เอาแถบออกจาก My Space / Training
one('แถบ My Space', '\n          <div data-wh-host="space" style="margin-top:14px"><!-- v1.459.0 demo-center --></div>', '');
one('แถบ Training', '<div data-wh-host="training"><!-- v1.459.0 demo-center --></div>\n        ', '');
// 2) สวิตช์ฟังก์ชัน (ทั้งระบบ / ตำแหน่ง / รายคน)
const F0 = "    { key:'training', label:'Wellcon Training', note:'หลักสูตรอบรม Site Manager · ติดตามความคืบหน้ารายคน · เปิดให้ทุกคนเป็นค่าเริ่มต้น' },";
one('รายการฟังก์ชัน', F0, F0 + "\n    { key:'learn', label:'Learning Center · ศูนย์เรียนรู้', note:'การ์ด Learning Center — เส้นทางเรียน Demo ตามตำแหน่ง · โหมดฝึก · ความคืบหน้าทีม · เปิดให้ทุกคนเป็นค่าเริ่มต้น' },   /* " + MARK + " */");
// 3) การ์ดใน My Space (ข้าง Notes)
const T0 = '  _noteTile(I, CT){';
one('การ์ด', T0, "  _learnTile(I, CT){ if(!this.featOn('learn')||!(this.state.me||{}).email||typeof window==='undefined'||!window.WCHub) return []; const c=CT.home||{};   /* " + MARK + " */\n"
  + "    return [{ key:'nav:learn', label:'Learning Center · ศูนย์เรียนรู้', sub:'เรียน Demo ตามตำแหน่ง · กดแล้วพาไปหน้าจริง จูงมือทีละขั้น', path:'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6', c:c.c, d:c.d, needP:false, grp:'เมนู', run:()=>{ try{ window.WCHub.open('path'); }catch(e){} } }]; }\n" + T0);
one('รวมการ์ด', 'const tiles0=[...this._noteTile(I,CT), ', 'const tiles0=[...this._noteTile(I,CT), ...this._learnTile(I,CT), ');
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ learn-card: เอาแถบออก · การ์ด Learning Center · สวิตช์ learn');
