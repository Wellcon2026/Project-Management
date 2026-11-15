#!/usr/bin/env node
/* =====================================================================
   v1.402.0 card-drag — ผู้บริหารสั่ง 15/11/2026: ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน
   ลากการ์ดไปวางตำแหน่งที่ต้องการได้อิสระ (ไม่ต้องกด ▲▼ ทีละขั้น)
     node scripts/patch-card-drag.js        (รันหลัง patch-card-scope.js)
   · แท็บ "ตามตำแหน่ง" และ "รายคน" — เฉพาะรายการ "การ์ดที่แสดง"
   · คอม: กดค้างที่แถวการ์ดแล้วลาก (ขยับเกิน 6px = ลาก · ไม่ถึง = กดสวิตช์ตามเดิม)
   · มือถือ / แท็บเล็ต: ลากที่ที่จับ ⋮⋮ หน้าแถว (ส่วนอื่นของแถวยังเลื่อนหน้าจอได้)
   · เส้นสีทองบอกตำแหน่งที่จะวาง · ลากใกล้ขอบจอ หน้าจอเลื่อนตาม · ปล่อย = บันทึกทันที (ครั้งเดียว)
   · ปุ่ม ▲▼ ยังใช้ได้ตามเดิม
   ข้อมูลเดิม: workPages[ตำแหน่ง] / workUser[อีเมล] (บันทึกผ่าน save เดิมของ mk) — ไม่มีคีย์ใหม่ · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.402.0 card-drag';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ลากการ์ดจัดลำดับ)'); process.exit(0); }
if (!t.includes('v1.386.0 card-scope')) { console.error('✗ ต้องรัน scripts/patch-card-scope.js ก่อน'); process.exit(1); }

// ---------------------------------------------------------------------
// ก) ตัวลาก (pointer events — ใช้ได้ทั้งเมาส์และนิ้ว)
// ---------------------------------------------------------------------
const HELPER =
  "  // ===== " + MARK + ": ลากการ์ดไปวางตำแหน่งที่ต้องการ (ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน) =====\n" +
  "  //   n = จำนวนการ์ดที่แสดง · done(from, ins) — ins = ช่องที่จะแทรก (0..n) นับจากลำดับก่อนย้าย\n" +
  "  _ccDragStart(e, from, n, done){ if(this._ccDragOn||!e) return; if(e.pointerType==='mouse'&&e.button!==0) return;\n" +
  "    const els=()=>(this._ccEls||[]).slice(0,n); const me=els()[from]; if(!me) return;\n" +
  "    this._ccDragOn=true; const y0=e.clientY; let act=false, ins=-1, lastY=y0, raf=0;\n" +
  "    let sc=me.parentElement; while(sc&&sc!==document.body){ const cs=getComputedStyle(sc); if(/(auto|scroll)/.test(cs.overflowY)&&sc.scrollHeight>sc.clientHeight+4) break; sc=sc.parentElement; }\n" +
  "    if(!sc||sc===document.body) sc=null;\n" +
  "    const clr=()=>els().forEach(el=>{ if(el){ el.style.boxShadow=''; el.style.opacity=''; } });\n" +
  "    const mark=()=>{ const L=els(); let k=L.length; for(let i=0;i<L.length;i++){ if(!L[i]) continue; const r=L[i].getBoundingClientRect(); if(lastY<r.top+r.height/2){ k=i; break; } }\n" +
  "      ins=(k===from||k===from+1)?-1:k;\n" +
  "      L.forEach((el,i)=>{ if(!el) return; el.style.opacity=i===from?'.4':''; el.style.boxShadow=ins<0?'':(i===ins?'0 -4px 0 -1px #C9A961':(ins===L.length&&i===L.length-1?'0 4px 0 -1px #C9A961':'')); }); };\n" +
  "    const tick=()=>{ raf=0; if(!act) return; const H=window.innerHeight; const d=lastY<90?-Math.ceil((90-lastY)/5):(lastY>H-90?Math.ceil((lastY-(H-90))/5):0);\n" +
  "      if(d){ if(sc) sc.scrollTop+=d; else window.scrollBy(0,d); mark(); raf=requestAnimationFrame(tick); } };\n" +
  "    const move=(ev)=>{ lastY=ev.clientY; if(!act){ if(Math.abs(lastY-y0)<6) return; act=true; try{ document.body.style.cursor='grabbing'; }catch(x){} }\n" +
  "      try{ ev.preventDefault(); }catch(x){} mark(); if(!raf) raf=requestAnimationFrame(tick); };\n" +
  "    const end=(ev)=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); window.removeEventListener('pointercancel',end);\n" +
  "      if(raf) cancelAnimationFrame(raf); raf=0; clr(); try{ document.body.style.cursor=''; }catch(x){} this._ccDragOn=false;\n" +
  "      if(!act) return; act=false;\n" +
  "      // ลากแล้วปล่อย = ไม่ใช่การกดสวิตช์ — กันคลิกที่ตามมา 1 ครั้ง\n" +
  "      const eat=(c)=>{ try{ c.stopPropagation(); c.preventDefault(); }catch(x){} }; window.addEventListener('click',eat,true); setTimeout(()=>window.removeEventListener('click',eat,true),80);\n" +
  "      if(ev&&ev.type==='pointerup'&&ins>=0) done(from, ins); };\n" +
  "    window.addEventListener('pointermove',move,{ passive:false }); window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end); }\n";

const MK_OLD = "      const on=vis.map((k,i)=>{ const c=CAT.find(x=>x.key===k); return { key:k, label:c.label, note:c.g, no:(i+1)+'.', ...SW(true,'แสดง','ซ่อน'), upShow:true,\n";
const MK_NEW =
  "      // " + MARK + ": ลากไปวาง — ย้ายใบที่ลากไปช่อง ins (คีย์ที่ไม่อยู่ในรายการให้เลือกคงตำแหน่งเดิม เหมือน ▲▼)\n" +
  "      const drop=(from,ins)=>{ const v=vis.slice(); const x=v.splice(from,1)[0]; v.splice(ins>from?ins-1:ins,0,x); const a=list.slice(); const pos=vis.map(k=>a.indexOf(k)); pos.forEach((p,n)=>{ a[p]=v[n]; }); save(a); this.showToast('ย้ายการ์ดแล้ว'); };\n" +
  "      const on=vis.map((k,i)=>{ const c=CAT.find(x=>x.key===k); return { key:k, label:c.label, note:c.g, no:(i+1)+'.', ...SW(true,'แสดง','ซ่อน'), upShow:true,\n" +
  "        rowCur:'grab', rowRef:(el)=>{ (this._ccEls=this._ccEls||[])[i]=el; },\n" +
  "        onGrip:(e)=>{ try{ e.preventDefault(); }catch(x){} this._ccDragStart(e, i, vis.length, drop); },\n" +
  "        onRowPD:(e)=>{ if(!e||e.pointerType!=='mouse') return; const b=e.target&&e.target.closest&&e.target.closest('button'); if(b&&b.title) return; this._ccDragStart(e, i, vis.length, drop); },\n";
const OFF_OLD = "note:c.g, no:'', ...SW(false,'แสดง','ซ่อน'), upShow:false,";
const OFF_NEW = "note:c.g, no:'', ...SW(false,'แสดง','ซ่อน'), upShow:false, rowCur:'default', rowRef:()=>{}, onGrip:()=>{}, onRowPD:()=>{},";

// ---------------------------------------------------------------------
// ข) หน้าจอ — เฉพาะในส่วนการ์ด & ฟังก์ชัน
// ---------------------------------------------------------------------
const ROW_OLD = "<div style=\"display:flex;align-items:center;gap:6px;border:1px solid #EDE6D7;background:{{ c.rowBg }};border-radius:10px;padding:6px 9px\">";
const ROW_NEW = "<div ref=\"{{ c.rowRef }}\" sc-camel-on-pointer-down=\"{{ c.onRowPD }}\" style=\"display:flex;align-items:center;gap:6px;border:1px solid #EDE6D7;background:{{ c.rowBg }};border-radius:10px;padding:6px 9px;cursor:{{ c.rowCur }};user-select:none;-webkit-user-select:none;transition:box-shadow .08s ease,opacity .08s ease\">";
const GRIP_OLD = "<span style=\"display:flex;flex-direction:column;flex:none\"><button sc-camel-on-click=\"{{ c.onUp }}\"";
const GRIP_NEW = "<span sc-camel-on-pointer-down=\"{{ c.onGrip }}\" title=\"ลากเพื่อย้ายตำแหน่ง\" style=\"flex:none;align-self:stretch;display:flex;align-items:center;justify-content:center;min-width:26px;margin:-6px 0 -6px -6px;padding:0 3px;color:#B39B63;font-size:15px;font-weight:800;letter-spacing:-2px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none\">⋮⋮</span>" + GRIP_OLD;

// [ชื่อ, เดิม, ใหม่, จำนวนที่ต้องเจอ] — ทั้งไฟล์
const R = [
  ['ตัวลาก', "  CC_VALS(S){", HELPER + "  CC_VALS(S){"],
  ['รายการที่แสดง: ลากได้', MK_OLD, MK_NEW],
  ['รายการที่ซ่อน: ค่าเปล่า', OFF_OLD, OFF_NEW],
  ['ข้อความหัวรายการ', "▲▼ จัดลำดับ · กดเพื่อซ่อน", "ลากไปวางตำแหน่งที่ต้องการ หรือกด ▲▼ · กดเพื่อซ่อน", 2],
];
// [ชื่อ, เดิม, ใหม่, จำนวน] — เฉพาะในส่วนหน้าจอการ์ด & ฟังก์ชัน
const V = [
  ['แถวการ์ด: ลากได้', ROW_OLD, ROW_NEW, 4],
  ['ที่จับ ⋮⋮', GRIP_OLD, GRIP_NEW, 4],
];

const s0 = t.indexOf('<!-- v1.385.0 card-admin');
const s1 = s0 < 0 ? -1 : t.indexOf('<sc-if value="{{ engYearShow }}"', s0);
if (s0 < 0 || s1 < 0) { console.error('✗ หาส่วนหน้าจอการ์ด & ฟังก์ชันไม่เจอ — ไม่แก้อะไรเลย'); process.exit(1); }
let sec = t.slice(s0, s1);
for (const [name, a, , n = 1] of V) {
  const c = sec.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [name, a, , n = 1] of R) {
  const c = t.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, a, b] of V) sec = sec.split(a).join(b);
t = t.slice(0, s0) + sec + t.slice(s1);
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ลากการ์ดจัดลำดับ (ตั้งค่าระบบ): แก้ ' + (R.length + V.length) + ' จุด');
