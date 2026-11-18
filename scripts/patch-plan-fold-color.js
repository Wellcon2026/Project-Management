#!/usr/bin/env node
/* =====================================================================
   v1.427.0 plan-fold-color — แผนงาน (Gantt): พับ/ขยายงานย่อย · ย้ายงานหลักพร้อมงานย่อย · สีแท่งรายกิจกรรม · 18/11/2026
     node scripts/patch-plan-fold-color.js        (รันต่อจาก patch-plan-ai.js)
   1) งานหลัก (มีงานย่อย) มีลูกศร ▼ / ▶ ในช่องชื่อ — กดพับ/แสดงงานย่อย (แบบ MS Project)
      · ปุ่ม "▶ พับงานย่อยทั้งหมด" / "▼ แสดงงานย่อยทั้งหมด" ท้ายแถบคำอธิบายสี · จำในเครื่อง (localStorage wc_plan_fold)
      · พับอยู่ = ซ่อนแถวที่แสดงเท่านั้น ข้อมูล / ส่งออก Excel ครบเหมือนเดิม
   2) ลากย้ายงานหลัก = งานย่อยทุกชั้นย้ายตามเป็นก้อนเดียว (ลำดับ ord ต่อเนื่อง · พื้นที่ / Section ย้ายตามด้วย)
      · วางต่อจากงานหลักที่มีงานย่อย → ไปต่อท้ายก้อนงานย่อยของแถวนั้น (ไม่แทรกกลาง)
   3) สีแท่ง Gantt: ปุ่ม ⋯ ของแต่ละแถว → เลือกสี 10 สี หรือ ↺ อัตโนมัติ
      · งานย่อยที่ไม่ได้ตั้งสี ใช้สีของงานหลัก (สืบทอดหลายชั้น) · ไม่ตั้งสีเลย = สีตามสถานะเหมือนเดิม
      · งานหลักมีปุ่ม "งานย่อยใช้สีตามงานหลัก" (ล้างสีที่ตั้งไว้ในงานย่อย) · ขอบซ้ายช่องชื่อแสดงสีที่ใช้
      · ช่องเปอร์เซ็นต์ท้ายแถวยังแสดงสีตามสถานะ (เสร็จ / กำลังทำ / ล่าช้า / รอเริ่ม)
   ไม่ต้องรัน SQL (ฟิลด์ color เก็บในแถวแผนงานเดิม) · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.427.0 plan-fold-color';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (พับงานย่อย · ย้ายพร้อมงานย่อย · สีแท่ง)'); process.exit(0); }
if (!t.includes('v1.426.0 plan-ai')) { console.error('✗ ต้องรัน scripts/patch-plan-ai.js ก่อน'); process.exit(1); }

// ---------------------------------------------------------------- template
const TITLE_OLD = '<input value="{{ r.title }}" sc-camel-on-change="{{ r.onTitle }}" placeholder="กิจกรรม" style="flex:0 0 {{ r.titleW }};min-width:0;max-width:{{ r.titleW }};box-sizing:border-box;border:1px solid #E4DED2;background:{{ r.cellBg }};font-weight:{{ r.titleWt }};border-radius:7px;padding:6px 7px;font-size:11px;font-family:inherit;color:#2C2A25">';
const TITLE_NEW = '<div style="flex:0 0 {{ r.titleW }};min-width:0;max-width:{{ r.titleW }};position:relative"><!-- ' + MARK + ' -->' +
  '<sc-if value="{{ r.isParent }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ r.onFold }}" title="{{ r.foldTip }}" style="position:absolute;left:3px;top:50%;transform:translateY(-50%);z-index:2;width:17px;height:20px;border:none;background:transparent;cursor:pointer;padding:0;font-size:9px;line-height:1;color:#5B7A93;font-family:inherit">{{ r.foldIcon }}</button></sc-if>' +
  '<input value="{{ r.title }}" sc-camel-on-change="{{ r.onTitle }}" placeholder="กิจกรรม" title="{{ r.title }}" style="width:100%;box-sizing:border-box;border:1px solid #E4DED2;border-left:3px solid {{ r.tagCol }};background:{{ r.cellBg }};font-weight:{{ r.titleWt }};border-radius:7px;padding:6px 7px;padding-left:{{ r.titlePad }};font-size:11px;font-family:inherit;color:#2C2A25"></div>';

const FILL_OLD = '<div style="height:100%;width:{{ r.fill }};background:{{ r.color }};border-radius:4px"></div>';
const FILL_NEW = '<div style="height:100%;width:{{ r.fill }};background:{{ r.barFill }};border-radius:4px"></div>';

const CHIP = '<span class="num" style="align-self:flex-end;font-size:10.5px;font-weight:700;color:{{ r.color }};background:{{ r.bgChip }};border-radius:7px;padding:6px 10px">{{ r.stLabel }}</span>';
const COLOR_BOX = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:9.5px;color:#8C877D;font-weight:700;margin-bottom:3px">สีแท่ง Gantt <span style="font-weight:400">{{ r.colorNote }}</span></div>' +
  '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px">' +
  '<sc-for list="{{ r.colorSw }}" as="c" hint-placeholder-count="11"><button sc-camel-on-click="{{ c.onPick }}" title="{{ c.tip }}" style="width:22px;height:22px;box-sizing:border-box;border-radius:50%;border:2px solid {{ c.ring }};box-shadow:0 0 0 1px #E4DED2;background:{{ c.bg }};cursor:pointer;padding:0;font-size:10px;font-weight:800;line-height:1;color:{{ c.fg }};font-family:inherit">{{ c.mark }}</button></sc-for>' +
  '<sc-if value="{{ r.kidsResetOn }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ r.onKidsReset }}" title="ล้างสีที่ตั้งไว้ในงานย่อย ให้ใช้สีของงานหลักนี้" style="border:1px solid #E4DED2;background:#fff;border-radius:7px;padding:4px 9px;cursor:pointer;font-family:inherit;font-size:10.5px;font-weight:600;color:#6E695E">งานย่อยใช้สีตามงานหลัก</button></sc-if>' +
  '</div></div>\n                        ';

const LEGEND_END = '>งานย่อย</span>';
const LEGEND_NEW = LEGEND_END +
  '<sc-if value="{{ planFoldOn }}" hint-placeholder-val="{{ false }}"><span style="flex:1"></span>' +
  '<button sc-camel-on-click="{{ onPlanFoldAll }}" title="ซ่อนงานย่อยทุกงานหลัก — ดูภาพรวม" style="border:1px solid #DED7C8;background:#fff;border-radius:7px;padding:3px 9px;cursor:pointer;font-family:inherit;font-size:10px;font-weight:700;color:#4A463E">▶ พับงานย่อยทั้งหมด</button>' +
  '<button sc-camel-on-click="{{ onPlanUnfoldAll }}" title="แสดงงานย่อยทุกงานหลัก" style="border:1px solid #DED7C8;background:#fff;border-radius:7px;padding:3px 9px;cursor:pointer;font-family:inherit;font-size:10px;font-weight:700;color:#4A463E">▼ แสดงงานย่อยทั้งหมด</button></sc-if>';

// ---------------------------------------------------------------- logic
const MIX_OLD = "      const mix=[];\n      secList.forEach(sec=>{";
const MIX_NEW = "      const mix=[];\n" +
  "      // " + MARK + ": พับ/ขยายงานย่อย · ย้ายงานหลักพร้อมงานย่อย · สีแท่ง (งานย่อยสืบทอดสีงานหลัก)\n" +
  "      const _fold=S.planFold||this._planFoldLS(), _fullIds=[], _pOf={}; all.forEach(x=>{ _pOf[x.id]=x.parent||''; });\n" +
  "      const _isDesc=(id,anc)=>{ let p=_pOf[id], n=0; while(p&&n++<40){ if(p===anc) return true; p=_pOf[p]; } return false; };\n" +
  "      const _colOf=(x)=>{ let c=x&&x.color, p=x&&_pOf[x.id], n=0; while(!c&&p&&n++<40){ const y=all.find(z=>z.id===p); c=y&&y.color; p=_pOf[p]; } return c||''; };\n" +
  "      const _setFold=(F)=>{ this.__pf=F; try{ localStorage.setItem('wc_plan_fold',JSON.stringify(F)); }catch(e){} this.setState({ planFold:F }); };\n" +
  "      const _parIds=all.filter(x=>all.some(c=>c.parent===x.id)).map(x=>x.id);\n" +
  "      out.planFoldOn=_parIds.length>0;\n" +
  "      out.onPlanFoldAll=()=>{ const F={ ...(this.state.planFold||this._planFoldLS()) }; _parIds.forEach(id=>{ F[id]=true; }); _setFold(F); this.showToast('พับงานย่อยแล้ว '+_parIds.length+' งานหลัก'); };\n" +
  "      out.onPlanUnfoldAll=()=>{ const F={ ...(this.state.planFold||this._planFoldLS()) }; _parIds.forEach(id=>{ delete F[id]; }); _setFold(F); };\n" +
  "      secList.forEach(sec=>{";

const WALK_OLD = "const ordered=[]; const walk=(r,lv)=>{ ordered.push([r,Math.min(lv,4)]); kidsOf(r.id).forEach(c=>walk(c,lv+1)); };\n        lvl0.forEach(r=>walk(r,0));";
const WALK_NEW = "const ordered=[]; const walk=(r,lv)=>{ ordered.push([r,Math.min(lv,4)]); if(_fold[r.id]) return; kidsOf(r.id).forEach(c=>walk(c,lv+1)); };\n        lvl0.forEach(r=>walk(r,0));\n" +
  "        { const wa=(r)=>{ _fullIds.push(r.id); kidsOf(r.id).forEach(wa); }; lvl0.forEach(wa); }   // ลำดับเต็ม (รวมแถวที่พับ) ใช้ตอนลากย้าย";

const LOOP_OLD = "if(newParent&&(newParent===dragId||underOf(newParent,dragId))){";
const LOOP_NEW = "if(newParent&&(newParent===dragId||_isDesc(newParent,dragId))){";

const DROP_OLD =
  "              const ids=dispIds.filter(x=>x!==dragId);\n" +
  "              const at=ids.indexOf(r.id); ids.splice(at+1,0,dragId);\n" +
  "              this._dragPlan=null;\n" +
  "              this.setState(st=>({ plans:(st.plans||[]).map(x=>{\n" +
  "                let y=x;\n" +
  "                if(x.id===dragId) y={ ...x, parent:newParent, section:r.section||'' };\n";
const DROP_NEW =
  "              // " + MARK + ": ย้ายเป็นก้อน = งานหลัก + งานย่อยทุกชั้น · วางต่อท้ายก้อนงานย่อยของแถวเป้าหมาย\n" +
  "              const blk=_fullIds.filter(x=>x===dragId||_isDesc(x,dragId)), bs=new Set(blk);\n" +
  "              const ids=_fullIds.filter(x=>!bs.has(x));\n" +
  "              let at=ids.indexOf(r.id); while(at>=0&&at+1<ids.length&&_isDesc(ids[at+1],r.id)) at++;\n" +
  "              ids.splice(at+1,0,...blk);\n" +
  "              const secT=r.section||'';\n" +
  "              this._dragPlan=null;\n" +
  "              this.setState(st=>({ plans:(st.plans||[]).map(x=>{\n" +
  "                let y=x;\n" +
  "                if(x.id===dragId) y={ ...x, parent:newParent, section:secT };\n" +
  "                else if(bs.has(x.id)&&String(x.section||'')!==secT) y={ ...x, section:secT };\n";
const TOAST_OLD = "this.showToast(newParent?'ย้ายเป็นงานย่อยแล้ว':'ย้ายลำดับแล้ว'); },";
const TOAST_NEW = "this.showToast((newParent?'ย้ายเป็นงานย่อยแล้ว':'ย้ายลำดับแล้ว')+(blk.length>1?(' · งานย่อย '+(blk.length-1)+' รายการย้ายตาม'):'')); },";

const TK_OLD = "            isParent:kidsOf(r.id).length>0,\n";
const TK_NEW = TK_OLD +
  "            ...(()=>{ // " + MARK + "\n" +
  "              const isPar=kidsOf(r.id).length>0, folded=isPar&&!!_fold[r.id], nd=isPar?all.filter(x=>_isDesc(x.id,r.id)).length:0;\n" +
  "              const own=String(r.color||''), eff=_colOf(r);\n" +
  "              return { foldIcon:folded?'▶':'▼', foldTip:(folded?'แสดงงานย่อย ':'พับงานย่อย ')+nd+' รายการ',\n" +
  "                onFold:()=>{ const F={ ...(this.state.planFold||this._planFoldLS()) }; if(F[r.id]) delete F[r.id]; else F[r.id]=true; _setFold(F); },\n" +
  "                titlePad:isPar?'20px':'7px', tagCol:eff||'#E4DED2',\n" +
  "                colorNote:own?'':(eff?'· ตามงานหลัก':'· ตามสถานะ'),\n" +
  "                colorSw:[{ key:'auto', bg:'#fff', ring:own?'#fff':'#1C1B18', mark:'↺', fg:'#8C877D', tip:'อัตโนมัติ — '+(r.parent?'ใช้สีงานหลัก / ':'')+'สีตามสถานะ', onPick:()=>this.soSet('plans',r.id,'color','') },\n" +
  "                  ...this.PLAN_COLORS().map(([c,n])=>({ key:c, bg:c, ring:own===c?'#1C1B18':'#fff', mark:own===c?'✓':'', fg:'#fff', tip:n, onPick:()=>this.soSet('plans',r.id,'color',c) }))],\n" +
  "                kidsResetOn:isPar&&all.some(x=>x.color&&_isDesc(x.id,r.id)),\n" +
  "                onKidsReset:()=>{ this.setState(st=>({ plans:(st.plans||[]).map(x=>(x.project===r.project&&x.color&&_isDesc(x.id,r.id))?{ ...x, color:'' }:x) })); this.showToast('งานย่อยใช้สีตามงานหลักแล้ว'); } }; })(),\n";

const BAR_OLD = "hasBar:false, left:'0%', width:'0%', bg:r.stColor+'33', color:r.stColor,";
const BAR_NEW = "hasBar:false, left:'0%', width:'0%', bg:(_colOf(r)?_colOf(r)+'73':r.stColor+'33'), barFill:_colOf(r)||r.stColor, color:r.stColor,";
const SUM_OLD = "tk.bg='#1C1B1822'; tk.fill='0%';";
const SUM_NEW = "tk.bg=_colOf(r)?(_colOf(r)+'8C'):'#1C1B1822'; tk.fill='0%';";

const FL_OLD = "const FL={ sched:'ชื่อแผน',";
const FL_NEW = "const FL={ color:'สีแท่ง', sched:'ชื่อแผน',";

const METHODS =
  "  // " + MARK + ": สีแท่ง Gantt + สถานะพับงานย่อย (จำในเครื่อง)\n" +
  "  PLAN_COLORS(){ return [['#B8935A','ทอง'],['#C2681E','ส้ม'],['#C4442E','แดง'],['#B86B4B','อิฐ'],['#8A7FA6','ม่วง'],['#5E86A6','ฟ้า'],['#3E7C8A','เขียวน้ำทะเล'],['#2E7D46','เขียว'],['#7C8C6E','เขียวมะกอก'],['#6E695E','เทา']]; }\n" +
  "  _planFoldLS(){ if(this.__pf) return this.__pf; let F={}; try{ F=JSON.parse(localStorage.getItem('wc_plan_fold')||'{}')||{}; }catch(e){ F={}; } this.__pf=F; return F; }\n";

const R = [
  ['ช่องชื่อ + ลูกศรพับ', TITLE_OLD, TITLE_NEW],
  ['สีเนื้อแท่ง', FILL_OLD, FILL_NEW],
  ['ตัวเลือกสีในแผง ⋯', CHIP, COLOR_BOX + CHIP],
  ['ปุ่มพับ/แสดงทั้งหมด', LEGEND_END, LEGEND_NEW],
  ['ตัวช่วยพับ/สี', MIX_OLD, MIX_NEW],
  ['ลำดับแสดง (พับ)', WALK_OLD, WALK_NEW],
  ['กันวางใต้ลูกตัวเอง', LOOP_OLD, LOOP_NEW],
  ['ลากย้ายเป็นก้อน', DROP_OLD, DROP_NEW],
  ['ข้อความหลังย้าย', TOAST_OLD, TOAST_NEW],
  ['ค่าพับ/สีรายแถว', TK_OLD, TK_NEW],
  ['สีแท่ง', BAR_OLD, BAR_NEW],
  ['สีแท่งสรุปงานหลัก', SUM_OLD, SUM_NEW],
  ['ชื่อฟิลด์ในบันทึก', FL_OLD, FL_NEW],
  ['เมธอดสี/พับ', '  PLAN_PH(){', METHODS + '  PLAN_PH(){'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ พับงานย่อย · ย้ายพร้อมงานย่อย · สีแท่ง: แก้ ' + R.length + ' จุด');
