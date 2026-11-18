#!/usr/bin/env node
/* =====================================================================
   v1.428.0 plan-print — แผนงาน: พิมพ์ / PDF ส่งลูกค้า · 18/11/2026
     node scripts/patch-plan-print.js        (รันต่อจาก patch-plan-fold-color.js)
   - ปุ่ม "🖨 พิมพ์ / PDF ส่งลูกค้า" ในแถบเครื่องมือแผนงาน → เปิดหน้าตัวอย่างก่อนพิมพ์ (หน้าต่างใหม่)
   - หัวเอกสาร Wellcon (ชื่อบริษัท TH/EN) · ชื่อเอกสาร · โครงการ / รหัส / ผู้ว่าจ้าง · ฉบับแก้ไข (Rev.) · วันที่ออกเอกสาร
     · สรุป: เริ่ม · เสร็จ · ระยะเวลา · จำนวนกิจกรรม · ความคืบหน้า
   - ตารางกิจกรรม + Gantt คมชัด (HTML/CSS ไม่ใช่รูป): หัวเวลา 2 ชั้นปรับตามช่วงแผน (เดือน/วัน · เดือน/สัปดาห์ · ปี/เดือน)
     · งานหลักเป็นแท่งสรุปแบบ MS Project · สีแท่งตามที่ตั้งในแผน (งานย่อยสืบทอด) · สีเข้ม = % ที่ทำแล้ว · เส้นวันที่ออกเอกสาร
     · หัวตารางซ้ำทุกหน้า · ท้ายหน้า: ที่อยู่บริษัท + เลขหน้า · หมายเหตุ + ช่องลงนาม (จัดทำ / อนุมัติ)
   - ตัวเลือก (จำในเครื่อง): กระดาษ A3 / A4 แนวนอน · ภาษา ไทย / English / ไทย + English · งานย่อย ทั้งหมด / ตามที่พับบนจอ / งานหลักอย่างเดียว
     · คอลัมน์ จำนวนวัน / % / ผู้รับผิดชอบ · ชื่องานข้างแท่ง · เส้นวันที่ออกเอกสาร · ช่องลงนาม · ตราประทับ DRAFT · Rev. · ชื่อเอกสาร
   - ไม่มีราคา / ต้นทุน / ชื่อผู้รับเหมา (แผนงานไม่มีข้อมูลเหล่านี้) · ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน
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
const MARK = 'v1.428.0 plan-print';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (พิมพ์แผนงานส่งลูกค้า)'); process.exit(0); }
if (!t.includes('v1.427.0 plan-fold-color')) { console.error('✗ ต้องรัน scripts/patch-plan-fold-color.js ก่อน'); process.exit(1); }

/* ---------------------------------------------------------------------
   ตัววาดหน้าพิมพ์ — ทำงานในหน้าต่างตัวอย่าง (ไม่ใช่ในแอป) · D = ข้อมูลแผนจากแอป
   --------------------------------------------------------------------- */
