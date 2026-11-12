#!/usr/bin/env node
/* =====================================================================
   การ์ดตัวเลขสรุป (KPI) แตะได้ทุกช่อง → ไปรายการที่กรองตามตัวเลขนั้น
     node scripts/patch-kpi-go.js
   - หน้าแรก (exec-dash): โครงการ · ล่าช้า · เฝ้าระวัง · ตามแผน  /  งานในมือ · เก็บเงินแล้ว · ค้างรับ · ต้องดูแล
       → กรองรายการ "โครงการ" ด้านล่าง + แถบ "กรอง: … ✕" + เลื่อนไปที่รายการ (แตะซ้ำ = ยกเลิก)
   - สั่งผลิต / นำเข้า · RFI · ความล่าช้า (Delay) (แท็บในหน้าโครงการ)
       → ตั้งตัวกรองสถานะของรายการในหน้าเดียวกัน (แตะซ้ำ = ทั้งหมด) · เพิ่มตัวเลือกกลุ่มสถานะที่การ์ดนับรวม
   ไม่แตะ: หน้างานของฉัน (work) · การ์ดที่กดได้อยู่แล้ว (onGo / onPress) · การ์ดใบเสนอราคา / งานเพิ่ม-ลด ในหน้า QS (ซ่อนอยู่ตั้งแต่ v1.132.0)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ / ไม่ unique → หยุด ไม่เขียนไฟล์
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

let done = 0, had = 0;
const fail = (m) => { console.error('✗ ' + m + ' — ไม่แก้ไฟล์'); process.exit(1); };
const count = (s) => t.split(s).length - 1;
// แทนที่จุดเดียว (ต้องเจอ 1 ครั้งพอดี) · มีผลลัพธ์อยู่แล้ว = ข้าม
const rep = (name, a, b) => {
  if (t.includes(b)) { had++; return; }
  const n = count(a); if (n !== 1) fail(name + ' (พบ ' + n + ' จุด)');
  t = t.replace(a, () => b); done++;
};

// ---------- 1) markup: การ์ด <div> → <button> กดได้ ----------
const HOVER = 'border-color:#C9A961;box-shadow:0 4px 14px rgba(28,27,24,.08);transform:translateY(-1px)';
const tap = (name, list) => {
  const open = '<sc-for list="{{ ' + list + ' }}"';
  const n = count(open); if (n !== 1) fail(name + ': sc-for ' + list + ' (พบ ' + n + ')');
  const i = t.indexOf(open), e = t.indexOf('</sc-for>', i);
  let seg = t.slice(i, e);
  if (seg.includes('{{ k.onGo }}')) { had++; return; }
  const d = seg.indexOf('<div style="'); const c = seg.lastIndexOf('</div>');
  if (d < 0 || c < 0 || c < d) fail(name + ': โครงการ์ดไม่ตรง');
  seg = seg.slice(0, d) + '<button sc-camel-on-click="{{ k.onGo }}" title="{{ k.goTip }}" style-hover="' + HOVER + '" style="display:block;width:100%;font-family:inherit;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s;-webkit-tap-highlight-color:transparent;'
    + seg.slice(d + '<div style="'.length, c) + '</button>' + seg.slice(c + '</div>'.length);
  t = t.slice(0, i) + seg + t.slice(e); done++;
};
tap('หน้าแรก', 'exd.kpis');
tap('สั่งผลิต/นำเข้า', 'spoKpis');
tap('RFI', 'rfiKpis');
tap('ความล่าช้า', 'dlyKpi');

// ---------- 2) helper: ใส่ onGo ให้การ์ดตามลำดับ ----------
rep('helper _kpiGo', '  QT_VALS(S){',
  "  // v1.376.0 kpi-go: การ์ดตัวเลขแตะได้ → ตั้งตัวกรองของรายการ (แตะซ้ำ = ทั้งหมด) · extra = ค่าที่ล้างพร้อมกัน (ให้ตรงกับที่การ์ดนับ)\n"
  + "  _kpiGo(key, vals, cur, arr, extra){ return (Array.isArray(arr)?arr:[]).map((k,i)=>{ const v=vals[i]; if(v==null) return k;\n"
  + "    return { ...k, goTip:(cur===v&&v!=='all')?'แตะอีกครั้งเพื่อดูทั้งหมด':'แตะเพื่อดูรายการ', onGo:()=>this.setState({ ...(extra||{}), [key]:(cur===v&&v!=='all')?'all':v }) }; }); }\n"
  + '  QT_VALS(S){');

// ---------- 3) สั่งผลิต / นำเข้า ----------
rep('spo: กรองกลุ่มสถานะ', ': r.status===f)).map(mk);',
  ": f==='g_prod'?['ordered','deposit','production'].indexOf(r.status)>=0 : f==='g_ship'?['shipping','customs','qc'].indexOf(r.status)>=0 : r.status===f)).map(mk);");
rep('spo: ตัวเลือกกลุ่ม', "out.spoFilterOpts=[{value:'all',label:'ทุกสถานะ'},{value:'order',label:'ใกล้ถึงกำหนดสั่ง'},",
  "out.spoFilterOpts=[{value:'all',label:'ทุกสถานะ'},{value:'order',label:'ใกล้ถึงกำหนดสั่ง'},{value:'g_prod',label:'สั่งแล้ว / กำลังผลิต'},{value:'g_ship',label:'ขนส่ง / ศุลกากร / QC'},");
rep('spo: การ์ด → ตัวกรอง', 'out.spoFilterVal=f;',
  "out.spoKpis=this._kpiGo('spoFilter', ['order','g_prod','g_ship','delivered'], f, out.spoKpis); out.spoFilterVal=f;");

// ---------- 4) RFI ----------
rep('rfi: กรองค้างเกินกำหนด', "const rows=all.filter(r=>f==='all'||r.status===f)",
  "const rows=all.filter(r=>f==='all'||(f==='late'?(r.status==='open'&&((r.needBy&&D(r.needBy)<0)||Math.max(0,-(D(r.date)||0))>3)):r.status===f))");
rep('rfi: ตัวเลือก', "out.rfiFilterOpts=[{value:'all',label:'ทั้งหมด'},",
  "out.rfiFilterOpts=[{value:'all',label:'ทั้งหมด'},{value:'late',label:'ค้างเกินกำหนด'},");
rep('rfi: การ์ด → ตัวกรอง', 'out.rfiFilterVal=f;',
  "out.rfiKpis=this._kpiGo('rfiFilter', ['open','late','answered','closed'], f, out.rfiKpis); out.rfiFilterVal=f;");

// ---------- 5) ความล่าช้า (Delay) ----------
rep('dly: กรองฝั่ง Owner / ตกลงแล้ว', "(fs==='ours'?!(CM[x.cause]||[])[2]:x.status===fs)",
  "(fs==='ours'?!(CM[x.cause]||[])[2]:fs==='theirs'?!!(CM[x.cause]||[])[2]:fs==='agreedc'?(x.status==='agreed'||x.status==='closed'):x.status===fs)");
rep('dly: ตัวเลือก + การ์ด', "['ours','ฝั่งเราล่าช้า']].map(([k,l])=>({ value:k, label:l }));",
  "['ours','ฝั่งเราล่าช้า'],['theirs','ฝั่ง Owner / ภายนอก'],['agreedc','Owner ตกลงแล้ว + ปิดเรื่อง']].map(([k,l])=>({ value:k, label:l }));\n"
  + "    out.dlyKpi=this._kpiGo('dlyFilter', ['theirs','ours','overdue','agreedc'], fs, out.dlyKpi);   // v1.376.0 kpi-go");

// ---------- 6) หน้าแรก (exec-dash): กรองรายการโครงการ ----------
rep('หน้าแรก: เรียกตัวกรอง', 'if(!isT) v.ppCards=v.exd.cards;', 'if(!isT) v.ppCards=v.exd.cards; this._exdKpiGo(S, v, isT);');
rep('หน้าแรก: เมธอด', '  _exd(S, cards, isT){',
  "  // v1.376.0 kpi-go: การ์ดตัวเลขหน้าแรก → กรองรายการโครงการด้านล่าง (แตะซ้ำ = ทุกโครงการ)\n"
  + "  _exdKpiGo(S, v, isT){ const e=v.exd; if(!e||!Array.isArray(e.kpis)) return;\n"
  + "    const fin=e.kpis.length>0&&String(e.kpis[0].label||'').indexOf('งานในมือ')===0;\n"
  + "    const F=fin?[['','ทุกโครงการ'],['rc','รับเงินแล้ว'],['out','มีค้างรับ (วางบิลแล้ว)'],['need','ต้องดูแล · ล่าช้า + เฝ้าระวัง']]:[['','ทุกโครงการ'],['late','ล่าช้า'],['watch','เฝ้าระวัง'],['ok','ตามแผน / ยังไม่เริ่ม']];\n"
  + "    const T={ rc:p=>!!p.finShow&&Number((p._x||{}).rc)>0, out:p=>!!p.finShow&&Number((p._x||{}).out)>0, need:p=>p.exSt==='ล่าช้า'||p.exSt==='เฝ้าระวัง', late:p=>p.exSt==='ล่าช้า', watch:p=>p.exSt==='เฝ้าระวัง', ok:p=>p.exSt==='ตามแผน'||p.exSt==='ยังไม่เริ่ม' };\n"
  + "    const cur=S.exdSt||''; const toList=()=>setTimeout(()=>{ try{ const el=document.getElementById('exd-list'); if(el) el.scrollIntoView({ block:'start' }); }catch(x){} }, 60);\n"
  + "    e.kpis=e.kpis.map((k,i)=>{ const f=(F[i]||[''])[0]; return { ...k, goTip:(cur&&cur===f)?'แตะอีกครั้งเพื่อดูทุกโครงการ':'แตะเพื่อดูรายการโครงการ',\n"
  + "      onGo:()=>{ const nx=(cur===f)?'':f; const st={ exdSt:nx }; if(isT){ st.ppView='card'; try{ localStorage.setItem('wc_pp_view','card'); }catch(x){} } this.setState(st); toList(); } }; });\n"
  + "    const L=F.find(x=>x[0]===cur); e.fOn=false; e.fLabel=''; e.onFClear=()=>this.setState({ exdSt:'' });\n"
  + "    if(!isT&&cur&&T[cur]&&L&&Array.isArray(v.ppCards)){ v.ppCards=v.ppCards.filter(T[cur]); e.fOn=true; e.fLabel=L[1]+' · '+v.ppCards.length+' โครงการ'; } }\n"
  + '  _exd(S, cards, isT){');
rep('หน้าแรก: แถบกรอง', '<div style="display:flex;align-items:baseline;gap:8px;margin:2px 2px 8px"><span style="font-size:15px;font-weight:700;color:#1C1B18">โครงการ</span><span style="font-size:12px;color:#8C877D">{{ exd.listSub }}</span></div>',
  '<div id="exd-list" style="display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 2px 8px;scroll-margin-top:84px"><span style="font-size:15px;font-weight:700;color:#1C1B18">โครงการ</span><span style="font-size:12px;color:#8C877D">{{ exd.listSub }}</span>'
  + '<sc-if value="{{ exd.fOn }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ exd.onFClear }}" title="ล้างตัวกรอง — ดูทุกโครงการ" style="margin-left:auto;border:1px solid #E9D9A8;background:#FBF3DE;color:#7A5A12;border-radius:99px;padding:5px 11px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">กรอง: {{ exd.fLabel }} ✕</button></sc-if></div>');

if (!done) { console.log('✓ มีครบแล้ว — ไม่ต้องแก้ (' + had + ' จุด)'); process.exit(0); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ การ์ดตัวเลขแตะได้ — แก้ ' + done + ' จุด' + (had ? (' · มีแล้ว ' + had) : ''));
