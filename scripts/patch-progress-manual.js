#!/usr/bin/env node
/* =====================================================================
   v1.393.0 progress-manual — ไม่นับความคืบหน้าจากตารางในแอป (ทีมติดตามงานใน Google Sheet)
     node scripts/patch-progress-manual.js        (รันต่อจาก patch-pd-cockpit2.js)
   ผู้บริหารสั่ง 14/11/2026: ตารางในแอป (แผนงาน · Material Log · จัดซื้อ · RFI · VO ฯลฯ) ยังใช้ได้ตามเดิม
     สำหรับคนที่ไม่สะดวกทำ Google Sheet — แต่ "ห้ามนับความคืบหน้าจากตารางเหล่านี้"
   1) % ความคืบหน้าโครงการ (projPct / planPct) = ตัวเลขที่ PM / Admin กรอกเองเท่านั้น
      (ช่อง "ความคืบหน้า %" ในตารางโครงการ — อัปเดตตาม Google Sheet) · เลิกคำนวณจากแผนงาน / BOQ / วัสดุ
      ยังไม่กรอก = แสดง "—" (ไม่ใช่ 0%) · projPctKnown / projPctLabel
   2) หน้าแรก: สถานะ ล่าช้า / เฝ้าระวัง / ตามแผน — โครงการที่ยังไม่กรอก % ดูจากวันในสัญญา + สถานะที่ตั้งเอง (health) เท่านั้น
      ไม่ฟ้อง "ช้ากว่าแผน" จาก 0% · ค่าเฉลี่ยความคืบหน้านับเฉพาะโครงการที่กรอกแล้ว
   3) หน้า Project Management: เอาแผง "📊 ขั้นตอนงาน" (อนุมัติวัสดุ · สั่งซื้อ · ส่งของ จาก BOQ) และกล่อง
      "ความคืบหน้างานจัดซื้อ" (ส่งแบบ … ส่งของ) ออก
   ข้อมูลเดิมไม่ถูกลบ · ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.393.0 progress-manual';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ความคืบหน้า = กรอกเองเท่านั้น)'); process.exit(0); }
if (!t.includes('v1.392.0 pd-cockpit2')) { console.error('✗ ต้องรัน scripts/patch-pd-cockpit2.js ก่อน'); process.exit(1); }
const die = (m) => { console.error('✗ ' + m + ' — ไม่แก้ไฟล์'); process.exit(1); };
const count = (a) => t.split(a).length - 1;
const endOf = (i) => { const name = t.slice(i + 1).match(/^[\w-]+/)[0]; const re = new RegExp('<' + name + '\\b|</' + name + '>', 'g'); re.lastIndex = i + 1; let d = 1, m;
  while ((m = re.exec(t))) { d += m[0][1] === '/' ? -1 : 1; if (d === 0) return m.index + m[0].length; } die('หาแท็กปิดของ <' + name + '> ไม่เจอ'); };
const block = (s, e) => { const a = t.indexOf(s); if (a < 0 || count(s) !== 1) die('หา "' + s.slice(0, 40) + '" ไม่เจอ / เจอซ้ำ'); const b = t.indexOf(e, a); if (b < 0) die('หาจุดจบของ "' + s.slice(0, 30) + '" ไม่เจอ'); return [a, b]; };

// ---------- 1) ฟังก์ชันความคืบหน้า ----------
const [p0, p1] = block('  projPct(p){\n', '  // ความคืบหน้า "เชิงมูลค่า"');
const PCT =
  "  // ===== " + MARK + ": ความคืบหน้าโครงการ = ตัวเลขที่ PM / Admin กรอกเอง (ตาม Google Sheet) — ไม่นับจากตารางในแอป =====\n" +
  "  projPctKnown(p){ return !!p && Number(p.progress||0)>0; }\n" +
  "  projPct(p){ if(!p) return 0; return Math.min(100,Math.max(0,Math.round(Number(p.progress||0)))); }\n" +
  "  projPctLabel(p){ return this.projPctKnown(p)?this.projPct(p)+'%':'—'; }\n" +
  "  planPct(p){ return this.projPctKnown(p)?this.projPct(p):null; }\n";
t = t.slice(0, p0) + PCT + t.slice(p1);
const [s0, s1] = block('  projPctSrc(p){\n', '\n  }\n');
t = t.slice(0, s0) + "  projPctSrc(p){ return this.projPctKnown(p)?'กรอกเองในตารางโครงการ (อัปเดตตาม Google Sheet)':'ยังไม่กรอกความคืบหน้า — กรอกที่ตารางโครงการ'; }" + t.slice(s1 + '\n  }'.length);

// ---------- 2) ข้อความ % ในหน้าต่าง ๆ (เฉพาะจุดที่เป็นข้อความ ไม่ใช่ความกว้างแถบ) ----------
const R = [
  ['หน้าทำงาน: ชื่อโครงการ', "'ความคืบหน้า '+this.projPct(p)+'%'", "'ความคืบหน้า '+this.projPctLabel(p)"],
  ['ส่งออก', "ความคืบหน้า:this.projPct(p)+'%'", "ความคืบหน้า:this.projPctLabel(p)"],
  ['แถบข้าง: ป้าย %', "badge:this.projPct(p)+'%'", "badge:this.projPctLabel(p)"],
  ['ตัวเลือกโครงการ', "t:p.name+' · '+this.projPct(p)+'%'", "t:p.name+' · '+this.projPctLabel(p)"],
  ['แดชบอร์ด: ความคืบหน้าโครงการ', "value:this.projPct(dashOne)+'%'", "value:this.projPctLabel(dashOne)"],
  ['ตารางโครงการ: ข้อความ %', "progress:this.projPct(r.p)+'%', progressW:", "progress:this.projPctLabel(r.p), progressW:"],
  ['ค้นหา: %', "meta:this.projPct(p)+'%'", "meta:this.projPctLabel(p)"],
  ['การ์ดโครงการ: ส่งสถานะรู้ % ไหม', "pct:this.projPct(p)+'%', pctNum:this.projPct(p),", "pct:this.projPct(p)+'%', pctNum:this.projPct(p), pctKnown:this.projPctKnown(p),"],
  ['ค่าเฉลี่ย: นับเฉพาะที่กรอก',
   "const avgProgress=Math.round(dashScope.reduce((s,p)=>s+this.projPct(p),0)/Math.max(1,dashScope.length));",
   "const avgProgress=(()=>{ const K=dashScope.filter(p=>this.projPctKnown(p)); return Math.round(K.reduce((s,p)=>s+this.projPct(p),0)/Math.max(1,K.length)); })();   // " + MARK],
  // หน้าแรก: สถานะโครงการ
  ['สถานะ: ช่องว่างแผน', "const over=e!=null&&now>e+D&&pct<100?Math.floor((now-e)/D):0; const gap=el!=null?Math.round(el*100-pct):0;",
   "const known=p.pctKnown!==false;   // " + MARK + ": ยังไม่กรอก % = ไม่เทียบแผน\n      const over=e!=null&&now>e+D&&pct<100?Math.floor((now-e)/D):0; const gap=known&&el!=null?Math.round(el*100-pct):0;"],
  ['สถานะ: เสร็จงาน', "if(pct>=100){ st='เสร็จงาน';", "if(known&&pct>=100){ st='เสร็จงาน';"],
  ['สถานะ: ข้อความเลยกำหนด', "text:'เลยกำหนดส่งงาน '+over+' วัน · งานเสร็จ '+pct+'%'", "text:'เลยกำหนดส่งงาน '+over+' วัน'+(known?(' · งานเสร็จ '+pct+'%'):'')"],
  ['สถานะ: ควรวางบิล', "if(colPct!=null&&pct>=25&&pct-colPct>=30)", "if(known&&colPct!=null&&pct>=25&&pct-colPct>=30)"],
  // หน้า Project Management: แผง 📊 ขั้นตอนงาน (จาก BOQ)
  ['Cockpit: ปุ่มแผง 📊', ",['prog','📊 ขั้นตอนงาน']", ""],
];
for (const [name, a] of R) if (count(a) !== 1) die('จุด "' + name + '" พบ ' + count(a) + ' ครั้ง (ต้อง 1)');
for (const [, a, b] of R) t = t.split(a).join(b);

// ---------- 3) ตัดแผง 📊 และกล่องความคืบหน้างานจัดซื้อ ----------
const cuts = [];
{ const a = t.indexOf('<sc-if value="{{ pdx.panelProg }}"'); if (a < 0 || count('<sc-if value="{{ pdx.panelProg }}"') !== 1) die('หาแผง 📊 ไม่เจอ');
  let e = endOf(a); if (t[e] === '\n') e++; const ls = t.lastIndexOf('\n', a) + 1; cuts.push([t.slice(ls, a).trim() === '' ? ls : a, e]); }
{ const K = '<span class="kicker" style="font-size:8.5px;color:#9A8767">ความคืบหน้างานจัดซื้อ</span>'; if (count(K) !== 1) die('หากล่องความคืบหน้างานจัดซื้อไม่เจอ');
  const k = t.indexOf(K); const box = t.lastIndexOf('<div style="background:#fff;border:1px solid #EDE7DA;border-radius:16px;padding:12px 16px 13px">', k);
  if (box < 0 || k - box > 400) die('หากรอบกล่องความคืบหน้างานจัดซื้อไม่เจอ');
  const be = endOf(box); const wrap = t.lastIndexOf('<div', box - 1);
  // ถ้ากล่องนี้เป็นลูกตัวเดียวของ grid ครอบ → ตัดทั้งก้อน
  const we = endOf(wrap); const rest = t.slice(wrap, we).replace(t.slice(box, be), '');
  const onlyChild = we > be && /^<div[^>]*>\s*<\/div>$/.test(rest);
  if (onlyChild) { const ls = t.lastIndexOf('\n', wrap) + 1; cuts.push([t.slice(ls, wrap).trim() === '' ? ls : wrap, we]); } else cuts.push([box, be]); }
cuts.sort((x, y) => y[0] - x[0]).forEach(([a, b]) => { t = t.slice(0, a) + t.slice(b); });

lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ความคืบหน้า = กรอกเองเท่านั้น: แก้ ' + (R.length + 2) + ' จุด · ตัด ' + cuts.length + ' ส่วน');
