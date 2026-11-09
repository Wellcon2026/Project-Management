#!/usr/bin/env node
/* =====================================================================
   เพิ่ม "As-Built & Survey · สำรวจหน้างาน" เข้า Wellcon PM
     node scripts/patch-survey-menu.js        (รันหลัง patch-site-issues.js และ patch-layboard-menu.js)
   - แอปอยู่ใน wellcon-defect-check (ลิงก์ /survey · โดเมน wellcon-survey.vercel.app) — ข้อมูลตาราง survey_log
   - เมนูหน้าโครงการ (ต่อจาก Site Issues) · ปุ่มบนหน้าแรก: หน้างาน (PM / Site) · ออกแบบ (Designer)
   - ปุ่มบนหน้าแรกแสดง "รอเขียนแบบ X · ถึงฉัน Y" (นับจาก survey_log ทุก 60 วิ · ยังไม่มีตาราง → แสดงคำอธิบายปกติ)
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
if (t.includes('_svOpen(')) { console.log('✓ มี As-Built & Survey อยู่แล้ว ไม่ต้องแก้'); process.exit(0); }
const ICON = 'M4 9h10v4h6v7H4zM4 5h10M4 3.5v3M14 3.5v3';
const METHODS = `// v1.368.0 As-Built & Survey · สำรวจหน้างาน — แอปเดียวกับ Defect Check (ลิงก์ /survey) · ตาราง survey_log
  _svUrl(pid){ const st=this.IS_STAGING(); const base=(st&&window.__wdcBase)||(st?'https://wellcon-defect-check.vercel.app/':'https://wellcon-survey.vercel.app/');
    return base.replace(/\\/?$/,'/')+'survey'+(st?'?env=staging':'')+'#/p/'+encodeURIComponent(pid)+'/plan'; }
  _svOpen(pid){ if(!pid) return; const u=this._svUrl(pid); try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ try{ window.location.href=u; }catch(e2){} } }
  _svSub(pid){ const C=this._svC||(this._svC={}); const c=C[pid];
    if(this._sb && (!c || Date.now()-c.t>60000) && !(this._svBusy||{})[pid]){ (this._svBusy=this._svBusy||{})[pid]=1;
      this._sb.from('survey_log').select('id,st:data->>status,resp:data->>resp,tags:data->tags').eq('project',pid).then(r=>{ this._svBusy[pid]=0;
        if(r.error){ C[pid]={ t:Date.now(), err:1 }; return; } const me=this.state.me||{}; const K=[me.email,me.name,me.username].filter(Boolean).map(x=>String(x).toLowerCase());
        const op=(r.data||[]).filter(x=>x.st!=='passed'); const wait=op.filter(x=>x.st==='fixing'||x.st==='wait'); const mine=op.filter(x=>K.indexOf(String(x.resp||'').toLowerCase())>=0||(Array.isArray(x.tags)&&x.tags.some(g=>K.indexOf(String((g||{}).k||'').toLowerCase())>=0)));
        C[pid]={ t:Date.now(), open:op.length, wait:wait.length, mine:mine.length }; this.setState({ svTick:Date.now() }); }, ()=>{ this._svBusy[pid]=0; }); }
    if(!c||c.err||!c.open) return ''; return '📐 '+c.open+' รายการ'+(c.wait?(' · รอเขียนแบบ '+c.wait):'')+(c.mine?(' · ถึงฉัน '+c.mine):''); }
  `;
const E = [
  ['เมนูหน้าโครงการ', "['issues','Site Issues · ติดตามงาน'],", (a) => a + "['survey','As-Built & Survey · สำรวจหน้างาน'],"],
  ['ลำดับเมนู (ต่อจาก Site Issues)', " issues:'qc',", (a) => a + " survey:'issues',"],
  ['กดเมนู → เปิด Survey', "if(k==='issues'){ this._issOpen(_pdPid); return; }", (a) => a + " if(k==='survey'){ this._svOpen(_pdPid); return; }"],
  ['ปุ่มหน้าแรก → เปิด Survey', "if(k==='issues'){ this._issOpen(pid); return; }", (a) => a + " if(k==='survey'){ this._svOpen(pid); return; }"],
  ['เมธอด Survey', "// v1.365.0 Site Issues · ติดตามงาน — แอปเดียวกับ Defect Check", (a) => METHODS + a],
  ['หมวดสีเมนู', " issues:'ops',", (a) => a + " survey:'ops',"],
  ['ไอคอน', " issues:'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zM12 6v4M12 13h.01',", (a) => a + " survey:'" + ICON + "',"],
  ['คำอธิบายปุ่ม', " issues:'ปักหมุดปัญหาบนแบบ · แท็กคนเกี่ยวข้อง · ติดตามคำตอบ',", (a) => a + " survey:'วาดผังห้องพร้อมระยะ · จุดต่างจากแบบ · ส่งออก DXF',"],
  ['ตัวเลขบนปุ่ม', "sub:(k==='issues'&&p?this._issSub(p.id):'')||SUB[k]", () => "sub:(k==='issues'&&p?this._issSub(p.id):'')||(k==='survey'&&p?this._svSub(p.id):'')||SUB[k]"],
  ['กลุ่มเมนู', " issues:'งานหน้าไซต์',", (a) => a + " survey:'งานหน้าไซต์',"],
  ['ปุ่มตั้งต้น หน้างาน', "const SITE=['tab:qc','tab:issues',", (a) => a + "'tab:survey',"],
  ['ปุ่มตั้งต้น ออกแบบ', "'tab:rfi','tab:issues','tab:prod','tab:changes','tab:plan','nav:library'];", () => "'tab:rfi','tab:issues','tab:survey','tab:prod','tab:changes','tab:plan','nav:library'];"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่ม "As-Built & Survey · สำรวจหน้างาน" ใน PM แล้ว');
