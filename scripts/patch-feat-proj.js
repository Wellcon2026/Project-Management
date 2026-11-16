#!/usr/bin/env node
/* =====================================================================
   v1.407.0 feat-proj — ผู้บริหารอนุมัติ 16/11/2026: เปิด-ปิดหน้าในโครงการ "แยกรายโครงการ"
     node scripts/patch-feat-proj.js        (รันหลัง patch-page-access.js)
   · ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน → แท็บใหม่ "รายโครงการ": เลือกโครงการ → สวิตช์เปิด-ปิดทีละหน้า
   · ปิดหน้าในโครงการใด = ทุกคน (รวม Super Admin) ในโครงการนั้น:
       การ์ดหน้าแรกหาย (เมื่อเลือกโครงการนั้น) · ไม่ขึ้นในค้นหา (Ctrl+K) / ปักหมุด / ปุ่มในหน้าภาพรวม
       เปิดจากลิงก์เก่า · แจ้งเตือน → แจ้ง "หน้านี้ปิดไว้สำหรับโครงการนี้" แล้วกลับภาพรวม
     โครงการอื่นไม่เปลี่ยน · ข้อมูลเดิมไม่หาย · ภาพรวมโครงการปิดไม่ได้
   · ลำดับการใช้ค่า: ปิดทั้งระบบ → ปิดรายโครงการ → รายคน → ตามตำแหน่ง → ชุดเริ่มต้น
   · หน้าแยก (ใบขอซื้อ · Takeoff · Layboard) และแอป Site Work · Claim อ่านสวิตช์เดียวกัน (แก้ในไฟล์ของหน้านั้น)
   ข้อมูล: app_state 'featProj' { <pid>: { 'tab:<k>': false } } — เขียนผ่าน _stKeySet (ทีละโครงการ ไม่ทับกัน) · 'tab:mat' / 'tab:procm' นับเป็นคู่
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
const MARK = 'v1.407.0 feat-proj';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เปิด-ปิดหน้าแยกรายโครงการ)'); process.exit(0); }
if (!t.includes('v1.406.0 page-access')) { console.error('✗ ต้องรัน scripts/patch-page-access.js ก่อน'); process.exit(1); }

const PMSG = "'หน้านี้ปิดไว้สำหรับโครงการนี้ — ติดต่อผู้ดูแลระบบ'";

// ก) ตัวตรวจ
const A_OLD = "  _featGOff(key){ return (this.state.featGlobal||{})[key]===false; }\n";
const A_NEW = A_OLD +
  "  // ===== " + MARK + ": ปิดหน้าในโครงการ \"เฉพาะโครงการ\" — app_state 'featProj' { pid:{ 'tab:<k>':false } } (เขียนผ่าน _stKeySet · mat / procm นับเป็นคู่) =====\n" +
  "  _featPOff(pid, key){ const P=(this.state.featProj||{})[String(pid||'')]; if(!P||typeof P!=='object') return false; if(P[key]===false) return true;\n" +
  "    return (key==='tab:mat'||key==='tab:procm')&&(P['tab:mat']===false||P['tab:procm']===false); }\n";

// ข) แท็บ "รายโครงการ" ในหน้าตั้งค่า
const B_OLD = "    if(tab==='sys'){ const G=S.featGlobal||{};";
const B_NEW =
  "    if(tab==='proj'){ const FP=S.featProj||{}; const nOff=(id)=>{ const o=FP[id]; return (o&&typeof o==='object')?Object.keys(o).filter(k=>o[k]===false).length:0; };   // " + MARK + "\n" +
  "      const PJ=(this._lastVisProj||S.projects||[]).filter(p=>p&&p.id&&!p.deleted).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));\n" +
  "      const pq=String(S.ccProjQ||'').trim().toLowerCase(); const pid=PJ.some(p=>p.id===S.ccProj)?S.ccProj:'';\n" +
  "      out.ccProjQ=S.ccProjQ||''; out.onCcProjQ=(e)=>this.setState({ ccProjQ:e.target.value });\n" +
  "      const L=PJ.filter(p=>!pq||(String(p.name||'')+' '+String(p.code||'')).toLowerCase().indexOf(pq)>=0);\n" +
  "      out.ccProjs=L.slice(0,40).map(p=>{ const on=p.id===pid; const n=nOff(p.id); return { key:p.id, label:String(p.name||p.id)+(n?(' · ปิด '+n):''),\n" +
  "        bg:on?'#1C1B18':(n?'#FDF3EC':'#fff'), fg:on?'#fff':(n?'#8A4B2A':'#2C2A25'), bd:on?'#1C1B18':(n?'#F0D2BE':'#E4DED2'), onPress:()=>this.setState({ ccProj:on?'':p.id }) }; });\n" +
  "      out.ccProjsMore=L.length>40; out.ccProjsMoreTxt='แสดง 40 จาก '+L.length+' โครงการ — พิมพ์ค้นหาเพื่อหาโครงการอื่น'; out.ccProjsNone=!L.length;\n" +
  "      const nP=PJ.filter(p=>nOff(p.id)>0).length; out.ccProjSumTxt=nP?('มี '+nP+' โครงการที่ปิดบางหน้าไว้'):'ทุกโครงการเปิดครบทุกหน้า';\n" +
  "      out.ccProjSel=!!pid; out.ccProjNoSel=!pid;\n" +
  "      if(pid){ const pj=PJ.find(p=>p.id===pid)||{}; const cur=(FP[pid]&&typeof FP[pid]==='object')?FP[pid]:{}; const n=nOff(pid);\n" +
  "        out.ccProjName=String(pj.name||pid); out.ccProjState=n?('ปิดอยู่ '+n+' หน้า — เฉพาะโครงการนี้'):'เปิดครบทุกหน้า';\n" +
  "        out.ccProjCust=n>0; out.onCcProjReset=()=>{ this._stKeySet('featProj', pid, ''); this.showToast('เปิดครบทุกหน้าแล้ว · '+String(pj.name||pid)); };\n" +
  "        out.ccPT=(this._lastTabAll||[]).filter(d=>SKIP.indexOf(d[0])<0).map(d=>{ const key='tab:'+d[0]; const g=this._featGOff(key); const on=!this._featPOff(pid,key);\n" +
  "          return { key, label:d[1], note:g?'⚠ ปิดทั้งระบบอยู่ — เปิดที่แท็บ \"ฟังก์ชันทั้งระบบ\" ก่อน':(on?'เปิดในโครงการนี้':'ปิดเฉพาะโครงการนี้ — การ์ดหาย · เข้าหน้านี้ไม่ได้ทุกคน'), noteFg:(g||!on)?'#B4532A':'#8A8375', ...SW(on&&!g),\n" +
  "            onToggle:()=>{ if(g){ this.showToast('หน้านี้ถูกปิดทั้งระบบ — เปิดที่แท็บ \"ฟังก์ชันทั้งระบบ\" ก่อน'); return; }\n" +
  "              const nx={ ...cur }; if(on) nx[key]=false; else { delete nx[key]; if(key==='tab:mat'||key==='tab:procm'){ delete nx['tab:mat']; delete nx['tab:procm']; } }\n" +
  "              this._stKeySet('featProj', pid, Object.keys(nx).length?nx:''); this.showToast((on?'ปิด ':'เปิด ')+d[1]+' · '+String(pj.name||pid)); } }; }); } }\n" +
  B_OLD;

// ค) หน้าจอ: แท็บ "รายโครงการ" (ต่อจากแท็บ ฟังก์ชันทั้งระบบ)
const VIEW =
  "\n            <!-- " + MARK + ": รายโครงการ -->\n" +
  "            <sc-if value=\"{{ ccIsProj }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "              <div style=\"background:#FDF3EC;border:1px solid #F0D2BE;border-radius:12px;padding:10px 12px;margin-top:12px;font-size:12px;color:#8A4B2A;line-height:1.6\">⚠ ปิดที่นี่ = ปิดหน้านั้นกับ<b>ทุกคนในโครงการที่เลือก</b> (รวม Super Admin) · โครงการอื่นไม่เปลี่ยน · ข้อมูลเดิมไม่หาย · {{ ccProjSumTxt }}</div>\n" +
  "              <div style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.04em;margin:14px 0 7px\">1 · เลือกโครงการ (สีส้ม = มีหน้าที่ปิดอยู่)</div>\n" +
  "              <input value=\"{{ ccProjQ }}\" sc-camel-on-change=\"{{ onCcProjQ }}\" placeholder=\"ค้นหาชื่อโครงการ / รหัส…\" style=\"width:100%;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:10px;padding:8px 11px;font-size:12.5px;font-family:inherit;outline:none;margin-bottom:8px\">\n" +
  "              <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
  "                <sc-for list=\"{{ ccProjs }}\" as=\"r\" hint-placeholder-count=\"6\"><button sc-camel-on-click=\"{{ r.onPress }}\" style=\"border:1px solid {{ r.bd }};background:{{ r.bg }};color:{{ r.fg }};border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ r.label }}</button></sc-for>\n" +
  "              </div>\n" +
  "              <sc-if value=\"{{ ccProjsMore }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11px;color:#8C877D;margin-top:6px\">{{ ccProjsMoreTxt }}</div></sc-if>\n" +
  "              <sc-if value=\"{{ ccProjsNone }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:4px 2px\">ไม่พบโครงการ</div></sc-if>\n" +
  "              <sc-if value=\"{{ ccProjNoSel }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:8px 2px\">เลือกโครงการด้านบน เพื่อเปิด-ปิดหน้าของโครงการนั้น</div></sc-if>\n" +
  "              <sc-if value=\"{{ ccProjSel }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "                <div style=\"background:#FBF8F1;border:1px solid #EFE4CB;border-radius:12px;padding:10px 12px;margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center\">\n" +
  "                  <span style=\"flex:1 1 220px;min-width:0;font-size:12px;color:#2C2A25;line-height:1.6\"><b>{{ ccProjName }}</b><br><span style=\"color:#8C877D\">{{ ccProjState }}</span></span>\n" +
  "                  <sc-if value=\"{{ ccProjCust }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onCcProjReset }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#8A7657;font-size:11px;font-weight:700;padding:6px 11px;border-radius:9px;cursor:pointer;font-family:inherit\">↺ เปิดครบทุกหน้า</button></sc-if>\n" +
  "                </div>\n" +
  "                <div style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.04em;margin:14px 0 7px\">2 · หน้าในโครงการนี้ — กดเพื่อเปิด / ปิด</div>\n" +
  "                <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
  "                  <sc-for list=\"{{ ccPT }}\" as=\"f\" hint-placeholder-count=\"4\">\n" +
  "                    <button sc-camel-on-click=\"{{ f.onToggle }}\" style=\"display:flex;align-items:center;gap:9px;border:1px solid #EDE6D7;background:{{ f.rowBg }};border-radius:10px;padding:8px 10px;cursor:pointer;font-family:inherit;text-align:left;width:100%\">\n" +
  "                      <span style=\"flex:1;min-width:0\"><span style=\"display:block;font-size:12px;font-weight:700;color:#1C1B18\">{{ f.label }}</span><span style=\"display:block;font-size:9.5px;color:{{ f.noteFg }};margin-top:2px\">{{ f.note }}</span></span>\n" +
  "                      <span style=\"position:relative;width:34px;height:18px;border-radius:10px;background:{{ f.swBg }};display:block;flex:none\"><span style=\"position:absolute;top:2px;left:{{ f.knobX }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .16s ease\"></span></span><span style=\"font-size:10px;font-weight:700;color:{{ f.stFg }};min-width:26px;flex:none\">{{ f.stLabel }}</span>\n" +
  "                    </button>\n" +
  "                  </sc-for>\n" +
  "                </div>\n" +
  "              </sc-if>\n" +
  "            </sc-if>";
const SYS_OPEN = '<sc-if value="{{ ccIsSys }}" hint-placeholder-val="{{ false }}">';
const SYS_END = "\n            </sc-if>\n          </div>\n        </sc-if>\n";
const sI = t.indexOf(SYS_OPEN);
if (sI < 0 || t.indexOf(SYS_OPEN, sI + 1) >= 0) { console.error('✗ หาแท็บ "ฟังก์ชันทั้งระบบ" ในหน้าตั้งค่าไม่เจอ (หรือเจอมากกว่า 1) — ไม่แก้'); process.exit(1); }
const eI = t.indexOf(SYS_END, sI);
const nextTab = t.indexOf('<sc-if value="{{ cc', sI + SYS_OPEN.length);
if (eI < 0 || (nextTab >= 0 && nextTab < eI && !/^<sc-if value="\{\{ (ccS|f\.)/.test(t.slice(nextTab, nextTab + 30)))) { console.error('✗ หาจุดปิดแท็บ "ฟังก์ชันทั้งระบบ" ไม่เจอ — ไม่แก้'); process.exit(1); }

const R = [
  ['ซิงก์: SB_STATE_KEYS + PERSIST_KEYS', "'featGlobal','featRole','handover'", "'featGlobal','featRole','featProj','handover'", 2],
  ['ซิงก์: ข้ามตอน push ทั้งก้อน', "k==='featGlobal'||k==='featRole'||", "k==='featGlobal'||k==='featRole'||k==='featProj'||", 1],
  ['ตัวตรวจ ปิดรายโครงการ', A_OLD, A_NEW, 1],
  ['เปิดหน้าผ่านการ์ด / ทางลัด', "  _openTab(pid,k){ if(!this._pgAllowed(k)){",
   "  _openTab(pid,k){ if(this._featPOff(pid,'tab:'+k)){ this.showToast(" + PMSG + "); return; }   /* " + MARK + " */\n    if(!this._pgAllowed(k)){", 1],
  ['กลับภาพรวมเมื่อหน้าถูกปิดในโครงการนี้ (เงื่อนไข)', "if(S.screen==='projectDetail' && proj && !pdTabDefs.some(d=>d[0]===S.pdTab) && !this._tabFixT){",
   "if(S.screen==='projectDetail' && proj && (!pdTabDefs.some(d=>d[0]===S.pdTab)||this._featPOff(S.projectId,'tab:'+S.pdTab)) && !this._tabFixT){", 1],
  ['กลับภาพรวมเมื่อหน้าถูกปิดในโครงการนี้ (ข้อความ)',
   "this.setState({ pdTab:'overview' }); if(_blk) this.showToast('หน้านี้ยังไม่ได้เปิดให้ตำแหน่งของคุณ — ติดต่อผู้ดูแลระบบ'); }, 0); }",
   "this.setState({ pdTab:'overview' }); if(_poff) this.showToast(" + PMSG + "); else if(_blk) this.showToast('หน้านี้ยังไม่ได้เปิดให้ตำแหน่งของคุณ — ติดต่อผู้ดูแลระบบ'); }, 0); }", 1],
  ['กลับภาพรวมเมื่อหน้าถูกปิดในโครงการนี้ (ตัวแปร)', "(this._lastTabAll||[]).some(d=>d[0]===S.pdTab);   /* v1.406.0 page-access */",
   "(this._lastTabAll||[]).some(d=>d[0]===S.pdTab);   /* v1.406.0 page-access */ const _poff=this._featPOff(S.projectId,'tab:'+S.pdTab);", 1],
  ['ค้นหา (Ctrl+K) / ปักหมุด', "if(this._lastTabDefs&&!def) return null;", "if(this._lastTabDefs&&!def) return null; if(this._featPOff(pid,'tab:'+k)) return null;", 1],
  ['การ์ดหน้าแรกของโครงการที่เลือก', "const tiles0=list.map(info).filter(Boolean).filter(t=>!t.needP||p);",
   "const tiles0=list.map(info).filter(Boolean).filter(t=>!t.needP||p).filter(t=>_ed||!p||!this._featPOff(p.id,t.key));   /* " + MARK + ": จัดเรียงการ์ด = เห็นครบ */", 1],
  ['ปุ่มลัดในหน้าภาพรวมโครงการ', "pdx:this._pdx(S, pdTabDefs, pdTabs)", "pdx:this._pdx(S, pdTabDefs.filter(d=>!this._featPOff(S.projectId,'tab:'+d[0])), pdTabs)", 1],
  ['หน้าตั้งค่า: แท็บที่เลือกได้', "const tab=['role','user','sys'].indexOf(S.ccTab)>=0?S.ccTab:'role';", "const tab=['role','user','sys','proj'].indexOf(S.ccTab)>=0?S.ccTab:'role';", 1],
  ['หน้าตั้งค่า: ปุ่มแท็บ', "out.ccTabs=[['role','ตามตำแหน่ง'],['user','รายคน'],['sys','ฟังก์ชันทั้งระบบ']]", "out.ccTabs=[['role','ตามตำแหน่ง'],['user','รายคน'],['sys','ฟังก์ชันทั้งระบบ'],['proj','รายโครงการ']]", 1],
  ['หน้าตั้งค่า: ตัวบอกแท็บ', "out.ccIsRole=tab==='role'; out.ccIsUser=tab==='user'; out.ccIsSys=tab==='sys';", "out.ccIsRole=tab==='role'; out.ccIsUser=tab==='user'; out.ccIsSys=tab==='sys'; out.ccIsProj=tab==='proj';", 1],
  ['หน้าตั้งค่า: ข้อมูลแท็บ รายโครงการ', B_OLD, B_NEW, 1],
  ['หน้าตั้งค่า: ลำดับการใช้ค่า', "ลำดับการใช้ค่า: <b>ปิดทั้งระบบ</b> → <b>รายคน</b>", "ลำดับการใช้ค่า: <b>ปิดทั้งระบบ</b> → <b>ปิดรายโครงการ</b> → <b>รายคน</b>", 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
// แทรกหน้าจอก่อน (ตำแหน่งคำนวณจากข้อความเดิม) แล้วค่อยแก้จุดเล็ก
t = t.slice(0, eI + "\n            </sc-if>".length) + VIEW + t.slice(eI + "\n            </sc-if>".length);
let pts = 1;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เปิด-ปิดหน้าแยกรายโครงการ: แก้ ' + pts + ' จุด');
