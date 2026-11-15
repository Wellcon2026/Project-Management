#!/usr/bin/env node
/* =====================================================================
   v1.403.0 card-reset — ผู้บริหารสั่ง 15/11/2026: ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน → แท็บ "ตามตำแหน่ง"
   ปุ่ม "↺ คืนค่าเริ่มต้นของตำแหน่งนี้" ในทุกตำแหน่ง — คืนทุกอย่างในครั้งเดียว
     node scripts/patch-card-reset.js        (รันหลัง patch-card-drag.js)
   · คืน: การ์ดที่แสดง · ลำดับการ์ด · สวิตช์ฟังก์ชัน ของตำแหน่งที่เลือก → ชุดเริ่มต้นที่ออกแบบไว้
   · ปุ่มเห็นตลอด (เดิม "คืนชุดการ์ดเริ่มต้น" โผล่เฉพาะตอนปรับแล้ว และคืนเฉพาะการ์ด) · ตำแหน่งที่ยังไม่ปรับ = ปุ่มสีจาง กดแล้วแจ้งว่าใช้ค่าเริ่มต้นอยู่แล้ว
   · กดแล้วถามยืนยันก่อน · การตั้งค่ารายคนไม่เปลี่ยน · ปุ่ม "คืนค่าฟังก์ชันเริ่มต้น" (เฉพาะฟังก์ชัน) ยังอยู่ตามเดิม
   ข้อมูลเดิม: workPages[ตำแหน่ง] / featRole[ตำแหน่ง] (ลบคีย์ของตำแหน่ง ผ่าน _workSave / _stKeySet เดิม) — ไม่มีคีย์ใหม่ · ไม่ต้องรัน SQL
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
const MARK = 'v1.403.0 card-reset';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (คืนค่าเริ่มต้นของตำแหน่ง)'); process.exit(0); }
if (!t.includes('v1.402.0 card-drag')) { console.error('✗ ต้องรัน scripts/patch-card-drag.js ก่อน'); process.exit(1); }

// ก) ตรรกะ: ต่อท้ายตัวคืนชุดการ์ดเดิม
const L_OLD = "out.ccRoleCust=cust; out.onCcRoleReset=()=>{ this._workSave(rk,undefined); this.showToast('คืนชุดการ์ดเริ่มต้นของ '+RD[rk].label.split(' · ')[0]+' แล้ว'); };";
const L_NEW = L_OLD +
  "\n      // " + MARK + ": คืนค่าเริ่มต้นทั้งตำแหน่ง (การ์ด · ลำดับ · ฟังก์ชัน) — ถามยืนยันก่อน · ไม่แตะค่ารายคน" +
  "\n      { const RF0=(S.featRole||{})[rk]||{}; const fc=Object.keys(RF0).length>0; const any=cust||fc; const ask=any&&S.ccRst===rk; const nm=RD[rk].label.split(' · ')[0];" +
  "\n        out.ccRstBd=any?'#1C1B18':'#E4DED2'; out.ccRstBg=any?'#1C1B18':'#fff'; out.ccRstFg=any?'#C9A961':'#B5AE9F'; out.ccRstShow=ask;" +
  "\n        out.ccRstTxt='คืนค่าเริ่มต้นของตำแหน่ง '+nm+' ทั้งหมด?';" +
  "\n        out.ccRstNote='การ์ดที่แสดง · ลำดับการ์ด · สวิตช์ฟังก์ชัน ของตำแหน่งนี้จะกลับเป็นชุดเริ่มต้นที่ออกแบบไว้ · การตั้งค่ารายคนไม่เปลี่ยน';" +
  "\n        out.onCcRstAsk=()=>{ if(!any){ this.showToast('ตำแหน่ง '+nm+' ใช้ค่าเริ่มต้นอยู่แล้ว'); return; } this.setState({ ccRst:ask?'':rk }); };" +
  "\n        out.onCcRstNo=()=>this.setState({ ccRst:'' });" +
  "\n        out.onCcRstYes=()=>{ if(cust) this._workSave(rk,undefined); if(fc) this._stKeySet('featRole', rk, ''); this.setState({ ccRst:'' }); this.showToast('คืนค่าเริ่มต้นของตำแหน่ง '+nm+' แล้ว'); }; }";

// ข) หน้าจอ: ปุ่มเดิม (เฉพาะตอนปรับแล้ว) → ปุ่มใหม่เห็นตลอด + กล่องยืนยัน
const BTN = 'font-size:11.5px;font-weight:700;padding:7px 12px;border-radius:9px;cursor:pointer;font-family:inherit';
const T_OLD = '<sc-if value="{{ ccRoleCust }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ onCcRoleReset }}" style="border:1px solid #E4DED2;background:#fff;color:#8A7657;font-size:11px;font-weight:700;padding:6px 11px;border-radius:9px;cursor:pointer;font-family:inherit">คืนชุดการ์ดเริ่มต้น</button></sc-if>';
const T_NEW = '<!-- ' + MARK + ' --><button sc-camel-on-click="{{ onCcRstAsk }}" title="คืนการ์ด ลำดับ และฟังก์ชันของตำแหน่งนี้เป็นชุดเริ่มต้น" style="border:1px solid {{ ccRstBd }};background:{{ ccRstBg }};color:{{ ccRstFg }};' + BTN + '">↺ คืนค่าเริ่มต้นของตำแหน่งนี้</button>' +
  '<sc-if value="{{ ccRstShow }}" hint-placeholder-val="{{ false }}"><div style="flex:1 1 100%;border:1px dashed #C9A961;background:#FBF3E2;border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:7px">' +
  '<span style="font-size:11.5px;font-weight:700;color:#6E5424">{{ ccRstTxt }}</span>' +
  '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
  '<button sc-camel-on-click="{{ onCcRstYes }}" style="border:1px solid #1C1B18;background:#1C1B18;color:#fff;' + BTN + '">คืนค่าเริ่มต้น</button>' +
  '<button sc-camel-on-click="{{ onCcRstNo }}" style="border:1px solid #E4DED2;background:#fff;color:#8A7657;' + BTN + '">ยกเลิก</button>' +
  '</div><span style="font-size:10px;color:#8C877D;line-height:1.5">{{ ccRstNote }}</span></div></sc-if>';

const R = [
  ['ตรรกะคืนค่าเริ่มต้นทั้งตำแหน่ง', L_OLD, L_NEW],
  ['ปุ่มคืนค่าเริ่มต้นของตำแหน่ง', T_OLD, T_NEW],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ คืนค่าเริ่มต้นของตำแหน่ง: แก้ ' + R.length + ' จุด');
