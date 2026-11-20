#!/usr/bin/env node
/* =====================================================================
   v1.437.0 delta-sync — ซิงก์เฉพาะแถวที่เปลี่ยน (ผู้บริหารสั่ง 20/11/2026 · ข้อ 1 จากรายงานศึกษาซอฟต์แวร์ก่อสร้าง)
     node scripts/patch-delta-sync.js        (รันหลัง patch-img-shrink.js)
   เดิม: ทุกรอบซิงก์ (เปิดแอป · มีคนแก้ app_state · กลับมาเปิดจอ) ดึง "ทุกแถวทุกตาราง" ใหม่ทั้งหมด
   ใหม่: รอบแรกของเซสชัน = ดึงเต็มเหมือนเดิม แล้วจำชุดแถวของเซิร์ฟเวอร์ไว้ในเครื่อง (`_srvSnap`)
         รอบต่อไป = ดึง (1) รายการ id ทั้งหมด (เล็กมาก) + (2) เฉพาะแถวที่ updated_at ≥ ครั้งก่อน − 2 นาที + (3) แถวที่ไม่เคยเห็น
         แล้วประกอบ "ชุดแถวของเซิร์ฟเวอร์ครบทุกแถว" ส่งให้ `_liveMerge` เดิม → การรวมข้อมูล / กันชนกัน / การลบ ทำงานเหมือนเดิมทุกอย่าง
   - ดึงเต็มเสมอเมื่อ: รอบแรก · โหมด "ดึงข้อมูลจากเซิร์ฟเวอร์ใหม่" · ตารางไม่มีตัวบันทึกเวลาแก้ไข (engagement) · ครบ 10 นาทีจากรอบเต็มล่าสุด (ตาข่ายกันพลาด)
   - ทุกตารางรายแถวมี trigger wc_touch (updated_at = now()) ยกเว้น engagement — ตรวจแล้ว 20/11/2026
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
const MARK = 'v1.437.0 delta-sync';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (delta-sync)'); process.exit(0); }
if (!t.includes('v1.436.0 img-shrink')) { console.error('✗ ต้องรัน scripts/patch-img-shrink.js ก่อน'); process.exit(1); }
const NEW_GET = `    const _get=async(t,sel)=>{ let r;
      for(let i=0;i<3;i++){ try{ r=await sel(sb.from(t)); }catch(e){ r={error:{message:String(e&&e.message||e)}}; }
        if(!_skew(r)) break; if(i<2){ this._clockRetry=(this._clockRetry||0)+1; await new Promise(z=>setTimeout(z,2000)); } }
      return r; };
    // ===== ${MARK}: ดึงเฉพาะแถวที่เปลี่ยน แล้วประกอบชุดแถวของเซิร์ฟเวอร์ครบทุกแถวให้ _liveMerge เดิม =====
    const SNAP=this._srvSnap=this._srvSnap||{}, FULLAT=this._srvFullAt=this._srvFullAt||{}, NODELTA=['engagement'];
    const _maxU=(L)=>{ let m=''; (L||[]).forEach(x=>{ const u=String(x&&x.updated_at||''); if(u>m) m=u; }); return m; };
    const _strip=(x)=>({ id:x.id, project:x.project, data:x.data });
    const _getD=async(t)=>{ const snap=SNAP[t];
      const full=!snap||initial||this._forceServer||NODELTA.indexOf(t)>=0||!snap.max||Date.now()-(FULLAT[t]||0)>10*60000;
      if(full){ const r=await _get(t,q=>q.select('id,project,data,updated_at'));
        if(!r.error){ const L=r.data||[]; SNAP[t]={ rows:new Map(L.map(x=>[x.id,x])), max:_maxU(L) }; FULLAT[t]=Date.now(); this._deltaStat=(this._deltaStat||{}); this._deltaStat[t]={ mode:'full', n:L.length }; return { data:L.map(_strip), error:null }; }
        return r; }
      const since=new Date(Date.parse(snap.max)-120000).toISOString();
      const [ids, ch]=await Promise.all([ _get(t,q=>q.select('id')), _get(t,q=>q.select('id,project,data,updated_at').gte('updated_at', since)) ]);
      if(ids.error) return ids; if(ch.error) return ch;
      (ch.data||[]).forEach(x=>snap.rows.set(x.id,x));
      const idL=(ids.data||[]).map(x=>x.id), idS=new Set(idL);
      const miss=idL.filter(id=>!snap.rows.has(id));
      if(miss.length){ const r2=await _get(t,q=>q.select('id,project,data,updated_at').in('id', miss)); if(r2.error) return r2; (r2.data||[]).forEach(x=>snap.rows.set(x.id,x)); }
      Array.from(snap.rows.keys()).forEach(id=>{ if(!idS.has(id)) snap.rows.delete(id); });
      if(idL.some(id=>!snap.rows.has(id))){ delete SNAP[t]; return _getD(t); }   // ยังขาดแถว → ดึงเต็มรอบนี้
      const nm=_maxU(Array.from(snap.rows.values())); if(nm>snap.max) snap.max=nm;
      this._deltaStat=(this._deltaStat||{}); this._deltaStat[t]={ mode:'delta', n:idL.length, changed:(ch.data||[]).length+miss.length };
      return { data:idL.map(id=>_strip(snap.rows.get(id))), error:null }; };
    const jobs=this.SB_MAP().map(([k,t])=>{ total++; return _getD(t).then(res=>[k,res]); });`;
const OLD_GET = `    const _get=async(t)=>{ let r;
      for(let i=0;i<3;i++){ try{ r=await sb.from(t).select('id,project,data'); }catch(e){ r={error:{message:String(e&&e.message||e)}}; }
        if(!_skew(r)) break; if(i<2){ this._clockRetry=(this._clockRetry||0)+1; await new Promise(z=>setTimeout(z,2000)); } }
      return r; };
    const jobs=this.SB_MAP().map(([k,t])=>{ total++; return _get(t).then(res=>[k,res]); });`;
const R = [['sbPull: ดึงเฉพาะแถวที่เปลี่ยน', OLD_GET, NEW_GET]];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ delta-sync: แก้ ' + R.length + ' จุด');
