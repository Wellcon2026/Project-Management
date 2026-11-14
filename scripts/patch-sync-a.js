#!/usr/bin/env node
/* =====================================================================
   v1.397.0 sync-a — ตรวจทั้งระบบ รอบ A (ผู้บริหารอนุมัติ 14/11/2026 ข้อ 1 · 5)
     node scripts/patch-sync-a.js        (รันต่อจาก patch-vo-si-tag.js)
   1) "ตัวเลขเงินโครงการ" ดูได้ตามตำแหน่ง — สวิตช์ใหม่ 'money' (ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน · ปรับรายตำแหน่ง / รายคนได้)
      ค่าเริ่มต้นเปิด: Super Admin · Director · PM · PM Manager · QS · QS Manager · การเงิน · Finance Manager · จัดซื้อ · Design Manager
      + คนที่ Admin ใส่การ์ดหน้าการเงินให้รายคนไว้แล้ว (งานเพิ่ม · VO Tracker / การเงิน / สัญญาช่าง) — คงสิทธิ์เดิม
      ค่าเริ่มต้นปิด: Site Manager · หัวหน้าช่าง · Designer · โรงงาน · Store · ธุรการ · จป. · ฝ่ายบุคคล · พนักงานขับรถ
      คนที่ไม่มีสิทธิ์:
        · ไม่เห็นเมนู "การเงิน · งวดเบิกเงิน" · "งานเพิ่ม · VO Tracker (QS)" · "สัญญาช่าง · จ่ายงวดช่าง" (เปิดลิงก์ตรงก็เด้งกลับ)
        · ไม่เห็นแผง "💰 สัญญา & การเงิน" ในหน้า Project Management
        · ตัวเลขเงินทุกจุดที่ใช้ตัวจัดรูปแบบกลาง money() แสดง "—" (มูลค่างาน · VO · เก็บเงิน ฯลฯ)
        · ผู้ช่วย AI ไม่ได้รับข้อมูลการเงิน
      เงินเดือนในหน้าบุคลากรไม่เกี่ยว (ใช้สิทธิ์หน้าบุคลากรตามเดิม — ตัวจัดรูปแบบ _moneyRaw)
      สถานะ VO / SI / EOT (อนุมัติแล้วหรือยัง) ยังดูได้ที่หน้า "VO / SI / EOT · งานเพิ่ม-ลด" — ไม่มีตัวเลขเงิน
   5) หน้าแรก: สถานะ ล่าช้า / เลยกำหนด ใช้ "วันสิ้นสุดสัญญา + วันขยายที่อนุมัติแล้ว" — กติกาเดียวกับหน้าโครงการ
      (เดิมหน้าแรกไม่นับวันขยาย → ขึ้นล่าช้าทั้งที่ EOT อนุมัติแล้ว)
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.397.0 sync-a';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ตัวเลขเงินตามตำแหน่ง · หน้าแรกนับวันขยายสัญญา)'); process.exit(0); }
if (!t.includes('v1.396.0 vo-si-tag')) { console.error('✗ ต้องรัน scripts/patch-vo-si-tag.js ก่อน'); process.exit(1); }

const HELPERS =
  "  // ===== " + MARK + ": ตัวเลขเงินโครงการ ดูได้ตามตำแหน่ง (สวิตช์ 'money' — รายคน > ตำแหน่ง > ค่าเริ่มต้น · Super Admin เห็นเสมอ) =====\n" +
  "  _MONEY_DEF(){ return ['superadmin','director','pm','pm_mgr','qs','qs_mgr','fin','fin_mgr','proc','design_mgr']; }\n" +
  "  moneyOk(acc){ const a=acc||this.state.me; if(!a||!a.roleKey) return true; if(a.roleKey==='superadmin') return true; return this.featOn('money', a); }\n" +
  "  // วันสิ้นสุดสัญญาที่ใช้จริง = วันในสัญญา + วันขยายของงานเพิ่ม-ลด / EOT ที่อนุมัติแล้ว (กติกาเดียวกับหน้าโครงการ)\n" +
  "  _effEndISO(p){ if(!p||!p.endISO) return ''; const d=(this.state.changes||[]).reduce((n,c)=>n+((c&&c.project===p.id&&c.status==='approved')?(Number(c.days)||0):0),0);\n" +
  "    if(!d) return p.endISO; const x=new Date(p.endISO).getTime(); if(!isFinite(x)) return p.endISO; return new Date(x+d*86400000).toISOString().slice(0,10); }\n";

const R = [
  // ---------- 1) ตัวเลขเงินตามตำแหน่ง ----------
  ['สวิตช์ในตั้งค่า', "    { key:'bank',  label:'ธนาคาร · วงเงิน',",
   "    { key:'money', label:'ตัวเลขเงินโครงการ', note:'การเงิน · งวดเบิกเงิน · VO Tracker · สัญญาช่าง · มูลค่างาน — ค่าเริ่มต้นเปิด: ผู้บริหาร · PM · QS · การเงิน · จัดซื้อ' },\n    { key:'bank',  label:'ธนาคาร · วงเงิน',"],
  ['ค่าเริ่มต้นตามตำแหน่ง', "    if(key==='lay') return this._LAY_DEF().indexOf(a.roleKey)>=0;   // v1.366.2 layboard-access",
   "    if(key==='lay') return this._LAY_DEF().indexOf(a.roleKey)>=0;   // v1.366.2 layboard-access\n    if(key==='money'){ if(this._MONEY_DEF().indexOf(a.roleKey)>=0) return true;   // คนที่ Admin ใส่การ์ดหน้าการเงินให้รายคนไว้แล้ว (เช่น งานเพิ่ม · VO Tracker) = เห็นตัวเลขเงิน\n      const e=String(a.email||'').trim().toLowerCase(); if(!e) return false; return [...(this.WORK_USER(e)||[]), ...this.WORK_USER_ADD(e)].some(k=>k==='tab:aw'||k==='tab:fin'||k==='tab:subcon'); }"],
  ['ตัวช่วย', "  featDefault(key, a){", HELPERS + "  featDefault(key, a){"],
  ['ตัวจัดรูปแบบเงินกลาง', "  money(n){ const a=Math.abs(n);", "  money(n){ if(!this.moneyOk()) return '—'; return this._moneyRaw(n); }\n  _moneyRaw(n){ const a=Math.abs(n);"],
  // เงินเดือนในหน้าบุคลากร ไม่ใช่ตัวเลขเงินโครงการ — ใช้สิทธิ์ของหน้าบุคลากรตามเดิม
  ['หน้าบุคลากร: ฐานเงินเดือนรวม', "S.demoMode?'—':this.money(payrollTotal)", "S.demoMode?'—':this._moneyRaw(payrollTotal)"],
  ['หน้าบุคลากร: เงินเดือนรายคน', "isM?this.money(s.salary):", "isM?this._moneyRaw(s.salary):", 2],
  ['สิทธิ์ในเมนูโครงการ', "    const _procOk=this.permOf('procurement')!=='none';\n    let _tabBase=", "    const _procOk=this.permOf('procurement')!=='none', _mnyOk=this.moneyOk();\n    let _tabBase="],
  ['เมนู การเงิน · VO Tracker · สัญญาช่าง',
   "['fin','การเงิน · งวดเบิกเงิน'],['aw','งานเพิ่ม · VO Tracker (QS)'],...(_procOk?[['proc','จัดซื้อวัสดุ'],['subcon','สัญญาช่าง · จ่ายงวดช่าง'],",
   "...(_mnyOk?[['fin','การเงิน · งวดเบิกเงิน'],['aw','งานเพิ่ม · VO Tracker (QS)']]:[]),...(_procOk?[['proc','จัดซื้อวัสดุ'],...(_mnyOk?[['subcon','สัญญาช่าง · จ่ายงวดช่าง']]:[]),"],
  ['หน้าสัญญาช่าง (ลิงก์ตรง)', "    if(!_procOk&&(S.pdTab==='proc')) setTimeout(()=>this.setState({pdTab:'overview'}),0);",
   "    if(!_procOk&&(S.pdTab==='proc')) setTimeout(()=>this.setState({pdTab:'overview'}),0);\n" +
   "    if(S.screen==='subcon'&&!_mnyOk&&!this._mnyFixT) this._mnyFixT=setTimeout(()=>{ this._mnyFixT=null; this.setState({ screen:this._homeScreen(this.state.me) }); this.showToast('หน้านี้มีตัวเลขเงิน — ตำแหน่งของคุณยังไม่ได้เปิดสิทธิ์'); },0);"],
  ['หน้าสัญญาช่าง', "isSubcon:S.screen==='subcon' && this.permOf('procurement')!=='none',", "isSubcon:S.screen==='subcon' && this.permOf('procurement')!=='none' && this.moneyOk(),"],
  ['ข้อมูลให้ผู้ช่วย AI', "    const seeMoney=this.canSee('projects');", "    const seeMoney=this.canSee('projects')&&this.moneyOk();"],
  ['ขอบเขตงาน / BOQ', "seeMoney=this.canSee('projects'), F=(n)=>this._wcMoney(n)", "seeMoney=this.canSee('projects')&&this.moneyOk(), F=(n)=>this._wcMoney(n)"],
  ['แผง 💰 ในหน้า Project Management (ค่าที่เปิดค้าง)', "const P=['team','money','prog'].indexOf(P0)>=0?P0:'';", "const _mk=this.moneyOk(); const P=(['team','money','prog'].indexOf(P0)>=0&&(P0!=='money'||_mk))?P0:'';"],
  ['แผง 💰 ในหน้า Project Management (ปุ่ม)', "tabs:[['team','👥 ทีมงาน'],['money','💰 สัญญา & การเงิน']].map(", "tabs:[['team','👥 ทีมงาน'],...(_mk?[['money','💰 สัญญา & การเงิน']]:[])].map("],
  ['wctag.js เวอร์ชัน (แท็กผู้บริหารตามตำแหน่ง)', 'wctag.js?v=1.2.0', 'wctag.js?v=1.2.1'],
  // ---------- 5) หน้าแรกนับวันขยายสัญญา ----------
  ['การ์ดโครงการหน้าแรก', "_x:{ s:p.startISO||'', e:p.endISO||'', h:p.health||'',", "_x:{ s:p.startISO||'', e:this._effEndISO(p), h:p.health||'',"],
  ['วันคงเหลือ (การเงินรวม)', "const dLeft=p.endISO?Math.round((new Date(p.endISO)-today)/86400000):null;", "const dLeft=p.endISO?Math.round((new Date(this._effEndISO(p))-today)/86400000):null;"],
];
for (const [name, a, , want] of R) { const c = t.split(a).length - 1; if (c !== (want || 1)) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + (want || 1) + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ตัวเลขเงินตามตำแหน่ง · หน้าแรกนับวันขยายสัญญา: แก้ ' + R.length + ' จุด');
