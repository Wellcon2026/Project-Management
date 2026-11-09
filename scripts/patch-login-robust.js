#!/usr/bin/env node
/* =====================================================================
   ล็อกอินพนักงาน — กัน "รหัสผ่านไม่ถูกต้อง" ทั้งที่รหัสถูก
     node scripts/patch-login-robust.js
   - ชื่อซ้ำหลายบัญชี (เช่น admin) → ตรวจรหัสกับทุกบัญชีที่ชื่อตรง (ชื่อผู้ใช้ตรงตัวก่อน) ไม่ใช่แค่บัญชีแรก
   - รหัสไม่ตรง → รอเชื่อมเซิร์ฟเวอร์ (≤5 วิ) + ดึงทะเบียนบัญชีล่าสุดจากเซิร์ฟเวอร์ แล้วตรวจซ้ำอีกครั้งก่อนแจ้งผิด
     (กรณีกดเข้าสู่ระบบก่อนข้อมูลโหลดเสร็จ หรือเพิ่งเปลี่ยนรหัสจากเครื่องอื่น)
   - เงื่อนไขรหัสเหมือนเดิมทุกอย่าง (pass ถ้ามี · ไม่มีใช้ pin · ไม่มีใช้ 1234) — ไม่ลดความปลอดภัย
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
if (t.includes('v1.366.3 login-robust')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ล็อกอิน)'); process.exit(0); }
const OLD = `    let acc=pick();
    if(!acc && this._sb && this._authed){ try{ await this.sbPull(true); }catch(e){} acc=pick(); }
    if(!acc){ this.setState({ loginError:'ไม่พบชื่อผู้ใช้นี้ในระบบ — แจ้ง Super Admin ตรวจในหน้าStaff / Project' }); return; }
    const good=String(acc.pass||'')||String(acc.pin||'1234');
    if(pw!==good){ this.setState({ loginError:'รหัสผ่านไม่ถูกต้อง' }); return; }`;
const NEW = `    // v1.366.3 login-robust: ตรวจทุกบัญชีที่ชื่อตรง (ชื่อผู้ใช้ตรงตัวก่อน) · รหัสไม่ตรง → ดึงบัญชีล่าสุดจากเซิร์ฟเวอร์แล้วตรวจซ้ำ
    const rank=(a)=>norm(a.username)===key?0:norm(a.email)===key?1:norm(a.email).split('@')[0]===key?2:3;
    const cands=()=>this.ACCOUNTS().filter(a=>norm(a.username)===key || norm(a.email)===key
      || norm(a.email).split('@')[0]===key || norm(a.name)===key || norm(this.nickOf(a))===key).sort((x,y)=>rank(x)-rank(y));
    const okPw=(a)=>pw===(String(a.pass||'')||String(a.pin||'1234'));
    let L=cands(); let acc=L.find(okPw)||null;
    if(!acc && this._sb && !this.state.demoMode){ this.setState({ loginError:'กำลังตรวจสอบกับเซิร์ฟเวอร์…' });
      for(let i=0;i<25 && !this._authed;i++) await new Promise(r=>setTimeout(r,200));
      if(this._authed){ try{ await this.sbPull(true); }catch(e){} }
      L=cands(); acc=L.find(okPw)||null; }
    if(!acc && !L.length){ this.setState({ loginError:'ไม่พบชื่อผู้ใช้นี้ในระบบ — แจ้ง Super Admin ตรวจในหน้าStaff / Project' }); return; }
    if(!acc){ this.setState({ loginError:'รหัสผ่านไม่ถูกต้อง' }); return; }`;
const n = t.split(OLD).length - 1;
if (n !== 1) { console.error('✗ จุดตรวจรหัสผ่าน พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
t = t.replace(OLD, () => NEW); console.log('  ✓ ตรวจรหัสกับทุกบัญชีที่ชื่อตรง + ดึงข้อมูลล่าสุดก่อนแจ้งผิด');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ล็อกอินพนักงาน: แก้ปัญหารหัสถูกแต่ขึ้นว่าไม่ถูกต้อง');
