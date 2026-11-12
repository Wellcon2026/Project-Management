#!/usr/bin/env node
/* =====================================================================
   v1.375.0 work-user — การ์ดหน้าแรก (หน้างานของฉัน / หน้าทำงานของฉัน) รายคน
     node scripts/patch-work-user.js
   1) ผู้ใช้ทุกคน (ไม่ใช่ Super Admin) กด "✎ จัดการ์ดของฉัน" → ลาก / ◀ ▶ จัดลำดับ · ✕ ซ่อน · + เพิ่มการ์ดหน้าอื่นที่ตัวเองเปิดได้
      · แก้ครั้งแรกแล้วกลายเป็นชุดของตัวเอง (ไม่เปลี่ยนตามตำแหน่งอีก) · "คืนค่าตามตำแหน่ง" = กลับไปใช้ชุดของตำแหน่ง
   2) Super Admin ในแผง "⚙ จัดปุ่มบนหน้านี้" เลือก "รายคน" → จัดการ์ดให้ผู้ใช้คนนั้นคนเดียว (ไม่กระทบคนอื่นในตำแหน่ง)
   3) ปุ่มเพิ่มรายคนตั้งต้น (ผู้บริหารสั่ง 12/11/2026): supanan@wellcon.co.th + "งานเพิ่ม · VO Tracker (QS)" (tab:aw)
   ข้อมูล: app_state 'workUser' { email: [itemKey] } เขียนผ่าน _stKeySet (อ่าน-รวม-เขียนรายคน — หลายคนแก้พร้อมกันไม่ทับกัน
      และไม่แตะ workPages ของตำแหน่ง) · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง (หลัง patch-work-home / work-arrange / work-all / work-pr)
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
const MARK = 'v1.375.0 work-user';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (การ์ดหน้าแรกรายคน)'); process.exit(0); }

// [ชื่อ, ข้อความเดิม, ข้อความใหม่, จำนวนที่ต้องเจอ (ค่าตั้งต้น 1)]
const R = [
  // ---------- ซิงก์: คีย์ใหม่ 'workUser' (เขียนผ่าน _stKeySet เท่านั้น) ----------
  ['ซิงก์: SB_STATE_KEYS + PERSIST_KEYS', "'userPins','handover'", "'userPins','workUser','handover'", 2],
  ['ซิงก์: ข้ามตอน push ทั้งก้อน', "k==='userPins'||", "k==='userPins'||k==='workUser'||"],

  // ---------- ตัวช่วย ----------
  ['ตัวช่วยรายคน',
   "  WORK_KIND(me){ return this._workKindOf(String((me||{}).roleKey||'')); }",
   "  WORK_KIND(me){ const k=this._workKindOf(String((me||{}).roleKey||'')); if(k) return k; const e=String((me||{}).email||'').trim().toLowerCase(); if(!e) return ''; return (this.WORK_USER(e)||this.WORK_USER_ADD(e)).length?'other':''; }   // " + MARK + "\n" +
   "  // ===== " + MARK + ": การ์ดหน้าแรกรายคน — app_state 'workUser' { email:[itemKey] } ผ่าน _stKeySet · ไม่มีค่า = ใช้ชุดของตำแหน่ง (+ ปุ่มเพิ่มรายคนตั้งต้น) =====\n" +
   "  WORK_USER(e){ const v=(this.state.workUser||{})[String(e||'').trim().toLowerCase()]; return Array.isArray(v)?v:null; }\n" +
   "  WORK_USER_ADD(e){ return ({ 'supanan@wellcon.co.th':['tab:aw'] })[String(e||'').trim().toLowerCase()]||[]; }   // ผู้บริหารสั่ง 12/11/2026: คุณจูน + งานเพิ่ม · VO Tracker\n" +
   "  _wkUserDefault(rk,e){ const b=this.WORK_LIST(rk); return [...b, ...this.WORK_USER_ADD(e).filter(k=>b.indexOf(k)<0)]; }\n" +
   "  _wkUserSave(e,arr){ const k=String(e||'').trim().toLowerCase(); if(!k) return; this._stKeySet('workUser', k, arr===undefined?'':arr); }"],

  // ---------- WORK_VALS: รายการการ์ดของคนนี้ ----------
  ['รายการการ์ด: รายคนก่อนตำแหน่ง',
   "    let list=this.WORK_LIST(rk); const kind=this._workKindOf(rk)||'other';",
   "    // " + MARK + ": Super Admin เลือกรายคน (S.wkUser) · ผู้ใช้ทั่วไป = ตัวเอง\n" +
   "    const _uAcc=isSuper&&S.wkEdit&&S.wkUser?((S.accounts||[]).find(a=>String(a.email||'').trim().toLowerCase()===S.wkUser)||null):null;\n" +
   "    const _uEm=_uAcc?S.wkUser:(!isSuper?String(me.email||'').trim().toLowerCase():'');\n" +
   "    const _uOwn=_uEm?this.WORK_USER(_uEm):null;\n" +
   "    let list=_uOwn?_uOwn.slice():(_uEm?this._wkUserDefault(rk,_uEm):this.WORK_LIST(rk)); const kind=this._workKindOf(rk)||'other';"],
  ['Layboard: ไม่ต่อท้ายกลับเองถ้าผู้ใช้จัดเองแล้ว',
   "if(!isSuper && this.featOn('lay') && list.length",
   "if(!isSuper && !_uOwn && this.featOn('lay') && list.length"],

  // ---------- โหมดแก้: ตำแหน่ง / รายคน (Super Admin) / ของฉัน (ผู้ใช้) ----------
  ['โหมดแก้ + ที่บันทึก',
   "const _ed=isSuper&&!!S.wkEdit; const tiles0=",
   "const _mine=!isSuper&&!!S.wkMine&&!!_uEm; const _ed=(isSuper&&!!S.wkEdit)||_mine; const _tgtU=(_mine||_uAcc)?_uEm:'';   // " + MARK + "\n" +
   "    const _save=(a)=>{ if(_tgtU) this._wkUserSave(_tgtU,a); else this._workSave(rk,a); };\n" +
   "    const _hideK=(k)=>{ if(_tgtU){ this._wkUserSave(_tgtU,list.filter(x=>x!==k)); this.showToast('ซ่อนการ์ดแล้ว — เพิ่มกลับได้ที่แผงด้านล่าง'); } else this._wkHide(rk,list,k); };\n" +
   "    const _addK=(k)=>{ if(_tgtU) this._wkUserSave(_tgtU,[...list.filter(x=>x!==k),k]); else this._wkAdd(rk,list,k); };\n" +
   "    const tiles0="],
  ['◀ ▶ บันทึกตามโหมด', "a[i]=_vis[vj]; a[j]=k; this._workSave(rk,a); };", "a[i]=_vis[vj]; a[j]=k; _save(a); };"],
  ['ลากวาง บันทึกตามโหมด', "a.splice(j<0?a.length:(fi<ti?j+1:j),0,f); this._workSave(rk,a);", "a.splice(j<0?a.length:(fi<ti?j+1:j),0,f); _save(a);"],
  ['✕ บนการ์ด', "onHide:(e)=>{ _stop(e); this._wkHide(rk,list,t.key); }", "onHide:(e)=>{ _stop(e); _hideK(t.key); }"],
  ['แผง: ↑ ↓', "const t=a[i]; a[i]=a[j]; a[j]=t; this._workSave(rk,a); };", "const t=a[i]; a[i]=a[j]; a[j]=t; _save(a); };"],
  ['แผง: ✕', "onDel:()=>this._wkHide(rk,list,k) }; });", "onDel:()=>_hideK(k) }; });"],
  ['แผง: + เพิ่ม', "const add=(k)=>this._wkAdd(rk,list,k);", "const add=(k)=>_addK(k);"],
  ['แผง: คืนค่า',
   "out.onWkReset=()=>{ this._workSave(rk,undefined);",
   "out.onWkReset=()=>{ if(_tgtU){ this._wkUserSave(_tgtU,undefined); this.showToast('คืนค่าการ์ดตามตำแหน่งแล้ว (เฉพาะคนนี้)'); return; } this._workSave(rk,undefined);"],
  ['แผง: ปิดหน้า',
   "out.onWkOff=()=>{ this._workSave(rk,[]);",
   "out.wkOffLabel=_tgtU?'ซ่อนการ์ดทั้งหมดของคนนี้':'ปิดหน้านี้สำหรับตำแหน่งนี้'; out.onWkOff=()=>{ if(_tgtU){ this._wkUserSave(_tgtU,[]); this.showToast('ซ่อนการ์ดทั้งหมดของคนนี้แล้ว'); return; } this._workSave(rk,[]);"],
  ['เปิด/ปิดแผง: ล้างรายคน',
   "this.setState({ wkEdit:on, wkRole:on?rk:null });",
   "this.setState({ wkEdit:on, wkRole:on?rk:null, wkUser:null, wkUserQ:'' });"],
  ['เลือกตำแหน่ง: ล้างรายคน',
   "onPress:()=>this.setState({ wkRole:k }) }; });",
   "onPress:()=>this.setState({ wkRole:k, wkUser:null }) }; });"],
  ['แผง Super Admin: เลือกรายคน',
   "(this.WORK_DEF(rk).length?'ใช้ค่าเริ่มต้น':'ยังไม่มีหน้า — ล็อกอินแล้วลง Home');",
   "(this.WORK_DEF(rk).length?'ใช้ค่าเริ่มต้น':'ยังไม่มีหน้า — ล็อกอินแล้วลง Home');\n" +
   "      { // " + MARK + ": เลือกผู้ใช้รายคน (ค่าตั้งต้นแสดงคนในตำแหน่งที่เลือก · พิมพ์ค้นหาได้ทุกคน)\n" +
   "        const nmA=(a)=>String(a.nick||'').trim()||String(a.name||'').trim()||String(a.email||'');\n" +
   "        const AC=(S.accounts||[]).filter(a=>a&&a.email&&a.roleKey!=='superadmin'); const uq=String(S.wkUserQ||'').trim().toLowerCase();\n" +
   "        out.wkUsers=AC.filter(a=>uq?(String(a.nick||'')+' '+String(a.name||'')+' '+String(a.email||'')).toLowerCase().indexOf(uq)>=0:(String(a.roleKey||'')===rk||String(a.email).trim().toLowerCase()===S.wkUser))\n" +
   "          .sort((a,b)=>nmA(a).localeCompare(nmA(b),'th')).slice(0,40)\n" +
   "          .map(a=>{ const e=String(a.email).trim().toLowerCase(); const on=e===S.wkUser; const own=!!this.WORK_USER(e)||this.WORK_USER_ADD(e).length>0;\n" +
   "            return { key:e, label:nmA(a)+(own?' ✎':''), bg:on?'#1C1B18':'#fff', color:on?'#fff':'#2C2A25', bd:on?'#1C1B18':'#E4DED2',\n" +
   "              onPress:()=>this.setState(on?{ wkUser:null }:{ wkUser:e, wkRole:RD[a.roleKey]?a.roleKey:this.state.wkRole }) }; });\n" +
   "        out.wkUsersHas=out.wkUsers.length>0; out.wkUsersNone=!out.wkUsersHas; out.wkUserQ=S.wkUserQ||''; out.onWkUserQ=(e)=>this.setState({ wkUserQ:e.target.value });\n" +
   "        out.wkUserSel=!!_uAcc; out.onWkUserClear=()=>this.setState({ wkUser:null });\n" +
   "        out.wkScopeLong=_uAcc?'มีผลกับคนนี้คนเดียว — คนอื่นในตำแหน่งไม่เปลี่ยน':'มีผลกับทุกคนในตำแหน่งนี้ (ยกเว้นคนที่จัดการ์ดเองแล้ว)';\n" +
   "        out.wkScopeTxt=_uAcc?'มีผลกับ':'มีผลกับทุกคนในตำแหน่ง';\n" +
   "        if(_uAcc){ out.wkRoleName=nmA(_uAcc)+' · '+(RD[rk]?RD[rk].label.split(' · ')[0]:rk); out.wkUserSelName=nmA(_uAcc);\n" +
   "          out.wkRoleState=_uOwn?'จัดการ์ดรายคนแล้ว':('ยังใช้การ์ดตามตำแหน่ง'+(this.WORK_USER_ADD(_uEm).length?' + การ์ดเพิ่มรายคน':'')); } }"],
  ['ผู้ใช้: จัดการ์ดของฉัน',
   "out.wkArrLabel=ed?'✓ เสร็จ':'↕ จัดเรียงการ์ด';",
   "out.wkMineCan=!isSuper&&!!_uEm; out.wkMineOn=_mine; out.wkMineLabel=_mine?'✓ เสร็จ':'✎ จัดการ์ดของฉัน';   // " + MARK + "\n" +
   "    out.wkMineBg=_mine?'#C9A961':'#fff'; out.wkMineFg=_mine?'#1C1B18':'#6E5424'; out.onWkMine=()=>this.setState({ wkMine:!this.state.wkMine });\n" +
   "    out.wkMineState=_uOwn?'ชุดการ์ดของคุณเอง — ไม่เปลี่ยนตามตำแหน่ง จนกว่าจะกด \"คืนค่าตามตำแหน่ง\"':'ตอนนี้ใช้การ์ดตามตำแหน่ง — แก้ครั้งแรกแล้วจะเป็นชุดของคุณเอง (มีผลกับคุณคนเดียว)';\n" +
   "    if(_mine){ const cat=[ 'dhome', ...defs.map(d=>'tab:'+d[0]), ...Object.keys(NM).filter(k=>['dashboard','work'].indexOf(k)<0).map(k=>'nav:'+k) ];\n" +
   "      const av=cat.filter((k,i)=>cat.indexOf(k)===i&&list.indexOf(k)<0).map(info).filter(Boolean);\n" +
   "      out.wkMineAvailProj=av.filter(f=>f.grp==='โครงการ').map(f=>({ key:f.key, label:'+ '+f.label, onPress:()=>_addK(f.key) }));\n" +
   "      out.wkMineAvailNav=av.filter(f=>f.grp==='เมนู').map(f=>({ key:f.key, label:'+ '+f.label, onPress:()=>_addK(f.key) }));\n" +
   "      out.wkMineAvailNone=!av.length; out.wkMineOwn=!!_uOwn;\n" +
   "      out.onWkMineReset=()=>{ this._wkUserSave(_uEm,undefined); this.showToast('คืนค่าการ์ดตามตำแหน่งแล้ว'); }; }\n" +
   "    out.wkArrLabel=ed?'✓ เสร็จ':'↕ จัดเรียงการ์ด';"],

  // ---------- หน้าจอ ----------
  ['ปุ่ม ✎ จัดการ์ดของฉัน (หัวการ์ด)',
   "{{ wkArrLabel }}</button></sc-if>",
   "{{ wkArrLabel }}</button></sc-if>\n" +
   "            <sc-if value=\"{{ wkMineCan }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onWkMine }}\" style=\"margin-left:auto;align-self:center;border:1px solid #C9A961;background:{{ wkMineBg }};color:{{ wkMineFg }};border-radius:10px;padding:7px 13px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ wkMineLabel }}</button></sc-if>"],
  ['คำอธิบายโหมดจัดเรียง: รายคน',
   "· มีผลกับทุกคนในตำแหน่ง <b>{{ wkRoleName }}</b> ·",
   "· {{ wkScopeTxt }} <b>{{ wkRoleName }}</b> ·"],
  ['คำอธิบายโหมดของฉัน',
   "เลือกตำแหน่งอื่น ได้ที่แผงด้านล่าง</div></sc-if>",
   "เลือกตำแหน่งอื่น ได้ที่แผงด้านล่าง</div></sc-if>\n" +
   "          <sc-if value=\"{{ wkMineOn }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"background:#FBF3E2;border:1px solid #E2CB92;border-radius:12px;padding:9px 13px;margin-bottom:12px;font-size:12.5px;color:#6E5424;line-height:1.6\">↕ <b>ลากการ์ดไปวาง</b> หรือกด <b>◀ ▶</b> เพื่อจัดเรียง · <b>✕</b> ซ่อนการ์ด · เพิ่มการ์ดได้ที่แผงด้านล่าง · บันทึกทันที · มีผลกับคุณคนเดียว</div></sc-if>"],
  ['แผง: ข้อความขอบเขต',
   "{{ wkRoleState }} · มีผลกับทุกคนในตำแหน่งนี้ ·",
   "{{ wkRoleState }} · {{ wkScopeLong }} ·"],
  ['แผง: ปุ่มปิดหน้า', "ปิดหน้านี้สำหรับตำแหน่งนี้</button>", "{{ wkOffLabel }}</button>"],
  ['แผง: เลือกรายคน',
   "            <div style=\"display:flex;flex-direction:column;gap:6px\">\n              <span style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.06em\">2 · ปุ่มบนหน้า (เรียงตามลำดับ)</span>",
   "            <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
   "              <span style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.06em\">หรือ · จัดให้รายคน (ไม่กระทบคนอื่นในตำแหน่ง)</span>\n" +
   "              <div style=\"display:flex;flex-wrap:wrap;gap:6px;align-items:center\">\n" +
   "                <input value=\"{{ wkUserQ }}\" sc-camel-on-change=\"{{ onWkUserQ }}\" placeholder=\"ค้นหาชื่อ / ชื่อเล่น / อีเมล…\" style=\"flex:1 1 200px;min-width:0;border:1px solid #E4DED2;background:#fff;border-radius:10px;padding:7px 11px;font-size:12.5px;font-family:inherit;outline:none\">\n" +
   "                <sc-if value=\"{{ wkUserSel }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onWkUserClear }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#2C2A25;border-radius:9px;padding:6px 11px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">✕ กลับไปจัดทั้งตำแหน่ง</button></sc-if>\n" +
   "              </div>\n" +
   "              <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
   "                <sc-for list=\"{{ wkUsers }}\" as=\"u\" hint-placeholder-count=\"4\">\n" +
   "                  <button sc-camel-on-click=\"{{ u.onPress }}\" style=\"border:1px solid {{ u.bd }};background:{{ u.bg }};color:{{ u.color }};border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ u.label }}</button>\n" +
   "                </sc-for>\n" +
   "                <sc-if value=\"{{ wkUsersNone }}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size:11.5px;color:#8C877D\">ไม่พบผู้ใช้ — พิมพ์ค้นหาชื่อ</span></sc-if>\n" +
   "              </div>\n" +
   "              <span style=\"font-size:11px;color:#8C877D\">✎ = คนนี้มีการ์ดรายคน · เลือกแล้วด้านบนจะแสดงหน้าของคนนั้น</span>\n" +
   "            </div>\n" +
   "            <div style=\"display:flex;flex-direction:column;gap:6px\">\n              <span style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.06em\">2 · ปุ่มบนหน้า (เรียงตามลำดับ)</span>"],
  ['แผงของฉัน: เพิ่มการ์ด',
   "        <div style=\"display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;align-items:center\">\n          <button sc-camel-on-click=\"{{ onWorkHome }}\"",
   "        <sc-if value=\"{{ wkMineOn }}\" hint-placeholder-val=\"{{ false }}\">\n" +
   "          <div style=\"background:#FBF8F1;border:1.5px solid #E2D3AE;border-radius:18px;padding:18px;margin-top:18px;display:flex;flex-direction:column;gap:12px\">\n" +
   "            <div style=\"display:flex;flex-direction:column;gap:4px\">\n" +
   "              <span style=\"font-size:15px;font-weight:800;color:#1C1B18\">จัดการ์ดของฉัน</span>\n" +
   "              <span style=\"font-size:12px;color:#8C877D;line-height:1.6\">{{ wkMineState }}</span>\n" +
   "            </div>\n" +
   "            <span style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.06em\">เพิ่มการ์ด — หน้าในโครงการ</span>\n" +
   "            <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
   "              <sc-for list=\"{{ wkMineAvailProj }}\" as=\"a\" hint-placeholder-count=\"6\">\n" +
   "                <button sc-camel-on-click=\"{{ a.onPress }}\" style=\"border:1px dashed #C9A961;background:#fff;color:#6E5424;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ a.label }}</button>\n" +
   "              </sc-for>\n" +
   "            </div>\n" +
   "            <span style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.06em\">เพิ่มการ์ด — เมนูหลัก</span>\n" +
   "            <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
   "              <sc-for list=\"{{ wkMineAvailNav }}\" as=\"a\" hint-placeholder-count=\"4\">\n" +
   "                <button sc-camel-on-click=\"{{ a.onPress }}\" style=\"border:1px dashed #9FB1C9;background:#fff;color:#3E5878;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ a.label }}</button>\n" +
   "              </sc-for>\n" +
   "            </div>\n" +
   "            <sc-if value=\"{{ wkMineAvailNone }}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size:12px;color:#8C877D\">มีการ์ดครบทุกหน้าที่คุณเปิดได้แล้ว</span></sc-if>\n" +
   "            <div style=\"display:flex;flex-wrap:wrap;gap:8px\">\n" +
   "              <sc-if value=\"{{ wkMineOwn }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onWkMineReset }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#2C2A25;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer\">คืนค่าตามตำแหน่ง</button></sc-if>\n" +
   "              <button sc-camel-on-click=\"{{ onWkMine }}\" style=\"border:1px solid #C9A961;background:#C9A961;color:#1C1B18;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer\">✓ เสร็จ</button>\n" +
   "            </div>\n" +
   "          </div>\n" +
   "        </sc-if>\n" +
   "        <div style=\"display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;align-items:center\">\n          <button sc-camel-on-click=\"{{ onWorkHome }}\""],
];

// ตรวจครบทุกจุดก่อน แล้วค่อยแก้ (ไม่แก้ครึ่ง ๆ)
for (const [name, a, , n = 1] of R) {
  const c = t.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ การ์ดหน้าแรกรายคน: แก้ ' + R.length + ' จุด');
