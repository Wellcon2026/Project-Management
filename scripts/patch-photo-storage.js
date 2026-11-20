#!/usr/bin/env node
/* =====================================================================
   v1.435.0 photo-storage — รูป Defect / รายงานประจำวัน / รูปในรายการทั่วไป ขึ้นคลังไฟล์ (Supabase Storage) แทนฝังในข้อมูล
     node scripts/patch-photo-storage.js        (รันหลัง patch-card-gate.js)
   ปัญหา (ผู้บริหารสั่ง 20/11/2026): ตาราง punch_log 46 MB · daily_reports 4.6 MB เพราะรูปเป็น dataURL → ซิงก์ช้า / หมดเวลา
   แก้:
   1) `_picUrl(d, tag)` อัปโหลด dataURL ด้วย `uploadPic` เดิม (bucket general-photo) → ลิงก์ · อัปโหลดไม่ได้ = เก็บแบบเดิม
   2) soPhoto (รูปในรายการทั่วไป) · _dfxPhoto (Defect ก่อน/หลังแก้) · soPhotosMulti (รายงานประจำวัน) ใช้ลิงก์
   3) ไฟล์ Word (รายงานประจำวัน / RFI) ดึงรูปจากลิงก์มาฝังได้: `_picPrefetch` โหลดรูปเป็น dataURL ก่อน · `_picData(d)` ใช้ตอนฝัง
   - รูปเดิมย้ายด้วย /api/photo-migrate · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.435.0 photo-storage';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (photo-storage)'); process.exit(0); }
if (!t.includes('v1.434.0 card-gate')) { console.error('✗ ต้องรัน scripts/patch-card-gate.js ก่อน'); process.exit(1); }

const HELP = `  // ===== ${MARK}: รูปขึ้นคลังไฟล์ · Word ดึงรูปจากลิงก์ได้ =====
  async _picUrl(d, tag){ if(typeof d!=='string'||!/^data:image\\//.test(d)||!this._sb) return d;
    try{ const u=await this.uploadPic(this.dataUrlToBlob(d), tag||'pic'); return u||d; }catch(e){ console.warn('_picUrl', e); return d; } }
  _picData(d){ return (this._picCache&&this._picCache[d])||d; }
  async _picPrefetch(list){ this._picCache=this._picCache||{}; const L=(list||[]).filter(u=>typeof u==='string'&&/^https?:/i.test(u)&&!this._picCache[u]);
    if(L.length) this.showToast('กำลังโหลดรูป '+L.length+' รูป…');
    await Promise.all(L.map(async(u)=>{ try{ const b=await (await fetch(u)).blob(); const bm=await createImageBitmap(b); const c=document.createElement('canvas'); c.width=bm.width; c.height=bm.height;
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(bm,0,0); this._picCache[u]=c.toDataURL('image/jpeg',.85); }catch(e){ console.warn('prefetch', u, e); } })); }
  _picsOf(key, id, r){ const cur=((this.state[key]||[]).find(x=>x.id===id))||r||{}; return Array.isArray(cur.photos)?cur.photos:(cur.photo?[cur.photo]:[]); }
`;

const R = [
  ['ตัวช่วย', '  _spoOrderBy(o){', HELP + '  _spoOrderBy(o){'],
  ['รูปในรายการทั่วไป (soPhoto)',
   "      this.soSet(key,id,'photo',c.toDataURL('image/jpeg',.72)); };",
   "      this._picUrl(c.toDataURL('image/jpeg',.72), key).then(u=>this.soSet(key,id,'photo',u)); };   // " + MARK],
  ['Defect รูปก่อน/หลังแก้ (_dfxPhoto)',
   "      this.soSet('punch',id,field,c.toDataURL('image/jpeg',.72)); this._dfxLog(id, field==='photoAfter'?'แนบรูปหลังแก้':'แนบรูปก่อนแก้'); };",
   "      this._picUrl(c.toDataURL('image/jpeg',.72), 'defect').then(u=>{ this.soSet('punch',id,field,u); this._dfxLog(id, field==='photoAfter'?'แนบรูปหลังแก้':'แนบรูปก่อนแก้'); }); };   /* " + MARK + " */"],
  ['รายงานประจำวัน (soPhotosMulti) 1/2',
   "        const data=c.toDataURL('image/jpeg',.72);\n        this.setState(st=>({ [key]:(st[key]||[]).map(r=>{ if(r.id!==id) return r;",
   "        this._picUrl(c.toDataURL('image/jpeg',.72), key).then(data=>this.setState(st=>({ [key]:(st[key]||[]).map(r=>{ if(r.id!==id) return r;   /* " + MARK + " */"],
  ['รายงานประจำวัน (soPhotosMulti) 2/2',
   "          return { ...r, photos:[...ph, data], photo:undefined }; }) }));",
   "          return { ...r, photos:[...ph, data], photo:undefined }; }) })));"],
  ['Word RFI: โหลดรูปจากลิงก์ก่อน',
   "  rfiExportDoc(pid, rr){",
   "  async rfiExportDoc(pid, rr){ await this._picPrefetch(this._picsOf('rfis', rr&&rr.id, rr)); return this._rfiExportDoc0(pid, rr); }   // " + MARK + "\n  _rfiExportDoc0(pid, rr){"],
  ['Word รายงานประจำวัน: โหลดรูปจากลิงก์ก่อน',
   "  siteReportExport(pid, r, fmt){",
   "  async siteReportExport(pid, r, fmt){ if(fmt!=='xls') await this._picPrefetch(this._picsOf('dailies', r&&r.id, r)); return this._siteReportExport0(pid, r, fmt); }   // " + MARK + "\n  _siteReportExport0(pid, r, fmt){"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
const W = "this._b64u8(String(d).split(',')[1]||'')";
if (t.split(W).length - 1 !== 2) { console.error('✗ Word ฝังรูป: หาจุดแก้เจอ ' + (t.split(W).length - 1) + ' ที่ (ต้องเจอ 2)'); process.exit(1); }
for (const [, a, b] of R) t = t.split(a).join(b);
t = t.split(W).join("this._b64u8(String(this._picData(d)).split(',')[1]||'')");
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ photo-storage: แก้ ' + (R.length + 1) + ' จุด');
