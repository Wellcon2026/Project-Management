#!/usr/bin/env node
/* =====================================================================
   v1.396.0 vo-si-tag — ผู้บริหารสั่ง 14/11/2026
     node scripts/patch-vo-si-tag.js        (รันต่อจาก patch-apr-label.js)
   1) VO Tracker: คอลัมน์ใหม่ "SI จาก Owner" ถัดจาก SI / Doc No. — แนบไฟล์ SI ที่ Owner ส่งมา (รูป · PDF ฯลฯ)
      · ใช้ระบบแนบไฟล์เดิม (field fSi ในแถว · bucket เดิม) · ยอดรวมท้ายตารางนับไฟล์
      · ลำดับคอลัมน์ที่ผู้ใช้จัดเองไว้ (เครื่องนั้น) ย้ายให้อัตโนมัติ ไม่รีเซ็ต
   2) ช่องแนบไฟล์ทุกช่องใน VO Tracker (SI · หลักฐานเสนอราคา · หลักฐานจ่าย): วางรูปได้
      · ปุ่ม 📋 = วางรูปที่คัดลอกไว้ (อ่านคลิปบอร์ด) · หรือคลิกช่องแล้วกด Ctrl+V / ⌘V
      · รูปที่วางตั้งชื่อให้ "วางรูป-YYYYMMDD-HHMMSS.png"
   3) แท็ก "หน้านี้" จากหน้า หน้างานของฉัน / งานออกแบบของฉัน → ส่งโครงการที่เลือกอยู่ไปด้วย
      (wctag.js v1.2.0: แท็กในโครงการ เลือกได้เฉพาะทีมที่ได้รับมอบหมายในโครงการนั้น)
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
const MARK = 'v1.396.0 vo-si-tag';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (SI จาก Owner · วางรูป · แท็กตามทีมโครงการ)'); process.exit(0); }
if (!t.includes('v1.395.0 apr-label')) { console.error('✗ ต้องรัน scripts/patch-apr-label.js ก่อน'); process.exit(1); }

// ปุ่ม 📋 ต่อจากปุ่มแนบไฟล์ (หาแท็กปิด </label> ของช่องเลือกไฟล์)
const PICK = 'sc-camel-on-change="{{ c.onPick }}" style="display:none">';
const m = new RegExp(PICK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s*)</label>').exec(t);
if (!m) { console.error('✗ หาปุ่มแนบไฟล์ใน VO Tracker ไม่เจอ — ไม่แก้'); process.exit(1); }
const PASTE_BTN = m[1] + '</label>' + m[1] + '<button sc-camel-on-click="{{ c.onPasteBtn }}" title="วางรูปที่คัดลอกไว้ — หรือคลิกช่องนี้แล้วกด Ctrl+V" style="display:inline-flex;align-items:center;justify-content:center;height:26px;width:28px;box-sizing:border-box;border:1px dashed {{ c.bd }};background:{{ c.bg }};color:{{ c.fg }};border-radius:20px;padding:0;font-size:12px;cursor:pointer" style-hover="border-color:#C9A961">📋</button>';

const HELPERS =
  "  // " + MARK + ": วางรูป (คลิปบอร์ด) ในช่องแนบไฟล์ VO Tracker\n" +
  "  _clipName(f){ if(f&&f.name&&!/^image\\.\\w+$/i.test(f.name)) return f; const ext=String((f&&f.type)||'image/png').split('/')[1].replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'')||'png';\n" +
  "    const d=new Date(), p=(n)=>String(n).padStart(2,'0'); const nm='วางรูป-'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds())+'.'+ext;\n" +
  "    try{ return new File([f], nm, { type:(f&&f.type)||'image/png' }); }catch(x){ return f; } }\n" +
  "  _clipFiles(e){ const d=e&&e.clipboardData; if(!d) return []; let L=Array.prototype.slice.call(d.files||[]);\n" +
  "    if(!L.length) L=Array.prototype.slice.call(d.items||[]).filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean); return L.map(f=>this._clipName(f)); }\n" +
  "  _clipRead(){ try{ if(!navigator.clipboard||!navigator.clipboard.read) return Promise.resolve([]);\n" +
  "    return navigator.clipboard.read().then(items=>Promise.all(items.map(it=>{ const ty=(it.types||[]).find(x=>/^image\\//.test(x)); return ty?it.getType(ty).then(b=>this._clipName(new File([b],'image.'+(ty.split('/')[1]||'png'),{ type:ty }))):null; })))\n" +
  "      .then(L=>L.filter(Boolean)).catch(()=>[]); }catch(e){ return Promise.resolve([]); } }\n";

const R = [
  // ---- 1) คอลัมน์ SI จาก Owner ----
  ['หัวคอลัมน์', "cols=[['SI / Doc No.',150],['VO No.',92],", "cols=[['SI / Doc No.',150],['SI จาก Owner',104],['VO No.',92],"],
  ['ช่องในแถว', "return { id:r.id, cells:[ s2('doc',142), s2('vo',84),", "return { id:r.id, cells:[ s2('doc',142), this._voFileCell(pk, r, 'fSi', canE), s2('vo',84),"],
  ['ยอดรวมท้ายตาราง', "tot('ยอดรวมทั้งโครงการ',142), tot(vp.rows.length+' รายการ',84),",
   "tot('ยอดรวมทั้งโครงการ',142), tot(vp.rows.reduce((s,r)=>s+((r.fSi||[]).length),0)+' ไฟล์',96,'center'), tot(vp.rows.length+' รายการ',84),"],
  ['ลำดับคอลัมน์ที่จัดไว้ (ย้ายให้)', "_qstColOrd(tab,n){ const o=((this.state.qstColOrd||{})[tab])||null; if(!Array.isArray(o)||o.length!==n) return null;",
   "_qstColOrd(tab,n){ let o=((this.state.qstColOrd||{})[tab])||null;\n    if(tab==='vo'&&Array.isArray(o)&&n===12&&o.length===11&&o.every(i=>i>=0&&i<11)){ o=o.map(i=>i>=1?i+1:i); o.splice(o.indexOf(0)+1,0,1); }   // " + MARK + ": เพิ่มคอลัมน์ SI จาก Owner — ลำดับเดิมไม่รีเซ็ต\n    if(!Array.isArray(o)||o.length!==n) return null;"],
  // ---- 2) วางรูป ----
  ['ข้อความช่องแนบไฟล์', "label:n?(n+' ไฟล์'):(canE?'แนบไฟล์':'—'), caret",
   "label:n?(n+' ไฟล์'):(canE?(fld==='fSi'?'แนบ SI':'แนบไฟล์'):'—'), caret"],
  ['คำอธิบายช่อง', "tip:canE?'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก (รูป · PDF · Excel · Word · ZIP)':'ไฟล์หลักฐาน',",
   "tip:canE?((fld==='fSi'?'SI จาก Owner — ':'')+'ลากไฟล์มาวาง · คลิกเพื่อเลือก · หรือคลิกช่องแล้วกด Ctrl+V วางรูป (รูป · PDF · Excel · Word · ZIP)'):(fld==='fSi'?'SI จาก Owner':'ไฟล์หลักฐาน'),\n" +
   "      onPaste:(e)=>{ if(!canE) return; const fl=this._clipFiles(e); if(!fl.length) return; stop(e); this.setState({ qstFileOpen:oid }); this._voFilesAdd(pk, r.id, fld, fl); },\n" +
   "      onPasteBtn:(e)=>{ stop(e); const box=e.currentTarget&&e.currentTarget.closest('[data-vofile]'); this._clipRead().then(fl=>{ if(fl.length){ this.setState({ qstFileOpen:oid }); this._voFilesAdd(pk, r.id, fld, fl); }\n" +
   "        else { try{ box&&box.focus(); }catch(x){} this.showToast('คัดลอกรูปก่อน แล้วกด 📋 อีกครั้ง — หรือคลิกช่องนี้แล้วกด Ctrl+V'); } }); },"],
  ['ช่องรับวางรูป', '<div sc-camel-on-drag-over="{{ c.onDragOver }}" sc-camel-on-drag-enter="{{ c.onDragOver }}" sc-camel-on-drag-leave="{{ c.onDragLeave }}" sc-camel-on-drop="{{ c.onDrop }}" title="{{ c.tip }}" style="min-width:{{ c.w }}px;',
   '<div data-vofile="1" tabindex="0" sc-camel-on-paste="{{ c.onPaste }}" sc-camel-on-drag-over="{{ c.onDragOver }}" sc-camel-on-drag-enter="{{ c.onDragOver }}" sc-camel-on-drag-leave="{{ c.onDragLeave }}" sc-camel-on-drop="{{ c.onDrop }}" title="{{ c.tip }}" style="outline:none;min-width:{{ c.w }}px;'],
  ['ปุ่ม 📋', m[0], PICK + PASTE_BTN],
  ['ตัวช่วยคลิปบอร์ด', "  _voFilesAdd(pk, id, fld, fileList){", HELPERS + "  _voFilesAdd(pk, id, fld, fileList){"],
  // ---- 3) แท็กหน้านี้ = โครงการที่เลือก ----
  ['หน้างานของฉัน: จำโครงการที่เลือก', "const pid=has(S.workPid)?S.workPid:has(saved)?saved:has(S.projectId)?S.projectId:(vp[0]||{}).id||'';",
   "const pid=has(S.workPid)?S.workPid:has(saved)?saved:has(S.projectId)?S.projectId:(vp[0]||{}).id||''; this._wkPid=pid;   // " + MARK + ": แท็กหน้านี้ = โครงการนี้"],
  ['แท็กหน้านี้: ส่งโครงการ', "project:(S.screen==='projectDetail'&&S.projectId)||null,", "project:(S.screen==='projectDetail'&&S.projectId)||(S.screen==='work'&&this._wkPid)||null,"],
  ['wctag.js เวอร์ชัน', 'wctag.js?v=1.1.0', 'wctag.js?v=1.2.0'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ SI จาก Owner · วางรูป · แท็กตามทีมโครงการ: แก้ ' + R.length + ' จุด');
