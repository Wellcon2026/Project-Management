#!/usr/bin/env node
/* =====================================================================
   v1.385.0 card-admin — ตั้งค่าระบบ → "การ์ดหน้าแรก & ฟังก์ชัน" (Admin เปิด-ปิดการ์ด / ฟังก์ชันให้ผู้ใช้)
     node scripts/patch-card-admin.js
   1) แท็บ "ตามตำแหน่ง": เลือกตำแหน่ง → สวิตช์เปิด/ปิดการ์ดทุกใบ + ▲▼ จัดลำดับ (workPages[role]) · สวิตช์ฟังก์ชันตามตำแหน่ง (featRole)
   2) แท็บ "รายคน": ค้นหาผู้ใช้ → สวิตช์การ์ดของคนนั้น (workUser) + สวิตช์ฟังก์ชันรายคน (featOff / aiOff เดิม) · คืนค่าตามตำแหน่ง
   3) แท็บ "ฟังก์ชันทั้งระบบ": ปิดระบบสนับสนุน (AI · อัดประชุม · Layboard · Library ฯลฯ) หรือหน้าในโครงการ ให้ทุกคนพร้อมกัน (featGlobal)
   4) ชุดการ์ดเริ่มต้นตามตำแหน่ง (WORK_DEF) ออกแบบใหม่ — ตัดหน้าที่ยกเลิกแล้ว (Site Issues / Survey / Takeoff เดิม) · เรียงตามงานประจำวัน
   ลำดับการใช้ค่า: ปิดทั้งระบบ > รายคน > ตามตำแหน่ง > ค่าเริ่มต้น
   ใครตั้งได้: Super Admin · ผู้ที่ได้สิทธิ์ "admin" ระดับแก้ไข (ไม่ใช่ผู้ช่วยจัดทีมอย่างเดียว)
   ข้อมูล: app_state 'featGlobal' { featKey | 'tab:<pdTab>': false } · 'featRole' { roleKey: { featKey: bool } } — เขียนผ่าน _stKeySet · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง (หลัง patch-work-user.js)
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
const MARK = 'v1.385.0 card-admin';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (การ์ดหน้าแรก & ฟังก์ชัน)'); process.exit(0); }
if (!t.includes('v1.375.0 work-user')) { console.error('✗ ต้องรัน scripts/patch-work-user.js ก่อน'); process.exit(1); }

// ---------------------------------------------------------------------
// ก) แทนทั้งฟังก์ชัน (จาก start ถึงก่อน end)
// ---------------------------------------------------------------------
const B = [
  ['สิทธิ์ AI: ทั้งระบบ / ตำแหน่ง / รายคน', '  aiAllowed(acc){', '  // ---- ระบบสนับสนุน (เปิด/ปิดได้รายคน',
   "  aiAllowed(acc){ const a=acc||this.state.me; if(!a) return false;   // " + MARK + "\n" +
   "    if(a.roleKey==='superadmin') return true; if(this._featGOff('ai')) return false; return this._featUserOn('ai', a); }\n"],
  ['featOn: ปิดทั้งระบบ > รายคน > ตำแหน่ง > ค่าเริ่มต้น', '  featOn(key, acc){', '  toggleFeat(email, key){',
   "  // ===== " + MARK + ": ฟังก์ชันทั้งระบบ / ตามตำแหน่ง — app_state 'featGlobal' { featKey|'tab:<k>': false } · 'featRole' { roleKey:{ featKey:bool } } (เขียนผ่าน _stKeySet) =====\n" +
   "  _featGOff(key){ return (this.state.featGlobal||{})[key]===false; }\n" +
   "  _featRoleVal(key, rk){ const R=(this.state.featRole||{})[String(rk||'')]; return R&&typeof R[key]==='boolean'?R[key]:undefined; }\n" +
   "  _featRoleOn(key, rk){ const r=this._featRoleVal(key, rk); if(r!==undefined) return r; if(key==='ai') return true; return this.featDefault(key, { roleKey:rk, email:'' }); }\n" +
   "  // ค่าระดับผู้ใช้ (ไม่รวมสวิตช์ทั้งระบบ): รายคน > ตำแหน่ง > ค่าเริ่มต้น\n" +
   "  _featUserOn(key, a){ a=a||{};\n" +
   "    if(key==='ai'){ if(a.roleKey==='superadmin') return true; if(a.aiOff===true) return false; if(a.aiOff===false) return true; const r=this._featRoleVal('ai', a.roleKey); return r===undefined?true:r; }\n" +
   "    const off=a.featOff||{}; if(off[key]===undefined){ const r=this._featRoleVal(key, a.roleKey); return r===undefined?this.featDefault(key, a):r; }\n" +
   "    return off[key]!==true; }\n" +
   "  _featUserReset(email){ this.setState(st=>{ const upd=(a)=>{ if(a.email!==email) return a; const n={ ...a, featOff:{} }; delete n.aiOff; return n; };\n" +
   "      return { accounts:(st.accounts||[]).map(upd), me:st.me&&st.me.email===email?upd(st.me):st.me }; }); this.showToast('คืนค่าฟังก์ชันตามตำแหน่งแล้ว'); }\n" +
   "  _cardAdminOk(){ const me=this.state.me||{}; return me.roleKey==='superadmin' || (this.permOf('admin')==='write' && !this._assignOnly()); }\n" +
   "  featOn(key, acc){\n" +
   "    if(key==='level') return false;   // LEVEL_OFF v1.373.1: ปิด Level Gate ทั้งระบบ (คำสั่งผู้บริหาร 11/11/2026)\n" +
   "    const a=acc||this.state.me;\n" +
   "    if(this._featGOff(key) && !(key==='ai'&&a&&a.roleKey==='superadmin')) return false;   // " + MARK + ": ปิดทั้งระบบ\n" +
   "    if(key==='ai') return this.aiAllowed(acc);\n" +
   "    if(!a) return false;\n" +
   "    if(key==='level' && !this._engViewOk(a)) return false;   // v1.364.9 level-private\n" +
   "    return this._featUserOn(key, a);\n" +
   "  }\n"],
  ['สลับ AI รายคน (รองรับค่าตามตำแหน่ง)', '  toggleAI(email){', '  canSee(mod){',
   "  toggleAI(email){   // " + MARK + ": สลับจากค่าที่ใช้อยู่จริง (รายคน > ตำแหน่ง)\n" +
   "    const a0=(this.state.accounts||[]).find(x=>x.email===email)||{}; const was=this._featUserOn('ai', a0);\n" +
   "    this.setState(st=>{ const upd=(a)=>a.email===email?{...a, aiOff:was}:a;\n" +
   "      return { accounts:st.accounts.map(upd), me:st.me?upd(st.me):st.me }; });\n" +
   "    this.showToast((was?'ปิด':'เปิด')+'สิทธิ์ใช้ผู้ช่วย AI · '+(a0.name||email));\n" +
   "  }\n"],
  ['ชุดการ์ดเริ่มต้นตามตำแหน่ง (ออกแบบใหม่)', '  WORK_DEF(rk){', '  WORK_LIST(rk){',
   "  // " + MARK + ": ชุดการ์ดเริ่มต้นตามตำแหน่ง (ออกแบบใหม่ 14/11/2026) — เรียงตามงานที่ใช้บ่อยของแต่ละตำแหน่ง · Admin ปรับได้ที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน\n" +
   "  //   ตัดหน้าที่ยกเลิกแล้ว (Site Issues · Survey แยก · Takeoff เดิม) · 'tab:mat' / 'tab:procm' ใส่คู่กัน — แสดงใบเดียวตามโหมด Material Log\n" +
   "  WORK_DEF(rk){ const M=['tab:mat','tab:procm'];\n" +
   "    const SM=['tab:daily','tab:qc','tab:mango','tab:plan','tab:rfi','tab:dwg',...M,'tab:changes','tab:delay','tab:claim','tab:qm','tab:handover','tab:cal'];\n" +
   "    const SITE=['tab:daily','tab:qc','tab:dwg','tab:plan','tab:mango','tab:qm','tab:delay','tab:cal'];\n" +
   "    const PM=['tab:plan','tab:daily','tab:qc','tab:delay','tab:changes','tab:mango','tab:rfi','tab:claim','tab:dwg',...M,'tab:handover','tab:docs','tab:memo','tab:cal','tab:lay'];\n" +
   "    const PMM=['tab:plan','tab:delay','tab:daily','tab:qc','tab:changes','tab:claim','tab:mango','tab:rfi','tab:handover','tab:dwg','nav:qstrack','tab:cal'];\n" +
   "    const DES=['dhome','tab:dwg','tab:skp','tab:lay',...M,'tab:rfi','tab:qc','tab:prod','tab:changes','tab:plan','nav:library'];\n" +
   "    const DESM=['dhome','tab:dwg','tab:skp','tab:lay',...M,'tab:rfi','tab:qc','tab:prod','tab:spo','tab:changes','tab:plan','nav:qstrack','nav:library'];\n" +
   "    const QS=['tab:qm','tab:aw','tab:changes','tab:claim','tab:mango','tab:dwg','tab:fin','tab:plan','nav:qstrack','nav:procurement'];\n" +
   "    const DIR=['tab:plan','tab:delay','tab:fin','tab:changes','tab:claim','tab:mango','tab:qc','tab:handover','nav:cfo','nav:qstrack','nav:dashboard'];\n" +
   "    const PRC=['tab:mango',...M,'tab:spo','tab:subcon','tab:changes','nav:procurement','nav:subcon'];\n" +
   "    const STO=[...M,'tab:spo','tab:mango','tab:daily','tab:cal','nav:procurement'];\n" +
   "    const FAC=['tab:prod','tab:dwg','tab:skp',...M,'tab:qc','tab:plan','tab:cal'];\n" +
   "    const DRV=['tab:cal','tab:spo',...M,'tab:daily'];\n" +
   "    const FIN=['tab:fin','tab:aw','tab:changes','tab:claim','tab:subcon','tab:mango','nav:cfo','nav:procurement'];\n" +
   "    const HR=['nav:hr','nav:jd','nav:training','nav:library','tab:daily','tab:cal'];\n" +
   "    const OFF=['tab:docs','tab:memo','tab:daily','tab:cal','tab:rfi','tab:dwg','tab:changes','tab:claim','tab:handover','tab:mango','nav:library'];\n" +
   "    const SAFE=['tab:daily','tab:qc','tab:delay','tab:claim','tab:plan','tab:cal','tab:docs','tab:memo','nav:library','nav:training'];\n" +
   "    return { sitemgr:SM, site:SITE, pm:PM, pm_mgr:PMM, designer:DES, design_mgr:DESM, qs:QS, qs_mgr:QS, director:DIR,\n" +
   "      proc:PRC, store:STO, factory:FAC, driver:DRV, fin:FIN, fin_mgr:FIN, hr:HR, hr_mgr:HR, office:OFF, safety:SAFE,\n" +
   "      superadmin:['tab:mango','tab:plan','tab:delay','tab:fin','tab:changes','tab:claim','tab:handover','nav:cfo','nav:qstrack','nav:hr','nav:admin','nav:system'] }[rk]||[]; }\n"],
];

// ---------------------------------------------------------------------
// ข) ค่าแสดงผลในหน้า ตั้งค่าระบบ
// ---------------------------------------------------------------------
const CC_VALS =
  "  // ===== " + MARK + ": ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน (ตามตำแหน่ง · รายคน · ทั้งระบบ) =====\n" +
  "  CC_VALS(S){ const out={ ccShow:false }; if(S.screen!=='system'||!this._cardAdminOk()) return out; out.ccShow=true;\n" +
  "    const RD=this.ROLE_DEFS(); const tab=['role','user','sys'].indexOf(S.ccTab)>=0?S.ccTab:'role';\n" +
  "    out.ccTabs=[['role','ตามตำแหน่ง'],['user','รายคน'],['sys','ฟังก์ชันทั้งระบบ']].map(([k,l])=>{ const on=k===tab;\n" +
  "      return { key:k, label:l, bg:on?'#1C1B18':'#fff', fg:on?'#C9A961':'#2C2A25', bd:on?'#1C1B18':'#E4DED2', onPress:()=>this.setState({ ccTab:k }) }; });\n" +
  "    out.ccIsRole=tab==='role'; out.ccIsUser=tab==='user'; out.ccIsSys=tab==='sys';\n" +
  "    const SW=(on,a,b)=>({ swBg:on?'#1C1B18':'#EFEAE0', knobX:on?'18px':'2px', stLabel:on?(a||'เปิด'):(b||'ปิด'), stFg:on?'#4E7C59':'#A29B8C', rowBg:on?'#fff':'#FBF9F4' });\n" +
  "    const SKIP=['overview','takeoff','eng'];\n" +
  "    const defs=(this._lastTabDefs||[]).filter(d=>SKIP.indexOf(d[0])<0); const NM=this._lastNavMap||{};\n" +
  "    const CAT=[ { key:'dhome', label:'Design Home', g:'หน้าในโครงการ' }, ...defs.map(d=>({ key:'tab:'+d[0], label:d[1], g:'หน้าในโครงการ' })),\n" +
  "      ...Object.keys(NM).filter(k=>['work','inbox','ai'].indexOf(k)<0&&NM[k]&&NM[k].label).map(k=>({ key:'nav:'+k, label:NM[k].label, g:'เมนูหลัก' })) ];\n" +
  "    // การ์ด: เปิด (เรียงตามลำดับ ▲▼) / ซ่อน — save(arr) บันทึกทั้งรายการ (คีย์ที่ไม่อยู่ในรายการให้เลือกคงไว้)\n" +
  "    const mk=(list, save)=>{ const vis=CAT.filter(c=>list.indexOf(c.key)>=0).sort((a,b)=>list.indexOf(a.key)-list.indexOf(b.key)).map(c=>c.key);\n" +
  "      const mv=(i,j)=>{ if(j<0||j>=vis.length) return; const v=vis.slice(); const x=v[i]; v[i]=v[j]; v[j]=x; const a=list.slice(); const pos=vis.map(k=>a.indexOf(k)); pos.forEach((p,n)=>{ a[p]=v[n]; }); save(a); };\n" +
  "      const on=vis.map((k,i)=>{ const c=CAT.find(x=>x.key===k); return { key:k, label:c.label, note:c.g, no:(i+1)+'.', ...SW(true,'แสดง','ซ่อน'), upShow:true,\n" +
  "        upCol:i>0?'#8A7657':'#DDD6C7', dnCol:i<vis.length-1?'#8A7657':'#DDD6C7', onUp:()=>mv(i,i-1), onDn:()=>mv(i,i+1), onToggle:()=>save(list.filter(x=>x!==k)) }; });\n" +
  "      const off=CAT.filter(c=>list.indexOf(c.key)<0).map(c=>({ key:c.key, label:c.label, note:c.g, no:'', ...SW(false,'แสดง','ซ่อน'), upShow:false, upCol:'#DDD6C7', dnCol:'#DDD6C7', onUp:()=>{}, onDn:()=>{},\n" +
  "        onToggle:()=>save([...list.filter(x=>x!==c.key), c.key]) }));\n" +
  "      return { on, off, onN:String(on.length), offN:String(off.length), onNone:!on.length, offNone:!off.length }; };\n" +
  "    const FL=this.SUPPORT_FEATS().filter(f=>f.key!=='level');\n" +
  "    if(tab==='role'){ const roles=Object.keys(RD).filter(k=>k!=='superadmin'); const rk=roles.indexOf(S.ccRole)>=0?S.ccRole:'sitemgr'; const W=S.workPages||{};\n" +
  "      out.ccRoles=roles.map(k=>{ const on=k===rk; const cust=Array.isArray(W[k])||!!Object.keys((S.featRole||{})[k]||{}).length;\n" +
  "        return { key:k, label:RD[k].label.split(' · ')[0]+(cust?' ✎':''), bg:on?'#1C1B18':'#fff', fg:on?'#fff':'#2C2A25', bd:on?'#1C1B18':'#E4DED2', onPress:()=>this.setState({ ccRole:k }) }; });\n" +
  "      out.ccRoleName=RD[rk].label; const rl=this.WORK_LIST(rk); const cust=Array.isArray(W[rk]);\n" +
  "      out.ccRoleState=cust?(rl.length?'ปรับเองแล้ว (ไม่ใช่ชุดเริ่มต้น)':'ปิดหน้าแรกของตำแหน่งนี้ — ล็อกอินแล้วลง Home'):'ใช้ชุดเริ่มต้นที่ออกแบบไว้';\n" +
  "      const nOwn=(S.accounts||[]).filter(a=>a&&a.email&&a.roleKey===rk&&this.WORK_USER(String(a.email).trim().toLowerCase())).length;\n" +
  "      out.ccRoleOwn=nOwn>0; out.ccRoleOwnTxt='มี '+nOwn+' คนในตำแหน่งนี้ที่ตั้งการ์ดรายคนไว้ — คนกลุ่มนี้ไม่เปลี่ยนตามตำแหน่ง (แก้ที่แท็บ รายคน)';\n" +
  "      const c=mk(rl, (a)=>this._workSave(rk,a)); out.ccRCOn=c.on; out.ccRCOff=c.off; out.ccRCOnN=c.onN; out.ccRCOffN=c.offN; out.ccRCOnNone=c.onNone; out.ccRCOffNone=c.offNone;\n" +
  "      out.ccRoleCust=cust; out.onCcRoleReset=()=>{ this._workSave(rk,undefined); this.showToast('คืนชุดการ์ดเริ่มต้นของ '+RD[rk].label.split(' · ')[0]+' แล้ว'); };\n" +
  "      const RF=(S.featRole||{})[rk]||{};\n" +
  "      out.ccRF=FL.map(f=>{ const on=this._featRoleOn(f.key,rk); const set=typeof RF[f.key]==='boolean'; const g=this._featGOff(f.key);\n" +
  "        return { key:f.key, label:f.label, note:(g?'⚠ ปิดทั้งระบบอยู่ · ':'')+(set?'ตั้งสำหรับตำแหน่งนี้แล้ว':'ค่าเริ่มต้น')+' · '+f.note, noteFg:g?'#B4532A':'#8A8375', ...SW(on),\n" +
  "          onToggle:()=>this._stKeySet('featRole', rk, { ...RF, [f.key]:!on }) }; });\n" +
  "      out.ccRFCust=Object.keys(RF).length>0; out.onCcRFReset=()=>{ this._stKeySet('featRole', rk, ''); this.showToast('คืนค่าฟังก์ชันเริ่มต้นของตำแหน่งนี้แล้ว'); }; }\n" +
  "    if(tab==='user'){ const nmA=(a)=>String(a.nick||'').trim()||String(a.name||'').trim()||String(a.email||'');\n" +
  "      const AC=(S.accounts||[]).filter(a=>a&&a.email&&a.roleKey!=='superadmin'); const uq=String(S.ccUserQ||'').trim().toLowerCase(); const ue=String(S.ccUser||'');\n" +
  "      const ua=AC.find(a=>String(a.email).trim().toLowerCase()===ue)||null;\n" +
  "      out.ccUserQ=S.ccUserQ||''; out.onCcUserQ=(e)=>this.setState({ ccUserQ:e.target.value });\n" +
  "      const L=AC.filter(a=>!uq||(String(a.nick||'')+' '+String(a.name||'')+' '+String(a.email||'')+' '+((RD[a.roleKey]||{}).label||'')).toLowerCase().indexOf(uq)>=0)\n" +
  "        .sort((a,b)=>nmA(a).localeCompare(nmA(b),'th'));\n" +
  "      out.ccUsers=L.slice(0,30).map(a=>{ const e=String(a.email).trim().toLowerCase(); const on=e===ue; const own=!!this.WORK_USER(e)||!!Object.keys(a.featOff||{}).length||a.aiOff!==undefined;\n" +
  "        return { key:e, label:nmA(a)+' · '+(((RD[a.roleKey]||{}).label||a.roleKey||'—').split(' · ')[0])+(own?' ✎':''), bg:on?'#1C1B18':'#fff', fg:on?'#fff':'#2C2A25', bd:on?'#1C1B18':'#E4DED2',\n" +
  "          onPress:()=>this.setState({ ccUser:on?'':e }) }; });\n" +
  "      out.ccUsersMore=L.length>30; out.ccUsersMoreTxt='แสดง 30 จาก '+L.length+' คน — พิมพ์ค้นหาเพื่อหาคนอื่น'; out.ccUsersNone=!L.length;\n" +
  "      out.ccUserSel=!!ua; out.ccUserNoSel=!ua;\n" +
  "      if(ua){ const e=String(ua.email).trim().toLowerCase(); const rk=String(ua.roleKey||''); const own=this.WORK_USER(e); const list=own?own.slice():this._wkUserDefault(rk,e);\n" +
  "        out.ccUserName=nmA(ua); out.ccUserRole=(RD[rk]||{}).label||rk||'—';\n" +
  "        out.ccUserState=own?'ตั้งการ์ดรายคนแล้ว — ไม่เปลี่ยนตามตำแหน่ง':'ใช้การ์ดตามตำแหน่ง — แก้ครั้งแรกแล้วจะเป็นชุดของคนนี้คนเดียว';\n" +
  "        const c=mk(list, (a)=>this._wkUserSave(e,a)); out.ccUCOn=c.on; out.ccUCOff=c.off; out.ccUCOnN=c.onN; out.ccUCOffN=c.offN; out.ccUCOnNone=c.onNone; out.ccUCOffNone=c.offNone;\n" +
  "        out.ccUserOwn=!!own; out.onCcUserReset=()=>{ this._wkUserSave(e,undefined); this.showToast('คืนการ์ดตามตำแหน่งแล้ว · '+nmA(ua)); };\n" +
  "        out.ccUF=this.featRows(ua).filter(r=>r.key!=='level').map(r=>({ ...r, ...SW(r.on), note:(this._featGOff(r.key)?'⚠ ปิดทั้งระบบอยู่ · ':'')+r.note, noteFg:this._featGOff(r.key)?'#B4532A':'#8A8375' }));\n" +
  "        out.ccUFCust=!!Object.keys(ua.featOff||{}).length||ua.aiOff!==undefined; out.onCcUFReset=()=>this._featUserReset(ua.email); } }\n" +
  "    if(tab==='sys'){ const G=S.featGlobal||{};\n" +
  "      const row=(key,label,note)=>{ const on=G[key]!==false; return { key, label, note, noteFg:on?'#8A8375':'#B4532A', ...SW(on),\n" +
  "        onToggle:()=>{ this._stKeySet('featGlobal', key, on?false:''); this.showToast((on?'ปิด ':'เปิด ')+label+' ทั้งระบบแล้ว'); } }; };\n" +
  "      out.ccSF=FL.map(f=>row(f.key, f.label, (G[f.key]===false?'ปิดกับทุกคน · ':'')+f.note));\n" +
  "      out.ccST=(this._lastTabAll||[]).filter(d=>SKIP.indexOf(d[0])<0).map(d=>row('tab:'+d[0], d[1], G['tab:'+d[0]]===false?'ปิดกับทุกคน — เมนูและการ์ดหายจากทุกโครงการ':'เมนูในหน้าโครงการ + การ์ดหน้าแรก'));\n" +
  "      const nOff=Object.keys(G).filter(k=>G[k]===false).length; out.ccSysOffTxt=nOff?('ปิดอยู่ '+nOff+' รายการ'):'เปิดครบทุกฟังก์ชัน'; }\n" +
  "    return out; }\n";

// ---------------------------------------------------------------------
// ค) หน้าจอ
// ---------------------------------------------------------------------
const swEl = (o) =>
  "<span style=\"position:relative;width:34px;height:18px;border-radius:10px;background:{{ " + o + ".swBg }};display:block;flex:none\">" +
  "<span style=\"position:absolute;top:2px;left:{{ " + o + ".knobX }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .16s ease\"></span></span>" +
  "<span style=\"font-size:10px;font-weight:700;color:{{ " + o + ".stFg }};min-width:26px;flex:none\">{{ " + o + ".stLabel }}</span>";
const cardList = (v) =>
  "              <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
  "                <sc-for list=\"{{ " + v + " }}\" as=\"c\" hint-placeholder-count=\"4\">\n" +
  "                  <div style=\"display:flex;align-items:center;gap:6px;border:1px solid #EDE6D7;background:{{ c.rowBg }};border-radius:10px;padding:6px 9px\">\n" +
  "                    <sc-if value=\"{{ c.upShow }}\" hint-placeholder-val=\"{{ false }}\"><span style=\"display:flex;flex-direction:column;flex:none\">" +
  "<button sc-camel-on-click=\"{{ c.onUp }}\" title=\"เลื่อนขึ้น\" style=\"border:none;background:none;color:{{ c.upCol }};font-size:11px;line-height:1;padding:3px 5px;cursor:pointer;font-family:inherit\">▲</button>" +
  "<button sc-camel-on-click=\"{{ c.onDn }}\" title=\"เลื่อนลง\" style=\"border:none;background:none;color:{{ c.dnCol }};font-size:11px;line-height:1;padding:3px 5px;cursor:pointer;font-family:inherit\">▼</button></span></sc-if>\n" +
  "                    <button sc-camel-on-click=\"{{ c.onToggle }}\" style=\"flex:1;min-width:0;display:flex;align-items:center;gap:9px;border:none;background:none;padding:2px 0;cursor:pointer;font-family:inherit;text-align:left\">\n" +
  "                      <span style=\"flex:1;min-width:0\"><span style=\"display:block;font-size:12px;font-weight:700;color:#1C1B18\">{{ c.no }} {{ c.label }}</span><span style=\"display:block;font-size:9.5px;color:#8A8375;margin-top:2px\">{{ c.note }}</span></span>\n" +
  "                      " + swEl('c') + "\n" +
  "                    </button>\n" +
  "                  </div>\n" +
  "                </sc-for>\n" +
  "              </div>\n";
const featList = (v) =>
  "              <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
  "                <sc-for list=\"{{ " + v + " }}\" as=\"f\" hint-placeholder-count=\"4\">\n" +
  "                  <button sc-camel-on-click=\"{{ f.onToggle }}\" style=\"display:flex;align-items:center;gap:9px;border:1px solid #EDE6D7;background:{{ f.rowBg }};border-radius:10px;padding:8px 10px;cursor:pointer;font-family:inherit;text-align:left;width:100%\">\n" +
  "                    <span style=\"flex:1;min-width:0\"><span style=\"display:block;font-size:12px;font-weight:700;color:#1C1B18\">{{ f.label }}</span><span style=\"display:block;font-size:9.5px;color:{{ f.noteFg }};margin-top:2px\">{{ f.note }}</span></span>\n" +
  "                    " + swEl('f') + "\n" +
  "                  </button>\n" +
  "                </sc-for>\n" +
  "              </div>\n";
const H = (txt) => "              <div style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.04em;margin:14px 0 7px\">" + txt + "</div>\n";
const btn = (on, txt, ifv) =>
  (ifv ? "<sc-if value=\"{{ " + ifv + " }}\" hint-placeholder-val=\"{{ false }}\">" : "") +
  "<button sc-camel-on-click=\"{{ " + on + " }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#8A7657;font-size:11px;font-weight:700;padding:6px 11px;border-radius:9px;cursor:pointer;font-family:inherit\">" + txt + "</button>" +
  (ifv ? "</sc-if>" : "");
const none = (v, txt) => "              <sc-if value=\"{{ " + v + " }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:4px 2px\">" + txt + "</div></sc-if>\n";
const chips = (v) =>
  "              <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
  "                <sc-for list=\"{{ " + v + " }}\" as=\"r\" hint-placeholder-count=\"6\"><button sc-camel-on-click=\"{{ r.onPress }}\" style=\"border:1px solid {{ r.bd }};background:{{ r.bg }};color:{{ r.fg }};border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ r.label }}</button></sc-for>\n" +
  "              </div>\n";

const VIEW =
  "        <!-- " + MARK + ": การ์ดหน้าแรก & ฟังก์ชัน -->\n" +
  "        <sc-if value=\"{{ ccShow }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "          <div style=\"background:#fff;border:1px solid #EDE7DA;border-radius:18px;padding:17px 16px;margin-bottom:20px\">\n" +
  "            <div style=\"display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px\">\n" +
  "              <span class=\"kicker\" style=\"font-size:9.5px;color:#9A8767\">การ์ดหน้าแรก &amp; ฟังก์ชัน · เปิด-ปิดให้ผู้ใช้</span>\n" +
  "              <span style=\"font-size:10px;color:#8A6D3B;background:#F5EAD6;padding:3px 9px;border-radius:7px;font-weight:700\">Admin</span>\n" +
  "            </div>\n" +
  "            <div style=\"font-size:12px;color:#8C877D;line-height:1.65;margin-bottom:12px\">ลำดับการใช้ค่า: <b>ปิดทั้งระบบ</b> → <b>รายคน</b> → <b>ตามตำแหน่ง</b> → ชุดเริ่มต้น · กดสวิตช์แล้วบันทึกทันที · การ์ดจะแสดงเฉพาะหน้าที่ผู้ใช้มีสิทธิ์เปิด</div>\n" +
  "            <div style=\"display:flex;gap:6px;flex-wrap:wrap\">\n" +
  "              <sc-for list=\"{{ ccTabs }}\" as=\"t\" hint-placeholder-count=\"3\"><button sc-camel-on-click=\"{{ t.onPress }}\" style=\"border:1px solid {{ t.bd }};background:{{ t.bg }};color:{{ t.fg }};border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ t.label }}</button></sc-for>\n" +
  "            </div>\n" +
  // ---- ตามตำแหน่ง
  "            <sc-if value=\"{{ ccIsRole }}\" hint-placeholder-val=\"{{ true }}\">\n" +
  H('1 · เลือกตำแหน่ง (✎ = ปรับจากชุดเริ่มต้นแล้ว)') +
  chips('ccRoles') +
  "              <div style=\"background:#FBF8F1;border:1px solid #EFE4CB;border-radius:12px;padding:10px 12px;margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center\">\n" +
  "                <span style=\"flex:1 1 220px;min-width:0;font-size:12px;color:#2C2A25;line-height:1.6\"><b>{{ ccRoleName }}</b><br><span style=\"color:#8C877D\">{{ ccRoleState }} · มีผลกับทุกคนในตำแหน่ง (ยกเว้นคนที่ตั้งรายคน)</span></span>\n" +
  "                " + btn('onCcRoleReset', 'คืนชุดการ์ดเริ่มต้น', 'ccRoleCust') + "\n" +
  "              </div>\n" +
  "              <sc-if value=\"{{ ccRoleOwn }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11px;color:#8A6D3B;margin-top:6px\">{{ ccRoleOwnTxt }}</div></sc-if>\n" +
  H('2 · การ์ดที่แสดง ({{ ccRCOnN }}) — ▲▼ จัดลำดับ · กดเพื่อซ่อน') + cardList('ccRCOn') + none('ccRCOnNone', 'ไม่มีการ์ด — ตำแหน่งนี้ล็อกอินแล้วลงหน้า Home') +
  H('การ์ดที่ซ่อน ({{ ccRCOffN }}) — กดเพื่อแสดง') + cardList('ccRCOff') + none('ccRCOffNone', 'แสดงครบทุกการ์ดแล้ว') +
  H('3 · ฟังก์ชันของตำแหน่งนี้') + featList('ccRF') +
  "              <div style=\"margin-top:8px\">" + btn('onCcRFReset', 'คืนค่าฟังก์ชันเริ่มต้น', 'ccRFCust') + "</div>\n" +
  "            </sc-if>\n" +
  // ---- รายคน
  "            <sc-if value=\"{{ ccIsUser }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  H('1 · เลือกผู้ใช้ (✎ = มีการตั้งค่ารายคน)') +
  "              <input value=\"{{ ccUserQ }}\" sc-camel-on-change=\"{{ onCcUserQ }}\" placeholder=\"ค้นหาชื่อ / ชื่อเล่น / อีเมล / ตำแหน่ง…\" style=\"width:100%;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:10px;padding:8px 11px;font-size:12.5px;font-family:inherit;outline:none;margin-bottom:8px\">\n" +
  chips('ccUsers') +
  "              <sc-if value=\"{{ ccUsersMore }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11px;color:#8C877D;margin-top:6px\">{{ ccUsersMoreTxt }}</div></sc-if>\n" +
  none('ccUsersNone', 'ไม่พบผู้ใช้') +
  none('ccUserNoSel', 'เลือกผู้ใช้ด้านบน เพื่อเปิด-ปิดการ์ดและฟังก์ชันของคนนั้น') +
  "              <sc-if value=\"{{ ccUserSel }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "              <div style=\"background:#FBF8F1;border:1px solid #EFE4CB;border-radius:12px;padding:10px 12px;margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center\">\n" +
  "                <span style=\"flex:1 1 220px;min-width:0;font-size:12px;color:#2C2A25;line-height:1.6\"><b>{{ ccUserName }}</b> · {{ ccUserRole }}<br><span style=\"color:#8C877D\">{{ ccUserState }}</span></span>\n" +
  "                " + btn('onCcUserReset', 'คืนการ์ดตามตำแหน่ง', 'ccUserOwn') + "\n" +
  "              </div>\n" +
  H('2 · การ์ดที่แสดง ({{ ccUCOnN }}) — ▲▼ จัดลำดับ · กดเพื่อซ่อน') + cardList('ccUCOn') + none('ccUCOnNone', 'ไม่มีการ์ด — คนนี้ล็อกอินแล้วลงหน้า Home') +
  H('การ์ดที่ซ่อน ({{ ccUCOffN }}) — กดเพื่อแสดง') + cardList('ccUCOff') + none('ccUCOffNone', 'แสดงครบทุกการ์ดแล้ว') +
  H('3 · ฟังก์ชันของคนนี้') + featList('ccUF') +
  "              <div style=\"margin-top:8px\">" + btn('onCcUFReset', 'คืนค่าฟังก์ชันตามตำแหน่ง', 'ccUFCust') + "</div>\n" +
  "              </sc-if>\n" +
  "            </sc-if>\n" +
  // ---- ทั้งระบบ
  "            <sc-if value=\"{{ ccIsSys }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "              <div style=\"background:#FDF3EC;border:1px solid #F0D2BE;border-radius:12px;padding:10px 12px;margin-top:12px;font-size:12px;color:#8A4B2A;line-height:1.6\">⚠ ปิดที่นี่ = ปิดกับ<b>ทุกคน</b> (รวม Super Admin) จนกว่าจะเปิดกลับ · ข้อมูลเดิมไม่หาย · {{ ccSysOffTxt }}</div>\n" +
  H('ระบบสนับสนุน') + featList('ccSF') +
  H('หน้าในโครงการ (เมนู + การ์ด)') + featList('ccST') +
  "            </sc-if>\n" +
  "          </div>\n" +
  "        </sc-if>\n";

// ---------------------------------------------------------------------
// ง) แก้จุดเล็ก [ชื่อ, เดิม, ใหม่, จำนวนที่ต้องเจอ]
// ---------------------------------------------------------------------
const R = [
  ['ซิงก์: SB_STATE_KEYS + PERSIST_KEYS', "'userPins','workUser','handover'", "'userPins','workUser','featGlobal','featRole','handover'", 2],
  ['ซิงก์: ข้ามตอน push ทั้งก้อน', "k==='userPins'||k==='workUser'||", "k==='userPins'||k==='workUser'||k==='featGlobal'||k==='featRole'||"],
  ['สลับฟังก์ชันรายคน: ใช้ค่าระดับผู้ใช้', "const wasOff=!this.featOn(key, cur);", "const wasOff=!this._featUserOn(key, cur);   // " + MARK],
  ['สวิตช์รายคน: ล็อกเมื่อปิดทั้งระบบ',
   "      const locked=(f.key==='ai'&&a.roleKey==='superadmin')||(f.key==='level'&&!this._engViewOk(a));",
   "      const locked=(f.key==='ai'&&a.roleKey==='superadmin')||(f.key==='level'&&!this._engViewOk(a))||this._featGOff(f.key);   // " + MARK],
  ['สวิตช์รายคน: ข้อความเมื่อถูกล็อก',
   "        onToggle:()=>{ if(locked){ this.showToast('Super Admin ใช้ผู้ช่วย AI ได้เสมอ'); return; }",
   "        onToggle:()=>{ if(locked){ this.showToast(this._featGOff(f.key)?'ฟังก์ชันนี้ถูกปิดทั้งระบบ — เปิดได้ที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน':'Super Admin ใช้ผู้ช่วย AI ได้เสมอ'); return; }"],
  ['หน้าในโครงการ: ปิดทั้งระบบ (1)', "const _tabBase=[['overview','Project Management']", "let _tabBase=[['overview','Project Management']"],
  ['หน้าในโครงการ: ปิดทั้งระบบ (2)',
   "    // ลำดับเมนูหน้าในโครงการ — Super Admin สลับได้ บันทึกกลาง ใช้กับทุกคน",
   "    this._lastTabAll=_tabBase.slice(); _tabBase=_tabBase.filter(d=>d[0]==='overview'||!this._featGOff('tab:'+d[0]));   // " + MARK + ": ปิดหน้าในโครงการทั้งระบบ\n" +
   "    // ลำดับเมนูหน้าในโครงการ — Super Admin สลับได้ บันทึกกลาง ใช้กับทุกคน"],
  ['ค่าแสดงผล CC_VALS', "  WORK_VALS(S){", CC_VALS + "  WORK_VALS(S){"],
  ['ต่อค่าเข้า render', "      ...this.TPL_VALS(S),\n", "      ...this.TPL_VALS(S),\n      ...this.CC_VALS(S),\n"],
  ['หน้าจอ: ตั้งค่าระบบ',
   "      <sc-if value=\"{{ isSystem }}\" hint-placeholder-val=\"{{ false }}\">\n",
   "      <sc-if value=\"{{ isSystem }}\" hint-placeholder-val=\"{{ false }}\">\n" + VIEW],
];

// ตรวจครบทุกจุดก่อน แล้วค่อยแก้ (ไม่แก้ครึ่ง ๆ)
for (const [name, s, e] of B) {
  const c = t.split(s).length - 1;
  const i = t.indexOf(s), j = i < 0 ? -1 : t.indexOf(e, i);
  if (c !== 1 || j < 0) { console.error('✗ ' + name + ': หาจุดเริ่ม/จบไม่ครบ (' + c + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [name, a, , n = 1] of R) {
  const c = t.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, s, e, nw] of B) { const i = t.indexOf(s), j = t.indexOf(e, i); t = t.slice(0, i) + nw + t.slice(j); }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ การ์ดหน้าแรก & ฟังก์ชัน (ตั้งค่าระบบ): แก้ ' + (B.length + R.length) + ' จุด');
