#!/usr/bin/env node
/* =====================================================================
   v1.413.0 top-fit — แถบปุ่มด้านบนของจอคอม ย่อป้ายปุ่มให้พอดีความกว้างจอ (หน้าไม่เลื่อนแนวนอน)
     node scripts/patch-top-fit.js        (รันหลัง patch-rfi-issue.js)
   สาเหตุ: ปุ่มทุกตัวในแถบบนของจอคอมเป็น flex:none + white-space:nowrap และแถบไม่ตัดบรรทัด — ย่อได้แค่ชื่อหน้า
     ความกว้างที่ต้องใช้ 1,579–1,824px (ทุกตำแหน่ง · มากสุดเมื่อป้ายตำแหน่งยาว) → จอ 1280 / 1366 / 1536px หน้าเลื่อนแนวนอน ปุ่มขวาสุดหลุดจอ
   วิธีแก้: ตัววัดขนาด (สคริปต์เล็กในหัวหน้าเว็บ) วัดแถบทุกครั้งที่ขนาดจอ / เนื้อหาในแถบเปลี่ยน แล้วย่อ "ทีละขั้น" เท่าที่จำเป็น
     ใส่ขั้นที่ใช้ไว้ที่ <html data-wc-top="1 2 3 …"> · CSS ซ่อนป้ายตามขั้น — ปุ่มยังอยู่ครบ กดได้ทุกปุ่ม ชี้เมาส์เห็นชื่อปุ่ม (title)
     ขั้น 1 ขอบเขตในป้ายตำแหน่ง (เหลือชื่อตำแหน่ง) · 2 ค้นหาทุกอย่าง… · 3 ออกจากระบบ · 4 ปักหมุด · 5 วิธีใช้หน้านี้ · 6 แชร์ลิงก์ · 7 แท็กคน
     · 8 ถามที่ปรึกษา AI · 9 หน้าแรก / ปุ่มไปหน้างาน / ดูอย่างเดียว · 10 ป้ายตำแหน่งทั้งป้าย · 11 ระยะห่างปุ่ม 8px ขอบ 20px · 12 ตัดขึ้นบรรทัดที่สอง (จอแคบกว่าราว 1,150px)
     ชื่อหน้าได้ที่อย่างน้อย 160px (หรือเท่าความยาวชื่อ ถ้าสั้นกว่า) · จอกว้างพอ = ไม่ย่อ หน้าตาเหมือนเดิมทุกจุด
   · มือถือ / แท็บเล็ต (แถบบนแบบย่อ · กว้างไม่ถึง 1000px): ไม่เปลี่ยน — ตัววัดทำงานเฉพาะเมื่อมีชื่อหน้าแบบจอคอม (.wc-tb-title)
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
const MARK = 'v1.413.0 top-fit';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (แถบบนจอคอมย่อพอดีจอ)'); process.exit(0); }
if (!t.includes('v1.410.0 top-home')) { console.error('✗ ต้องรัน scripts/patch-top-home.js ก่อน'); process.exit(1); }

const STEPS = 12;       // ขั้นสูงสุด (12 = ตัดขึ้นบรรทัดที่สอง)
const TITLE_MIN = 160;  // ชื่อหน้าได้ที่อย่างน้อย (px)

// CSS: ซ่อนป้ายตามขั้น (ขั้น 1–10) · ขั้น 11 ระยะห่างแคบ · ขั้น 12 ตัดบรรทัด
const hide = []; for (let i = 1; i <= 10; i++) hide.push('html[data-wc-top~="' + i + '"] .wc-t' + i);
const CSS = '<style data-wc-topfit="1">/* ' + MARK + ': แถบบนจอคอมย่อป้ายปุ่มทีละขั้นให้พอดีจอ */'
  + hide.join(',') + '{display:none!important}'
  + 'html[data-wc-top~="11"] .wc-topbar{gap:8px!important;padding-left:20px!important;padding-right:20px!important}'
  + 'html[data-wc-top~="12"] .wc-topbar{flex-wrap:wrap;justify-content:flex-end}'
  + 'html[data-wc-top~="12"] .wc-topbar>.wc-tb-title{flex:1 1 ' + TITLE_MIN + 'px!important}'
  + '</style>';

