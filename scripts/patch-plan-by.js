#!/usr/bin/env node
/* =====================================================================
   แผนงาน (Gantt): แสดง "ผู้สร้าง" ของแต่ละกิจกรรม — คอลัมน์ใหม่ต่อจาก %
     node scripts/patch-plan-by.js        (รันต่อจาก patch-work-pr.js)
   - กิจกรรมใหม่: บันทึก by (ชื่อเล่น) · byEmail · byAt ตอนกด "เพิ่มกิจกรรม"
   - กิจกรรมเดิม: ดึงจากบันทึกการเปลี่ยนแปลง (รายการ "เพิ่ม") · ถ้าไม่มี (เก่ากว่า 100 รายการล่าสุด / นำเข้า) → "—"
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
if (t.includes('_planBy(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ผู้สร้างกิจกรรมในแผนงาน)'); process.exit(0); }
const COL = 'flex:0 0 64px;min-width:0;max-width:64px;box-sizing:border-box';
const EDITS = [
  ['บันทึกผู้สร้างตอนเพิ่มกิจกรรม', "  soAdd(key,row){ if(key==='plans') this._planLog(row,'เพิ่ม','','','');",
    "  // v1.374.2 แผนงาน: ผู้สร้างกิจกรรม — เก็บตอนเพิ่ม · กิจกรรมเดิมดึงจากบันทึกการเปลี่ยนแปลง (\"เพิ่ม\")\n" +
    "  _planBy(r){ if(!r) return ''; if(r.by) return r.by; const G=this.state.planLog||{}; const pre=String(r.project||'')+'|';\n" +
    "    for(const k of Object.keys(G)){ if(k.indexOf(pre)!==0) continue; const L=G[k]||[]; for(let i=L.length-1;i>=0;i--){ const e=L[i]; if(e&&e.id===r.id&&e.act==='เพิ่ม') return e.by||''; } } return ''; }\n" +
    "  soAdd(key,row){ if(key==='plans'){ const me=this.state.me||{}; row={ by:(this.nickOf&&this.nickOf(me))||me.name||'', byEmail:String(me.email||'').toLowerCase(), byAt:new Date().toISOString(), ...row }; this._planLog(row,'เพิ่ม','',"+"'','');" + " }"],
  ['ค่าในแถว', "onTitle:on('plans',r.id,'title'), onStart:on('plans',r.id,'start'), onEnd:on('plans',r.id,'end'),",
    "onTitle:on('plans',r.id,'title'), onStart:on('plans',r.id,'start'), onEnd:on('plans',r.id,'end'),\n            byName:this._planBy(r)||'—', byTip:(()=>{ const n=this._planBy(r); if(!n) return 'ไม่พบผู้สร้าง (กิจกรรมเก่า / นำเข้า)'; let d=''; try{ if(r.byAt){ const x=new Date(r.byAt); d=' · '+String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear(); } }catch(e){} return 'สร้างโดย '+n+d; })(),"],
  ['หัวตาราง', '<div style="flex:0 0 44px;font-size:10px;font-weight:700;color:#F4EFE6;display:flex;align-items:center">%</div>',
    '<div style="flex:0 0 44px;font-size:10px;font-weight:700;color:#F4EFE6;display:flex;align-items:center">%</div>\n                <div style="flex:0 0 64px;font-size:10px;font-weight:700;color:#F4EFE6;display:flex;align-items:center">ผู้สร้าง</div>'],
  ['คอลัมน์ในแถว', 'sc-camel-on-change="{{ r.onPct }}" style="flex:0 0 44px;min-width:0;max-width:44px;appearance:textfield;box-sizing:border-box;border:1px solid #E4DED2;background:#FCFAF5;border-radius:7px;padding:6px 7px;font-size:11px;font-family:inherit;color:#2C2A25;padding:6px 4px;text-align:center">',
    'sc-camel-on-change="{{ r.onPct }}" style="flex:0 0 44px;min-width:0;max-width:44px;appearance:textfield;box-sizing:border-box;border:1px solid #E4DED2;background:#FCFAF5;border-radius:7px;padding:6px 7px;font-size:11px;font-family:inherit;color:#2C2A25;padding:6px 4px;text-align:center">\n                      <div title="{{ r.byTip }}" style="' + COL + ';font-size:10.5px;font-weight:600;color:#6E5B3E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px 2px">{{ r.byName }}</div>'],
  ['แถวหัวกลุ่ม (กว้างเท่าคอลัมน์)', '<div style="flex:0 0 491px;font-size:11.5px;font-weight:700;color:#8A7657;', '<div style="flex:0 0 561px;font-size:11.5px;font-weight:700;color:#8A7657;'],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แผนงาน: เพิ่มคอลัมน์ "ผู้สร้าง" แล้ว');