function wcPlanPrintRender(D) {
  const LS = 'wc_plan_print';
  const O = { paper: 'A3', lang: 'both', sub: 'all', cDur: true, cPct: true, cResp: false, label: false, today: true, sign: true, draft: false };
  let REV = {}, TTL = {};
  try { const s = JSON.parse(localStorage.getItem(LS) || '{}'); Object.keys(O).forEach(k => { if (s[k] != null) O[k] = s[k]; }); REV = s.rev || {}; TTL = s.ttl || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(Object.assign({}, O, { rev: REV, ttl: TTL }))); } catch (e) {} };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DAY = 864e5;
  const P = (iso) => new Date(iso + 'T00:00:00').getTime();
  const two = (n) => String(n).padStart(2, '0');
  const dmy = (iso) => { if (!iso) return '–'; const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
  const days = (a, b) => Math.round((P(b) - P(a)) / DAY) + 1;
  const MTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const MEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const W = {
    doc: ['แผนงานก่อสร้าง', 'Construction Schedule'], project: ['โครงการ', 'Project'], client: ['ผู้ว่าจ้าง', 'Client'],
    plan: ['แผนงาน', 'Schedule'], rev: ['ฉบับแก้ไข', 'Revision'], issued: ['วันที่ออกเอกสาร', 'Date Issued'],
    start: ['เริ่ม', 'Start'], finish: ['เสร็จ', 'Finish'], dur: ['ระยะเวลา', 'Duration'], days: ['วัน', 'days'], d: ['วัน', 'Days'],
    acts: ['กิจกรรม', 'Activities'], prog: ['ความคืบหน้า', 'Progress'], no: ['ลำดับ', 'No.'], task: ['รายการงาน', 'Activity'],
    resp: ['ผู้รับผิดชอบ', 'Responsible'], prep: ['จัดทำโดย', 'Prepared by'], appr: ['ตรวจสอบ / อนุมัติ', 'Reviewed / Approved by'],
    date: ['วันที่', 'Date'], note: ['หมายเหตุ', 'Note'], legBar: ['แท่งงาน (สีเข้ม = ส่วนที่ทำแล้ว)', 'Task bar (dark = completed)'],
    legSum: ['งานหลัก (สรุปช่วงงานย่อย)', 'Summary task'], legMs: ['จุดสำคัญ (งาน 1 วัน)', 'Milestone (1-day)'], legToday: ['วันที่ออกเอกสาร', 'Date issued'],
    owner: ['ผู้ว่าจ้าง / ผู้แทน', 'Client / Representative'], page: ['หน้า', 'Page'],
    noteTx: ['แผนงานฉบับนี้จัดทำตามข้อมูล ณ วันที่ออกเอกสาร · การปรับแผนจะออกเป็นฉบับแก้ไข (Rev.) ถัดไป', 'This schedule reflects the information available on the date issued. Any change will be issued as the next revision (Rev.).'],
  };
  const tx = (k) => O.lang === 'th' ? W[k][0] : O.lang === 'en' ? W[k][1] : W[k][0] + ' / ' + W[k][1];
  const th2 = (k) => O.lang === 'th' ? esc(W[k][0]) : O.lang === 'en' ? esc(W[k][1]) : esc(W[k][0]) + '<small>' + esc(W[k][1]) + '</small>';
  const key = D.key;
  const rev = REV[key] != null ? REV[key] : '0';
  const title = TTL[key] || D.plan;

  // ---- แถวที่พิมพ์ ----
  const rows = D.rows.filter(r => r.head || (O.sub === 'main' ? r.lv === 0 : O.sub === 'fold' ? !r.hid : true));
  rows.forEach((r, i) => { // ช่วงงานหลัก = รวมงานย่อยทุกชั้น
    if (r.head || !r.par) return; let a = r.s, b = r.e;
    for (let j = D.rows.indexOf(r) + 1; j < D.rows.length && !D.rows[j].head && D.rows[j].lv > r.lv; j++) { const c = D.rows[j]; if (c.s && c.e) { if (!a || c.s < a) a = c.s; if (!b || c.e > b) b = c.e; } }
    r.ss = a; r.se = b; });
  const tasks = D.rows.filter(r => !r.head && r.s && r.e && r.e >= r.s);
  let lo = D.from ? P(D.from) : (tasks.length ? Math.min(...tasks.map(r => P(r.s))) : P(D.today));
  let hi = D.to ? P(D.to) + DAY : (tasks.length ? Math.max(...tasks.map(r => P(r.e))) + DAY : lo + 30 * DAY);
  if (!(hi > lo)) hi = lo + 30 * DAY;
  const span = hi - lo, spanD = Math.round(span / DAY);
  const pc = (ts) => Math.max(0, Math.min(100, (ts - lo) / span * 100));
  const mLab = (d, yr) => (O.lang === 'th' ? MTH[d.getMonth()] : MEN[d.getMonth()]) + (yr ? ' ' + d.getFullYear() : '');
  // หัวเวลา 2 ชั้น
  const t1 = [], t2 = [];
  const seg = (arr, a, b, lab) => { const l = pc(a), r = pc(b); if (r - l > 0.01) arr.push({ l, w: r - l, lab }); };
  const startOf = (ts, unit) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); if (unit === 'm') d.setDate(1); if (unit === 'y') { d.setMonth(0); d.setDate(1); } return d; };
  if (spanD > 400) {
    for (let d = startOf(lo, 'y'); d.getTime() < hi; d.setFullYear(d.getFullYear() + 1)) { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); seg(t1, Math.max(lo, d.getTime()), Math.min(hi, n.getTime()), String(d.getFullYear())); }
    for (let d = startOf(lo, 'm'); d.getTime() < hi; d.setMonth(d.getMonth() + 1)) { const n = new Date(d); n.setMonth(n.getMonth() + 1); seg(t2, Math.max(lo, d.getTime()), Math.min(hi, n.getTime()), (O.lang === 'th' ? MTH : MEN)[d.getMonth()].slice(0, spanD > 900 ? 1 : 3)); }
  } else {
    for (let d = startOf(lo, 'm'); d.getTime() < hi; d.setMonth(d.getMonth() + 1)) { const n = new Date(d); n.setMonth(n.getMonth() + 1); seg(t1, Math.max(lo, d.getTime()), Math.min(hi, n.getTime()), mLab(d, true)); }
    if (spanD <= 62) { for (let x = lo; x < hi; x += DAY) { const d = new Date(x); seg(t2, x, Math.min(hi, x + DAY), String(d.getDate())); } }
    else { const d = new Date(lo); d.setHours(0, 0, 0, 0); while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
      for (; d.getTime() < hi; d.setDate(d.getDate() + 7)) seg(t2, Math.max(lo, d.getTime()), Math.min(hi, d.getTime() + 7 * DAY), String(new Date(Math.max(lo, d.getTime())).getDate())); }
  }
  const grid = t2.map(s => '<i class="g2" style="left:' + s.l.toFixed(3) + '%"></i>').join('') + t1.map(s => '<i class="g1" style="left:' + s.l.toFixed(3) + '%"></i>').join('');
  const todayTs = P(D.today), todayOn = O.today && todayTs >= lo && todayTs < hi;
  const todayLine = todayOn ? '<i class="td" style="left:' + pc(todayTs + DAY / 2).toFixed(3) + '%"></i>' : '';
  const DEF = '#5E7F99';

  // ---- คอลัมน์ ----
  const A4 = O.paper === 'A4';
  const cols = [['no', 8], ['task', A4 ? 58 : 76], ['start', 19], ['finish', 19]];
  if (O.cDur) cols.push(['d', 10]); if (O.cPct) cols.push(['pct', 10]); if (O.cResp) cols.push(['resp', A4 ? 20 : 26]);
  const colg = cols.map(c => '<col style="width:' + c[1] + 'mm">').join('') + '<col>';
  const nCols = cols.length + 1;
  const hd = cols.map(c => '<th class="c-' + c[0] + '">' + (c[0] === 'pct' ? '%' : th2(c[0] === 'd' ? 'd' : c[0])) + '</th>').join('');
  const tl1 = t1.map(s => '<span style="left:' + s.l.toFixed(3) + '%;width:' + s.w.toFixed(3) + '%">' + esc(s.lab) + '</span>').join('');
  const tl2 = t2.map(s => '<span style="left:' + s.l.toFixed(3) + '%;width:' + s.w.toFixed(3) + '%">' + (s.w > 1.1 ? esc(s.lab) : '') + '</span>').join('');

  // ---- เนื้อตาราง ----
  let n = 0, body = '';
  rows.forEach(r => {
    if (r.head) { body += '<tr class="sec"><td colspan="' + nCols + '">' + esc(r.t) + '</td></tr>'; return; }
    n++;
    const col = r.col || DEF;
    const a = r.par ? r.ss : r.s, b = r.par ? r.se : r.e;
    let bar = '';
    if (a && b && b >= a) {
      const l = pc(P(a)), w = Math.max(0.25, pc(P(b) + DAY) - l);
      if (r.par) bar = '<div class="sm" style="left:' + l.toFixed(3) + '%;width:' + w.toFixed(3) + '%;--c:' + (r.col || '#1C1B18') + '"></div>';
      else if (a === b) bar = '<div class="ms" style="left:' + pc(P(a) + DAY / 2).toFixed(3) + '%;background:' + col + '"></div>';   // งาน 1 วัน = จุดสำคัญ (◆)
      else bar = '<div class="b" style="left:' + l.toFixed(3) + '%;width:' + w.toFixed(3) + '%;background:' + col + (O.cPct ? '59' : 'D9') + ';border-color:' + col + '">' + (O.cPct && r.pct ? '<i style="width:' + r.pct + '%;background:' + col + '"></i>' : '') + '</div>';
      if (O.label) bar += '<span class="bl" style="left:calc(' + (l + w).toFixed(3) + '% + 1.2mm)">' + esc(r.t) + '</span>';
    }
    const ind = (r.lv * 3.2).toFixed(1) + 'mm';
    const cell = { no: '<td class="c-no">' + n + '</td>',
      task: '<td class="c-task' + (r.par ? ' par' : '') + '"><div style="padding-left:' + ind + '"><b class="tag" style="background:' + (r.col || 'transparent') + '"></b>' + (r.par && O.sub === 'fold' && r.folded ? '▸ ' : '') + esc(r.t || '–') + '</div></td>',
      start: '<td class="c-start">' + dmy(a) + '</td>', finish: '<td class="c-finish">' + dmy(b) + '</td>',
      d: '<td class="c-d">' + (a && b && b >= a ? days(a, b) : '–') + '</td>', pct: '<td class="c-pct">' + (r.par ? '' : r.pct + '%') + '</td>',
      resp: '<td class="c-resp">' + esc(r.resp || '') + '</td>' };
    body += '<tr class="' + (r.par ? 'rp' : 'rt') + (r.lv ? ' sub' : '') + '">' + cols.map(c => cell[c[0]]).join('') + '<td class="tl"><div class="tlw">' + grid + todayLine + bar + '</div></td></tr>';
  });

  // ---- สรุป ----
  const all = D.rows.filter(r => !r.head);
  const leaf = all.filter(r => !r.par);
  const s0 = tasks.length ? tasks.reduce((m, r) => r.s < m ? r.s : m, tasks[0].s) : '';
  const e0 = tasks.length ? tasks.reduce((m, r) => r.e > m ? r.e : m, tasks[0].e) : '';
  const dA = D.from || s0, dB = D.to || e0;
  const prog = leaf.length ? Math.round(leaf.reduce((s, r) => s + r.pct, 0) / leaf.length) : 0;
  const tile = (k, v) => '<div class="tile"><span>' + esc(tx(k)) + '</span><b>' + v + '</b></div>';
  const docTitle = O.lang === 'th' ? W.doc[0] : O.lang === 'en' ? W.doc[1].toUpperCase() : W.doc[0] + ' · ' + W.doc[1].toUpperCase();
  const legend = '<div class="leg"><span><i class="lb"></i>' + esc(tx('legBar')) + '</span><span><i class="ls"></i>' + esc(tx('legSum')) + '</span><span><i class="lm"></i>' + esc(tx('legMs')) + '</span>' + (todayOn ? '<span><i class="lt"></i>' + esc(tx('legToday')) + ' ' + dmy(D.today) + '</span>' : '') + '</div>';

  const head =
    '<header class="dh"><div class="co"><div class="mk">W</div><div><b>WELLCON INTERIOR CO., LTD.</b><span>บริษัท เวลล์คอน อินทีเรีย จำกัด</span></div></div>' +
    '<div class="tt"><small>' + esc(docTitle) + '</small><h1>' + esc(title) + '</h1><div class="rv">Rev. ' + esc(rev) + ' · ' + esc(tx('issued')) + ' ' + dmy(D.today) + '</div></div></header>' +
    '<div class="pj"><div><span>' + esc(tx('project')) + '</span><b>' + esc(D.proj.name || '–') + (D.proj.code ? ' <em>(' + esc(D.proj.code) + ')</em>' : '') + '</b></div>' +
    (D.proj.client ? '<div><span>' + esc(tx('client')) + '</span><b>' + esc(D.proj.client) + '</b></div>' : '') +
    '<div class="tiles">' + tile('start', dmy(dA)) + tile('finish', dmy(dB)) + tile('dur', (dA && dB ? days(dA, dB) : '–') + ' ' + esc(O.lang === 'en' ? W.days[1] : W.days[0])) + tile('acts', String(all.length)) + (O.cPct ? tile('prog', prog + '%') : '') + '</div></div>';

  const table = '<table class="gt"><colgroup>' + colg + '</colgroup><thead><tr class="h1">' + hd.replace(/<th /g, '<th rowspan="2" ') + '<th class="tlh"><div class="tlw">' + tl1 + '</div></th></tr><tr class="h2"><th class="tlh"><div class="tlw">' + tl2 + '</div></th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="' + nCols + '" class="empty">–</td></tr>') + '</tbody></table>';

  const sign = O.sign ? '<div class="sg"><div><div class="sl">' + esc(tx('prep')) + '</div><div class="ln"></div><div class="sn">' + esc(D.me.name || '') + (D.me.title ? ' · ' + esc(D.me.title) : '') + '</div><div class="sn">Wellcon Interior Co., Ltd.</div><div class="sd">' + esc(tx('date')) + ' ____ / ____ / ________</div></div>' +
    '<div><div class="sl">' + esc(tx('appr')) + '</div><div class="ln"></div><div class="sn">' + esc(tx('owner')) + '</div><div class="sn">' + esc(D.proj.client || '') + '</div><div class="sd">' + esc(tx('date')) + ' ____ / ____ / ________</div></div></div>' : '';
  const foot = '<div class="nt"><b>' + esc(tx('note')) + ':</b> ' + esc(O.lang === 'th' ? W.noteTx[0] : O.lang === 'en' ? W.noteTx[1] : W.noteTx[0] + ' · ' + W.noteTx[1]) + '</div>';

  // ---- กระดาษ / ท้ายหน้า ----
  const pw = A4 ? 297 : 420, ph = A4 ? 210 : 297;
  const cssq = (s) => '"' + String(s).replace(/["\\]/g, ' ') + '"';
  document.getElementById('pg').textContent =
    '@page{size:' + O.paper + ' landscape;margin:11mm 10mm 13mm;' +
    '@bottom-left{content:' + cssq('Wellcon Interior Co., Ltd. · เซ็นโทรพอร์ต 36/38 ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150 · www.wellcon.co.th') + ';font:7pt Sarabun,sans-serif;color:#8C877D}' +
    '@bottom-right{content:' + cssq(tx('page') + ' ') + ' counter(page) " / " counter(pages);font:7pt Sarabun,sans-serif;color:#8C877D}' +
    '@top-right{content:' + cssq((D.proj.name || '') + ' · ' + title + ' · Rev. ' + rev) + ';font:7pt Sarabun,sans-serif;color:#B4AE9F}}' +
    '@media screen{.sheet{width:' + pw + 'mm;min-height:' + ph + 'mm;padding:11mm 10mm 13mm}}' +
    (A4 ? '.gt{font-size:6.6pt}.gt td,.gt th{padding:.55mm .9mm}' : '');
  document.title = 'Schedule_' + (D.proj.code || D.proj.name || '') + '_' + title + '_Rev' + rev + '_' + dmy(D.today).split('/').reverse().join('');
  const docEl = document.getElementById('doc');
  docEl.innerHTML = (O.draft ? '<div class="wm">DRAFT</div>' : '') + head + legend + table + foot + sign;
  // บนจอ: ย่อแผ่นให้พอดีหน้าต่าง · ตอนพิมพ์ใช้ขนาดจริง
  const fit = () => { docEl.style.zoom = ''; const z = Math.min(1, (window.innerWidth - 32) / Math.max(1, docEl.offsetWidth)); docEl.style.zoom = z < 1 ? z.toFixed(3) : ''; };
  fit();
  if (!window.__wcFit) { window.__wcFit = 1; window.addEventListener('resize', fit); window.addEventListener('beforeprint', () => { docEl.style.zoom = ''; }); window.addEventListener('afterprint', fit); }

  // ---- แถบตัวเลือก (เฉพาะบนจอ) ----
  const bar = document.getElementById('bar');
  if (!bar.dataset.on) {
    bar.dataset.on = '1';
    const sel = (k, opts) => '<label>' + opts[0] + '<select data-k="' + k + '">' + opts[1].map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></label>';
    const chk = (k, lab) => '<label class="ck"><input type="checkbox" data-k="' + k + '">' + lab + '</label>';
    bar.innerHTML = '<button id="pp">🖨 พิมพ์ / บันทึก PDF</button>' +
      sel('paper', ['กระดาษ', [['A3', 'A3 แนวนอน'], ['A4', 'A4 แนวนอน']]]) +
      sel('lang', ['ภาษา', [['both', 'ไทย + English'], ['th', 'ไทย'], ['en', 'English']]]) +
      sel('sub', ['งานย่อย', [['all', 'แสดงทั้งหมด'], ['fold', 'ตามที่พับบนจอ'], ['main', 'งานหลักอย่างเดียว']]]) +
      chk('cDur', 'จำนวนวัน') + chk('cPct', '% ความคืบหน้า') + chk('cResp', 'ผู้รับผิดชอบ') + chk('label', 'ชื่องานข้างแท่ง') + chk('today', 'เส้นวันที่ออกเอกสาร') + chk('sign', 'ช่องลงนาม') + chk('draft', 'DRAFT') +
      '<label>Rev.<input id="rv" size="3"></label><label class="wide">ชื่อเอกสาร<input id="tt"></label>' +
      '<span class="hint">ตั้งค่าในหน้าต่างพิมพ์: ปิด "หัวกระดาษและท้ายกระดาษ" · เปิด "กราฟิกพื้นหลัง"</span>';
    bar.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k; if (el.type === 'checkbox') el.checked = !!O[k]; else el.value = O[k];
      el.addEventListener('change', () => { O[k] = el.type === 'checkbox' ? el.checked : el.value; save(); wcPlanPrintRender(D); });
    });
    const rv = document.getElementById('rv'), tt = document.getElementById('tt');
    rv.value = rev; tt.value = title;
    rv.addEventListener('input', () => { REV[key] = rv.value.trim(); save(); wcPlanPrintRender(D); });
    tt.addEventListener('change', () => { const v = tt.value.trim(); if (v && v !== D.plan) TTL[key] = v; else delete TTL[key]; save(); wcPlanPrintRender(D); });
    document.getElementById('pp').addEventListener('click', () => window.print());
  }
}

