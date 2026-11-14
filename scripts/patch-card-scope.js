#!/usr/bin/env node
/* =====================================================================
   v1.386.0 card-scope — ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน: เลือก "มีผลกับใคร" ทีละรายการ
     node scripts/patch-card-scope.js
   1) แท็บ "รายคน": กดสวิตช์การ์ด / ฟังก์ชัน → ถามทันทีใต้รายการนั้น
        👤 <ชื่อ> คนเดียว   |   👥 ทั้งตำแหน่ง <ตำแหน่ง> (n คน)   |   ยกเลิก
   2) "ทั้งตำแหน่ง" (ทั้งจากแท็บรายคนและแท็บตามตำแหน่ง) = มีผลกับทุกคนในตำแหน่งจริง ๆ
        · ตั้งค่าของตำแหน่ง (workPages[role] / featRole[role]) — คนที่เข้าตำแหน่งนี้ภายหลังได้ค่านี้ด้วย
        · และล้าง/ปรับค่ารายคนของรายการนั้นให้ทุกคนในตำแหน่ง (การ์ด: เพิ่ม/เอาออกจากชุดรายคน · ลำดับเดิมคงไว้
          ฟังก์ชัน: ลบ featOff[key] / aiOff รายคน) — รายการอื่นที่ตั้งรายคนไว้ไม่ถูกแตะ
   ข้อมูลเดิม: workPages · workUser · featRole · accounts.featOff/aiOff — ไม่มีคีย์ใหม่ · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · รันหลัง scripts/patch-card-admin.js ทุกครั้ง
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
const MARK = 'v1.386.0 card-scope';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (เลือกขอบเขต คนเดียว / ทั้งตำแหน่ง)'); process.exit(0); }
if (!t.includes('v1.385.0 card-admin')) { console.error('✗ ต้องรัน scripts/patch-card-admin.js ก่อน'); process.exit(1); }

const HELPERS =
  "  // ===== " + MARK + ": มีผลกับ คนเดียว / ทั้งตำแหน่ง =====\n" +
  "  _ccRoleMembers(rk){ return (this.state.accounts||[]).filter(a=>a&&a.email&&a.roleKey===rk); }\n" +
  "  _ccRoleShort(rk){ const RD=this.ROLE_DEFS(); return String((RD[rk]||{}).label||rk||'—').split(' · ')[0]; }\n" +
  "  // การ์ดทั้งตำแหน่ง: ชุดของตำแหน่ง + ชุดรายคนของทุกคนในตำแหน่ง (เพิ่ม/เอาออกเฉพาะใบนี้ · ลำดับเดิมคงไว้)\n" +
  "  _ccRoleCard(rk, key, on){ const L=this.WORK_LIST(rk); this._workSave(rk, on?[...L.filter(x=>x!==key), key]:L.filter(x=>x!==key));\n" +
  "    let n=0; this._ccRoleMembers(rk).forEach(a=>{ const e=String(a.email).trim().toLowerCase(); const own=this.WORK_USER(e); if(!own) return;\n" +
  "      const has=own.indexOf(key)>=0; if(on===has) return; n++; this._wkUserSave(e, on?[...own, key]:own.filter(x=>x!==key)); });\n" +
  "    this.showToast((on?'แสดง':'ซ่อน')+'การ์ดให้ทั้งตำแหน่ง '+this._ccRoleShort(rk)+(n?' (รวม '+n+' คนที่จัดการ์ดเอง)':'')); }\n" +
  "  // ฟังก์ชันทั้งตำแหน่ง: ค่าของตำแหน่ง + ล้างค่ารายคนของฟังก์ชันนี้ให้ทุกคนในตำแหน่ง\n" +
  "  _ccRoleFeat(rk, key, on){ const RF=(this.state.featRole||{})[rk]||{}; this._stKeySet('featRole', rk, { ...RF, [key]:on });\n" +
  "    const hit=(a)=>!!a&&a.roleKey===rk&&((a.featOff||{})[key]!==undefined||(key==='ai'&&a.aiOff!==undefined));\n" +
  "    const n=(this.state.accounts||[]).filter(hit).length;\n" +
  "    const clean=(a)=>{ if(!hit(a)) return a; const x={ ...a, featOff:{ ...(a.featOff||{}) } }; delete x.featOff[key]; if(key==='ai') delete x.aiOff; return x; };\n" +
  "    if(n) this.setState(st=>({ accounts:(st.accounts||[]).map(clean), me:st.me?clean(st.me):st.me }));\n" +
  "    const F=this.SUPPORT_FEATS().find(f=>f.key===key)||{};\n" +
  "    this.showToast((on?'เปิด ':'ปิด ')+(F.label||key)+' ให้ทั้งตำแหน่ง '+this._ccRoleShort(rk)+(n?' (รวม '+n+' คนที่ตั้งรายคนไว้)':'')); }\n" +
  "  // แท็บรายคน: กดสวิตช์ → ถามว่ามีผลกับใคร (แสดงใต้รายการนั้น)\n" +
  "  _ccAsk(rows, kind, ua, rk, ask){ const rn=this._ccRoleShort(rk); const nm=String(ua.nick||'').trim()||String(ua.name||'').trim()||String(ua.email||'');\n" +
  "    const nR=this._ccRoleMembers(rk).length; const close=()=>this.setState({ ccAsk:'' });\n" +
  "    rows.forEach(r=>{ if(r.locked) return; const on=kind==='c'?r.stLabel==='แสดง':!!r.on; const id=kind+':'+r.key; const one=r.onToggle;\n" +
  "      r.askShow=ask===id; r.onToggle=()=>this.setState({ ccAsk:ask===id?'':id });\n" +
  "      r.askTxt=(kind==='c'?(on?'ซ่อนการ์ด':'แสดงการ์ด'):(on?'ปิด':'เปิด'))+' \"'+r.label+'\" — มีผลกับใคร?';\n" +
  "      r.oneTxt='👤 '+nm+' คนเดียว'; r.roleTxt='👥 ทั้งตำแหน่ง '+rn+' ('+nR+' คน)';\n" +
  "      r.askNote='ทั้งตำแหน่ง = ทุกคนในตำแหน่ง '+rn+' รวมคนที่ตั้งรายคนไว้ (เฉพาะรายการนี้) · คนที่เข้าตำแหน่งนี้ภายหลังได้ค่านี้ด้วย';\n" +
  "      r.onOne=()=>{ one(); close(); }; r.onRole=()=>{ if(kind==='c') this._ccRoleCard(rk, r.key, !on); else this._ccRoleFeat(rk, r.key, !on); close(); }; r.onAskX=close; }); }\n";

const ASK = (o) =>
  "                    <sc-if value=\"{{ " + o + ".askShow }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "                      <div style=\"border:1px dashed #C9A961;background:#FBF3E2;border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:7px\">\n" +
  "                        <span style=\"font-size:11.5px;font-weight:700;color:#6E5424\">{{ " + o + ".askTxt }}</span>\n" +
  "                        <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
  "                          <button sc-camel-on-click=\"{{ " + o + ".onOne }}\" style=\"border:1px solid #1C1B18;background:#1C1B18;color:#fff;border-radius:9px;padding:7px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ " + o + ".oneTxt }}</button>\n" +
  "                          <button sc-camel-on-click=\"{{ " + o + ".onRole }}\" style=\"border:1px solid #C9A961;background:#C9A961;color:#1C1B18;border-radius:9px;padding:7px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">{{ " + o + ".roleTxt }}</button>\n" +
  "                          <button sc-camel-on-click=\"{{ " + o + ".onAskX }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#8A7657;border-radius:9px;padding:7px 12px;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer\">ยกเลิก</button>\n" +
  "                        </div>\n" +
  "                        <span style=\"font-size:10px;color:#8C877D;line-height:1.5\">{{ " + o + ".askNote }}</span>\n" +
  "                      </div>\n" +
  "                    </sc-if>\n";
const WRAP = "<div style=\"display:flex;flex-direction:column;gap:5px\">";

// [ชื่อ, เดิม, ใหม่, จำนวนที่ต้องเจอ] — ทั้งไฟล์
const R = [
  ['ตัวช่วย', "  CC_VALS(S){", HELPERS + "  CC_VALS(S){"],
  ['ค่าเริ่มต้น askShow', "rowBg:on?'#fff':'#FBF9F4' });", "rowBg:on?'#fff':'#FBF9F4', askShow:false });"],
  ['ตามตำแหน่ง: การ์ดมีผลทั้งตำแหน่ง',
   "const c=mk(rl, (a)=>this._workSave(rk,a)); out.ccRCOn=c.on;",
   "const c=mk(rl, (a)=>this._workSave(rk,a)); [...c.on, ...c.off].forEach(r=>{ const on=r.stLabel==='แสดง'; r.onToggle=()=>this._ccRoleCard(rk, r.key, !on); });   // " + MARK + "\n      out.ccRCOn=c.on;"],
  ['ตามตำแหน่ง: ฟังก์ชันมีผลทั้งตำแหน่ง',
   "onToggle:()=>this._stKeySet('featRole', rk, { ...RF, [f.key]:!on }) }; });",
   "onToggle:()=>this._ccRoleFeat(rk, f.key, !on) }; });"],
  ['รายคน: ถามขอบเขต (การ์ด)',
   "const c=mk(list, (a)=>this._wkUserSave(e,a)); out.ccUCOn=c.on;",
   "const c=mk(list, (a)=>this._wkUserSave(e,a)); this._ccAsk([...c.on, ...c.off], 'c', ua, rk, S.ccAsk||'');   // " + MARK + "\n        out.ccUCOn=c.on;"],
  ['รายคน: ถามขอบเขต (ฟังก์ชัน)',
   "noteFg:this._featGOff(r.key)?'#B4532A':'#8A8375' }));",
   "noteFg:this._featGOff(r.key)?'#B4532A':'#8A8375' })); this._ccAsk(out.ccUF, 'f', ua, rk, S.ccAsk||'');"],
  ['เปลี่ยนผู้ใช้: ปิดคำถาม', "onPress:()=>this.setState({ ccUser:on?'':e }) }; });", "onPress:()=>this.setState({ ccUser:on?'':e, ccAsk:'' }) }; });"],
  ['ข้อความ: ตามตำแหน่ง', "มีผลกับทุกคนในตำแหน่ง (ยกเว้นคนที่ตั้งรายคน)", "มีผลกับทุกคนในตำแหน่ง รวมคนที่ตั้งรายคน (เฉพาะรายการที่กด)"],
  ['ข้อความ: คนที่จัดการ์ดเอง', "คนกลุ่มนี้ไม่เปลี่ยนตามตำแหน่ง (แก้ที่แท็บ รายคน)", "การ์ดที่กดแสดง/ซ่อนที่นี่จะเปลี่ยนให้คนกลุ่มนี้ด้วย (ลำดับการ์ดของเขาคงเดิม)"],
  ['ข้อความ: หัวส่วน', "กดสวิตช์แล้วบันทึกทันที ·", "แท็บรายคน: กดสวิตช์แล้วเลือกว่ามีผลกับ <b>คนนี้คนเดียว</b> หรือ <b>ทั้งตำแหน่ง</b> · บันทึกทันที ·"],
];
// [ชื่อ, เดิม, ใหม่, จำนวน] — เฉพาะในส่วนหน้าจอการ์ด & ฟังก์ชัน
const V = [
  ['รายการการ์ด: กล่องครอบ', "as=\"c\" hint-placeholder-count=\"4\">\n", "as=\"c\" hint-placeholder-count=\"4\">" + WRAP + "\n", 4],
  ['รายการการ์ด: คำถามขอบเขต', "                    </button>\n                  </div>\n                </sc-for>",
   "                    </button>\n                  </div>\n" + ASK('c') + "                  </div></sc-for>", 4],
  ['รายการฟังก์ชัน: กล่องครอบ', "as=\"f\" hint-placeholder-count=\"4\">\n", "as=\"f\" hint-placeholder-count=\"4\">" + WRAP + "\n", 4],
  ['รายการฟังก์ชัน: คำถามขอบเขต', "                  </button>\n                </sc-for>", "                  </button>\n" + ASK('f') + "                  </div></sc-for>", 4],
];

const s0 = t.indexOf('<!-- v1.385.0 card-admin');
const s1 = s0 < 0 ? -1 : t.indexOf('<sc-if value="{{ engYearShow }}"', s0);
if (s0 < 0 || s1 < 0) { console.error('✗ หาส่วนหน้าจอการ์ด & ฟังก์ชันไม่เจอ — ไม่แก้อะไรเลย'); process.exit(1); }
let sec = t.slice(s0, s1);
for (const [name, a, , n = 1] of V) {
  const c = sec.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [name, a, , n = 1] of R) {
  const c = t.split(a).length - 1;
  if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); }
}
for (const [, a, b] of V) sec = sec.split(a).join(b);
t = t.slice(0, s0) + sec + t.slice(s1);
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ เลือกขอบเขต คนเดียว / ทั้งตำแหน่ง: แก้ ' + (R.length + V.length) + ' จุด');
