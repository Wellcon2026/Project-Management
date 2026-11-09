#!/usr/bin/env node
/* =====================================================================
   เพิ่ม "Site Issues · ติดตามงาน" เข้า Wellcon PM
     node scripts/patch-site-issues.js        (รันหลัง patch-claim-menu.js และ patch-role-home.js)
   - แอปติดตามงานอยู่ใน wellcon-defect-check (ลิงก์ /issues) — ปักหมุดปัญหาบนแบบชุดเดียวกับ Defect · ข้อมูลตาราง issue_log
   - เมนูหน้าโครงการ (ต่อจาก Defect Check) · ปุ่มบนหน้าแรกตามบทบาท (หน้างาน / ออกแบบ / จป. / ธุรการ / ผู้บริหาร)
   - ปุ่มบนหน้าแรกแสดง "เปิด X · ถึงฉัน Y" (นับจาก issue_log ทุก 60 วิ · ยังไม่มีตาราง → แสดงคำอธิบายปกติ)
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
if (t.includes('_issOpen(')) { console.log('✓ มี Site Issues อยู่แล้ว ไม่ต้องแก้'); process.exit(0); }
const ICON = 'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zM12 6v4M12 13h.01';
const METHODS = `// v1.365.0 Site Issues · ติดตามงาน — แอปเดียวกับ Defect Check (ลิงก์ /issues) · ตาราง issue_log
  _issUrl(pid){ const base=(this.IS_STAGING()&&window.__wdcBase)||'https://wellcon-defect-check.vercel.app/';
    return base.replace(/\\/?$/,'/')+'issues'+(this.IS_STAGING()?'?env=staging':'')+'#/p/'+encodeURIComponent(pid)+'/mine'; }
  _issOpen(pid){ if(!pid) return; const u=this._issUrl(pid); try{ const w=window.open(u,'_blank','noopener'); if(!w) window.location.href=u; }catch(e){ try{ window.location.href=u; }catch(e2){} } }
  _issSub(pid){ const C=this._issC||(this._issC={}); const c=C[pid];
    if(this._sb && (!c || Date.now()-c.t>60000) && !(this._issBusy||{})[pid]){ (this._issBusy=this._issBusy||{})[pid]=1;
      this._sb.from('issue_log').select('id,st:data->>status,resp:data->>resp,tags:data->tags').eq('project',pid).then(r=>{ this._issBusy[pid]=0;
        if(r.error){ C[pid]={ t:Date.now(), err:1 }; return; } const me=this.state.me||{}; const K=[me.email,me.name,me.username].filter(Boolean).map(x=>String(x).toLowerCase());
        const op=(r.data||[]).filter(x=>x.st!=='done'&&x.st!=='passed'); const mine=op.filter(x=>K.indexOf(String(x.resp||'').toLowerCase())>=0||(Array.isArray(x.tags)&&x.tags.some(g=>K.indexOf(String((g||{}).k||'').toLowerCase())>=0)));
        C[pid]={ t:Date.now(), open:op.length, mine:mine.length }; this.setState({ issTick:Date.now() }); }, ()=>{ this._issBusy[pid]=0; }); }
    if(!c||c.err||!c.open) return ''; return '🔴 เปิด '+c.open+' เรื่อง'+(c.mine?(' · ถึงฉัน '+c.mine):''); }
  `;
const E = [
  ['เมนูหน้าโครงการ', "['qc','Defect Check · ตรวจงาน (QC)'],", (a) => a + "['issues','Site Issues · ติดตามงาน'],"],
  ['ลำดับเมนู (ต่อจาก Defect Check)', "const after={ takeoff:'daily', qm:'daily', claim:'changes',", (a) => a + " issues:'qc',"],
  ['กดเมนู → เปิด Site Issues', "if(k==='claim'){ this._claimOpen(_pdPid); return; }", (a) => a + " if(k==='issues'){ this._issOpen(_pdPid); return; }"],
  ['ปุ่มหน้าแรก → เปิด Site Issues', "_openTab(pid,k){ if(k==='qm'){ this._qmOpen(pid); return; }", (a) => METHODS + a + " if(k==='issues'){ this._issOpen(pid); return; }"],
  ['หมวดสีเมนู', "rfi:'ops', qc:'ops',", (a) => a + " issues:'ops',"],
  ['ไอคอน', "qm:'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',", (a) => a + " issues:'" + ICON + "',"],
  ['คำอธิบายปุ่ม', "qc:'ปักหมุดจุดบกพร่องบนแบบ · ติดตามแก้ไข',", (a) => a + " issues:'ปักหมุดปัญหาบนแบบ · แท็กคนเกี่ยวข้อง · ติดตามคำตอบ',"],
  ['ตัวเลขบนปุ่ม', "return { key, label:l, sub:SUB[k]||'หน้าในโครงการ',", () => "return { key, label:l, sub:(k==='issues'&&p?this._issSub(p.id):'')||SUB[k]||'หน้าในโครงการ',"],
  ['ปุ่มตั้งต้น หน้างาน', "const SITE=['tab:qc',", (a) => a + "'tab:issues',"],
  ['ปุ่มตั้งต้น ออกแบบ', "const DES=['dhome','tab:dwg','tab:skp','tab:mat','tab:procm','tab:rfi',", (a) => a + "'tab:issues',"],
  ['ปุ่มตั้งต้น จป.', "const SAFE=['tab:daily','tab:qc',", (a) => a + "'tab:issues',"],
  ['ปุ่มตั้งต้น ธุรการ', "const OFF=['tab:daily','tab:docs','tab:memo','tab:rfi',", (a) => a + "'tab:issues',"],
  ['ปุ่มตั้งต้น ผู้บริหาร', "const DIR=['tab:overview','tab:plan','tab:delay',", (a) => a + "'tab:issues',"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เพิ่ม "Site Issues · ติดตามงาน" ใน PM แล้ว');
