#!/usr/bin/env node
/* =====================================================================
   Wellcon Site Work (เดิม Defect Check) — เมนูเดียวในหน้าโครงการ เปิดแอปตัวเต็ม
     node scripts/patch-site-work-menu.js        (รันหลัง patch-defect-survey.js)
   - เมนูหน้าโครงการ: "Site Work · Defect / Survey / Scope" แทน "Defect Check · ตรวจงาน (QC)" + "As-Built & Survey" (Survey อยู่ในแอปแล้ว)
   - กดเมนู / การ์ดหน้าทำงาน → เปิด Wellcon Site Work ตัวเต็มในแท็บใหม่ (โครงการเดียวกัน · มีแถบ Site Work และปุ่ม Defect / Survey / Scope)
     เดิมเป็นหน้า Defect แบบฝังใน PM (ไม่มีแถบด้านบน / สลับประเภทไม่ได้)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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

const R = [
  ['เมนูโครงการ: Site Work เมนูเดียว',
   "['qc','Defect Check · ตรวจงาน (QC)'],['survey','As-Built & Survey · สำรวจหน้างาน'],",
   "['qc','Site Work · Defect / Survey / Scope'],   /* v1.378.0 Wellcon Site Work: เมนูเดียว เปิดแอปตัวเต็ม (Survey อยู่ในแอป) */"],
  ['เมธอดเปิดแอปตัวเต็ม',
   '  _svOpen(pid){',
   "  // v1.378.0 Wellcon Site Work ตัวเต็ม (แท็บใหม่ · โครงการเดียวกัน)\n"
   + "  _swOpen(pid){ if(!pid) return; const st=this.IS_STAGING(); const base=((st&&window.__wdcBase)||'https://wellcon-defect-check.vercel.app/').replace(/\\/?$/,'/');\n"
   + "    const u=base+(st?'?env=staging':'')+'#/p/'+encodeURIComponent(pid)+'/plan'; try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ try{ window.location.href=u; }catch(e2){} } }\n"
   + '  _svOpen(pid){'],
  ['กดเมนูในโครงการ → แอปตัวเต็ม',
   "if(k==='issues'){ this._issOpen(_pdPid); return; } if(k==='survey'){ this._svOpen(_pdPid); return; }",
   "if(k==='issues'){ this._issOpen(_pdPid); return; } if(k==='survey'){ this._svOpen(_pdPid); return; } if(k==='qc'){ this._swOpen(_pdPid); return; }"],
  ['การ์ดหน้าทำงาน → แอปตัวเต็ม',
   "if(k==='issues'){ this._issOpen(pid); return; } if(k==='survey'){ this._svOpen(pid); return; }",
   "if(k==='issues'){ this._issOpen(pid); return; } if(k==='survey'){ this._svOpen(pid); return; } if(k==='qc'){ this._swOpen(pid); return; }"],
];
let done = 0, had = 0;
for (const [name, a, b] of R) {
  if (t.includes(b)) { had++; continue; }
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ ' + name + ' (พบ ' + n + ' จุด) — ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); done++;
}
if (!done) { console.log('✓ มีครบแล้ว — ไม่ต้องแก้ (' + had + ' จุด)'); process.exit(0); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Site Work เมนูเดียว — แก้ ' + done + ' จุด' + (had ? (' · มีแล้ว ' + had) : ''));
