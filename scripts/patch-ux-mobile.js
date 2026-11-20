#!/usr/bin/env node
/* =====================================================================
   v1.441.0 ux-mobile — ปรับประสบการณ์ใช้งานบนมือถือ 4 ข้อ (ผู้บริหารอนุมัติ 20/11/2026 จากผลตรวจทั้งแอป)
     node scripts/patch-ux-mobile.js        (รันหลัง patch-note-time.js)
   1) แถบบนมือถือ: ซ่อนปุ่ม "ออกจากระบบ" สีแดง (กันกดพลาด — ยังออกได้ที่เมนู ⋮ → ออกจากระบบ) · ชื่อหน้าแสดงได้ 2 บรรทัด
   2) หน้าแรกมือถือ: โครงการ ≥ 3 → ปุ่ม "โครงการ ▾" แบบเดียวกับคนที่มีหลายโครงการ (เดิมปุ่มเรียงหลายแถว) · กล่องหัวกะทัดรัด
      → การ์ดงานขึ้นในจอแรกโดยไม่ต้องเลื่อน
   3) ข้อความแจ้งผิดพลาด: แปลข้อความเทคนิค (ภาษาอังกฤษจากระบบ / bucket / Supabase / SQL) เป็นภาษาไทยที่บอกว่าต้องทำอะไร
      — ทำที่ showToast จุดเดียว ครอบคลุมทุกหน้า · ข้อความเดิมยังอยู่ใน console (console.warn) ไว้ตรวจปัญหา
   4) ตัวหนังสือเล็ก (8–11.5 px) → 12 px · หัวข้อเล็กตัวพิมพ์ใหญ่ (.kicker) → 11 px
      · ไม่แตะป้ายตัวเลขที่สูงตายตัว (height:1x / 2x px) เพื่อไม่ให้ล้นกรอบ
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
const MARK = 'v1.441.0 ux-mobile';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ux-mobile)'); process.exit(0); }
if (!t.includes('v1.440.0 note-time')) { console.error('✗ ต้องรัน scripts/patch-note-time.js ก่อน'); process.exit(1); }

// ---- ข้อ 4 (+ ข้อ 2 ส่วน CSS): สไตล์รวม ----
const SMALL = ['8px', '8.5px', '9px', '9.5px', '10px', '10.5px', '11px', '11.5px'];
// แอปวาด style เป็น "font-size: 10px; height: 16px" (มีเว้นวรรค) — ใส่ทั้ง 2 แบบ · ป้ายที่สูงตายตัว (height 1x/2x px) ไม่แตะ
const notFixed = ':not([style*="; height: 1"]):not([style*="; height: 2"]):not([style^="height: "]):not([style*=";height:1"]):not([style*=";height:2"]):not([style^="height:"])';
const SEL = (s) => ['[style*="font-size: ' + s + '"]', '[style*="font-size:' + s + '"]'];
const CSS = '<style data-wc-ux="1">/* ' + MARK + ': ตัวหนังสือเล็ก → อ่านง่าย · หน้าแรกมือถือกะทัดรัด */'
  + SMALL.flatMap(SEL).map(x => x + notFixed + ':not(.kicker)').join(',') + '{font-size:12px!important}'
  + SMALL.flatMap(SEL).map(x => '.kicker' + x + notFixed).join(',') + '{font-size:11px!important}'
  + '@media (max-width:759px){.wc-wk-hero{padding:16px 16px 18px!important;border-radius:18px!important;margin-bottom:14px!important}.wc-wk-title{font-size:21px!important}.wc-wk-sub{display:none!important}.wc-wk-rc:nth-of-type(n+3){display:none!important}}'
  + '</style>\n';

