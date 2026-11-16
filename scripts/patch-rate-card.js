#!/usr/bin/env node
/* =====================================================================
   v1.410.0 rate-card — ผู้บริหารอนุมัติ 16/11/2026: อัตรากลาง (ราคาเรียกเก็บลูกค้า) ตั้งที่เดียว ใช้ทุกที่
     node scripts/patch-rate-card.js        (รันหลัง patch-daily-ot.js)
   1) ตั้งค่าระบบ → การ์ดใหม่ "อัตรากลาง · ราคาเรียกเก็บลูกค้า" (ย้ายหน้าตั้งค่าจากแอป Claim มาไว้ที่นี่)
      · ค่าแรงช่าง (฿ / คน / วัน) — ชุดเดิมของแอป Claim อยู่ครบ ไม่ต้องย้ายข้อมูล · ล่วงเวลา (ชม.ต่อวัน + ตัวคูณ) · ค่าดำเนินการ + กำไร (OH&P %)
      · หมวดใหม่: บุคลากรควบคุมงาน · งานแบบและเอกสาร · เดินทางและขนส่ง · เครื่องมือและอุปกรณ์ · ค่าใช้จ่ายหน้างาน · งานป้องกันและตัวอย่าง
        แต่ละรายการ: ชื่อ · อัตรา · หน่วย · สวิตช์ "คิดตามเวลา" (ใช้คำนวณค่า Preliminary ของ EOT — เฉพาะหน่วย วัน / เดือน)
        ปุ่ม "＋ ใส่รายการแนะนำ" ใส่ชื่อรายการมาตรฐานให้ (ไม่ใส่ตัวเลข — ผู้บริหาร / QS กรอกอัตราเอง)
      · สรุป "ค่า Preliminary ต่อวัน" จากรายการคิดตามเวลา (เดือน = 30 วัน) · ประวัติแก้ไขล่าสุด
      · แก้ไขได้: Super Admin · Director · QS Manager · เห็นได้: ผู้มีสิทธิ์ "ตัวเลขเงินโครงการ" ที่เปิดหน้าตั้งค่าระบบได้
   2) VO / SI / EOT: ปุ่ม "🧮 คำนวณจากอัตรากลาง" ใต้ช่องมูลค่า → เลือกรายการ × จำนวน × วัน → ยอด (ไม่รวม VAT) ใส่ช่องมูลค่าให้
      · EOT: ปุ่ม "＋ รายการคิดตามเวลาทั้งหมด" = ค่า Preliminary × จำนวนวันที่ขยาย · เก็บรายการคำนวณไว้ในแถว (changes[].calc) เปิดดู / แก้ภายหลังได้
   3) รายงานประจำวัน (OT) อ่านอัตรากลางจาก state เดียวกัน (เดิมดึงแยกทุก 5 นาที)
   ข้อมูล: app_state 'claimRates' (คีย์เดิมของแอป Claim — ใช้เป็นที่เก็บอัตรากลางทั้งหมด)
     { trades:[{ n, rate }], ohp, ot:{ hours, m1, m2, m3 }, items:[{ id, g, n, u, rate, t }], by, at, log:[{ at, by, what }] }
     แอปหลักเขียนทีละหัวข้อผ่าน _stKeySet (ไม่ทับหัวข้ออื่น) · ราคาเรียกเก็บลูกค้าเท่านั้น ห้ามใส่ต้นทุนจริง
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.410.0 rate-card';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (อัตรากลาง)'); process.exit(0); }
if (!t.includes('v1.408.0 daily-ot')) { console.error('✗ ต้องรัน scripts/patch-daily-ot.js ก่อน'); process.exit(1); }

// ---------------------------------------------------------------------
// ก) ตัวช่วย + ข้อมูลหน้าตั้งค่า + ตัวคำนวณ VO / EOT
// ---------------------------------------------------------------------
const A_OLD = "  _otKinds(){ return [['n','วันทำงานปกติ · หลังเวลางาน','m1']";
const A_NEW =
  "  // ===== " + MARK + ": อัตรากลาง (ราคาเรียกเก็บลูกค้า) — app_state 'claimRates' { trades, ohp, ot, items:[{ id, g, n, u, rate, t }], by, at, log } · เขียนทีละหัวข้อผ่าน _stKeySet =====\n" +
  "  RATE_GROUPS(){ return [['labor','ค่าแรงช่าง'],['staff','บุคลากรควบคุมงาน'],['doc','งานแบบและเอกสาร'],['trans','เดินทางและขนส่ง'],['tool','เครื่องมือและอุปกรณ์'],['site','ค่าใช้จ่ายหน้างาน'],['prot','งานป้องกันและตัวอย่าง']]; }\n" +
  "  RATE_UNITS(){ return ['วัน','เดือน','เที่ยว','แผ่น','ชุด','ตร.ม.','ครั้ง','เหมา']; }\n" +
  "  // รายการแนะนำ [ชื่อ, หน่วย, คิดตามเวลา] — ใส่ชื่อให้อย่างเดียว ไม่มีตัวเลข (อัตราให้ผู้บริหาร / QS กรอก)\n" +
  "  RATE_SEED(){ return { staff:[['Project Manager','เดือน',1],['Site Manager','เดือน',1],['Site Engineer','เดือน',1],['Foreman','เดือน',1],['จป. (เจ้าหน้าที่ความปลอดภัย)','เดือน',1],['QS','เดือน',1],['ธุรการ / Store','เดือน',1]],\n" +
  "    doc:[['Shop drawing','แผ่น',0],['As-built drawing','แผ่น',0],['ภาพ 3D / Perspective','ชุด',0],['พิมพ์แบบ','ชุด',0]],\n" +
  "    trans:[['รถกระบะ','เที่ยว',0],['รถ 6 ล้อ','เที่ยว',0],['เบี้ยเลี้ยงต่างจังหวัด','วัน',0],['ที่พักต่างจังหวัด','วัน',0]],\n" +
  "    tool:[['นั่งร้าน','เดือน',1],['ลิฟต์ขนของ / Hoist','เดือน',1],['เครื่องมือเช่า','วัน',0]],\n" +
  "    site:[['สำนักงานสนาม','เดือน',1],['ไฟฟ้า / น้ำประปาชั่วคราว','เดือน',1],['รปภ.','เดือน',1],['ทำความสะอาด','เดือน',1],['ขนขยะ','เที่ยว',0],['ประกันภัยงานก่อสร้าง','เดือน',1],['ค่าธรรมเนียมหนังสือค้ำประกัน','เดือน',1]],\n" +
  "    prot:[['วัสดุคลุมป้องกันงาน','ตร.ม.',0],['Mock-up','ชุด',0],['ตัวอย่างวัสดุ','ชุด',0]] }; }\n" +
  "  _rc(){ const v=this.state.claimRates; return (v&&typeof v==='object'&&!Array.isArray(v))?v:{}; }\n" +
  "  _rateEditOk(){ return ['superadmin','director','qs_mgr'].indexOf(String((this.state.me||{}).roleKey||''))>=0; }\n" +
  "  _rcNum(v){ const n=parseFloat(String(v==null?'':v).replace(/,/g,'')); return isFinite(n)?n:0; }\n" +
  "  _rcB(n){ return '฿'+Number(n||0).toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:2 }); }\n" +
  "  _rcWhen(iso){ const d=new Date(iso); if(!isFinite(d.getTime())) return ''; const p=(n)=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes()); }\n" +
  "  // แก้หัวข้อหนึ่งของอัตรากลาง: หน้าจอเปลี่ยนทันที · ส่งขึ้นเซิร์ฟเวอร์เมื่อหยุดพิมพ์ 0.9 วิ (ไม่ส่งทุกตัวอักษร) + ลงประวัติ\n" +
  "  _rcSet(sub, val, what){ if(!this._rateEditOk()){ this.showToast('แก้อัตรากลางได้เฉพาะ Super Admin · Director · QS Manager'); return; }\n" +
  "    this.setState(st=>({ claimRates:{ ...((st.claimRates&&typeof st.claimRates==='object')?st.claimRates:{}), [sub]:val } }));\n" +
  "    this._rcPend=this._rcPend||{}; this._rcPend[sub]=val; this._rcWhat=what||this._rcWhat||''; clearTimeout(this._rcT);\n" +
  "    this._rcT=setTimeout(()=>{ const P=this._rcPend||{}; this._rcPend={}; const me=this.state.me||{}; const who=this.nickOf(me)||me.name||''; const at=new Date().toISOString();\n" +
  "      const old=Array.isArray(this._rc().log)?this._rc().log:[]; const w=String(this._rcWhat||'').slice(0,80); this._rcWhat='';\n" +
  "      const same=old[0]&&old[0].by===who&&old[0].what===w&&(Date.now()-new Date(old[0].at).getTime())<10*60000;\n" +
  "      Object.keys(P).forEach(k=>this._stKeySet('claimRates',k,P[k])); this._stKeySet('claimRates','by',who); this._stKeySet('claimRates','at',at);\n" +
  "      this._stKeySet('claimRates','log',(same?[{ at, by:who, what:w }, ...old.slice(1)]:[{ at, by:who, what:w }, ...old]).slice(0,30)); }, 900); }\n" +
  "  // รายการทั้งหมดที่ตัวคำนวณเลือกได้: ค่าแรงช่าง (คน / วัน) + รายการหมวดอื่น\n" +
  "  _rcCatalog(){ const R=this._rc(); const GL={}; this.RATE_GROUPS().forEach(g=>{ GL[g[0]]=g[1]; }); const out=[];\n" +
  "    (Array.isArray(R.trades)?R.trades:[]).forEach(x=>{ if(x&&String(x.n||'').trim()) out.push({ k:'t:'+String(x.n).trim(), g:'labor', gl:GL.labor, n:String(x.n).trim(), u:'วัน', per:'คน', rate:this._rcNum(x.rate), time:false }); });\n" +
  "    (Array.isArray(R.items)?R.items:[]).forEach(x=>{ if(x&&x.id&&String(x.n||'').trim()) out.push({ k:'i:'+x.id, g:x.g, gl:GL[x.g]||'', n:String(x.n).trim(), u:x.u||'ครั้ง', per:'', rate:this._rcNum(x.rate), time:!!x.t&&(x.u==='วัน'||x.u==='เดือน') }); });\n" +
  "    return out; }\n" +
  "  _rcTimeUnit(u){ return u==='วัน'||u==='เดือน'; }\n" +
  "  _rcDayRate(c){ return !c?0:c.u==='วัน'?c.rate:c.u==='เดือน'?c.rate/30:0; }   // เดือน = 30 วัน\n" +
  "  _rcLineAmt(c, q, d){ q=Number(q)||0; d=Number(d)||0; if(!c) return 0; return this._rcTimeUnit(c.u)?q*d*this._rcDayRate(c):q*c.rate; }\n" +
  "  _rcTotals(L, ohpOn){ const C=this._rcCatalog(); const sub=(L||[]).reduce((s,l)=>s+this._rcLineAmt(C.find(c=>c.k===l.k), l.q, l.d),0); const pct=ohpOn?this._rcNum(this._rc().ohp!=null?this._rc().ohp:15):0;\n" +
  "    const ohp=sub*pct/100; const total=Math.round((sub+ohp)*100)/100; return { sub, pct, ohp, total, vat:Math.round(total*7)/100, gross:Math.round(total*107)/100 }; }\n" +
  "  // ---------- หน้าตั้งค่าระบบ: การ์ดอัตรากลาง ----------\n" +
  "  RATE_VALS(S){ const out={ rtShow:false }; if(S.screen!=='system'||!this.moneyOk()) return out; out.rtShow=true;\n" +
  "    const R=this._rc(); const ed=this._rateEditOk(); const G=this.RATE_GROUPS(); const g=G.some(x=>x[0]===S.rtGroup)?S.rtGroup:'labor'; const B=(n)=>this._rcB(n); const N=(v)=>this._rcNum(v);\n" +
  "    const items=Array.isArray(R.items)?R.items:[]; const trades=Array.isArray(R.trades)?R.trades:[]; const C=this._otCfg();\n" +
  "    out.rtCanEdit=ed; out.rtReadOnly=!ed; out.rtStamp=R.at?('แก้ล่าสุด '+(R.by||'—')+' · '+this._rcWhen(R.at)):'ยังไม่เคยแก้ไขจากหน้านี้';\n" +
  "    out.rtTabs=G.map(x=>{ const on=x[0]===g; const n=x[0]==='labor'?trades.length:items.filter(i=>i&&i.g===x[0]).length;\n" +
  "      return { key:x[0], label:x[1]+(n?(' · '+n):''), bg:on?'#1C1B18':'#fff', fg:on?'#C9A961':'#2C2A25', bd:on?'#1C1B18':'#E4DED2', onPress:()=>this.setState({ rtGroup:x[0] }) }; });\n" +
  "    out.rtIsLabor=g==='labor'; out.rtIsItems=g!=='labor'; const gl=(G.find(x=>x[0]===g)||[])[1]||'';\n" +
  "    const rv=(v)=>(v===''||v==null)?'':String(v); const rate=(e)=>{ const s=String(e.target.value||'').trim(); return s===''?'':N(s); };\n" +
  "    const ask=(m)=>typeof window==='undefined'||window.confirm(m);\n" +
  "    // ค่าแรงช่าง + ล่วงเวลา + OH&P\n" +
  "    out.rtTrades=trades.map((x,i)=>{ const r=N(x&&x.rate); const set=(patch)=>{ const a=trades.slice(); a[i]={ ...(a[i]||{}), ...patch }; this._rcSet('trades',a,'ค่าแรงช่าง'); };\n" +
  "      return { key:'t'+i, n:String((x&&x.n)||''), rate:rv(x&&x.rate), hint:r>0?('OT '+B(r/C.hours*C.m1)+'/ชม.'):'ยังไม่ใส่อัตรา', hintFg:r>0?'#8A7657':'#B4532A',\n" +
  "        onN:(e)=>set({ n:e.target.value }), onRate:(e)=>set({ rate:rate(e) }), onDel:()=>{ if(ask('ลบ \"'+String((x&&x.n)||'รายการนี้')+'\" ออกจากอัตรากลาง?')) this._rcSet('trades',trades.filter((_,j)=>j!==i),'ค่าแรงช่าง'); } }; });\n" +
  "    out.rtTradesNone=!trades.length; out.onRtTradeAdd=()=>this._rcSet('trades',[...trades,{ n:'', rate:'' }],'ค่าแรงช่าง');\n" +
  "    const ot=(R.ot&&typeof R.ot==='object')?R.ot:{};\n" +
  "    out.rtOt=[['hours','ชม.ทำงานต่อวัน','8'],['m1','ตัวคูณ · วันทำงานปกติ','1.5'],['m2','ตัวคูณ · ทำงานวันหยุด','2'],['m3','ตัวคูณ · ล่วงเวลาในวันหยุด','3']].map(([k,l,d])=>({ key:k, label:l, ph:d, val:ot[k]!=null?String(ot[k]):'',\n" +
  "      onSet:(e)=>{ const v=N(e.target.value); const o={ ...ot }; if(v>0) o[k]=k==='hours'?Math.min(24,v):v; else delete o[k]; this._rcSet('ot',o,'ล่วงเวลา (OT)'); } }));\n" +
  "    out.rtOhp=R.ohp!=null?String(R.ohp):'15'; out.onRtOhp=(e)=>this._rcSet('ohp',Math.max(0,Math.min(100,N(e.target.value))),'ค่าดำเนินการ + กำไร (OH&P)');\n" +
  "    // รายการหมวดอื่น\n" +
  "    const L=items.filter(x=>x&&x.g===g); const U=this.RATE_UNITS();\n" +
  "    out.rtUnitOptions=U.map(u=>({ value:u, label:'฿ / '+u }));\n" +
  "    out.rtItems=L.map(x=>{ const upd=(patch)=>this._rcSet('items',items.map(y=>(y&&y.id===x.id)?{ ...y, ...patch }:y),gl); const tu=this._rcTimeUnit(x.u); const r=N(x.rate); const on=!!x.t&&tu;\n" +
  "      return { key:x.id, n:String(x.n||''), rate:rv(x.rate), uRef:this._selRef(x.u||'ครั้ง'), uVal:x.u||'ครั้ง', tShow:tu, tLabel:on?'คิดตามเวลา · ใช้ใน EOT':'ไม่คิดตามเวลา', tFg:on?'#4E7C59':'#A29B8C', swBg:on?'#1C1B18':'#EFEAE0', knobX:on?'18px':'2px',\n" +
  "        hint:tu&&r>0?('≈ '+B(this._rcDayRate({ u:x.u, rate:r }))+' / วัน'):(r>0?'':'ยังไม่ใส่อัตรา'), hintFg:r>0?'#8A7657':'#B4532A',\n" +
  "        onN:(e)=>upd({ n:e.target.value }), onRate:(e)=>upd({ rate:rate(e) }), onU:(e)=>{ const u=e.target.value; upd(this._rcTimeUnit(u)?{ u }:{ u, t:false }); }, onT:()=>upd({ t:!on }),\n" +
  "        onDel:()=>{ if(ask('ลบ \"'+String(x.n||'รายการนี้')+'\" ออกจากอัตรากลาง?')) this._rcSet('items',items.filter(y=>!(y&&y.id===x.id)),gl); } }; });\n" +
  "    out.rtItemsNone=!L.length; const uid=(i)=>'r'+Date.now().toString(36)+(i||0)+Math.random().toString(36).slice(2,5);\n" +
  "    out.onRtItemAdd=()=>this._rcSet('items',[...items,{ id:uid(), g, n:'', u:(g==='staff'||g==='site'||g==='tool')?'เดือน':(g==='doc'?'แผ่น':(g==='trans'?'เที่ยว':'ชุด')), rate:'', t:(g==='staff'||g==='site') }],gl);\n" +
  "    const seed=(this.RATE_SEED()[g]||[]).filter(s=>!L.some(x=>String(x.n||'').trim()===s[0]));\n" +
  "    out.rtSeedShow=ed&&g!=='labor'&&seed.length>0; out.rtSeedTxt='＋ ใส่รายการแนะนำ ('+seed.length+')';\n" +
  "    out.onRtSeed=()=>{ this._rcSet('items',[...items, ...seed.map((s,i)=>({ id:uid(i), g, n:s[0], u:s[1], rate:'', t:!!s[2] }))],gl); this.showToast('ใส่ชื่อรายการแนะนำแล้ว '+seed.length+' รายการ — กรอกอัตราให้ครบ'); };\n" +
  "    // ค่า Preliminary ต่อวัน = รายการ \"คิดตามเวลา\" ที่ใส่อัตราแล้ว อย่างละ 1 หน่วย\n" +
  "    const TL=items.filter(x=>x&&x.t&&this._rcTimeUnit(x.u)&&N(x.rate)>0); const perDay=TL.reduce((s,x)=>s+this._rcDayRate({ u:x.u, rate:N(x.rate) }),0);\n" +
  "    out.rtPrelim=TL.length?(B(perDay)+' / วัน'):'—'; out.rtPrelimNote='รวม '+TL.length+' รายการที่ตั้ง \"คิดตามเวลา\" · อย่างละ 1 หน่วย · เดือน = 30 วัน · ไม่รวม VAT · ยังไม่รวม OH&P — จำนวนจริงของแต่ละโครงการใส่ในตัวคำนวณของ EOT';\n" +
  "    const noRate=trades.filter(x=>x&&String(x.n||'').trim()&&!(N(x.rate)>0)).length+items.filter(x=>x&&String(x.n||'').trim()&&!(N(x.rate)>0)).length;\n" +
  "    out.rtWarnShow=noRate>0; out.rtWarnTxt='ยังไม่ใส่อัตรา '+noRate+' รายการ — รายการที่ไม่มีอัตราจะคิดเป็น ฿0.00';\n" +
  "    const LG=Array.isArray(R.log)?R.log:[]; out.rtLogHas=LG.length>0; out.rtLog=LG.slice(0,5).map((x,i)=>({ key:'l'+i, txt:this._rcWhen(x.at)+' · '+(x.by||'—')+' · '+(x.what||'แก้ไข') }));\n" +
  "    return out; }\n" +
  "  // ---------- VO / SI / EOT: ตัวคำนวณจากอัตรากลาง ----------\n" +
  "  _rcOpen(c){ const cur=(c&&c.calc&&Array.isArray(c.calc.lines))?c.calc:null; this.setState({ rcCalc:{ id:c.id, lines:cur?cur.lines.map(l=>({ k:l.k, q:l.q, d:l.d })):[], ohpOn:cur?cur.ohpOn!==false:true } }); }\n" +
  "  RC_VALS(S){ const out={ rcOpen:false }; const K=S.rcCalc; if(!K) return out; const c=(S.changes||[]).find(x=>x.id===K.id); if(!c||!this.moneyOk()){ return out; } out.rcOpen=true;\n" +
  "    const C=this._rcCatalog(); const B=(n)=>this._rcB(n); const days=Number(c.days)||0; const L=Array.isArray(K.lines)?K.lines:[];\n" +
  "    const put=(lines, more)=>this.setState({ rcCalc:{ ...K, ...(more||{}), lines } }); const close=()=>this.setState({ rcCalc:null });\n" +
  "    out.rcTitle=(c.type||'VO')+' · '+(c.no||'')+(c.title?(' · '+c.title):''); out.rcSub=this.projName(c.project)+(days?(' · ขอขยาย '+days+' วัน'):'');\n" +
  "    out.rcOptions=[{ value:'', label:'— เลือกรายการจากอัตรากลาง —' }, ...C.map(x=>({ value:x.k, label:x.gl+' · '+x.n+' · '+(x.rate>0?(B(x.rate)+' / '+(x.per?x.per+' / ':'')+x.u):'ยังไม่ใส่อัตรา') }))];\n" +
  "    out.rcNoCat=!C.length;\n" +
  "    out.rcLines=L.map((l,i)=>{ const x=C.find(y=>y.k===l.k); const tu=!!x&&this._rcTimeUnit(x.u); const amt=this._rcLineAmt(x,l.q,l.d); const set=(patch)=>put(L.map((y,j)=>j===i?{ ...y, ...patch }:y));\n" +
  "      const num=(e,max)=>{ let v=Number(e&&e.target?e.target.value:0); if(!isFinite(v)||v<0) v=0; return Math.min(max,Math.round(v*100)/100); };\n" +
  "      return { key:'l'+i, kRef:this._selRef(l.k||''), kVal:l.k||'', q:l.q?String(l.q):'', d:l.d?String(l.d):'', dShow:tu, qUnit:x?(x.per||(tu?'หน่วย':x.u)):'', dUnit:'วัน',\n" +
  "        rateTxt:!x?(l.k?'รายการนี้ถูกลบจากอัตรากลางแล้ว':''):(x.rate>0?(tu?('≈ '+B(this._rcDayRate(x))+' / วัน'+(x.u==='เดือน'?' (เดือน ÷ 30)':'')):(B(x.rate)+' / '+x.u)):'ยังไม่ใส่อัตรา — คิด ฿0.00'), rateFg:(x&&x.rate>0)?'#8A7657':'#B4532A', amt:B(amt),\n" +
  "        onK:(e)=>{ const k=e.target.value; const nx=C.find(y=>y.k===k); set({ k, q:l.q||1, d:(nx&&this._rcTimeUnit(nx.u))?(l.d||days||1):0 }); },\n" +
  "        onQ:(e)=>set({ q:num(e,99999) }), onD:(e)=>set({ d:num(e,3650) }), onDel:()=>put(L.filter((_,j)=>j!==i)) }; });\n" +
  "    out.rcNone=!L.length; out.onRcAdd=()=>put([...L,{ k:'', q:1, d:0 }]);\n" +
  "    const TI=C.filter(x=>x.time&&!L.some(l=>l.k===x.k)); out.rcTimeShow=TI.length>0; out.rcTimeTxt='＋ รายการคิดตามเวลาทั้งหมด ('+TI.length+')'+(days?(' × '+days+' วัน'):'');\n" +
  "    out.onRcTime=()=>{ put([...L.filter(l=>l.k), ...TI.map(x=>({ k:x.k, q:1, d:days||1 }))]); if(!days) this.showToast('ยังไม่ได้ใส่จำนวนวันที่ขอขยาย — ใส่ 1 วันให้ก่อน แก้ในช่อง \"วัน\" ของแต่ละรายการได้'); };\n" +
  "    const T=this._rcTotals(L, K.ohpOn!==false); const on=K.ohpOn!==false;\n" +
  "    out.rcSubTxt=B(T.sub); out.rcOhpLabel='ค่าดำเนินการ + กำไร (OH&P) '+this._rcNum(this._rc().ohp!=null?this._rc().ohp:15)+'%'; out.rcOhpTxt=on?B(T.ohp):'ไม่คิด'; out.rcOhpBg=on?'#1C1B18':'#EFEAE0'; out.rcOhpKnob=on?'18px':'2px';\n" +
  "    out.onRcOhp=()=>put(L,{ ohpOn:!on }); out.rcTotalTxt=B(T.total); out.rcVatTxt='VAT 7% '+B(T.vat)+' → รวม VAT '+B(T.gross);\n" +
  "    out.onRcClose=close; out.rcStop=(e)=>{ try{ e.stopPropagation(); }catch(x){} };\n" +
  "    out.onRcApply=()=>{ const used=L.filter(l=>l.k&&C.some(x=>x.k===l.k)&&Number(l.q)>0); if(!used.length){ this.showToast('ยังไม่มีรายการ — กด \"＋ เพิ่มรายการ\" ก่อน'); return; }\n" +
  "      const me=this.state.me||{}; this.setChange(c.id,'amount',T.total);\n" +
  "      this.setChange(c.id,'calc',{ lines:used.map(l=>{ const x=C.find(y=>y.k===l.k); return { k:l.k, n:x.n, u:x.u, rate:x.rate, q:Number(l.q)||0, d:this._rcTimeUnit(x.u)?(Number(l.d)||0):0, amt:Math.round(this._rcLineAmt(x,l.q,l.d)*100)/100 }; }), ohpOn:on, pct:T.pct, sub:Math.round(T.sub*100)/100, total:T.total, at:new Date().toISOString(), by:this.nickOf(me)||me.name||'' });\n" +
  "      close(); this.showToast('ใส่มูลค่า '+B(T.total)+' (ไม่รวม VAT) จากอัตรากลางแล้ว — ตรวจตัวเลขกับ QS ก่อนส่งลูกค้า'); };\n" +
  "    return out; }\n" +
  A_OLD;

// ---------------------------------------------------------------------
// ข) หน้าจอ: การ์ดอัตรากลาง (ตั้งค่าระบบ)
// ---------------------------------------------------------------------
const IN = 'box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:9px;padding:8px 10px;font-size:12.5px;font-family:inherit;color:#2C2A25;outline:none';
const H = (txt) => "            <div style=\"font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.04em;margin:14px 0 7px\">" + txt + "</div>\n";
const DEL = (on) => "<sc-if value=\"{{ rtCanEdit }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ " + on + " }}\" title=\"ลบรายการ\" style=\"flex:none;width:34px;height:34px;border:1px solid #F0D2BE;background:#fff;color:#B4532A;border-radius:9px;cursor:pointer;font-family:inherit;font-size:15px;line-height:1;padding:0\">×</button></sc-if>";
const ADD = (on, txt) => "<button sc-camel-on-click=\"{{ " + on + " }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#6E5424;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit\">" + txt + "</button>";
const VIEW =
  "        <!-- " + MARK + ": อัตรากลาง -->\n" +
  "        <sc-if value=\"{{ rtShow }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "          <div style=\"background:#fff;border:1px solid #EDE7DA;border-radius:18px;padding:17px 16px;margin-bottom:20px\">\n" +
  "            <div style=\"display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px\">\n" +
  "              <span class=\"kicker\" style=\"font-size:9.5px;color:#9A8767\">อัตรากลาง · ราคาเรียกเก็บลูกค้า</span>\n" +
  "              <span style=\"font-size:10px;color:#8A6D3B;background:#F5EAD6;padding:3px 9px;border-radius:7px;font-weight:700\">ตัวเลขเงิน</span>\n" +
  "              <span style=\"font-size:10.5px;color:#8C877D;margin-left:auto\">{{ rtStamp }}</span>\n" +
  "            </div>\n" +
  "            <div style=\"font-size:12px;color:#8C877D;line-height:1.65;margin-bottom:12px\">ตั้งครั้งเดียว ใช้ทุกที่: <b>Claim / ใบเสนอราคา</b> · <b>OT ในรายงานประจำวัน</b> · <b>VO</b> · <b>EOT</b> — ใส่เฉพาะ <b>ราคาเรียกเก็บลูกค้า</b> ห้ามใส่ต้นทุนจริงของบริษัท · ทุกอัตรา<b>ไม่รวม VAT</b> · แก้แล้วบันทึกอัตโนมัติ · ตรวจตัวเลขกับ QS / ผู้บริหารก่อนใช้เรียกเก็บ</div>\n" +
  "            <sc-if value=\"{{ rtReadOnly }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"background:#FBF8F1;border:1px solid #EFE4CB;border-radius:10px;padding:8px 11px;font-size:11.5px;color:#8A6D3B;margin-bottom:10px\">ดูได้อย่างเดียว — แก้ไขได้เฉพาะ Super Admin · Director · QS Manager</div></sc-if>\n" +
  "            <div style=\"display:flex;gap:6px;flex-wrap:wrap\">\n" +
  "              <sc-for list=\"{{ rtTabs }}\" as=\"t\" hint-placeholder-count=\"4\"><button sc-camel-on-click=\"{{ t.onPress }}\" style=\"border:1px solid {{ t.bd }};background:{{ t.bg }};color:{{ t.fg }};border-radius:10px;padding:8px 13px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer\">{{ t.label }}</button></sc-for>\n" +
  "            </div>\n" +
  // ---- ค่าแรงช่าง
  "            <sc-if value=\"{{ rtIsLabor }}\" hint-placeholder-val=\"{{ true }}\">\n" +
  H('ค่าแรงช่าง — ฿ / คน / วัน') +
  "            <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
  "              <sc-for list=\"{{ rtTrades }}\" as=\"r\" hint-placeholder-count=\"4\">\n" +
  "                <div style=\"display:flex;align-items:center;flex-wrap:wrap;gap:6px;border:1px solid #EDE6D7;background:#FCFAF5;border-radius:11px;padding:7px 9px\">\n" +
  "                  <input value=\"{{ r.n }}\" sc-camel-on-change=\"{{ r.onN }}\" placeholder=\"ตำแหน่งช่าง\" style=\"flex:2 1 160px;min-width:0;" + IN + "\">\n" +
  "                  <input value=\"{{ r.rate }}\" sc-camel-on-change=\"{{ r.onRate }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" placeholder=\"฿ / คน / วัน\" style=\"flex:1 1 110px;min-width:0;text-align:right;" + IN + "\">\n" +
  "                  <span class=\"num\" style=\"flex:0 0 118px;font-size:10.5px;color:{{ r.hintFg }}\">{{ r.hint }}</span>\n" +
  "                  " + DEL('r.onDel') + "\n" +
  "                </div>\n" +
  "              </sc-for>\n" +
  "            </div>\n" +
  "            <sc-if value=\"{{ rtTradesNone }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:4px 2px\">ยังไม่มีตำแหน่งช่าง</div></sc-if>\n" +
  "            <sc-if value=\"{{ rtCanEdit }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"margin-top:8px\">" + ADD('onRtTradeAdd', '＋ เพิ่มตำแหน่งช่าง') + "</div></sc-if>\n" +
  H('ล่วงเวลา (OT) · ค่า OT ต่อชั่วโมง = ค่าแรงต่อวัน ÷ ชม.ทำงานต่อวัน × ตัวคูณ') +
  "            <div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px\">\n" +
  "              <sc-for list=\"{{ rtOt }}\" as=\"o\" hint-placeholder-count=\"4\"><label style=\"display:flex;flex-direction:column;gap:4px;font-size:11px;color:#8C877D\">{{ o.label }}<input value=\"{{ o.val }}\" sc-camel-on-change=\"{{ o.onSet }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" placeholder=\"{{ o.ph }}\" style=\"width:100%;text-align:right;" + IN + "\"></label></sc-for>\n" +
  "            </div>\n" +
  "            <div style=\"font-size:10.5px;color:#8C877D;line-height:1.55;margin-top:6px\">เว้นว่าง = ใช้ค่าเริ่มต้น 8 ชม. · 1.5 · 2 · 3 (อิงอัตราขั้นต่ำ พ.ร.บ.คุ้มครองแรงงาน พ.ศ. 2541 มาตรา 61–63) · ตรวจกับฝ่ายบุคคล / บัญชีก่อนเปลี่ยน</div>\n" +
  H('ค่าดำเนินการ + กำไร (OH&amp;P) เริ่มต้น %') +
  "            <input value=\"{{ rtOhp }}\" sc-camel-on-change=\"{{ onRtOhp }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" max=\"100\" style=\"width:140px;text-align:right;" + IN + "\">\n" +
  "            <div style=\"font-size:10.5px;color:#8C877D;margin-top:6px\">ใช้เป็นค่าเริ่มต้นใน Claim / ใบเสนอราคา และตัวคำนวณ VO / EOT · VAT 7% คิดเพิ่มท้ายเอกสารเสมอ</div>\n" +
  "            </sc-if>\n" +
  // ---- หมวดอื่น
  "            <sc-if value=\"{{ rtIsItems }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  H('รายการ — ชื่อ · อัตรา (฿) · หน่วย · คิดตามเวลา (เฉพาะหน่วย วัน / เดือน)') +
  "            <div style=\"display:flex;flex-direction:column;gap:6px\">\n" +
  "              <sc-for list=\"{{ rtItems }}\" as=\"r\" hint-placeholder-count=\"4\">\n" +
  "                <div style=\"display:flex;align-items:center;flex-wrap:wrap;gap:6px;border:1px solid #EDE6D7;background:#FCFAF5;border-radius:11px;padding:7px 9px\">\n" +
  "                  <input value=\"{{ r.n }}\" sc-camel-on-change=\"{{ r.onN }}\" placeholder=\"ชื่อรายการ\" style=\"flex:2 1 170px;min-width:0;" + IN + "\">\n" +
  "                  <input value=\"{{ r.rate }}\" sc-camel-on-change=\"{{ r.onRate }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" placeholder=\"อัตรา ฿\" style=\"flex:1 1 100px;min-width:0;text-align:right;" + IN + "\">\n" +
  "                  <sc-raw-select ref=\"{{ r.uRef }}\" value=\"{{ r.uVal }}\" sc-camel-on-change=\"{{ r.onU }}\" style=\"flex:0 0 112px;" + IN + "\"><sc-for list=\"{{ rtUnitOptions }}\" as=\"u\" hint-placeholder-count=\"4\"><option value=\"{{ u.value }}\">{{ u.label }}</option></sc-for></sc-raw-select>\n" +
  "                  <sc-if value=\"{{ r.tShow }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ r.onT }}\" title=\"คิดตามเวลา = นำไปรวมเป็นค่า Preliminary ต่อวันของ EOT\" style=\"display:flex;align-items:center;gap:6px;border:none;background:none;padding:2px 0;cursor:pointer;font-family:inherit\">" +
  "<span style=\"position:relative;width:34px;height:18px;border-radius:10px;background:{{ r.swBg }};display:block;flex:none\"><span style=\"position:absolute;top:2px;left:{{ r.knobX }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .16s ease\"></span></span>" +
  "<span style=\"font-size:10.5px;font-weight:700;color:{{ r.tFg }}\">{{ r.tLabel }}</span></button></sc-if>\n" +
  "                  <span class=\"num\" style=\"flex:1 1 90px;font-size:10.5px;color:{{ r.hintFg }}\">{{ r.hint }}</span>\n" +
  "                  " + DEL('r.onDel') + "\n" +
  "                </div>\n" +
  "              </sc-for>\n" +
  "            </div>\n" +
  "            <sc-if value=\"{{ rtItemsNone }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:4px 2px\">ยังไม่มีรายการในหมวดนี้</div></sc-if>\n" +
  "            <sc-if value=\"{{ rtCanEdit }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-top:8px\">" + ADD('onRtItemAdd', '＋ เพิ่มรายการ') +
  "<sc-if value=\"{{ rtSeedShow }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onRtSeed }}\" title=\"ใส่ชื่อรายการมาตรฐานให้ — ไม่ใส่ตัวเลข\" style=\"border:1px dashed #C9A961;background:#FBF3E2;color:#6E5424;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit\">{{ rtSeedTxt }}</button></sc-if></div></sc-if>\n" +
  "            </sc-if>\n" +
  // ---- สรุป
  "            <div style=\"background:#FBF8F1;border:1px solid #EFE4CB;border-radius:12px;padding:10px 12px;margin-top:14px\">\n" +
  "              <div style=\"display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px\"><span style=\"font-size:11px;font-weight:800;color:#6E5424\">ค่า Preliminary ต่อวัน (สำหรับ EOT)</span><span class=\"num\" style=\"font-size:15px;font-weight:800;color:#1C1B18\">{{ rtPrelim }}</span></div>\n" +
  "              <div style=\"font-size:10.5px;color:#8C877D;line-height:1.55;margin-top:3px\">{{ rtPrelimNote }}</div>\n" +
  "              <div style=\"font-size:10.5px;color:#8A4B2A;line-height:1.55;margin-top:3px\">ค่า Preliminary จาก EOT เรียกเก็บได้เมื่อความล่าช้าเกิดจากฝั่งผู้ว่าจ้างและสัญญาเปิดให้เรียก — ให้ผู้บริหารตรวจก่อนยื่นทุกครั้ง</div>\n" +
  "            </div>\n" +
  "            <sc-if value=\"{{ rtWarnShow }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11px;color:#B4532A;margin-top:8px\">{{ rtWarnTxt }}</div></sc-if>\n" +
  "            <sc-if value=\"{{ rtLogHas }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  H('ประวัติแก้ไขล่าสุด') +
  "            <div style=\"display:flex;flex-direction:column;gap:3px\"><sc-for list=\"{{ rtLog }}\" as=\"g\" hint-placeholder-count=\"3\"><span class=\"num\" style=\"font-size:10.5px;color:#8C877D\">{{ g.txt }}</span></sc-for></div>\n" +
  "            </sc-if>\n" +
  "          </div>\n" +
  "        </sc-if>\n";

// ---------------------------------------------------------------------
// ค) หน้าจอ: ตัวคำนวณ VO / EOT (หน้าต่างกลางจอ)
// ---------------------------------------------------------------------
const MODAL =
  "<!-- " + MARK + ": ตัวคำนวณ VO / EOT จากอัตรากลาง -->\n" +
  "<sc-if value=\"{{ rcOpen }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "  <div sc-camel-on-click=\"{{ onRcClose }}\" style=\"position:fixed;inset:0;z-index:9600;background:rgba(28,27,24,.45);display:flex;align-items:center;justify-content:center;padding:12px\">\n" +
  "    <div sc-camel-on-click=\"{{ rcStop }}\" style=\"width:min(680px,100%);max-height:92vh;display:flex;flex-direction:column;background:#FBF8F2;border:1px solid #E4DED2;border-radius:18px;box-shadow:0 24px 60px rgba(28,27,24,.25);overflow:hidden\">\n" +
  "      <div style=\"display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid #EDE7DA;background:#fff\">\n" +
  "        <span style=\"flex:none;width:38px;height:38px;border-radius:11px;background:#F5EAD6;display:flex;align-items:center;justify-content:center;font-size:18px\">🧮</span>\n" +
  "        <div style=\"flex:1;min-width:0\"><div style=\"font-size:14px;font-weight:800;color:#1C1B18\">คำนวณจากอัตรากลาง</div><div style=\"font-size:11.5px;color:#8C877D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">{{ rcTitle }}</div><div style=\"font-size:11px;color:#8C877D\">{{ rcSub }}</div></div>\n" +
  "        <button sc-camel-on-click=\"{{ onRcClose }}\" title=\"ปิด\" style=\"flex:none;width:36px;height:36px;border:1px solid #E4DED2;background:#fff;border-radius:10px;cursor:pointer;font-family:inherit;font-size:16px;color:#6E695E\">×</button>\n" +
  "      </div>\n" +
  "      <div style=\"overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px\">\n" +
  "        <sc-if value=\"{{ rcNoCat }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"background:#FDF3EC;border:1px solid #F0D2BE;border-radius:10px;padding:9px 11px;font-size:12px;color:#8A4B2A\">ยังไม่มีรายการในอัตรากลาง — ตั้งที่ ตั้งค่าระบบ → อัตรากลาง ก่อน</div></sc-if>\n" +
  "        <sc-if value=\"{{ rcNone }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:12px;color:#A29B8C;padding:6px 2px\">ยังไม่มีรายการ — กด \"＋ เพิ่มรายการ\" แล้วเลือกจากอัตรากลาง</div></sc-if>\n" +
  "        <sc-for list=\"{{ rcLines }}\" as=\"l\" hint-placeholder-count=\"2\">\n" +
  "          <div style=\"border:1px solid #EDE6D7;background:#fff;border-radius:12px;padding:8px 9px;display:flex;flex-direction:column;gap:6px\">\n" +
  "            <div style=\"display:flex;gap:6px;align-items:center\">\n" +
  "              <sc-raw-select ref=\"{{ l.kRef }}\" value=\"{{ l.kVal }}\" sc-camel-on-change=\"{{ l.onK }}\" style=\"flex:1;min-width:0;" + IN + "\"><sc-for list=\"{{ rcOptions }}\" as=\"o\" hint-placeholder-count=\"4\"><option value=\"{{ o.value }}\">{{ o.label }}</option></sc-for></sc-raw-select>\n" +
  "              <button sc-camel-on-click=\"{{ l.onDel }}\" title=\"ลบรายการ\" style=\"flex:none;width:34px;height:34px;border:1px solid #F0D2BE;background:#fff;color:#B4532A;border-radius:9px;cursor:pointer;font-family:inherit;font-size:15px;line-height:1;padding:0\">×</button>\n" +
  "            </div>\n" +
  "            <div style=\"display:flex;flex-wrap:wrap;align-items:center;gap:6px\">\n" +
  "              <input value=\"{{ l.q }}\" sc-camel-on-change=\"{{ l.onQ }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" placeholder=\"0\" title=\"จำนวน\" style=\"width:74px;text-align:center;font-weight:800;" + IN + "\"><span style=\"font-size:11px;color:#8C877D\">{{ l.qUnit }}</span>\n" +
  "              <sc-if value=\"{{ l.dShow }}\" hint-placeholder-val=\"{{ false }}\"><span style=\"font-size:11px;color:#8C877D\">×</span><input value=\"{{ l.d }}\" sc-camel-on-change=\"{{ l.onD }}\" type=\"number\" inputmode=\"decimal\" min=\"0\" placeholder=\"0\" title=\"จำนวนวัน\" style=\"width:74px;text-align:center;font-weight:800;" + IN + "\"><span style=\"font-size:11px;color:#8C877D\">{{ l.dUnit }}</span></sc-if>\n" +
  "              <span class=\"num\" style=\"flex:1 1 120px;font-size:10.5px;color:{{ l.rateFg }}\">{{ l.rateTxt }}</span>\n" +
  "              <span class=\"num\" style=\"font-size:13px;font-weight:800;color:#1C1B18;margin-left:auto\">{{ l.amt }}</span>\n" +
  "            </div>\n" +
  "          </div>\n" +
  "        </sc-for>\n" +
  "        <div style=\"display:flex;flex-wrap:wrap;gap:6px\">\n" +
  "          <button sc-camel-on-click=\"{{ onRcAdd }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#6E5424;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit\">＋ เพิ่มรายการ</button>\n" +
  "          <sc-if value=\"{{ rcTimeShow }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ onRcTime }}\" title=\"ใส่รายการที่ตั้ง คิดตามเวลา ทั้งหมด — ค่า Preliminary ของ EOT\" style=\"border:1px dashed #C9A961;background:#FBF3E2;color:#6E5424;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit\">{{ rcTimeTxt }}</button></sc-if>\n" +
  "        </div>\n" +
  "      </div>\n" +
  "      <div style=\"border-top:1px solid #EDE7DA;background:#fff;padding:11px 16px;display:flex;flex-direction:column;gap:5px\">\n" +
  "        <div style=\"display:flex;justify-content:space-between;font-size:12px;color:#4A4840\"><span>รวมรายการ</span><span class=\"num\">{{ rcSubTxt }}</span></div>\n" +
  "        <div style=\"display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:#4A4840\"><button sc-camel-on-click=\"{{ onRcOhp }}\" style=\"display:flex;align-items:center;gap:7px;border:none;background:none;padding:2px 0;cursor:pointer;font-family:inherit;font-size:12px;color:#4A4840\">" +
  "<span style=\"position:relative;width:34px;height:18px;border-radius:10px;background:{{ rcOhpBg }};display:block;flex:none\"><span style=\"position:absolute;top:2px;left:{{ rcOhpKnob }};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .16s ease\"></span></span>{{ rcOhpLabel }}</button><span class=\"num\">{{ rcOhpTxt }}</span></div>\n" +
  "        <div style=\"display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:800;color:#1C1B18\"><span>ยอดเสนอ · ไม่รวม VAT</span><span class=\"num\" style=\"font-size:17px\">{{ rcTotalTxt }}</span></div>\n" +
  "        <div class=\"num\" style=\"font-size:10.5px;color:#8C877D;text-align:right\">{{ rcVatTxt }}</div>\n" +
  "        <div style=\"font-size:10.5px;color:#8A4B2A;line-height:1.5\">ราคาเรียกเก็บลูกค้าจากอัตรากลาง — ตรวจตัวเลขกับ QS ก่อนส่ง · งานเพิ่มต้องมี VO ลงนามก่อนเริ่มงาน (No Signed VO = No Additional Work)</div>\n" +
  "        <div style=\"display:flex;justify-content:flex-end;gap:8px;margin-top:4px\">\n" +
  "          <button sc-camel-on-click=\"{{ onRcClose }}\" style=\"border:1px solid #E4DED2;background:#fff;color:#6E695E;border-radius:11px;padding:10px 16px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700\">ยกเลิก</button>\n" +
  "          <button sc-camel-on-click=\"{{ onRcApply }}\" style=\"border:none;background:#1C1B18;color:#C9A961;border-radius:11px;padding:10px 18px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800\">ใช้ยอดนี้เป็นมูลค่า</button>\n" +
  "        </div>\n" +
  "      </div>\n" +
  "    </div>\n" +
  "  </div>\n" +
  "</sc-if>\n\n";

const AMT_IN = '<input value="{{ c.amountVal }}" sc-camel-on-change="{{ c.onAmount }}" type="number"';
const amtRe = /<input value="\{\{ c\.amountVal \}\}" sc-camel-on-change="\{\{ c\.onAmount \}\}" type="number"[^>]*>/g;
const amtN = (t.match(amtRe) || []).length;
const RC_BTN = "\n                      <sc-if value=\"{{ c.rcShow }}\" hint-placeholder-val=\"{{ false }}\"><button sc-camel-on-click=\"{{ c.onRcOpen }}\" title=\"คำนวณมูลค่าจากอัตรากลาง (ราคาเรียกเก็บลูกค้า)\" style=\"margin-top:5px;width:100%;box-sizing:border-box;border:1px dashed #C9A961;background:#FBF3E2;color:#6E5424;border-radius:8px;padding:6px 7px;font-size:10.5px;font-weight:700;font-family:inherit;cursor:pointer;line-height:1.35\">🧮 {{ c.rcTxt }}</button></sc-if>";   /* " + MARK + " */

