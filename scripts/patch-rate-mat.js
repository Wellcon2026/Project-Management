#!/usr/bin/env node
/* =====================================================================
   v1.411.0 rate-mat — ผู้บริหารสั่ง 16/11/2026: อัตรากลาง เพิ่มรายการ "วัสดุมาตรฐาน" + เปลี่ยนตัวเลือกหมวดเป็นเมนูดรอปดาวน์
     node scripts/patch-rate-mat.js        (รันหลัง patch-top-home.js)
   1) หมวดใหม่ "วัสดุมาตรฐาน" (ถัดจากค่าแรงช่าง): ชื่อวัสดุ · ราคาเรียกเก็บลูกค้า · หน่วย
      · ปุ่ม "＋ ใส่รายการแนะนำ" ใส่ชื่อวัสดุมาตรฐานตามที่ผู้บริหารกำหนด (ไม่ใส่ตัวเลข — QS / ผู้บริหารกรอกราคาเอง):
          ฝ้ายิปซัมตราช้าง พร้อม accessories — ธรรมดา 9 มม. / 12 มม. · กันชื้น 9 มม. / 12 มม.   (฿ / ตร.ม.)
          ไม้อัด เกรด AAA — 8 / 10 / 12 / 15 / 20 มม.                                           (฿ / แผ่น)
      · หน่วยเพิ่ม: เมตร · ชิ้น
      · ใช้ได้ทันทีในตัวคำนวณ VO / EOT · แอป Claim: บรรทัด "วัสดุ" เลือกจากวัสดุมาตรฐานได้ (repository wellcon-defect-check)
   2) ตัวเลือกหมวด: จากปุ่มเรียงกัน 7–8 ปุ่ม → เมนูดรอปดาวน์ (ตามแนวทาง: ตัวเลือกเกิน 5 ข้อใช้ดรอปดาวน์ · ประหยัดพื้นที่จอมือถือ)
   ข้อมูล: app_state 'claimRates'.items — รายการวัสดุ g = 'mat' (โครงสร้างเดิม ไม่มีคีย์ใหม่) · ไม่ต้องรัน SQL
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
const MARK = 'v1.411.0 rate-mat';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (วัสดุมาตรฐาน + ดรอปดาวน์หมวด)'); process.exit(0); }
if (!t.includes('v1.410.0 rate-card')) { console.error('✗ ต้องรัน scripts/patch-rate-card.js ก่อน'); process.exit(1); }

const IN = 'box-sizing:border-box;border:1px solid #E4DED2;background:#fff;border-radius:9px;padding:8px 10px;font-size:12.5px;font-family:inherit;color:#2C2A25;outline:none';
const TABS_OLD = '            <div style="display:flex;gap:6px;flex-wrap:wrap">\n              <sc-for list="{{ rtTabs }}" as="t" hint-placeholder-count="4"><button sc-camel-on-click="{{ t.onPress }}" style="border:1px solid {{ t.bd }};background:{{ t.bg }};color:{{ t.fg }};border-radius:10px;padding:8px 13px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer">{{ t.label }}</button></sc-for>\n            </div>\n';
const TABS_NEW = '            <!-- ' + MARK + ': เลือกหมวดด้วยเมนูดรอปดาวน์ -->\n' +
  '            <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;color:#6E5424;letter-spacing:.04em;max-width:420px">หมวดอัตรา\n' +
  '              <sc-raw-select ref="{{ rtGroupRef }}" value="{{ rtGroupVal }}" sc-camel-on-change="{{ onRtGroup }}" style="width:100%;min-height:42px;font-weight:700;font-size:13px;' + IN + '"><sc-for list="{{ rtGroupOptions }}" as="o" hint-placeholder-count="4"><option value="{{ o.value }}">{{ o.label }}</option></sc-for></sc-raw-select>\n' +
  '            </label>\n';

const R = [
  ['หมวดใหม่ วัสดุมาตรฐาน', "  RATE_GROUPS(){ return [['labor','ค่าแรงช่าง'],['staff','บุคลากรควบคุมงาน'],", "  RATE_GROUPS(){ return [['labor','ค่าแรงช่าง'],['mat','วัสดุมาตรฐาน'],['staff','บุคลากรควบคุมงาน'],   // " + MARK + "\n   ", 1],
  ['หน่วยเพิ่ม: เมตร · ชิ้น', "  RATE_UNITS(){ return ['วัน','เดือน','เที่ยว','แผ่น','ชุด','ตร.ม.','ครั้ง','เหมา']; }", "  RATE_UNITS(){ return ['วัน','เดือน','เที่ยว','แผ่น','ตร.ม.','เมตร','ชิ้น','ชุด','ครั้ง','เหมา']; }", 1],
  ['รายการแนะนำ: วัสดุมาตรฐาน', "  RATE_SEED(){ return { staff:[",
   "  RATE_SEED(){ return { mat:[['ฝ้ายิปซัมตราช้าง 9 มม. ธรรมดา · พร้อม accessories','ตร.ม.',0],['ฝ้ายิปซัมตราช้าง 12 มม. ธรรมดา · พร้อม accessories','ตร.ม.',0],['ฝ้ายิปซัมตราช้าง 9 มม. กันชื้น · พร้อม accessories','ตร.ม.',0],['ฝ้ายิปซัมตราช้าง 12 มม. กันชื้น · พร้อม accessories','ตร.ม.',0],\n" +
   "      ['ไม้อัด เกรด AAA 8 มม.','แผ่น',0],['ไม้อัด เกรด AAA 10 มม.','แผ่น',0],['ไม้อัด เกรด AAA 12 มม.','แผ่น',0],['ไม้อัด เกรด AAA 15 มม.','แผ่น',0],['ไม้อัด เกรด AAA 20 มม.','แผ่น',0]],   // " + MARK + ": ผู้บริหารกำหนด 16/11/2026\n    staff:[", 1],
  ['หน่วยตั้งต้นของรายการใหม่', "u:(g==='staff'||g==='site'||g==='tool')?'เดือน':(g==='doc'?'แผ่น':(g==='trans'?'เที่ยว':'ชุด'))", "u:(g==='staff'||g==='site'||g==='tool')?'เดือน':((g==='doc'||g==='mat')?'แผ่น':(g==='trans'?'เที่ยว':'ชุด'))", 1],
  ['ข้อมูลเมนูดรอปดาวน์หมวด', "    out.rtIsLabor=g==='labor'; out.rtIsItems=g!=='labor';",
   "    out.rtGroupRef=this._selRef(g); out.rtGroupVal=g; out.onRtGroup=(e)=>this.setState({ rtGroup:e.target.value });   // " + MARK + "\n" +
   "    out.rtGroupOptions=G.map(x=>{ const n=x[0]==='labor'?trades.length:items.filter(i=>i&&i.g===x[0]).length; return { value:x[0], label:x[1]+(n?(' · '+n+' รายการ'):' · ยังไม่มีรายการ') }; });\n" +
   "    out.rtIsLabor=g==='labor'; out.rtIsItems=g!=='labor';", 1],
  ['หน้าจอ: ปุ่มหมวด → เมนูดรอปดาวน์', TABS_OLD, TABS_NEW, 1],
  ['คำอธิบายการ์ด: เพิ่มวัสดุ', "ค่าแรงช่าง · ล่วงเวลา", "ค่าแรงช่าง · ล่วงเวลา", 0],
];
const RR = R.filter(x => x[3] > 0);
for (const [name, a, , n] of RR) { const c = t.split(a).length - 1; if (c !== n) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ ' + n + ') — ไม่แก้อะไรเลย'); process.exit(1); } }
let pts = 0;
for (const [, a, b, n] of RR) { pts += n; t = t.split(a).join(b); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ วัสดุมาตรฐาน + ดรอปดาวน์หมวด: แก้ ' + pts + ' จุด');
