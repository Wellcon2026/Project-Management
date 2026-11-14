#!/usr/bin/env node
/* =====================================================================
   v1.399.0 sync-c — ตรวจทั้งระบบ รอบ D: การซิงก์ข้อมูล (ผู้บริหารสั่งทำต่อเนื่อง 14/11/2026 · ข้อ 6 · 14 · 15 · 17)
     node scripts/patch-sync-c.js        (รันต่อจาก patch-sync-b.js)
   6) ข้อมูลที่เก็บเป็นก้อน (app_state) — กันบันทึกทับของเพื่อนร่วมงาน
      · ก่อนเขียนแต่ละก้อน: อ่านของเซิร์ฟเวอร์ → ถ้ามีคนอื่นแก้ระหว่างนั้น "รวม 3 ทาง" (ฐาน = ค่าที่ซิงก์ล่าสุดของเครื่องนี้)
        รวมทีละหัวข้อ (เช่น ทีละโครงการ / ทีละคน) และทีละรายการตาม id — ส่วนที่เราไม่ได้แก้ ใช้ของเซิร์ฟเวอร์ · ส่วนที่เราแก้ ใช้ของเรา
        (สองคนแก้ "ช่องเดียวกัน" พร้อมกัน → คนบันทึกทีหลังชนะ เหมือนเดิม)
      · บันทึกไม่สำเร็จ → แจ้งผู้ใช้ + ลองใหม่อัตโนมัติ + การดึงข้อมูลรอบถัดไปไม่ทับค่าที่ยังส่งไม่ขึ้น (เดิมเงียบ แล้วหาย)
   14) เครื่องไม่ต้องโหลดข้อมูลทั้งหมดใหม่เมื่อแถวที่ไม่เกี่ยวกับหน้าจอเปลี่ยน (สำรองข้อมูลรายวัน · บันทึกข้อผิดพลาด · สถิติออนไลน์ · แชต · ใบขอซื้อ)
       และการดึงข้อมูลไม่ดาวน์โหลดแถวเหล่านั้น (เดิมดึงสำรอง 30 วันทุกครั้ง)
   15) กลับมาเปิดจอ (พักเกิน 30 วินาที) · เน็ตกลับมา · เชื่อมต่อ realtime ใหม่ → ดึงข้อมูลล่าสุด (เดิมไม่ดึง — แก้ต่อจากข้อมูลเก่าแล้วทับของคนอื่น)
   17) realtime ฟังข้อมูลชุดเดียวกับที่ใช้อยู่ (ทดสอบ = staging · จริง = public — เดิมฟังของจริงเสมอ) · localhost = ข้อมูลทดสอบ เหมือนหน้าแยกทุกหน้า
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.399.0 sync-c';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (รวมการแก้ไขก่อนบันทึก · ลดการโหลดซ้ำ · ดึงเมื่อกลับมาเปิดจอ)'); process.exit(0); }
if (!t.includes('v1.398.0 sync-b')) { console.error('✗ ต้องรัน scripts/patch-sync-b.js ก่อน'); process.exit(1); }

const HELPERS =
  "  // ===== " + MARK + ": รวมการแก้ไข 3 ทาง ของข้อมูลก้อน app_state (ฐาน · ของเรา · ของเซิร์ฟเวอร์) =====\n" +
  "  _merge3(base, local, remote){ const J=JSON.stringify, isO=(x)=>!!x&&typeof x==='object'&&!Array.isArray(x);\n" +
  "    const idA=(x)=>Array.isArray(x)&&x.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&e.id!=null);\n" +
  "    if(isO(local)&&isO(remote)){ const b=isO(base)?base:{}, out={}; const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);\n" +
  "      new Set([...Object.keys(local), ...Object.keys(remote)]).forEach(k=>{ const inL=has(local,k), inR=has(remote,k), inB=has(b,k);\n" +
  "        const lCh=inL?(!inB||J(local[k])!==J(b[k])):inB;\n" +
  "        if(!lCh){ if(inR) out[k]=remote[k]; return; }          // เราไม่ได้แก้หัวข้อนี้ → ใช้ของเซิร์ฟเวอร์ (รวมที่คนอื่นลบ)\n" +
  "        if(!inL) return;                                        // เราลบหัวข้อนี้\n" +
  "        const rCh=inR?(!inB||J(remote[k])!==J(b[k])):inB;\n" +
  "        out[k]=(rCh&&inR&&((isO(local[k])&&isO(remote[k]))||(idA(local[k])&&idA(remote[k])&&(local[k].length||remote[k].length))))?this._merge3(inB?b[k]:undefined, local[k], remote[k]):local[k]; });\n" +
  "      return out; }\n" +
  "    if(idA(local)&&idA(remote)&&(local.length||remote.length)){ const bm={}, rm={}, seen={}, out=[];\n" +
  "      (idA(base)?base:[]).forEach(e=>{ bm[e.id]=e; }); remote.forEach(e=>{ rm[e.id]=e; });\n" +
  "      local.forEach(e=>{ const id=e.id; seen[id]=1; const inB=Object.prototype.hasOwnProperty.call(bm,id);\n" +
  "        if(!inB||J(e)!==J(bm[id])){ out.push(e); return; }      // เราเพิ่ม / แก้รายการนี้\n" +
  "        if(Object.prototype.hasOwnProperty.call(rm,id)) out.push(rm[id]); });   // เราไม่ได้แก้ → ใช้ของเซิร์ฟเวอร์ (คนอื่นลบ = หาย)\n" +
  "      remote.forEach(e=>{ if(!seen[e.id]&&!Object.prototype.hasOwnProperty.call(bm,e.id)) out.push(e); });   // คนอื่นเพิ่มใหม่\n" +
  "      return out; }\n" +
  "    return local; }\n" +
  "  async _stMergeRemote(k, local, baseSig){ let base; try{ base=baseSig===undefined?undefined:JSON.parse(baseSig); }catch(e){ return null; }\n" +
  "    const r=await this._sb.from('app_state').select('data').eq('id',k).maybeSingle(); if(!r||r.error||!r.data) return null;\n" +
  "    const remote=(r.data.data||{}).v; if(remote===undefined||remote===null) return null; const J=JSON.stringify, rs=J(remote);\n" +
  "    if(rs===J(base)||rs===J(local)) return null;                // ไม่มีใครแก้ระหว่างนี้\n" +
  "    const val=this._merge3(base, local, remote); return { changed:J(val)!==J(local), val }; }\n" +
  "  // แถว app_state ที่ไม่เกี่ยวกับหน้าจอ — เปลี่ยนแล้วไม่ต้องโหลดข้อมูลใหม่ (อ่านแยกเฉพาะตอนเปิดหน้านั้น)\n" +
  "  _stRowSkip(p){ const id=String((((p&&p.new)||{}).id)||(((p&&p.old)||{}).id)||''); return /^(backup|chat_|autoPR)/.test(id)||id==='bugLog'||id==='presLog'; }\n" +
  "  // กลับมาเปิดจอ / เน็ตกลับมา / เชื่อมต่อใหม่ → ดึงข้อมูลล่าสุด (ไม่ถี่กว่า 20 วินาที)\n" +
  "  _wakeSync(){ try{ if(!this.state.loggedIn||!this._sbReady||this._demoLock) return; const now=Date.now(); if(this._wakeAt&&now-this._wakeAt<20000) return; this._wakeAt=now;\n" +
  "      this._schedulePull(400); if(this._aprSync) this._aprSync(true); }catch(e){} }\n" +
  "  _wakeHook(){ if(this._wakeOn||typeof document==='undefined') return; this._wakeOn=true;\n" +
  "    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden'){ this._hidAt=Date.now(); return; } if(this._hidAt&&Date.now()-this._hidAt>30000) this._wakeSync(); this._hidAt=0; });\n" +
  "    window.addEventListener('online', ()=>this._wakeSync()); }\n";

const R = [
  ['ตัวช่วย', "  async sbPush(force){", HELPERS + "  async sbPush(force){"],
  // ---------- 6) รวมก่อนเขียน + แจ้งเมื่อไม่สำเร็จ ----------
  ['sbPush: เตรียมรายการ', "      for(const k of this.SB_STATE_KEYS()){\n        const sig=JSON.stringify(S[k]);\n        if(!force && snap['@'+k]===sig) continue;",
   "      const stFail=[], stMerged=[];   // " + MARK + "\n      for(const k of this.SB_STATE_KEYS()){\n        const sig=JSON.stringify(S[k]);\n        if(!force && snap['@'+k]===sig) continue;"],
  ['sbPush: รวม + เขียน',
   "        const up=await sb.from('app_state').upsert([{ id:k, data:{ v:val }, updated_by:(S.me&&S.me.email)||null }], { onConflict:'id' });\n        if(!up.error){ snap['@'+k]=sig; sent++; }\n      }\n      this._sbSnap=snap;",
   "        let sig2=sig;\n" +
   "        if(k!=='notes'&&!force){ try{ const mg=await this._stMergeRemote(k, val, snap['@'+k]); if(mg&&mg.changed){ val=mg.val; sig2=JSON.stringify(val); this.setState({ [k]:val }); stMerged.push(k); } }catch(e){} }\n" +
   "        const up=await sb.from('app_state').upsert([{ id:k, data:{ v:val }, updated_by:(S.me&&S.me.email)||null }], { onConflict:'id' });\n" +
   "        if(!up.error){ snap['@'+k]=sig2; sent++; if(this._stUnsent) delete this._stUnsent[k]; }\n" +
   "        else { stFail.push(k); (this._stUnsent=this._stUnsent||{})[k]={ base:snap['@'+k] }; }\n" +
   "      }\n" +
   "      this._sbSnap=snap;\n" +
   "      if(stMerged.length&&(!this._stMergeAt||Date.now()-this._stMergeAt>15000)){ this._stMergeAt=Date.now(); this.showToast('มีเพื่อนร่วมงานแก้ข้อมูลชุดเดียวกัน — รวมการแก้ไขให้แล้ว'); }\n" +
   "      if(stFail.length){ this._bug('push', 'บันทึกข้อมูลบางชุดขึ้นเซิร์ฟเวอร์ไม่สำเร็จ — ลองใหม่อัตโนมัติ', stFail.join(', '));\n" +
   "        if(!this._stFailAt||Date.now()-this._stFailAt>60000){ this._stFailAt=Date.now(); this.showToast('บันทึกบางส่วนขึ้นเซิร์ฟเวอร์ไม่สำเร็จ — ระบบกำลังลองใหม่ อย่าเพิ่งปิดหน้านี้'); }\n" +
   "        clearTimeout(this._stRetryT); this._stRetryT=setTimeout(()=>{ this.sbPush(false); }, 8000); }"],
  ['sbPull: ไม่ทับค่าที่ยังส่งไม่ขึ้น', "              patch[r.id]=v; }", "              if(!(this._stUnsent||{})[r.id]) patch[r.id]=v; }"],
  ['sbPull: ฐานของค่าที่ยังส่งไม่ขึ้น', "      this.SB_STATE_KEYS().forEach(k=>{ this._sbSnap['@'+k]=JSON.stringify(S[k]); });",
   "      this.SB_STATE_KEYS().forEach(k=>{ const u=(this._stUnsent||{})[k]; this._sbSnap['@'+k]=u?u.base:JSON.stringify(S[k]); });   // " + MARK + ": ค่าที่ยังส่งไม่ขึ้น คงฐานเดิมไว้ให้รอบถัดไปส่ง"],
  // ---------- 14) ลดการโหลด ----------
  ['sbPull: ไม่ดึงสำรอง / บันทึก / แชต', "    const stJob=sb.from('app_state').select('id,data').then(r=>r, ()=>({error:true}));",
   "    const stJob=sb.from('app_state').select('id,data').not('id','like','backup%').not('id','like','chat_%').not('id','like','autoPR%').not('id','in','(bugLog,presLog)').then(r=>r, ()=>({error:true}));   // " + MARK],
  ['realtime: ข้ามแถวที่ไม่เกี่ยว + schema ตามโหมด',
   "      this._sbCh.on('postgres_changes', { event:'*', schema:'public', table:t }, (p)=>{\n        if(this._pushing) return;",
   "      this._sbCh.on('postgres_changes', { event:'*', schema:this.IS_STAGING()?'staging':'public', table:t }, (p)=>{\n        if(this._pushing) return;\n        if(t==='app_state'&&this._stRowSkip(p)) return;"],
  // ---------- 15) ดึงเมื่อกลับมา ----------
  ['realtime: เชื่อมต่อใหม่ → ดึงล่าสุด', "    this._sbCh.subscribe((st)=>{ if(st==='SUBSCRIBED') this._presTrack(); });",
   "    this._sbCh.subscribe((st)=>{ if(st==='SUBSCRIBED'){ this._presTrack(); if(this._subOnce) this._wakeSync(); this._subOnce=true; } });"],
  ['ตัวฟังการกลับมาเปิดจอ', "componentDidMount(){ try{ if(typeof window!=='undefined'){ this._wctT=setInterval(", "componentDidMount(){ try{ if(typeof window!=='undefined'){ this._wakeHook(); this._wctT=setInterval("],
  // ---------- 17) localhost = ข้อมูลทดสอบ ----------
  ['IS_STAGING: localhost', "    return isDesignTool || /staging/i.test(h) ||", "    return isDesignTool || /^localhost$/i.test(h) || /staging/i.test(h) ||"],
];
for (const [name, a, , want] of R) { const c = t.split(a).length - 1; if (c !== (want || 1)) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + (want || 1) + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ รวมการแก้ไขก่อนบันทึก · ลดการโหลดซ้ำ · ดึงเมื่อกลับมาเปิดจอ: แก้ ' + R.length + ' จุด');
