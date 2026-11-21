#!/usr/bin/env node
/* =====================================================================
   v1.455.0 daily-redesign — Daily Report (รายงานประจำวัน) หน้าใหม่ น่าใช้ขึ้น (ผู้บริหารสั่ง 21/11/2026: "more interesting and friendly")
     node scripts/patch-daily-redesign.js
   - การ์ด "วันนี้": ยังไม่ส่ง → ปุ่มใหญ่ "+ เขียนรายงานวันนี้" · ส่งแล้ว → การ์ดเขียว สรุปคน / รูป + เปิดรายงานวันนี้
   - ตัวเลข 4 ช่อง: รายงานทั้งหมด · ส่งใน 7 วันล่าสุด · คนเฉลี่ย / วัน · วันที่มีปัญหา
   - แถบ 14 วันล่าสุด: วันที่ส่งแล้ว (✓ เขียว / ⚠ มีปัญหา) แตะเปิด · วันที่ยังไม่ส่ง แตะเขียนย้อนหลัง (ถามยืนยันก่อน)
   - รายการรายงานเป็นการ์ด: วัน + วันที่ · คน · รูป · ปัญหา · งานที่ทำ 2 บรรทัด · รูปย่อ 4 รูป — แตะเปิดฟอร์มเดิม (เลื่อนไปที่ฟอร์มให้)
   - ฟอร์มแก้รายงาน / ส่งออก Word · Excel / พิมพ์ — เดิมทั้งหมด · ข้อมูลชุดเดิม (dailies)
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
const MARK = 'v1.455.0 daily-redesign';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (daily-redesign)'); process.exit(0); }

// ---------- 1) ข้อมูล ----------
const A = 'out.dailyRows=rows; out.dailyEmpty=all.length===0;';
if (t.split(A).length !== 2) { console.error('✗ ข้อมูลรายงาน: หาจุดแก้ไม่เจอ'); process.exit(1); }
const JS = A + `   /* ${MARK} */
      { const DOW=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'], DS=['อา','จ','อ','พ','พฤ','ศ','ส'], MO=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        const isoOf=(d)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        const dOf=(s)=>{ const d=new Date(String(s||'').slice(0,10)+'T00:00:00'); return isNaN(d)?null:d; };
        const nW=(r)=>Number(r.crewTotal)||Number(r.workers)||0, prob=(r)=>!!String(r.problem||'').trim();
        const toEd=()=>setTimeout(()=>{ try{ const el=document.querySelector('[data-daily-ed]'); if(el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(e){} },120);
        const open=(r)=>()=>{ this.setState({ dailyOpenId:r.id }); toEd(); };
        const byD={}; rows.forEach(r=>{ if(r.date&&!byD[r.date]) byD[r.date]=r; });
        rows.forEach(r=>{ const d=dOf(r.date), ph=r.photoList||[], n=nW(r);
          Object.assign(r,{ dDow:d?DOW[d.getDay()]:'', dNum:d?String(d.getDate()):'—', dMon:d?(MO[d.getMonth()]+' '+String((d.getFullYear()+543)%100)):'', isToday:r.date===iso,
            wTxt:n?(n+' คน'):'ยังไม่ใส่คน', phTxt:ph.length?(ph.length+' รูป'):'ไม่มีรูป', hasProb:prob(r), probShort:String(r.problem||'').trim().split('\\n')[0].slice(0,110),
            thumbs:ph.slice(0,4).map(p=>({ key:p.key, st:{ ...p.bgStyle, width:62, height:62, borderRadius:10 } })), hasMore:ph.length>4, moreTxt:'+'+Math.max(0,ph.length-4),
            workLong:String(r.work||'').trim()||'— ยังไม่ได้เขียนงานที่ทำ —', cardBd:S.dailyOpenId===r.id?'#C6A96B':'#ECE6DA', cardBg:S.dailyOpenId===r.id?'#FFFBF1':'#fff', onCard:open(r) }); });
        const td=dOf(iso)||new Date(), tr=byD[iso];
        const days=(k)=>{ const a=[]; for(let i=k-1;i>=0;i--){ const d=new Date(td); d.setDate(td.getDate()-i); a.push(d); } return a; };
        out.dlTodayDone=!!tr; out.dlTodayTodo=!tr;
        out.dlTodayDate='วัน'+DOW[td.getDay()]+' ที่ '+td.getDate()+' '+MO[td.getMonth()]+' '+(td.getFullYear()+543);
        out.dlTodaySub=tr?((nW(tr)?nW(tr)+' คน':'ยังไม่ใส่จำนวนคน')+' · '+(tr.photoList||[]).length+' รูป'+(prob(tr)?' · ⚠ มีปัญหา':' · ไม่มีปัญหา')):'บันทึกสั้น ๆ ทุกเย็น: คนเข้างาน · งานที่ทำ · ปัญหา · รูปหน้างาน';
        out.onDlToday=()=>{ if(tr){ open(tr)(); return; } if(out.onDailyAdd){ out.onDailyAdd(); toEd(); } };
        out.onDlAddMore=()=>{ if(out.onDailyAdd){ out.onDailyAdd(); toEd(); } };
        const R7=days(7).map(isoOf).map(x=>byD[x]).filter(Boolean); const avg=R7.length?Math.round(R7.reduce((a,r)=>a+nW(r),0)/R7.length):0;
        out.dlStats=[ { key:'a', v:String(all.length), l:'รายงานทั้งหมด', c:'#1C1B18', ic:'📒' },
          { key:'b', v:R7.length+'/7', l:'ส่งใน 7 วันล่าสุด', c:R7.length>=6?'#2E7D46':(R7.length>=4?'#A67C1E':'#B4442E'), ic:'📅' },
          { key:'c', v:avg?String(avg):'—', l:'คนเฉลี่ย / วัน (7 วัน)', c:'#2F6FB0', ic:'👷' },
          { key:'d', v:String(R7.filter(prob).length), l:'วันที่มีปัญหา (7 วัน)', c:'#B0522F', ic:'⚠️' } ];
        out.dlDays=days(14).map(d=>{ const k=isoOf(d), r=byD[k], sun=d.getDay()===0, isT=k===iso, p=r&&prob(r);
          return { key:k, dn:isT?'วันนี้':DS[d.getDay()], d:String(d.getDate()), bg:r?(p?'#F6DCCD':'#DDEFD8'):(isT?'#FBF0CF':'#fff'), fg:r?'#1C1B18':(sun?'#B7AFA0':'#6E695E'),
            bd:isT?'#1C1B18':(r?(p?'#E8B79C':'#BFDDB6'):'#E4DED2'), mark:r?(p?'⚠':'✓'):(sun?'หยุด':'+'), mc:r?(p?'#B0522F':'#2E7D46'):'#B7AFA0', tip:r?('เปิดรายงานวันที่ '+dmy(k)):('เขียนรายงานของวันที่ '+dmy(k)),
            onPress:()=>{ if(r){ open(r)(); return; } if(!isT&&!window.confirm('เขียนรายงานย้อนหลังของวันที่ '+dmy(k)+' ?')) return;
              const nid='dl'+Date.now(); this.soAdd('dailies',{ id:nid, project:pid, date:k, by:me, workers:'', work:'', problem:'', photos:[] }); this.setState({ dailyOpenId:nid }); toEd(); } }; }); }`;
t = t.replace(A, () => JS);

// ---------- 2) หน้าตา ----------
const H0 = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:14px">\n            <button sc-camel-on-click="{{ onDailyAdd }}"';
const s = t.indexOf(H0); const e = t.indexOf('<sc-if value="{{ dailyOpenOn }}"', s);
if (s < 0 || t.indexOf(H0, s + 1) >= 0 || e < 0 || e - s > 9000 || !t.slice(s, e).includes('{{ dailyRows }}')) { console.error('✗ หน้ารายการรายงาน: ขอบเขตไม่ตรง'); process.exit(1); }
const UI = `<!-- ${MARK} -->
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin-bottom:14px;max-width:1000px">
            <sc-if value="{{ dlTodayTodo }}" hint-placeholder-val="{{ true }}">
              <div style="flex:1 1 340px;min-width:0;background:linear-gradient(135deg,#1C1B18 0%,#3B3226 100%);border-radius:20px;padding:20px 22px;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 26px rgba(28,27,24,.16)">
                <span style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#C9A961">DAILY REPORT · วันนี้</span>
                <span style="font-size:21px;font-weight:800;color:#F7F2E8;line-height:1.3">📝 ยังไม่ได้บันทึกรายงานวันนี้</span>
                <span style="font-size:13px;color:#D9CFBD">{{ dlTodayDate }}</span>
                <span style="font-size:13px;color:#B9AF9B;line-height:1.6">{{ dlTodaySub }}</span>
                <button sc-camel-on-click="{{ onDlToday }}" style="align-self:flex-start;margin-top:6px;border:none;background:#C9A961;color:#1C1B18;border-radius:14px;padding:13px 20px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;min-height:48px" style-hover="background:#E2BC66">＋ เขียนรายงานวันนี้</button>
              </div>
            </sc-if>
            <sc-if value="{{ dlTodayDone }}" hint-placeholder-val="{{ false }}">
              <div style="flex:1 1 340px;min-width:0;background:linear-gradient(135deg,#EAF5E6 0%,#F7FBF4 100%);border:1px solid #CFE3C9;border-radius:20px;padding:20px 22px;display:flex;flex-direction:column;gap:8px">
                <span style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#4E7C59">DAILY REPORT · วันนี้</span>
                <span style="font-size:21px;font-weight:800;color:#1F4D2B;line-height:1.3">✅ ส่งรายงานวันนี้แล้ว</span>
                <span style="font-size:13px;color:#4E6B54">{{ dlTodayDate }}</span>
                <span style="font-size:13.5px;color:#2E5E3A;font-weight:600">{{ dlTodaySub }}</span>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
                  <button sc-camel-on-click="{{ onDlToday }}" style="border:none;background:#1C1B18;color:#F4EFE6;border-radius:13px;padding:12px 18px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;min-height:46px">เปิดรายงานวันนี้ ›</button>
                  <button sc-camel-on-click="{{ onDlAddMore }}" style="border:1px solid #CFE3C9;background:#fff;color:#2E5E3A;border-radius:13px;padding:12px 16px;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;min-height:46px">＋ เพิ่มรายงานอีกใบ</button>
                </div>
              </div>
            </sc-if>
            <div style="flex:1 1 300px;min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
              <sc-for list="{{ dlStats }}" as="k" hint-placeholder-count="4">
                <div style="background:#fff;border:1px solid #ECE6DA;border-radius:16px;padding:13px 14px;display:flex;flex-direction:column;gap:3px;min-width:0">
                  <span style="font-size:18px;line-height:1">{{ k.ic }}</span>
                  <span class="num" style="font-size:24px;font-weight:800;color:{{ k.c }};line-height:1.15">{{ k.v }}</span>
                  <span style="font-size:12px;color:#6E695E;line-height:1.35">{{ k.l }}</span>
                </div>
              </sc-for>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #ECE6DA;border-radius:18px;padding:14px 16px;margin-bottom:16px;max-width:1000px">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:10px">
              <span style="font-size:14px;font-weight:800;color:#1C1B18">14 วันล่าสุด</span>
              <span style="font-size:12px;color:#8C877D">แตะวันที่เพื่อเปิดรายงาน · วันที่ยังไม่มี แตะเพื่อเขียนย้อนหลัง</span>
              <span style="flex:1"></span>
              <span style="font-size:12px;color:#2E7D46;font-weight:700">✓ ส่งแล้ว</span><span style="font-size:12px;color:#B0522F;font-weight:700">⚠ มีปัญหา</span><span style="font-size:12px;color:#8C877D;font-weight:700">+ ยังไม่มี</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(14,minmax(40px,1fr));gap:6px;overflow-x:auto;padding-bottom:2px">
              <sc-for list="{{ dlDays }}" as="d" hint-placeholder-count="14">
                <button sc-camel-on-click="{{ d.onPress }}" title="{{ d.tip }}" style="display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid {{ d.bd }};background:{{ d.bg }};border-radius:12px;padding:7px 2px;cursor:pointer;font-family:inherit;min-width:40px" style-hover="box-shadow:0 4px 12px rgba(28,27,24,.12)">
                  <span style="font-size:11px;color:#8C877D;white-space:nowrap">{{ d.dn }}</span>
                  <span class="num" style="font-size:16px;font-weight:800;color:{{ d.fg }}">{{ d.d }}</span>
                  <span style="font-size:11px;font-weight:800;color:{{ d.mc }};white-space:nowrap">{{ d.mark }}</span>
                </button>
              </sc-for>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;max-width:1000px">
            <span style="font-size:15px;font-weight:800;color:#1C1B18">รายงานทั้งหมด</span>
            <span class="num" style="font-size:12px;color:#8C877D">{{ dailySummary }}</span>
          </div>
          <sc-if value="{{ dailyEmpty }}" hint-placeholder-val="{{ false }}">
            <div style="background:#fff;border:1.5px dashed #D8D0BF;border-radius:18px;padding:34px 20px;text-align:center;max-width:1000px">
              <div style="font-size:34px">🗒️</div>
              <div style="font-size:15px;font-weight:800;color:#1C1B18;margin-top:6px">ยังไม่มีรายงานของโครงการนี้</div>
              <div style="font-size:13px;color:#6E695E;margin-top:6px;line-height:1.7">บันทึกสั้น ๆ ทุกเย็น: คนเข้างาน · งานที่ทำ · ปัญหา · รูปสูงสุด 20 รูป<br>แล้วส่งออกเป็น Word / Excel แนบอีเมลให้ลูกค้าได้ทันที</div>
            </div>
          </sc-if>
          <div style="display:flex;flex-direction:column;gap:10px;max-width:1000px">
            <sc-for list="{{ dailyRows }}" as="r" hint-placeholder-count="3">
              <div data-dl-card="1" sc-camel-on-click="{{ r.onCard }}" style="display:flex;flex-wrap:wrap;gap:12px 14px;align-items:flex-start;background:{{ r.cardBg }};border:1.5px solid {{ r.cardBd }};border-radius:18px;padding:14px;cursor:pointer" style-hover="border-color:#D9C9A3;box-shadow:0 8px 20px rgba(28,27,24,.07)">
                <div style="flex:none;width:66px;text-align:center;background:#F7F3EA;border-radius:14px;padding:8px 4px;display:flex;flex-direction:column;gap:1px">
                  <span style="font-size:11.5px;color:#8C877D">{{ r.dDow }}</span>
                  <span class="num" style="font-size:25px;font-weight:800;color:#1C1B18;line-height:1.1">{{ r.dNum }}</span>
                  <span style="font-size:11.5px;color:#8C877D">{{ r.dMon }}</span>
                </div>
                <div style="flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:7px">
                  <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                    <sc-if value="{{ r.isToday }}" hint-placeholder-val="{{ false }}"><span style="font-size:12px;font-weight:800;color:#8A5E14;background:#FBF0CF;border-radius:99px;padding:2px 10px">วันนี้</span></sc-if>
                    <span style="font-size:12.5px;font-weight:700;color:#2F5E8C;background:#E8F0F8;border-radius:99px;padding:2px 10px">👷 {{ r.wTxt }}</span>
                    <span style="font-size:12.5px;font-weight:700;color:#6E5424;background:#F3EAD9;border-radius:99px;padding:2px 10px">📷 {{ r.phTxt }}</span>
                    <sc-if value="{{ r.hasProb }}" hint-placeholder-val="{{ false }}"><span style="font-size:12.5px;font-weight:700;color:#B0522F;background:#FBE6DC;border-radius:99px;padding:2px 10px">⚠ มีปัญหา</span></sc-if>
                    <span style="font-size:12px;color:#8C877D">โดย {{ r.byShort }}</span>
                  </div>
                  <div style="font-size:14px;color:#2C2A25;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line">{{ r.workLong }}</div>
                  <sc-if value="{{ r.hasProb }}" hint-placeholder-val="{{ false }}"><div style="font-size:13px;color:#9A4A2A;line-height:1.5;background:#FDF3EE;border-radius:10px;padding:6px 10px">⚠ {{ r.probShort }}</div></sc-if>
                </div>
                <div style="flex:none;display:flex;gap:6px;align-items:center">
                  <sc-for list="{{ r.thumbs }}" as="p" hint-placeholder-count="0"><div style="{{ p.st }}"></div></sc-for>
                  <sc-if value="{{ r.hasMore }}" hint-placeholder-val="{{ false }}"><span style="width:62px;height:62px;border-radius:10px;background:#1C1B18;color:#F4EFE6;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">{{ r.moreTxt }}</span></sc-if>
                </div>
              </div>
            </sc-for>
          </div>
          `;
t = t.slice(0, s) + UI + t.slice(e);
// ---------- 3) ฟอร์มแก้รายงาน: จุดเลื่อนไปหา ----------
const ED = '<div style="background:#fff;border:1.5px solid #C6A96B;border-radius:16px;padding:15px;display:flex;flex-direction:column;gap:10px;max-width:860px;margin-top:12px">';
if (t.split(ED).length !== 2) { console.error('✗ ฟอร์มแก้รายงาน: หาจุดแก้ไม่เจอ'); process.exit(1); }
t = t.replace(ED, () => '<div data-daily-ed="1" style="background:#fff;border:1.5px solid #C6A96B;border-radius:18px;padding:15px;display:flex;flex-direction:column;gap:10px;max-width:1000px;margin-top:14px;scroll-margin-top:90px;box-shadow:0 10px 28px rgba(28,27,24,.08)">');
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ daily-redesign: การ์ดวันนี้ · ตัวเลข · 14 วัน · รายการแบบการ์ด · เลื่อนไปที่ฟอร์ม');