const CSS = [
  '*{box-sizing:border-box}html,body{margin:0}body{font-family:Sarabun,"Noto Sans Thai",Tahoma,sans-serif;color:#1C1B18;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  '#bar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 16px;background:#1C1B18;color:#F4EFE6;font-size:12.5px}',
  '#bar label{display:inline-flex;align-items:center;gap:6px}#bar select,#bar input:not([type=checkbox]){font:inherit;font-size:12px;border:1px solid #57534A;background:#2C2A25;color:#F4EFE6;border-radius:7px;padding:5px 7px}',
  '#bar .wide input{width:220px}#bar .ck{gap:4px}#bar button{background:#C9A961;border:none;border-radius:9px;padding:9px 16px;font:inherit;font-weight:700;color:#1C1B18;cursor:pointer}#bar .hint{flex-basis:100%;font-size:11px;color:#A99F8C}',
  '@media screen{body{background:#E9E4D8}.sheet{margin:16px auto;background:#fff;box-shadow:0 6px 28px rgba(0,0,0,.14)}}',
  '@media print{#bar{display:none}.sheet{padding:0}}',
  '.sheet{position:relative}',
  '.wm{position:fixed;top:38%;left:0;right:0;text-align:center;font-size:120pt;font-weight:800;letter-spacing:.1em;color:rgba(196,68,46,.10);transform:rotate(-20deg);pointer-events:none;z-index:0}',
  '.dh{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;padding-bottom:3mm;border-bottom:1.2pt solid #B8935A}',
  '.co{display:flex;align-items:center;gap:3mm}.co .mk{width:11mm;height:11mm;border-radius:2.4mm;background:linear-gradient(135deg,#CDAE76,#9C7944);color:#fff;font-weight:800;font-size:17pt;display:flex;align-items:center;justify-content:center}',
  '.co b{display:block;font-size:12pt;letter-spacing:.06em}.co span{display:block;font-size:8.5pt;color:#6E695E}',
  '.tt{text-align:right}.tt small{display:block;font-size:8pt;font-weight:700;letter-spacing:.14em;color:#9C7944}.tt h1{margin:.5mm 0 0;font-size:16pt;line-height:1.15}.tt .rv{font-size:8.5pt;color:#6E695E;margin-top:.8mm}',
  '.pj{display:flex;flex-wrap:wrap;align-items:flex-end;gap:2mm 9mm;padding:3mm 0 2.6mm}.pj>div>span{display:block;font-size:7pt;font-weight:700;color:#8C877D;letter-spacing:.04em}.pj b{font-size:10.5pt}.pj em{font-style:normal;font-weight:400;color:#8C877D}',
  '.tiles{display:flex;gap:2mm;margin-left:auto}.tile{border:.6pt solid #E4DED2;background:#FBF8F1;border-radius:1.6mm;padding:1.3mm 3.2mm;min-width:22mm}.tile span{display:block;font-size:6.5pt;font-weight:700;color:#8C877D}.tile b{font-size:10pt}',
  '.leg{display:flex;flex-wrap:wrap;gap:6mm;font-size:7pt;color:#57534A;margin:0 0 1.6mm}.leg span{display:inline-flex;align-items:center;gap:1.4mm}',
  '.leg .lb{display:inline-block;width:9mm;height:2.6mm;border-radius:.6mm;background:linear-gradient(90deg,#5E7F99 55%,#5E7F9959 55%)}.leg .ls{display:inline-block;width:9mm;height:1.3mm;background:#1C1B18;position:relative}.leg .lt{display:inline-block;width:0;height:3.4mm;border-left:1pt dashed #C4442E}',
  '.gt{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.2pt}',
  '.gt th{background:#1C1B18;color:#F4EFE6;font-weight:700;text-align:left;padding:.8mm 1.2mm;vertical-align:middle;border:.4pt solid #3A372F;line-height:1.15}',
  '.gt th small{display:block;font-size:.82em;font-weight:400;color:#C9C2B2}.gt th.c-no,.gt th.c-d,.gt th.c-pct{text-align:center}',
  '.gt .tlh{padding:0;position:relative;height:5mm}.gt tr.h1 .tlh{background:#2C2A25}.gt tr.h2 .tlh{background:#3A372F;height:4.2mm}',
  '.tlw{position:relative;width:100%;height:100%;min-height:inherit}',
  '.tlh .tlw span{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;border-left:.4pt solid rgba(244,239,230,.28);font-size:.92em;white-space:nowrap;overflow:hidden}.gt tr.h2 .tlh span{font-weight:400;font-size:.82em;color:#D8D0BF}',
  '.gt td{border:.4pt solid #E4DED2;padding:.7mm 1.2mm;vertical-align:middle;line-height:1.2;overflow:hidden}',
  '.gt tbody tr{break-inside:avoid;page-break-inside:avoid}.gt thead{display:table-header-group}',
  '.c-no,.c-d,.c-pct{text-align:center;color:#57534A}.c-start,.c-finish{white-space:nowrap;font-variant-numeric:tabular-nums}.c-resp{white-space:nowrap;text-overflow:ellipsis}',
  '.c-task div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.c-task .tag{display:inline-block;width:1.3mm;height:2.8mm;border-radius:.4mm;margin-right:1.4mm;vertical-align:-.4mm}',
  'tr.rp td{background:#F4F7FA;font-weight:700}tr.rp.sub td{background:#F8F9FB}tr.rt.sub td.c-task{color:#2C2A25}',
  'tr.sec td{background:#F3EAD9;color:#6E5424;font-weight:800;font-size:1.05em;padding:1mm 1.6mm;letter-spacing:.02em}',
  '.gt td.tl{padding:0;position:relative;height:5.2mm}.gt td.tl .tlw{position:absolute;inset:0}',
  '.tlw .g1{position:absolute;top:0;bottom:0;border-left:.5pt solid #D8D0BF}.tlw .g2{position:absolute;top:0;bottom:0;border-left:.3pt solid #F0EBE0}',
  '.tlw .td{position:absolute;top:0;bottom:0;border-left:.9pt dashed #C4442E;z-index:3}',
  '.tlw .b{position:absolute;top:26%;bottom:26%;border:.5pt solid;border-radius:.6mm;overflow:hidden;z-index:2}.tlw .b i{display:block;height:100%}',
  '.tlw .sm{position:absolute;top:36%;height:1.3mm;background:var(--c);z-index:2}.tlw .sm:before,.tlw .sm:after{content:"";position:absolute;top:100%;border-top:1.3mm solid var(--c);border-left:.9mm solid transparent;border-right:.9mm solid transparent}.tlw .sm:before{left:-.9mm}.tlw .sm:after{right:-.9mm}',
  '.tlw .ms{position:absolute;top:50%;width:2.4mm;height:2.4mm;margin:-1.2mm 0 0 -1.2mm;transform:rotate(45deg);border:.5pt solid #1C1B18;z-index:3}',
  '.leg .lm{display:inline-block;width:2.2mm;height:2.2mm;transform:rotate(45deg);background:#5E7F99;border:.5pt solid #1C1B18}',
  '.tlw .bl{position:absolute;top:0;bottom:0;display:flex;align-items:center;white-space:nowrap;font-size:.86em;color:#4A463E;z-index:2}',
  '.empty{text-align:center;color:#8C877D;padding:6mm}',
  '.nt{margin-top:3mm;font-size:7pt;color:#6E695E;line-height:1.5}',
  '.sg{display:flex;gap:16mm;margin-top:7mm;break-inside:avoid;page-break-inside:avoid}.sg>div{flex:0 0 78mm;font-size:8pt;text-align:center}.sg .sl{font-weight:700;text-align:left;color:#57534A}.sg .ln{border-bottom:.8pt solid #1C1B18;height:13mm;margin-bottom:1.4mm}.sg .sn{color:#2C2A25}.sg .sd{margin-top:1.6mm;color:#8C877D}',
].join('');

