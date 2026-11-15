#!/usr/bin/env node
/* =====================================================================
   v1.404.0 card-color — ผู้บริหารสั่ง 15/11/2026: การ์ดแต่ละใบมีสีประจำตัว (เห็นง่าย จำง่าย) + ปุ่มมีการเคลื่อนไหว (เป็นมิตร มีพลัง)
     node scripts/patch-card-color.js        (รันหลัง patch-card-reset.js)
   · สีประจำการ์ด _ccHue(itemKey) — สีตามตัวการ์ด ไม่ใช่ตามลำดับ (ลากย้ายแล้วสีตามไป) · ใช้สีเดียวกันทั้ง 2 ที่:
       - หน้าแรกของผู้ใช้ (หน้าทำงานของฉัน): ไอคอนการ์ดพื้นสีทึบ + ไอคอนขาว
       - ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน: ป้ายสีพร้อมเลขลำดับหน้าชื่อการ์ด + สวิตช์ "แสดง" เป็นสีของการ์ด
     'tab:mat' / 'tab:procm' ใช้สีเดียวกัน (แสดงใบเดียวตามโหมด Material Log) · การ์ดที่ไม่มีในตาราง → สีคำนวณจากชื่อคีย์ (คงที่)
   · การเคลื่อนไหว: การ์ดหน้าแรกทยอยขึ้นทีละใบ · ชี้แล้วยกตัว + ไอคอนโยก · กดแล้วยุบเด้ง · แถวการ์ดในตั้งค่า / ป้ายสี / สวิตช์ เด้งนุ่ม
     ปิดเองเมื่อผู้ใช้ปิดเอฟเฟกต์ (body.fxoff) หรือเครื่องตั้ง "ลดการเคลื่อนไหว" (prefers-reduced-motion)
   ไม่มีข้อมูลใหม่ · ไม่ต้องรัน SQL
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
const MARK = 'v1.404.0 card-color';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (สีประจำการ์ด + การเคลื่อนไหว)'); process.exit(0); }
if (!t.includes('v1.403.0 card-reset')) { console.error('✗ ต้องรัน scripts/patch-card-reset.js ก่อน'); process.exit(1); }

// ก) ตารางสีประจำการ์ด
const HUE = {
  'dhome': '#1E3A8A',
  'tab:overview': '#A67C1E', 'tab:dwg': '#0284C7', 'tab:prod': '#C026D3', 'tab:skp': '#4F46E5', 'tab:procm': '#65A30D', 'tab:mat': '#65A30D',
  'tab:lay': '#9333EA', 'tab:plan': '#0D9488', 'tab:cal': '#4D7C0F', 'tab:daily': '#2563EB', 'tab:qm': '#166534', 'tab:rfi': '#7C3AED',
  'tab:docs': '#7F1D1D', 'tab:memo': '#92400E', 'tab:fin': '#CA8A04', 'tab:changes': '#EA580C', 'tab:claim': '#E11D48', 'tab:mango': '#059669',
  'tab:aw': '#115E59', 'tab:proc': '#C2410C', 'tab:subcon': '#581C87', 'tab:spo': '#475569', 'tab:apr': '#D97706', 'tab:delay': '#DC2626',
  'tab:qc': '#DB2777', 'tab:handover': '#16A34A', 'tab:takeoff': '#86198F', 'tab:issues': '#9F1239', 'tab:survey': '#0891B2',
  'nav:dashboard': '#B45309', 'nav:work': '#854D0E', 'nav:inbox': '#0E7490', 'nav:admin': '#334155', 'nav:qstrack': '#0F766E', 'nav:forms': '#9D174D',
  'nav:system': '#52525B', 'nav:jd': '#6D28D9', 'nav:hr': '#BE123C', 'nav:library': '#A16207', 'nav:training': '#15803D', 'nav:cfo': '#1D4ED8',
  'nav:store': '#0369A1', 'nav:bglg': '#3730A3', 'nav:procurement': '#B91C1C', 'nav:subcon': '#5B21B6', 'nav:ai': '#A21CAF',
};
const A_OLD = "  _workSave(rk, arr){";
const A_NEW =
  "  // ===== " + MARK + ": สีประจำการ์ด (ตามตัวการ์ด ไม่ใช่ลำดับ) — หน้าแรกของผู้ใช้ และ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน ใช้สีเดียวกัน =====\n" +
  "  _ccHue(key){ const k=String(key||''); const M=" + JSON.stringify(HUE).split('"').join("'") + ";\n" +
  "    if(M[k]) return M[k]; let h=0; for(let i=0;i<k.length;i++) h=(h*31+k.charCodeAt(i))>>>0; return 'hsl('+(h%360)+',62%,'+(34+((h>>9)%3)*7)+'%)'; }\n" +
  A_OLD;

// ข) ตั้งค่าระบบ: แถวการ์ด — ป้ายสี + สวิตช์สีของการ์ด
const B1_OLD = "{ key:k, label:c.label, note:c.g, no:(i+1)+'.', ...SW(true,'แสดง','ซ่อน'), upShow:true,";
const B1_NEW = "{ key:k, label:c.label, note:c.g, no:String(i+1), ...SW(true,'แสดง','ซ่อน'), swBg:this._ccHue(k), hue:this._ccHue(k), hueOp:'1', upShow:true,";
const B2_OLD = "({ key:c.key, label:c.label, note:c.g, no:'', ...SW(false,'แสดง','ซ่อน'), upShow:false,";
const B2_NEW = "({ key:c.key, label:c.label, note:c.g, no:'', ...SW(false,'แสดง','ซ่อน'), hue:this._ccHue(c.key), hueOp:'.4', upShow:false,";
const C_OLD = '<span style="flex:1;min-width:0"><span style="display:block;font-size:12px;font-weight:700;color:#1C1B18">{{ c.no }} {{ c.label }}</span>';
const C_NEW = '<span class="ccchip" style="flex:none;width:26px;height:26px;border-radius:8px;background:{{ c.hue }};opacity:{{ c.hueOp }};color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">{{ c.no }}</span>' +
  '<span style="flex:1;min-width:0"><span style="display:block;font-size:12px;font-weight:700;color:#1C1B18">{{ c.label }}</span>';
const D_OLD = '<div ref="{{ c.rowRef }}" sc-camel-on-pointer-down="{{ c.onRowPD }}" style="display:flex;align-items:center;gap:6px;border:1px solid #EDE6D7;';
const D_NEW = '<div class="ccrow" ref="{{ c.rowRef }}" sc-camel-on-pointer-down="{{ c.onRowPD }}" style="display:flex;align-items:center;gap:6px;border:1px solid #EDE6D7;';
const E_OLD = 'left:{{ c.knobX }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .16s ease';
const E_NEW = 'left:{{ c.knobX }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .3s cubic-bezier(.34,1.56,.64,1)';

// ค) หน้าแรกของผู้ใช้: สีประจำการ์ด + การเคลื่อนไหว
const F_OLD = "const tiles=tiles0.map((t,i)=>({ ...t, tint:t.d+'1A',";
const F_NEW = "const tiles=tiles0.map((t,i)=>({ ...t, d:this._ccHue(t.key), tint:this._ccHue(t.key), dly:(Math.min(i,16)*38)+'ms',";
const G_OLD = 'style="display:flex;flex-direction:column;gap:10px;background:#fff;border:{{ t.wkBd }};border-radius:16px;padding:16px 15px;cursor:{{ t.wkCur }};min-width:0;min-height:128px"';
const G_NEW = 'class="wkt" style="display:flex;flex-direction:column;gap:10px;background:#fff;border:{{ t.wkBd }};border-radius:16px;padding:16px 15px;cursor:{{ t.wkCur }};min-width:0;min-height:128px;animation-delay:{{ t.dly }}"';
const H_OLD = '<span style="flex:none;width:44px;height:44px;border-radius:13px;background:{{ t.tint }};display:flex;align-items:center;justify-content:center"><svg width="21" height="21" sc-camel-view-box="0 0 24 24" fill="none" stroke="{{ t.d }}"';
const H_NEW = '<span class="wkti" style="flex:none;width:44px;height:44px;border-radius:13px;background:{{ t.tint }};display:flex;align-items:center;justify-content:center"><svg width="21" height="21" sc-camel-view-box="0 0 24 24" fill="none" stroke="#fff"';

// ง) CSS การเคลื่อนไหว
const S_OLD = 'body.fxoff .fxrip{display:none}';
const S_NEW = S_OLD + '\n' +
  '  /* ' + MARK + ' */\n' +
  '  @keyframes wktIn{from{opacity:0;transform:translateY(16px) scale(.94)}60%{opacity:1;transform:translateY(-3px) scale(1.01)}to{opacity:1;transform:translateY(0) scale(1)}}\n' +
  '  @keyframes wktWig{0%{transform:rotate(0) scale(1)}30%{transform:rotate(-11deg) scale(1.14)}60%{transform:rotate(8deg) scale(1.14)}100%{transform:rotate(0) scale(1)}}\n' +
  '  @keyframes ccIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}\n' +
  '  body:not(.fxoff) .wkt{animation:wktIn .46s cubic-bezier(.22,1,.36,1) backwards;transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease,border-color .18s ease}\n' +
  '  body:not(.fxoff) .wkt:hover{transform:translateY(-4px) scale(1.02)}\n' +
  '  body:not(.fxoff) .wkt:active{transform:scale(.955)}\n' +
  '  body:not(.fxoff) .wkt:hover .wkti{animation:wktWig .5s ease}\n' +
  '  body:not(.fxoff) .ccrow{animation:ccIn .26s ease backwards}\n' +
  '  body:not(.fxoff) .ccrow:hover{border-color:#D9C9A3!important}\n' +
  '  body:not(.fxoff) .ccchip{transition:transform .24s cubic-bezier(.34,1.56,.64,1)}\n' +
  '  body:not(.fxoff) .ccrow:hover .ccchip{transform:scale(1.14) rotate(-6deg)}\n' +
  '  @media (prefers-reduced-motion:reduce){ .wkt,.wkti,.ccrow,.ccchip{animation:none!important;transition:none!important;transform:none!important} }';

