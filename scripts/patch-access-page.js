#!/usr/bin/env node
/* =====================================================================
   v1.418.0 access-page — ผู้บริหารสั่ง 17/11/2026: หน้าตั้งค่าสิทธิ์แบบตาราง (เหมือนไฟล์ Excel "Feature by Position")
     node scripts/patch-access-page.js        (รันหลัง patch-quotation-menu.js)
   · ตัวหน้า: access.html + access.js (หน้าแยก) — ใช้ข้อมูลชุดเดียวกับแอปหลัก (workPages · featGlobal · featRole · workUser)
   · แอปหลัก (สคริปต์นี้):
     1) ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน: ปุ่ม "ตารางสิทธิ์ตามตำแหน่ง ↗" (เห็นเฉพาะผู้ดูแลการ์ด = Super Admin / สิทธิ์จัดการผู้ใช้ระดับแก้ไข)
     2) สิทธิ์พิเศษรายคน: app_state 'workUserAdd' { email: [การ์ด] } — รวมเข้า WORK_USER_ADD (การ์ดหน้าแรก + สิทธิ์เข้าหน้า + สิทธิ์ดูตัวเลขเงินจากการ์ดการเงิน)
        ซิงก์แบบเดียวกับ featProj (โหลด / จำในเครื่อง / ไม่ถูกเขียนทับตอนบันทึกทั้งก้อน)
     3) Layboard: เลิกเติมการ์ดให้อัตโนมัติเมื่อตำแหน่งนั้นตั้งชุดการ์ดเองแล้ว — ตารางสิทธิ์เป็นตัวกำหนด (ตำแหน่งที่ยังใช้ชุดเริ่มต้นยังเติมเหมือนเดิม)
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.418.0 access-page';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ตารางสิทธิ์ตามตำแหน่ง)'); process.exit(0); }
if (!t.includes('v1.407.0 feat-proj')) { console.error('✗ ต้องรัน scripts/patch-feat-proj.js ก่อน'); process.exit(1); }

const BADGE = '<span style="font-size:10px;color:#8A6D3B;background:#F5EAD6;padding:3px 9px;border-radius:7px;font-weight:700">Admin</span>\n            </div>';
const R = [
  ['สิทธิ์พิเศษรายคน (WORK_USER_ADD)',
   "  WORK_USER_ADD(e){ return ({ 'supanan@wellcon.co.th':['tab:aw'] })[String(e||'').trim().toLowerCase()]||[]; }",
   "  WORK_USER_ADD(e){ const k=String(e||'').trim().toLowerCase(); const a=({ 'supanan@wellcon.co.th':['tab:aw'] })[k]||[]; const s=(this.state.workUserAdd||{})[k];   // " + MARK + ": + app_state 'workUserAdd' (หน้า access.html)\n" +
   "    return Array.isArray(s)&&s.length?[...a, ...s.filter(x=>a.indexOf(x)<0)]:a; }", 1],
  ['ซิงก์: SB_STATE_KEYS + PERSIST_KEYS', "'featGlobal','featRole','featProj','claimRates'", "'featGlobal','featRole','featProj','workUserAdd','claimRates'", 2],
  ['ซิงก์: ข้ามตอน push ทั้งก้อน', "k==='featGlobal'||k==='featRole'||k==='featProj'||", "k==='featGlobal'||k==='featRole'||k==='featProj'||k==='workUserAdd'||", 1],
  ['Layboard: ไม่เติมการ์ดเองเมื่อตำแหน่งตั้งชุดการ์ดแล้ว',
   "if(!isSuper && !_uOwn && this.featOn('lay') && list.length && list.indexOf('tab:lay')<0) list=[...list,'tab:lay'];",
   "if(!isSuper && !_uOwn && !Array.isArray((S.workPages||{})[rk]) && this.featOn('lay') && list.length && list.indexOf('tab:lay')<0) list=[...list,'tab:lay'];   /* " + MARK + ": ตารางสิทธิ์เป็นตัวกำหนด */", 1],
  ['ปุ่มเปิดตารางสิทธิ์ (ค่า)', "  CC_VALS(S){ const out={ ccShow:false }; if(S.screen!=='system'||!this._cardAdminOk()) return out; out.ccShow=true;",
   "  CC_VALS(S){ const out={ ccShow:false }; if(S.screen!=='system'||!this._cardAdminOk()) return out; out.ccShow=true;\n" +
   "    out.onAccOpen=()=>{ try{ window.location.href='/access.html'+(this.IS_STAGING()?'?env=staging':''); }catch(e){} };   // " + MARK, 1],
  ['ปุ่มเปิดตารางสิทธิ์ (หน้าจอ)', BADGE,
   '<span style="font-size:10px;color:#8A6D3B;background:#F5EAD6;padding:3px 9px;border-radius:7px;font-weight:700">Admin</span>\n' +
   '              <span style="flex:1"></span><!-- ' + MARK + ' --><button sc-camel-on-click="{{ onAccOpen }}" title="ตารางตำแหน่ง × ฟีเจอร์ แบบไฟล์ Excel · สิทธิ์พิเศษรายคน · นำเข้า / ดาวน์โหลด Excel" style="border:0;background:#1C1B18;color:#E2BC66;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap" style-hover="background:#33302A">▦ ตารางสิทธิ์ตามตำแหน่ง ↗</button>\n            </div>', 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ตารางสิทธิ์ตามตำแหน่ง: แก้ ' + pts + ' จุด');
