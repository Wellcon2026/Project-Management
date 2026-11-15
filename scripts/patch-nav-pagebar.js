#!/usr/bin/env node
/* =====================================================================
   v1.405.0 nav-pagebar — ผู้บริหารสั่ง 15/11/2026: หน้าแรกมีการ์ดแล้ว → เอารายการ "หน้าในโครงการ" ออกจากแถบเมนูซ้าย
     node scripts/patch-nav-pagebar.js        (รันหลัง patch-card-color.js)
   · แถบเมนูซ้าย (คอม): ไม่แสดงรายการหน้าในโครงการใต้ชื่อโครงการที่เปิดอยู่แล้ว — เมนูสั้นลง
   · แทนด้วยแถบ "หน้าในโครงการ" (เมนูดรอปดาวน์ + ค้นหา) บนหัวหน้าโครงการ — เดิมแสดงเฉพาะจอแคบกว่า 1000px ตอนนี้แสดงทุกขนาดจอ
     → ทุกหน้ายังเข้าได้ในคลิกเดียว (รวมหน้าที่ไม่อยู่บนการ์ดของตำแหน่งนั้น) · คอมกับมือถือใช้แบบเดียวกัน
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
const MARK = 'v1.405.0 nav-pagebar';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (แถบหน้าในโครงการ)'); process.exit(0); }
if (!t.includes('v1.404.0 card-color')) { console.error('✗ ต้องรัน scripts/patch-card-color.js ก่อน'); process.exit(1); }

const A_OLD = "const _actNavIt=((S.screen==='projectDetail'&&activeProj)||_pgLinked)?myProjItems.find(it=>it.key==='proj_'+((activeProj||proj).id)):null;";
const A_NEW = "const _actNavIt=null;   // " + MARK + ": ไม่แสดงรายการหน้าในโครงการในแถบซ้ายแล้ว (ใช้การ์ดหน้าแรก + แถบ \"หน้าในโครงการ\" บนหัวหน้าโครงการแทน)";
const B_OLD = "pdTabBarShow:S.screen==='projectDetail'&&((S.devW||S.vw||0)<1000),";
const B_NEW = "pdTabBarShow:S.screen==='projectDetail', pdTabBarTop:((S.devW||S.vw||0)<1000)?'67px':'84px',\n" +
  "      pgBarLinked:_pgLinked, pgBarValue:(S.screen==='calendar'?'cal':S.screen==='subcon'?'subcon':'memo'), pgBarSelRef:this._selRef(S.screen==='calendar'?'cal':S.screen==='subcon'?'subcon':'memo'),   // " + MARK + ": แสดงทุกขนาดจอ (เดิมเฉพาะจอแคบกว่า 1000px) · จอกว้าง แถบค้างใต้แถบบน (สูง 78px)\n     ";
// แถบค้างบนจอ: ระยะจากขอบบนตามขนาดจอ (เดิม 67px คงที่ = ความสูงแถบบนของมือถือ)
const C_OLD = 'border-radius:14px;position:sticky;top:67px;z-index:40">';
const C_NEW = 'border-radius:14px;position:sticky;top:{{ pdTabBarTop }};z-index:40">';

const R = [
  ['รายการหน้าในโครงการในแถบซ้าย', A_OLD, A_NEW],
  ['แถบหน้าในโครงการบนหัวหน้าโครงการ', B_OLD, B_NEW],
  ['ระยะค้างของแถบหน้าในโครงการ', C_OLD, C_NEW],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
// ง) หน้าแยกของโครงการ (ปฏิทิน · สัญญาช่าง · ออกหนังสือ — เปิดจากเมนูหน้าในโครงการ): เดิมกลับหน้าอื่นของโครงการได้จากรายการในแถบซ้าย
//    → ใส่แถบ "หน้าในโครงการ" ชุดเดียวกันไว้บนสุดของเนื้อหา (คัดลอกจากแถบของหน้าโครงการ เปลี่ยนเฉพาะตัวแปร)
const BAR_A = '<sc-if value="{{ pdTabBarShow }}" hint-placeholder-val="{{ false }}">';
const FIRST = '<sc-if value="{{ isLibrary }}" hint-placeholder-val="{{ false }}">';
for (const [name, a] of [['แถบหน้าในโครงการ (ต้นแบบ)', BAR_A], ['จุดเริ่มเนื้อหาหน้า', FIRST]]) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
const b0 = t.indexOf(BAR_A), b1 = t.indexOf('</sc-if>', b0);
const BAR = t.slice(b0, b1 + 8);
if (b1 < 0 || BAR.length > 3000 || ['pdTabSelRef', 'pdTabValue', 'pdTabBarTop', 'onPdTabSelect', 'pdTabGroups'].some(k => BAR.split(k).length !== 2)) { console.error('✗ แถบหน้าในโครงการ (ต้นแบบ) ไม่ตรงรูปแบบที่คาด — ไม่แก้อะไรเลย'); process.exit(1); }
const BAR2 = '<!-- ' + MARK + ': แถบหน้าในโครงการ บนหน้าแยกของโครงการ -->' +
  BAR.split('pdTabBarShow').join('pgBarLinked').split('pdTabSelRef').join('pgBarSelRef').split('pdTabValue').join('pgBarValue');
t = t.split(FIRST).join(BAR2 + '\n      ' + FIRST);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แถบหน้าในโครงการ: แก้ ' + (R.length + 1) + ' จุด');
