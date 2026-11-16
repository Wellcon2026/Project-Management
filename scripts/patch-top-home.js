#!/usr/bin/env node
/* =====================================================================
   v1.410.0 top-home — ผู้บริหารอนุมัติ 16/11/2026: แถบบนของแอปหลักบนมือถือ ย้ายปุ่มหน้าแรกมาอยู่ซ้ายสุด แบบเดียวกับแอปอื่น
     node scripts/patch-top-home.js        (รันหลัง patch-rate-card.js)
   · มือถือ / แท็บเล็ต (แถบบนแบบย่อ): เดิม [‹ ย้อนกลับ] ชื่อหน้า [🏠]  →  ใหม่ [🏠 หน้าแรก] [‹ ย้อนกลับ] ชื่อหน้า …
   · ตามมาตรฐานแถบหัว (v1.409.0): 🏠 สีทอง 40×40px มุมโค้ง 12px · ห่างขอบซ้าย 14px · ห่างขอบบน 10px — ตำแหน่งเดียวกับ ใบขอซื้อ · Takeoff · Claim · Site Work · Layboard
   · จอคอม: ไม่เปลี่ยน (โลโก้ Wellcon มุมบนซ้ายของแถบเมนู = หน้าแรก อยู่แล้ว)
   ไม่มีข้อมูลใหม่ · ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.410.0 top-home';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ปุ่มหน้าแรกซ้ายสุดบนมือถือ)'); process.exit(0); }
if (!t.includes('v1.410.0 rate-card')) { console.error('✗ ต้องรัน scripts/patch-rate-card.js ก่อน'); process.exit(1); }

// ปุ่มหน้าแรกเดิม (มือถือ · อยู่ท้ายชื่อหน้า)
const reHome = /\n\s*<button sc-camel-on-click="\{\{ hb\.onHome \}\}" title="หน้าแรกของฉัน" aria-label="หน้าแรกของฉัน" style="flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;border:1px solid #C9A961;background:\{\{ hb\.bg \}\};color:\{\{ hb\.fg \}\};padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent"><svg[^>]*><path d="[^"]*"><\/path><\/svg><\/button>/g;
const nHome = (t.match(reHome) || []).length;
// ปุ่มย้อนกลับของมือถือ (ตัวแรกในแถบบน)
const BACK_OLD = '<sc-if value="{{ isMobile }}" hint-placeholder-val="{{ false }}">\n        <button sc-camel-on-click="{{ onHistBack }}" disabled="{{ histBackOff }}" title="{{ histBackTip }}" aria-label="ย้อนกลับ" style="width:36px;height:36px;flex:none;border-radius:11px;';
const HOME_NEW = '<button sc-camel-on-click="{{ hb.onHome }}" title="หน้าแรกของฉัน" aria-label="หน้าแรกของฉัน" style="flex:none;display:flex;align-items:center;justify-content:center;width:40px;height:40px;box-sizing:border-box;border-radius:12px;border:1px solid #C9A961;background:#C9A961;color:#1C1B18;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent" style-active="transform:scale(.96)"><svg width="19" height="19" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"></path></svg></button>';
const BACK_NEW = '<sc-if value="{{ isMobile }}" hint-placeholder-val="{{ false }}">\n        <!-- ' + MARK + ': 🏠 หน้าแรกซ้ายสุด ตามมาตรฐานแถบหัว -->\n        ' + HOME_NEW + '\n        <button sc-camel-on-click="{{ onHistBack }}" disabled="{{ histBackOff }}" title="{{ histBackTip }}" aria-label="ย้อนกลับ" style="width:40px;height:40px;box-sizing:border-box;flex:none;border-radius:12px;';
const R = [
  ['ปุ่มย้อนกลับของมือถือ (จุดวางปุ่มหน้าแรก)', BACK_OLD, BACK_NEW, 1],
  ['ระยะขอบแถบบนของมือถือ', "topPad: isDesktop?'20px 34px':'10px 8px 9px',", "topPad: isDesktop?'20px 34px':'10px 14px 10px',   // " + MARK + ": ขอบ 14px · บน 10px เท่ากับทุกแอป", 1],
  ['ระยะห่างปุ่มในแถบบนของมือถือ', "topGap: isDesktop?'14px':'5px',", "topGap: isDesktop?'14px':'6px',", 1],
];
if (nHome !== 1) { console.error('✗ หาปุ่มหน้าแรกของมือถือเจอ ' + nHome + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); }
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
t = t.replace(reHome, '');
let pts = 1;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ปุ่มหน้าแรกซ้ายสุดบนมือถือ: แก้ ' + pts + ' จุด');
