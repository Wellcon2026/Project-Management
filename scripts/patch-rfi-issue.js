#!/usr/bin/env node
/* =====================================================================
   v1.412.0 rfi-issue — ผู้บริหารสั่ง 16/11/2026: ออกแบบระบบ RFI / RFA ให้ช่วยผู้ใช้ "ออกเอกสาร" ถึง Owner / Designer / Consult
     node scripts/patch-rfi-issue.js        (รันหลัง patch-rate-mat.js)
   หน้าโครงการ → RFI / RFA → เปิดรายการ → หัวข้อใหม่ "② ออกเอกสารถึง Owner / Designer / Consult"
   1) ผู้รับเอกสาร: เลือกจากข้อมูล "คู่สัญญา" ของโครงการ (Owner · Consult / PM ฝ่ายลูกค้า · Designer · QS ฝ่ายลูกค้า · Main Contractor · MEP · Landlord)
      → ชื่อบริษัท · ผู้ติดต่อ · อีเมล ใส่ให้อัตโนมัติ (แก้เฉพาะฉบับได้) · สำเนาถึง (CC)
   2) มาตรฐาน RFI ของบริษัท: ประเภท 7 แบบ (RFA 6 แบบ) · ความเร่งด่วน 4 ระดับ → คิดวันครบกำหนดตอบให้ (วันทำการ จันทร์–ศุกร์)
      · อ้างอิง (เลขที่แบบ · Spec · ตำแหน่ง · เอกสารที่เกี่ยวข้อง) · แนวทางที่ Wellcon เสนอ (RFI ต้องมี ยกเว้นประเภท Site Condition)
      · ผลกระทบค่าใช้จ่าย / ระยะเวลา (ไม่มีช่องตัวเลขเงิน — ตัวเลขไปที่ VO) · ผลหากไม่ได้คำตอบในกำหนด · ภาษาเอกสาร EN / TH / สองภาษา
   3) ตรวจก่อนออกเอกสาร: รายการที่ต้องครบ + คำเตือน (ถ้อยคำกล่าวโทษ · ส่งข้ามสายงานถึง Owner · มีตัวเลขเงินในข้อความ · เรื่องด่วนให้โทรก่อน · VO 48 ชม.)
   4) เลขที่เอกสารทางการ WC-RFI-[รหัสโครงการ]-[ลำดับ] (RFA มี Rev.) · ปุ่ม "ออกเอกสาร" → บันทึกวันออก + ผู้ออก · ก่อนออก เอกสารมีคำว่า DRAFT
   5) เอกสารพิมพ์ / PDF ทางการ (A4): หัวบริษัท + เลขผู้เสียภาษี · ถึง / เรียน / สำเนา · อ้างอิง · คำถาม · แนวทางที่เสนอ · ผลกระทบ · รูป · ช่องตอบ + ลงนาม
      (RFA: ช่องผลการพิจารณา A Approved · B Approved as Noted · C Revise and Resubmit · D Rejected)
   6) ติดตาม: บอกวันครบกำหนด / เกินกำหนด → ติดตามครั้งที่ 1 (+1 วัน) · ครั้งที่ 2 สำเนา PM (+3 วัน) · เสนอผู้บริหารยกระดับถึง Owner (+5 วัน)
      · ปุ่มเปิดอีเมลถึงผู้รับ / อีเมลติดตาม (mailto — ผู้ใช้แนบ PDF เอง) · RFA ผล C / D → "ออกฉบับแก้ไข Rev."
   7) ส่งออก Word เดิม: เพิ่มเลขที่ทางการ · ผู้รับ · อ้างอิง · แนวทางที่เสนอ · ผลกระทบ · หัว DRAFT เมื่อยังไม่ออก
   ข้อมูล: rfis[] ฟิลด์เพิ่ม (ไม่บังคับ · ตาราง rfi_log เดิม ไม่ต้องรัน SQL): toParty · toCo · toAttn · toEmail · cc · cat · prio · lang · dwg · spec · zone · rel
            · prop · cost · sched · conseq · issued · issuedBy · rev · result · fu[] · revLog[]
   รายการเดิม / คำถามภายในทีม (ไม่เลือกผู้รับ) ทำงานเหมือนเดิมทุกอย่าง
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
const MARK = 'v1.412.0 rfi-issue';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (RFI / RFA ออกเอกสาร)'); process.exit(0); }
if (!t.includes('v1.411.0 rate-mat')) { console.error('✗ ต้องรัน scripts/patch-rate-mat.js ก่อน'); process.exit(1); }

/* ---------- หน้าจอ ---------- */
const LB = 'font-size:10px;color:#8C877D;font-weight:700;margin-bottom:4px';
const IN = 'width:100%;box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:8px;padding:8px 9px;font-size:12px;font-family:inherit;color:#2C2A25;outline:none';
const GR = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px';
const BT = 'flex:none;display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:10px 14px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;min-height:40px';
const sel = (k, label) => '<div><div style="' + LB + '">' + label + '</div><sc-raw-select ref="{{ r.x' + k + 'Ref }}" value="{{ r.x' + k + 'Val }}" sc-camel-on-change="{{ r.xOn' + k + ' }}" style="' + IN + '"><sc-for list="{{ r.x' + k + 'Opts }}" as="o" hint-placeholder-count="4"><option value="{{ o.value }}">{{ o.label }}</option></sc-for></sc-raw-select></div>';
const inp = (k, label, ph) => '<div><div style="' + LB + '">' + label + '</div><input value="{{ r.x' + k + ' }}" sc-camel-on-change="{{ r.xOn' + k + ' }}" placeholder="' + ph + '" style="' + IN + '"></div>';
const DIV_OLD = '<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span style="font-size:10px;font-weight:800;letter-spacing:.07em;color:#8A7657">② ไฟล์แนบ · รูป {{ r.picCount }}/20 · เอกสาร {{ r.fileCount }}';
const SECTION = [
  '<!-- ' + MARK + ': ออกเอกสารถึงภายนอก -->',
  '<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span style="font-size:10px;font-weight:800;letter-spacing:.07em;color:#8A7657">② ออกเอกสารถึง Owner / Designer / Consult</span><span style="flex:1;height:1px;background:#EFE9DC"></span></div>',
  '<div style="' + GR + ';align-items:end">',
  '  ' + sel('To', 'ผู้รับเอกสาร (ภายนอก) — ดึงจากข้อมูลคู่สัญญาของโครงการ'),
  '  <sc-if value="{{ r.xInt }}" hint-placeholder-val="{{ true }}"><div style="font-size:11px;color:#9A948A;line-height:1.6;padding:4px 2px">เลือกผู้รับเพื่อออกเป็นเอกสารทางการ (มีเลขที่เอกสาร · พิมพ์ / PDF · ติดตามวันครบกำหนดตอบ) — คำถามภายในทีมไม่ต้องเลือก</div></sc-if>',
  '</div>',
  '<sc-if value="{{ r.xExt }}" hint-placeholder-val="{{ false }}">',
  '<div style="display:flex;flex-direction:column;gap:10px;background:#FBF9F4;border:1px solid #EFE9DC;border-radius:12px;padding:12px">',
  '  <div style="' + GR + '">' + inp('Co', 'บริษัทผู้รับ', 'ชื่อบริษัท') + inp('Attn', 'เรียน (ผู้ติดต่อ)', 'ชื่อ-นามสกุล') + inp('Email', 'อีเมลผู้รับ', 'name@company.com') + inp('Cc', 'สำเนาถึง (CC)', 'ชื่อ หรืออีเมล คั่นด้วยจุลภาค') + '</div>',
  '  <sc-if value="{{ r.xPartyHintOn }}" hint-placeholder-val="{{ false }}"><div style="font-size:11px;color:#8A5E14;background:#FBF4E4;border-radius:8px;padding:7px 10px;line-height:1.6">{{ r.xPartyHint }}</div></sc-if>',
  '  <div style="' + GR + '">' + sel('Cat', 'ประเภท') + sel('Prio', 'ความเร่งด่วน → วันครบกำหนดตอบ') + sel('Lang', 'ภาษาเอกสาร') + '</div>',
  '  <div style="font-size:10.5px;color:#9A948A;line-height:1.6">เลือกความเร่งด่วนแล้วระบบใส่วันที่ในช่อง "ต้องการคำตอบใน" ให้ · วันทำการ = จันทร์–ศุกร์ ยังไม่หักวันหยุดนักขัตฤกษ์ — แก้วันที่เองได้</div>',
  '  <div style="' + GR + '">' + inp('Dwg', 'เลขที่แบบ', 'เช่น ID-301 Rev.B') + inp('Spec', 'ข้อกำหนด / Spec', 'เช่น Section 09 51 00') + inp('Zone', 'ตำแหน่ง · ชั้น / โซน / ห้อง', 'เช่น ชั้น 2 Lobby') + inp('Rel', 'เอกสารที่เกี่ยวข้อง', 'เช่น RFI-003 · MOM 12/11/2026') + '</div>',
  '  <div><div style="' + LB + '">{{ r.xPropLabel }}</div><textarea value="{{ r.xProp }}" sc-camel-on-change="{{ r.xOnProp }}" rows="3" placeholder="{{ r.xPropPh }}" style="' + IN + ';resize:vertical"></textarea></div>',
  '  <div style="' + GR + '">' + sel('Cost', 'ผลกระทบค่าใช้จ่าย (ไม่ใส่ตัวเลขเงิน)') + sel('Sched', 'ผลกระทบระยะเวลา') + '</div>',
  '  ' + inp('Conseq', 'หากไม่ได้รับคำตอบภายในกำหนด จะเกิดอะไรขึ้น', 'เช่น งานฝ้าโซน Lobby เริ่มไม่ได้ตามแผนวันที่ 24/11/2026'),
  '  <div style="background:#fff;border:1px solid #E7E1D5;border-radius:11px;padding:10px 12px">',
  '    <div style="font-size:11px;font-weight:800;color:#4A463E">ตรวจก่อนออกเอกสาร · <span style="color:{{ r.xChkColor }}">{{ r.xChkSum }}</span></div>',
  '    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 14px;margin-top:6px"><sc-for list="{{ r.xChk }}" as="c" hint-placeholder-count="6"><div style="font-size:11.5px;color:#4A463E;line-height:1.6"><span style="font-weight:800;color:{{ c.color }};margin-right:6px">{{ c.ico }}</span>{{ c.t }}</div></sc-for></div>',
  '    <sc-if value="{{ r.xWarnOn }}" hint-placeholder-val="{{ false }}"><div style="margin-top:6px"><sc-for list="{{ r.xWarn }}" as="w" hint-placeholder-count="1"><div style="font-size:11px;color:#8A5E14;background:#FBF4E4;border-radius:8px;padding:6px 10px;margin-top:4px;line-height:1.6">⚠ {{ w.t }}</div></sc-for></div></sc-if>',
  '  </div>',
  '  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">',
  '    <span class="num" style="flex:none;font-size:12.5px;font-weight:800;color:#2A5F73">{{ r.xNo }}</span>',
  '    <sc-if value="{{ r.xDraft }}" hint-placeholder-val="{{ true }}"><span style="flex:none;font-size:10.5px;font-weight:800;color:#C2681E;background:#FBEEDF;border-radius:7px;padding:4px 9px">ร่าง · ยังไม่ออกเอกสาร</span></sc-if>',
  '    <sc-if value="{{ r.xIssued }}" hint-placeholder-val="{{ false }}"><span style="flex:0 1 auto;min-width:0;font-size:10.5px;font-weight:800;color:#2E7D46;background:#E7F3EA;border-radius:7px;padding:4px 9px">{{ r.xIssuedTxt }}</span></sc-if>',
  '    <span style="flex:1 1 10px"></span>',
  '    <button sc-camel-on-click="{{ r.xOnPrint }}" style="' + BT + ';border:1px solid #1C1B18;background:#fff;color:#1C1B18">🖨 พิมพ์ / PDF</button>',
  '    <sc-if value="{{ r.xMailOn }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ r.xOnMail }}" style="' + BT + ';border:1px solid #2A5F73;background:#fff;color:#2A5F73">✉ อีเมลถึงผู้รับ</button></sc-if>',
  '    <sc-if value="{{ r.xDraft }}" hint-placeholder-val="{{ true }}"><button sc-camel-on-click="{{ r.xOnIssue }}" style="' + BT + ';border:none;background:{{ r.xIssueBg }};color:#F4EFE6">ออกเอกสาร</button></sc-if>',
  '    <sc-if value="{{ r.xIssued }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ r.xOnRecall }}" style="' + BT + ';border:1px solid #E4DED2;background:#fff;color:#6E695E;font-weight:600">ถอนการออกเอกสาร</button></sc-if>',
  '  </div>',
  '  <sc-if value="{{ r.xFuOn }}" hint-placeholder-val="{{ false }}"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-top:1px dashed #E4DED2;padding-top:9px">',
  '    <span style="flex:1 1 220px;min-width:0;font-size:11.5px;font-weight:700;color:{{ r.xFuColor }};line-height:1.6">{{ r.xFuTxt }} <span style="font-weight:500;color:#8C877D">{{ r.xFuLog }}</span></span>',
  '    <sc-if value="{{ r.xFuBtn }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ r.xOnFu }}" style="' + BT + ';border:1px solid #C2681E;background:#fff;color:#C2681E">✉ อีเมลติดตาม</button></sc-if>',
  '  </div></sc-if>',
  '  <sc-if value="{{ r.xRevOn }}" hint-placeholder-val="{{ false }}"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-top:1px dashed #E4DED2;padding-top:9px"><span style="flex:1 1 220px;min-width:0;font-size:11.5px;color:#4A463E;line-height:1.6">ผลการพิจารณาให้แก้ไขแล้วส่งใหม่ — สร้างฉบับแก้ไขเพื่อปรับเนื้อหาและออกเอกสารอีกครั้ง (เลขที่เดิม · เพิ่ม Rev.)</span><button sc-camel-on-click="{{ r.xOnRev }}" style="' + BT + ';border:none;background:#2A5F73;color:#fff">{{ r.xRevBtn }}</button></div></sc-if>',
  '</div>',
  '</sc-if>',
  ''
].join('\n');
const ANS_OLD = 'ตอบโดย · {{ r.ansMeta }}</div>';
const ANS_NEW = ANS_OLD + '\n                    <!-- ' + MARK + ': ผลการพิจารณา RFA -->\n                    <sc-if value="{{ r.xIsRfa }}" hint-placeholder-val="{{ false }}"><sc-raw-select ref="{{ r.xResRef }}" value="{{ r.xResVal }}" sc-camel-on-change="{{ r.xOnRes }}" style="' + IN.replace('border:1px solid #E4DED2', 'border:1px solid #D5E3D0') + ';font-weight:700"><sc-for list="{{ r.xResOpts }}" as="o" hint-placeholder-count="4"><option value="{{ o.value }}">{{ o.label }}</option></sc-for></sc-raw-select></sc-if>';

