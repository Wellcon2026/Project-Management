#!/usr/bin/env node
/* =====================================================================
   v1.408.0 daily-ot — ผู้บริหารสั่ง 16/11/2026: รายงานประจำวัน แจ้งล่วงเวลา (OT) ได้ · อัตราดึงจากอัตรากลางของงานเคลม
     node scripts/patch-daily-ot.js        (รันหลัง patch-feat-proj.js)
   · รายงานประจำวัน (Site) → ช่อง "ล่วงเวลา (OT) · ถ้ามี": ช่างแต่ละประเภทที่เข้างานวันนั้น ใส่ จำนวนคน × ชั่วโมง
     + ประเภท OT (วันทำงานปกติ / ทำงานวันหยุด / ล่วงเวลาในวันหยุด) + เหตุผล / ผู้สั่ง OT
   · อัตรา = อัตรากลาง app_state 'claimRates' (ตั้งที่แอป Claim → ⚙ อัตราค่าแรง — ราคาเรียกเก็บลูกค้า ไม่ใช่ต้นทุน):
       ค่า OT = คน × ชม. × (ค่าแรง ฿/คน/วัน ÷ ชม.ทำงานต่อวัน) × ตัวคูณ
       ชม.ต่อวัน / ตัวคูณ ตั้งได้ที่อัตรากลาง (claimRates.ot { hours, m1, m2, m3 }) · ยังไม่ตั้ง = 8 ชม. · ×1.5 · ×2 · ×3
       ชื่อช่างในรายงาน จับคู่กับชื่อในอัตรากลาง (ตรงตัว หรือคำใดคำหนึ่งที่คั่นด้วย "/") · ไม่พบ = แจ้งว่ายังไม่มีอัตรากลาง ไม่นับเงิน
   · ตัวเลขเงิน (อัตรา / ยอด OT) เห็นเฉพาะผู้มีสิทธิ์ "ตัวเลขเงินโครงการ" — หน้างานเห็นแค่ คน × ชั่วโมง
   · ส่งออก Word / Excel: มีบรรทัด OT (คน × ชม. · ประเภท · เหตุผล) — ไม่มีตัวเลขเงิน (เอกสารนี้ส่งให้ลูกค้า / ผู้ออกแบบได้)
   ข้อมูล: dailies[].ot { <trade>: { n, h } } · otKind 'n' | 'h' | 'ho' · otWhy — เก็บในแถวรายงานเดิม · ไม่ต้องรัน SQL
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.408.0 daily-ot';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (แจ้ง OT ในรายงานประจำวัน)'); process.exit(0); }
if (!t.includes('v1.407.0 feat-proj')) { console.error('✗ ต้องรัน scripts/patch-feat-proj.js ก่อน'); process.exit(1); }

// ก) ตัวช่วย
const A_OLD = "  _crewProps(r){ const id=r.id;";
const A_NEW =
  "  // ===== " + MARK + ": ล่วงเวลา (OT) ในรายงานประจำวัน — dailies[].ot { trade:{ n, h } } · otKind 'n'|'h'|'ho' · otWhy =====\n" +
  "  //   อัตรา = อัตรากลาง app_state 'claimRates' (ตั้งที่แอป Claim → ⚙ อัตราค่าแรง · ราคาเรียกเก็บลูกค้า): ค่าแรง ฿/คน/วัน ÷ ชม.ต่อวัน × ตัวคูณ OT\n" +
  "  _otKinds(){ return [['n','วันทำงานปกติ · หลังเวลางาน','m1'],['h','ทำงานวันหยุด','m2'],['ho','ล่วงเวลาในวันหยุด','m3']]; }\n" +
  "  _rateSync(force){ try{ const sb=this._sb, S=this.state; if(!sb||!S.loggedIn||!S.me||this._demoLock) return; const now=Date.now();\n" +
  "      if(this._rateBusy||(!force&&this._rateAt&&now-this._rateAt<300000)) return; this._rateBusy=true; this._rateAt=now;\n" +
  "      sb.from('app_state').select('data').eq('id','claimRates').maybeSingle().then((r)=>{ this._rateBusy=false; if(!r||r.error) return;\n" +
  "        const v=(r.data&&r.data.data&&r.data.data.v)||{}; const sig=JSON.stringify(v); if(sig!==this._rateSig){ this._rateSig=sig; this.setState({ rateCard:v }); } }, ()=>{ this._rateBusy=false; });\n" +
  "    }catch(e){ this._rateBusy=false; } }\n" +
  "  _rateOf(trade){ const L=((this.state.rateCard||{}).trades)||[]; const tok=(s)=>String(s||'').replace(/\\(.*?\\)/g,'').split('/').map(x=>x.trim().toLowerCase()).filter(Boolean);\n" +
  "    const a=tok(trade); const hit=L.find(x=>x&&String(x.n||'').trim()===String(trade||'').trim())||L.find(x=>{ const b=tok(x&&x.n); return a.some(k=>b.indexOf(k)>=0); }); const n=hit?Number(hit.rate):0; return n>0?n:0; }\n" +
  "  _otCfg(){ const o=((this.state.rateCard||{}).ot)||{}; const num=(v,d)=>{ const n=Number(v); return n>0?n:d; }; return { hours:num(o.hours,8), m1:num(o.m1,1.5), m2:num(o.m2,2), m3:num(o.m3,3) }; }\n" +
  "  _otCalc(r){ const ot=(r&&r.ot&&typeof r.ot==='object')?r.ot:{}; const C=this._otCfg(); const K=this._otKinds().find(k=>k[0]===(r&&r.otKind))||this._otKinds()[0]; const mult=C[K[2]];\n" +
  "    let mh=0, amt=0; const miss=[]; const rows=Object.keys(ot).map(k=>{ const n=Number((ot[k]||{}).n)||0, h=Number((ot[k]||{}).h)||0; if(!(n>0&&h>0)) return null;\n" +
  "      const day=this._rateOf(k); const a=day?n*h*day/C.hours*mult:0; mh+=n*h; amt+=a; if(!day) miss.push(k); return { k, n, h, day, a }; }).filter(Boolean);\n" +
  "    return { rows, mh, amt, miss, mult, kind:K, hours:C.hours }; }\n" +
  "  _otTxt(r){ const c=this._otCalc(r); if(!c.rows.length) return ''; const why=String((r&&r.otWhy)||'').trim();\n" +
  "    return c.rows.map(x=>x.k+' '+x.n+' คน × '+x.h+' ชม.').join(' · ')+' — รวม '+c.mh+' คน-ชม. ('+c.kind[1]+')'+(why?' · เหตุผล: '+why:''); }\n" +
  "  _otProps(r){ const id=r.id; const cur=()=>(this.state.dailies||[]).find(x=>x.id===id)||r; const crew=r.crew||{}; const ot=(r.ot&&typeof r.ot==='object')?r.ot:{};\n" +
  "    const B=(n)=>'฿'+Number(n||0).toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:2 }); const mny=this.moneyOk(); const c=this._otCalc(r); const C=this._otCfg();\n" +
  "    const T=this._crewTrades(); const keys=[...T, ...Object.keys(crew).filter(k=>T.indexOf(k)<0), ...Object.keys(ot).filter(k=>T.indexOf(k)<0&&!(k in crew))].filter(k=>Number(crew[k])>0||(ot[k]&&(Number(ot[k].n)>0||Number(ot[k].h)>0)));\n" +
  "    const setOt=(k,fld,val)=>{ const row=cur(); const o={ ...((row.ot&&typeof row.ot==='object')?row.ot:{}) }; const e={ ...(o[k]||{}) }; let v=Number(val); if(!isFinite(v)||v<0) v=0;\n" +
  "      if(fld==='n') v=Math.min(999,Math.round(v)); else v=Math.min(24,Math.round(v*2)/2); if(v) e[fld]=v; else delete e[fld];\n" +
  "      if(fld==='h'&&v&&!(Number(e.n)>0)){ const cn=Number((row.crew||{})[k])||0; if(cn) e.n=cn; }   // ใส่ชั่วโมงก่อน → จำนวนคน = คนเข้างานของช่างนั้น\n" +
  "      if(Number(e.n)>0||Number(e.h)>0) o[k]=e; else delete o[k]; this.soSet('dailies',id,'ot',o); };\n" +
  "    const kind=c.kind[0]; const mTxt='×'+c.mult;\n" +
  "    return { otRows:keys.map(k=>{ const e=ot[k]||{}; const n=Number(e.n)||0, h=Number(e.h)||0; const on=n>0&&h>0; const day=this._rateOf(k);\n" +
  "        return { key:k, name:this._crewShort(k), full:k, n:n?String(n):'', h:h?String(h):'', bg:on?'#FBF3E2':'#fff', bd:on?'#E2CB92':'#ECE6DA', fg:on?'#1C1B18':'#6E695E',\n" +
  "          rateShow:mny, rateTxt:day?(B(day/C.hours*c.mult)+'/ชม.'):'ไม่มีอัตรากลาง', rateFg:day?'#8A7657':'#B4532A',\n" +
  "          onN:(ev)=>setOt(k,'n',ev&&ev.target?ev.target.value:0), onH:(ev)=>setOt(k,'h',ev&&ev.target?ev.target.value:0) }; }),\n" +
  "      otNone:!keys.length, otHas:c.rows.length>0, otSum:'รวม '+c.mh+' คน-ชม.',\n" +
  "      otKindRef:this._selRef(kind), otKindVal:kind, otKindOptions:this._otKinds().map(k=>({ value:k[0], label:k[1]+' (×'+C[k[2]]+')' })), onOtKind:(ev)=>this.soSet('dailies',id,'otKind',ev.target.value),\n" +
  "      otWhy:String(r.otWhy||''), onOtWhy:(ev)=>this.soSet('dailies',id,'otWhy',ev.target.value),\n" +
  "      otMoneyShow:mny&&c.rows.length>0, otMoneyTxt:'≈ '+B(c.amt)+' · ไม่รวม VAT',\n" +
  "      otRateNote:'อัตรากลาง (ราคาเรียกเก็บลูกค้า): ค่าแรงต่อวัน ÷ '+C.hours+' ชม. '+mTxt+' · ยังไม่รวมค่าดำเนินการ (OH&P) และ VAT 7% · แก้อัตราที่แอป Claim → ⚙ อัตราค่าแรง · ตรวจตัวเลขกับ QS ก่อนใช้เรียกเก็บ',\n" +
  "      otMissShow:mny&&c.miss.length>0, otMissTxt:'ยังไม่มีอัตรากลางของ: '+c.miss.join(' · ')+' — ยังไม่นับในยอดเงิน · เพิ่มตำแหน่งนี้ที่แอป Claim → ⚙ อัตราค่าแรง' }; }\n" +
  A_OLD;

// ข) หน้าจอ: ช่อง OT ต่อจาก "คนเข้างาน · แยกตาม trade"
const numIn = (v, on, w, step, title) => "<input type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"" + step + "\" value=\"{{ " + v + " }}\" sc-camel-on-change=\"{{ " + on + " }}\" title=\"" + title + "\" placeholder=\"0\" style=\"width:" + w + "px;flex:none;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:7px;padding:6px 2px;font-size:13px;font-weight:800;text-align:center;font-family:inherit;color:{{ o.fg }}\">";
const VIEW =
  "<!-- " + MARK + " -->\n" +
  "                <div style=\"border:1px solid #ECE6DA;background:#FCFAF5;border-radius:12px;padding:9px 10px\">\n" +
  "                  <div style=\"display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-bottom:6px\"><span style=\"font-size:10px;color:#8C877D;font-weight:700\">ล่วงเวลา (OT) · ถ้ามี</span>" +
  "<sc-if value=\"{{ r.otHas }}\" hint-placeholder-val=\"{{ false }}\"><span class=\"num\" style=\"font-size:12px;font-weight:800;color:#1C1B18;background:#F3EAD9;border-radius:999px;padding:2px 11px\">{{ r.otSum }}</span></sc-if>" +
  "<sc-if value=\"{{ r.otMoneyShow }}\" hint-placeholder-val=\"{{ false }}\"><span class=\"num\" style=\"font-size:12px;font-weight:800;color:#6E5424;background:#F5EAD6;border-radius:999px;padding:2px 11px\">{{ r.otMoneyTxt }}</span></sc-if>" +
  "<span style=\"font-size:10px;color:#A29B8C\">ใส่จำนวนคน × ชั่วโมง ของช่างที่ทำ OT</span></div>\n" +
  "                  <sc-if value=\"{{ r.otNone }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11.5px;color:#A29B8C;padding:2px\">ใส่จำนวนคนเข้างานด้านบนก่อน — ช่อง OT ของช่างแต่ละประเภทจะขึ้นที่นี่</div></sc-if>\n" +
  "                  <div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:6px\">\n" +
  "                    <sc-for list=\"{{ r.otRows }}\" as=\"o\" hint-placeholder-count=\"3\">\n" +
  "                      <div style=\"display:flex;align-items:center;flex-wrap:wrap;gap:5px;border:1px solid {{ o.bd }};background:{{ o.bg }};border-radius:10px;padding:5px 7px 5px 9px;min-width:0\">\n" +
  "                        <span style=\"flex:1;min-width:64px;font-size:11.5px;font-weight:600;color:{{ o.fg }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis\" title=\"{{ o.full }}\">{{ o.name }}</span>\n" +
  "                        " + numIn('o.n', 'o.onN', 44, '1', 'จำนวนคนที่ทำ OT') + "<span style=\"font-size:11px;color:#8C877D;flex:none\">คน ×</span>" + numIn('o.h', 'o.onH', 48, '0.5', 'ชั่วโมง OT ต่อคน') + "<span style=\"font-size:11px;color:#8C877D;flex:none\">ชม.</span>\n" +
  "                        <sc-if value=\"{{ o.rateShow }}\" hint-placeholder-val=\"{{ false }}\"><span class=\"num\" style=\"flex:1 0 100%;font-size:10px;color:{{ o.rateFg }}\">{{ o.rateTxt }}</span></sc-if>\n" +
  "                      </div>\n" +
  "                    </sc-for>\n" +
  "                  </div>\n" +
  "                  <sc-if value=\"{{ r.otHas }}\" hint-placeholder-val=\"{{ false }}\">\n" +
  "                    <div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-top:7px\">\n" +
  "                      <sc-raw-select ref=\"{{ r.otKindRef }}\" value=\"{{ r.otKindVal }}\" sc-camel-on-change=\"{{ r.onOtKind }}\" style=\"flex:1 1 200px;min-width:0;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:8px;padding:7px 8px;font-size:12px;font-family:inherit;color:#2C2A25;outline:none\"><sc-for list=\"{{ r.otKindOptions }}\" as=\"k\" hint-placeholder-count=\"3\"><option value=\"{{ k.value }}\">{{ k.label }}</option></sc-for></sc-raw-select>\n" +
  "                      <input value=\"{{ r.otWhy }}\" sc-camel-on-change=\"{{ r.onOtWhy }}\" placeholder=\"เหตุผล / ผู้สั่ง OT (เช่น Owner เร่งงาน · ตาม SI-012)\" style=\"flex:2 1 240px;min-width:0;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:8px;padding:7px 9px;font-size:12px;font-family:inherit;color:#2C2A25;outline:none\">\n" +
  "                    </div>\n" +
  "                    <sc-if value=\"{{ r.otMoneyShow }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:10px;color:#8C877D;line-height:1.55;margin-top:6px\">{{ r.otRateNote }}</div></sc-if>\n" +
  "                    <sc-if value=\"{{ r.otMissShow }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:10.5px;color:#B4532A;line-height:1.55;margin-top:4px\">{{ r.otMissTxt }}</div></sc-if>\n" +
  "                  </sc-if>\n" +
  "                </div>\n                ";
const CREW = '<sc-for list="{{ r.crewRows }}" as="c"';
const RESP = '<div><div style="font-size:10px;color:#8C877D;font-weight:700;margin-bottom:4px">ผู้รับผิดชอบ</div>';
const cI = t.indexOf(CREW);
if (cI < 0 || t.indexOf(CREW, cI + 1) >= 0) { console.error('✗ หาช่อง "คนเข้างาน · แยกตาม trade" ไม่เจอ (หรือเจอมากกว่า 1) — ไม่แก้'); process.exit(1); }
const rI = t.indexOf(RESP, cI);
if (rI < 0 || rI - cI > 4000) { console.error('✗ หาช่อง "ผู้รับผิดชอบ" ต่อจากคนเข้างานไม่เจอ — ไม่แก้'); process.exit(1); }

const R = [
  ['ตัวช่วย OT', A_OLD, A_NEW, 1],
  ['ข้อมูลช่อง OT ของแต่ละรายงาน', "...this._crewProps(r),   // v1.364.8 daily-crew", "...this._crewProps(r), ...this._otProps(r),   // v1.364.8 daily-crew · " + MARK, 1],
  ['ดึงอัตรากลางเมื่อเปิดรายงานประจำวัน', "      out.dailyRows=rows; out.dailyEmpty=all.length===0;", "      this._rateSync();   /* " + MARK + " */\n      out.dailyRows=rows; out.dailyEmpty=all.length===0;", 1],
  ['ส่งออก Excel', "...(this._crewTxt(cur)?[['แยกตาม trade', this._crewTxt(cur)]]:[]),", "...(this._crewTxt(cur)?[['แยกตาม trade', this._crewTxt(cur)]]:[]), ...(this._otTxt(cur)?[['ล่วงเวลา (OT)', this._otTxt(cur)]]:[]),", 1],
  ['ส่งออก Word', "if(this._crewTxt(cur)) body+=PA(R('แรงงานแยกตาม trade: '+this._crewTxt(cur),{s:20}),{dn:80});",
   "if(this._crewTxt(cur)) body+=PA(R('แรงงานแยกตาม trade: '+this._crewTxt(cur),{s:20}),{dn:80}); if(this._otTxt(cur)) body+=PA(R('ล่วงเวลา (OT): '+this._otTxt(cur),{s:20}),{dn:80});", 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
t = t.slice(0, rI) + VIEW + t.slice(rI);
let pts = 1;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ แจ้ง OT ในรายงานประจำวัน: แก้ ' + pts + ' จุด');
