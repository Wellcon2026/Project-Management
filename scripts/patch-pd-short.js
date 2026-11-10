#!/usr/bin/env node
/* =====================================================================
   หน้าภาพรวมโครงการ (Project Management) — สั้นลงอีก · เหลือเฉพาะข้อมูลสำคัญ (มือถือเป็นหลัก)
     node scripts/patch-pd-short.js        (รันต่อจาก patch-exec-dash.js)
   แสดงตลอด: หัวโครงการ + ปุ่มลัด · ทีม · ความคืบหน้า 3 แถบ · ตัวเลขหลัก (ใช้จ่าย / VO / RFI / EOT / งวดเงิน) · ความคืบหน้างานจัดซื้อ
   พับไว้ (แตะเพื่อเปิด · จำค่าในเครื่อง):
     📝 งานคงค้าง · โน้ตโครงการ   ⭐ Level Gate · คะแนนของฉัน   📁 ลิงก์ไฟล์โครงการ
     📋 ขอบเขตงาน · BOQ · กลยุทธ์ · ผู้ช่วย AI   🤝 ข้อมูลสัญญา · คู่สัญญา · เอกสาร
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
if (t.includes('_pvx(S)')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าภาพรวมโครงการแบบสั้น v2)'); process.exit(0); }
const die = (m) => { console.error('✗ ' + m + ' — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); };
const one = (a, name) => { const n = t.split(a).length - 1; if (n !== 1) die('จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1)'); return t.indexOf(a); };
// หาแท็กปิดของ element ที่เปิดที่ตำแหน่ง i (นับแท็กชื่อเดียวกัน)
const endOf = (i) => { const name = t.slice(i + 1).match(/^[\w-]+/)[0]; const re = new RegExp('<' + name + '\\b|</' + name + '>', 'g'); re.lastIndex = i + 1; let d = 1, m;
  while ((m = re.exec(t))) { d += m[0][1] === '/' ? -1 : 1; if (d === 0) return m.index + m[0].length; } die('หาแท็กปิดของ <' + name + '> ไม่เจอ'); };

const LIGHT = (k, ic, lab, sub, mt) => `<button sc-camel-on-click="{{ pvx.on_${k} }}" style="display:flex;align-items:center;gap:10px;width:100%;border:1px solid #EDE7DA;background:#fff;border-radius:14px;padding:13px 16px;margin-top:${mt || '0'};font-family:inherit;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent" style-hover="border-color:#C9A961"><span style="font-size:16px;flex:none">${ic}</span><span style="flex:1;min-width:0;font-size:14px;font-weight:700;color:#1C1B18;line-height:1.35">${lab}<span style="display:block;font-weight:500;color:#8C877D;font-size:12px">${sub}</span></span><span style="flex:none;font-size:12.5px;color:#9A8767;font-weight:700">{{ pvx.btn_${k} }}</span></button>`;
const DARK = (k, ic, lab, sub) => `<button sc-camel-on-click="{{ pvx.on_${k} }}" style="grid-column:1 / -1;display:flex;align-items:center;gap:10px;width:100%;border:1px dashed #4A463C;background:transparent;border-radius:12px;padding:11px 14px;font-family:inherit;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent"><span style="font-size:15px;flex:none">${ic}</span><span style="flex:1;min-width:0;font-size:13.5px;font-weight:700;color:#E9E1D2;line-height:1.35">${lab}<span style="display:block;font-weight:500;color:#A99F8C;font-size:11.5px">${sub}</span></span><span style="flex:none;font-size:12px;color:#C9A961;font-weight:700">{{ pvx.btn_${k} }}</span></button>`;
const wrap = (a, b, k, btn) => { t = t.slice(0, a) + btn + '\n<sc-if value="{{ pvx.' + k + ' }}" hint-placeholder-val="{{ false }}">' + t.slice(a, b) + '</sc-if>' + t.slice(b); };

// ทำจากท้ายไฟล์ขึ้นมา (ตำแหน่งข้างหน้าไม่เลื่อน)
const jobs = [];
{ const a = one('<sc-if value="{{ pdTabParties }}" hint-placeholder-val="{{ false }}">', 'ข้อมูลโครงการ & คู่สัญญา'); jobs.push([a, endOf(a), 'parties', LIGHT('parties', '🤝', 'ข้อมูลสัญญา · คู่สัญญา · เอกสาร', 'มูลค่าสัญญา · วันเริ่ม-สิ้นสุด · Owner / Consult / Designer · เอกสารโครงการ', '12px')]); }
{ const a = one('<sc-if value="{{ sowShow }}" hint-placeholder-val="{{ false }}">', 'ขอบเขตงาน'); jobs.push([a, endOf(a), 'sow', LIGHT('sow', '📋', 'ขอบเขตงาน · BOQ · กลยุทธ์ · ผู้ช่วย AI', 'Scope of Work · ค้นหารายการ BOQ · Project Strategy')]); }
{ const m = one('<span class="kicker" style="font-size:8.5px;color:#9A8767">ลิงก์ไฟล์โครงการ</span>', 'ลิงก์ไฟล์โครงการ');
  const head = '<div style="background:#fff;border:1px solid #EDE7DA;border-radius:16px;padding:14px 16px 16px">'; const a = t.lastIndexOf(head, m);
  if (a < 0 || m - a > 400) die('หากล่องลิงก์ไฟล์ไม่เจอ'); jobs.push([a, endOf(a), 'files', LIGHT('files', '📁', 'ลิงก์ไฟล์โครงการ', 'SharePoint · Google Drive · Sheets · Photos')]); }
{ const a = one('<sc-if value="{{ engMiniShow }}" hint-placeholder-val="{{ false }}">', 'Level Gate'); jobs.push([a, endOf(a), 'eng', '<div style="margin-bottom:10px">' + LIGHT('eng', '⭐', 'Level Gate · คะแนนของฉัน', 'การมีส่วนร่วมในโครงการนี้') + '</div>']); }
{ const a = one('<sc-if value="{{ remShow }}" hint-placeholder-val="{{ false }}">', 'งานคงค้าง'); const p = one('<sc-if value="{{ pnShow }}" hint-placeholder-val="{{ false }}">', 'โน้ตโครงการ');
  if (p < a) die('ลำดับงานคงค้าง / โน้ต ไม่ตรง'); const b = endOf(p); if (!/^\s*$/.test(t.slice(endOf(a), p))) die('งานคงค้าง / โน้ต ไม่ได้อยู่ติดกัน');
  jobs.push([a, b, 'forms', DARK('forms', '📝', 'งานคงค้าง · โน้ตโครงการ', '{{ pvx.formsSub }}')]); }
jobs.sort((x, y) => y[0] - x[0]).forEach(([a, b, k, btn]) => wrap(a, b, k, btn));
// Level Gate (คะแนนส่วนตัว) ย้ายไปท้ายหน้า ต่อจากข้อมูลสัญญา — ไม่ใช่ข้อมูลหลักของโครงการ
{ const head = '<div style="margin-bottom:10px">' + LIGHT('eng', '⭐', 'Level Gate · คะแนนของฉัน', 'การมีส่วนร่วมในโครงการนี้') + '</div>\n<sc-if value="{{ pvx.eng }}"';
  const a = one(head, 'Level Gate (ย้าย)'); const s2 = a + head.length - '<sc-if value="{{ pvx.eng }}"'.length; const b = endOf(s2); const blk = t.slice(a, b);
  t = t.slice(0, a) + t.slice(b);
  const ph = 'sc-camel-on-click="{{ pvx.on_parties }}"'; const p0 = one(ph, 'ตำแหน่งข้อมูลสัญญา'); const pIf = t.indexOf('<sc-if value="{{ pvx.parties }}"', p0); if (pIf < 0) die('หา sc-if ข้อมูลสัญญาไม่เจอ');
  const pe = endOf(pIf); t = t.slice(0, pe) + '\n' + blk.replace('<div style="margin-bottom:10px">', '<div style="margin-top:10px">') + t.slice(pe); }

// ค่าที่ส่งให้หน้าจอ + ตัวช่วย
{ const a = 'pdx:this._pdx(S, pdTabDefs, pdTabs),'; one(a, 'ค่าที่ส่งให้หน้าจอ'); t = t.replace(a, a + ' pvx:this._pvx(S),'); }
{ const a = '  _claimOpen(pid){'; one(a, 'ตัวช่วย _pvx');
  t = t.replace(a, `  // v1.372.0 หน้าภาพรวมโครงการแบบสั้น v2: ส่วนรองพับไว้ (จำค่าในเครื่อง)
  _pvx(S){ let O=S.pvxOpen; if(!O){ try{ O=JSON.parse(localStorage.getItem('wc_pvx')||'{}')||{}; }catch(e){ O={}; } }
    const o={}; ['forms','eng','files','sow','parties'].forEach(k=>{ const on=!!O[k]; o[k]=on; o['btn_'+k]=on?'ซ่อน ▴':'เปิด ▾';
      o['on_'+k]=()=>{ const n={ ...O, [k]:!on }; try{ localStorage.setItem('wc_pvx', JSON.stringify(n)); }catch(e){} this.setState({ pvxOpen:n }); }; });
    const pid=S.projectId; const nN=(((S.notes||{})['proj:'+pid])||[]).filter(n=>this._noteVisible?this._noteVisible(n):true).length;
    o.formsSub='เพิ่ม / ติดตามงานคงค้าง'+(nN?(' · โน้ต '+nN+' รายการ'):' · จดโน้ตของโครงการ'); return o; }
` + a); }

lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าภาพรวมโครงการแบบสั้น v2: พับ 5 ส่วนรอง (งานคงค้าง/โน้ต · Level Gate · ลิงก์ไฟล์ · ขอบเขตงาน/BOQ/กลยุทธ์ · ข้อมูลสัญญา/คู่สัญญา)');
