#!/usr/bin/env node
/* =====================================================================
   v1.406.0 page-access — ผู้บริหารสั่ง 15/11/2026: ยกเลิกเมนูดรอปดาวน์ "หน้าในโครงการ" · ผู้ใช้เข้าได้เฉพาะหน้าที่เปิดให้
     node scripts/patch-page-access.js        (รันหลัง patch-nav-pagebar.js)
   · ยกเลิกแถบ "หน้าในโครงการ" (ดรอปดาวน์) ทั้งบนหน้าโครงการและหน้าแยก (ปฏิทิน · สัญญาช่าง · ออกหนังสือ) — เข้าหน้าจากการ์ดหน้าแรก
   · สิทธิ์เข้าหน้าในโครงการ = การ์ดที่เปิดให้ (ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน):
       เข้าได้ = การ์ดของตำแหน่ง ∪ การ์ดรายคนของคนนั้น (+ การ์ดเพิ่มรายคนตั้งต้น) · 'tab:mat' / 'tab:procm' นับเป็นคู่เดียวกัน
       เข้าได้เสมอ = ภาพรวมโครงการ (overview) · หน้าที่ไม่มีการ์ดให้ตั้ง (takeoff เดิม · eng)
       Super Admin ไม่ถูกจำกัด · ตำแหน่งที่ไม่มีชุดการ์ดเลย (ไม่มีค่าเริ่มต้น และ Admin ไม่ได้ตั้ง) ไม่ถูกจำกัด — เหมือนเดิม
   · หน้าที่ไม่ได้เปิดให้: หายจากค้นหา (Ctrl+K) / ปักหมุด / แผง "จัดการ์ดของฉัน" · เปิดจากลิงก์เก่า · แจ้งเตือน · ปุ่มในหน้าภาพรวม → แจ้งข้อความ และกลับหน้าภาพรวม
     (ผู้ใช้ยังซ่อน / จัดเรียงการ์ดของตัวเองได้ แต่เพิ่มหน้าเกินที่ Admin เปิดให้ไม่ได้)
   · เมนูหลัก (nav:…) ใช้สิทธิ์เดิม ไม่เปลี่ยน
   ไม่มีข้อมูลใหม่ (อ่าน workPages / workUser เดิม) · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.406.0 page-access';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (สิทธิ์เข้าหน้าตามการ์ด)'); process.exit(0); }
if (!t.includes('v1.405.0 nav-pagebar')) { console.error('✗ ต้องรัน scripts/patch-nav-pagebar.js ก่อน'); process.exit(1); }

const MSG = "'หน้านี้ยังไม่ได้เปิดให้ตำแหน่งของคุณ — ติดต่อผู้ดูแลระบบ'";

// ก) ตัวตรวจสิทธิ์
const A_OLD = "  _workSave(rk, arr){";
const A_NEW =
  "  // ===== " + MARK + ": สิทธิ์เข้าหน้าในโครงการ = การ์ดที่เปิดให้ (ตำแหน่ง ∪ รายคน) · null = ไม่จำกัด =====\n" +
  "  _pgAllowSet(){ const me=this.state.me||{}; const rk=String(me.roleKey||''); if(!rk||rk==='superadmin') return null;\n" +
  "    const e=String(me.email||'').trim().toLowerCase(); const W=this.state.workPages||{};\n" +
  "    const role=this.WORK_LIST(rk)||[], own=this.WORK_USER(e)||[], add=this.WORK_USER_ADD(e)||[];\n" +
  "    if(!Array.isArray(W[rk])&&!role.length&&!own.length&&!add.length) return null;   // ตำแหน่งที่ไม่มีชุดการ์ดเลย → ไม่จำกัด (เหมือนเดิม)\n" +
  "    const s={}; [...role, ...own, ...add].forEach(k=>{ s[k]=1; }); if(s['tab:mat']||s['tab:procm']){ s['tab:mat']=1; s['tab:procm']=1; } return s; }\n" +
  "  _pgAllowed(k){ if(['overview','takeoff','eng'].indexOf(k)>=0) return true; const s=this._pgAllowSet(); return !s||!!s['tab:'+k]; }\n" +
  A_OLD;

// ข) รายการหน้าในโครงการของผู้ใช้ (เมนู · ค้นหา · ปักหมุด · การ์ด) — ตัดหน้าที่ไม่ได้เปิดให้
const B_OLD = "_tabBase=_tabBase.filter(d=>d[0]==='overview'||!this._featGOff('tab:'+d[0]));";
const B_NEW = B_OLD + " _tabBase=_tabBase.filter(d=>this._pgAllowed(d[0]));   /* " + MARK + " */";

// ค) เปิดหน้าที่ไม่ได้เปิดให้ (ลิงก์เก่า / ปุ่มในหน้าภาพรวม) → กลับภาพรวม + แจ้ง
const C_OLD = "this._tabFixT=setTimeout(()=>{ this._tabFixT=null; this.setState({ pdTab:'overview' }); }, 0);";
const C_NEW = "{ const _blk=!this._pgAllowed(S.pdTab)&&(this._lastTabAll||[]).some(d=>d[0]===S.pdTab);   /* " + MARK + " */\n" +
  "        this._tabFixT=setTimeout(()=>{ this._tabFixT=null; this.setState({ pdTab:'overview' }); if(_blk) this.showToast(" + MSG + "); }, 0); }";

// ง) เปิดหน้าผ่าน _openTab (การ์ด · ทางลัด · หน้าที่เปิดเป็นแอป/หน้าแยก)
const D_OLD = "  _openTab(pid,k){ ";
const D_NEW = "  _openTab(pid,k){ if(!this._pgAllowed(k)){ this.showToast(" + MSG + "); return; }   /* " + MARK + " */\n    ";

// จ) ยกเลิกแถบดรอปดาวน์ "หน้าในโครงการ"
const E_OLD = "pdTabBarShow:S.screen==='projectDetail', pdTabBarTop";
const E_NEW = "pdTabBarShow:false /* " + MARK + ": ยกเลิกแถบดรอปดาวน์ */, pdTabBarTop";
const F_OLD = "pgBarLinked:_pgLinked, pgBarValue";
const F_NEW = "pgBarLinked:false, pgBarValue";

// ฉ) ตั้งค่าระบบ: บอก Admin ว่าซ่อนการ์ด = เข้าหน้านั้นไม่ได้
const G_OLD = "}}) — กดเพื่อแสดง</div>";
const G_NEW = "}}) — กดเพื่อแสดง · หน้าในโครงการที่ซ่อนอยู่ ผู้ใช้เข้าไม่ได้</div>";

const R = [
  ['ตัวตรวจสิทธิ์เข้าหน้า', A_OLD, A_NEW, 1],
  ['รายการหน้าในโครงการของผู้ใช้', B_OLD, B_NEW, 1],
  ['กลับภาพรวมเมื่อเปิดหน้าที่ไม่ได้เปิดให้', C_OLD, C_NEW, 1],
  ['เปิดหน้าผ่านการ์ด / ทางลัด', D_OLD, D_NEW, 1],
  ['แถบหน้าในโครงการ (หน้าโครงการ)', E_OLD, E_NEW, 1],
  ['แถบหน้าในโครงการ (หน้าแยก)', F_OLD, F_NEW, 1],
  ['หัวข้อการ์ดที่ซ่อน', G_OLD, G_NEW, 2],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ สิทธิ์เข้าหน้าตามการ์ด + ยกเลิกแถบดรอปดาวน์: แก้ ' + pts + ' จุด');