/* ---------- ตรรกะ (ห้ามมี backtick และ dollar-brace ในบล็อกนี้) ---------- */
const CODE = String.raw`  // ===== v1.412.0 rfi-issue: ออก RFI / RFA เป็นเอกสารทางการถึง Owner / Designer / Consult (มาตรฐาน RFI ของบริษัท) =====
  //   rfis[] ฟิลด์เพิ่ม (ไม่บังคับ): toParty (คีย์คู่สัญญา) · toCo · toAttn · toEmail · cc · cat · prio · lang · dwg · spec · zone · rel · prop · cost · sched · conseq
  //   · issued (วันออกเอกสาร — ว่าง = ร่าง) · issuedBy · rev · result (A–D) · fu[{ d, by, lv }] · revLog[] — ไม่เลือกผู้รับ (toParty ว่าง) = คำถามภายในแบบเดิม
  RFX_CATS(){ return { RFI:[['dc','Drawing Clarification','แบบไม่ชัด / ขาดรายละเอียด'],['dd','Drawing Discrepancy','แบบขัดแย้งกัน'],['sc','Specification Clarification','ข้อกำหนดวัสดุไม่ชัด'],['site','Site Condition','สภาพหน้างานไม่ตรงแบบ'],['sub','Material Substitution Request','ขอใช้วัสดุทดแทน'],['co','Coordination Issue','งานหลายระบบชนกัน'],['ap','Approval Request','ขอคำยืนยัน / ขออนุมัติ']],
    RFA:[['mat','Material','วัสดุ'],['smp','Sample','ตัวอย่างวัสดุ'],['mock','Mock-up','ตัวอย่างงานจริง'],['shop','Shop Drawing','แบบขยายเพื่อผลิต'],['ms','Method Statement','วิธีการทำงาน'],['cat','Catalogue / Technical Data','แคตตาล็อก / ข้อมูลเทคนิค']] }; }
  RFX_PRIO(){ return [['std','Standard','ปกติ · 5 วันทำการ',5,true],['pri','Priority','เร่ง · 3 วันทำการ',3,true],['urg','Urgent','ด่วน · 48 ชั่วโมง',2,false],['crit','Critical Path','กระทบเส้นทางวิกฤต · 24 ชั่วโมง + โทรแจ้ง',1,false]]; }
  RFX_COST(){ return [['','— เลือก —',''],['none','ไม่มีผลกระทบ','None'],['tbd','ยังประเมินไม่ได้ — รอคำตอบ','TBD pending response'],['yes','มีผลกระทบ — เสนอเป็น VO แยกต่างหาก','Yes — to be advised by Variation Order']]; }
  RFX_SCHED(){ return [['','— เลือก —',''],['none','ไม่มีผลกระทบ','None'],['yes','มีผลกระทบต่อแผนงาน','Yes'],['crit','กระทบเส้นทางวิกฤต (Critical Path)','Yes — critical path']]; }
  RFX_RESULT(){ return [['A','Approved','อนุมัติ'],['B','Approved as Noted','อนุมัติตามหมายเหตุ'],['C','Revise and Resubmit','แก้ไขแล้วส่งใหม่'],['D','Rejected','ไม่อนุมัติ']]; }
  RFX_LANG(){ return [['bi','สองภาษา (English / ไทย)'],['en','English'],['th','ภาษาไทย']]; }
  _rfxKind(r){ return (r&&r.kind)||(String((r&&r.no)||'').toUpperCase().startsWith('RFA')?'RFA':'RFI'); }
  _rfxD(iso){ const p=String(iso||'').slice(0,10).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):''; }
  _rfxDue(fromIso, prio){ const P=this.RFX_PRIO().find(x=>x[0]===prio)||this.RFX_PRIO()[0]; const d=new Date(String(fromIso||this._isoToday()).slice(0,10)+'T00:00:00'); let n=P[3];
    while(n>0){ d.setDate(d.getDate()+1); const w=d.getDay(); if(!P[4]||(w!==0&&w!==6)) n--; }
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  _rfxParty(pid, r){ const k=(r&&r.toParty)||''; if(!k) return null; const s=(v)=>String(v||'').trim();
    const D=this.PARTY_DEFS().find(x=>x.key===k), d=((((this.state.projParties||{})[pid])||{})[k])||{}, tm=((this.state.projTeam||{})[pid])||{};
    return { key:k, label:D?D.label:k, short:String(D?D.label:k).split(' · ')[0].split(' / ')[0], co:s(r.toCo)||s(d.company)||s(tm[k]), attn:s(r.toAttn)||s(d.contact), pos:s(d.position), email:s(r.toEmail)||s(d.email), tel:s(d.tel), hasCo:!!(s(d.company)||s(tm[k])), hasAttn:!!s(d.contact) }; }
  _rfxNo(pid, r){ const p=(this.state.projects||[]).find(x=>x.id===pid)||{}, kind=this._rfxKind(r);
    const code=String(p.code||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,10), n=String(r.no||'').replace(/^\D+/,'')||'000';
    return 'WC-'+kind+'-'+(code?(code+'-'):'')+n+((kind==='RFA'&&Number(r.rev)>0)?(' Rev.'+Number(r.rev)):''); }
  _rfxCheck(pid, r){ const kind=this._rfxKind(r), P=this._rfxParty(pid, r), s=(v)=>String(v||'').trim(); const L=[];
    L.push(['หัวข้อเรื่อง', !!s(r.title)]);
    L.push([kind==='RFA'?'รายละเอียดสิ่งที่ขออนุมัติ':'รายละเอียด / คำถาม', !!s(r.detail)]);
    L.push(['ผู้รับ: บริษัท + ชื่อผู้ติดต่อ', !!(P&&P.co&&P.attn)]);
    L.push(['ประเภท', !!s(r.cat)]);
    L.push(['อ้างอิง: เลขที่แบบ / Spec / ตำแหน่ง อย่างน้อย 1 ข้อ', !!(s(r.dwg)||s(r.spec)||s(r.zone))]);
    L.push(['วันที่ต้องการคำตอบ', !!s(r.needBy)]);
    if(kind==='RFI'&&r.cat!=='site') L.push(['แนวทางที่ Wellcon เสนอ', !!s(r.prop)]);
    L.push(['ผลกระทบค่าใช้จ่าย + ระยะเวลา', !!s(r.cost)&&!!s(r.sched)]);
    return L; }
  _rfxWarn(pid, r){ const W=[], s=(v)=>String(v||'').trim(); const txt=[r.title,r.detail,r.prop,r.conseq].map(s).join(' ').toLowerCase();
    const bad=['แบบผิด','ออกแบบผิด','เขียนแบบผิด','ลืม','ความผิดของ','ผิดพลาดของ','ไม่รับผิดชอบ','wrong','forgot','mistake','fault','negligen'].filter(w=>txt.indexOf(w)>=0);
    if(bad.length) W.push('ถ้อยคำอาจอ่านเป็นการกล่าวโทษ ("'+bad.join('", "')+'") — ใช้ถ้อยคำเป็นกลาง เช่น "พบความไม่สอดคล้องระหว่างแบบ" หรือ "ขอความชัดเจน"');
    if(/\d[\d,.]*\s*(บาท|฿|thb|baht)/i.test(txt)||/(฿|thb)\s*\d/i.test(txt)) W.push('พบตัวเลขเงินในข้อความ — ห้ามใส่ต้นทุนหรือราคาภายในลงในเอกสารถึงภายนอก · มูลค่างานเพิ่ม-ลดให้เสนอเป็น VO');
    const PT=((this.state.projParties||{})[pid])||{}, has=(k)=>!!s((PT[k]||{}).company);
    if(r.toParty==='owner'&&(has('designer')||has('consult'))) W.push('ผู้รับคือ Owner โดยตรง — ตามลำดับสายงานให้ส่งถึงผู้ออกแบบ / ที่ปรึกษาก่อน แล้วสำเนา (CC) ถึง Owner');
    if(r.cost==='yes') W.push('มีผลกระทบค่าใช้จ่าย — แจ้ง VO ภายใน 48 ชั่วโมง · No Signed VO = No Additional Work');
    if(r.prio==='crit'||r.prio==='urg') W.push('เรื่องด่วน — โทรแจ้งผู้รับก่อนส่งเอกสาร และบันทึกชื่อผู้รับสาย + เวลาไว้ในรายละเอียด');
    return W; }
  _rfxFollow(r){ if(!r||!r.issued||r.status!=='open'||!r.needBy) return null; const left=this._soD(r.needBy); if(left==null||isNaN(left)) return null; const over=-left, due=this._rfxD(r.needBy);
    if(over<=0) return { lv:0, t:'ครบกำหนดตอบ '+due+(over===0?' · วันนี้':(' · เหลือ '+left+' วัน')), c:'#6E695E' };
    if(over<3) return { lv:1, t:'เกินกำหนดตอบ '+over+' วัน — ส่งอีเมลติดตามครั้งที่ 1', c:'#C2681E' };
    if(over<5) return { lv:2, t:'เกินกำหนดตอบ '+over+' วัน — ติดตามครั้งที่ 2 พร้อมสำเนาถึง PM', c:'#C4442E' };
    return { lv:3, t:'เกินกำหนดตอบ '+over+' วัน — เสนอผู้บริหารพิจารณาออกหนังสือเร่งรัดถึง Owner (ห้ามส่งเองโดยไม่ผ่านผู้บริหาร)', c:'#C4442E' }; }
  _rfxProps(pid, r){ const S=this.state, kind=this._rfxKind(r), s=(v)=>String(v||'').trim();
    const upd=(o)=>this.setState(st=>({ rfis:(st.rfis||[]).map(x=>x.id===r.id?{ ...x, ...(typeof o==='function'?o(x):o) }:x) }));
    const onv=(k)=>((e)=>this.soSet('rfis', r.id, k, e.target.value));
    const sel=(k,cur,opts)=>({ ['x'+k+'Ref']:this._selRef(cur), ['x'+k+'Val']:cur, ['x'+k+'Opts']:opts });
    const P=this._rfxParty(pid, r), ext=!!P, PT=((S.projParties||{})[pid])||{};
    const out={ xExt:ext, xInt:!ext, xIsRfa:kind==='RFA',
      ...sel('To', r.toParty||'', [{ value:'', label:'— ไม่ออกภายนอก (คำถามภายในทีม) —' }].concat(this.PARTY_DEFS().map(d=>{ const c=s((PT[d.key]||{}).company); return { value:d.key, label:d.label+(c?(' · '+c):'') }; }))),
      xOnTo:(e)=>{ const v=e.target.value; upd(x=>({ toParty:v, toCo:'', toAttn:'', toEmail:'', prio:x.prio||'std', lang:x.lang||'bi', needBy:x.needBy||(v?this._rfxDue(this._isoToday(), x.prio||'std'):'') })); },
      ...sel('Res', r.result||'', [{ value:'', label:'— ผลการพิจารณา —' }].concat(this.RFX_RESULT().map(c=>({ value:c[0], label:c[0]+' · '+c[1]+' · '+c[2] })))), xOnRes:onv('result'),
      xToShow:ext?(P.short+(r.issued?' · ออกแล้ว':' · ร่าง')):(r.to||'—') };
    if(!ext) return out;
    const chk=this._rfxCheck(pid, r), miss=chk.filter(c=>!c[1]), warn=this._rfxWarn(pid, r), fl=this._rfxFollow(r), no=this._rfxNo(pid, r), issued=!!r.issued, cats=this.RFX_CATS()[kind]||[], fu=Array.isArray(r.fu)?r.fu:[];
    Object.assign(out,
      sel('Cat', r.cat||'', [{ value:'', label:'— เลือกประเภท —' }].concat(cats.map(c=>({ value:c[0], label:c[1]+' · '+c[2] })))),
      sel('Prio', r.prio||'std', this.RFX_PRIO().map(p=>({ value:p[0], label:p[1]+' · '+p[2] }))),
      sel('Lang', r.lang||'bi', this.RFX_LANG().map(l=>({ value:l[0], label:l[1] }))),
      sel('Cost', r.cost||'', this.RFX_COST().map(c=>({ value:c[0], label:c[1] }))),
      sel('Sched', r.sched||'', this.RFX_SCHED().map(c=>({ value:c[0], label:c[1] }))),
      { xOnCat:onv('cat'), xOnLang:onv('lang'), xOnCost:onv('cost'), xOnSched:onv('sched'),
        xOnPrio:(e)=>{ const v=e.target.value; upd({ prio:v, needBy:this._rfxDue(r.issued||this._isoToday(), v) }); },
        xCo:P.co, xAttn:P.attn, xEmail:P.email, xCc:r.cc||'', xOnCo:onv('toCo'), xOnAttn:onv('toAttn'), xOnEmail:onv('toEmail'), xOnCc:onv('cc'),
        xPartyHintOn:!(P.co&&P.attn), xPartyHint:'ยังไม่มี'+(P.hasCo?'':'ชื่อบริษัท')+((!P.hasCo&&!P.hasAttn)?' / ':'')+(P.hasAttn?'':'ชื่อผู้ติดต่อ')+'ของ "'+P.label+'" ในข้อมูลคู่สัญญาของโครงการ — กรอกในช่องด้านบนได้เลย (ใช้เฉพาะฉบับนี้) หรือไปกรอกที่หน้าคู่สัญญาครั้งเดียว ให้ทุกเอกสารใช้ร่วมกัน',
        xDwg:r.dwg||'', xSpec:r.spec||'', xZone:r.zone||'', xRel:r.rel||'', xProp:r.prop||'', xConseq:r.conseq||'',
        xOnDwg:onv('dwg'), xOnSpec:onv('spec'), xOnZone:onv('zone'), xOnRel:onv('rel'), xOnProp:onv('prop'), xOnConseq:onv('conseq'),
        xPropLabel:kind==='RFA'?'เหตุผล / ข้อมูลประกอบการขออนุมัติ':(r.cat==='site'?'แนวทางที่ Wellcon เสนอ (ถ้ามี)':'แนวทางที่ Wellcon เสนอ — ต้องมีทุกฉบับ'),
        xPropPh:kind==='RFA'?'ยี่ห้อ · รุ่น · สี · ผิวสัมผัส · อ้างอิง Spec — ถ้าเป็นวัสดุทดแทน ให้ระบุเหตุผลและเทียบคุณสมบัติกับของเดิม':'เสนอทางแก้ที่ Wellcon คิดไว้แล้ว เช่น ลดระดับฝ้าลง 50 มม. เฉพาะแนวท่อ และเก็บขอบด้วยบัวเงา 20 มม.',
        xNo:no, xChk:chk.map((c,i)=>({ key:'c'+i, t:c[0], ico:c[1]?'✓':'○', color:c[1]?'#2E7D46':'#C2681E' })),
        xChkSum:miss.length?('ยังขาด '+miss.length+' ข้อ'):'ครบ — พร้อมออกเอกสาร', xChkColor:miss.length?'#C2681E':'#2E7D46',
        xWarnOn:warn.length>0, xWarn:warn.map((w,i)=>({ key:'w'+i, t:w })),
        xIssued:issued, xDraft:!issued, xIssueBg:miss.length?'#B9B2A3':'#1C1B18',
        xIssuedTxt:issued?('ออกเอกสารแล้ว '+this._rfxD(r.issued)+(r.issuedBy?(' · โดย '+r.issuedBy):'')):'',
        xFuOn:!!fl, xFuTxt:fl?fl.t:'', xFuColor:fl?fl.c:'#6E695E', xFuBtn:!!(fl&&fl.lv>0&&P.email),
        xFuLog:fu.length?('· ติดตามแล้ว '+fu.length+' ครั้ง ล่าสุด '+this._rfxD(fu[fu.length-1].d)):'',
        xMailOn:!!P.email,
        xOnPrint:()=>this.rfxPrint(pid, r.id), xOnIssue:()=>this._rfxIssue(pid, r.id),
        xOnMail:()=>this._rfxMail(pid, r.id, 'send'), xOnFu:()=>this._rfxMail(pid, r.id, 'fu'),
        xOnRecall:()=>{ if(typeof window!=='undefined'&&!window.confirm('ถอนการออกเอกสาร '+no+' ?\n\nเอกสารจะกลับเป็นร่าง (DRAFT) — ใช้เมื่อออกผิด หรือยังไม่ได้ส่งให้ผู้รับจริง')) return; upd({ issued:'', issuedBy:'' }); this.showToast('ถอนการออกเอกสารแล้ว — กลับเป็นร่าง'); },
        xRevOn:kind==='RFA'&&issued&&(r.result==='C'||r.result==='D'), xRevBtn:'สร้างฉบับแก้ไข Rev.'+((Number(r.rev)||0)+1),
        xOnRev:()=>{ const nv=(Number(r.rev)||0)+1; if(typeof window!=='undefined'&&!window.confirm('สร้างฉบับแก้ไข Rev.'+nv+' ของ '+(r.no||'')+' ?\n\nผลการพิจารณาและคำตอบของฉบับก่อนหน้าจะเก็บไว้ในประวัติ แล้วเอกสารกลับเป็นร่างเพื่อแก้ไขและออกใหม่')) return;
          upd(x=>({ rev:nv, revLog:[...(Array.isArray(x.revLog)?x.revLog:[]), { rev:Number(x.rev)||0, result:x.result||'', answer:x.answer||'', ansBy:x.ansBy||'', ansDate:x.ansDate||'', issued:x.issued||'' }], result:'', answer:'', ansBy:'', ansDate:'', status:'open', issued:'', issuedBy:'', fu:[] }));
          this.showToast('สร้างฉบับแก้ไข Rev.'+nv+' แล้ว — ปรับเนื้อหาแล้วกด "ออกเอกสาร" อีกครั้ง'); } });
    return out; }
  _rfxIssue(pid, id){ const S=this.state, r=(S.rfis||[]).find(x=>x.id===id); if(!r) return; const P=this._rfxParty(pid, r), miss=this._rfxCheck(pid, r).filter(c=>!c[1]);
    if(miss.length){ this.showToast('ยังออกเอกสารไม่ได้ — ขาด: '+miss.map(c=>c[0]).join(' · ')); return; }
    const no=this._rfxNo(pid, r), me=(S.me&&S.me.name)||'';
    if(typeof window!=='undefined'&&!window.confirm('ออกเอกสาร '+no+'\nถึง '+P.co+' · เรียน '+P.attn+' ?\n\nหลังออกแล้ว เอกสารจะไม่มีคำว่า DRAFT และเริ่มนับวันครบกำหนดตอบ '+this._rfxD(r.needBy))) return;
    const today=this._isoToday();
    this.setState(st=>({ rfis:(st.rfis||[]).map(x=>x.id===id?{ ...x, issued:today, issuedBy:me, status:'open' }:x) }));
    this.showToast('ออกเอกสาร '+no+' แล้ว — พิมพ์ / บันทึกเป็น PDF แล้วส่งให้ผู้รับ'); }
  _rfxMail(pid, id, mode){ const S=this.state, r=(S.rfis||[]).find(x=>x.id===id); if(!r) return; const P=this._rfxParty(pid, r)||{};
    const to=String(P.email||'').replace(/[^\w.@+\-]/g,''); if(!to){ this.showToast('ยังไม่มีอีเมลผู้รับ — กรอกในช่อง "อีเมลผู้รับ"'); return; }
    const kind=this._rfxKind(r), no=this._rfxNo(pid, r), pn=this.projName(pid)||'', th=r.lang==='th', due=this._rfxD(r.needBy), fu=mode==='fu', me=(S.me&&(S.me.fullName||S.me.name))||'';
    const long=kind==='RFA'?'Request for Approval':'Request for Information', longTh=kind==='RFA'?'หนังสือขออนุมัติ':'หนังสือขอข้อมูล / ขอความชัดเจน', title=String(r.title||'').trim();
    const subj=(fu?'REMINDER — ':'')+no+' — '+title+' — '+pn;
    const body=th?(fu?['เรียน '+(P.attn||'ผู้เกี่ยวข้อง'),'','ขออนุญาตติดตาม'+longTh+' เลขที่ '+no+' เรื่อง '+title+' ซึ่งออกเมื่อวันที่ '+this._rfxD(r.issued)+' และขอรับคำตอบภายในวันที่ '+due,'','ขอความกรุณาพิจารณาและแจ้งผลกลับ เพื่อให้งานดำเนินต่อได้ตามแผน','','ขอแสดงความนับถือ',me,'บริษัท เวลล์คอน อินทีเรีย จำกัด']
        :['เรียน '+(P.attn||'ผู้เกี่ยวข้อง'),'','บริษัทฯ ขอนำส่ง'+longTh+' เลขที่ '+no+' โครงการ '+pn+' ตามเอกสารแนบ','','เรื่อง: '+title,'ขอรับคำตอบภายในวันที่: '+due,'','ขอแสดงความนับถือ',me,'บริษัท เวลล์คอน อินทีเรีย จำกัด'])
      :(fu?['Dear '+(P.attn||'Sir / Madam')+',','','This is a kind reminder regarding our '+long+' No. '+no+' ('+title+'), issued on '+this._rfxD(r.issued)+', for which a response was requested by '+due+'.','','We would appreciate your response at your earliest convenience so that the work can proceed as planned.','','Best regards,',me,'Wellcon Interior Co., Ltd.']
        :['Dear '+(P.attn||'Sir / Madam')+',','','Please find attached our '+long+' No. '+no+' for '+pn+'.','','Subject: '+title,'Response required by: '+due,'','Kindly review and advise. Please contact us should you need any clarification.','','Best regards,',me,'Wellcon Interior Co., Ltd.']);
    const cc=String(r.cc||'').split(/[,;\s]+/).filter(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    const href='mailto:'+to+'?'+(cc.length?('cc='+encodeURIComponent(cc.join(','))+'&'):'')+'subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body.join('\n'));
    try{ const a=document.createElement('a'); a.href=href; a.setAttribute('data-rfx-mail','1'); document.body.appendChild(a); a.click(); a.remove(); }catch(e){ this.showToast('เปิดโปรแกรมอีเมลไม่ได้'); return; }
    if(fu){ const fl=this._rfxFollow(r), who=(S.me&&S.me.name)||'', today=this._isoToday();
      this.setState(st=>({ rfis:(st.rfis||[]).map(x=>x.id===id?{ ...x, fu:[...(Array.isArray(x.fu)?x.fu:[]), { d:today, by:who, lv:fl?fl.lv:0 }] }:x) })); }
    this.showToast(fu?'เปิดอีเมลติดตามแล้ว — บันทึกการติดตามในรายการนี้':'เปิดอีเมลแล้ว — แนบไฟล์ PDF ของเอกสาร (พิมพ์ → บันทึกเป็น PDF) ก่อนกดส่ง'); }
  rfxPrint(pid, id){ const r=(this.state.rfis||[]).find(x=>x.id===id); if(!r) return; if(!this._rfxParty(pid, r)){ this.showToast('เลือกผู้รับเอกสารก่อน'); return; }
    const w=window.open('','_blank'); if(!w){ this.showToast('เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต pop-up แล้วลองอีกครั้ง'); return; }
    w.document.write(this._rfxHtml(pid, r)); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 600); }
  _rfxHtml(pid, r){ const S=this.state, s=(v)=>String(v||'').trim();
    const esc=(v)=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'), nl=(v)=>esc(s(v)).replace(/\n/g,'<br>');
    const lang=r.lang||'bi', kind=this._rfxKind(r), P=this._rfxParty(pid, r)||{}, no=this._rfxNo(pid, r), pn=this.projName(pid)||'', p=(S.projects||[]).find(x=>x.id===pid)||{};
    const L=(en,th)=>lang==='en'?esc(en):(lang==='th'?esc(th):(esc(en)+' <span class="th">'+esc(th)+'</span>'));
    const V=(en,th)=>lang==='th'?esc(th):(lang==='en'?esc(en):(esc(en)+' <span class="th">'+esc(th)+'</span>'));
    const cat=(this.RFX_CATS()[kind]||[]).find(c=>c[0]===r.cat), pr=this.RFX_PRIO().find(x=>x[0]===(r.prio||'std'))||this.RFX_PRIO()[0];
    const draft=!r.issued, dateIso=r.issued||this._isoToday(), due=this._rfxD(r.needBy)||'—';
    const flag=r.prio==='crit'?'CRITICAL PATH IMPACT':(r.prio==='urg'?'URGENT':'');
    const bx=(on,txt)=>'<span class="ck"><span class="bx">'+(on?'&#10003;':'&nbsp;')+'</span>'+txt+'</span>';
    const photos=(Array.isArray(r.photos)?r.photos:(r.photo?[r.photo]:[])).slice(0,12), files=(Array.isArray(r.files)?r.files:[]);
    const row=(a,b)=>'<tr><th>'+a+'</th><td>'+(b||'—')+'</td></tr>';
    const sec=(n,title,html)=>'<div class="sec"><div class="h">'+n+'. '+title+'</div><div class="b">'+html+'</div></div>';
    const refs=[[L('Drawing No.','เลขที่แบบ'),r.dwg],[L('Specification','ข้อกำหนด'),r.spec],[L('Location','ตำแหน่ง'),r.zone],[L('Related documents','เอกสารที่เกี่ยวข้อง'),r.rel]].filter(x=>s(x[1]));
    const att=[]; if(photos.length) att.push(photos.length+' '+V('photo(s) — see below','รูป — ดูด้านล่าง')); files.forEach(f=>att.push(esc(f.name||f.link||'file')));
    const revLog=Array.isArray(r.revLog)?r.revLog:[], RES=this.RFX_RESULT();
    let h='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(no)+' · '+esc(pn)+'</title><style>'
      +'@page{size:A4;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{font-family:"Sarabun","Leelawadee UI","Tahoma",system-ui,sans-serif;font-size:10.5pt;color:#1C1B18;margin:0;line-height:1.5}'
      +'.pg{max-width:182mm;margin:0 auto;position:relative;z-index:1}.th{color:#6E695E;font-size:.88em}'
      +'.hd{display:flex;justify-content:space-between;gap:10mm;align-items:flex-start;border-bottom:2.2pt solid #1C1B18;padding-bottom:3mm}'
      +'.co b{font-size:15pt;letter-spacing:.04em}.co div{font-size:8.5pt;color:#4A463E;line-height:1.45}.ti{text-align:right}.ti .k{font-size:14pt;font-weight:800;letter-spacing:.03em}.ti .t{font-size:9.5pt;color:#6E695E}'
      +'.flag{display:inline-block;margin-top:2mm;background:#C4442E;color:#fff;font-weight:800;font-size:9.5pt;padding:1mm 3mm;letter-spacing:.06em}'
      +'table{border-collapse:collapse;width:100%}.info{margin-top:4mm}.info th,.info td{border:.6pt solid #CFC8B8;padding:1.6mm 2.4mm;vertical-align:top;text-align:left;font-size:10pt}.info th{background:#F7F3EA;width:23%;font-weight:700;color:#4A463E}.info td{width:27%}'
      +'.pt{display:flex;gap:4mm;margin-top:4mm}.pt>div{flex:1;border:.6pt solid #CFC8B8;padding:2.4mm 3mm}.pt .l{font-size:8.5pt;font-weight:800;letter-spacing:.07em;color:#8A7657;margin-bottom:1mm}.pt .n{font-weight:700}'
      +'.sub{margin-top:4mm;border:.6pt solid #1C1B18;padding:2.4mm 3mm}.sub .l{font-size:8.5pt;font-weight:800;letter-spacing:.07em;color:#8A7657}.sub .v{font-size:12pt;font-weight:700}'
      +'.sec{margin-top:4mm;break-inside:avoid}.sec .h{font-weight:800;font-size:10.5pt;border-bottom:.9pt solid #C9A961;padding-bottom:.8mm;margin-bottom:1.6mm}.sec .b{font-size:10.5pt}'
      +'.ref th,.ref td{padding:.8mm 0;text-align:left;vertical-align:top;font-size:10pt}.ref th{width:30%;font-weight:700;color:#4A463E}'
      +'.ck{display:inline-flex;align-items:center;gap:1.6mm;margin-right:6mm;white-space:nowrap}.bx{display:inline-block;width:3.6mm;height:3.6mm;border:.8pt solid #1C1B18;font-size:8pt;line-height:3.2mm;text-align:center;font-weight:800}'
      +'.ph{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.ph div{break-inside:avoid;font-size:8.5pt;color:#6E695E;text-align:center}.ph img{width:100%;height:42mm;object-fit:cover;border:.6pt solid #CFC8B8;display:block;margin-bottom:1mm}'
      +'.rsp{margin-top:5mm;border:1.2pt solid #1C1B18;padding:3mm;break-inside:avoid}.rsp .h{font-weight:800;font-size:10.5pt;margin-bottom:2mm}.rsp .box{min-height:24mm;border:.6pt dashed #B4AE9F;padding:2mm;margin-top:2mm}'
      +'.sg{display:flex;gap:6mm;margin-top:7mm;break-inside:avoid}.sg>div{flex:1;font-size:9.5pt;text-align:center}.sg .ln{border-bottom:.8pt solid #1C1B18;height:13mm;margin-bottom:1.4mm}'
      +'.ft{margin-top:5mm;border-top:.6pt solid #CFC8B8;padding-top:1.6mm;font-size:8pt;color:#8C877D;line-height:1.5}'
      +'.wm{position:fixed;top:36%;left:0;right:0;text-align:center;font-size:118pt;font-weight:800;letter-spacing:.08em;color:rgba(196,68,46,.12);transform:rotate(-28deg);z-index:0;pointer-events:none}'
      +'.dr{background:#FBEDE9;color:#C4442E;font-weight:800;text-align:center;padding:1.6mm;font-size:9.5pt;margin-bottom:3mm;border:.8pt solid #C4442E}'
      +'.bar{background:#1C1B18;color:#F4EFE6;padding:10px 16px;display:flex;gap:12px;align-items:center;font-size:13px;position:sticky;top:0;z-index:5}.bar button{background:#C6A96B;border:none;border-radius:9px;padding:9px 16px;font-weight:700;font-family:inherit;cursor:pointer}'
      +'@media screen{body{background:#EDE8DD}.pg{background:#fff;padding:14mm;margin:14px auto;max-width:210mm;box-shadow:0 4px 22px rgba(0,0,0,.12)}}@media print{.bar{display:none}}'
      +'</style></head><body>';
    h+='<div class="bar"><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button><span>'+esc(no)+(draft?' · ร่าง (DRAFT) — กด "ออกเอกสาร" ในระบบก่อนส่งจริง':' · ออกเอกสารแล้ว '+this._rfxD(r.issued))+'</span></div>';
    if(draft) h+='<div class="wm">DRAFT</div>';
    h+='<div class="pg">';
    if(draft) h+='<div class="dr">DRAFT — ร่าง ยังไม่ออกเอกสาร · ห้ามส่งออกภายนอก</div>';
    h+='<div class="hd"><div class="co"><b>WELLCON INTERIOR CO., LTD.</b><div>'+(lang==='en'?'':'บริษัท เวลล์คอน อินทีเรีย จำกัด<br>')
      +(lang==='th'?'เซ็นโทรพอร์ต 36/38 ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150':'Centroport 36/38 Moo 13, Buengkhamphroi, Lamlukka, Pathumthani 12150')
      +'<br>'+L('Tax ID','เลขประจำตัวผู้เสียภาษี')+' 0105560007187 · www.wellcon.co.th</div></div>'
      +'<div class="ti"><div class="k">'+(kind==='RFA'?'REQUEST FOR APPROVAL':'REQUEST FOR INFORMATION')+'</div>'+(lang==='en'?'':'<div class="t">'+(kind==='RFA'?'หนังสือขออนุมัติ (RFA)':'หนังสือขอข้อมูล / ขอความชัดเจน (RFI)')+'</div>')
      +(flag?'<div class="flag">'+flag+'</div>':'')+'</div></div>';
    h+='<table class="info"><tr><th>'+L('Document No.','เลขที่เอกสาร')+'</th><td><b>'+esc(no)+'</b></td><th>'+L('Date','วันที่')+'</th><td>'+this._rfxD(dateIso)+'</td></tr>'
      +'<tr><th>'+L('Project','โครงการ')+'</th><td>'+esc(pn)+'</td><th>'+L('Response required by','ขอรับคำตอบภายใน')+'</th><td><b>'+due+'</b></td></tr>'
      +'<tr><th>'+L('Category','ประเภท')+'</th><td>'+(cat?V(cat[1],cat[2]):'—')+'</td><th>'+L('Priority','ความเร่งด่วน')+'</th><td>'+V(pr[1],pr[2])+'</td></tr></table>';
    h+='<div class="pt"><div><div class="l">'+L('TO','ถึง')+'</div><div class="n">'+esc(P.co||'—')+'</div><div>'+L('Attention','เรียน')+': '+esc(P.attn||'—')+(P.pos?(' · '+esc(P.pos)):'')+'</div>'
      +(s(r.cc)?('<div>'+L('CC','สำเนาถึง')+': '+esc(s(r.cc))+'</div>'):'')+'</div>'
      +'<div><div class="l">'+L('FROM','จาก')+'</div><div class="n">Wellcon Interior Co., Ltd.</div><div>'+L('Prepared by','ผู้จัดทำ')+': '+esc(r.by||'—')+'</div>'+(s(p.pm)?('<div>'+L('Project Manager','ผู้จัดการโครงการ')+': '+esc(p.pm)+'</div>'):'')+'</div></div>';
    h+='<div class="sub"><div class="l">'+L('SUBJECT','เรื่อง')+'</div><div class="v">'+esc(s(r.title)||'—')+'</div></div>';
    let n=1;
    if(refs.length||att.length) h+=sec(n++, L('Reference','อ้างอิง'), '<table class="ref">'+refs.map(x=>row(x[0], esc(s(x[1])))).join('')+(att.length?row(L('Attachments','เอกสารแนบ'), att.join(' · ')):'')+'</table>');
    h+=sec(n++, kind==='RFA'?L('Item submitted for approval','รายการที่ขออนุมัติ'):L('Description / Question','รายละเอียด / คำถาม'), nl(r.detail)||'—');
    if(s(r.prop)) h+=sec(n++, kind==='RFA'?L('Supporting information','เหตุผล / ข้อมูลประกอบ'):L("Wellcon's proposed solution",'แนวทางที่ Wellcon เสนอ'), nl(r.prop));
    h+=sec(n++, L('Impact','ผลกระทบ'), '<div>'+L('Cost','ค่าใช้จ่าย')+': '+bx(r.cost==='none',V('None','ไม่มี'))+bx(r.cost==='yes',V('Yes — to be advised by Variation Order','มี — เสนอเป็น VO แยกต่างหาก'))+bx(r.cost==='tbd',V('TBD pending response','รอคำตอบจึงประเมินได้'))+'</div>'
      +'<div style="margin-top:1.4mm">'+L('Schedule','ระยะเวลา')+': '+bx(r.sched==='none',V('None','ไม่มี'))+bx(r.sched==='yes',V('Yes','มี'))+bx(r.sched==='crit',V('Yes — critical path','มี — กระทบเส้นทางวิกฤต'))+'</div>'
      +(s(r.conseq)?('<div style="margin-top:1.6mm">'+L('If no response is received by','หากไม่ได้รับคำตอบภายใน')+' '+due+': '+nl(r.conseq)+'</div>'):''));
    if(revLog.length) h+=sec(n++, L('Revision history','ประวัติการแก้ไข'), revLog.map(x=>{ const R0=RES.find(a=>a[0]===x.result); return 'Rev.'+(Number(x.rev)||0)+(x.issued?(' · '+this._rfxD(x.issued)):'')+(R0?(' · '+x.result+' — '+V(R0[1],R0[2])):'')+(s(x.answer)?(' · '+esc(s(x.answer))):''); }).join('<br>'));
    if(photos.length) h+=sec(n++, L('Photographs','ภาพประกอบ'), '<div class="ph">'+photos.map((src,i)=>'<div><img src="'+esc(src)+'">'+V('Photo','รูปที่')+' '+(i+1)+'</div>').join('')+'</div>');
    h+='<div class="sg"><div><div class="ln"></div>'+L('Prepared by','ผู้จัดทำ')+' · Wellcon Interior<br>('+esc(r.by||'')+')</div><div><div class="ln"></div>'+L('Reviewed by','ผู้ตรวจสอบ')+' · '+L('Project Manager','ผู้จัดการโครงการ')+'<br>('+esc(s(p.pm)||'')+')</div></div>';
    h+='<div class="rsp"><div class="h">'+L('RESPONSE — to be completed by the recipient','คำตอบ — สำหรับผู้รับเอกสาร')+'</div>'
      +(kind==='RFA'?('<div>'+RES.map(a=>bx(r.result===a[0], a[0]+' — '+V(a[1],a[2]))).join('')+'</div>'):'')
      +'<div class="box">'+(s(r.answer)?nl(r.answer):'&nbsp;')+'</div>'
      +'<div class="sg" style="margin-top:4mm"><div><div class="ln"></div>'+L('Responded by / Signature','ผู้ตอบ / ลงนาม')+(s(r.answer)&&s(r.ansBy)?('<br>('+esc(r.ansBy)+')'):'')+'</div><div><div class="ln"></div>'+L('Position','ตำแหน่ง')+'</div><div><div class="ln"></div>'+L('Date','วันที่')+(s(r.answer)&&r.ansDate?('<br>'+this._rfxD(r.ansDate)):'')+'</div></div></div>';
    h+='<div class="ft">'+V('Cost or time impact, if any, will be submitted separately for approval (Variation Order / Extension of Time request). This document does not authorise any change to the contract sum or completion date.','ผลกระทบด้านค่าใช้จ่ายหรือระยะเวลา (ถ้ามี) จะเสนอเป็นเอกสารแยกเพื่อขออนุมัติ (Variation Order / หนังสือขอขยายเวลา) เอกสารฉบับนี้ไม่ใช่การอนุมัติเปลี่ยนแปลงมูลค่าสัญญาหรือกำหนดแล้วเสร็จ')
      +'<br>Wellcon Interior Co., Ltd. · '+esc(no)+' · '+esc(pn)+' · '+this._rfxD(dateIso)+(draft?' · DRAFT':'')+'</div>';
    h+='</div></body></html>'; return h; }
  _rfxWordExtra(pid, r, H){ if(!r||!r.toParty) return ''; const s=(v)=>String(v||'').trim(), kind=this._rfxKind(r); let b='';
    const refs=[['เลขที่แบบ',r.dwg],['ข้อกำหนด / Spec',r.spec],['ตำแหน่ง',r.zone],['เอกสารที่เกี่ยวข้อง',r.rel]].filter(x=>s(x[1]));
    if(refs.length){ b+=H.head('อ้างอิง'); refs.forEach(x=>{ b+=H.PA(H.R(x[0]+': ',{b:1,s:20})+H.R(s(x[1]),{s:20}),{dn:30}); }); }
    if(s(r.prop)){ b+=H.head(kind==='RFA'?'เหตุผล / ข้อมูลประกอบ':'แนวทางที่ Wellcon เสนอ'); b+=H.PA(H.R(s(r.prop)),{dn:120}); }
    const co=this.RFX_COST().find(c=>c[0]===(r.cost||'')), sc=this.RFX_SCHED().find(c=>c[0]===(r.sched||''));
    if(s(r.cost)||s(r.sched)||s(r.conseq)){ b+=H.head('ผลกระทบ');
      if(s(r.cost)&&co) b+=H.PA(H.R('ค่าใช้จ่าย: ',{b:1,s:20})+H.R(co[1],{s:20}),{dn:30});
      if(s(r.sched)&&sc) b+=H.PA(H.R('ระยะเวลา: ',{b:1,s:20})+H.R(sc[1],{s:20}),{dn:30});
      if(s(r.conseq)) b+=H.PA(H.R('หากไม่ได้รับคำตอบภายใน '+(this._rfxD(r.needBy)||'กำหนด')+': ',{b:1,s:20})+H.R(s(r.conseq),{s:20}),{dn:120}); }
    return b; }
`;
if (CODE.indexOf('`') >= 0 || CODE.indexOf('$' + '{') >= 0) { console.error('✗ บล็อกโค้ดมีอักขระต้องห้าม'); process.exit(2); }