// ตัววัด: หาขั้นต่ำสุดที่แถบไม่ล้น (ปุ่มขวาสุดไม่เลยขอบใน · ชื่อหน้าไม่แคบกว่าที่กำหนด) — ใช้ค่า layout (offset*) จึงไม่เพี้ยนเมื่อหน้าถูกย่อ/ขยาย
const JS = '<script data-wc-topfit="1">(function(){try{if(window.__wcTopFit)return;window.__wcTopFit=1;'
  + 'var H=document.documentElement,A="data-wc-top",MAX=' + STEPS + ',TMIN=' + TITLE_MIN + ',cur=0,sig="",raf=0,ro=null;'
  + 'function tok(n){var s="",i;for(i=1;i<=n;i++)s+=(i>1?" ":"")+i;return s;}'
  + 'function set(n){if(n===cur)return;cur=n;if(n)H.setAttribute(A,tok(n));else H.removeAttribute(A);}'
  + 'function tw(ti){var x=ti.lastElementChild;return x?x.scrollWidth:0;}'
  + 'function over(bar,ti){var lim=bar.clientWidth-(parseFloat(getComputedStyle(bar).paddingRight)||0)+1,k=bar.children,i;'
  + 'for(i=0;i<k.length;i++){if(k[i].offsetWidth>0&&k[i].offsetLeft+k[i].offsetWidth>lim)return true;}'
  + 'return ti.offsetWidth<Math.min(TMIN,tw(ti)+16);}'
  + 'function mk(bar,ti){var k=bar.children,s=cur+"|"+bar.clientWidth+"|"+k.length,i;for(i=0;i<k.length;i++)s+=","+k[i].offsetWidth;return s+"|"+tw(ti);}'
  + 'function run(){raf=0;var bar=document.querySelector(".wc-topbar"),ti=bar&&bar.querySelector(".wc-tb-title");'
  + 'if(!ti||ti.parentNode!==bar){set(0);sig="";return;}'   // มือถือ / แท็บเล็ต / ยังไม่เข้าสู่ระบบ → ไม่ย่อ
  + 'if(mk(bar,ti)===sig)return;var n=cur;'
  + 'if(over(bar,ti)){while(n<MAX){set(++n);if(!over(bar,ti))break;}}'
  + 'else{while(n>0){set(n-1);if(over(bar,ti)){set(n);break;}n--;}}'
  + 'sig=mk(bar,ti);if(ro){ro.disconnect();ro.observe(bar);for(var i=0,k=bar.children;i<k.length;i++)ro.observe(k[i]);}}'
  + 'function go(){if(!raf)raf=(window.requestAnimationFrame||function(f){return setTimeout(f,16);})(run);}'
  + 'function redo(){sig="";go();}'
  + 'if(window.ResizeObserver)ro=new ResizeObserver(go);'
  + 'if(window.MutationObserver)new MutationObserver(go).observe(H,{childList:true,subtree:true,characterData:true});'
  + 'window.addEventListener("resize",redo);window.addEventListener("load",redo);'
  + 'if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redo);go();'
  + '}catch(e){}})();</script>';

