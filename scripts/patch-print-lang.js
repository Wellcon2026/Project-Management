#!/usr/bin/env node
/* =====================================================================
   เลือกภาษาก่อนพิมพ์ — ไทย / English / ไทย + English (สองภาษา)
     node scripts/patch-print-lang.js
   - หนังสือแจ้งล่าช้า (Early Warning) · รายงานตรวจ Defect · รายการ Defect ก่อน-หลังแก้ (พิมพ์)
   - แปลเฉพาะข้อความแบบฟอร์ม (หัวข้อ · ป้าย · สถานะ · สาเหตุ · ย่อหน้ามาตรฐาน) — ข้อความที่ผู้ใช้พิมพ์เอง พิมพ์ตามที่กรอก
   - English: วันที่ไทย (9 พ.ย. 2569) → 9 Nov 2026 · จำภาษาที่เลือกล่าสุดไว้ในเครื่อง
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
if (t.includes('_trDoc(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เลือกภาษาก่อนพิมพ์)'); process.exit(0); }
const METHODS = String.raw`  // ===== v1.367.0 print-lang: เลือกภาษาก่อนพิมพ์ (ไทย / English / สองภาษา) — แปลเฉพาะข้อความแบบฟอร์ม ข้อความที่ผู้ใช้พิมพ์คงเดิม =====
  _pickPrintLang(cb){ if(typeof document==='undefined'){ cb('th'); return; } const old=document.getElementById('wc-plang'); if(old) old.remove();
    let last=''; try{ last=window.localStorage.getItem('wellcon_print_lang')||''; }catch(e){}
    const w=document.createElement('div'); w.id='wc-plang';
    const B=(l,tx)=>'<button data-l="'+l+'" style="min-height:48px;border-radius:12px;border:1px solid '+(last===l?'#C9A961':'#E4DED2')+';background:#FBF8F1;font:inherit;font-weight:700;font-size:15px;cursor:pointer;text-align:left;padding:0 14px">'+tx+'</button>';
    w.innerHTML='<div data-x="1" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2147483000"></div><div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483001;width:min(340px,calc(100vw - 32px));background:#fff;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:8px;box-shadow:0 18px 50px rgba(0,0,0,.25);font-family:inherit">'
      +'<b style="font-size:16px">พิมพ์เอกสาร · เลือกภาษา</b><small style="color:#8C877D;margin:-6px 0 6px">Print · choose language</small>'
      +B('th','🇹🇭 ภาษาไทย')+B('en','🇬🇧 English')+B('both','🇹🇭🇬🇧 ไทย + English (สองภาษา)')
      +'<button data-l="" style="min-height:44px;border-radius:12px;border:1px solid #E4DED2;background:#fff;color:#8C877D;font:inherit;font-weight:600;cursor:pointer">ยกเลิก</button></div>';
    document.body.appendChild(w);
    w.addEventListener('click',(e)=>{ const b=e.target.closest('button'); if(!b&&!e.target.getAttribute('data-x')) return; const l=b?b.getAttribute('data-l'):''; w.remove();
      if(l){ try{ window.localStorage.setItem('wellcon_print_lang',l); }catch(x){} cb(l); } }); }
  _PRINT_DICT(){ return {
    'เรื่อง':'Subject','วันที่เกิดเหตุ':'Date of event','สาเหตุ':'Cause','พื้นที่ / งานที่กระทบ':'Affected area / works','กระทบสายงานวิกฤต (critical path)':'Critical path impact','หลักฐาน':'Evidence',
    'เพื่อรักษากำหนดเปิดดำเนินการของโครงการ บริษัทฯ ขอเสนอแนวทางให้ท่านพิจารณาเลือก 1 ข้อ ภายใน 7 วันนับจากวันที่ได้รับหนังสือนี้:':'To protect the project opening date, we propose the following options. Kindly select one (1) option within 7 days of receiving this notice:',
    'เร่งงาน (ทำงานล่วงเวลา / เพิ่มทีม / ปรับลำดับงาน) เพื่อชดเชยเวลาที่เสียไป':'Accelerate the works (overtime / additional crews / re-sequencing) to recover the lost time.',
    'ทยอยส่งมอบพื้นที่ที่พร้อมก่อน ให้ Operator เริ่ม pre-opening ได้ ส่วนที่กระทบส่งตามมา':'Hand over the ready areas first so the operator can start pre-opening; the affected areas follow.',
    'ผู้เสนอ · Wellcon Interior':'Proposed by · Wellcon Interior','ผู้อนุมัติ · Owner / ผู้แทน':'Approved by · Owner / Representative','เลือกทางเลือก ☐A ☐B ☐C':'Selected option ☐A ☐B ☐C',
    'รักษาวันส่งมอบเดิม':'Keep the original handover date','ส่งมอบเป็นโซน':'Phased handover by zone','ขยายเวลาก่อสร้าง':'Extension of working time',
    'Owner · คำสั่ง/ตัดสินใจช้า':'Owner · late instruction / decision','แบบ / Designer อนุมัติช้า':'Late drawings / designer approval','MEP / ผู้รับเหมาอื่น':'MEP / other contractors','งานโครงสร้าง / พื้นที่ไม่พร้อม':'Structure / area not ready',
    'ของ Owner supply ล่าช้า':'Late owner-supplied items','งานเพิ่ม VO / SI':'Variation works (VO / SI)','หน่วยงานราชการ / อาคาร':'Authorities / building management','เหตุสุดวิสัย / สภาพอากาศ':'Force majeure / weather','Wellcon (ฝั่งเรา)':'Wellcon','Subcon ของเรา':'Our subcontractor',
    'ทั้งหมด':'Total','ตรวจผ่าน':'Passed','ยังไม่ปิด':'Open','เร่งด่วนค้าง':'Urgent open','พื้นที่':'Area','รายการ':'Item','ระดับ':'Priority','กำหนด':'Due','สถานะ':'Status',
    'รอแก้':'Open','กำลังแก้':'In progress','แก้แล้ว รอตรวจ':'Fixed · awaiting inspection','เร่งด่วน':'Urgent','ทั่วไป':'Normal',
    'ไม่มีรายการค้าง — ตรวจผ่านทั้งหมด':'No open items — all passed','Wellcon Interior · ผู้ส่งมอบ':'Wellcon Interior · Handed over by','Owner · ผู้รับมอบ':'Owner · Received by',
    'เอกสารนี้ไม่แสดงราคา ต้นทุน หรือชื่อผู้รับเหมาช่วง · Wellcon Interior Co., Ltd.':'This document shows no prices, costs or subcontractor names · Wellcon Interior Co., Ltd.',
    'ลำดับ':'No.','พื้นที่ / ห้อง':'Area / room','รายการข้อบกพร่อง':'Defect','ก่อนแก้ไข · BEFORE':'BEFORE','หลังแก้ไข · AFTER':'AFTER','วันที่แก้เสร็จ':'Date fixed','ผู้ตรวจรับ':'Inspected by' }; }
  _PRINT_RX(){ const D=this._PRINT_DICT(); return [
    [/^บริษัท เวลล์คอน อินทีเรีย จำกัด · Early Warning Notice · (.*)$/, m=>'Wellcon Interior Co., Ltd. · Early Warning Notice · '+m[1]],
    [/^แจ้งเหตุล่าช้าและขอให้เลือกแนวทาง — (.*)$/, m=>'Delay Notice & Request for Decision — '+m[1]],
    [/^(ใช่|ไม่) · ประมาณ (.*) วัน$/, m=>(m[1]==='ใช่'?'Yes':'No')+' · approx. '+m[2]+' days'],
    [/^ทางเลือก ([ABC]) · (.*)$/, m=>'Option '+m[1]+' · '+(D[m[2]]||m[2])],
    [/^ค่าใช้จ่ายเร่งงาน (.*)$/, m=>'Acceleration cost '+m[1]], [/^ค่า Preliminary (.*)$/, m=>'Preliminaries '+m[1]], [/^ค่าใช้จ่าย (.*)$/, m=>'Cost '+m[1]],
    [/^ขยายกำหนดแล้วเสร็จ (.*) วัน พร้อมค่าดำเนินการ \(Preliminary\) ช่วงที่ขยาย$/, m=>'Extend the completion date by '+m[1]+' days, including preliminaries for the extended period.'],
    [/^รายงานตรวจ Defect · (.*)$/, m=>'Defect Inspection Report · '+m[1]], [/^ออกรายงาน (.*)$/, m=>'Issued '+m[1]], [/^รายการที่ยังไม่ปิด \((\d+)\)$/, m=>'Open items ('+m[1]+')'],
    [/^(.*) · ตรวจข้อบกพร่อง ก่อน-หลังแก้ไข · (.*) · (\d+) รายการ$/, m=>m[1]+' · Defect inspection, before / after · '+m[2]+' · '+m[3]+' items'],
    [/^ผู้ส่งมอบ · Wellcon Interior:(.*)วันที่(.*)$/, m=>'Handed over by · Wellcon Interior:'+m[1]+'Date'+m[2]], [/^ผู้รับมอบ · Owner \/ PM:(.*)วันที่(.*)$/, m=>'Received by · Owner / PM:'+m[1]+'Date'+m[2]],
    [/^วันที่ (.*)$/, m=>'Date '+m[1]] ]; }
  _trDoc(html, lang){ if(!lang||lang==='th'||typeof DOMParser==='undefined') return html;
    try{ const doc=new DOMParser().parseFromString(html,'text/html'); const D=this._PRINT_DICT(), RX=this._PRINT_RX(), EN=lang==='en';
      const MON={ 'ม.ค.':'Jan','ก.พ.':'Feb','มี.ค.':'Mar','เม.ย.':'Apr','พ.ค.':'May','มิ.ย.':'Jun','ก.ค.':'Jul','ส.ค.':'Aug','ก.ย.':'Sep','ต.ค.':'Oct','พ.ย.':'Nov','ธ.ค.':'Dec' };
      const dt=(s)=>String(s).replace(/(\d{1,2}) (ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.) (\d{4})/g,(a,d,mo,y)=>d+' '+MON[mo]+' '+(Number(y)>2400?Number(y)-543:y));
      const tr=(s)=>{ const k=s.trim(); if(!k) return null; if(D[k]) return D[k]; for(const [re,f] of RX){ const m=k.match(re); if(m) return f(m); } return null; };
      const walk=(n)=>{ if(n.nodeType===3){ const en=tr(n.nodeValue); if(en==null){ if(EN) n.nodeValue=dt(n.nodeValue); return; }
          if(EN){ n.nodeValue=dt(en); return; } const th=n.nodeValue.trim();
          if(th.length+en.length<=60){ n.nodeValue=th+' / '+en; return; }
          const sp=doc.createElement('span'); sp.setAttribute('style','display:block;color:#555;font-style:italic;font-size:.94em'); sp.textContent=en;
          n.parentNode.insertBefore(sp, n.nextSibling); return; }
        if(n.nodeType===1&&/^(SCRIPT|STYLE)$/.test(n.nodeName)) return; Array.prototype.slice.call(n.childNodes).forEach(walk); };
      walk(doc.body); const ti=doc.querySelector('title'); if(ti){ const en=tr(ti.textContent); if(en!=null) ti.textContent=EN?en:(ti.textContent+' / '+en); }
      doc.documentElement.setAttribute('lang', EN?'en':'th');
      return '<!doctype html>'+doc.documentElement.outerHTML; }catch(e){ return html; } }
`;
const E = [
  ['เมธอดเลือกภาษา', "  dlyLetter(id){ const x=(this.state.delays||{})[id]; if(!x) return;", (a) => METHODS + "  dlyLetter(id, lang){ if(!lang){ this._pickPrintLang(l=>this.dlyLetter(id,l)); return; } const x=(this.state.delays||{})[id]; if(!x) return;"],
  ['หนังสือแจ้งล่าช้า · แปลก่อนเขียน', "w.document.write('<!doctype html><html><head><meta charset=\"utf-8\"><title>'+esc(x.code)+' · Early Warning</title>", () => "w.document.write(this._trDoc('<!doctype html><html><head><meta charset=\"utf-8\"><title>'+esc(x.code)+' · Early Warning</title>"],
  ['หนังสือแจ้งล่าช้า · ปิดวงเล็บ', "<\\/script></body></html>');\n    w.document.close(); this._stKeySet('delays', id,", () => "<\\/script></body></html>', lang));\n    w.document.close(); this._stKeySet('delays', id,"],
  ['รายงาน / รายการ Defect · เลือกภาษา', "  _printViaFrame(html, title){ if(typeof document==='undefined') return;", () => "  _printViaFrame(html, title, lang){ if(typeof document==='undefined') return; if(lang===undefined){ this._pickPrintLang(l=>this._printViaFrame(html, title, l)); return; } html=this._trDoc(html, lang);"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เลือกภาษาก่อนพิมพ์: หนังสือแจ้งล่าช้า · รายงาน Defect · รายการ Defect');
