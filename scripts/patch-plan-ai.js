#!/usr/bin/env node
/* =====================================================================
   v1.426.0 plan-ai — ผู้ช่วย AI จัดแผนงาน (หน้าโครงการ → แผนงาน) · 18/11/2026
     node scripts/patch-plan-ai.js
   - ปุ่ม "✦ ผู้ช่วย AI จัดแผน" ในแถบเครื่องมือของแผนงาน (ถัดจาก + เพิ่มกิจกรรม)
   - กรอก: วันเริ่มงาน · วันเสร็จงาน · วันทำงาน (จ.–ส. / จ.–ศ. / ทุกวัน) · ระดับรายละเอียด (งานหลัก + งานย่อย / งานหลัก)
     · หมวดงาน 15 หมวด (ผนัง · พื้น · ฝ้า · งานระบบ 1st fix / 2nd fix · สี · บิ้วท์อิน · ลอยตัว · ทำความสะอาด ฯลฯ)
     · พื้นที่ / ขอบเขต + ข้อมูลเพิ่มเติม (lead time · เวลาเข้าพื้นที่ ฯลฯ)
   - "✦ ให้ AI ร่างแผน" → aiBackend (ทางเดียวกับผู้ช่วย AI เดิม) → ตอบ JSON → ตรวจวันที่ให้อยู่ในช่วง → แสดงร่างให้ตรวจก่อน
   - "แผนมาตรฐาน (ไม่ใช้ AI)" = ร่างตามสัดส่วนเวลามาตรฐานของแต่ละหมวด (ใช้ได้เมื่อ AI ไม่พร้อม / ไม่มีสิทธิ์)
   - "✓ ใส่ลงแผนงาน" → เพิ่มกิจกรรม (งานย่อยผูก parent) ต่อท้ายกิจกรรมเดิม · ลบเฉพาะแถวว่าง (ไม่มีชื่อ / วันที่ / %)
     · ตั้งกรอบ "เริ่ม — สิ้นสุดแผน" ให้ครอบช่วงที่ร่าง · บันทึกการเปลี่ยนแปลง "เพิ่ม · จากผู้ช่วย AI จัดแผน"
   - ไม่ส่ง / ไม่สร้างราคา ต้นทุน ชื่อผู้รับเหมา · ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.426.0 plan-ai';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ผู้ช่วย AI จัดแผนงาน)'); process.exit(0); }

// ---------------------------------------------------------------- ปุ่มในแถบเครื่องมือ
const ADD_BTN = '<span style="font-size:12.5px;font-weight:600;color:#F4EFE6">+ เพิ่มกิจกรรม</span></button>';
const AI_BTN = ADD_BTN + '\n            <!-- ' + MARK + ' -->' +
  '<button sc-camel-on-click="{{ onAisToggle }}" title="ผู้ช่วย AI จัดแผนงาน — ใส่วันเริ่ม / วันเสร็จ + เลือกหมวดงาน แล้วให้ AI ร่างกิจกรรมพร้อมวันที่" style="flex:none;display:flex;align-items:center;gap:7px;background:{{ aisBtnBg }};border:1px solid #D9B866;border-radius:12px;padding:10px 15px;cursor:pointer;font-family:inherit" style-hover="border-color:#B0851B"><span style="font-size:13px;color:#B0851B">✦</span><span style="font-size:12px;font-weight:700;color:#6E5424">ผู้ช่วย AI จัดแผน</span></button>';

// ---------------------------------------------------------------- แผงผู้ช่วย
const LBL = 'font-size:10.5px;font-weight:700;color:#8C877D';
const INP = 'border:1px solid #E4DED2;background:#fff;border-radius:10px;padding:8px 10px;font-size:12px;font-family:inherit;color:#2C2A25;outline:none';
const SMALL = 'border:1px solid #E4DED2;background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:inherit;font-size:10.5px;font-weight:600;color:#6E695E';
const PANEL = `<sc-if value="{{ aisOpen }}" hint-placeholder-val="{{ false }}">
          <div style="background:#FFFDF8;border:1px solid #E2CB92;border-radius:16px;padding:16px 18px;margin-bottom:14px">
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
              <span style="flex:none;width:30px;height:30px;border-radius:9px;background:#1C1B18;color:#E2C27A;display:flex;align-items:center;justify-content:center;font-size:15px">✦</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13.5px;font-weight:800;color:#1C1B18">ผู้ช่วย AI จัดแผนงาน</div>
                <div style="font-size:11px;color:#8C877D;margin-top:2px;line-height:1.5">ใส่วันเริ่ม – วันเสร็จ แล้วเลือกหมวดงานที่เกี่ยวข้อง · AI ร่างกิจกรรมเรียงตามลำดับงานตกแต่งภายใน พร้อมวันที่ · ตรวจร่างก่อนใส่ลงแผน แก้ต่อได้ทุกแถว</div>
              </div>
              <button sc-camel-on-click="{{ onAisToggle }}" title="ปิด" style="flex:none;border:none;background:#F2EDE3;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:13px;color:#6E695E;font-family:inherit">✕</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;margin-bottom:12px">
              <label style="display:flex;flex-direction:column;gap:4px"><span style="${LBL}">วันเริ่มงาน</span><input type="date" value="{{ aisStart }}" sc-camel-on-change="{{ onAisStart }}" style="${INP}"></label>
              <label style="display:flex;flex-direction:column;gap:4px"><span style="${LBL}">วันเสร็จงาน</span><input type="date" value="{{ aisEnd }}" sc-camel-on-change="{{ onAisEnd }}" style="${INP}"></label>
              <label style="display:flex;flex-direction:column;gap:4px"><span style="${LBL}">วันทำงาน</span><sc-raw-select value="{{ aisWdVal }}" sc-camel-on-change="{{ onAisWd }}" style="${INP}"><sc-for list="{{ aisWdOpts }}" as="o" hint-placeholder-count="3"><option value="{{ o.value }}">{{ o.label }}</option></sc-for></sc-raw-select></label>
              <label style="display:flex;flex-direction:column;gap:4px"><span style="${LBL}">รายละเอียด</span><sc-raw-select value="{{ aisLvVal }}" sc-camel-on-change="{{ onAisLv }}" style="${INP}"><sc-for list="{{ aisLvOpts }}" as="o" hint-placeholder-count="2"><option value="{{ o.value }}">{{ o.label }}</option></sc-for></sc-raw-select></label>
              <span class="num" style="font-size:11.5px;font-weight:700;color:{{ aisSpanColor }};padding-bottom:9px">{{ aisSpan }}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:7px">
              <span style="font-size:11px;font-weight:800;color:#4A463E">หมวดงานที่เกี่ยวข้อง</span>
              <span class="num" style="font-size:10.5px;color:#8A7657">{{ aisPickText }}</span>
              <span style="flex:1"></span>
              <button sc-camel-on-click="{{ onAisAll }}" style="${SMALL}">เลือกทั้งหมด</button>
              <button sc-camel-on-click="{{ onAisDef }}" style="${SMALL}">ค่าเริ่มต้น</button>
              <button sc-camel-on-click="{{ onAisNone }}" style="${SMALL}">ล้าง</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px">
              <sc-for list="{{ aisTrades }}" as="c" hint-placeholder-count="10">
                <button sc-camel-on-click="{{ c.onToggle }}" title="{{ c.tip }}" style="display:inline-flex;align-items:center;gap:6px;border:1px solid {{ c.bd }};background:{{ c.bg }};border-radius:20px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;color:{{ c.fg }}"><span style="font-weight:800">{{ c.mark }}</span><span>{{ c.label }}</span></button>
              </sc-for>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:12px">
              <label style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="${LBL}">พื้นที่ / ขอบเขตงาน (ไม่บังคับ)</span><input value="{{ aisArea }}" sc-camel-on-change="{{ onAisArea }}" placeholder="เช่น ล็อบบี้ + ห้องพัก 24 ห้อง ชั้น 3–4 · ประมาณ 850 ตร.ม." style="${INP}"></label>
              <label style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="${LBL}">ข้อมูลเพิ่มเติมให้ AI (ไม่บังคับ)</span><textarea value="{{ aisNote }}" sc-camel-on-change="{{ onAisNote }}" rows="2" placeholder="เช่น หินอ่อนนำเข้า lead time 10 สัปดาห์ · เข้าพื้นที่ได้หลัง 18:00 · ทำห้องตัวอย่าง (Mock-up) ก่อน" style="${INP};resize:vertical;line-height:1.5"></textarea></label>
            </div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:9px">
              <sc-if value="{{ aisIdle }}" hint-placeholder-val="{{ true }}">
                <button sc-camel-on-click="{{ onAisGo }}" style="flex:none;display:flex;align-items:center;gap:7px;background:#242019;border:none;border-radius:12px;padding:11px 17px;cursor:pointer;font-family:inherit"><span style="font-size:13px;color:#E2C27A">✦</span><span style="font-size:12.5px;font-weight:700;color:#F4EFE6">ให้ AI ร่างแผน</span></button>
                <button sc-camel-on-click="{{ onAisStd }}" title="ร่างตามสัดส่วนเวลามาตรฐานของแต่ละหมวด — ใช้ได้แม้ไม่มีสิทธิ์ AI" style="flex:none;background:#fff;border:1px solid #DED7C8;border-radius:12px;padding:10px 15px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:#4A463E" style-hover="border-color:#C6A96B">แผนมาตรฐาน (ไม่ใช้ AI)</button>
              </sc-if>
              <sc-if value="{{ aisBusy }}" hint-placeholder-val="{{ false }}">
                <span style="display:inline-flex;align-items:center;gap:8px;background:#FBF4E4;border:1px solid #E2CB92;border-radius:12px;padding:10px 15px;font-size:12px;font-weight:700;color:#6E5424">⏳ AI กำลังร่างแผน… (ประมาณ 20–60 วินาที)</span>
              </sc-if>
            </div>
            <sc-if value="{{ aisErrOn }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:10px;background:#FBEDE9;border:1px solid #EBC4B9;border-radius:10px;padding:9px 12px;font-size:11.5px;color:#9A3B26;line-height:1.5">{{ aisErr }}</div>
            </sc-if>
            <sc-if value="{{ aisHasDraft }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:14px;border-top:1px dashed #E2CB92;padding-top:12px">
                <div style="font-size:12px;font-weight:800;color:#6E5424;margin-bottom:8px">{{ aisDraftHead }}</div>
                <sc-if value="{{ aisDraftNoteOn }}" hint-placeholder-val="{{ false }}">
                  <div style="background:#FBF4E4;border-radius:10px;padding:8px 11px;font-size:11px;color:#6E5424;line-height:1.55;margin-bottom:9px">ข้อสังเกต: {{ aisDraftNote }}</div>
                </sc-if>
                <div style="max-height:380px;overflow:auto;border:1px solid #EEE8DC;border-radius:12px;background:#fff">
                  <div style="min-width:600px">
                    <sc-for list="{{ aisRows }}" as="r" hint-placeholder-count="6">
                      <div style="display:grid;grid-template-columns:minmax(200px,2.2fr) 150px 56px minmax(140px,1.6fr);align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid #F4EFE5;background:{{ r.bg }}">
                        <div title="{{ r.title }}" style="padding-left:{{ r.pad }};font-size:{{ r.fs }};font-weight:{{ r.wt }};color:#2C2A25;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.title }}<span style="font-size:10px;color:#A99F8C;font-weight:400;margin-left:6px">{{ r.phase }}</span></div>
                        <span class="num" style="font-size:11px;color:#57534A;white-space:nowrap">{{ r.dates }}</span>
                        <span class="num" style="font-size:11px;color:#8A7657;text-align:right;white-space:nowrap">{{ r.dur }}</span>
                        <div style="position:relative;height:10px;background:#F7F3EA;border-radius:5px"><div style="position:absolute;top:0;bottom:0;left:{{ r.left }};width:{{ r.width }};background:{{ r.color }};border-radius:5px"></div></div>
                      </div>
                    </sc-for>
                  </div>
                </div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:11px">
                  <button sc-camel-on-click="{{ onAisApply }}" style="flex:none;background:#2E7D46;border:none;border-radius:12px;padding:11px 17px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:#fff">{{ aisApplyText }}</button>
                  <button sc-camel-on-click="{{ onAisRedo }}" style="flex:none;background:#fff;border:1px solid #DED7C8;border-radius:12px;padding:10px 15px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:#4A463E" style-hover="border-color:#C6A96B">↻ ร่างใหม่</button>
                  <button sc-camel-on-click="{{ onAisDiscard }}" style="flex:none;background:transparent;border:none;padding:10px 6px;cursor:pointer;font-family:inherit;font-size:12px;color:#8C877D">ทิ้งร่าง</button>
                  <span style="flex:1 1 220px;font-size:10.5px;color:#8C877D;line-height:1.5">{{ aisApplySub }}</span>
                </div>
              </div>
            </sc-if>
          </div>
          </sc-if>
          `;
const EMPTY_IF = '<sc-if value="{{ planEmpty }}" hint-placeholder-val="{{ false }}">';

// ---------------------------------------------------------------- ตรรกะ (เมธอดของแอป)
const METHODS = String.raw`  // ===== ${MARK} : ผู้ช่วย AI จัดแผนงาน — วันเริ่ม/เสร็จ + หมวดงาน → AI ร่างกิจกรรม (งานหลัก + งานย่อย) → ตรวจก่อนใส่ลงแผน =====
  AIS_TRADES(){ return [
    { k:'prep',  th:'เตรียมพื้นที่ / ป้องกัน', en:'Site Preparation & Protection', ph:0, on:1, f:[0,.06], d:'รับพื้นที่ · ป้องกันพื้นที่ / งานเดิม · วางแนว (setting out)', sub:['รับพื้นที่ · Site Handover','ป้องกันพื้นที่ · Protection','วางแนว · Setting Out'] },
    { k:'demo',  th:'รื้อถอน', en:'Demolition', ph:0, on:0, f:[.02,.12], d:'รื้อของเดิม · ขนเศษวัสดุ', sub:['รื้อถอน · Strip Out','ขนเศษวัสดุ · Debris Removal'] },
    { k:'mep1',  th:'งานระบบ 1st fix', en:'MEP 1st Fix', ph:4, on:1, f:[.08,.42], d:'เดินท่อ ร้อยสาย ท่อแอร์ ท่อน้ำ สปริงเกอร์ ในผนัง / เหนือฝ้า', sub:['เดินท่อร้อยสายไฟ · Conduit & Wiring','ท่อแอร์ / ท่อน้ำ · HVAC & Plumbing','ตรวจก่อนปิดผนัง/ฝ้า · Pre-close Inspection'] },
    { k:'wall',  th:'ผนัง', en:'Wall / Partition', ph:1, on:1, f:[.08,.45], d:'ผนังเบา / ก่อฉาบ · ตั้งโครง ปิดแผ่น ฉาบรอยต่อ', sub:['ตั้งโครงผนัง · Stud Framing','ปิดแผ่น · Boarding','ฉาบรอยต่อ · Jointing'] },
    { k:'ceil',  th:'ฝ้า', en:'Ceiling', ph:1, on:1, f:[.18,.55], d:'แขวนโครงฝ้า · ปิดฝ้าหลังงานระบบเหนือฝ้า', sub:['แขวนโครงฝ้า · Ceiling Framing','ปิดฝ้า · Ceiling Boarding','ฉาบรอยต่อฝ้า · Jointing'] },
    { k:'floor', th:'พื้น', en:'Floor', ph:2, on:1, f:[.25,.72], d:'ปรับระดับ · หิน / กระเบื้อง / ไม้ / พรม', sub:['ปรับระดับพื้น · Screed / Leveling','ปูวัสดุพื้น · Floor Finish','ป้องกันผิวพื้น · Floor Protection'] },
    { k:'glass', th:'กระจก / อลูมิเนียม / เหล็ก', en:'Glass & Metal Work', ph:3, on:0, f:[.5,.8], d:'ฉากกั้น กระจก ราวบันได งานเหล็กตกแต่ง', sub:['วัดหน้างาน · Site Measure','ติดตั้ง · Installation'] },
    { k:'built', th:'เฟอร์นิเจอร์บิ้วท์อิน', en:'Built-in Joinery', ph:3, on:1, f:[.45,.84], d:'ผลิตในโรงงานคู่ขนาน · ติดตั้งหลังผนัง/ฝ้าปิดและรองพื้นแล้ว', sub:['วัดหน้างาน · Site Measure','ติดตั้งบิ้วท์อิน · Installation','ปรับแต่ง / เก็บงาน · Adjust & Touch-up'] },
    { k:'paint', th:'งานสี', en:'Painting', ph:5, on:1, f:[.4,.86], d:'โป๊ว รองพื้น สีรอบแรก · สีจริงรอบสุดท้ายหลังติดตั้งบิ้วท์อิน', sub:['โป๊ว / รองพื้น · Skim & Primer','สีรอบแรก · 1st Coat','สีรอบสุดท้าย · Final Coat'] },
    { k:'wcov',  th:'วอลเปเปอร์ / ผ้าบุผนัง', en:'Wall Covering', ph:5, on:0, f:[.74,.88], d:'ติดวอลเปเปอร์ / ผ้า / แผ่นบุผนัง', sub:['เตรียมผิว · Surface Prep','ติดวัสดุ · Installation'] },
    { k:'mep2',  th:'งานระบบ 2nd fix', en:'MEP 2nd Fix', ph:4, on:1, f:[.7,.9], d:'ดวงโคม สวิตช์ ปลั๊ก หัวจ่ายแอร์ สุขภัณฑ์ · ทดสอบระบบ', sub:['ติดตั้งดวงโคม / สวิตช์ / ปลั๊ก · Fit-off','หัวจ่ายแอร์ / สุขภัณฑ์ · Fixtures','ทดสอบระบบ · Testing & Commissioning'] },
    { k:'loose', th:'เฟอร์นิเจอร์ลอยตัว', en:'Loose Furniture', ph:3, on:1, f:[.86,.95], d:'ขนส่ง · ตรวจรับ · จัดวาง (หลังพื้นและสีเสร็จ)', sub:['ขนส่ง / ตรวจรับ · Delivery & Inspection','จัดวาง · Placement'] },
    { k:'clean', th:'ทำความสะอาด', en:'Cleaning', ph:6, on:1, f:[.92,.98], d:'ทำความสะอาดหยาบระหว่างงาน · ทำความสะอาดละเอียดก่อนส่งมอบ', sub:['ทำความสะอาดหยาบ · Rough Clean','ทำความสะอาดละเอียด · Final Clean'] },
    { k:'qc',    th:'ตรวจ Defect / แก้งาน', en:'QC & Defect Rectification', ph:6, on:0, f:[.9,.98], d:'ตรวจงานร่วมผู้ออกแบบ · แก้ Defect', sub:['ตรวจงาน · Inspection','แก้ Defect · Rectification'] },
    { k:'ho',    th:'ส่งมอบ', en:'Handover', ph:7, on:0, f:[.98,1], d:'ส่งมอบงาน · เอกสาร / As-built / กุญแจ', sub:[] } ]; }
  _aisISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  _aisAdd(iso,n){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return this._aisISO(d); }
  _aisDays(a,b){ return Math.round((new Date(b+'T00:00:00').getTime()-new Date(a+'T00:00:00').getTime())/864e5)+1; }
  _aisBlank(r){ return !String((r&&r.title)||'').trim()&&!(r&&r.start)&&!(r&&r.end)&&!Number((r&&r.pct)||0); }
  _aisVals(S, pid, curSch, all){
    const out={}; if(!curSch) return out;
    const T=this.AIS_TRADES(), PH=this.PLAN_PH();
    const key=pid+'|'+curSch, F=((S.aisForm||{})[key])||{};
    const p=(S.projects||[]).find(x=>x.id===pid)||{};
    const M=((S.planMeta||{})[key])||{};
    const okD=(v)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
    const today=this._isoToday();
    const s0=okD(F.s)?F.s:okD(M.from)?M.from:(okD(p.startISO)&&p.startISO>=today)?p.startISO:today;
    const e0=okD(F.e)?F.e:(okD(M.to)&&M.to>s0)?M.to:(okD(p.endISO)&&p.endISO>s0)?p.endISO:this._aisAdd(s0,59);
    const days=(okD(s0)&&okD(e0))?this._aisDays(s0,e0):0;
    const sel=F.sel||{}; const isOn=(t)=>sel[t.k]!=null?!!sel[t.k]:!!t.on;
    const setF=(patch)=>this.setState(st=>{ const A={ ...(st.aisForm||{}) }; A[key]={ ...(A[key]||{}), ...patch }; return { aisForm:A }; });
    const draft=(S.aisDraft&&S.aisDraft.key===key)?S.aisDraft:null;
    const busy=S.aisBusy===key;
    out.aisOpen=S.aisOpen===key;
    out.aisBtnBg=out.aisOpen?'#F3E6C4':'#FBF4E4';
    out.onAisToggle=()=>this.setState(st=>({ aisOpen:st.aisOpen===key?null:key }));
    out.aisStart=s0; out.aisEnd=e0;
    out.onAisStart=(e)=>setF({ s:e.target.value }); out.onAisEnd=(e)=>setF({ e:e.target.value });
    out.aisSpan=days>0?(days+' วัน · '+this._soDMY(s0)+' → '+this._soDMY(e0)):'วันเสร็จต้องหลังวันเริ่ม';
    out.aisSpanColor=days>0?'#8A7657':'#C4442E';
    const wd=String(F.wd||'6');
    out.aisWdVal=wd; out.aisWdOpts=[{ value:'6', label:'จ.–ส. (หยุดอาทิตย์)' },{ value:'5', label:'จ.–ศ. (หยุดเสาร์–อาทิตย์)' },{ value:'7', label:'ทุกวัน' }];
    out.onAisWd=(e)=>setF({ wd:e.target.value });
    const lv=String(F.lv||'sub');
    out.aisLvVal=lv; out.aisLvOpts=[{ value:'sub', label:'งานหลัก + งานย่อย' },{ value:'main', label:'งานหลักอย่างเดียว' }];
    out.onAisLv=(e)=>setF({ lv:e.target.value });
    out.aisTrades=T.map(t=>{ const on=isOn(t); return { key:t.k, label:t.th+' · '+t.en, tip:t.d, mark:on?'✓':'+',
      bg:on?'#FBF3DE':'#fff', bd:on?'#D9B866':'#E4DED2', fg:on?'#4A3A12':'#9A9385',
      onToggle:()=>setF({ sel:{ ...sel, [t.k]:!on } }) }; });
    const picked=T.filter(isOn);
    out.aisPickText='เลือก '+picked.length+' / '+T.length+' หมวด';
    out.onAisAll=()=>setF({ sel:Object.fromEntries(T.map(t=>[t.k,true])) });
    out.onAisNone=()=>setF({ sel:Object.fromEntries(T.map(t=>[t.k,false])) });
    out.onAisDef=()=>setF({ sel:{} });
    out.aisArea=F.area||''; out.onAisArea=(e)=>setF({ area:e.target.value });
    out.aisNote=F.note||''; out.onAisNote=(e)=>setF({ note:e.target.value });
    out.aisBusy=busy; out.aisIdle=!busy;
    out.aisErr=(S.aisErr&&S.aisErr.key===key)?S.aisErr.msg:''; out.aisErrOn=!!out.aisErr;
    const run=(useAi)=>{ if(this.state.aisBusy) return;
      if(!(days>0)){ this.showToast('วันเสร็จต้องหลังวันเริ่ม'); return; }
      if(days>1100){ this.showToast('ช่วงแผนยาวเกิน 3 ปี — ตรวจวันที่อีกครั้ง'); return; }
      if(!picked.length){ this.showToast('เลือกหมวดงานอย่างน้อย 1 หมวด'); return; }
      this._aisRun({ key, pid, sched:curSch, s:s0, e:e0, days, wd, lv, picked, area:String(F.area||'').trim(), note:String(F.note||'').trim(), proj:p, useAi }); };
    out.onAisGo=()=>run(true); out.onAisStd=()=>run(false);
    out.onAisRedo=()=>run(!draft||draft.src==='ai');
    out.onAisDiscard=()=>this.setState({ aisDraft:null });
    out.onAisApply=()=>this._aisApply(pid, curSch, draft);
    out.aisHasDraft=!!draft&&!busy;
    out.aisRows=[]; out.aisDraftHead=''; out.aisDraftNote=''; out.aisDraftNoteOn=false; out.aisApplyText=''; out.aisApplySub='';
    if(draft){
      const a0=new Date(draft.s+'T00:00:00').getTime(), span=this._aisDays(draft.s,draft.e)*864e5;
      const pc=(iso)=>Math.max(0,Math.min(100,(new Date(iso+'T00:00:00').getTime()-a0)/span*100));
      const CL=['#8C877D','#B8935A','#7C8C6E','#B86B4B','#5E86A6','#C9A961','#6E8C7A','#9A3B26'];
      out.aisRows=draft.rows.map((r,i)=>{ const l=pc(r.s), w=Math.min(100-l,Math.max(1.2,pc(r.e)+864e5/span*100-l));
        return { key:'ad'+i, title:r.t, pad:(r.lv?22:0)+'px', wt:r.lv?'400':'700', fs:r.lv?'11.5px':'12px', phase:r.lv?'':(PH[r.ph]||''),
          bg:r.lv?'#fff':'#FCFAF5', dates:this._soDMY(r.s)+' → '+this._soDMY(r.e), dur:this._aisDays(r.s,r.e)+' วัน',
          left:l.toFixed(2)+'%', width:w.toFixed(2)+'%', color:CL[r.ph%CL.length]+(r.lv?'99':'') }; });
      const nM=draft.rows.filter(r=>!r.lv).length, nS=draft.rows.length-nM;
      out.aisDraftHead=(draft.src==='ai'?'✦ ร่างจาก AI':'แผนมาตรฐาน (ไม่ใช้ AI)')+' · งานหลัก '+nM+(nS?(' · งานย่อย '+nS):'')+' · '+this._soDMY(draft.s)+' → '+this._soDMY(draft.e);
      out.aisDraftNote=draft.note||''; out.aisDraftNoteOn=!!draft.note;
      const blank=all.filter(r=>this._aisBlank(r)).length, kept=all.length-blank;
      out.aisApplyText='✓ ใส่ลงแผนงาน ('+draft.rows.length+' กิจกรรม)';
      out.aisApplySub=(kept?('กิจกรรมเดิม '+kept+' รายการคงไว้ · '):'')+(blank?('ลบแถวว่าง '+blank+' แถว · '):'')+'ใส่แล้วแก้ชื่อ / วันที่ / ลำดับต่อได้ทุกแถว';
    }
    return out; }
  _aisStd(o){ const N=o.days, rows=[], fEnd=Math.max(...o.picked.map(t=>t.f[1]));
    const at=(n)=>this._aisAdd(o.s,Math.max(0,Math.min(N-1,n)));
    o.picked.forEach(t=>{ const a=Math.min(N-1,Math.floor(t.f[0]*N)), b=t.f[1]===fEnd?N-1:Math.min(N-1,Math.max(a,Math.ceil(t.f[1]*N)-1));   // หมวดที่จบท้ายสุด = จบวันเสร็จ
      rows.push({ t:t.th+' · '+t.en, ph:t.ph, s:at(a), e:at(b), lv:0 });
      const sub=o.lv==='main'?[]:(t.sub||[]); const L=b-a+1;
      sub.forEach((nm,i)=>{ const x=a+Math.floor(L*i/sub.length), y=Math.max(x,a+Math.ceil(L*(i+1)/sub.length)-1);
        rows.push({ t:nm, ph:t.ph, s:at(x), e:at(Math.min(b,y)), lv:1 }); }); });
    return rows; }
  _aisParse(reply, o){
    const BT=String.fromCharCode(96);
    const raw=String(reply||'').replace(new RegExp(BT+BT+BT+'(json)?','gi'),'').trim();
    const a=raw.indexOf('{'), b=raw.lastIndexOf('}'); if(a<0||b<a) return { rows:[], note:'' };
    let d; try{ d=JSON.parse(raw.slice(a,b+1)); }catch(e){ return { rows:[], note:'' }; }
    const okD=(v)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
    const cl=(v,dflt)=>{ v=okD(v)?v:dflt; return v<o.s?o.s:(v>o.e?o.e:v); };
    const tx=(v,n)=>String(v||'').replace(/\s+/g,' ').trim().slice(0,n||120);
    const nPH=this.PLAN_PH().length, groups=[];
    (Array.isArray(d&&d.tasks)?d.tasks:[]).slice(0,24).forEach(m=>{ if(!m||!tx(m.t)) return;
      let ph=Math.round(Number(m.ph)); if(!(ph>=0&&ph<nPH)) ph=0;
      const subs=[];
      (o.lv==='main'?[]:(Array.isArray(m.sub)?m.sub:[])).slice(0,8).forEach(c=>{ if(!c||!tx(c.t)) return;
        let s=cl(c.s,o.s), e=cl(c.e,s); if(e<s){ const x=s; s=e; e=x; } subs.push({ t:tx(c.t), ph, s, e, lv:1 }); });
      let s=cl(m.s,o.s), e=cl(m.e,s); if(e<s){ const x=s; s=e; e=x; }
      subs.forEach(c=>{ if(c.s<s) s=c.s; if(c.e>e) e=c.e; });
      groups.push([{ t:tx(m.t), ph, s, e, lv:0 }, ...subs]); });
    groups.sort((x,y)=>x[0].s<y[0].s?-1:(x[0].s>y[0].s?1:0));
    const note=Array.isArray(d&&d.note)?d.note.map(x=>tx(x,240)).filter(Boolean).join(' · '):tx(d&&d.note,600);
    return { rows:[].concat(...groups), note }; }
  async _aisRun(o){
    const PH=this.PLAN_PH();
    const done=(rows,note,src)=>this.setState({ aisBusy:null, aisErr:null, aisDraft:{ key:o.key, s:o.s, e:o.e, rows, note, src } });
    if(!o.useAi){ done(this._aisStd(o),'','std'); return; }
    if(!this.featOn('ai')){ done(this._aisStd(o),'บัญชีนี้ยังไม่ได้เปิดสิทธิ์ผู้ช่วย AI — แสดงแผนมาตรฐานแทน (ขอเปิดสิทธิ์ที่ผู้ดูแลระบบ)','std'); return; }
    this.setState({ aisBusy:o.key, aisErr:null, aisDraft:null });
    const WD={ '6':'ทำงานจันทร์–เสาร์ หยุดวันอาทิตย์', '5':'ทำงานจันทร์–ศุกร์ หยุดเสาร์–อาทิตย์', '7':'ทำงานทุกวัน' }[o.wd]||'ทำงานจันทร์–เสาร์';
    const sys='คุณคือ Planning Engineer อาวุโสของบริษัท เวลล์คอน อินทีเรีย จำกัด ผู้รับเหมางานตกแต่งภายในระดับ luxury (โรงแรม 5 ดาว · luxury residence · ร้านอาหาร / บาร์ · สำนักงาน · luxury retail) '
      +'หน้าที่: ร่างแผนงานก่อสร้าง (Gantt) ที่ทำได้จริงหน้างาน จากช่วงวันและหมวดงานที่ผู้ใช้ให้\n'
      +'ลำดับงานมาตรฐานงานตกแต่งภายใน (ใช้เป็นหลัก ปรับตามข้อมูลที่ได้):\n'
      +'1) รับพื้นที่ · ป้องกันพื้นที่ · วางแนว (setting out) ก่อนทุกงาน · รื้อถอน (ถ้ามี) ต่อจากรับพื้นที่\n'
      +'2) ผนัง: ตั้งโครง → MEP 1st fix ในผนัง → ปิดแผ่นด้านที่สอง → ฉาบรอยต่อ\n'
      +'3) ฝ้า: แขวนโครง → MEP 1st fix เหนือฝ้า (ท่อแอร์ สปริงเกอร์ สายไฟ) → ตรวจก่อนปิด → ปิดฝ้า → ฉาบรอยต่อ\n'
      +'4) พื้น: ปรับระดับ / screed ช่วงต้น · หิน / กระเบื้องหลังงานเปียกเหนือพื้น · พื้นไม้ / พรมช่วงท้ายหลังสีรอบแรก (ต้องป้องกันผิว)\n'
      +'5) เฟอร์นิเจอร์บิ้วท์อิน: ผลิตในโรงงานคู่ขนาน (ไม่ต้องใส่เป็นงานหน้างาน เว้นแต่ผู้ใช้ขอ) · ติดตั้งหน้างานหลังผนัง / ฝ้าปิดและรองพื้นแล้ว\n'
      +'6) งานสี: โป๊ว / รองพื้น → สีรอบแรก → สีรอบสุดท้ายหลังติดตั้งบิ้วท์อินและ MEP 2nd fix\n'
      +'7) MEP 2nd fix (ดวงโคม สวิตช์ ปลั๊ก หัวจ่ายแอร์ สุขภัณฑ์) หลังสีรอบแรก · ทดสอบระบบ (T&C) ก่อนทำความสะอาดละเอียด\n'
      +'8) เฟอร์นิเจอร์ลอยตัว ช่วงท้ายหลังพื้นและสีเสร็จ\n'
      +'9) ทำความสะอาดหยาบระหว่างงาน · ทำความสะอาดละเอียดก่อนส่งมอบ · ตรวจ Defect / แก้งาน · ส่งมอบวันสุดท้าย\n'
      +'กติกา:\n'
      +'- ใช้เฉพาะหมวดงานที่ผู้ใช้เลือก หมวดละ 1 งานหลัก (แยกเป็น 2 งานหลักได้ถ้าทำคนละช่วงชัดเจน เช่น พื้นหินช่วงกลาง / พื้นไม้ช่วงท้าย)\n'
      +'- ทุกวันที่อยู่ในช่วงวันเริ่ม–วันเสร็จ · งานแรกเริ่มวันเริ่ม · งานสุดท้ายจบวันเสร็จ · งานทับซ้อนกันได้ตามจริงหน้างาน\n'
      +'- วันเริ่ม / วันเสร็จของแต่ละงานไม่ควรตกวันหยุดตามรูปแบบวันทำงานที่ให้\n'
      +'- ช่วงเวลาสั้นเกินจริง → บีบงานซ้อนกัน และระบุความเสี่ยงใน note · ใช้ข้อมูลเพิ่มเติม (lead time ฯลฯ) วางวันให้สอดคล้อง\n'
      +'- ชื่องานรูปแบบ "ภาษาไทย · English" สั้น กระชับ\n'
      +'- ห้ามใส่ราคา ต้นทุน หรือชื่อผู้รับเหมา\n'
      +'ph = เลขเฟสงาน: '+PH.map((x,i)=>i+'='+x).join(' · ')+'\n'
      +'ตอบเป็น JSON เท่านั้น ไม่มีคำอธิบาย ไม่มี code fence:\n'
      +'{"tasks":[{"t":"งานผนัง · Wall","ph":1,"s":"YYYY-MM-DD","e":"YYYY-MM-DD","sub":[{"t":"ตั้งโครงผนัง · Stud Framing","s":"YYYY-MM-DD","e":"YYYY-MM-DD"}]}],"note":"สมมติฐาน / ความเสี่ยง 1–3 ข้อ ภาษาไทย"}\n'
      +'เรียง tasks ตามวันเริ่ม · งานหลักไม่เกิน 18 รายการ';
    const P=o.proj||{};
    const ask='โครงการ: '+(P.name||'-')+(P.code?(' ('+P.code+')'):'')+' · ชื่อแผน: '+o.sched+'\n'
      +'วันเริ่ม: '+o.s+' · วันเสร็จ: '+o.e+' · รวม '+o.days+' วันปฏิทิน\n'
      +'วันทำงาน: '+WD+'\n'
      +'ระดับรายละเอียด: '+(o.lv==='main'?'งานหลักอย่างเดียว (sub เป็น [] ทุกงาน)':'งานหลัก + งานย่อย 2–5 รายการต่องาน เรียงตามลำดับทำงานจริง')+'\n'
      +'หมวดงานที่เลือก:\n'+o.picked.map(t=>'- '+t.th+' · '+t.en+' (ph '+t.ph+') — '+t.d).join('\n')+'\n'
      +(o.area?('พื้นที่ / ขอบเขต: '+o.area.slice(0,600)+'\n'):'')
      +(o.note?('ข้อมูลเพิ่มเติม: '+o.note.slice(0,1500)+'\n'):'')
      +'วันนี้: '+this._isoToday();
    const payload={ model:'claude-sonnet-4-5', max_tokens:6000, system:sys, messages:[{ role:'user', content:ask }] };
    try{
      let reply;
      try{ reply=await this.aiBackend(payload); }
      catch(be){
        if(be.message!=='no-backend' && be.message!=='Failed to fetch') throw be;
        if(!(typeof window!=='undefined'&&window.claude&&window.claude.complete)) throw new Error('ยังไม่ได้เปิดใช้งานผู้ช่วย AI บนเซิร์ฟเวอร์');
        reply=await window.claude.complete(payload);
      }
      const r=this._aisParse(reply, o);
      if(!r.rows.length) throw new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้ง');
      done(r.rows, r.note, 'ai');
    }catch(err){
      this.setState({ aisBusy:null, aisErr:{ key:o.key, msg:((err&&err.message)||'ร่างแผนไม่สำเร็จ')+' — กด "แผนมาตรฐาน (ไม่ใช้ AI)" เพื่อใช้แผนตั้งต้นแทนได้' } });
    } }
  _aisApply(pid, sched, draft){
    if(!draft||!draft.rows||!draft.rows.length) return;
    const PH=this.PLAN_PH(), me=this.state.me||{};
    const by=(this.nickOf&&this.nickOf(me))||me.name||'', byEmail=String(me.email||'').toLowerCase(), byAt=new Date().toISOString();
    const schOf=(r)=>String(r.sched||'แผนงานหลัก');
    const mine=(this.state.plans||[]).filter(r=>r.project===pid&&schOf(r)===sched);
    const blank=new Set(mine.filter(r=>this._aisBlank(r)).map(r=>r.id));
    const kept=mine.filter(r=>!blank.has(r.id)).sort((a,b)=>((a.ord!=null?a.ord:1e9)-(b.ord!=null?b.ord:1e9))||String(a.start||'9999').localeCompare(String(b.start||'9999')));
    const ordMap={}; kept.forEach((r,i)=>{ ordMap[r.id]=i; });
    const base=Date.now(); let lastMain='';
    const add=draft.rows.map((r,i)=>{ const id='pl'+(base+i); if(!r.lv) lastMain=id;
      return { id, project:pid, sched, section:'', parent:r.lv?lastMain:'', ord:kept.length+i, phase:PH[r.ph]||PH[0],
        title:r.t, start:r.s, end:r.e, pct:0, resp:'', by, byEmail, byAt }; });
    const how=draft.src==='ai'?'จากผู้ช่วย AI จัดแผน':'จากแผนมาตรฐาน (ผู้ช่วยจัดแผน)';
    add.forEach(r=>this._planLog(r,'เพิ่ม','',how,''));
    const key=pid+'|'+sched;
    this.setState(st=>{ const M={ ...(st.planMeta||{}) }; const m0=M[key]||{};
      M[key]={ ...m0, from:(m0.from&&m0.from<draft.s)?m0.from:draft.s, to:(m0.to&&m0.to>draft.e)?m0.to:draft.e };
      const plans=(st.plans||[]).filter(r=>!blank.has(r.id)).map(r=>(ordMap[r.id]!=null&&r.ord!==ordMap[r.id])?{ ...r, ord:ordMap[r.id] }:r);
      return { plans:[...plans, ...add], planMeta:M, aisDraft:null, aisOpen:null, planPan:0 }; },
      ()=>{ this._saveSoon&&this._saveSoon(); this.sbPushSoon&&this.sbPushSoon(); });
    this.showToast('ใส่ '+add.length+' กิจกรรมลงแผนแล้ว'+(blank.size?(' · ลบแถวว่าง '+blank.size+' แถว'):'')+' — แก้ไขต่อได้ทุกแถว'); }
`;

const R = [
  ['ปุ่มผู้ช่วย AI ในแถบเครื่องมือ', ADD_BTN, AI_BTN],
  ['แผงผู้ช่วย AI', EMPTY_IF, PANEL + EMPTY_IF],
  ['ค่าที่แผงใช้', '      out.onPlanLook3=()=>this.look3Export(pid);',
   '      out.onPlanLook3=()=>this.look3Export(pid);\n      Object.assign(out, this._aisVals(S, pid, curSch, all));   // ' + MARK],
  ['เมธอดผู้ช่วย AI จัดแผน', '  PLAN_PH(){', METHODS + '  PLAN_PH(){'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ผู้ช่วย AI จัดแผนงาน: แก้ ' + R.length + ' จุด');
