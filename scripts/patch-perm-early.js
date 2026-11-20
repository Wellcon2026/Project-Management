#!/usr/bin/env node
/* =====================================================================
   v1.435.1 perm-early — โหลดสิทธิ์ (app_state) เสร็จก่อน ไม่ต้องรอตารางใหญ่ (ผู้บริหารแจ้ง 20/11/2026: หน้าแรกค้าง "กำลังโหลดสิทธิ์…")
     node scripts/patch-perm-early.js        (รันหลัง patch-photo-storage.js)
   - sbPull: เมื่อผลดึง app_state มาถึง → ใส่ค่าสิทธิ์ (workPages · featGlobal · featRole · featProj · workUser · workUserAdd) ทันที
     และตั้ง _permOk=true — หน้าแรกแสดงการ์ดได้เลย ไม่ต้องรอ punch_log / daily_reports ที่ยังหนัก
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
const MARK = 'v1.435.1 perm-early';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (perm-early)'); process.exit(0); }
if (!t.includes('v1.435.0 photo-storage')) { console.error('✗ ต้องรัน scripts/patch-photo-storage.js ก่อน'); process.exit(1); }
const R = [
  ['ดึง app_state: ใส่ค่าสิทธิ์ทันทีที่มาถึง',
   ".not('id','in','(bugLog,presLog)').then(r=>r, ()=>({error:true}));",
   ".not('id','in','(bugLog,presLog)').then(r=>{ try{ this._permEarly(r); }catch(e){} return r; }, ()=>({error:true}));   /* " + MARK + " */"],
  ['ฟังก์ชันใส่ค่าสิทธิ์',
   "  async sbPull(initial){",
   "  _permEarly(r){ if(!r||r.error||!Array.isArray(r.data)) return; const K=['workPages','featGlobal','featRole','featProj','workUser','workUserAdd']; const P={};   // " + MARK + "\n    r.data.forEach(x=>{ if(K.indexOf(x.id)>=0&&!(this._stUnsent||{})[x.id]&&!Object.keys(((this._stPend||{})[x.id])||{}).length) P[x.id]=(x.data||{}).v; });\n    this._permOk=true; this.setState(P); }\n  async sbPull(initial){"],
  ['หน้าแรก: ได้สิทธิ์แล้วแสดงการ์ด',
   "const _permWait=!!this._sb&&this._stPulledOk!==true&&",
   "const _permWait=!!this._sb&&this._stPulledOk!==true&&!this._permOk&&"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ perm-early: แก้ ' + R.length + ' จุด');
