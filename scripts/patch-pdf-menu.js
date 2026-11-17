#!/usr/bin/env node
/* =====================================================================
   v1.419.0 pdf-menu — การ์ด / เมนู "PDF Maker" ใน Wellcon PM → เปิดหน้าแยก /pdf.html
     node scripts/patch-pdf-menu.js        (รันหลัง patch-access-page.js)
   1) การ์ดหน้าแรก 'tab:pdf' — ไม่ต้องเลือกโครงการ (เครื่องมือทั่วไป) · ชุดการ์ดเริ่มต้นทุกตำแหน่งมี PDF Maker
      — ตำแหน่ง / คนที่ตั้งการ์ดเองแล้ว (workPages) ไม่เปลี่ยน → Admin เพิ่มที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง
   2) หน้าในโครงการ: เมนู "PDF Maker · แก้ไขเอกสาร ↗" (ท้ายรายการ)
   3) ปิดทั้งระบบได้ที่สวิตช์ 'tab:pdf' (featGlobal) — หน้า pdf.html ตรวจสวิตช์เดียวกัน
   - ตัวหน้า: pdf.html + pdfmaker.js (ทำงานในเบราว์เซอร์ทั้งหมด · ไม่มีตาราง / SQL ใหม่)
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
const MARK = 'v1.419.0 pdf-menu';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เมนู PDF Maker)'); process.exit(0); }
if (!t.includes('v1.414.0 quotation-menu')) { console.error('✗ ต้องรัน scripts/patch-quotation-menu.js ก่อน'); process.exit(1); }

const ICON = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M7 17c1.2-1.8 2.2-2 2.7-.6.5 1.4 1.3 1.6 2.3.2 1-1.4 1.8-1.4 2.5-.2.4.6 1 .7 1.5.3';
const R = [
  ['เมนูในโครงการ', "['docs','ทะเบียนรับ-ส่งเอกสาร'],['memo','ออกหนังสือ / ฟอร์ม']];", "['docs','ทะเบียนรับ-ส่งเอกสาร'],['memo','ออกหนังสือ / ฟอร์ม'],['pdf','PDF Maker · แก้ไขเอกสาร ↗']];"],
  ['เปิดหน้าแยก', "  _quoOpen(pid){",
   "  _pdfOpen(){ try{ window.location.href='/pdf.html'+(this.IS_STAGING()?'?env=staging':''); }catch(e){} }   // " + MARK + "\n  _quoOpen(pid){"],
  ['การ์ด → เปิดหน้าแยก', "if(k==='quo'){ this._quoOpen(pid); return; }", "if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(pid); return; }"],
  ['เมนู → เปิดหน้าแยก', "if(k==='quo'){ this._quoOpen(_pdPid); return; }", "if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(_pdPid); return; }"],
  ['หมวดสี', "docs:'sys', memo:'sys' };", "docs:'sys', memo:'sys', pdf:'sys' };"],
  ['สีประจำการ์ด', "'tab:apr':'#D97706','tab:quo':'#0D5C63',", "'tab:apr':'#D97706','tab:quo':'#0D5C63','tab:pdf':'#B42318',"],
  ['ไอคอนการ์ด', "const I={ quo:", "const I={ pdf:'" + ICON + "', quo:"],
  ['คำอธิบายการ์ด', "const SUB={ quo:", "const SUB={ pdf:'อ่าน · แทรกหน้า · รวมไฟล์ · ลายเซ็น · กรอกฟอร์ม', quo:"],
  ['การ์ดไม่ต้องเลือกโครงการ', "if(key.indexOf('tab:')===0){ const k=key.slice(4); const l=lab(k);",
   "if(key==='tab:pdf'){ if(this._featGOff('tab:pdf')||!this._pgAllowed('pdf')) return null; const c=this.TAB_CAT('pdf'); return { key, label:'PDF Maker · แก้ไขเอกสาร ↗', sub:SUB.pdf, path:I.pdf, c:c.c, d:c.d, needP:false, grp:'เมนู', run:()=>this._pdfOpen() }; }\n      if(key.indexOf('tab:')===0){ const k=key.slice(4); const l=lab(k);"],
  ['การ์ดเริ่มต้นทุกตำแหน่ง', "'nav:admin','nav:system'] }[rk]||[]; }", "'nav:admin','nav:system'] }[rk]; return L0?[...L0,'tab:pdf']:[]; }"],
  ['การ์ดเริ่มต้นทุกตำแหน่ง (ตัวแปร)', "    return { sitemgr:SM, site:SITE,", "    const L0={ sitemgr:SM, site:SITE,"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เมนู PDF Maker: แก้ ' + R.length + ' จุด');