const R = [
  ['ตรรกะ: ฟังก์ชัน _rfx*', "  rfiExportDoc(pid, rr){", CODE + "  rfiExportDoc(pid, rr){", 1],
  ['ตรรกะ: ค่าที่ส่งให้หน้าจอ', "          onTitle:on('rfis',r.id,'title'), onDetail:on('rfis',r.id,'detail'), onTo:on('rfis',r.id,'to'),", "          ...this._rfxProps(pid, r),   // " + MARK + "\n          onTitle:on('rfis',r.id,'title'), onDetail:on('rfis',r.id,'detail'), onTo:on('rfis',r.id,'to'),", 1],
  ['หน้าจอ: หัวข้อ ② ออกเอกสาร', DIV_OLD, SECTION + DIV_OLD.replace('② ไฟล์แนบ', '③ ไฟล์แนบ'), 1],
  ['หน้าจอ: หัวข้อ ④ คำตอบ', '③ คำตอบ / ข้อสรุป', '④ คำตอบ / ข้อสรุป', 1],
  ['หน้าจอ: ผลการพิจารณา RFA', ANS_OLD, ANS_NEW, 1],
  ['หน้าจอ: คอลัมน์ถามถึง', 'white-space:nowrap">{{ r.to }}</sc-raw-td>', 'white-space:nowrap">{{ r.xToShow }}</sc-raw-td>', 1],
  ['Word: เลขที่ทางการ + หัว DRAFT', "        info('เลขที่เอกสาร', cur.no||'—', 'วันที่ยื่น', dmy),", "        info('เลขที่เอกสาร', cur.toParty?this._rfxNo(pid,cur):(cur.no||'—'), 'วันที่ยื่น', cur.issued?this._soDMY(cur.issued):dmy),   // " + MARK, 1],
  ['Word: ผู้รับ', "        info('ยื่นถึง', cur.to||'—', 'ตอบภายใน', needBy),", "        info('ยื่นถึง', ((x)=>x?((x.co||'—')+(x.attn?(' · เรียน '+x.attn):'')):(cur.to||'—'))(this._rfxParty(pid,cur)), 'ตอบภายใน', needBy),", 1],
  ['Word: อ้างอิง · แนวทาง · ผลกระทบ', "      body+=PA(R(String(cur.detail||'—')),{dn:120});", "      body+=PA(R(String(cur.detail||'—')),{dn:120});\n      body+=this._rfxWordExtra(pid, cur, { R, PA, head });\n      if(cur.toParty&&!cur.issued) body=PA(R('DRAFT — ร่าง ยังไม่ออกเอกสาร · ห้ามส่งออกภายนอก',{b:1,c:'C4442E',s:24}),{j:'center',dn:120})+body;", 1],
  ['คำแนะนำหน้า RFI', "'ส่งถึงผู้ออกแบบ/PM ตามข้อมูลคู่สัญญา → ติดตามสถานะจนปิดเรื่อง' ] },", "'ส่งถึงผู้ออกแบบ/PM ตามข้อมูลคู่สัญญา → ติดตามสถานะจนปิดเรื่อง', 'ออกเอกสารถึงภายนอก: หัวข้อ ② เลือกผู้รับ (Owner / Designer / Consult) → กรอกประเภท · อ้างอิง · แนวทางที่ Wellcon เสนอ · ผลกระทบ → ตรวจครบแล้วกด \"ออกเอกสาร\" → พิมพ์ / PDF ส่งให้ผู้รับ', 'ก่อนกดออกเอกสาร เอกสารจะมีคำว่า DRAFT · หลังออกแล้วระบบนับวันครบกำหนดตอบ และเตือนให้ติดตามเมื่อเกินกำหนด' ] },", 1],
];
for (const [name, a, , n] of R) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b, n] of R) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ RFI / RFA ออกเอกสารถึง Owner / Designer / Consult: แก้ ' + pts + ' จุด');
