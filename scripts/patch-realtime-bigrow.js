#!/usr/bin/env node
/* =====================================================================
   แก้ "อัปโหลดรูปแล้วข้อมูล/รูปหาย หลังระบบอัปเดตข้อมูล" (รายงานประจำวัน · RFI · Defect ฯลฯ)
     node scripts/patch-realtime-bigrow.js
   ต้นเหตุ: แถวที่มีรูป (data URL) ใหญ่เกินขีดจำกัดของ Supabase Realtime → ข้อความ realtime ถูกตัด
   (มี p.errors และไม่มีช่อง data) เดิม _liveApply เอาแถวที่ถูกตัด {id, project} ไปแทนแถวในเครื่อง
   → วันที่ / ผู้จัดทำ / งาน / รูป หายหมด และถ้าแก้ต่อจะส่งแถวว่างทับข้อมูลบนเซิร์ฟเวอร์
   แก้: (1) ข้อความที่ถูกตัด → ดึงแถวเต็มจากตารางด้วย id แล้วค่อยใช้  (2) _liveApply ไม่รับแถวที่ไม่มี data
   - รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const R = [
  ['realtime: ข้อความถูกตัด → ดึงแถวเต็ม',
   "if(lk){ this._liveApply(lk, p.eventType||p.type, p.eventType==='DELETE'?(p.old||{}):(p.new||{})); return; }",
   "if(lk){ const ev=p.eventType||p.type, nw=p.new||{};   // v1.363.3 rt-bigrow: แถวใหญ่ (มีรูป) ถูกตัด → ดึงแถวเต็มจากเซิร์ฟเวอร์\n          if(ev!=='DELETE' && ((p.errors&&p.errors.length) || nw.data===undefined || nw.data===null)){\n            if(!nw.id){ this._schedulePull(700); return; }\n            sb.from(t).select('id,project,data').eq('id', nw.id).maybeSingle().then(r=>{ if(r&&!r.error&&r.data&&r.data.data!=null&&!this._pushing) this._liveApply(lk, ev, r.data); }).catch(()=>{});\n            return; }\n          this._liveApply(lk, ev, ev==='DELETE'?(p.old||{}):nw); return; }"],
  ['_liveApply: ไม่รับแถวที่ไม่มี data',
   "  _liveApply(k, ev, row){\n    const id=row&&row.id; if(!id) return;",
   "  _liveApply(k, ev, row){\n    const id=row&&row.id; if(!id) return;\n    if(ev!=='DELETE' && (row.data===undefined || row.data===null)) return;   // v1.363.3 rt-bigrow: ห้ามเอาแถวที่ถูกตัดไปแทนข้อมูลจริง"],
];
let done = 0, had = 0;
for (const [name, a, b] of R) {
  if (t.includes(b)) { had++; continue; }
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + n + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); }
  t = t.replace(a, () => b); done++;
}
if (!done) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (realtime แถวใหญ่)'); process.exit(0); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แก้ realtime แถวใหญ่ (รูปหาย): ' + done + ' จุด' + (had ? ' (มีอยู่แล้ว ' + had + ')' : ''));