const RENDER_SRC = wcPlanPrintRender.toString();

const METHODS =
  "  // " + MARK + ": พิมพ์ / PDF แผนงานส่งลูกค้า — หน้าต่างตัวอย่างพร้อมตัวเลือก (กระดาษ · ภาษา · งานย่อย · คอลัมน์ · Rev.)\n" +
  "  _planPrintData(pid, sched){\n" +
  "    const S=this.state, schOf=(r)=>String(r.sched||'แผนงานหลัก');\n" +
  "    const all=(S.plans||[]).filter(r=>r.project===pid&&schOf(r)===sched);\n" +
  "    const secOf=(r)=>String(r.section||'').trim()||'ทั่วไป';\n" +
  "    const secStart={}; all.forEach(r=>{ const s=secOf(r), v=String(r.start||'9999'); if(!secStart[s]||v<secStart[s]) secStart[s]=v; });\n" +
  "    const sorted=all.some(x=>x.ord!=null)\n" +
  "      ?[...all].sort((a,b)=>((a.ord!=null?a.ord:1e9)-(b.ord!=null?b.ord:1e9)))\n" +
  "      :[...all].sort((a,b)=>{ const sa=secOf(a), sb=secOf(b); if(sa!==sb) return String(secStart[sa]).localeCompare(String(secStart[sb]))||sa.localeCompare(sb); return String(a.start||'9999').localeCompare(String(b.start||'9999')); });\n" +
  "    const secs=[...new Set(sorted.map(secOf))], multi=secs.length>1||(secs.length===1&&secs[0]!=='ทั่วไป');\n" +
  "    const byId={}, pOf={}; all.forEach(x=>{ byId[x.id]=x; pOf[x.id]=x.parent||''; });\n" +
  "    const colOf=(x)=>{ let c=x.color, p=pOf[x.id], n=0; while(!c&&p&&n++<40){ c=byId[p]&&byId[p].color; p=pOf[p]; } return /^#[0-9A-Fa-f]{6}$/.test(c||'')?c:''; };\n" +
  "    const fold=S.planFold||(this._planFoldLS?this._planFoldLS():{});\n" +
  "    const nameOf=(uid)=>{ if(!uid) return ''; const a=(S.accounts||[]).find(x=>x.uid===uid); return a?((this.nickOf&&this.nickOf(a))||a.name||''):''; };\n" +
  "    const okD=(v)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(String(v||''));\n" +
  "    const rows=[];\n" +
  "    secs.forEach(sec=>{ const grp=sorted.filter(r=>secOf(r)===sec); if(multi) rows.push({ head:true, t:sec });\n" +
  "      const kids=(id)=>grp.filter(c=>c.parent===id);\n" +
  "      const walk=(r,lv,hid,seen)=>{ if(seen.has(r.id)) return; seen.add(r.id); const k=kids(r.id);\n" +
  "        rows.push({ t:String(r.title||'').trim(), lv:Math.min(lv,4), par:k.length>0, folded:!!fold[r.id]&&k.length>0, hid, s:okD(r.start)?r.start:'', e:okD(r.end)?r.end:'',\n" +
  "          pct:Math.max(0,Math.min(100,Math.round(Number(r.pct||0)))), col:colOf(r), resp:nameOf(r.resp) });\n" +
  "        k.forEach(c=>walk(c,lv+1,hid||(!!fold[r.id]),seen)); };\n" +
  "      const seen=new Set(); grp.filter(r=>!r.parent||!grp.some(g=>g.id===r.parent)).forEach(r=>walk(r,0,false,seen)); });\n" +
  "    const p=(S.projects||[]).find(x=>x.id===pid)||{}, M=((S.planMeta||{})[pid+'|'+sched])||{}, me=S.me||{};\n" +
  "    return { key:pid+'|'+sched, plan:sched, proj:{ name:p.name||'', code:p.code||'', client:p.client||'' },\n" +
  "      from:okD(M.from)?M.from:'', to:okD(M.to)?M.to:'', today:this._isoToday(), me:{ name:(this.nickOf&&this.nickOf(me))||me.name||'', title:me.title||'' }, rows };\n" +
  "  }\n" +
  "  planPrint(pid, sched){\n" +
  "    if(typeof window==='undefined') return;\n" +
  "    if(!sched){ this.showToast('เลือกแผนงานก่อน'); return; }\n" +
  "    const D=this._planPrintData(pid, sched);\n" +
  "    if(!D.rows.some(r=>!r.head)){ this.showToast('แผนนี้ยังไม่มีกิจกรรม'); return; }\n" +
  "    const w=window.open('','_blank'); if(!w){ this.showToast('เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต pop-up แล้วลองอีกครั้ง'); return; }\n" +
  "    const SC='<'+'script>', SE='<'+'/script>';\n" +
  "    const data=JSON.stringify(D).replace(/</g,'\\\\u003c');\n" +
  "    w.document.write('<!doctype html><html lang=\"th\"><head><meta charset=\"utf-8\"><title>Schedule</title>'\n" +
  "      +'<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;800&display=swap\">'\n" +
  "      +'<style>'+" + JSON.stringify(CSS) + "+'</style><style id=\"pg\"></style></head><body><div id=\"bar\"></div><div class=\"sheet\" id=\"doc\"></div>'\n" +
  "      +SC+" + JSON.stringify(RENDER_SRC) + "+'\\nwcPlanPrintRender('+data+');'+SE+'</body></html>');\n" +
  "    w.document.close();\n" +
  "    try{ this.engLog&&this.engLog('doc', pid, 'plan-print|'+Date.now().toString().slice(0,8)); }catch(e){}\n" +
  "  }\n";

