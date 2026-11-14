#!/usr/bin/env node
/* =====================================================================
   v1.389.0 sheet-shared — แถบลิงก์ Google Sheet: ชีตที่ตั้งใช้ + ซูม + ความสูง เป็นค่ากลางของโครงการ
     node scripts/patch-sheet-shared.js
   เดิม: ลิงก์แชร์ทั้งโครงการแล้ว แต่ "ชีตที่เลือกใช้" (sheetSel) · ความสูง (sheetH) · ซูม (localStorage) จำเฉพาะเครื่อง
         → คนอื่นเห็นลิงก์แรกสุดเสมอ ไม่ใช่ลิงก์ที่ตั้งไว้
   ใหม่ (เก็บในรายการลิงก์ projSheets[pid] — ซิงก์ทุกเครื่อง):
     · def:true  = ชีตหลักของหน้านั้น — เลือกจากรายการ / เพิ่มลิงก์ใหม่ = ตั้งเป็นชีตหลักให้ทุกคนในโครงการ
       (ยังไม่เคยตั้ง = ลิงก์ล่าสุด)
     · zoom      = ซูมของชีตนั้น (40–100% · ค่าเริ่มต้น 50%)
     · h         = ความสูงกรอบ (0/1/2 = 420/640/900 px)
     · ซ่อน / แสดงตัวอย่าง ยังเป็นของแต่ละคน
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · รันหลัง scripts/patch-sheet-zoom.js ทุกครั้ง
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
const MARK = 'v1.389.0 sheet-shared';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ชีตหลัก / ซูม / ความสูง เป็นค่ากลางของโครงการ)'); process.exit(0); }
if (!t.includes('v1.388.0 sheet-zoom')) { console.error('✗ ต้องรัน scripts/patch-sheet-zoom.js ก่อน'); process.exit(1); }

const ZOOM_NEW =
  "  // ===== " + MARK + ": ซูมเก็บในรายการลิงก์ (sel.zoom) — ทุกคนในโครงการเห็นเท่ากัน =====\n" +
  "  _shZoom(sel, h, setZ){ const Z=[0.4,0.5,0.6,0.75,1]; let z=Number(sel&&sel.zoom); if(Z.indexOf(z)<0) z=0.5; const i=Z.indexOf(z);\n" +
  "    const set=(v)=>{ if(v!==z) setZ(v); };\n" +
  "    return { zK:String(z), zW:(100/z).toFixed(3)+'%', zH:Math.round(h/z)+'px', zLabel:Math.round(z*100)+'%',\n" +
  "      zOpts:Z.map(v=>({ key:String(v), l:Math.round(v*100)+'%', bg:v===z?'#1C1B18':'#fff', fg:v===z?'#fff':'#4A463E', bd:v===z?'#1C1B18':'#E4DED2', onPick:()=>set(v) })),\n" +
  "      onZoomOut:()=>{ if(i>0) set(Z[i-1]); }, onZoomIn:()=>{ if(i<Z.length-1) set(Z[i+1]); } }; }\n";

// [ชื่อ, เดิม, ใหม่]
const R = [
  ['ชีตหลัก: เลือกจากค่ากลาง',
   "    const selKey=pid+':'+tab, sel=L.find(x=>x.id===((S.sheetSel||{})[selKey]))||L[0];",
   "    const selKey=pid+':'+tab, sel=L.find(x=>x.def)||L[L.length-1];   // " + MARK + ": ชีตหลักของหน้า (def) ใช้ร่วมทั้งโครงการ · ยังไม่ตั้ง = ลิงก์ล่าสุด"],
  ['ความสูง: ค่ากลาง',
   "    const H=[420,640,900], hi=Math.min(2,Math.max(0,Number((S.sheetH||{})[selKey]||0)));",
   "    const H=[420,640,900], hi=Math.min(2,Math.max(0,Number((sel&&sel.h)||0)));"],
  ['เพิ่มลิงก์ = ชีตหลัก',
   "      save([...allP,{ id, name:nm, url:u, tab, kind, by:this._trkMe(), at:Date.now() }]);",
   "      save([...allP.map(x=>(x.tab||'dwg')===tab&&x.def?{ ...x, def:false }:x),{ id, name:nm, url:u, tab, kind, by:this._trkMe(), at:Date.now(), def:true }]);"],
  ['ความสูง: บันทึกค่ากลาง',
   "      onTaller:()=>this.setState(st=>({ sheetH:{ ...(st.sheetH||{}), [selKey]:hi<2?hi+1:0 } })),",
   "      onTaller:()=>{ if(!sel) return; save(allP.map(x=>x.id===sel.id?{ ...x, h:hi<2?hi+1:0 }:x)); },"],
  ['เลือกชีต = ตั้งชีตหลักให้ทุกคน',
   "      onSel:(e)=>{ const v=e.target.value; this.setState(st=>({ sheetSel:{ ...(st.sheetSel||{}), [selKey]:v } })); },",
   "      onSel:(e)=>{ const v=e.target.value; if(sel&&v===sel.id) return; save(allP.map(x=>(x.tab||'dwg')!==tab?x:{ ...x, def:x.id===v })); this.showToast('ตั้งเป็นชีตหลักของหน้านี้แล้ว — ทุกคนในโครงการเห็นชีตนี้'); },"],
  ['ซูม: บันทึกค่ากลาง',
   "...this._shZoom(selKey, H[hi]),",
   "...this._shZoom(sel, H[hi], (v)=>{ if(sel) save(allP.map(x=>x.id===sel.id?{ ...x, zoom:v }:x)); }),"],
];
const ZS = "  _shZoom(k, h){", ZE = "  SHEET_VALS(S, pid, tab){";

for (const [name, a] of R) {
  const c = t.split(a).length - 1;
  if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); }
}
const zi = t.indexOf(ZS), zj = zi < 0 ? -1 : t.indexOf(ZE, zi);
if (t.split(ZS).length !== 2 || zj < 0) { console.error('✗ หา _shZoom เดิมไม่เจอ — ไม่แก้อะไรเลย'); process.exit(1); }
// ลบคอมเมนต์หัวของ _shZoom เดิม (บรรทัดก่อนหน้า) ถ้ามี
const prevNl = t.lastIndexOf('\n', zi - 2);
const prevLine = t.slice(prevNl + 1, zi);
const start = prevLine.includes('v1.388.0 sheet-zoom') ? prevNl + 1 : zi;
t = t.slice(0, start) + ZOOM_NEW + t.slice(zj);
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ชีตหลัก / ซูม / ความสูง เป็นค่ากลางของโครงการ: แก้ ' + (R.length + 1) + ' จุด');
