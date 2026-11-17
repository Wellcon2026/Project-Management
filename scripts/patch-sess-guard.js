#!/usr/bin/env node
/* =====================================================================
   v1.422.0 sess-guard — แก้: ออกจากระบบ (Admin) แล้วกลับเข้าเป็นผู้ใช้อื่นเอง (ผู้บริหารแจ้ง 17/11/2026)
     node scripts/patch-sess-guard.js
   สาเหตุ: แต่ละหน้าต่าง / แท็บของ Wellcon PM บันทึก "ผู้ใช้ที่เข้าสู่ระบบ" (localStorage wellcon_pm_session_v1 ใช้ร่วมกันทั้งเครื่อง)
     ทุกครั้งที่หน้าจออัปเดต → หน้าต่างอื่นที่ค้างผู้ใช้อีกคนไว้ (เช่น แอปที่ติดตั้ง + แท็บเบราว์เซอร์) เขียนทับกลับภายในไม่กี่วินาที
     → ออกจากระบบ / เปิดแอปใหม่ แล้วระบบคืนผู้ใช้คนนั้นให้เอง
   แก้: ① หน้าต่างไม่เขียนทับ ถ้าอีกหน้าต่างเข้าสู่ระบบบัญชีอื่นทีหลัง ② หน้าต่างที่ออกจากระบบไม่ลบ / ไม่เขียนของคนอื่น
        ③ เข้า / ออกจากระบบในหน้าต่างหนึ่ง → หน้าต่างอื่นของเครื่องเดียวกันออกจากระบบตาม (เครื่องเดียว = ผู้ใช้คนเดียวในเวลาเดียวกัน)
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
const MARK = 'v1.422.0 sess-guard';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (กันหน้าต่างอื่นเขียนทับผู้ใช้)'); process.exit(0); }
const R = [
  ['บันทึกผู้ใช้: ไม่เขียนทับหน้าต่างอื่น',
   "        if(!S.loggedIn||!S.me){ window.localStorage.removeItem(this.SESS_KEY()); return; }\n        window.localStorage.setItem(this.SESS_KEY(), JSON.stringify({\n          email:String(S.me.email||'').toLowerCase(),",
   "        if(!S.loggedIn||!S.me) return;   // " + MARK + ": ออกจากระบบแล้ว ไม่แตะของหน้าต่างอื่น (ลบเฉพาะตอนกดออกจากระบบ)\n" +
   "        const _my=String(S.me.email||'').toLowerCase(); let _cur=null; try{ _cur=JSON.parse(window.localStorage.getItem(this.SESS_KEY())||'null'); }catch(e){}\n" +
   "        if(_cur&&_cur.email&&_cur.email!==_my&&this._sessFor===_my&&Number(_cur.at||0)>(this._sessAt||0)) return;   // อีกหน้าต่างเข้าสู่ระบบบัญชีอื่นทีหลัง → ไม่เขียนทับ\n" +
   "        this._sessFor=_my; this._sessAt=Date.now();\n" +
   "        window.localStorage.setItem(this.SESS_KEY(), JSON.stringify({\n          email:_my,"],
  ['ออกจากระบบ', "  doLogout(){\n    try{ window.localStorage.removeItem(this.SESS_KEY()); }catch(e){}",
   "  doLogout(){\n    this._sessFor=null; try{ window.localStorage.removeItem(this.SESS_KEY()); }catch(e){}"],
  ['หน้าต่างอื่นเข้า / ออกจากระบบ → หน้าต่างนี้ออกตาม', "    setTimeout(()=>this._sessRestore(), 40);   // คืนสถานะเดิมหลังบัญชีพร้อม",
   "    setTimeout(()=>this._sessRestore(), 40);   // คืนสถานะเดิมหลังบัญชีพร้อม\n" +
   "    this._onSessStore=(e)=>{ try{ if(e.key!==this.SESS_KEY()) return; const S=this.state; if(!S.loggedIn||S.demoMode) return;   // " + MARK + "\n" +
   "      let v=null; try{ v=JSON.parse(e.newValue||'null'); }catch(x){} const my=String((S.me||{}).email||'').toLowerCase(); if(v&&v.email&&v.email===my) return;\n" +
   "      this._sessFor=null; this.setState({ loggedIn:false, me:null, loginEmail:'', loginPin:'', screen:'inbox', topMenu:false,\n" +
   "        loginError:(v&&v.email)?'มีการเข้าสู่ระบบด้วยบัญชีอื่นในหน้าต่าง / แท็บอื่นของเครื่องนี้ — หน้าต่างนี้ออกจากระบบแล้ว':'ออกจากระบบจากหน้าต่าง / แท็บอื่นแล้ว' }); }catch(x){} };\n" +
   "    window.addEventListener('storage', this._onSessStore);"],
  ['ถอด listener', "  componentWillUnmount(){", "  componentWillUnmount(){ try{ window.removeEventListener('storage', this._onSessStore); }catch(e){}"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ กันหน้าต่างอื่นเขียนทับผู้ใช้: แก้ ' + R.length + ' จุด');