const CC_ANCHOR = '        <sc-if value="{{ ccShow }}" hint-placeholder-val="{{ false }}">';
const DND_ANCHOR = '<sc-if value="{{ dndOpen }}" hint-placeholder-val="{{ false }}">';
const R = [
  ['ซิงก์: SB_STATE_KEYS + PERSIST_KEYS', "'featGlobal','featRole','featProj','handover'", "'featGlobal','featRole','featProj','claimRates','handover'", 2],
  ['ซิงก์: ข้ามตอน push ทั้งก้อน', "k==='featGlobal'||k==='featRole'||k==='featProj'||", "k==='featGlobal'||k==='featRole'||k==='featProj'||k==='claimRates'||", 1],
  ['ตัวช่วยอัตรากลาง', A_OLD, A_NEW, 1],
  ['รายงานประจำวัน: อ่านอัตรากลางจาก state (ค่าแรง)', "  _rateOf(trade){ const L=((this.state.rateCard||{}).trades)||[];", "  _rateOf(trade){ const L=(this._rc().trades)||[];", 1],
  ['รายงานประจำวัน: อ่านอัตรากลางจาก state (OT)', "  _otCfg(){ const o=((this.state.rateCard||{}).ot)||{};", "  _otCfg(){ const o=(this._rc().ot)||{};", 1],
  ['รายงานประจำวัน: เลิกดึงอัตราแยก', "      this._rateSync();   /* v1.408.0 daily-ot */\n", "      /* " + MARK + ": อัตรากลางอยู่ใน state (claimRates) แล้ว — ไม่ต้องดึงแยก */\n", 1],
  ['ข้อความ OT: ที่ตั้งอัตรา', "แก้อัตราที่แอป Claim → ⚙ อัตราค่าแรง · ตรวจตัวเลขกับ QS ก่อนใช้เรียกเก็บ", "แก้อัตราที่ ตั้งค่าระบบ → อัตรากลาง · ตรวจตัวเลขกับ QS ก่อนใช้เรียกเก็บ", 1],
  ['ข้อความ OT: ยังไม่มีอัตรา', "เพิ่มตำแหน่งนี้ที่แอป Claim → ⚙ อัตราค่าแรง' }; }", "เพิ่มตำแหน่งนี้ที่ ตั้งค่าระบบ → อัตรากลาง' }; }", 1],
  ['ข้อมูลหน้าจอ (ตั้งค่า + ตัวคำนวณ)', "      ...this.CC_VALS(S),\n", "      ...this.CC_VALS(S),\n      ...this.RATE_VALS(S), ...this.RC_VALS(S),   // " + MARK + "\n", 1],
  ['VO / SI / EOT: ปุ่มคำนวณในแต่ละแถว', "        noteVal:c.note||'', onNote:(e)=>this.setChange(c.id,'note',e.target.value),",
   "        noteVal:c.note||'', onNote:(e)=>this.setChange(c.id,'note',e.target.value),\n" +
   "        rcShow:this.moneyOk(), onRcOpen:()=>this._rcOpen(c), rcTxt:(c.calc&&Array.isArray(c.calc.lines)&&c.calc.lines.length)?('คำนวณจากอัตรากลาง · '+c.calc.lines.length+' รายการ (กดเพื่อแก้)'):'คำนวณจากอัตรากลาง',   // " + MARK, 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
if (t.split(CC_ANCHOR).length !== 2) { console.error('✗ หาการ์ด "การ์ดหน้าแรก & ฟังก์ชัน" ในหน้าตั้งค่าระบบไม่เจอ — ไม่แก้'); process.exit(1); }
if (t.split(DND_ANCHOR).length !== 2) { console.error('✗ หาจุดวางหน้าต่างตัวคำนวณไม่เจอ — ไม่แก้'); process.exit(1); }
if (amtN !== 2) { console.error('✗ หาช่อง "มูลค่า (฿)" ของ VO / SI / EOT เจอ ' + amtN + ' ที่ (ต้องเจอ 2) — ไม่แก้'); process.exit(1); }
t = t.replace(amtRe, (m) => m + RC_BTN);
t = t.split(CC_ANCHOR).join(VIEW + CC_ANCHOR);
t = t.split(DND_ANCHOR).join(MODAL + DND_ANCHOR);
let pts = 4;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ อัตรากลาง (ตั้งค่าระบบ) + ตัวคำนวณ VO / EOT: แก้ ' + pts + ' จุด');
