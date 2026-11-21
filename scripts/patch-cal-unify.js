#!/usr/bin/env node
/* =====================================================================
   v1.452.0 cal-unify — ข้อ 2: ปฏิทิน 3 สัปดาห์ (My Space) ใช้สีเดียวกับปฏิทินหลัก (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-cal-unify.js
   - เดิม: ปฏิทินหลัก = สีตามประเภทกิจกรรม (ส่งมอบ · ประชุม · วางบิล …) แต่ปฏิทิน 3 สัปดาห์ = สีตามโครงการ → สีเดียวกันแต่ความหมายต่างกัน
   - ใหม่: ปฏิทิน 3 สัปดาห์ ใช้สี / คำอธิบายสี ตามประเภทกิจกรรม (MS_TYPES ชุดเดียวกับปฏิทินหลัก) · ชื่อโครงการนำหน้ากิจกรรมแทนสี
   - (การ์ด Calendar ของโครงการ เปิดปฏิทินหลักกรองโครงการอยู่แล้ว — หน้าเดียวกัน)
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
const MARK = 'v1.452.0 cal-unify';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (cal-unify)'); process.exit(0); }
const edits = [
  ['สีตามประเภท', "const pc={}; vp.forEach((p,i)=>{ pc[p.id]=PAL[i%PAL.length]; });",
    "const pc={}; vp.forEach((p,i)=>{ pc[p.id]=PAL[i%PAL.length]; });   /* " + MARK + ": สีตามประเภทกิจกรรม เหมือนปฏิทินหลัก */ const _T=this.MS_TYPES(); const _ty=(m)=>_T[m.type]||_T.other||{}; const _tc=(m)=>_ty(m).color||'#8A6D3B'; const _tb=(m)=>_ty(m).bg||this._rgba(_tc(m),.13);"],
  ['กิจกรรมในช่องวัน', "evs:E.slice(0,4).map(m=>({ key:m.id, t:m.title||'(ไม่มีชื่อ)', c:pc[m.project]||'#8A6D3B', bg:this._rgba(pc[m.project]||'#8A6D3B',.13),",
    "evs:E.slice(0,4).map(m=>({ key:m.id, t:(vp.length>1?pname(m.project)+' · ':'')+(m.title||'(ไม่มีชื่อ)'), c:_tc(m), bg:_tb(m),"],
  ['คำอธิบายสี', "w3Legend:vp.filter(p=>ms.some(m=>m.project===p.id)).slice(0,8).map(p=>({ key:p.id, n:p.name, c:pc[p.id] })),",
    "w3Legend:Object.keys(_T).filter(k=>ms.some(m=>(_T[m.type]?m.type:'other')===k)).map(k=>({ key:k, n:_T[k].label, c:_T[k].color })),"],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ cal-unify: ปฏิทิน 3 สัปดาห์ใช้สีตามประเภทกิจกรรม');
