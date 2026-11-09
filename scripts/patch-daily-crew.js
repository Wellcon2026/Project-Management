#!/usr/bin/env node
/* =====================================================================
   รายงานประจำวัน (Site) — กระชับขึ้น + คนเข้างานแยกตาม trade
     node scripts/patch-daily-crew.js
   - คนเข้างาน: ตารางช่าง 12 ประเภท (กด + / − หรือพิมพ์จำนวน) → รวมให้อัตโนมัติ (ยอดรวมยังเก็บใน workers เหมือนเดิม)
     ข้อมูลแยก trade เก็บที่ dailies[].crew = { 'ช่างไม้': 4, ... } · รายงานเดิมที่ใส่แค่ยอดรวม ยังแสดงยอดเดิม
   - งานที่ทำวันนี้: ปุ่ม trade ที่เข้างาน → เติมบรรทัด "• ช่างไม้: " ให้พิมพ์ต่อ
   - ส่งออก Excel / Word: เพิ่มบรรทัด "แยกตาม trade"
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
if (t.includes('_crewProps(r){')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (รายงานประจำวัน · คนเข้างานแยก trade)'); process.exit(0); }

const BTN = 'flex:none;width:26px;height:28px;border-radius:8px;border:1px solid #E4DED2;background:#fff;color:#6E5424;font-size:16px;font-weight:700;line-height:1;cursor:pointer;padding:0;font-family:inherit;display:flex;align-items:center;justify-content:center';
const CREW = `<div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-bottom:6px"><span style="font-size:10px;color:#8C877D;font-weight:700">คนเข้างาน · แยกตาม trade</span><span class="num" style="font-size:12px;font-weight:800;color:#1C1B18;background:#F3EAD9;border-radius:999px;padding:2px 11px">รวม {{ r.crewTotal }} คน</span><span style="font-size:10px;color:#A29B8C">{{ r.crewNote }}</span></div>
                  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:6px">
                    <sc-for list="{{ r.crewRows }}" as="c" hint-placeholder-count="6">
                      <div style="display:flex;align-items:center;gap:5px;border:1px solid {{ c.bd }};background:{{ c.bg }};border-radius:10px;padding:4px 5px 4px 9px;min-width:0">
                        <span style="flex:1;min-width:0;font-size:11.5px;font-weight:600;color:{{ c.fg }};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="{{ c.full }}">{{ c.name }}</span>
                        <button sc-camel-on-click="{{ c.onMinus }}" title="ลด 1 คน" style="${BTN}">−</button>
                        <input type="number" inputmode="numeric" min="0" value="{{ c.n }}" sc-camel-on-change="{{ c.onSet }}" style="width:36px;flex:none;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:7px;padding:4px 2px;font-size:13px;font-weight:800;text-align:center;font-family:inherit;color:{{ c.fg }}">
                        <button sc-camel-on-click="{{ c.onPlus }}" title="เพิ่ม 1 คน" style="${BTN}">+</button>
                      </div>
                    </sc-for>
                  </div></div>
                `;
const CHIPS = `<div style="display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px"><sc-for list="{{ r.workChips }}" as="w" hint-placeholder-count="4"><button sc-camel-on-click="{{ w.onPick }}" title="เติมบรรทัดของ trade นี้" style="border:1px dashed #C9BFA9;background:#FCFAF5;border-radius:999px;padding:3px 10px;font-size:10.5px;font-weight:600;color:#8A7657;cursor:pointer;font-family:inherit;white-space:nowrap" style-hover="border-color:#C9A961;color:#1C1B18">+ {{ w.name }}</button></sc-for></div>`;
const E = [
  ['ถอดช่องคนเข้างานเดิม + ใส่ตารางแยก trade', `<div style="margin-left:auto;display:flex;align-items:center;gap:6px">
                    <span style="font-size:10.5px;color:#8C877D">คนเข้างาน</span>
                    <input type="number" value="{{ r.workers }}" sc-camel-on-change="{{ r.onWorkers }}" style="width:64px;border:1px solid #E4DED2;background:#FCFAF5;border-radius:8px;padding:6px 8px;font-size:12px;font-family:inherit;color:#2C2A25">
                  </div>
                  <button sc-camel-on-click="{{ r.onDel }}" style="flex:none;border:none;background:transparent;cursor:pointer;padding:4px"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none" stroke="#B0522F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg></button>
                  <button sc-camel-on-click="{{ r.onClose }}" style="flex:none;border:1px solid #E4DED2;background:#FCFAF5;border-radius:8px;cursor:pointer;padding:5px 10px;font-size:11px;font-weight:600;color:#6E695E;font-family:inherit">ปิด</button>
                </div>
                <div><div style="font-size:10px;color:#8C877D;font-weight:700;margin-bottom:4px">ผู้รับผิดชอบ · คะแนน</div>`,
    (a) => { const k = a.indexOf('\n                  </div>\n'); const r = a.lastIndexOf('<div><div style="font-size:10px;color:#8C877D;font-weight:700;margin-bottom:4px">ผู้รับผิดชอบ');
      return '<div style="margin-left:auto"></div>' + a.slice(k + '\n                  </div>'.length, r) + CREW + a.slice(r); }],
  ['ปุ่ม trade เติมงานที่ทำวันนี้', '<div><div style="font-size:10px;color:#8C877D;font-weight:700;margin-bottom:4px">งานที่ทำวันนี้</div>', (a) => a + '\n                  ' + CHIPS],
  ['ค่าที่ส่งให้ฟอร์ม', "onWork:on('dailies',r.id,'work'), onProblem:on('dailies',r.id,'problem'),", (a) => a + ' ...this._crewProps(r),   // v1.364.8 daily-crew'],
  ['Excel: แยกตาม trade', "['คนเข้างาน', Number(cur.workers||0)],", (a) => a + " ...(this._crewTxt(cur)?[['แยกตาม trade', this._crewTxt(cur)]]:[]),"],
  ['Word: แยกตาม trade', "info('ผู้รายงาน', cur.by||'—', 'คนเข้างาน', (cur.workers||'—')+' คน')], true);", (a) => a + " if(this._crewTxt(cur)) body+=PA(R('แรงงานแยกตาม trade: '+this._crewTxt(cur),{s:20}),{dn:80});"],
  ['ตัวช่วย _crewProps', '  siteReportExport(pid, r, fmt){', (a) => `  // v1.364.8 daily-crew: คนเข้างานแยกตาม trade (dailies[].crew) · workers = ยอดรวม
  _crewTrades(){ return ['ช่างไม้','ช่างฝ้า / ยิปซัม','ช่างสี','ช่างกระเบื้อง / หิน','ช่างติดตั้ง Built-in','ช่างไฟฟ้า','ช่างประปา / แอร์','ช่างเหล็ก / อลูมิเนียม','ช่างกระจก','กรรมกร / ผู้ช่วย','ผู้รับเหมาช่วง (Subcon)','โฟร์แมน / หัวหน้าช่าง']; }
  _crewShort(k){ return ({ 'ช่างฝ้า / ยิปซัม':'ช่างฝ้า', 'ช่างกระเบื้อง / หิน':'กระเบื้อง', 'ช่างติดตั้ง Built-in':'Built-in', 'ช่างไฟฟ้า':'ไฟฟ้า', 'ช่างประปา / แอร์':'ประปา', 'ช่างเหล็ก / อลูมิเนียม':'เหล็ก/อลู', 'ช่างกระจก':'กระจก', 'กรรมกร / ผู้ช่วย':'กรรมกร', 'ผู้รับเหมาช่วง (Subcon)':'Subcon', 'โฟร์แมน / หัวหน้าช่าง':'โฟร์แมน' })[k]||k; }
  _crewTxt(r){ const c=(r&&r.crew)||{}; return Object.keys(c).filter(k=>Number(c[k])>0).map(k=>k+' '+c[k]+' คน').join(' · '); }
  _crewProps(r){ const id=r.id; const cur=()=>(this.state.dailies||[]).find(x=>x.id===id)||r;
    const crew={ ...(r.crew||{}) }; const sum=(o)=>Object.keys(o).reduce((a,k)=>a+(Number(o[k])||0),0);
    const T=this._crewTrades(); const all=[...T, ...Object.keys(crew).filter(k=>T.indexOf(k)<0)];
    const setN=(k,n)=>{ const c={ ...(cur().crew||{}) }; n=Math.max(0,Math.min(999,Math.round(Number(n)||0))); if(n) c[k]=n; else delete c[k];
      this.soSet('dailies',id,'crew',c); this.soSet('dailies',id,'workers',String(sum(c)||'')); };
    const tot=sum(crew), legacy=!tot&&Number(r.workers)>0;
    return { crewTotal:String(tot||(legacy?Number(r.workers):0)), crewNote:legacy?'ยอดเดิม (ยังไม่ได้แยก trade)':'แตะ + / − หรือพิมพ์จำนวน',
      crewRows:all.map(k=>{ const n=Number(crew[k])||0; return { key:k, name:this._crewShort(k), full:k, n:String(n), bg:n?'#FBF3E2':'#FCFAF5', bd:n?'#E2CB92':'#ECE6DA', fg:n?'#1C1B18':'#A29B8C',
        onMinus:()=>setN(k,(Number((cur().crew||{})[k])||0)-1), onPlus:()=>setN(k,(Number((cur().crew||{})[k])||0)+1), onSet:(e)=>setN(k,e&&e.target?e.target.value:0) }; }),
      workChips:(tot?all.filter(k=>Number(crew[k])>0):T.slice(0,6)).map(k=>({ key:k, name:this._crewShort(k),
        onPick:()=>{ const w=String(cur().work||''); this.soSet('dailies',id,'work',(w.trim()?w.replace(/\\s+$/,'')+'\\n':'')+'• '+k+': '); } })) }; }
` + a],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ รายงานประจำวัน: คนเข้างานแยกตาม trade · ปุ่มเติมงานตาม trade · ส่งออกมีแยก trade');
