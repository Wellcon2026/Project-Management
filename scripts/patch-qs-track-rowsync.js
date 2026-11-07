#!/usr/bin/env node
/* =====================================================================
   QS Tracking บันทึกทีละแถว (ทางเลือก ก) — แก้ index.html ของ Wellcon PM (ไฟล์ bundle จาก canvas)
   - qsInv / qsBid / qsDoc / qsVo ไม่ส่ง "ทั้งก้อน" ทับ app_state อีก → เทียบกับข้อมูลล่าสุดจากเซิร์ฟเวอร์
     แล้วส่งเฉพาะแถวที่เพิ่ม/แก้/ลบ/เรียงใหม่ ผ่านฟังก์ชัน qs_track_patch (supabase-qs-track-patch.sql)
   - ยังไม่รัน SQL → ทำงานแบบเดิม (ส่งทั้งก้อน) อัตโนมัติ แอปไม่พัง
   - ไม่แตะ login / accounts / role · รูปข้อมูลเดิมไม่เปลี่ยน
   - รันซ้ำได้ · หาจุดที่ต้องแก้ไม่เจอ/เจอหลายจุด → หยุดโดยไม่เขียนไฟล์
   ใช้หลังอัปโหลด index.html ใหม่จาก canvas (ถ้า canvas ยังไม่มีโค้ดนี้):  node scripts/patch-qs-track-rowsync.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('ไม่พบส่วน template ใน index.html — รูปแบบไฟล์เปลี่ยน ไม่แก้'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้ (ป้องกันไฟล์เสีย)'); process.exit(2); }
if (t.includes('_qsTrkPush(')) { console.log('✓ มี QS Tracking ทีละแถวอยู่แล้ว ไม่ต้องแก้'); process.exit(0); }

// โค้ดที่เพิ่ม (เมธอดใหม่ของคลาส วางก่อน _qstSeed)
const METHODS = `  // ===== QS Tracking บันทึกทีละแถว (qs_track_patch) — กันการส่งทั้งก้อนทับแถวที่แอปอื่น (QS Take-off) เพิ่ม/แก้ =====
  _qsTrkKeys(){ return ['qsInv','qsBid','qsDoc','qsVo']; }
  _qsTrkFlat(base,cur,g){ const ops=[], G=(g!=null?{ g }:{}), key=(r)=>(r&&r.id!=null)?String(r.id):null;
    const B=new Map(), C=new Map(); (base||[]).forEach(r=>{ const k=key(r); if(k!=null) B.set(k,r); }); (cur||[]).forEach(r=>{ const k=key(r); if(k!=null) C.set(k,r); });
    let prev=null; (cur||[]).forEach(r=>{ const k=key(r); if(k==null) return; const b=B.get(k);
      if(!b||JSON.stringify(b)!==JSON.stringify(r)) ops.push({ op:'put', ...G, id:k, row:r, after:prev }); prev=k; });
    B.forEach((r,k)=>{ if(!C.has(k)) ops.push({ op:'del', ...G, id:k }); });
    const bo=[...B.keys()].filter(k=>C.has(k)), co=[...C.keys()].filter(k=>B.has(k));
    if(JSON.stringify(bo)!==JSON.stringify(co)) ops.push({ op:'order', ...G, ids:[...C.keys()] });
    return ops; }
  _qsTrkVo(base,cur){ const ops=[], meta=(g)=>{ const m={ ...g }; delete m.rows; return m; };
    const B=new Map(), C=new Map(); (base||[]).forEach(g=>{ if(g&&g.key!=null) B.set(String(g.key),g); }); (cur||[]).forEach(g=>{ if(g&&g.key!=null) C.set(String(g.key),g); });
    let prev=null; (cur||[]).forEach(g=>{ if(!g||g.key==null) return; const k=String(g.key), b=B.get(k);
      if(!b) ops.push({ op:'gput', key:k, meta:meta(g), rows:g.rows||[], after:prev });
      else { if(JSON.stringify(meta(b))!==JSON.stringify(meta(g))) ops.push({ op:'gput', key:k, meta:meta(g), after:prev });
        this._qsTrkFlat(b.rows||[], g.rows||[], k).forEach(o=>ops.push(o)); }
      prev=k; });
    B.forEach((g,k)=>{ if(!C.has(k)) ops.push({ op:'gdel', key:k }); });
    const bo=[...B.keys()].filter(k=>C.has(k)), co=[...C.keys()].filter(k=>B.has(k));
    if(JSON.stringify(bo)!==JSON.stringify(co)) ops.push({ op:'gorder', keys:[...C.keys()] });
    return ops; }
  // ฐานเปรียบเทียบ = ข้อมูลเซิร์ฟเวอร์ล่าสุดที่เครื่องนี้รู้ (_sbSnap) · ส่งสำเร็จ → อัปเดตฐาน
  async _qsTrkPush(k,cur,snapArg){
    const sb=this._sb; if(!sb||!Array.isArray(cur)) return false;
    const snap=snapArg||(this._sbSnap=this._sbSnap||{}), sig=JSON.stringify(cur);
    if(snap['@'+k]===sig) return false;
    let base=[]; try{ const b=JSON.parse(snap['@'+k]||'null'); if(Array.isArray(b)) base=b; }catch(e){}
    const ops=k==='qsVo'?this._qsTrkVo(base,cur):this._qsTrkFlat(base,cur,null);
    const by=(this.state.me&&this.state.me.email)||null;
    if(ops.length){
      const r=await sb.rpc('qs_track_patch',{ p_key:k, p_ops:ops, p_by:by });
      if(r.error){ const msg=String(r.error.message||'');
        if(/Could not find the function|does not exist/i.test(msg)){   // ยังไม่รัน SQL → ส่งทั้งก้อนแบบเดิม
          const up=await sb.from('app_state').upsert([{ id:k, data:{ v:cur }, updated_by:by }], { onConflict:'id' }); if(up.error) throw up.error; }
        else throw r.error; } }
    snap['@'+k]=sig; return true; }
  _qsTrkSave(k,next){ return this._qsTrkPush(k,next).then(()=>({ error:null }),(e)=>({ error:e||{ message:'error' } })); }
`;

const EDITS = [
  ['เพิ่มเมธอดบันทึกทีละแถว', '  _qstSeed(){', METHODS + '  _qstSeed(){'],
  ['sbPush: 4 คีย์ส่งทีละแถว', '        let val=S[k];', "        if(this._qsTrkKeys().includes(k)){ if(await this._qsTrkPush(k,S[k],snap)) sent++; continue; }\n        let val=S[k];"],
  ['สร้างกลุ่ม VO อัตโนมัติ', "this._sb.from('app_state').upsert([{ id:'qsVo', data:{ v:next }, updated_by:(this.state.me||{}).email||'' }], { onConflict:'id' })", "this._qsTrkSave('qsVo', next)"],
  ['ยืนยันผูก PROJECT ID', "this._sb.from('app_state').upsert([{ id:'qsVo', data:{ v:next }, updated_by:(S.me||{}).email||'' }], { onConflict:'id' })", "this._qsTrkSave('qsVo', next)"],
  ['ผูกกลุ่ม VO ทั้งหมด', "this._sb.from('app_state').upsert({ id:'qsVo', data:{ v:next }, updated_by:(this.state.me||{}).email||'' });", "this._qsTrkSave('qsVo', next);"],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b);
  console.log('  ✓ ' + name);
}
// ต้องไม่เหลือจุดที่เขียน qs* ทั้งก้อนตรง ๆ
const left = (t.match(/from\('app_state'\)\.upsert\(\[?\{ id:'qs(Inv|Bid|Doc|Vo)'/g) || []).length;
if (left) { console.error('✗ ยังมีจุดเขียน QS Tracking ทั้งก้อนเหลือ ' + left + ' จุด — ไม่แก้ไฟล์'); process.exit(1); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ QS Tracking บันทึกทีละแถวแล้ว (ยังไม่รัน SQL = ทำงานแบบเดิมอัตโนมัติ)');
