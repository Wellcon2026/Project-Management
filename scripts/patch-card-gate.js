#!/usr/bin/env node
/* =====================================================================
   v1.434.0 card-gate — หน้าแรก: ไม่โชว์การ์ดที่ Admin ปิด แม้ข้อมูลสิทธิ์ยังโหลดไม่เสร็จ (ผู้บริหารแจ้ง 20/11/2026)
     node scripts/patch-card-gate.js        (รันหลัง patch-pricebook-menu.js)
   ปัญหา: มือถือ PM เห็นการ์ด แจ้งล่าช้า · Handover · ออกหนังสือ · ปฏิทิน ที่ "ปิดทั้งระบบ" อยู่
     — ตอนนั้นเครื่องยังไม่ได้ค่าสิทธิ์จากเซิร์ฟเวอร์ (app_state workPages / featGlobal) จึงใช้ "ชุดเริ่มต้น" ในโค้ด
   แก้:
   1) รอผลดึงสิทธิ์รอบนี้ (app_state) สำเร็จก่อน จึงแสดงการ์ด — ระหว่างรอ / ดึงไม่สำเร็จ ขึ้นข้อความ + ปุ่ม "ลองอีกครั้ง"
      (ยกเว้นในเครื่องมีสิทธิ์ที่เคยได้จากเซิร์ฟเวอร์แล้ว: ชุดการ์ดของตำแหน่ง + สวิตช์ปิดทั้งระบบ → ใช้ชุดนั้นระหว่างรอ / ออฟไลน์)
   2) การ์ดหน้าในโครงการ / เมนู ตรวจสวิตช์ "ปิดทั้งระบบ" + สิทธิ์ตำแหน่งตรง ๆ ทุกใบ (ไม่พึ่งรายการเมนูรอบก่อน)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.434.0 card-gate';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (card-gate)'); process.exit(0); }
if (!t.includes('v1.432.0 pricebook')) { console.error('✗ ต้องรัน scripts/patch-pricebook-menu.js ก่อน'); process.exit(1); }

const R = [
  ['การ์ดหน้าในโครงการ: ตรวจสวิตช์ตรง',
   "if(key.indexOf('tab:')===0){ const k=key.slice(4); const l=lab(k); if(!l) return null;",
   "if(key.indexOf('tab:')===0){ const k=key.slice(4); if(this._featGOff(key)||!this._pgAllowed(k)) return null; const l=lab(k); if(!l) return null;   /* " + MARK + " */"],
  ['การ์ดเมนู: ตรวจสวิตช์ตรง',
   "if(key.indexOf('nav:')===0){ const k=key.slice(4); const n=NM[k]; if(!n||n.locked) return null;",
   "if(key.indexOf('nav:')===0){ const k=key.slice(4); const n=NM[k]; if(!n||n.locked||this._featGOff(key)) return null;"],
  ['รอสิทธิ์จากเซิร์ฟเวอร์ก่อนแสดงการ์ด',
   "const tiles0=list.map(info)",
   "const _permWait=!!this._sb&&this._stPulledOk!==true&&!(Array.isArray((S.workPages||{})[rk])&&S.featGlobal&&typeof S.featGlobal==='object'&&Object.keys(S.featGlobal).length>0);   /* " + MARK + ": ยังไม่ได้สิทธิ์จากเซิร์ฟเวอร์รอบนี้ และในเครื่องไม่มีสิทธิ์ที่เคยได้ → ไม่โชว์ชุดเริ่มต้น */\n    const tiles0=(_permWait?[]:list).map(info)"],
  ['ข้อความระหว่างรอสิทธิ์',
   "    out.workTitle=_prev?(ttl+' · '+rLabel):(ttl+(nm?(' · คุณ'+nm):''));",
   "    out.workTitle=_prev?(ttl+' · '+rLabel):(ttl+(nm?(' · คุณ'+nm):''));\n    out.wkPermWait=_permWait; out.wkPermMsg=this._stPulledOk===false?'โหลดสิทธิ์การใช้งานจากเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจอินเทอร์เน็ต แล้วกด “ลองอีกครั้ง”':'กำลังโหลดสิทธิ์การใช้งานจากเซิร์ฟเวอร์…'; out.onWkPermRetry=()=>{ if(this._wkPermBusy) return; this._wkPermBusy=true; this.showToast('กำลังโหลดสิทธิ์…'); Promise.resolve(this.sbPull(false)).catch(()=>{}).then(()=>{ this._wkPermBusy=false; this.forceUpdate(); }); };   // " + MARK],
  ['กล่องข้อความระหว่างรอสิทธิ์ (หน้าแรก)',
   '<div style="font-size:13px;color:#B6AE9B;margin-top:8px;line-height:1.6;text-wrap:pretty">{{ workSub }}</div>',
   '<div style="font-size:13px;color:#B6AE9B;margin-top:8px;line-height:1.6;text-wrap:pretty">{{ workSub }}</div>\n          <sc-if value="{{ wkPermWait }}" hint-placeholder-val="{{ false }}"><div data-wk-perm="1" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;background:rgba(201,169,97,.14);border:1px solid rgba(201,169,97,.45);border-radius:12px;padding:10px 12px"><span style="flex:1;min-width:180px;font-size:13px;color:#F4EFE6;line-height:1.55">🔒 {{ wkPermMsg }}</span><button sc-camel-on-click="{{ onWkPermRetry }}" style="flex:none;border:0;background:#C9A961;color:#1C1B18;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:inherit">ลองอีกครั้ง</button></div></sc-if><!-- ' + MARK + ' -->'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ card-gate: แก้ ' + R.length + ' จุด');
