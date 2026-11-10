#!/usr/bin/env node
/* =====================================================================
   หน้าแรก (เลือกโครงการ) แบบใหม่ — อ่านง่าย เหลือเฉพาะข้อมูลที่ต้องตัดสินใจ (มือถือเป็นหลัก)
     node scripts/patch-exec-dash.js
   1) แถบตัวเลขหลัก 4 ช่อง: งานในมือ (หลัง VO) · เก็บเงินแล้ว · ค้างรับ · โครงการต้องดูแล
      (บทบาทที่ไม่เห็นการเงิน: โครงการ · ล่าช้า · เฝ้าระวัง · ตามแผน / เสร็จ)
   2) "⚠ ต้องดูแล" — เรียงตามความเร่งด่วน สูงสุด 6 เรื่อง: ล่าช้ากว่าแผน / เลยกำหนดส่ง · ควรวางบิล · ค้างรับ · VO รออนุมัติ · เฝ้าระวัง
   3) รายการโครงการแบบแถวเดียว: ชื่อ · สถานะ (คำนวณจากความคืบหน้า เทียบเวลาที่ผ่านไป) · แถบงาน + เส้นเวลา · ป้ายเฉพาะเรื่องที่มี (ไม่แสดงเลข 0)
   4) สรุปการเงินรวม (ซ้ำกับแถบตัวเลข) แสดงเฉพาะมุมมองตาราง · โน้ตงานสำคัญ พับไว้ (แตะเพื่อเปิด)
   - มุมมอง "ตาราง" เดิมยังอยู่ · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
if (t.includes('_exd(S, cards, isT)')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าแรกแบบใหม่)'); process.exit(0); }

const KPI = `
        <!-- v1.371.0 exec-dash -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(46%,180px),1fr));gap:clamp(8px,2.4vw,12px);margin-bottom:12px">
          <sc-for list="{{ exd.kpis }}" as="k" hint-placeholder-count="4">
            <div style="background:#fff;border:1px solid #ECE6DA;border-radius:16px;padding:clamp(12px,3.4vw,16px) clamp(13px,3.6vw,18px);min-width:0">
              <div style="font-size:12.5px;color:#6E695E;font-weight:600;line-height:1.3">{{ k.label }}</div>
              <div class="num" style="font-size:clamp(23px,6.4vw,30px);font-weight:700;color:{{ k.color }};line-height:1.15;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ k.value }}</div>
              <div style="font-size:12px;color:#8C877D;margin-top:3px;line-height:1.35">{{ k.sub }}</div>
            </div>
          </sc-for>
        </div>
        <div style="background:#fff;border:1px solid {{ exd.attnRing }};border-radius:16px;padding:clamp(12px,3.4vw,16px) clamp(13px,3.6vw,18px);margin-bottom:14px">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span style="font-size:16px;font-weight:700;color:#1C1B18">{{ exd.attnTitle }}</span><span style="font-size:12.5px;color:#8C877D">{{ exd.attnSub }}</span></div>
          <sc-if value="{{ exd.attnNone }}" hint-placeholder-val="{{ false }}"><div style="font-size:14px;color:#4E7C59;margin-top:8px">ทุกโครงการเป็นไปตามแผน ไม่มีเรื่องที่ต้องตัดสินใจตอนนี้</div></sc-if>
          <sc-for list="{{ exd.attn }}" as="a" hint-placeholder-count="3">
            <button sc-camel-on-click="{{ a.onPress }}" style="display:flex;width:100%;align-items:center;gap:11px;border:none;border-top:1px solid #F2EDE3;background:transparent;text-align:left;padding:11px 0 10px;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;margin-top:6px" style-hover="background:#FBF8F2">
              <span style="width:10px;height:10px;border-radius:50%;background:{{ a.dot }};flex:none"></span>
              <span style="flex:1;min-width:0;line-height:1.4"><b style="font-size:14.5px;color:#1C1B18">{{ a.proj }}</b><span style="display:block;font-size:13.5px;color:#4A473F">{{ a.text }}</span></span>
              <span style="flex:none;font-size:12px;font-weight:700;color:{{ a.dot }};background:{{ a.bg }};border-radius:99px;padding:3px 9px;white-space:nowrap">{{ a.tag }}</span>
            </button>
          </sc-for>
        </div>`;

const LIST = `
        <sc-if value="{{ exd.list }}" hint-placeholder-val="{{ true }}">
        <div style="display:flex;align-items:baseline;gap:8px;margin:2px 2px 8px"><span style="font-size:15px;font-weight:700;color:#1C1B18">โครงการ</span><span style="font-size:12px;color:#8C877D">{{ exd.listSub }}</span></div>
        <div style="background:#fff;border:1px solid #ECE6DA;border-radius:16px;overflow:hidden">
          <sc-for list="{{ ppCards }}" as="p" hint-placeholder-count="3">
            <button sc-camel-on-click="{{ p.onPress }}" draggable="{{ p.cardDrag }}" sc-camel-on-drag-start="{{ p.onCardDragStart }}" sc-camel-on-drag-end="{{ p.onCardDragEnd }}" sc-camel-on-drag-over="{{ p.onCardDragOver }}" sc-camel-on-drag-leave="{{ p.onCardDragLeave }}" sc-camel-on-drop="{{ p.onCardDrop }}" title="แตะเพื่อเปิดโครงการ · ลากเพื่อจัดลำดับ" style="display:grid;grid-template-columns:{{ exd.cols }};gap:8px 16px;align-items:center;width:100%;text-align:left;border:none;border-top:1px solid #F2EDE3;box-shadow:inset 0 2px 0 {{ p.rowRing }};background:#fff;padding:13px clamp(13px,3.6vw,18px);font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent" style-hover="background:#FBF8F2" style-active="background:#FBF8F2">
              <div style="min-width:0;order:1"><div style="font-size:15.5px;font-weight:700;color:#1C1B18;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ p.name }}</div><div style="font-size:12px;color:#8C877D;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ p.exSub }}</div></div>
              <div style="min-width:0;order:{{ exd.pgOrder }};grid-column:{{ exd.pgCol }}">
                <div style="position:relative;height:9px;border-radius:9px;background:#F2EDE3"><div style="height:100%;width:{{ p.pct }};background:{{ p.exBar }};border-radius:9px"></div><span title="เวลาที่ผ่านไปของสัญญา" style="position:absolute;top:-3px;left:{{ p.exTime }};width:2px;height:15px;border-radius:2px;background:#1C1B18;opacity:{{ p.exTimeOp }}"></span></div>
                <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:5px"><span class="num" style="font-weight:700;color:#1C1B18">งาน {{ p.pct }}</span><span style="color:{{ p.exTimeC }}">{{ p.exTimeTx }}</span></div>
              </div>
              <span style="order:2;justify-self:end;font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;background:{{ p.exStBg }};color:{{ p.exStC }};white-space:nowrap">{{ p.exSt }}</span>
              <sc-if value="{{ p.exHasFlags }}" hint-placeholder-val="{{ false }}">
                <div style="order:4;grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap">
                  <sc-for list="{{ p.exFlags }}" as="f" hint-placeholder-count="2"><span style="font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px;background:{{ f.b }};color:{{ f.c }}">{{ f.t }}</span></sc-for>
                </div>
              </sc-if>
            </button>
          </sc-for>
        </div>
        </sc-if>
        <sc-if value="{{ exd.oldCards }}" hint-placeholder-val="{{ false }}">`;

const NOTES_BTN = `<button sc-camel-on-click="{{ exd.onNotes }}" style="display:flex;align-items:center;gap:10px;width:100%;margin-top:clamp(14px,4vw,20px);border:1px solid #ECE6DA;background:#fff;border-radius:14px;padding:13px clamp(13px,3.6vw,18px);font-family:inherit;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent" style-hover="border-color:#C9A961"><span style="font-size:15px">📝</span><span style="flex:1;font-size:14px;font-weight:700;color:#1C1B18">โน้ตงานสำคัญ <span style="font-weight:500;color:#8C877D;font-size:12.5px">{{ hnCount }}</span></span><span style="font-size:12.5px;color:#9A8767;font-weight:600">{{ exd.notesBtn }}</span></button>
        <sc-if value="{{ exd.notesOpen }}" hint-placeholder-val="{{ false }}">
        `;

const METHOD = `  // v1.371.0 หน้าแรกแบบใหม่ (exec-dash): ตัวเลขหลัก · ต้องดูแล · รายการโครงการแถวเดียว
  _exd(S, cards, isT){ const L=Array.isArray(cards)?cards:[]; const mob=(S.vw||1440)<760; const now=Date.now(); const D=864e5;
    const pd=(s)=>{ const m=String(s||'').match(/^(\\d{4})-(\\d{2})-(\\d{2})/); return m?new Date(+m[1],+m[2]-1,+m[3]).getTime():null; };
    const fin=L.some(p=>p.finShow); const attn=[]; let nLate=0, nWatch=0, nDone=0, nOk=0;
    const R=(c,b)=>({ c, b, dot:c, bg:b }); const RED=R('#C4442E','#F8E4DF'), AMB=R('#B0851B','#FAF1D6'), GRN=R('#4E7C59','#E7F1EB'), BLU=R('#2A7DA3','#E1EEF4'), GRY=R('#6E695E','#F2EDE3');
    const out=L.map(p=>{ const x=p._x||{}; const pct=Number(p.pctNum)||0; const s=pd(x.s), e=pd(x.e);
      let el=null; if(s!=null&&e!=null&&e>s) el=Math.max(0,Math.min(1,(now-s)/(e-s)));
      const over=e!=null&&now>e+D&&pct<100?Math.floor((now-e)/D):0; const gap=el!=null?Math.round(el*100-pct):0;
      const colPct=fin&&p.finShow&&x.rev>0?Math.round(x.rc/x.rev*100):null;
      let st, k;
      if(pct>=100){ st='เสร็จงาน'; k=GRN; nDone++; }
      else if(over>0||x.h==='ล่าช้า'||gap>=20){ st='ล่าช้า'; k=RED; nLate++; }
      else if(x.h==='เฝ้าระวัง'||gap>=10){ st='เฝ้าระวัง'; k=AMB; nWatch++; }
      else if(el===0){ st='ยังไม่เริ่ม'; k=BLU; nOk++; }
      else { st='ตามแผน'; k=GRN; nOk++; }
      const go=p.onPress; const nm=p.name;
      if(over>0) attn.push({ r:0, proj:nm, text:'เลยกำหนดส่งงาน '+over+' วัน · งานเสร็จ '+pct+'%', tag:'เลยกำหนด', ...RED, onPress:go });
      else if(st==='ล่าช้า') attn.push({ r:1, proj:nm, text:gap>0?('งานเสร็จ '+pct+'% แต่เวลาผ่านไป '+Math.round(el*100)+'% — ช้ากว่าแผนประมาณ '+gap+'%'):'สถานะโครงการ: ล่าช้า', tag:'ล่าช้า', ...RED, onPress:go });
      if(colPct!=null&&pct>=25&&pct-colPct>=30) attn.push({ r:2, proj:nm, text:'งานเสร็จ '+pct+'% แต่เก็บเงินได้ '+colPct+'% — ควรวางบิลงวดถัดไป', tag:'ควรวางบิล', ...AMB, onPress:go });
      if(fin&&x.out>0) attn.push({ r:3, proj:nm, text:'วางบิลแล้วยังไม่ได้รับ '+this.money(x.out), tag:'ค้างรับ', ...AMB, onPress:go });
      if(x.chP>0) attn.push({ r:4, proj:nm, text:'VO / งานเปลี่ยนแปลง รออนุมัติ '+x.chP+' รายการ'+(fin&&x.voP?(' · '+this.money(x.voP)):''), tag:'รออนุมัติ', ...AMB, onPress:go });
      if(st==='เฝ้าระวัง'&&!attn.some(a=>a.proj===nm&&a.r<=1)) attn.push({ r:5, proj:nm, text:gap>0?('ช้ากว่าแผนเล็กน้อย ('+gap+'%) — ติดตามใกล้ชิด'):'สถานะโครงการ: เฝ้าระวัง', tag:'เฝ้าระวัง', ...AMB, onPress:go });
      const flags=[]; if(x.chP>0) flags.push({ t:'VO รออนุมัติ '+x.chP, ...AMB }); if(fin&&x.out>0) flags.push({ t:'ค้างรับ '+this.money(x.out), ...AMB });
      if(colPct!=null&&pct>0) flags.push({ t:'เก็บเงิน '+colPct+'%', ...(pct-colPct>=30?RED:GRY) });
      if(x.dwP>0&&(S.me||{}).roleKey==='designer') flags.push({ t:'แบบรออนุมัติ '+x.dwP, ...BLU });
      const tTx = over>0 ? ('เลยกำหนด '+over+' วัน') : el==null ? (p.dates||'') : el>=1 ? 'ครบกำหนดแล้ว' : el===0 ? 'ยังไม่ถึงวันเริ่ม' : ('เวลาผ่านไป '+Math.round(el*100)+'%');
      return { ...p, exSt:st, exStC:k.c, exStBg:k.b, exBar:k===RED?'#C4442E':(k===AMB?'#C9A961':'#4E7C59'), exTime:(el==null?0:Math.round(el*100))+'%', exTimeOp:el==null?0:0.85,
        exTimeTx:tTx, exTimeC:over>0?'#C4442E':'#8C877D', exSub:[p.code, p.client&&p.client!=='—'?p.client:'', p.phase&&p.phase!=='—'?p.phase:''].filter(Boolean).join(' · '), exFlags:flags, exHasFlags:flags.length>0 }; });
    attn.sort((a,b)=>a.r-b.r);
    // เรื่องเดียวกันตั้งแต่ 3 โครงการขึ้นไป → รวมเป็นบรรทัดเดียว (อ่านง่ายกว่าแสดงซ้ำหลายแถว)
    const G=[]; const seen={}; attn.forEach(a=>{ const same=attn.filter(b=>b.tag===a.tag); if(same.length<3){ G.push(a); return; } if(seen[a.tag]) return; seen[a.tag]=1;
      const lab={ 'ควรวางบิล':'งานคืบหน้าแล้ว แต่ยังเก็บเงินได้น้อย — ควรวางบิล', 'ค้างรับ':'วางบิลแล้วยังไม่ได้รับเงิน', 'รออนุมัติ':'มี VO / งานเปลี่ยนแปลงรออนุมัติ', 'ล่าช้า':'ช้ากว่าแผน', 'เลยกำหนด':'เลยกำหนดส่งงาน', 'เฝ้าระวัง':'ช้ากว่าแผนเล็กน้อย — ติดตามใกล้ชิด' }[a.tag]||a.text;
      G.push({ ...a, proj:same.length+' โครงการ · '+lab, text:same.map(b=>b.proj).join(' · ') }); });
    const A=G.slice(0,6); const nP=new Set(attn.map(a=>a.proj)).size;
    const sum=(k)=>L.reduce((s,p)=>s+(p.finShow&&p._x?(Number(p._x[k])||0):0),0);
    const rev=sum('rev'), rc=sum('rc'), ot=sum('out'), inv=sum('inv'); const need=nLate+nWatch;
    const kpis = fin ? [
      { label:'งานในมือ (หลังปรับ VO)', value:this.money(rev), sub:L.length+' โครงการ', color:'#1C1B18' },
      { label:'เก็บเงินแล้ว', value:(rev>0?Math.round(rc/rev*100):0)+'%', sub:'รับแล้ว '+this.money(rc), color:'#2E7D46' },
      { label:'ค้างรับ (วางบิลแล้ว)', value:this.money(ot), sub:'ยังไม่วางบิล '+this.money(Math.max(0,rev-inv)), color:ot>0?'#B0851B':'#1C1B18' },
      { label:'โครงการต้องดูแล', value:need+' / '+L.length, sub:nLate?('ล่าช้า '+nLate+(nWatch?(' · เฝ้าระวัง '+nWatch):'')):(nWatch?('เฝ้าระวัง '+nWatch):'ทุกโครงการตามแผน'), color:nLate?'#C4442E':(nWatch?'#B0851B':'#4E7C59') } ]
    : [
      { label:'โครงการของฉัน', value:String(L.length), sub:nDone?('เสร็จงานแล้ว '+nDone):'กำลังดำเนินการ', color:'#1C1B18' },
      { label:'ล่าช้า', value:String(nLate), sub:'ต้องเร่ง / แก้แผน', color:nLate?'#C4442E':'#4E7C59' },
      { label:'เฝ้าระวัง', value:String(nWatch), sub:'ติดตามใกล้ชิด', color:nWatch?'#B0851B':'#4E7C59' },
      { label:'ตามแผน', value:String(nOk), sub:'ไม่มีปัญหา', color:'#4E7C59' } ];
    let no=S.exdNotes; if(no==null){ try{ no=localStorage.getItem('wc_exd_notes')==='1'; }catch(e){ no=false; } }
    return { kpis, attn:A, attnNone:!A.length, attnTitle:A.length?'⚠ ต้องดูแล':'✓ ไม่มีเรื่องเร่งด่วน', attnSub:A.length?(attn.length+' เรื่อง · '+nP+' โครงการ'+(G.length>A.length?' · แสดง '+A.length+' เรื่องแรก':'')):'', attnRing:A.some(a=>a.c==='#C4442E')?'#E8BDB2':'#ECE6DA',
      list:!isT, oldCards:false, finOld:isT, listSub:L.length+' โครงการ · เส้นดำบนแถบ = เวลาที่ผ่านไปของสัญญา', cards:out,
      cols:mob?'minmax(0,1fr) auto':'minmax(0,1.5fr) minmax(0,1.3fr) auto', pgOrder:mob?3:1, pgCol:mob?'1/-1':'auto',
      notesOpen:!!no, notesBtn:no?'ซ่อน ▴':'เปิด ▾', onNotes:()=>{ const v=!no; try{ localStorage.setItem('wc_exd_notes', v?'1':'0'); }catch(e){} this.setState({ exdNotes:v }); } }; }
`;

const E = [
  ['ตัวเลขดิบในการ์ดโครงการ', 'return { id:p.id, code:p.code, name:p.name,', (a) => "return { _x:{ s:p.startISO||'', e:p.endISO||'', h:p.health||'', chP:Number(st.chPending)||0, dwP:dwPend }, id:p.id, code:p.code, name:p.name,"],
  ['ตัวเลขการเงินดิบ', 'return { finShow:true,', (a) => 'return { finShow:true, _fx:{ rev, rc, out, inv, voP },'],
  ['คำนวณหน้าแรกใหม่', 'Object.assign(v, { ppIsTable:isT, ppIsCard:!isT,', (a) => "v.ppCards=Array.isArray(v.ppCards)?v.ppCards.map(p=>p._fx?{ ...p, _x:{ ...(p._x||{}), ...p._fx } }:p):v.ppCards; v.exd=this._exd(S, v.ppCards, isT); v.exd.finOld=isT&&!!v.ppFinShow; if(!isT) v.ppCards=v.exd.cards;\n      " + a],
  ['ตัวเลขหลัก + ต้องดูแล', '<sc-if value="{{ ppIsTable }}" hint-placeholder-val="{{ false }}">\n          <div class="hscroll wc-grid"', (a) => KPI.trimStart() + '\n\n        ' + a],
  ['รายการโครงการแถวเดียว', '<sc-if value="{{ ppIsCard }}" hint-placeholder-val="{{ true }}">', (a) => LIST.trimStart()],
  ['สรุปการเงินรวม: เฉพาะมุมมองตาราง', '<sc-if value="{{ ppFinShow }}" hint-placeholder-val="{{ false }}">\n            <div style="margin-top:16px;padding-top:15px;border-top:1px solid #ECE6DA">\n              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">\n                <span class="kicker" style="font-size:9px;color:#B49A6E;letter-spacing:.16em">สรุปการเงินรวมทุกโครงการ</span>',
    (a) => a.replace('{{ ppFinShow }}', '{{ exd.finOld }}')],
  ['ตัวช่วย _exd', '  _claimOpen(pid){', (a) => METHOD + a],
  ['ปุ่มมุมมอง: การ์ด → รายการ', '<rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"></rect></svg>การ์ด</button>', (a) => a.replace('</svg>การ์ด</button>', '</svg>รายการ</button>')],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, f(a));
}
// โน้ตงานสำคัญ: กล่องสีขาวใต้รายการโครงการ → พับไว้ (ปุ่มเปิด/ซ่อน) · หาแท็กปิดของกล่องด้วยการนับ <div>
{
  const head = '<div style="background:#fff;border:1px solid #ECE6DA;border-radius:clamp(14px,4vw,20px);padding:2px clamp(14px,4vw,24px) clamp(16px,4vw,24px);margin-top:clamp(18px,4vw,26px)">';
  const n = t.split(head).length - 1;
  if (n !== 1) { console.error('✗ จุด "กล่องโน้ต" พบ ' + n + ' ครั้ง (ต้อง 1) — ไม่แก้ไฟล์'); process.exit(1); }
  const i0 = t.indexOf(head); let i = i0 + head.length, depth = 1; const re = /<div\b|<\/div>/g; re.lastIndex = i; let m;
  while ((m = re.exec(t))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) break; }
  if (!m) { console.error('✗ หาแท็กปิดกล่องโน้ตไม่เจอ — ไม่แก้ไฟล์'); process.exit(1); }
  const end = m.index + 6;
  // ห่อกล่องโน้ตด้วย notesOpen (ปุ่มเปิด / ซ่อนอยู่ด้านบน)
  t = t.slice(0, i0) + NOTES_BTN + t.slice(i0, end) + '\n        </sc-if>' + t.slice(end);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าแรกแบบใหม่: ตัวเลขหลัก 4 ช่อง · ต้องดูแล · รายการโครงการแถวเดียว · โน้ตพับได้');
