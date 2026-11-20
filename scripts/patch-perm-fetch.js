#!/usr/bin/env node
/* =====================================================================
   v1.435.2 perm-fetch — กันหน้าแรกค้าง "กำลังโหลดสิทธิ์…" อีกชั้น (ผู้บริหารแจ้งซ้ำ 20/11/2026)
     node scripts/patch-perm-fetch.js        (รันหลัง patch-perm-early.js)
   - `_permFetch()` ดึงเฉพาะค่าสิทธิ์ (workPages · featGlobal · featRole · featProj · workUser · workUserAdd) จาก app_state ตรง ๆ
     ไม่ขึ้นกับรอบซิงก์ใหญ่ — เรียกอัตโนมัติเมื่อรอสิทธิ์เกิน 2 วินาที · ปุ่ม "ลองอีกครั้ง" เรียกด้วย
   - ได้ค่าว่าง (ยังไม่ได้เข้าสู่ระบบเซิร์ฟเวอร์ / หมดอายุ) → ไม่ถือว่าได้สิทธิ์ · บอกให้ออกจากระบบแล้วเข้าใหม่
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
const MARK = 'v1.435.2 perm-fetch';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (perm-fetch)'); process.exit(0); }
if (!t.includes('v1.435.1 perm-early')) { console.error('✗ ต้องรัน scripts/patch-perm-early.js ก่อน'); process.exit(1); }
const R = [
  ['_permEarly: ต้องมีค่าสิทธิ์จริงจึงถือว่าได้',
   "    this._permOk=true; this.setState(P); }",
   "    if(!P.workPages&&!P.featGlobal) return; this._permOk=true; this.setState(P); }   /* " + MARK + ": ค่าว่าง (ยังไม่ได้เข้าสู่ระบบเซิร์ฟเวอร์) ไม่นับ */\n" +
   "  async _permFetch(){ if(!this._sb||this._permBusy) return; this._permBusy=true;   // " + MARK + "\n" +
   "    try{ const r=await this._sb.from('app_state').select('id,data').in('id',['workPages','featGlobal','featRole','featProj','workUser','workUserAdd']); this._permEarly(r); this._permTried=r&&!r.error&&!this._permOk?'empty':(r&&r.error?'err':''); }\n" +
   "    catch(e){ this._permTried='err'; } this._permBusy=false; this.forceUpdate(); }"],
  ['หน้าแรก: รอเกิน 2 วินาที → ดึงสิทธิ์ตรง',
   "    const tiles0=(_permWait?[]:list).map(info)",
   "    if(_permWait&&!this._permFetchT){ this._permFetchT=setTimeout(()=>{ this._permFetchT=null; this._permFetch(); }, 2000); }   /* " + MARK + " */\n    const tiles0=(_permWait?[]:list).map(info)"],
  ['ข้อความ: ยังไม่ได้เข้าสู่ระบบเซิร์ฟเวอร์',
   "out.wkPermMsg=this._stPulledOk===false?",
   "out.wkPermMsg=this._permTried==='empty'?'ยังเชื่อมต่อบัญชีกับเซิร์ฟเวอร์ไม่ได้ — กด “ออกจากระบบ” แล้วเข้าสู่ระบบใหม่':this._stPulledOk===false||this._permTried==='err'?"],
  ['ปุ่มลองอีกครั้ง: ดึงสิทธิ์ตรงด้วย',
   "Promise.resolve(this.sbPull(false)).catch(()=>{})",
   "this._permFetch(); Promise.resolve(this.sbPull(false)).catch(()=>{})"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ perm-fetch: แก้ ' + R.length + ' จุด');
