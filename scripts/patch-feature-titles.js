#!/usr/bin/env node
/* =====================================================================
   v1.448.0 en-title — การ์ด / เมนูซ้าย: ชื่ออังกฤษเป็นหัวข้อ · ไทยอธิบายด้านล่าง (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-feature-titles.js        (รันหลัง patch-feature-names.js)
   - ตัวอย่าง: "PDF Maker" (หัวข้อ) / "แก้ไขเอกสาร" (บรรทัดล่าง) — ชื่อ + คำอธิบายมาจาก wcfn.js (WCFN.title / WCFN.desc)
   - ฟังก์ชันที่ยังไม่มีในรายชื่อ → ใช้ชื่อเดิม ไม่มีบรรทัดไทย
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const FN_VER = '1.2.2';   // 1.1.2: Role Home → My Space · 1.1.1: + Level Gate
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.448.0 en-title';
const verFix = () => { const re = /wcfn\.js\?v=[0-9.]+/; const m = t.match(re); if (m && m[0] !== 'wcfn.js?v=' + FN_VER) { t = t.replace(re, 'wcfn.js?v=' + FN_VER); return true; } return false; };
if (t.includes(MARK)) { if (verFix()) { lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl)); console.log('✓ อัปเดตเวอร์ชัน wcfn.js → ' + FN_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (en-title)'); process.exit(0); }
if (!t.includes('v1.447.0 feature-names')) { console.error('✗ ต้องรัน scripts/patch-feature-names.js ก่อน'); process.exit(1); }
const edits = [
  ['เมธอด FNT / FNTH', "  FN(key,label){ try{",
    "  FNT(key,label){ try{ return (typeof window!=='undefined'&&window.WCFN&&window.WCFN.title)?window.WCFN.title(key,label):label; }catch(e){ return label; } }   /* " + MARK + " */\n"
    + "  FNTH(key){ try{ return (typeof window!=='undefined'&&window.WCFN&&window.WCFN.desc&&window.WCFN.desc(key))||''; }catch(e){ return ''; } }\n  FN(key,label){ try{"],
  ['เมนูซ้าย: ข้อมูล', "fn:this.FN('nav:'+key,label),", "fn:this.FN('nav:'+key,label), ttl:this.FNT('nav:'+key,label), th:this.FNTH('nav:'+key),"],
  ['การ์ด: ข้อมูล', "fn:this.FN(t.key,t.label),", "fn:this.FN(t.key,t.label), ttl:this.FNT(t.key,t.label), th:this.FNTH(t.key),"],
  ['แม่แบบ: เมนูซ้าย', '>{{ n.label }}</span><span class="wcfn wcfn-d" data-fn="{{ n.fn }}">{{ n.fn }}</span>',
    '>{{ n.ttl }}</span><span class="wcfn wcfn-d" data-fn="{{ n.th }}">{{ n.th }}</span>'],
  ['แม่แบบ: การ์ด', '{{ t.label }}<span class="wcfn" data-fn="{{ t.fn }}">{{ t.fn }}</span></span>',
    '{{ t.ttl }}</span><span class="wcth" data-th="{{ t.th }}">{{ t.th }}</span>'],
  ['เมนูซ้าย: รายการที่ไม่ใช่เมนูหลัก (โครงการ · ปักหมุด) ใช้ชื่อเดิม', "navGroups.forEach(g=>g.items.forEach(x=>{ if(!x.icoColor){",
    "navGroups.forEach(g=>g.items.forEach(x=>{ if(x.ttl==null) x.ttl=x.label; if(x.th==null) x.th=''; }));   /* " + MARK + " */\n    navGroups.forEach(g=>g.items.forEach(x=>{ if(!x.icoColor){"],
  ['CSS', '.wcfn:empty,.wcfn[data-fn=""]{display:none!important}',
    '.wcfn:empty,.wcfn[data-fn=""]{display:none!important}.wcth{display:block;margin-top:-4px;font-size:12.5px;font-weight:700;line-height:1.35;color:#7A6232}.wcth:empty,.wcth[data-th=""]{display:none!important}'],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
verFix();
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ en-title: ' + edits.length + ' จุด · wcfn.js?v=' + FN_VER);