const MSG = `  // ===== ${MARK}: ข้อความแจ้งผิดพลาดเป็นภาษาไทยที่บอกว่าต้องทำอะไร (ข้อความเทคนิคเดิม → console) =====
  _plainMsg(m){ if(typeof m!=='string'||!m) return m; let s=m;
    s=s.replace(/ยังไม่ได้เชื่อม Supabase/g,'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ (ตรวจอินเทอร์เน็ต)').replace(/ตรวจสิทธิ์ bucket "[^"]*"/g,'ลองเปิดหน้านี้ใหม่ ถ้ายังไม่ได้ แจ้งผู้ดูแลระบบ')
      .replace(/รันไฟล์ SQL เสริมใน Supabase แล้วข้อมูลส่วนนี้จะซิงก์/g,'แจ้งผู้ดูแลระบบให้ตั้งค่าเซิร์ฟเวอร์').replace(/ตรวจว่ารัน SQL ทั้ง 2 ไฟล์แล้ว/g,'แจ้งผู้ดูแลระบบ').replace(/ขึ้น Storage/g,'ขึ้นคลังไฟล์').replace(/อยู่บน Storage/g,'อยู่ในคลังไฟล์');
    if(!/ไม่สำเร็จ|ผิดพลาด|ไม่ได้|ล้ม|🔴|Error|error|failed|Failed/.test(s)) return s;
    const R=[[/Failed to fetch|NetworkError|Network request failed|Load failed|ERR_[A-Z_]+|network/i,'เชื่อมต่ออินเทอร์เน็ตไม่ได้ — ตรวจสัญญาณแล้วลองใหม่'],
      [/time ?out|timed out|canceling statement|504/i,'เซิร์ฟเวอร์ตอบช้า — รอสักครู่แล้วลองใหม่'],
      [/row-level|row level|policy|permission denied|not authori|unauthori|JWT|\\b40[13]\\b/i,'ไม่มีสิทธิ์ทำรายการนี้ — ออกจากระบบแล้วเข้าใหม่ หรือแจ้งผู้ดูแลระบบ'],
      [/too large|\\b413\\b|maximum allowed size|exceeded/i,'ไฟล์ใหญ่เกินไป — ลดขนาดไฟล์แล้วลองใหม่'],
      [/duplicate key|already exists|unique constraint/i,'มีรายการนี้อยู่แล้ว'],
      [/\\b429\\b|rate limit|overloaded|\\b529\\b|too many requests/i,'ระบบใช้งานหนัก — รอสักครู่แล้วลองใหม่'],
      [/Unexpected token|JSON|SyntaxError/i,'ข้อมูลที่ได้รับไม่ถูกต้อง — ลองใหม่อีกครั้ง'],
      [/not found|\\b404\\b|does not exist/i,'ไม่พบข้อมูลหรือไฟล์ที่ต้องการ'],
      [/\\b50[023]\\b|internal server|bad gateway|service unavailable/i,'เซิร์ฟเวอร์ขัดข้องชั่วคราว — ลองใหม่อีกครั้ง']];
    // แยก: ส่วนไทยก่อนคำว่า "ไม่สำเร็จ" · ข้อความเทคนิค (ภาษาอังกฤษ) · ส่วนไทยที่ตามมา (เก็บไว้)
    const fw=/ไม่สำเร็จ|ผิดพลาด|ไม่ได้|ล้มเหลว/.exec(s); const a=fw?fw.index+fw[0].length:0; const rest=s.slice(a); const st=rest.search(/[A-Za-z]/); if(st<0) return s;
    const m2=/\\s[—·]\\s(?=[^A-Za-z]*[ก-๙])/.exec(rest.slice(st)); const en=m2?st+m2.index:rest.length;
    const tech=rest.slice(st,en).trim(), tail=rest.slice(en).replace(/^\\s*[—·]\\s*/,'').trim();
    let fr=''; for(const [re,th] of R){ if(re.test(tech)){ fr=th; break; } }
    if(!fr&&(tech.match(/[A-Za-z]/g)||[]).length>=12&&!/^(Quotation Maker|Mango|Google|Excel|PDF|Word|Site Work|Wellcon|Photo Editor|\\.xlsx|\\.csv)/i.test(tech)) fr='เกิดข้อผิดพลาด — ลองใหม่ ถ้ายังไม่ได้ กด ⋮ → แจ้งปัญหา';
    if(!fr) return s;
    try{ console.warn('[ข้อความเดิม]', m); }catch(e){}
    const pre=s.slice(0,a).replace(/[\\s:·—\\-–(]+$/,'');
    return (pre?pre+' — ':'')+fr+(tail?' · '+tail:''); }
`;

