#!/usr/bin/env node
/* =====================================================================
   เข้าสู่ระบบครั้งเดียว ข้ามแอป — Wellcon PM รับตั๋ว ?wsso= (จาก Site Work / Claim) แล้วเข้าสู่ระบบคนเดิมให้อัตโนมัติ
     node scripts/patch-sso.js        (รันต่อจาก patch-claim-sitework.js · ต้องมี wctag.js 1.1.0 + supabase-sso.sql)
   - ออกตั๋วตอนกดลิงก์ / ปุ่มไปอีกแอป ทำใน wctag.js (ทุกแอปโหลดอยู่แล้ว)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์
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
if (t.includes('_ssoSync(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เข้าสู่ระบบครั้งเดียว)'); process.exit(0); }
const EDITS = [
  ['โหลด wctag.js 1.1.0', '<script src="/wctag.js?v=1.0.0"></script>', '<script src="/wctag.js?v=1.1.0"></script>'],
  ['รอบเช็กตั๋ว', "this._wctT=setInterval(()=>this._wctSync(),1500);", "this._wctT=setInterval(()=>{ this._ssoSync(); this._wctSync(); },1500);"],
  ['รับตั๋ว', "  _wctSync(){",
    "  // v1.383.0 เข้าสู่ระบบครั้งเดียว: เปิดจากอีกแอปพร้อมตั๋ว ?wsso= → แลกตั๋ว (ใช้ครั้งเดียว 2 นาที) → เข้าสู่ระบบคนเดิม (รอเชื่อมฐานข้อมูล + โหลดรายชื่อก่อน)\n" +
    "  _ssoSync(){ try{ if(this._ssoDone||typeof window==='undefined'||!window.WCTag) return; if(!/[?&]wsso=/.test(window.location.search)){ this._ssoDone=true; return; }\n" +
    "    if(!this._authed||!(this.state.accounts||[]).length) return; this._ssoDone=true;\n" +
    "    window.WCTag.ssoTake(this._sb).then(em=>{ if(!em){ this.showToast('ลิงก์เข้าสู่ระบบอัตโนมัติหมดอายุ / ใช้แล้ว — เข้าสู่ระบบตามปกติ'); return; }\n" +
    "      const S=this.state; if(S.loggedIn&&S.me&&String(S.me.email||'').toLowerCase()===em) return;\n" +
    "      try{ window.localStorage.setItem(this.SESS_KEY(), JSON.stringify({ email:em, at:Date.now() })); }catch(e){} this._sessRestore(); }); }catch(e){} }\n" +
    "  _wctSync(){"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เข้าสู่ระบบครั้งเดียว ข้ามแอป (Wellcon PM)');
