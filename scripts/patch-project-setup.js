#!/usr/bin/env node
/* =====================================================================
   v1.443.0 project-setup — การ์ด "ตั้งค่าโครงการ" หน้าเดียวต่อโครงการ (ผู้บริหารสั่ง 20/11/2026)
     node scripts/patch-project-setup.js        (รันหลัง patch-ux-mobile.js)
   - ใช้ข้อมูลชุดเดิม: projects (วันที่ · มูลค่า · เลขสัญญา) · app_state projParties / projBilling / projTeam · คลังเอกสาร (bucket contract) · projRefBoq
   - UI อยู่ใน wcsetup.js · การ์ด 'tab:setup' (ต้องเลือกโครงการ) แสดง % ความครบของข้อมูล
     ตั้งต้น: PM · PM Manager · QS · QS Manager · Director (+ Super Admin เห็นทุกการ์ด) — Admin เปิด-ปิดตามตำแหน่ง / รายคนที่ ตารางสิทธิ์ (access.html)
   - Director แก้ข้อมูลคู่สัญญาได้ (เดิมไม่อยู่ใน PARTY_EDIT_ROLES)
   - มูลค่าสัญญา: แก้ / เห็นเฉพาะผู้มีสิทธิ์ตัวเลขเงิน (moneyOk)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · อัปเดตเลข wcsetup.js?v= ตาม SETUP_VER
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
const MARK = 'v1.443.0 project-setup';
const SETUP_VER = '1.0.0';
if (t.includes(MARK)) { const t2 = t.replace(/\/wcsetup\.js\?v=[0-9.]+/g, '/wcsetup.js?v=' + SETUP_VER);
  if (t2 !== t) { lines[idx] = enc(t2); fs.writeFileSync(file, lines.join(nl)); console.log('✓ project-setup มีแล้ว · อัปเดต wcsetup.js?v=' + SETUP_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (project-setup)'); process.exit(0); }
if (!t.includes('v1.441.0 ux-mobile')) { console.error('✗ ต้องรัน scripts/patch-ux-mobile.js ก่อน'); process.exit(1); }

const ICON = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

const HELP = `  // ===== ${MARK}: ตั้งค่าโครงการ (UI ใน wcsetup.js) =====
  // ความครบของข้อมูลโครงการ — ใช้ทั้งการ์ดหน้าแรกและหน้าตั้งค่า (ช่องที่เอกสารต่าง ๆ ดึงไปใช้)
  _setupScore(pid){ const S=this.state, p=(S.projects||[]).find(x=>x.id===pid)||{}; const P=((S.projParties||{})[pid])||{}, B=((S.projBilling||{})[pid])||{}, tm=((S.projTeam||{})[pid])||{};
    const L=[]; const chk=(ok,label,sec,party)=>L.push({ ok:!!ok, label, sec, party:party||'' });
    const pv=(k,f)=>String(((P[k]||{})[f])||(f==='company'&&['owner','consult','designer'].indexOf(k)>=0?(tm[k]||''):'')||'').trim();
    chk(p.startISO,'วันเริ่มงาน','main'); chk(p.endISO,'วันส่งมอบ','main'); chk(String(p.contractNo||'').trim(),'เลขที่สัญญา','main');
    if(this.moneyOk()) chk(Number(p.value)>0,'มูลค่าสัญญา','main');
    [['owner','Owner'],['consult','Consult'],['designer','Designer'],['qsc','QS ลูกค้า']].forEach(([k,n])=>{ chk(pv(k,'company'),n+': ชื่อบริษัท','party',k); chk(pv(k,'contact'),n+': ผู้ติดต่อ','party',k); chk(pv(k,'tel')||pv(k,'email'),n+': เบอร์ / อีเมล','party',k); });
    chk(pv('owner','address'),'Owner: ที่อยู่ออกเอกสาร','party','owner'); chk(pv('owner','taxId'),'Owner: เลขผู้เสียภาษี','party','owner');
    chk(String(B.credit||'').trim(),'เครดิตเทิร์ม','bill'); chk(String(B.retention||'').trim(),'Retention','bill');
    if(S.kbLoaded){ const D=(S.kbFiles||[]).filter(f=>f.proj===pid); chk(D.some(f=>f.kind==='contract'||f.kind==='loa'),'ไฟล์สัญญา / LOA','doc'); }
    chk(!!(S.projRefBoq||{})[pid],'BOQ อ้างอิง','doc');
    const done=L.filter(x=>x.ok).length; return { pct:L.length?Math.round(done/L.length*100):0, done, total:L.length, missing:L.filter(x=>!x.ok) }; }
  _setupBridge(){ const self=this; const can=()=>self.canEditParties();
    return {
      canEdit:can, money:()=>self.moneyOk(),
      projects:()=>(self._lastVisProj||self.state.projects||[]).map(p=>({ id:p.id, name:p.name||p.id, code:p.code||p.wlcCode||'' })),
      proj:(pid)=>(self.state.projects||[]).find(x=>x.id===pid)||null,
      effEnd:(pid)=>{ const p=(self.state.projects||[]).find(x=>x.id===pid); return p?self._effEndISO(p):''; },
      defs:()=>({ parties:self.PARTY_DEFS(), pf:self.PARTY_FIELDS(), bf:self.BILLING_FIELDS() }),
      parties:(pid)=>{ const P={ ...(((self.state.projParties||{})[pid])||{}) }, tm=((self.state.projTeam||{})[pid])||{};
        ['owner','consult','designer'].forEach(k=>{ if(!(P[k]||{}).company&&tm[k]) P[k]={ ...(P[k]||{}), company:tm[k] }; }); return P; },
      billing:(pid)=>((self.state.projBilling||{})[pid])||{},
      score:(pid)=>self._setupScore(pid),
      setProj:(pid,k,v)=>{ if(!can()) return; if(k==='value'&&!self.moneyOk()) return; self.setProj(pid,k,v); },
      setParty:(pid,pk,fk,v)=>{ if(!can()) return; self.setState(st=>{ const cur={ ...((st.projParties||{})[pid]||{}) }; cur[pk]={ ...(cur[pk]||{}), [fk]:v };
        const next={ projParties:{ ...(st.projParties||{}), [pid]:cur } };
        if(fk==='company'&&['owner','consult','designer','qs'].indexOf(pk)>=0) next.projTeam={ ...(st.projTeam||{}), [pid]:{ ...((st.projTeam||{})[pid]||{}), [pk]:v } };   // ชื่อบริษัท 4 ฝ่ายหลัก sync การ์ดทีมเดิม (เหมือนหน้าภาพรวม)
        return next; }); },
      setBill:(pid,k,v)=>{ if(!can()) return; self.setState(st=>({ projBilling:{ ...(st.projBilling||{}), [pid]:{ ...((st.projBilling||{})[pid]||{}), [k]:v } } })); },
      docs:(pid)=>(self.state.kbFiles||[]).filter(f=>f.proj===pid&&!self.KB_SUP(f.kind)),
      docsLoaded:()=>!!self.state.kbLoaded, docsLoad:()=>Promise.resolve(self.docsLoad()),
      upload:(pid,kind,files,ai)=>new Promise(res=>{ if(ai) self.openProject(pid); self.setState({ kbUpKind:kind, kbUpProj:pid }, ()=>{ Promise.resolve(self.docsUpload(files,{ ai:!!ai })).then(res,res); }); }),
      refBoq:(pid)=>{ const v=(self.state.projRefBoq||{})[pid]; return v?{ fileName:v.fileName||'BOQ' }:null; },
      team:(pid)=>{ const p=(self.state.projects||[]).find(x=>x.id===pid)||{}, T=p.team||{}, A=self.state.accounts||[];
        return self.TEAM_ROLES().map(tr=>({ role:tr.label||tr.key, names:(Array.isArray(T[tr.key])?T[tr.key]:[]).map(u=>{ const a=A.find(x=>x.uid===u||x.email===u); return a?(self.nickOf(a)||a.name||''):''; }).filter(Boolean) })).filter(x=>x.names.length); },
      openAi:(pid)=>{ self.openProject(pid); setTimeout(()=>self._paiOpen(pid),350); },
      openProject:(pid)=>self.openProject(pid),
      setCur:(pid)=>{ try{ window.localStorage.setItem('wellcon_pm_workpid',pid); }catch(e){} } }; }
  _setupOpen(pid){ if(typeof window==='undefined'||!window.WCSetup){ this.showToast('กำลังโหลดหน้าตั้งค่าโครงการ — ลองอีกครั้งในอีกครู่'); return; }
    window.WCSetup.open(this._setupBridge(), pid||this._wkPid||this.state.projectId); }
`;

const R = [
  ['โหลด wcsetup.js', '<!-- v1.439.0 search-hl -->', '<!-- v1.439.0 search-hl -->\n<script src="/wcsetup.js?v=' + SETUP_VER + '"></script><!-- ' + MARK + ' -->'],
  ['ตัวช่วยตั้งค่าโครงการ', '  _noteBridge(){', HELP + '  _noteBridge(){'],
  ['Director แก้คู่สัญญาได้', "PARTY_EDIT_ROLES(){ return ['superadmin','fin','fin_mgr','pm','pm_mgr','office','qs','qs_mgr']; }", "PARTY_EDIT_ROLES(){ return ['superadmin','director','fin','fin_mgr','pm','pm_mgr','office','qs','qs_mgr']; }   /* " + MARK + ": + Director */"],
  ['การ์ดหน้าแรก', "      if(key==='tab:pbook'){",
   "      if(key==='tab:setup'){ if(this._featGOff('tab:setup')||!this._pgAllowed('setup')) return null; const c=this.TAB_CAT('setup'); let sub=SUB.setup; try{ if(p){ const sc=this._setupScore(p.id); sub='ข้อมูลครบ '+sc.pct+'%'+(sc.missing.length?(' · ยังขาด '+sc.missing.length+' อย่าง'):' ✓')+' · คู่สัญญา · สัญญา · AI อ่านเอกสาร'; } }catch(e){} return { key, label:'ตั้งค่าโครงการ', sub, path:I.setup, c:c.c, d:c.d, needP:true, grp:'โครงการ', run:(pp)=>this._setupOpen(pp.id) }; }   // " + MARK + "\n      if(key==='tab:pbook'){"],
  ['ไอคอนการ์ด', 'const I={ pbook:', "const I={ setup:'" + ICON + "', pbook:"],
  ['คำอธิบายการ์ด', 'const SUB={ pbook:', "const SUB={ setup:'ข้อมูลหลัก · คู่สัญญา · วางบิล · เอกสารสัญญา · AI อ่านเอกสาร', pbook:"],
  ['หมวดสี', "price:'fin', pbook:'fin' };", "price:'fin', pbook:'fin', setup:'home' };"],
  ['สีประจำการ์ด', "'tab:pbook':'#8A6D3B',", "'tab:pbook':'#8A6D3B','tab:setup':'#7C2D12',"],
  ['Super Admin เห็นการ์ด', "const all=['dhome', ...defs.map(d=>'tab:'+d[0])", "const all=['dhome','tab:setup', ...defs.map(d=>'tab:'+d[0])"],
  ['เปิดจากเมนู / ค้นหา', "if(k==='pbook'){ this._pbOpen(); return; }", "if(k==='setup'){ this._setupOpen(pid); return; } if(k==='pbook'){ this._pbOpen(); return; }"],
  ['ชุดเริ่มต้น PM', "const PM=['tab:plan',", "const PM=['tab:setup','tab:plan',"],
  ['ชุดเริ่มต้น PM Manager', "const PMM=['tab:plan',", "const PMM=['tab:setup','tab:plan',"],
  ['ชุดเริ่มต้น QS', "const QS=['tab:quo',", "const QS=['tab:setup','tab:quo',"],
  ['ชุดเริ่มต้น Director', "const DIR=['tab:plan',", "const DIR=['tab:setup','tab:plan',"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ project-setup: แก้ ' + R.length + ' จุด');
