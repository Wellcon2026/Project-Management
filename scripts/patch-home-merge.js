#!/usr/bin/env node
/* =====================================================================
   v1.453.0 home-merge — หน้าแรก 3 แบบ → 2 แบบ (ผู้บริหารสั่ง 21/11/2026: ข้อสุดท้ายของแผนรวมหน้าที่ซ้ำ)
     node scripts/patch-home-merge.js
   - Home (ภาพรวมทุกโครงการ) คงเดิม — สำหรับผู้บริหาร
   - My Space (พื้นที่ทำงานของฉัน) = หน้าส่วนตัวหน้าเดียว: ส่วนบนเป็นเนื้อหาเดิมของ Role Home (เลือกโครงการ + การ์ดตามตำแหน่ง)
     ต่อด้วย งานที่มอบหมาย · Notes · ปฏิทิน (ตามเดิม)
   - ลบเมนู "Role Home" · ลิงก์ / ปุ่มเดิมที่ไป Role Home → ส่งไป My Space อัตโนมัติ · เข้าระบบลง My Space
   - ไม่แตะข้อมูล (การ์ดตามตำแหน่ง workPages / การ์ดรายคน เดิมทั้งหมด)
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
const MARK = 'v1.453.0 home-merge';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (home-merge)'); process.exit(0); }
const C = '/* ' + MARK + ' */';
const edits = [   // [ชื่อ, เดิม, ใหม่, จำนวนที่ต้องเจอ]
  ['My Space แสดงส่วน Role Home', "const out={ isWork:S.screen==='work' }; if(!out.isWork) return out;",
    "const out={ isWork:S.screen==='work'||(S.screen==='inbox'&&!!this.WORK_KIND(S.me||{})) }; if(!out.isWork) return out;   " + C, 1],
  ['หน้าแรก / ล็อกอิน → My Space', "return this.WORK_KIND(me)?'work':'inbox'; }", "return 'inbox'; }   " + C, 2],
  ['ปุ่มหน้าแรก (เป้าหมาย)', "_homeTarget(me){ return this.WORK_KIND(me||{})?'work':'dashboard'; }", "_homeTarget(me){ return this.WORK_KIND(me||{})?'inbox':'dashboard'; }   " + C, 1],
  ['ปุ่มหน้าแรก (โลโก้)', "this.WORK_KIND(this.state.me||{})?'work':'dashboard'", "this.WORK_KIND(this.state.me||{})?'inbox':'dashboard'", 1],
  ['ลิงก์เดิมไป Role Home → My Space', "if(S.screen==='subcon'&&!_mnyOk&&!this._mnyFixT)",
    "if(S.screen==='work'&&!this._wkMergeT){ this._wkMergeT=setTimeout(()=>{ this._wkMergeT=null; if(this.state.screen==='work') this.setState({ screen:'inbox' }); },0); }   " + C + "\n    if(S.screen==='subcon'&&!_mnyOk&&!this._mnyFixT)", 1],
  ['เมนูซ้าย: ลบ Role Home', "const workItem=_wkN?navDef('work',_wkN.label,'M3 7h18v13H3zM8 7V4h8v3M3 13h18'):null;", "const workItem=null;   /* " + MARK + ": รวมเข้า My Space */", 1],
  ['แท็กจากหน้านี้: โครงการที่เลือก', "(S.screen==='work'&&this._wkPid)", "((S.screen==='work'||S.screen==='inbox')&&this._wkPid)", 1],
  ['หัวหน้า', "({ des:'DESIGN WORK', site:'SITE WORK', other:'MY WORK' }[kind])", "('MY SPACE · '+({ des:'DESIGN WORK', site:'SITE WORK', other:'MY WORK' }[kind]))", 1],
  ['ลิงก์ #/work เดิม → My Space', "const k=m[0]; const nm=this._lastNavMap||{};", "const k=(m[0]==='work'?'inbox':m[0]); const nm=this._lastNavMap||{};   " + C, 1],
  ['ปุ่มไปหน้าตัวเอง', '<button sc-camel-on-click="{{ onWorkInbox }}" style="border:1px solid #E4DED2;background:#fff;color:#2C2A25;border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer">พื้นที่ทำงานของฉัน</button>', '', 1],
];
for (const [n, a, , k] of edits) { const c = t.split(a).length - 1; if (c !== k) { console.error('✗ ' + n + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + k + ')'); process.exit(1); } }
for (const [, a, b] of edits) t = t.split(a).join(b);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ home-merge: Role Home รวมเข้า My Space · ' + edits.length + ' จุด');
