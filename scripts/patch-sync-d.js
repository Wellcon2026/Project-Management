#!/usr/bin/env node
/* =====================================================================
   v1.400.0 sync-d — ตรวจทั้งระบบ รอบ E: หน้าตาและการใช้งาน (ผู้บริหารสั่งทำต่อเนื่อง 14/11/2026 · ข้อ 9 ที่เหลือ · 10 · 11 · 12 · 13)
     node scripts/patch-sync-d.js        (รันต่อจาก patch-sync-c.js)
   9)  Site Work · Claim · Survey เปิดในแท็บเดิม (เข้าสู่ระบบให้อัตโนมัติด้วยตั๋วใช้ครั้งเดียวเหมือนเดิม) — กดย้อนกลับ = กลับ Wellcon PM
       (Mango ERP ยังเปิดแท็บใหม่ — เป็นระบบภายนอก)
   10) ชื่อเรียกเดียวกัน: "Defect Check" → "Site Work" ทุกจุด · ชื่อเมนูนำด้วยภาษาไทย
       (ภาพรวมโครงการ · Project Management / แจ้งล่าช้า · Early Warning / ส่งมอบงาน · Handover / Layboard · บอร์ดนำเสนองาน / ผู้ใช้ & ทีมโครงการ)
       · "Please select" → "— เลือก —" · "My Workspace" → "หน้าแรกของฉัน"
   11) มอบหมายงานในหน้า Inbox → ผู้รับได้แจ้งเตือนเข้ากระดิ่ง (ระบบแท็ก) ทันที — เดิมไม่มีการแจ้ง
   12) ยอด VO ที่รออนุมัติ ใช้กติกาเดียวทุกหน้า (projVoPending): มีกลุ่มใน QS Tracking → ราคาเสนอล่าสุดของแถวที่รออนุมัติ · ไม่มี → VO ที่ยื่น / ตรวจ ในหน้า VO/SI/EOT
       (เดิม: การเงินรวม · การเงินโครงการ · หัวโครงการ · แท็บ VO Tracker คิดคนละแบบ)
   13) มือถือ / จอสัมผัส: ขยายพื้นที่แตะของปุ่มทุกปุ่ม 6px รอบด้าน (ขนาดที่เห็นเท่าเดิม) · ปุ่ม +/− จำนวนคนในรายงานประจำวัน ใหญ่ขึ้น
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
const MARK = 'v1.400.0 sync-d';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (แท็บเดิม · ชื่อเรียก · แจ้งเตือนมอบหมาย · ยอด VO รออนุมัติ · ปุ่มบนมือถือ)'); process.exit(0); }
if (!t.includes('v1.399.0 sync-c')) { console.error('✗ ต้องรัน scripts/patch-sync-c.js ก่อน'); process.exit(1); }

const OPEN_A = "try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ window.location.href=u; } }";
const OPEN_B = "try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ try{ window.location.href=u; }catch(e2){} } }";
const BODY = "html,body{margin:0;padding:0;background:#E8E2D6;font-family:Arial,'Noto Sans Thai',Helvetica,sans-serif;-webkit-font-smoothing:antialiased}";
const R = [
  // ---------- 9) แท็บเดิม ----------
  ['ตัวช่วยเปิดอีกแอป', "  _claimOpen(pid){",
   "  // " + MARK + ": ไปอีกแอป Wellcon ในแท็บเดิม — แนบตั๋วเข้าสู่ระบบครั้งเดียว (wctag.js) · ย้อนกลับ = กลับมาหน้านี้\n" +
   "  _appGo(u){ try{ const W=window.WCTag; if(W&&W.ticketUrl&&W.isApp&&W.isApp(u)){ W.ticketUrl(u).then(v=>{ window.location.href=v; }, ()=>{ window.location.href=u; }); return; } window.location.href=u; }catch(e){ try{ window.location.href=u; }catch(e2){} } }\n" +
   "  _claimOpen(pid){"],
  ['Claim: แท็บเดิม', OPEN_A, "this._appGo(u); }"],
  ['Site Work · Survey · (Site Issues): แท็บเดิม', OPEN_B, "this._appGo(u); }", 3],
  // ---------- 12) ยอด VO รออนุมัติ ----------
  ['ตัวคำนวณกลาง', "  projVo(pid, changes){",
   "  // " + MARK + ": ยอด VO ที่รออนุมัติ — กติกาเดียวทุกหน้า (คู่กับ projVo)\n" +
   "  projVoPending(pid, changes){ if(!pid) return 0;\n" +
   "    if(this.qsVoHas(pid)){ const isP=(r)=>/pending|review|เมล์|รอ|submit/i.test(String((r&&r.status)||''));\n" +
   "      return (this._qstList('vo')||[]).filter(g=>g.pid===pid).reduce((s,g)=>s+(g.rows||[]).filter(isP).reduce((a,r)=>a+(this._voLatest(r)||this.QSVO_N(r.sub)||0),0),0); }\n" +
   "    return (changes||this.state.changes||[]).filter(c=>c.project===pid&&c.type==='VO'&&(c.status==='submitted'||c.status==='review')&&!/^qsvo_/.test(String(c.id||''))).reduce((a,c)=>a+(Number(c.amount)||0),0); }\n" +
   "  projVo(pid, changes){"],
  ['การเงินรวมทุกโครงการ', "const voPend=ch.filter(c=>c.type==='VO'&&(c.status==='submitted'||c.status==='review')).reduce((a,c)=>a+N(c.amount),0);", "const voPend=real?this.projVoPending(p.id, ch):0;"],
  ['การเงิน (ภาพรวม)', "const voPend=ch.filter(c=>c.status==='submitted'||c.status==='review').reduce((s,c)=>s+(c.amount||0),0);", "const voPend=this.projVoPending(p.id, S.changes);"],
  ['การเงินโครงการ', "const voPend=pch.filter(c=>c.status==='submitted'||c.status==='review').reduce((a,c)=>a+(c.amount||0),0);", "const voPend=this.projVoPending(p.id, S.changes);"],
  ['หัวโครงการ', "const voPendHead=pch.filter(c=>c.type==='VO'&&c.status!=='approved'&&c.status!=='rejected').reduce((s,c)=>s+(c.amount||0),0);", "const voPendHead=this.projVoPending(p.id, S.changes);"],
  ['แท็บ VO Tracker', "const agreedNet=this.qsVoSumAgreed(all), pendSub=sum(all,'sub',isPend);", "const agreedNet=this.qsVoSumAgreed(all), pendSub=this.projVoPending(proj.id);"],
  // ---------- 11) มอบหมายงาน → กระดิ่ง ----------
  ['มอบหมาย: ส่งข้อมูลแถว', "else this.assignNotif(r.nid, e.target.value); },", "else this.assignNotif(r.nid, e.target.value, r); },"],
  ['มอบหมาย: รับข้อมูลแถว', "  assignNotif(nid, email){", "  assignNotif(nid, email, row){"],
  ['มอบหมาย: แจ้งเข้ากระดิ่ง', "    const a=this._respAcc(email);\n    this.showToast(email?('มอบหมายให้ '",
   "    if(email&&typeof window!=='undefined'&&window.WCTag&&this._wctFor){ try{ const tt=String((row&&(row.title||row.text||row.label||row.name))||'').slice(0,90);   // " + MARK + "\n" +
   "      window.WCTag.send({ app:'pm', project:(row&&row.pid)||null, ref_type:'assign', ref_id:String(nid), title:'📌 มอบหมายงานให้คุณ'+(tt?' — '+tt:''), note:'โดย '+(this.nickOf(me0)||me0.name||''),\n" +
   "        url:window.location.origin+window.location.pathname+window.location.search+'#/inbox', to:[String(email).toLowerCase()] }); }catch(e){} }\n" +
   "    const a=this._respAcc(email);\n    this.showToast(email?('มอบหมายให้ '"],
  // ---------- 10) ชื่อเรียก ----------
  ['Defect Check → Site Work', "Defect Check", "Site Work", 21],
  ['Please select', "'Please select'", "'— เลือก —'", 5],
  ['My Workspace', "'My Workspace'", "'หน้าแรกของฉัน'", 2],
  ['Staff / Project', "'Staff / Project'", "'ผู้ใช้ & ทีมโครงการ'", 3],
  ['เมนู: ภาพรวมโครงการ', "['overview','Project Management']", "['overview','ภาพรวมโครงการ · Project Management']"],
  ['เมนู: แจ้งล่าช้า', "['delay','Delay & Early Warning · แจ้งล่าช้า']", "['delay','แจ้งล่าช้า · Early Warning']"],
  ['เมนู: ส่งมอบงาน', "['handover','Handover Process · ส่งมอบงาน']", "['handover','ส่งมอบงาน · Handover']"],
  ['Layboard', "Layboard · Presentation", "Layboard · บอร์ดนำเสนองาน", 3],
  // ---------- 13) ปุ่มบนมือถือ ----------
  ['พื้นที่แตะบนจอสัมผัส', BODY, BODY + "\n  /* " + MARK + ": จอสัมผัส — ขยายพื้นที่แตะของปุ่ม 6px รอบด้าน (ขนาดที่เห็นเท่าเดิม) */\n  @media (pointer:coarse){ button{position:relative} button::after{content:'';position:absolute;inset:-6px} }"],
  ['ปุ่ม +/− จำนวนคน (รายงานประจำวัน)', "flex:none;width:26px;height:28px;border-radius:8px;", "flex:none;width:36px;height:36px;border-radius:10px;", 2],
  ['wctag.js เวอร์ชัน', 'wctag.js?v=1.2.1', 'wctag.js?v=1.2.2'],
];
for (const [name, a, , want] of R) { const c = t.split(a).length - 1; if (c !== (want || 1)) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + (want || 1) + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แท็บเดิม · ชื่อเรียก · แจ้งเตือนมอบหมาย · ยอด VO รออนุมัติ · ปุ่มบนมือถือ: แก้ ' + R.length + ' จุด');
