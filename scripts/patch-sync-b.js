#!/usr/bin/env node
/* =====================================================================
   v1.398.0 sync-b — ตรวจทั้งระบบ รอบ B (ผู้บริหารอนุมัติ 14/11/2026 ข้อ 7 · 9)
     node scripts/patch-sync-b.js        (รันต่อจาก patch-sync-a.js)
   7) ใบขอซื้อ · ใบขอจ้าง เป็นทางเข้าหลักของการขอซื้อ / ขอจ้าง
      · แอปหลักอ่านสรุปจากตาราง apr_requests (ทุก 3 นาที): การ์ดหน้าแรก + แถบในหน้า Project Management แสดง
        "รออนุมัติ n · ส่งกลับแก้ n · รอจัดซื้อ n · รอของ n · ⚠ เกิน 24 ชม. n" — แตะเพื่อเปิด
      · การ์ด / เมนู Mango เปลี่ยนชื่อเป็น "Mango ERP · PR / PO (จัดซื้อ) ↗" — ไม่ซ้ำชื่อกับใบขอซื้อ
      · ชุดการ์ดเริ่มต้น: Site Manager · หัวหน้าช่าง เหลือ "ใบขอซื้อ · ใบขอจ้าง" (ตัดการ์ด Mango — หน้างานไม่ออก PR ใน Mango เอง)
        QS · PM Manager · Director · จัดซื้อ เพิ่มการ์ด "ใบขอซื้อ · ใบขอจ้าง" (ผู้อนุมัติ / ผู้สั่งของ)
        การ์ด "Project Management" ที่ถูกแทนด้วย Mango (v1.374.1) → แทนด้วยใบขอซื้อ · ใบขอจ้าง
        (ตำแหน่ง / คนที่ Admin ตั้งการ์ดเองแล้ว ไม่เปลี่ยน)
   9) เมนูที่เปิดอีกแอปในแท็บใหม่ มีเครื่องหมาย ↗ ท้ายชื่อ (Site Work · Claim · Mango ERP)
      (ปุ่มกลับ / 🏠 ของหน้าแยก กลับมาที่โครงการเดิม — แก้ใน auto-pr.js · quick-measure.js · layboard/pm-gate.js)
   ไม่ต้องรัน SQL (ใช้ตาราง apr_requests ที่รันแล้ว · ไม่มีตาราง = ไม่แสดงสรุป) · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.398.0 sync-b';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (สรุปใบขอซื้อในแอปหลัก · ชื่อการ์ด Mango · เครื่องหมาย ↗)'); process.exit(0); }
if (!t.includes('v1.397.0 sync-a')) { console.error('✗ ต้องรัน scripts/patch-sync-a.js ก่อน'); process.exit(1); }

const HELPERS =
  "  // ===== " + MARK + ": สรุปใบขอซื้อ · ใบขอจ้าง ต่อโครงการ — อ่านตาราง apr_requests (ไม่มีราคา) ทุก 3 นาที =====\n" +
  "  _aprSync(force){ try{ const sb=this._sb, S=this.state; if(!sb||!S.loggedIn||!S.me||this._demoLock) return; const now=Date.now();\n" +
  "      if(this._aprBusy||(!force&&this._aprAt&&now-this._aprAt<180000)) return; this._aprBusy=true; this._aprAt=now;\n" +
  "      sb.from('apr_requests').select('pid,status,deleted,sentAt:data->sentAt,pmAt:data->pmAt,qsAt:data->qsAt').in('status',['sent','returned','approved','ordered']).limit(3000)\n" +
  "        .then((r)=>{ this._aprBusy=false; const data=r&&r.data; if(!r||r.error||!Array.isArray(data)) return; const M={}, H=24*36e5;\n" +
  "          data.forEach(x=>{ if(!x||x.deleted||!x.pid) return; const o=M[x.pid]||(M[x.pid]={ wait:0, ret:0, buy:0, ord:0, late:0 });\n" +
  "            if(x.status==='sent'){ o.wait++; if(Number(x.sentAt)&&now-Number(x.sentAt)>H) o.late++; }\n" +
  "            else if(x.status==='approved'){ o.buy++; const a=Math.max(Number(x.pmAt)||0, Number(x.qsAt)||0); if(a&&now-a>H) o.late++; }\n" +
  "            else if(x.status==='ordered') o.ord++; else if(x.status==='returned') o.ret++; });\n" +
  "          const sig=JSON.stringify(M); if(sig!==this._aprSig){ this._aprSig=sig; this.setState({ aprStat:M }); } }, ()=>{ this._aprBusy=false; });\n" +
  "    }catch(e){ this._aprBusy=false; } }\n" +
  "  _aprSub(pid){ const o=pid&&(this.state.aprStat||{})[pid]; if(!o) return ''; const a=[];\n" +
  "    if(o.wait) a.push('รออนุมัติ '+o.wait); if(o.ret) a.push('ส่งกลับแก้ '+o.ret); if(o.buy) a.push('รอจัดซื้อ '+o.buy); if(o.ord) a.push('รอของ '+o.ord); if(o.late) a.push('⚠ เกิน 24 ชม. '+o.late);\n" +
  "    return a.join(' · '); }\n";

const CHIP = '<sc-if value="{{ pdx.aprHas }}" hint-placeholder-val="{{ false }}"><div sc-camel-on-click="{{ pdx.onApr }}" title="เปิดใบขอซื้อ · ใบขอจ้าง ของโครงการนี้" style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;background:#26241F;border:1px solid #3A3730;border-radius:12px;padding:8px 12px;cursor:pointer;font-size:12.5px;color:#E9E1D2" style-hover="border-color:#C9A961"><span style="font-weight:700;white-space:nowrap">🧾 ใบขอซื้อ · ใบขอจ้าง</span><span style="flex:1 1 160px;min-width:0;color:#D8C79C">{{ pdx.aprTxt }}</span><span style="color:#C9A961;font-weight:700">เปิด ›</span></div></sc-if>\n            ';
const ROW = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:10.5px;color:#8E876F;margin-right:2px">รายละเอียด</span><sc-for list="{{ pdx.tabs }}" as="b"';

const R = [
  // ---------- 7) สรุปใบขอซื้อในแอปหลัก ----------
  ['ตัวอ่านสรุปใบขอซื้อ', "  _aprOpen(pid){", HELPERS + "  _aprOpen(pid){"],
  ['ตัวตั้งเวลา', "this._wctT=setInterval(()=>{ this._ssoSync(); this._wctSync(); },1500);", "this._wctT=setInterval(()=>{ this._ssoSync(); this._wctSync(); this._aprSync(); },1500);"],
  ['การ์ดหน้าแรก: คำอธิบายสด', "sub:(k==='issues'&&p?this._issSub(p.id):'')||", "sub:(k==='apr'&&p?this._aprSub(p.id):'')||(k==='issues'&&p?this._issSub(p.id):'')||"],
  ['หน้า Project Management: ข้อมูลแถบ', "    return { quick, qHas:quick.length>0,", "    const _ap=(defs||[]).some(d=>d[0]==='apr')?this._aprSub(S.projectId):'';\n    return { aprHas:!!_ap, aprTxt:_ap, onApr:()=>this._aprOpen(S.projectId), quick, qHas:quick.length>0,"],
  ['หน้า Project Management: แถบ', ROW, CHIP + ROW],
  // ---------- 7) ชื่อการ์ด Mango + ชุดการ์ดเริ่มต้น ----------
  ['ชื่อเมนู Mango', "['mango','ใบขอซื้อ PR · ใบสั่งจ้าง (Mango)']", "['mango','Mango ERP · PR / PO (จัดซื้อ) ↗']"],
  ['คำอธิบายการ์ด Mango', "mango:'เปิด Mango ERP · ใบขอซื้อ (PR) · สถานะ PR · ใบสั่งจ้าง (WO)'", "mango:'ระบบ ERP ของบริษัท — จัดซื้อออก PR / PO จริงที่นี่ · เปิดแท็บใหม่'"],
  ['การ์ดเริ่มต้น: Site Manager', "const SM=['tab:daily','tab:qc','tab:mango','tab:apr',", "const SM=['tab:daily','tab:qc','tab:apr',"],
  ['การ์ดเริ่มต้น: หัวหน้าช่าง', "const SITE=['tab:daily','tab:qc','tab:dwg','tab:plan','tab:mango','tab:apr',", "const SITE=['tab:daily','tab:qc','tab:dwg','tab:plan','tab:apr',"],
  ['การ์ดเริ่มต้น: PM Manager', "'tab:changes','tab:claim','tab:mango','tab:rfi','tab:handover','tab:dwg','nav:qstrack','tab:cal'];", "'tab:changes','tab:claim','tab:apr','tab:mango','tab:rfi','tab:handover','tab:dwg','nav:qstrack','tab:cal'];"],
  ['การ์ดเริ่มต้น: QS', "const QS=['tab:qm','tab:aw',", "const QS=['tab:apr','tab:qm','tab:aw',"],
  ['การ์ดเริ่มต้น: Director', "const DIR=['tab:plan','tab:delay','tab:fin','tab:changes','tab:claim','tab:mango',", "const DIR=['tab:plan','tab:delay','tab:fin','tab:changes','tab:claim','tab:apr','tab:mango',"],
  ['การ์ดเริ่มต้น: จัดซื้อ', "const PRC=['tab:mango',", "const PRC=['tab:apr','tab:mango',"],
  ['การ์ดแทน Project Management', "const v=k==='tab:overview'?'tab:mango':k;", "const v=k==='tab:overview'?'tab:apr':k;   /* " + MARK + ": เดิมแทนด้วย Mango */"],
  // ---------- 9) เครื่องหมาย ↗ = เปิดอีกแอปในแท็บใหม่ ----------
  ['เมนู Site Work', "['qc','Site Work · Defect / Survey / Scope']", "['qc','Site Work · Defect / Survey / Scope ↗']"],
  ['เมนู Claim', "['claim','Claim · เคลมความเสียหาย']", "['claim','Claim · เคลมความเสียหาย ↗']"],
];
for (const [name, a, , want] of R) { const c = t.split(a).length - 1; if (c !== (want || 1)) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + (want || 1) + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ สรุปใบขอซื้อในแอปหลัก · ชื่อการ์ด Mango · เครื่องหมาย ↗: แก้ ' + R.length + ' จุด');
