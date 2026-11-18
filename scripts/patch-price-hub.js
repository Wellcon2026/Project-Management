#!/usr/bin/env node
/* =====================================================================
   v1.429.0 price-hub — การ์ดหน้าแรก "ทำราคา · เลือกเครื่องมือ" (ผู้บริหารสั่ง 18/11/2026)
     node scripts/patch-price-hub.js        (รันหลัง patch-photo-menu.js)
   เหตุผล: ทีมสับสนว่าทำราคาใช้ตัวไหน (QS Take-off · Takeoff วัดหน้างาน · Quotation Maker · Claim · VO Tracker)
     → ไม่รวมแอป แต่ทำทางเข้าเดียว เรียงตามขั้น: ① วัดปริมาณ → ② ทำราคาเสนอลูกค้า → ③ เรียกเก็บค่าเสียหาย → ④ ติดตามจนเข้าสัญญา
   1) การ์ด 'tab:price' (ต้องเลือกโครงการ) + เมนูในโครงการ "ทำราคา · เลือกเครื่องมือ" → หน้าต่างเลือกเครื่องมือ `_priceHub(pid)` — แสดงเฉพาะเครื่องมือที่ผู้ใช้มีสิทธิ์
      (ใช้ _pgAllowed · _featGOff · _featPOff · moneyOk ชุดเดียวกับการ์ดจริง) · เครื่องมือที่ไม่มีสิทธิ์แสดงจาง พร้อมบอกเหตุผล
   2) Quotation Maker: ปุ่มเริ่มใบใหม่ตามประเภทงานได้ทันที (/quotation.html?pid=…&new=1&kind=area|furn|damage|dco)
   3) ปิดทั้งระบบได้ที่สวิตช์ 'tab:price' (featGlobal) · ใส่การ์ดให้ตำแหน่งที่ Admin ตั้งค่า (ตารางสิทธิ์ตามตำแหน่ง)
   - ไม่มีตาราง / SQL ใหม่ · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.429.0 price-hub';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (การ์ดทำราคา)'); process.exit(0); }
if (!t.includes('v1.420.0 photo-menu')) { console.error('✗ ต้องรัน scripts/patch-photo-menu.js ก่อน'); process.exit(1); }

const ICON = 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01';

// หน้าต่างเลือกเครื่องมือ (DOM ล้วน · ไม่ผูก template) — ปิดด้วย ✕ / Esc / คลิกพื้นหลัง
const HUB = `  _priceHub(pid){   // ${MARK}
    if(!pid){ this.showToast('เลือกโครงการก่อน'); return; }
    const S=this.state, p=(S.projects||[]).find(x=>x.id===pid)||{}, esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const defs=this._lastTabDefs||[], money=this.moneyOk();
    const why=(k, mny)=>{ if(this._featGOff('tab:'+k)) return 'ปิดทั้งระบบอยู่'; if(this._featPOff(pid,'tab:'+k)) return 'ปิดไว้สำหรับโครงการนี้'; if(mny&&!money) return 'ต้องมีสิทธิ์ดูตัวเลขเงินโครงการ'; if(!this._pgAllowed(k)||(defs.length&&!defs.some(d=>d[0]===k))) return 'ยังไม่ได้เปิดให้ตำแหน่งของคุณ'; return ''; };
    const stg=this.IS_STAGING(), qUrl=(kind)=>'/quotation.html?pid='+encodeURIComponent(pid)+'&new=1&kind='+kind+(stg?'&env=staging':'');
    const G=[
      ['1','วัดปริมาณ','ยังไม่มีราคา — ได้จำนวนไปใช้ทำราคา',[
        { k:'qm', t:'Takeoff · วัดหน้างาน', d:'วัดพื้นที่ / ความยาวที่หน้างานด้วยมือถือ · แบ่งขอบเขตงานตามทีม', run:()=>this._openTab(pid,'qm') },
        { k:'', t:'QS Take-off ↗ (แอปแยก)', d:'QS วัดปริมาณจากแบบ PDF ละเอียดทั้งโครงการ แล้วกด “ส่งต่อ” ให้ PM / Quotation Maker ดึงไปใช้ · เข้าสู่ระบบด้วยบัญชี QS Take-off', run:()=>{ try{ window.open('https://wellcon-qs-takeoff.vercel.app/','_blank','noopener'); }catch(e){} } } ]],
      ['2','ทำราคาเสนอลูกค้า','ที่เดียวที่ออกใบเสนอราคา — มีขั้นอนุมัติ · เอกสาร DRAFT จนกว่าจะอนุมัติ',[
        { k:'quo', mny:true, t:'Quotation Maker ↗', d:'งานไม่ซับซ้อน · AI ช่วยถอดรายการจากแบบ · ราคาจากอัตรากลาง · ส่งอนุมัติ · พิมพ์ใบเสนอราคา', run:()=>this._openTab(pid,'quo'),
          kinds:[['area','🏠 พื้นที่เดียว'],['furn','🪑 เฟอร์นิเจอร์'],['damage','🛠 ซ่อม (ลูกค้าจ้าง)'],['dco','✏️ งานเปลี่ยนแบบ']] } ]],
      ['3','เรียกเก็บค่าเสียหาย','มีคนทำงานของเราเสียหาย — เรียกเก็บจากผู้ทำ (ไม่ใช่ลูกค้าจ้างซ่อม)',[
        { k:'claim', t:'Claim · เคลมความเสียหาย ↗', d:'ถ่ายรูปหลักฐาน · คิดค่าแรง / วัสดุ / วันที่เสียไป จากอัตรากลาง · ออกหนังสือเคลม (DRAFT ให้ผู้บริหารตรวจ)', run:()=>this._openTab(pid,'claim') } ]],
      ['4','ติดตามจนเข้าสัญญา','ยื่นราคาแล้ว → ลูกค้าอนุมัติ → ออก VO เข้าสัญญา',[
        { k:'aw', mny:true, t:'งานเพิ่ม · VO Tracker', d:'ติดตามสถานะงานเพิ่ม-ลดทุกรายการ · ใบเปลี่ยนแบบจาก Quotation Maker ส่งเข้ามาที่นี่ · No Signed VO = No Additional Work', run:()=>this._openTab(pid,'aw') } ]] ];
    const old=document.getElementById('wcPriceHub'); if(old) old.remove();
    const ov=document.createElement('div'); ov.id='wcPriceHub'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','ทำราคา · เลือกเครื่องมือ');
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(28,27,24,.55);display:flex;align-items:flex-start;justify-content:center;padding:max(16px,4vh) 12px 16px;overflow:auto;font-family:inherit';
    const A=[]; let n=0;
    const row=(o)=>{ const w=o.k?why(o.k,o.mny):'', i=n++; A[i]=o; const off=!!w;
      return '<div style="border:1px solid #ECE6DA;border-radius:14px;background:'+(off?'#F7F5F0':'#fff')+';padding:12px 14px;display:flex;flex-direction:column;gap:6px;opacity:'+(off?'.6':'1')+'">'
        +'<div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b style="font-size:15px;color:#1C1B18">'+esc(o.t)+'</b><div style="font-size:12.5px;color:#6B6758;line-height:1.5;margin-top:2px">'+esc(o.d)+'</div>'+(off?'<div style="font-size:12px;color:#B4442E;margin-top:3px">'+esc(w)+'</div>':'')+'</div>'
        +(off?'':'<button data-ph="'+i+'" style="flex:none;min-height:40px;border-radius:11px;border:0;background:#1C1B18;color:#fff;font-weight:600;padding:0 14px;cursor:pointer;font-family:inherit">เปิด</button>')+'</div>'
        +(!off&&o.kinds?'<div style="display:flex;gap:6px;flex-wrap:wrap"><span style="font-size:12px;color:#6B6758;align-self:center">เริ่มใบใหม่:</span>'+o.kinds.map(k=>'<button data-phk="'+k[0]+'" style="min-height:34px;border-radius:999px;border:1.5px solid #E3DACB;background:#fff;padding:0 12px;font-size:13px;cursor:pointer;font-family:inherit">'+esc(k[1])+'</button>').join('')+'</div>':'')+'</div>'; };
    ov.innerHTML='<div style="background:#FFFDF8;border-radius:20px;width:min(640px,100%);box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden">'
      +'<div style="background:#1C1B18;color:#F6F1E8;padding:16px 18px;display:flex;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><div style="font-size:11px;letter-spacing:.2em;color:#E2BC66;font-weight:700">ทำราคา · เลือกเครื่องมือ</div><b style="font-size:18px;display:block;margin-top:2px">'+esc(p.name||'โครงการ')+'</b><div style="font-size:12.5px;color:#D9CFBD;margin-top:2px">เลือกตามขั้นของงาน — วัด → ทำราคา → เรียกเก็บ → ติดตามจนเข้าสัญญา</div></div>'
      +'<button data-phx="1" aria-label="ปิด" style="flex:none;width:40px;height:40px;border-radius:12px;border:1px solid #4A463C;background:transparent;color:#F6F1E8;font-size:18px;cursor:pointer">✕</button></div>'
      +'<div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px">'
      +G.map(g=>'<div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;gap:4px 8px;align-items:center;flex-wrap:wrap"><span style="width:24px;height:24px;border-radius:50%;background:#1C1B18;color:#E2BC66;font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex:none">'+g[0]+'</span><b style="font-size:14.5px;white-space:nowrap">'+esc(g[1])+'</b><span style="font-size:12px;color:#6B6758">'+esc(g[2])+'</span></div>'+g[3].map(row).join('')+'</div>').join('')
      +'<div style="background:#FAF1D6;color:#6B5410;border-radius:12px;padding:9px 12px;font-size:12.5px;line-height:1.55"><b>เลือกไม่ถูก?</b> ลูกค้าจ้างซ่อม → Quotation Maker (ซ่อม) · คนอื่นทำงานเราเสียหาย → Claim · งานใหญ่ / ประมูลทั้งโครงการ → ทำ BOQ ใน Excel กับฝ่ายประมาณราคา</div></div></div>';
    const close=()=>{ ov.remove(); document.removeEventListener('keydown', key); };
    const key=(e)=>{ if(e.key==='Escape') close(); };
    ov.addEventListener('click',(e)=>{ const t=e.target; if(t===ov||t.closest('[data-phx]')){ close(); return; }
      const b=t.closest('[data-ph]'); if(b){ const o=A[Number(b.getAttribute('data-ph'))]; close(); if(o) o.run(); return; }
      const k=t.closest('[data-phk]'); if(k){ close(); try{ window.location.href=qUrl(k.getAttribute('data-phk')); }catch(x){} } });
    document.addEventListener('keydown', key); document.body.appendChild(ov);
  }
`;

const R = [
  ['หน้าต่างเลือกเครื่องมือ', "  _photoOpen(){", HUB + "  _photoOpen(){"],
  ['เมนูในโครงการ', "['photo','Photo Editor · แต่งรูปผลงาน ↗']];", "['photo','Photo Editor · แต่งรูปผลงาน ↗'],['price','ทำราคา · เลือกเครื่องมือ']];"],
  ['การ์ด → หน้าต่างเลือก (_openTab)', "if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(pid); return; }", "if(k==='price'){ this._priceHub(pid); return; } if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(pid); return; }"],
  ['เมนู → หน้าต่างเลือก', "if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(_pdPid); return; }", "if(k==='price'){ this._priceHub(_pdPid); return; } if(k==='photo'){ this._photoOpen(); return; } if(k==='pdf'){ this._pdfOpen(); return; } if(k==='quo'){ this._quoOpen(_pdPid); return; }"],
  ['หมวดสี', "pdf:'sys', photo:'sys' };", "pdf:'sys', photo:'sys', price:'fin' };"],
  ['สีประจำการ์ด', "'tab:photo':'#0E7490',", "'tab:photo':'#0E7490','tab:price':'#B8582A',"],
  ['ไอคอนการ์ด', "const I={ photo:", "const I={ price:'" + ICON + "', photo:"],
  ['คำอธิบายการ์ด', "const SUB={ photo:", "const SUB={ price:'วัด → ทำราคา → เคลม → ติดตาม VO · เลือกเครื่องมือให้ถูกงาน', photo:"],
  ['การ์ด → หน้าต่างเลือก', "      if(key==='tab:photo'){",
   "      if(key==='tab:price'){ if(this._featGOff('tab:price')||!this._pgAllowed('price')) return null; const c=this.TAB_CAT('price'); return { key, label:'ทำราคา · เลือกเครื่องมือ', sub:SUB.price, path:I.price, c:c.c, d:c.d, needP:true, grp:'โครงการ', run:(pp)=>this._priceHub(pp.id) }; }   // " + MARK + "\n      if(key==='tab:photo'){"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ การ์ดทำราคา: แก้ ' + R.length + ' จุด');
