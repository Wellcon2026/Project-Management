#!/usr/bin/env node
/* =====================================================================
   v1.420.0 photo-menu — การ์ด / เมนู "Photo Editor" ใน Wellcon PM → เปิดหน้าแยก /photo.html
     node scripts/patch-photo-menu.js        (รันหลัง patch-pdf-menu.js)
   1) การ์ดหน้าแรก 'tab:photo' — ไม่ต้องเลือกโครงการ · ชุดการ์ดเริ่มต้นทุกตำแหน่งมี Photo Editor
      — ตำแหน่ง / คนที่ตั้งการ์ดเองแล้ว (workPages) ไม่เปลี่ยน → Admin เพิ่มที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง
   2) หน้าในโครงการ: เมนู "Photo Editor · แต่งรูปผลงาน ↗" (ท้ายรายการ)
   3) ปิดทั้งระบบได้ที่สวิตช์ 'tab:photo' (featGlobal) — หน้า photo.html ตรวจสวิตช์เดียวกัน
   - ตัวหน้า: photo.html + photoedit.js (ทำงานในเบราว์เซอร์ทั้งหมด · ไม่มีตาราง / SQL ใหม่)
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
const MARK = 'v1.420.0 photo-menu';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เมนู Photo Editor)'); process.exit(0); }
if (!t.includes('v1.419.0 pdf-menu')) { console.error('✗ ต้องรัน scripts/patch-pdf-menu.js ก่อน'); process.exit(1); }

const ICON = 'M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M7 16l3.5-4 2.5 2.5 2-2 2 3.5M15.5 9.5a1 1 0 1 0 0-.01';
const R = [
  ['เมนูในโครงการ', "['pdf','PDF Maker · แก้ไขเอกสาร ↗']];", "['pdf','PDF Maker · แก้ไขเอกสาร ↗'],['photo','Photo Editor · แต่งรูปผลงาน ↗']];"],
  ['เปิดหน้าแยก', "  _pdfOpen(){",
   "  _photoOpen(){ try{ window.location.href='/photo.html'+(this.IS_STAGING()?'?env=staging':''); }catch(e){} }   // " + MARK + "\n  _pdfOpen(){"],
  ['การ์ด → เปิดหน้าแยก', "if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(pid); return; }", "if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(pid); return; }"],
  ['เมนู → เปิดหน้าแยก', "if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(_pdPid); return; }", "if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(_pdPid); return; }"],
  ['หมวดสี', "docs:'sys', memo:'sys', pdf:'sys' };", "docs:'sys', memo:'sys', pdf:'sys', photo:'sys' };"],
  ['สีประจำการ์ด', "'tab:pdf':'#B42318',", "'tab:pdf':'#B42318','tab:photo':'#0E7490',"],
  ['ไอคอนการ์ด', "const I={ pdf:", "const I={ photo:'" + ICON + "', pdf:"],
  ['คำอธิบายการ์ด', "const SUB={ pdf:", "const SUB={ photo:'ครอป · หมุน · ดัดเส้นตรง · เอฟเฟกต์', pdf:"],
  ['การ์ดไม่ต้องเลือกโครงการ', "      if(key==='tab:pdf'){",
   "      if(key==='tab:photo'){ if(this._featGOff('tab:photo')||!this._pgAllowed('photo')) return null; const c=this.TAB_CAT('photo'); return { key, label:'Photo Editor · แต่งรูปผลงาน ↗', sub:SUB.photo, path:I.photo, c:c.c, d:c.d, needP:false, grp:'เมนู', run:()=>this._photoOpen() }; }\n      if(key==='tab:pdf'){"],
  ['การ์ดเริ่มต้นทุกตำแหน่ง', "return L0?[...L0,'tab:pdf']:[]; }", "return L0?[...L0,'tab:pdf','tab:photo']:[]; }"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เมนู Photo Editor: แก้ ' + R.length + ' จุด');
