#!/usr/bin/env node
/* =====================================================================
   v1.388.0 sheet-zoom — ย่อ Google Sheet ให้เห็นเต็มกรอบ + เอาแถบ Mango ออก
     node scripts/patch-sheet-zoom.js
   1) แถบ "ลิงก์ Google Sheet" (ทุกหน้า): ตัวอย่างชีตย่อทั้งกรอบ (ค่าเริ่มต้น 50%) — เห็นคอลัมน์ / แถวมากขึ้นในกรอบเดิม
      ปุ่มเลือก 40% · 50% · 60% · 75% · 100% · จำค่าต่อชีต ต่อหน้า ในเครื่อง (localStorage 'wellcon_pm_sheet_zoom')
      หมายเหตุ: Google ไม่ให้แอปอื่นสั่งซูมในชีตตรง ๆ — ใช้วิธีเปิดชีตให้กว้างขึ้นแล้วย่อทั้งกรอบ (CSS transform)
   2) ผู้บริหารสั่ง: เอากล่อง "PR / PO จาก Mango ERP" ออกจากหน้าจัดซื้อวัสดุ / Material Log / การเงิน (ข้อมูลเดิมไม่ถูกลบ)
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง (หลัง patch-proc-sheet.js)
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
const MARK = 'v1.388.0 sheet-zoom';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ย่อ Google Sheet + เอาแถบ Mango ออก)'); process.exit(0); }

const ZOOM_FN =
  "  // ===== " + MARK + ": ย่อตัวอย่าง Google Sheet ทั้งกรอบ (Google ไม่ให้สั่งซูมในชีต) — จำค่าต่อชีตในเครื่อง =====\n" +
  "  _shZoom(k, h){ let M=this.state.sheetZoom; if(!M){ try{ M=JSON.parse(localStorage.getItem('wellcon_pm_sheet_zoom')||'{}')||{}; }catch(e){ M={}; } }\n" +
  "    const Z=[0.4,0.5,0.6,0.75,1]; let z=Number(M[k]); if(Z.indexOf(z)<0) z=0.5; const i=Z.indexOf(z);\n" +
  "    const set=(v)=>{ const N={ ...M, [k]:v }; try{ localStorage.setItem('wellcon_pm_sheet_zoom', JSON.stringify(N)); }catch(e){} this.setState({ sheetZoom:N }); };\n" +
  "    return { zK:String(z), zW:(100/z).toFixed(3)+'%', zH:Math.round(h/z)+'px', zLabel:Math.round(z*100)+'%',\n" +
  "      zOpts:Z.map(v=>({ key:String(v), l:Math.round(v*100)+'%', bg:v===z?'#1C1B18':'#fff', fg:v===z?'#fff':'#4A463E', bd:v===z?'#1C1B18':'#E4DED2', onPick:()=>set(v) })),\n" +
  "      onZoomOut:()=>{ if(i>0) set(Z[i-1]); }, onZoomIn:()=>{ if(i<Z.length-1) set(Z[i+1]); } }; }\n";

const R = [
  ['แถบ Mango: ปิด',
   "    const on=pid&&['proc','procm','mat','fin','overview'].includes(S.pdTab)&&S.pdTab!=='overview';",
   "    /* " + MARK + ": ผู้บริหารสั่งเอากล่อง PR / PO จาก Mango ERP ออก (ข้อมูลเดิมยังอยู่) */ const on=false&&pid&&['proc','procm','mat','fin'].includes(S.pdTab);"],
  ['ซูม: ตัวช่วย', "  SHEET_VALS(S, pid, tab){", ZOOM_FN + "  SHEET_VALS(S, pid, tab){"],
  ['ซูม: ค่าในแถบ',
   "      hPx:H[hi]+'px', hLabel:hi<2?'ขยายความสูง ↕':'ย่อความสูง ↕',",
   "      hPx:H[hi]+'px', hLabel:hi<2?'ขยายความสูง ↕':'ย่อความสูง ↕', ...this._shZoom(selKey, H[hi]),"],
  ['ซูม: กรอบชีต',
   '<iframe src="{{ sh.embed }}" title="{{ sh.selName }}" style="width:100%;height:{{ sh.hPx }};border:1px solid #E4DED2;border-radius:12px;background:#fff"></iframe>',
   '<div style="position:relative;width:100%;height:{{ sh.hPx }};border:1px solid #E4DED2;border-radius:12px;background:#fff;overflow:hidden">' +
   '<iframe src="{{ sh.embed }}" title="{{ sh.selName }}" style="position:absolute;top:0;left:0;border:0;background:#fff;width:{{ sh.zW }};height:{{ sh.zH }};transform:scale({{ sh.zK }});transform-origin:0 0"></iframe></div>'],
  ['ซูม: ปุ่มเลือก',
   '{{ sh.hLabel }}</button>',
   '{{ sh.hLabel }}</button>' +
   '<span style="display:inline-flex;align-items:center;gap:4px;flex:none"><span style="font-size:10.5px;color:#9A948A">ซูม</span>' +
   '<sc-for list="{{ sh.zOpts }}" as="z" hint-placeholder-count="5"><button sc-camel-on-click="{{ z.onPick }}" style="border:1px solid {{ z.bd }};background:{{ z.bg }};color:{{ z.fg }};border-radius:7px;padding:2px 7px;font-family:inherit;font-size:10.5px;font-weight:700;cursor:pointer">{{ z.l }}</button></sc-for></span>'],
];
for (const [name, a, , n = 1] of R) {
  const c = t.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ย่อ Google Sheet + เอาแถบ Mango ออก: แก้ ' + R.length + ' จุด');
