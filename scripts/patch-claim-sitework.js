#!/usr/bin/env node
/* =====================================================================
   Claim มีที่เดียว = ในแอป Wellcon Site Work (/claim) — ข้อมูลชุดเดียว (app_state damageClaims) · ไม่มี Claim แยกใน PM อีก
     node scripts/patch-claim-sitework.js        (รันต่อจาก patch-tags.js)
   - เมนู / การ์ด "Claim · เคลมความเสียหาย" ใน PM → เปิด Site Work /claim (แท็บใหม่ · โครงการเดียวกัน) แบบเดียวกับเมนู Site Work
   - /claim.html ของ PM = หน้าส่งต่อ (ลิงก์เก่า / แท็กเก่า ยังใช้ได้)
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
if (t.includes('CLAIM_SW v1.382.0')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Claim อยู่ใน Site Work)'); process.exit(0); }
const a = "_claimOpen(pid){ if(!pid) return; this._pmHandoff(); try{ window.location.href='/claim.html?pid='+encodeURIComponent(pid)+(this.IS_STAGING()?'&env=staging':''); }catch(e){} }";
const b = "_claimOpen(pid){ if(!pid) return; const st=this.IS_STAGING(); const base=((st&&window.__wdcBase)||'https://wellcon-defect-check.vercel.app/').replace(/\\/?$/,'/');   // CLAIM_SW v1.382.0 Claim มีที่เดียว = ใน Wellcon Site Work · ข้อมูลชุดเดียว\n" +
  "    const u=base+'claim?pid='+encodeURIComponent(pid)+(st?'&env=staging':''); try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ window.location.href=u; } }";
const n = t.split(a).length - 1;
if (n !== 1) { console.error('✗ จุด "_claimOpen" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
t = t.replace(a, () => b); console.log('  ✓ เมนู Claim → Site Work /claim');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Claim มีที่เดียว (Wellcon Site Work)');