// [ชื่อ, ของเดิม, ของใหม่, จำนวนที่ต้องเจอ]
const R = [
  ['ตัวกำหนดสีประจำการ์ด', A_OLD, A_NEW, 1],
  ['แถวการ์ดที่แสดง (สี)', B1_OLD, B1_NEW, 1],
  ['แถวการ์ดที่ซ่อน (สี)', B2_OLD, B2_NEW, 1],
  ['ป้ายสีหน้าชื่อการ์ด', C_OLD, C_NEW, 4],
  ['แถวการ์ด (เคลื่อนไหว)', D_OLD, D_NEW, 4],
  ['สวิตช์เด้งนุ่ม', E_OLD, E_NEW, null],
  ['การ์ดหน้าแรก (สี)', F_OLD, F_NEW, 1],
  ['การ์ดหน้าแรก (เคลื่อนไหว)', G_OLD, G_NEW, 1],
  ['ไอคอนการ์ดหน้าแรก', H_OLD, H_NEW, 1],
  ['CSS การเคลื่อนไหว', S_OLD, S_NEW, 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (n === null ? c < 4 : c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + (n === null ? 'อย่างน้อย 4' : n) + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b] of R) { pts += t.split(a).length - 1; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ สีประจำการ์ด + การเคลื่อนไหว: แก้ ' + pts + ' จุด');
