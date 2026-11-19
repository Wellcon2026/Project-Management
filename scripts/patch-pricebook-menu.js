#!/usr/bin/env node
/* =====================================================================
   v1.432.0 pricebook — "ราคากลาง" ข้อมูลราคาชุดเดียวของบริษัท (ผู้บริหารสั่ง 19/11/2026)
     node scripts/patch-pricebook-menu.js        (รันหลัง patch-pricing-principles.js)
   1) การ์ดหน้าแรก 'tab:pbook' "ราคากลาง ↗" (ไม่ต้องเลือกโครงการ) → หน้าแยก /pricebook.html
      — Admin เปิด-ปิดตามตำแหน่ง / รายคนที่ ตารางสิทธิ์ตามตำแหน่ง (access.html) · ปิดทั้งระบบที่สวิตช์ 'tab:pbook'
   2) ตั้งค่าระบบ → อัตรากลาง: ดูได้อย่างเดียว (แก้ / นำเข้า Excel / อนุมัติ ที่หน้าราคากลาง ที่เดียว) + ปุ่มเปิดราคากลาง
   3) หน้าต่าง "ทำราคา · เลือกเครื่องมือ": แถว "ราคากลาง" ในขั้น ② ทำราคา
   - ข้อมูล: ราคากลางเผยแพร่แล้วเขียนลง app_state 'claimRates' รูปแบบเดิม → แอปหลัก / Quotation Maker / Claim / OT อ่านได้เหมือนเดิม
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
const MARK = 'v1.432.0 pricebook';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ราคากลาง)'); process.exit(0); }
if (!t.includes('v1.431.0 pricing-principles')) { console.error('✗ ต้องรัน scripts/patch-pricing-principles.js ก่อน'); process.exit(1); }

const ICON = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM9 7h7M9 11h7M9 15h4';
const BOX = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#EEF3F8;border:1px solid #D3E0EC;border-radius:12px;padding:9px 12px;margin-bottom:12px"><span style="flex:1;min-width:200px;font-size:12px;color:#2B4A6B;line-height:1.6">📒 <b>อัตรากลางย้ายไปอยู่ที่หน้า “ราคากลาง” แล้ว</b> — แก้ราคา · นำเข้า / ดาวน์โหลด Excel · ส่งคำขอให้ QS → Director → Admin อนุมัติก่อนเผยแพร่ ที่นั่นที่เดียว (หน้านี้แสดงฉบับที่เผยแพร่อยู่ · ดูได้อย่างเดียว)</span><button sc-camel-on-click="{{ onRtPbook }}" style="flex:none;border:0;background:#2B4A6B;color:#fff;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit">เปิด ราคากลาง ↗</button></div><!-- ${MARK} -->
            `;
const R = [
  ['เปิดหน้าแยก', "  _photoOpen(){", "  _pbOpen(){ try{ window.location.href='/pricebook.html'+(this.IS_STAGING()?'?env=staging':''); }catch(e){} }   // " + MARK + "\n  _photoOpen(){"],
  ['_openTab → ราคากลาง', "if(k==='price'){ this._priceHub(pid); return; }", "if(k==='pbook'){ this._pbOpen(); return; } if(k==='price'){ this._priceHub(pid); return; }"],
  ['หมวดสี', "photo:'sys', price:'fin' };", "photo:'sys', price:'fin', pbook:'fin' };"],
  ['สีประจำการ์ด', "'tab:price':'#B8582A',", "'tab:price':'#B8582A','tab:pbook':'#8A6D3B',"],
  ['ไอคอนการ์ด', "const I={ price:", "const I={ pbook:'" + ICON + "', price:"],
  ['คำอธิบายการ์ด', "const SUB={ price:", "const SUB={ pbook:'ราคาชุดเดียวของบริษัท · Excel ออก-เข้า · QS → Director → Admin อนุมัติ', price:"],
  ['การ์ดไม่ต้องเลือกโครงการ', "      if(key==='tab:price'){",
   "      if(key==='tab:pbook'){ if(this._featGOff('tab:pbook')||!this._pgAllowed('pbook')) return null; const c=this.TAB_CAT('pbook'); return { key, label:'ราคากลาง ↗', sub:SUB.pbook, path:I.pbook, c:c.c, d:c.d, needP:false, grp:'เมนู', run:()=>this._pbOpen() }; }   // " + MARK + "\n      if(key==='tab:price'){"],
  ['อัตรากลาง: ดูได้อย่างเดียว', "  _rateEditOk(){ return ['superadmin','director','qs_mgr'].indexOf(String((this.state.me||{}).roleKey||''))>=0; }",
   "  _rateEditOk(){ return false; }   // " + MARK + ": แก้ที่หน้า ราคากลาง ที่เดียว (เดิม: Super Admin · Director · QS Manager)"],
  ['ข้อความดูได้อย่างเดียว', "ดูได้อย่างเดียว — แก้ไขได้เฉพาะ Super Admin · Director · QS Manager", "ดูได้อย่างเดียว — แก้ไขที่หน้า “ราคากลาง” (ต้องผ่าน QS → Director → Admin)"],
  ['กล่องย้ายไปราคากลาง', '<sc-if value="{{ rtReadOnly }}" hint-placeholder-val="{{ false }}">', BOX + '<sc-if value="{{ rtReadOnly }}" hint-placeholder-val="{{ false }}">'],
  ['ปุ่มเปิดราคากลาง (ค่า)', "out.onRtPrinciples=()=>this._pricingDoc();", "out.onRtPrinciples=()=>this._pricingDoc(); out.onRtPbook=()=>this._pbOpen();"],
  ['หน้าต่างทำราคา: แถวราคากลาง', "kinds:[['area','🏠 พื้นที่เดียว'],['furn','🪑 เฟอร์นิเจอร์'],['damage','🛠 ซ่อม (ลูกค้าจ้าง)'],['dco','✏️ งานเปลี่ยนแบบ']] } ]],",
   "kinds:[['area','🏠 พื้นที่เดียว'],['furn','🪑 เฟอร์นิเจอร์'],['damage','🛠 ซ่อม (ลูกค้าจ้าง)'],['dco','✏️ งานเปลี่ยนแบบ']] },\n        { k:'', w:(!this._featGOff('tab:pbook')&&this._pgAllowed('pbook'))?'':'ยังไม่ได้เปิดให้ตำแหน่งของคุณ', t:'ราคากลาง ↗', d:'ราคาชุดเดียวของบริษัท — ฐานเริ่มต้นของทุกใบเสนอราคา · ดาวน์โหลด / นำเข้า Excel · ขอแก้ราคาผ่าน QS → Director → Admin', run:()=>this._pbOpen() } ]],"],
  ['หน้าต่างทำราคา: เหตุผลแถวพิเศษ', "const row=(o)=>{ const w=o.k?why(o.k,o.mny):''", "const row=(o)=>{ const w=o.w!=null?o.w:o.k?why(o.k,o.mny):''"],
  ['หน้าต่างทำราคา: คำอธิบาย Quotation Maker', "AI ช่วยถอดรายการจากแบบ · ราคาจากอัตรากลาง · ส่งอนุมัติ", "AI ช่วยถอดรายการจากแบบ · ราคาจากราคากลาง (ปรับตามเงื่อนไขงานได้) · ส่งอนุมัติ"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ราคากลาง: แก้ ' + R.length + ' จุด');
