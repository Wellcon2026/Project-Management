#!/usr/bin/env node
/* =====================================================================
   ระบบแท็ก (wctag.js) ใน Wellcon PM — การแจ้งเตือนเหลือแบบเดียว: แท็กคนที่เกี่ยวข้อง
     node scripts/patch-tags.js        (รันต่อจาก patch-plan-by.js)
   - โหลด /wctag.js · ตั้งค่าเมื่อ login (popup เรื่องที่ถูกแท็กทันทีที่เปิดแอป · เช็กซ้ำทุก 3 นาที / ตอนกลับมาที่แอป)
   - กระดิ่ง 🔔 บนหัวทุกหน้า = รายการแท็กถึงฉัน / ฉันแท็กไป (ตัวเลข = เรื่องที่ยังไม่รับทราบ) — แทนแจ้งเตือนอัตโนมัติเดิม (เรื่องค้าง)
   - ปุ่ม "🏷 แท็กคน" ข้างปุ่มแชร์ลิงก์ + ในแผงกระดิ่ง: แท็กคนเกี่ยวกับหน้าที่เปิดอยู่ (ลิงก์เปิดตรงหน้าเดียวกัน)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
let raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const die = (m) => { console.error('✗ ' + m + ' — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); };
if (raw.includes('wctag.js')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ระบบแท็ก)'); process.exit(0); }
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const TAGBTN = '<button sc-camel-on-click="{{ onTagHere }}" title="แท็กคนที่เกี่ยวข้องกับหน้านี้ — เขาจะเห็นแจ้งเตือนทันทีที่เปิดแอป" style="flex:none;display:flex;align-items:center;gap:6px;border:1px solid #1F2B45;background:#1F2B45;color:#fff;border-radius:10px;padding:7px 11px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap" style-hover="background:#2C3A5C"><span>🏷 แท็กคน</span></button>';
const EDITS = [
  ['โหลด wctag.js (หัว template)', '<html translate="no"><head>\n<meta charset="utf-8">', '<html translate="no"><head>\n<meta charset="utf-8">\n<script src="/wctag.js?v=1.0.0"></script>'],
  ['ปุ่มแท็กข้างแชร์ลิงก์', '<span>แชร์ลิงก์</span></button>', '<span>แชร์ลิงก์</span></button>\n        ' + TAGBTN],
  ['ชื่อปุ่มกระดิ่ง', 'title="แจ้งเตือน — สิ่งที่ต้องทำวันนี้"', 'title="แจ้งเตือน · แท็ก — เฉพาะเรื่องที่มีคนแท็กคุณ"'],
  ['กระดิ่ง → รายการแท็ก', "      onNotif: ()=>this.setState({ notifOpen:!S.notifOpen, topMenu:false }),",
    "      onNotif: ()=>{ this.setState({ topMenu:false, notifOpen:false }); if(window.WCTag) window.WCTag.open(); },   // TAGS v1.379.0 แจ้งเตือนเหลือแบบเดียว = แท็ก\n      onTagHere: ()=>this._wctHere(),"],
  ['แสดงกระดิ่งทุกคน', "      notifShow:this.featOn('notif'),", "      notifShow:true,"],
  ['ตัวเลขบนกระดิ่ง = แท็กค้าง', "      notifHasBadge:notifItems.length>0, notifBadge:String(notifItems.length),", "      notifHasBadge:(S.wctN||0)>0, notifBadge:String((S.wctN||0)>99?'99+':(S.wctN||0)),"],
  ['เริ่มระบบแท็ก', "  componentDidMount(){ try{ if(typeof window!=='undefined'){ setTimeout(()=>this._usgTouch(),8000);",
    "  componentDidMount(){ try{ if(typeof window!=='undefined'){ this._wctT=setInterval(()=>this._wctSync(),1500); if(window.WCTag) window.WCTag.onChange((n)=>{ if((this.state.wctN||0)!==n) this.setState({ wctN:n }); }); } }catch(e){}\n    try{ if(typeof window!=='undefined'){ setTimeout(()=>this._usgTouch(),8000);"],
  ['ตัวช่วยระบบแท็ก', "  _claimOpen(pid){",
    "  // v1.379.0 ระบบแท็ก (wctag.js): ตั้งค่าเมื่อ login / ล้างเมื่อออก · แท็กคนเกี่ยวกับหน้าที่เปิดอยู่\n" +
    "  _wctSync(){ try{ const W=window.WCTag, S=this.state, me=S.me||{}; if(!W) return; const em=String(me.email||'').toLowerCase();\n" +
    "    if(!em||em==='demo@wellcon.co.th'||!this._sb){ if(this._wctFor){ this._wctFor=''; W.reset(); } return; } if(this._wctFor===em) return; this._wctFor=em;\n" +
    "    W.setup({ sb:this._sb, app:'pm', me:{ email:em, name:(this.nickOf&&this.nickOf(me))||me.name||em, role:me.roleKey||'' }, accounts:S.accounts||[], projects:(S.projects||[]).map(p=>({ id:p.id, name:p.name })), onTag:()=>this._wctHere() }); }catch(e){ console.error(e); } }\n" +
    "  _wctHereInfo(){ const S=this.state; let nm='Wellcon PM'; const p=(S.projects||[]).find(x=>x.id===S.projectId);\n" +
    "    if(S.screen==='projectDetail'){ const t=((this._lastTabDefs||[]).find(d=>d[0]===S.pdTab)||[])[1]; nm=(p?p.name:'โครงการ')+(t?' · '+t:''); } else { const n=(this._lastNavMap||{})[S.screen]; nm=(n&&n.label)||this._pageTitle||nm; }\n" +
    "    const link=window.location.origin+window.location.pathname+window.location.search+this._linkOf(S); return { title:nm, project:(S.screen==='projectDetail'&&S.projectId)||null, ref_type:'page', ref_id:this._linkOf(S)||S.screen||'', url:link }; }\n" +
    "  _wctHere(){ const W=window.WCTag; if(!W||!this._wctFor){ this.showToast('ระบบแท็กใช้ได้หลังเข้าสู่ระบบ (ไม่รวมโหมดสาธิต)'); return; } const h=this._wctHereInfo();\n" +
    "    W.tag({ ...h, title:'แท็ก: '+h.title, sub:'กดลิงก์แล้วเปิดตรงหน้านี้ · ใส่ข้อความบอกว่าต้องการอะไร', roles:[['qs','qs_mgr'],['pm','pm_mgr'],['sitemgr'],['designer','design_mgr']] }); }\n" +
    "  _claimOpen(pid){"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) die('จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1)');
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ระบบแท็กใน Wellcon PM: กระดิ่ง = แท็ก · popup ตอนเปิดแอป · ปุ่ม 🏷 แท็กคน');