const BTN_ANCHOR = '<span style="font-size:12px;font-weight:600;color:#4A463E">ส่งออก Excel (Gantt)</span>\n            </button>';
const BTN_NEW = BTN_ANCHOR + '\n            <!-- ' + MARK + ' --><button sc-camel-on-click="{{ onPlanPrint }}" title="พิมพ์ / บันทึก PDF แผนงานแบบเอกสารส่งลูกค้า (A3 / A4 · ไทย / English)" style="flex:none;display:flex;align-items:center;gap:8px;background:#1C1B18;border:1px solid #1C1B18;border-radius:12px;padding:10px 15px;cursor:pointer;font-family:inherit"><span style="font-size:13px">🖨</span><span style="font-size:12px;font-weight:700;color:#E2C27A">พิมพ์ / PDF ส่งลูกค้า</span></button>';
const OUT_ANCHOR = '      Object.assign(out, this._aisVals(S, pid, curSch, all));';
const OUT_NEW = OUT_ANCHOR + '\n      out.onPlanPrint=()=>this.planPrint(pid, curSch);   // ' + MARK;

const R = [
  ['ปุ่มพิมพ์ในแถบเครื่องมือ', BTN_ANCHOR, BTN_NEW],
  ['ตัวจัดการปุ่มพิมพ์', OUT_ANCHOR, OUT_NEW],
  ['เมธอดพิมพ์แผนงาน', '  PLAN_PH(){', METHODS + '  PLAN_PH(){'],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ พิมพ์ / PDF แผนงานส่งลูกค้า: แก้ ' + R.length + ' จุด');