const HEAD_OLD = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const BAR_OLD = '<div style="position:sticky;top:0;z-index:50;background:rgba(232,226,214,.9);background-image:{{ secTopBg }};backdrop-filter:blur(12px);border-bottom:3px solid transparent;border-image:{{ secLine }} 1;padding:{{ topPad }};display:flex;align-items:center;gap:{{ topGap }}">';
const TITLE_OLD = '<div sc-camel-on-click="{{ onTitleHome }}" title="Home" style="flex:1;min-width:0;cursor:pointer;border-radius:10px;padding:2px 8px;margin-left:-8px"';
const ROLE_OLD = '<span style="flex:none;font-size:10.5px;font-weight:600;color:#8A7657;background:#F3EAD9;padding:6px 12px;border-radius:9px;white-space:nowrap">{{ myRoleLabel }} · {{ myScopeLabel }}</span>';
const ROLE_NEW = '<span class="wc-t10" title="{{ myRoleLabel }} · {{ myScopeLabel }}" style="flex:none;font-size:10.5px;font-weight:600;color:#8A7657;background:#F3EAD9;padding:6px 12px;border-radius:9px;white-space:nowrap">{{ myRoleLabel }}<span class="wc-t1"> · {{ myScopeLabel }}</span></span>';
const DESK = '<sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">';
const R = [
  ['หัวหน้าเว็บ (จุดวาง CSS + ตัววัด)', HEAD_OLD, HEAD_OLD + '\n' + CSS + JS, 1],
  ['แถบบน', BAR_OLD, '<!-- ' + MARK + ' -->' + BAR_OLD.replace('<div style=', '<div class="wc-topbar" style='), 1],
  ['ชื่อหน้าของจอคอม', TITLE_OLD, TITLE_OLD.replace(' title="Home"', ' class="wc-tb-title" title="Home"'), 1],
  ['ป้ายตำแหน่ง · ขอบเขต (ขั้น 1 / 10)', ROLE_OLD, ROLE_NEW, 1],
  ['ป้ายปุ่ม ค้นหาทุกอย่าง… (ขั้น 2)', '<span style="font-size:12.5px;color:#9C968A;white-space:nowrap">ค้นหาทุกอย่าง…</span>', '<span class="wc-t2" style="font-size:12.5px;color:#9C968A;white-space:nowrap">ค้นหาทุกอย่าง…</span>', 1],
  ['ป้ายปุ่ม ออกจากระบบ (ขั้น 3)', DESK + '<span>ออกจากระบบ</span></sc-if></button>', DESK + '<span class="wc-t3">ออกจากระบบ</span></sc-if></button>', 1],
  ['ป้ายปุ่ม ปักหมุด (ขั้น 4)', DESK + '<span>ปักหมุด</span></sc-if>', DESK + '<span class="wc-t4">ปักหมุด</span></sc-if>', 1],
  ['ป้ายปุ่ม วิธีใช้หน้านี้ (ขั้น 5)', '<span style="font-size:12.5px;font-weight:700;color:#8A5E14;white-space:nowrap">วิธีใช้หน้านี้</span>', '<span class="wc-t5" style="font-size:12.5px;font-weight:700;color:#8A5E14;white-space:nowrap">วิธีใช้หน้านี้</span>', 1],
  ['ป้ายปุ่ม แชร์ลิงก์ (ขั้น 6)', '<span>แชร์ลิงก์</span></button>', '<span class="wc-t6">แชร์ลิงก์</span></button>', 1],
  ['ป้ายปุ่ม แท็กคน (ขั้น 7)', '<span>🏷 แท็กคน</span></button>', '<span>🏷<span class="wc-t7"> แท็กคน</span></span></button>', 1],
  ['ป้ายปุ่ม ถามที่ปรึกษา AI (ขั้น 8)', '<span style="font-size:13px;font-weight:700;color:#8A5E14;white-space:nowrap">ถามที่ปรึกษา AI</span>', '<span class="wc-t8" style="font-size:13px;font-weight:700;color:#8A5E14;white-space:nowrap">ถามที่ปรึกษา AI</span>', 1],
  ['ป้ายปุ่ม หน้าแรก ของจอคอม (ขั้น 9)', '</svg><span>หน้าแรก</span></button>', '</svg><span class="wc-t9">หน้าแรก</span></button>', 1],
  ['ป้ายปุ่มไปหน้างาน (ขั้น 9)', '<span>{{ wsGoLabel }}</span></button></sc-if>', '<span class="wc-t9">{{ wsGoLabel }}</span></button></sc-if>', 1],
  ['ป้าย ดูอย่างเดียว (ขั้น 9)', DESK + '<span>ดูอย่างเดียว</span></sc-if>', DESK + '<span class="wc-t9">ดูอย่างเดียว</span></sc-if>', 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แถบบนจอคอมย่อพอดีจอ: แก้ ' + pts + ' จุด');
