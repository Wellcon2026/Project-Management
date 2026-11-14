#!/usr/bin/env node
/* =====================================================================
   v1.391.0 pd-cockpit — หน้า Project Management (ภาพรวมโครงการ) แบบใหม่ "Project Cockpit"
     node scripts/patch-pd-cockpit.js        (รันต่อจาก patch-pd-compact.js)
   ผู้บริหารสั่ง: ออกแบบใหม่ทั้งหมด — ใช้การ์ดเป็นฟังก์ชันหลัก / dropdown — กะทัดรัด ใช้งานง่าย
   โครงใหม่ (บนลงล่าง):
     1) แถบหัว: รหัส · ชื่อโครงการ · ลูกค้า · วันที่ | มูลค่างานหลัง VO | สถานะเทียบแผน
     2) ปุ่มเครื่องมือ: โน้ต · Look-ahead · อัลบั้มรูป (เดิม)
     3) การ์ดฟังก์ชันหลัก (ไอคอน + ชื่อ): Site Work · รายงานประจำวัน · Claim · RFI · VO · แผนงาน · Handover · Takeoff · Delay
     4) การ์ดตัวเลข 4 ใบ: งานเสร็จจริง · ไทม์ไลน์ตามสัญญา · วางบิล · เก็บเงิน (แตะ = ไปหน้านั้น)
     5) รายละเอียดเลือกดูทีละเรื่อง: 👥 ทีมงาน · 💰 สัญญา & การเงิน · 📊 คาดการณ์ & ขั้นตอนงาน
        (เริ่มต้นปิดทั้งหมด · จำค่าที่เลือกในเครื่อง 'wellcon_pm_pdx'.pdxPanel)
     6) งานคงค้าง · โน้ตโครงการ (เดิม) — เต็มความกว้าง
   ทุกฟังก์ชันเดิมอยู่ครบ (ย้ายตำแหน่ง) · ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
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
const MARK = 'v1.391.0 pd-cockpit';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Project Cockpit)'); process.exit(0); }
if (!t.includes('v1.390.0 pd-compact')) { console.error('✗ ต้องรัน scripts/patch-pd-compact.js ก่อน'); process.exit(1); }
const die = (m) => { console.error('✗ ' + m + ' — ไม่แก้ไฟล์'); process.exit(1); };
const once = (s, a, name) => { const n = s.split(a).length - 1; if (n !== 1) die('จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1)'); return s.indexOf(a); };
// หาแท็กปิดของ element ที่เปิดที่ตำแหน่ง i ในสตริง s
const endOf = (s, i) => { const name = s.slice(i + 1).match(/^[\w-]+/)[0]; const re = new RegExp('<' + name + '\\b|</' + name + '>', 'g'); re.lastIndex = i + 1; let d = 1, m;
  while ((m = re.exec(s))) { d += m[0][1] === '/' ? -1 : 1; if (d === 0) return m.index + m[0].length; } die('หาแท็กปิดของ <' + name + '> ไม่เจอ'); };
const inner = (s, i) => { const e = endOf(s, i); const o = s.indexOf('>', i) + 1; const c = s.lastIndexOf('</', e - 1); return s.slice(o, c); };

// ---------- 1) ตัดส่วนหัวเดิมออกเป็นชิ้น ----------
const HERO = '<div style="background:#1C1B18;border-radius:18px;padding:14px 18px;margin-bottom:12px;display:grid;grid-template-columns:{{ pdx.heroCols }};gap:14px 20px;align-items:start">';
const h0 = once(t, HERO, 'กล่องส่วนหัว');
const FORMS = '<button sc-camel-on-click="{{ pvx.on_forms }}"';
const f0 = t.indexOf(FORMS, h0); if (f0 < 0) die('หาปุ่มงานคงค้างไม่เจอ');
const colsTxt = t.slice(h0 + HERO.length, f0);   // 3 คอลัมน์เดิม
// คอลัมน์ = div ลูก 3 ตัว
const cols = []; { let p = 0; for (let k = 0; k < 3; k++) { const a = colsTxt.indexOf('<div', p); if (a < 0) die('หาคอลัมน์ที่ ' + (k + 1) + ' ไม่เจอ'); const b = endOf(colsTxt, a); cols.push(colsTxt.slice(a, b)); p = b; }
  if (colsTxt.slice(p).trim() !== '') die('มีส่วนอื่นนอก 3 คอลัมน์'); }
const c1 = inner(cols[0], 0), c2 = inner(cols[1], 0), c3 = inner(cols[2], 0);
// คอลัมน์ 1: ข้อมูลโครงการ | ทีมงาน
const TK = '<span class="kicker" style="font-size:8.5px;color:#B49A6E">ทีมงานโครงการ</span>';
const tk = once(c1, TK, 'หัวทีมงาน'); const tDiv = c1.lastIndexOf('<div', tk);
let idPart = c1.slice(0, tDiv), teamPart = c1.slice(tDiv);
const pick = (s, a, name) => { const i = once(s, a, name); const e = endOf(s, i); return [s.slice(i, e), s.slice(0, i) + s.slice(e)]; };
let codeLine, tvnd, nameLine, clientLine, quickOld;
[codeLine, idPart] = pick(idPart, '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:5px"><span class="num kicker"', 'รหัสโครงการ');
[tvnd, idPart] = pick(idPart, '<sc-if value="{{ pd.tvndOn }}"', 'แถบแยก MED');
[nameLine, idPart] = pick(idPart, '<div class="serif" style="font-size:clamp(18px,1.9vw,23px)', 'ชื่อโครงการ');
[clientLine, idPart] = pick(idPart, '<div style="font-size:11px;color:#8E876F;margin-top:3px">{{ pd.client }}', 'ลูกค้า · วันที่');
[quickOld, idPart] = pick(idPart, '<sc-if value="{{ pdx.qHas }}"', 'ปุ่มลัดเดิม');
const tools = idPart.trim();   // โน้ต · Look-ahead · อัลบั้ม + ฟอร์มลิงก์อัลบั้ม
// ทีมงาน: แสดงรายชื่อเต็มเสมอในแผงทีม (ตัดปุ่มซ่อน / แถวพับ)
let x;
[x, teamPart] = pick(teamPart, '<sc-if value="{{ pdx.teamOpen }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ pdx.onTeam }}"', 'ปุ่มซ่อนทีม');
[x, teamPart] = pick(teamPart, '<sc-if value="{{ pdx.teamClosed }}"', 'แถวทีมแบบพับ');
{ const a = once(teamPart, '<sc-if value="{{ pdx.teamOpen }}" hint-placeholder-val="{{ true }}">', 'รายชื่อทีม'); const e = endOf(teamPart, a);
  teamPart = teamPart.slice(0, a) + inner(teamPart, a) + teamPart.slice(e); }
// คอลัมน์ 2: รายละเอียดคาดการณ์ / ขั้นตอนงาน (บล็อก "ดูเพิ่ม")
const mb = once(c2, '{{ pdx.moreBtn }}', 'ปุ่มดูเพิ่ม');
const mo = c2.indexOf('<sc-if value="{{ pdx.moreOpen }}" hint-placeholder-val="{{ true }}">', mb); if (mo < 0) die('หาบล็อกดูเพิ่มไม่เจอ');
const progPart = inner(c2, mo);
// คอลัมน์ 3: รายละเอียดสัญญา / การเงิน
const mn = once(c3, '<sc-if value="{{ pdx.moneyOpen }}" hint-placeholder-val="{{ true }}">', 'บล็อกการเงิน');
let moneyPart = inner(c3, mn);

// แผงรายละเอียด: ตัดเส้นคั่นบนที่ซ้ำ (ย้ายมาอยู่ในกล่องแล้ว)
{ const a = 'margin:11px 0 7px;padding-top:10px;border-top:1px solid #2E2C27'; once(teamPart, a, 'หัวทีม: เส้นบน'); teamPart = teamPart.replace(a, 'margin:10px 0 8px'); }
{ const a = 'margin-top:14px;padding-top:13px;border-top:1px solid #2E2C27'; once(moneyPart, a, 'การเงิน: เส้นบน'); moneyPart = moneyPart.replace(a, 'margin-top:14px'); }

// ---------- 2) ประกอบหน้าใหม่ ----------
const BAR = (w, col) => '<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:7px"><div style="width:' + w + ';height:100%;background:' + col + ';border-radius:3px"></div></div>';
const KPI = (on, title, label, val, valCol, bar, sub, subCol) =>
  '<div sc-camel-on-click="{{ ' + on + ' }}" title="' + title + '" style="background:#26241F;border:1px solid #33302A;border-radius:13px;padding:10px 12px;min-width:0;cursor:pointer" style-hover="border-color:#C9A961;background:#2B2923">' +
  '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><span style="font-size:10.5px;color:#B9B09D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + label + ' <span style="color:#C9A961">›</span></span>' +
  '<span class="num" style="font-size:17px;font-weight:700;color:' + valCol + ';line-height:1;flex:none">' + val + '</span></div>' + bar +
  '<div class="num" style="font-size:10px;font-weight:600;margin-top:6px;line-height:1.4;color:' + subCol + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sub + '</div></div>';
const NEW =
  '<div style="background:#1C1B18;border-radius:18px;padding:14px 16px;margin-bottom:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start">\n' +
  '          <div style="min-width:0;display:flex;flex-direction:column;gap:12px"><!-- ' + MARK + ' -->\n' +
  // 1) แถบหัว
  '            <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 18px">\n' +
  '              <div style="flex:1 1 300px;min-width:0">' + codeLine + tvnd + nameLine + clientLine + '</div>\n' +
  '              <div sc-camel-on-click="{{ pd.onBillPress }}" title="ไปที่การเงินโครงการ" style="flex:none;margin-left:auto;text-align:right;cursor:pointer"><div style="font-size:10px;color:#8E876F">มูลค่างาน · หลัง VO <span style="color:#C9A961">›</span></div><div class="num" style="font-size:clamp(18px,1.9vw,22px);font-weight:700;color:#F4EFE6;white-space:nowrap;line-height:1.2">{{ pd.headValue }}</div></div>\n' +
  '            </div>\n' +
  // 2) เครื่องมือเดิม
  '            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0 2px;margin-top:-7px">' + tools + '</div>\n' +
  // 3) การ์ดฟังก์ชันหลัก
  '            <sc-if value="{{ pdx.qHas }}" hint-placeholder-val="{{ true }}"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,142px),1fr));gap:7px">' +
  '<sc-for list="{{ pdx.quick }}" as="q" hint-placeholder-count="8"><button sc-camel-on-click="{{ q.onPress }}" title="{{ q.full }}" style="display:flex;align-items:center;gap:9px;min-width:0;border:1px solid #33302A;background:#26241F;border-radius:12px;padding:8px 10px;cursor:pointer;font-family:inherit;text-align:left" style-hover="border-color:#C9A961;background:#2B2923">' +
  '<span style="width:28px;height:28px;flex:none;border-radius:8px;background:#C9A961;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1">{{ q.ic }}</span>' +
  '<span style="flex:1;min-width:0;font-size:12px;font-weight:700;color:#F4EFE6;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ q.label }}</span></button></sc-for></div></sc-if>\n' +
  // 4) การ์ดตัวเลข
  '            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px">' +
  KPI('pd.goPlan', 'ไปที่แผนงาน · ความคืบหน้า — {{ pd.workHint }}', 'งานเสร็จจริง', '{{ pd.workPct }}', '#8FB59A', BAR('{{ pd.workPct }}', '#8FB59A'), '{{ pd.phase }} · PM {{ pd.pm }}', '#A99F8C') +
  KPI('pd.goPlan', 'ไปที่แผนงาน · ความคืบหน้า', 'ไทม์ไลน์ตามสัญญา', '{{ pd.tlPctText }}', '#8FA8C4', BAR('{{ pd.tlPctText }}', '#8FA8C4'), '{{ pd.tlNote }}', '{{ pd.tlGapColor }}') +
  KPI('pd.onBillPress', 'ไปที่การเงินโครงการ — วางบิลสะสมเทียบมูลค่างานหลัง VO', 'วางบิลแล้ว', '{{ pd.billPctText }}', '#D8B876', BAR('{{ pd.billPct }}', '#D8B876'), '{{ pd.billGap }}', '{{ pd.billGapColor }}') +
  KPI('pd.onBillPress', 'ไปที่การเงินโครงการ — เงินที่เก็บเข้ามาจริงเทียบมูลค่าสัญญาหลัง VO (ก่อน VAT)', 'เก็บเงินแล้ว', '{{ pd.colPctText }}', '#7FC79A', BAR('{{ pd.colW }}', '#7FC79A'), 'เก็บได้ {{ pd.colAmt }} / {{ pd.colContract }}', '#A99F8C') +
  '</div>\n' +
  // 5) รายละเอียดเลือกดูทีละเรื่อง
  '            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:10.5px;color:#8E876F;margin-right:2px">รายละเอียด</span>' +
  '<sc-for list="{{ pdx.tabs }}" as="b" hint-placeholder-count="3"><button sc-camel-on-click="{{ b.onPress }}" style="border:1px solid {{ b.bd }};background:{{ b.bg }};color:{{ b.fg }};border-radius:999px;padding:6px 13px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">{{ b.label }} {{ b.arrow }}</button></sc-for></div>\n' +
  '            <sc-if value="{{ pdx.panelTeam }}" hint-placeholder-val="{{ false }}"><div style="background:#22201C;border:1px solid #33302A;border-radius:13px;padding:4px 12px 12px">' + teamPart + '</div></sc-if>\n' +
  '            <sc-if value="{{ pdx.panelMoney }}" hint-placeholder-val="{{ false }}"><div style="background:#22201C;border:1px solid #33302A;border-radius:13px;padding:0 14px 14px">' + moneyPart + '</div></sc-if>\n' +
  '            <sc-if value="{{ pdx.panelProg }}" hint-placeholder-val="{{ false }}"><div style="background:#22201C;border:1px solid #33302A;border-radius:13px;padding:2px 14px 4px">' + progPart + '</div></sc-if>\n' +
  '          </div>\n            ';
t = t.slice(0, h0) + NEW + t.slice(f0);

// ---------- 3) โค้ด: การ์ดฟังก์ชัน + แผงรายละเอียด + งานคงค้างเต็มความกว้าง ----------
const R = [
  ['การ์ดฟังก์ชัน: ไอคอน',
   "Q.forEach(k=>{ const i=(defs||[]).findIndex(d=>d[0]===k); if(i>=0&&tabs&&tabs[i]) quick.push({ key:k, label:String(defs[i][1]||'').split(' · ')[0], onPress:tabs[i].onPress }); });",
   "const IC={ qc:'🔍', daily:'📝', claim:'🛡️', rfi:'❓', changes:'➕', plan:'📈', handover:'🤝', qm:'📐', delay:'⏰' };   // " + MARK + "\n" +
   "    Q.forEach(k=>{ const i=(defs||[]).findIndex(d=>d[0]===k); if(i>=0&&tabs&&tabs[i]) quick.push({ key:k, label:String(defs[i][1]||'').split(' · ')[0], full:String(defs[i][1]||''), ic:IC[k]||'•', onPress:tabs[i].onPress }); });"],
  ['แผงรายละเอียด: เลือกทีละเรื่อง',
   "onTeam:()=>tg('pdxTeam',!T), heroCols,",
   "onTeam:()=>tg('pdxTeam',!T), heroCols,\n" +
   "      ...(()=>{ const P0=S.pdxPanel!=null?S.pdxPanel:LS.pdxPanel; const P=['team','money','prog'].indexOf(P0)>=0?P0:'';   // " + MARK + "\n" +
   "        return { panelTeam:P==='team', panelMoney:P==='money', panelProg:P==='prog',\n" +
   "          tabs:[['team','👥 ทีมงาน'],['money','💰 สัญญา & การเงิน'],['prog','📊 คาดการณ์ & ขั้นตอนงาน']].map(([k,l])=>({ key:k, label:l, arrow:P===k?'▴':'▾',\n" +
   "            bg:P===k?'#C9A961':'#26241F', fg:P===k?'#1C1B18':'#E9E1D2', bd:P===k?'#C9A961':'#3A3730', onPress:()=>tg('pdxPanel', P===k?'':k) })) }; })(),"],
  ['งานคงค้าง: เต็มความกว้าง',
   "remTeamRow:isDesktop?'span 2':'auto', remCol:isDesktop?'2 / -1':'1 / -1',",
   "remTeamRow:'auto', remCol:'1 / -1',"],
];
for (const [name, a] of R) once(t, a, name);
for (const [, a, b] of R) t = t.split(a).join(b);

lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Project Cockpit: ประกอบหน้าใหม่ + แก้โค้ด ' + R.length + ' จุด');
