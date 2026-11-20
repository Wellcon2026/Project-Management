#!/usr/bin/env node
/* =====================================================================
   v1.436.0 img-shrink — ย่อรูปอัตโนมัติก่อนอัปโหลด ในจุดที่ยังส่งรูปต้นฉบับเต็ม (ผู้บริหารสั่ง 20/11/2026)
     node scripts/patch-img-shrink.js        (รันหลัง patch-perm-fetch.js)
   - ตรวจคลังไฟล์จริง: รูปหน้างาน (Defect · รายงานประจำวัน · วัสดุ · Claim) ย่อแล้ว · ที่ยังเต็ม = แนบไฟล์ทั่วไป / ทะเบียนเอกสาร (`putFile` · doc-) สูงสุด 2.2 MB
     และคลังความรู้ (lib-) 3.2 MB
   - `_shrinkImg(file)`: รูป JPEG / PNG / WebP ที่ใหญ่กว่า 500 KB → ด้านยาวไม่เกิน 2400 px · JPEG คุณภาพ 0.82 (ยังอ่านตัวหนังสือในรูปเอกสารได้)
     ใช้ผลที่เล็กกว่าเท่านั้น · ย่อไม่ได้ (เช่น HEIC) = ส่งไฟล์เดิม · PDF / แบบ / ไฟล์อื่นไม่แตะ
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
const MARK = 'v1.436.0 img-shrink';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (img-shrink)'); process.exit(0); }
if (!t.includes('v1.435.2 perm-fetch')) { console.error('✗ ต้องรัน scripts/patch-perm-fetch.js ก่อน'); process.exit(1); }
const HELP = `  // ===== ${MARK}: ย่อรูปก่อนอัปโหลด (ใหญ่กว่า 500 KB → ด้านยาว ≤ 2400 px · JPEG 0.82 · ใช้เฉพาะเมื่อเล็กลง) =====
  async _shrinkImg(file, maxPx, q){ try{ if(!file||!/^image\\/(jpeg|png|webp)$/i.test(file.type||'')||file.size<=500*1024||typeof createImageBitmap!=='function') return file;
      const bm=await createImageBitmap(file); const k=Math.min(1,(maxPx||2400)/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k);
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(bm,0,0,c.width,c.height);
      const b=await new Promise(r=>c.toBlob(r,'image/jpeg',q||0.82)); if(!b||b.size>=file.size) return file;
      const nm=String(file.name||'photo').replace(/\\.[A-Za-z0-9]+$/,'')+'.jpg'; return new File([b], nm, { type:'image/jpeg' }); }catch(e){ console.warn('_shrinkImg', e); return file; } }
`;
const R = [
  ['ตัวช่วย', "  async putFile(cur, set2, file, maxMB){", HELP + "  async putFile(cur, set2, file, maxMB){ file=await this._shrinkImg(file);   // " + MARK],
  ['คลังความรู้: ย่อรูปก่อนอัปโหลด',
   "    for(const f of list){\n      if(f.size>20*1024*1024){ this.showToast(f.name+' ใหญ่เกิน 20 MB — วางลิงก์ Drive แทน'); continue; }",
   "    for(const f0 of list){ const f=await this._shrinkImg(f0);   /* " + MARK + " */\n      if(f.size>20*1024*1024){ this.showToast(f.name+' ใหญ่เกิน 20 MB — วางลิงก์ Drive แทน'); continue; }"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ img-shrink: แก้ ' + R.length + ' จุด');