const R = [
  ['สไตล์รวม', '<style data-wc-topfit="1">', CSS + '<style data-wc-topfit="1">'],
  ['ข้อ 1: ซ่อนปุ่มออกจากระบบบนมือถือ (เปิด)',
   '<!-- v1.364.7 ปุ่มออกจากระบบ ทุกหน้า -->\n      <button sc-camel-on-click="{{ hb.onLogout }}"',
   '<!-- v1.364.7 ปุ่มออกจากระบบ ทุกหน้า · ' + MARK + ': มือถือออกที่เมนู ⋮ -->\n      <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}"><button sc-camel-on-click="{{ hb.onLogout }}"'],
  ['ข้อ 1: ซ่อนปุ่มออกจากระบบบนมือถือ (ปิด)',
   '<span class="wc-t3">ออกจากระบบ</span></sc-if></button>',
   '<span class="wc-t3">ออกจากระบบ</span></sc-if></button></sc-if>'],
  ['ข้อ 1: ชื่อหน้ามือถือ 2 บรรทัด',
   '<div class="kicker" style="font-size:8px;color:{{ secD }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ pageKicker }}</div>\n          <div class="serif" style="font-size:14.5px;font-weight:600;letter-spacing:-.2px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ pageTitleMob }}</div>',
   '<div class="kicker" style="font-size:10px;color:{{ secD }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ pageKicker }}</div>\n          <div class="serif" style="font-size:14px;font-weight:600;letter-spacing:-.2px;line-height:1.18;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word">{{ pageTitleMob }}</div>'],
  ['ข้อ 2: มือถือใช้ปุ่มเลือกโครงการ', 'const many=vp.length>6;', 'const many=vp.length>6||((S.vw||1440)<760&&vp.length>2);   /* ' + MARK + ' */'],
  ['ข้อ 2: กล่องหัวหน้าแรก',
   '<sc-if value="{{ isWork }}" hint-placeholder-val="{{ false }}">\n        <div style="background:#1C1B18;border-radius:22px;padding:24px 26px;margin-bottom:18px">',
   '<sc-if value="{{ isWork }}" hint-placeholder-val="{{ false }}">\n        <div class="wc-wk-hero" style="background:#1C1B18;border-radius:22px;padding:24px 26px;margin-bottom:18px">'],
  ['ข้อ 2: ชื่อหน้าแรก', '<div class="serif" style="font-size:28px;font-weight:600;color:#F4EFE6;line-height:1.15">{{ workTitle }}</div>', '<div class="serif wc-wk-title" style="font-size:28px;font-weight:600;color:#F4EFE6;line-height:1.15">{{ workTitle }}</div>'],
  ['ข้อ 2: คำอธิบายหน้าแรก', '<div style="font-size:13px;color:#B6AE9B;margin-top:8px;line-height:1.6;text-wrap:pretty">{{ workSub }}</div>', '<div class="wc-wk-sub" style="font-size:13px;color:#B6AE9B;margin-top:8px;line-height:1.6;text-wrap:pretty">{{ workSub }}</div>'],
  ['ข้อ 2: ปุ่มใช้ล่าสุด', '<button sc-camel-on-click="{{ r.onPress }}" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#E4DCC9;border-radius:999px;padding:6px 12px;',
   '<button class="wc-wk-rc" sc-camel-on-click="{{ r.onPress }}" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#E4DCC9;border-radius:999px;padding:6px 12px;'],
  ['ข้อ 3: แปลข้อความผิดพลาด (ฟังก์ชัน)', '  showToast(m){\n', MSG + '  showToast(m){ m=this._plainMsg(m);   /* ' + MARK + ' */\n'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ux-mobile: แก้ ' + R.length + ' จุด');
