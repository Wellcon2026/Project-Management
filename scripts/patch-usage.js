#!/usr/bin/env node
/* =====================================================================
   การใช้งานระบบ (usage.html) — บันทึกการเปิดแอป + ปุ่มเข้าหน้าการใช้งานบนหน้าแรก
     node scripts/patch-usage.js        (รันต่อจาก patch-pd-short.js)
   1) ทุก 30 นาทีที่เปิด PM อยู่ (ไม่ใช่โหมดสาธิต) → usage_touch(อีเมล, 'pm') · 1 แถวต่อคน ต่อแอป ต่อวัน
   2) หน้าแรก: ปุ่ม "📊 การใช้งานระบบ" — เห็นเฉพาะผู้บริหาร · Admin · หัวหน้าฝ่าย · HR
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
if (t.includes('_usgTouch()')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (การใช้งานระบบ)'); process.exit(0); }
const ROLES = "['superadmin','director','admin','pm_mgr','qs_mgr','design_mgr','fin_mgr','hr','hr_mgr']";
const BTN = `<sc-if value="{{ exd.usageOn }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ exd.onUsage }}" style="display:flex;align-items:center;gap:10px;width:100%;border:1px solid #ECE6DA;background:#fff;border-radius:14px;padding:11px 16px;margin-bottom:12px;font-family:inherit;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent" style-hover="border-color:#C9A961"><span style="font-size:17px">📊</span><span style="flex:1;min-width:0;font-size:14px;font-weight:700;color:#1C1B18">การใช้งานระบบ<span style="display:block;font-size:12px;font-weight:500;color:#8C877D">ใครใช้ / ไม่ใช้ · Daily Report ส่งครบไหม · โมดูลที่ถูกใช้</span></span><span style="color:#C9A961;font-size:18px">›</span></button></sc-if>
        `;
const E = [
  ['เริ่มนับการเปิดแอป', 'componentDidMount(){', (a) => a + " try{ if(typeof window!=='undefined'){ setTimeout(()=>this._usgTouch(),8000); this._usgT=setInterval(()=>this._usgTouch(),60000); } }catch(e){} "],
  ['ปุ่มบนหน้าแรก', '<!-- v1.371.0 exec-dash -->', (a) => BTN + a],
  ['ค่าปุ่ม', 'v.exd=this._exd(S, v.ppCards, isT);', (a) => a + " v.exd.usageOn=" + ROLES + ".indexOf((S.me||{}).roleKey)>=0&&!S.demoMode; v.exd.onUsage=()=>{ try{ window.location.href='/usage.html'+(this.IS_STAGING()?'?env=staging':''); }catch(e){} };"],
  ['ตัวช่วย _usgTouch', '  _claimOpen(pid){', (a) => `  // v1.373.0 นับการเปิดแอป (หน้าการใช้งานระบบ) · ทุก 30 นาที · ไม่นับโหมดสาธิต
  _usgTouch(){ try{ const S=this.state; if(!S.loggedIn||S.demoMode||!this._sb) return; const em=String((S.me||{}).email||'').trim().toLowerCase(); if(!em||em.indexOf('@')<0) return;
    const k='wc_usg_'+em, now=Date.now(); let last=0; try{ last=+(localStorage.getItem(k)||0); }catch(e){} const d0=new Date(last).toDateString(), d1=new Date(now).toDateString();
    if(now-last<30*60e3&&d0===d1) return; try{ localStorage.setItem(k,String(now)); }catch(e){} this._sb.rpc('usage_touch',{ p_email:em, p_app:'pm' }).then(()=>{},()=>{}); }catch(e){} }
` + a],
];
for (const [name, a, f] of E) { const n = t.split(a).length - 1; if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — ไม่แก้ไฟล์'); process.exit(1); } t = t.replace(a, f(a)); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ การใช้งานระบบ: นับการเปิดแอป + ปุ่มบนหน้าแรก (ผู้บริหาร / หัวหน้าฝ่าย / HR)');
