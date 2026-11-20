#!/usr/bin/env node
/* =====================================================================
   v1.438.0 note-hub — การ์ด "บันทึก · งานของฉัน" บนหน้าแรกทุกตำแหน่ง (ผู้บริหารสั่ง 20/11/2026)
     node scripts/patch-note-hub.js        (รันหลัง patch-delta-sync.js)
   ที่เดียวรวม: บันทึกส่วนตัว · บันทึกโครงการ (ทีมเห็น) · แท็กถึงฉัน · งานค้าง (UI อยู่ใน wcnote.js)
   แก้:
   1) โหลด /wcnote.js (+ wctag.js 1.2.3 ที่ส่งออก markDone / go)
   2) การ์ดแรกบนหน้าแรกทุกคน (ไม่ขึ้นกับชุดการ์ดตำแหน่ง · ปิดทั้งระบบได้ด้วยสวิตช์ 'nav:note')
   3) _noteBridge(): ใช้โน้ตชุดเดิม (app_state 'notes' คีย์ proj:<pid>) · งานคงค้างโครงการ (remWork) · แผนงาน (plans)
   4) โน้ตที่ติ๊ก "แสดงในปฏิทินโครงการ" (cal + due) ขึ้นในหน้าปฏิทิน + ปฏิทินพื้นที่ทำงาน (รายการเสมือน แก้ที่บันทึก)
      โน้ตส่วนตัว = เห็นในปฏิทินเฉพาะเจ้าของ (กรองด้วย _noteVisible เดิม)
   5) ลิงก์ ?wnote=<id> (จากแท็ก) → เปิดหน้าบันทึกที่โน้ตนั้นหลังเข้าสู่ระบบ
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
const MARK = 'v1.438.0 note-hub';
// เลขเวอร์ชัน wcnote.js (ล้างแคชเครื่องผู้ใช้) — เปลี่ยนทุกครั้งที่แก้ wcnote.js แล้วรันสคริปต์นี้ซ้ำ
const NOTE_VER = '1.1.0';   // 1.1.0: แยกแท็บส่วนตัว / สาธารณะ · 1.0.1: ไฮไลต์คำค้น
if (t.includes(MARK)) { const re = /\/wcnote\.js\?v=[0-9.]+/g; const n = (t.match(re) || []).length; const t2 = t.replace(re, '/wcnote.js?v=' + NOTE_VER);
  if (t2 !== t) { lines[idx] = enc(t2); fs.writeFileSync(file, lines.join(nl)); console.log('✓ note-hub มีแล้ว · อัปเดต wcnote.js?v=' + NOTE_VER + ' (' + n + ' จุด)'); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (note-hub)'); process.exit(0); }
if (!t.includes('v1.437.0 delta-sync')) { console.error('✗ ต้องรัน scripts/patch-delta-sync.js ก่อน'); process.exit(1); }

const HELP = `  _noteKey(scope,id){ return scope+':'+id; }
  // ===== ${MARK}: บันทึก · งานของฉัน (UI ใน wcnote.js) =====
  _noteBridge(){ const self=this; const first=(s,n)=>{ const x=String(s||'').trim().split('\\n')[0]; return x.length>n?x.slice(0,n)+'…':x; };
    return {
      me:()=>{ const m=self.state.me||{}; return { email:String(m.email||'').toLowerCase(), name:(self.nickOf&&self.nickOf(m))||m.name||m.email||'', uid:m.uid||'', roleKey:m.roleKey||'', admin:m.roleKey==='superadmin' }; },
      projects:()=>(self._lastVisProj||self.state.projects||[]).filter(p=>p&&p.id&&self._noteCanSee(p.id)).map(p=>({ id:p.id, name:p.name||p.id })),
      projName:(pid)=>{ try{ return self.projName(pid); }catch(e){ return ''; } },
      curPid:()=>self._wkPid||self.state.projectId||'',
      notes:()=>self.state.notes||{},
      visible:(n)=>self._noteVisible(n),
      nameOf:(em)=>{ const a=self._respAcc?self._respAcc(em):null; return a?((self.nickOf&&self.nickOf(a))||a.name||em):String(em||'').split('@')[0]; },
      add:(pid, patch)=>{ pid=pid||'_gen'; const me=self.state.me||{}, k='proj:'+pid;
        const n={ id:'nt'+Date.now()+Math.random().toString(36).slice(2,5), by:me.name||(me.email||'').split('@')[0]||'—', email:me.email||'', at:new Date().toISOString(), ...(patch||{}) };
        self.setState(st=>({ notes:{ ...(st.notes||{}), [k]:[ ...((st.notes||{})[k]||[]), n ] } })); return n; },
      update:(k,id,patch)=>self.noteUpdate(k,id,patch),
      del:(k,id)=>self.setState(st=>{ const L=((st.notes||{})[k]||[]).filter(x=>x.id!==id); const nx={ ...(st.notes||{}) }; if(L.length) nx[k]=L; else delete nx[k]; nx._del={ ...(nx._del||{}), [id]:Date.now() }; return { notes:nx }; }),
      rem:()=>{ const S=self.state, me=S.me||{}; if(!me.uid) return []; const out=[];
        Object.keys(S.remWork||{}).forEach(pid=>{ (Array.isArray((S.remWork||{})[pid])?S.remWork[pid]:[]).forEach(x=>{ if(x&&x.assignee===me.uid&&!x.done) out.push({ pid, id:x.id, text:x.text||'', due:x.due||'', by:x.by||'', done:false }); }); }); return out; },
      remToggle:(pid,id)=>self.remToggle(pid,id),
      plans:(pid)=>(self.state.plans||[]).filter(r=>r&&r.project===pid&&!r.isGroup&&String(r.title||'').trim()).map(r=>({ id:r.id, title:String(r.title||''), start:String(r.start||'').slice(0,10), end:String(r.end||'').slice(0,10), sched:r.sched||'' })),
      openPlan:(pid)=>self._openTab(pid,'plan'),
      openCal:(pid,iso)=>self.setState({ screen:'calendar', calProj:pid, calYm:String(iso||'').slice(0,7)||self._ymNow(), calDayIso:iso, calOff:{ ...(self.state.calOff||{}), [pid]:false } }),
      noteUrl:(id)=>window.location.origin+window.location.pathname+'?wnote='+encodeURIComponent(id)+(self.IS_STAGING()?'&env=staging':''),
      first };
  }
  _noteHub(o){ if(typeof window==='undefined'||!window.WCNote){ this.showToast('กำลังโหลดหน้าบันทึก — ลองอีกครั้งในอีกครู่'); return; }
    if(!(this.state.me||{}).email){ this.showToast('เข้าสู่ระบบก่อน'); return; } window.WCNote.open(this._noteBridge(), o||{}); }
  _noteTile(I, CT){ if(this._featGOff('nav:note')||!(this.state.me||{}).email) return []; const c=CT.home||{};
    let sub='จดบันทึกส่วนตัว / โครงการ · แท็กถึงฉัน · งานค้าง';
    try{ if(window.WCNote){ const n=window.WCNote.counts(this._noteBridge()); const a=[]; if(n.tag) a.push('🏷 แท็กถึงฉัน '+n.tag); if(n.todo) a.push('✅ งานค้าง '+n.todo+(n.late?(' (เลยกำหนด '+n.late+')'):'')); if(n.mine) a.push('📝 บันทึก '+n.mine); if(a.length) sub=a.join(' · '); } }catch(e){}
    return [{ key:'note', label:'บันทึก · งานของฉัน', sub, path:I.memo||I.dot, c:c.c, d:c.d, needP:false, grp:'เมนู', run:()=>this._noteHub() }]; }
  // โน้ตที่ลงปฏิทิน → รายการเสมือนในปฏิทิน (ไม่เขียนลง milestones · แก้ที่หน้าบันทึก)
  _noteMs(){ const N=this.state.notes||{}, out=[]; const first=(s)=>{ const x=String(s||'').trim().split('\\n')[0]; return x.length>60?x.slice(0,60)+'…':x; };
    Object.keys(N).forEach(k=>{ if(k.indexOf('proj:')!==0||k==='proj:_gen'||!Array.isArray(N[k])) return; const pid=k.slice(5);
      N[k].forEach(n=>{ if(!n||!n.cal||!/^\\d{4}-\\d{2}-\\d{2}/.test(String(n.due||''))||!this._noteVisible(n)) return;
        out.push({ id:'v_n_'+n.id, project:pid, date:String(n.due).slice(0,10), type:'other', title:(n.done?'✓ ':(n.vis==='private'?'🔒 ':'📝 '))+first(n.text), note:n.plan&&n.plan.t?('แผนงาน: '+n.plan.t):'', virtual:true, assignee:'' }); }); });
    return out; }
  // ลิงก์ ?wnote=<id> → เปิดหน้าบันทึกที่โน้ตนั้น (รอเข้าสู่ระบบ + โหลดข้อมูล)
  _noteLink(){ if(this._noteLinkDone||typeof window==='undefined') return; try{ const m=/[?&]wnote=([^&#]+)/.exec(window.location.search); if(!m){ this._noteLinkDone=true; return; }
    if(!this.state.loggedIn||!(this.state.me||{}).email||!window.WCNote) return; if(!this._noteLinkT0) this._noteLinkT0=Date.now();
    if(this._stPulledOk!==true&&Date.now()-this._noteLinkT0<15000) return; this._noteLinkDone=true; const id=decodeURIComponent(m[1]);
    try{ const u=new URL(window.location.href); u.searchParams.delete('wnote'); window.history.replaceState(window.history.state,'',u.href); }catch(e){}
    setTimeout(()=>this._noteHub({ focus:id }),300); }catch(e){} }
`;

const R = [
  ['โหลด wcnote.js', '<script src="/wctag.js?v=1.2.2"></script>', '<script src="/wctag.js?v=1.2.3"></script>\n<script src="/wcnote.js?v=' + NOTE_VER + '"></script><!-- ' + MARK + ' -->'],
  ['ตัวช่วยบันทึก', "  _noteKey(scope,id){ return scope+':'+id; }\n", HELP],
  ['การ์ดหน้าแรก', 'const tiles0=(_permWait?[]:list).map(info)', 'const tiles0=[...this._noteTile(I,CT), ...(_permWait?[]:list).map(info)]'],
  ['สีการ์ด', "'nav:ai':'#A21CAF'};", "'nav:ai':'#A21CAF','note':'#9A3412'};"],
  ['ปฏิทินพื้นที่ทำงาน', 'const ms=(S.milestones||[]).filter(m=>m&&m.date&&ids.has(m.project));', 'const ms=[...(S.milestones||[]), ...this._noteMs()].filter(m=>m&&m.date&&ids.has(m.project));   /* ' + MARK + ' */'],
  ['ลิงก์ ?wnote=', 'this._wctT=setInterval(()=>{ this._ssoSync(); this._wctSync(); this._aprSync(); },1500);', 'this._wctT=setInterval(()=>{ this._ssoSync(); this._wctSync(); this._aprSync(); this._noteLink(); },1500);'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
const CAL = '[...msVirtual, ...this.MILESTONES()]';
if (t.split(CAL).length - 1 !== 2) { console.error('✗ ปฏิทินโครงการ: หาจุดแก้เจอ ' + (t.split(CAL).length - 1) + ' ที่ (ต้องเจอ 2)'); process.exit(1); }
for (const [, a, b] of R) t = t.split(a).join(b);
t = t.split(CAL).join('[...msVirtual, ...this.MILESTONES(), ...this._noteMs()]');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ note-hub: แก้ ' + (R.length + 1) + ' จุด');
