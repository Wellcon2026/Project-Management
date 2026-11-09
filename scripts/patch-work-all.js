#!/usr/bin/env node
/* =====================================================================
   หน้าทำงานของ Super Admin — แสดงทุกเมนู (ทุกหน้าในโครงการ + ทุกเมนูหลัก) · ซ่อนเองได้ทีละการ์ด
     node scripts/patch-work-all.js        (รันหลัง patch-work-arrange.js)
   - การ์ดที่ยังไม่อยู่ในหน้า (รวมเมนูใหม่ในอนาคต) ต่อท้ายให้อัตโนมัติ · ยกเว้นที่กดซ่อนไว้ (workPages.superadmin__off)
   - โหมด "↕ จัดเรียงการ์ด": ปุ่ม ✕ บนการ์ด = ซ่อน · เพิ่มกลับได้ที่แผง "จัดปุ่มหน้าแรก" ด้านล่าง
   - ใช้ได้กับทุกตำแหน่งในโหมดจัดเรียง (ซ่อน = เอาออกจากหน้าตำแหน่งนั้น)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
if (t.includes('_wkHide(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Super Admin เห็นทุกเมนู)'); process.exit(0); }
const X_BTN = 'flex:none;width:30px;height:30px;border-radius:9px;border:1px solid #F0C9C0;background:#FFF5F2;color:#B4442E;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;padding:0';
const E = [
  ['เมธอดซ่อน / เพิ่มกลับ', "  WORK_VALS(S){ const out={ isWork:S.screen==='work' };", (a) => `  // v1.365.2 work-all: ซ่อนการ์ด (Super Admin จำไว้ที่ superadmin__off ไม่ให้ต่อท้ายกลับเอง) · เพิ่มกลับ = เอาออกจากรายการซ่อน
  _wkHide(rk, list, k){ const W={ ...(this.state.workPages||{}) }; W[rk]=list.filter(x=>x!==k);
    if(rk==='superadmin'){ const o=Array.isArray(W.superadmin__off)?W.superadmin__off:[]; W.superadmin__off=o.indexOf(k)>=0?o:[...o,k]; }
    this.setState({ workPages:W }); this.showToast('ซ่อนการ์ดแล้ว — เพิ่มกลับได้ที่แผง "จัดปุ่มหน้าแรก" ด้านล่าง'); }
  _wkAdd(rk, list, k){ const W={ ...(this.state.workPages||{}) }; W[rk]=[...list.filter(x=>x!==k), k];
    if(rk==='superadmin'&&Array.isArray(W.superadmin__off)) W.superadmin__off=W.superadmin__off.filter(x=>x!==k);
    this.setState({ workPages:W }); }
` + a],
  ['รายการเป็นตัวแปร', "const list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';", () => "let list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';"],
  ['Super Admin เห็นทุกเมนู', "const NM=this._lastNavMap||{}, CT=this.CAT(), NC=this.NAV_CAT();", (a) => a + `
    if(rk==='superadmin'){ const W0=S.workPages||{}; const off=Array.isArray(W0.superadmin__off)?W0.superadmin__off:[];   // v1.365.2 work-all
      const all=['dhome', ...defs.map(d=>'tab:'+d[0]), ...Object.keys(NM).filter(k=>['dashboard','work'].indexOf(k)<0).map(k=>'nav:'+k)];
      list=[...list, ...all.filter((k,i)=>all.indexOf(k)===i && list.indexOf(k)<0 && off.indexOf(k)<0)]; }`],
  ['แผงด้านล่าง: ลบ = ซ่อน', "onDel:()=>this._workSave(rk,list.filter(x=>x!==k))", () => "onDel:()=>this._wkHide(rk,list,k)"],
  ['แผงด้านล่าง: เพิ่มกลับ', "const add=(k)=>this._workSave(rk,[...list,k]);", () => "const add=(k)=>this._wkAdd(rk,list,k);"],
  ['ปุ่ม ✕ บนการ์ด (ข้อมูล)', "onLeft:(e)=>{ _stop(e); _mvK(t.key,-1); },", (a) => "onHide:(e)=>{ _stop(e); this._wkHide(rk,list,t.key); }, " + a],
  ['ปุ่ม ✕ บนการ์ด (หน้าจอ)', 'title="เลื่อนไปถัดไป" style="', (a) => a],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
const rb = t.indexOf('title="เลื่อนไปถัดไป" style="'); const close = t.indexOf('</button>', rb);
if (rb < 0 || close < 0 || close - rb > 600) { console.error('✗ ไม่พบปุ่ม ▶ บนการ์ด — ไม่แก้ไฟล์'); process.exit(1); }
t = t.slice(0, close + 9) + '<button sc-camel-on-click="{{ t.onHide }}" title="ซ่อนการ์ดนี้" style="' + X_BTN + '">✕</button>' + t.slice(close + 9);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าทำงาน Super Admin: แสดงทุกเมนู · ซ่อนเองได้ด้วย ✕');
