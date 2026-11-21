#!/usr/bin/env node
/* =====================================================================
   v1.447.0 feature-names — ชื่อเรียกฟังก์ชัน (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-feature-names.js        (รันหลัง patch-project-setup.js)
   - รายชื่อกลางอยู่ที่ wcfn.js (window.WCFN) — อ้างด้วย key ภายใน ไม่ผูกกับชื่อไทย
   - ป้ายชื่อเรียกอังกฤษสั้น ๆ ข้างชื่อไทย: เมนูซ้าย · การ์ดหน้าแรก · ค้นหาด่วน Ctrl+K · ตัวเลือกหน้าในโครงการ
   - ค้นหาด่วนพิมพ์ชื่อเรียกอังกฤษได้ (เช่น "setup", "billing")
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const FN_VER = '1.0.0';
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.447.0 feature-names';
if (t.includes(MARK)) {
  console.log('✓ มีแล้ว — ไม่ต้องแก้ (feature-names) · เวอร์ชัน wcfn.js ดูแลโดย patch-feature-titles.js');
  process.exit(0);
}
if (!t.includes('v1.443.0 project-setup')) { console.error('✗ ต้องรัน scripts/patch-project-setup.js ก่อน'); process.exit(1); }
const C = '/* ' + MARK + ' */';
const FNX = (k, l) => "this.FN(" + k + "," + l + ")";
const edits = [
  ['หัวหน้า: โหลด wcfn.js', '<script src="/wcsetup.js?v=1.2.0"></script><!-- v1.443.0 project-setup -->',
    '<script src="/wcsetup.js?v=1.2.0"></script><!-- v1.443.0 project-setup -->\n<script src="/wcfn.js?v=' + FN_VER + '"></script><!-- ' + MARK + ' -->\n'
    + '<style data-wc-fn="1">.wcfn{display:inline-block;vertical-align:1px;margin-left:6px;font:700 11px/1.45 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;color:#7A6232;background:#F5EDDB;border:1px solid #E6D6B0;border-radius:6px;padding:0 6px;white-space:nowrap;text-transform:none}'
    + '.wcfn:empty,.wcfn[data-fn=""]{display:none!important}.wcfn-d{display:block;margin:1px 0 0;padding:0;background:none;border:0;border-radius:0;font-size:11px;font-weight:600;line-height:1.2;color:#8E876F;letter-spacing:.03em;overflow:hidden;text-overflow:ellipsis}</style>'],
  ['เมธอด FN', '  _scResolve(id){',
    "  FN(key,label){ try{ return (typeof window!=='undefined'&&window.WCFN&&window.WCFN.of(key,label))||''; }catch(e){ return ''; } }   " + C + "\n  _scResolve(id){"],
  ['เมนูซ้าย (navDef)', "return { key,label,path, badge:locked?", "return { key,label,path, fn:" + FNX("'nav:'+key", 'label') + ", badge:locked?"],
  ['การ์ดหน้าแรก', "const tiles=tiles0.map((t,i)=>({ ...t, ", "const tiles=tiles0.map((t,i)=>({ ...t, fn:" + FNX('t.key', 't.label') + ", "],
  ['ค้นหาด่วน: เมนู', "return { id:s, kind:'nav', label:n.label, sub:c.l,", "return { id:s, kind:'nav', label:n.label, fn:" + FNX("'nav:'+k", 'n.label') + ", sub:c.l,"],
  ['ค้นหาด่วน: หน้าในโครงการ', "return { id:s, kind:'tab', label:def?def[1]:k, sub:p.name,", "return { id:s, kind:'tab', label:def?def[1]:k, fn:" + FNX("'tab:'+k", 'def?def[1]:k') + ", sub:p.name,"],
  ['ค้นหาด่วน: ค้นชื่อเรียก', "const hit=(r)=>!q||(r.label+' '+r.sub).toLowerCase().indexOf(q)>=0;",
    "const hit=(r)=>!q||(r.label+' '+r.sub+' '+(r.fn||'')).toLowerCase().indexOf(q)>=0;   " + C],
  ['ค้นหาด่วน: แถว', "return { key:r.id+'_'+i, labelEl:this._hl(r.label,q),", "return { key:r.id+'_'+i, fn:r.fn||'', labelEl:this._hl(r.label,q),"],
  ['ตัวเลือกหน้าในโครงการ (กลุ่มที่ตั้งเอง)', "out[idx[g]].opts.push({ value:k, label:l });",
    "out[idx[g]].opts.push({ value:k, label:l+(" + FNX("'tab:'+k", 'l') + "?'  — '+" + FNX("'tab:'+k", 'l') + ":'') });"],
  ['ตัวเลือกหน้าในโครงการ (กลุ่มมาตรฐาน)', ".map(g=>({ label:g, opts:pdTabDefs.filter(([k])=>_tabGrp[k]===g).map(([value,label])=>({value,label})) }))",
    ".map(g=>({ label:g, opts:pdTabDefs.filter(([k])=>_tabGrp[k]===g).map(([value,label])=>({value,label:label+(" + FNX("'tab:'+value", 'label') + "?'  — '+" + FNX("'tab:'+value", 'label') + ":'')})) }))"],
  ['แม่แบบ: เมนูซ้าย (ชื่อไทยบรรทัดบน · ชื่อเรียกบรรทัดล่าง)', '<span style="flex:1;min-width:0;font-size:13px;color:{{ n.color }};font-weight:{{ n.weight }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ n.label }}</span>',
    '<span style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center"><span style="min-width:0;font-size:13px;color:{{ n.color }};font-weight:{{ n.weight }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ n.label }}</span><span class="wcfn wcfn-d" data-fn="{{ n.fn }}">{{ n.fn }}</span></span>'],
  ['แม่แบบ: การ์ดหน้าแรก', '<span style="font-size:14px;font-weight:800;color:#1C1B18;line-height:1.3;text-wrap:pretty">{{ t.label }}</span>',
    '<span style="font-size:14px;font-weight:800;color:#1C1B18;line-height:1.3;text-wrap:pretty">{{ t.label }}<span class="wcfn" data-fn="{{ t.fn }}">{{ t.fn }}</span></span>'],
  ['แม่แบบ: ค้นหาด่วน', 'text-overflow:ellipsis">{{ r.labelEl }}</span>', 'text-overflow:ellipsis">{{ r.labelEl }}<span class="wcfn" data-fn="{{ r.fn }}">{{ r.fn }}</span></span>'],
];
for (const [n, a] of edits) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1)'); process.exit(1); } }
for (const [, a, b] of edits) t = t.replace(a, () => b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ feature-names: ' + edits.length + ' จุด · wcfn.js?v=' + FN_VER);
