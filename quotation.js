/* =====================================================================
   Wellcon PM — Quotation Maker · ใบเสนอราคาด่วนสำหรับ QS
   ---------------------------------------------------------------------
   • หน้าแยก (ไม่แตะโค้ด PM หลัก) เปิดจากการ์ด / เมนู "Quotation Maker" ในหน้าโครงการ
       quotation.html?pid=<project id>   ·   quotation.html (เลือกงานเอง)   ·   &q=<id> เปิดใบตรง ๆ   ·   &env=staging = ข้อมูลทดสอบ
   • ใช้กับงานไม่ซับซ้อน: พื้นที่เดียว · เฟอร์นิเจอร์ · งานซ่อมความเสียหาย · งานเปลี่ยนแบบ (Design Change)
     ทั้งงานในโครงการ และ "งานใหม่นอกโครงการ"
   • แบบแนบ: รูป / PDF (ผัง · รูปด้าน · รูปตัด · Perspective · สเปก · รูปถ่าย) — ซูม · เลื่อน · ตีกรอบพื้นที่ให้ผู้อนุมัติเห็นส่วนที่เสนอราคา
   • ผู้ช่วย AI (Supabase function ai-assistant ตัวเดียวกับแอปหลัก): อ่านแบบ → เสนอรายการ + ปริมาณ + ที่มา + คำถามที่ต้องถาม
     AI ไม่ใส่ราคา — ราคามาจากอัตรากลาง (app_state 'claimRates') หรือ QS กรอกเอง · รายการจาก AI ต้องติ๊ก "ตรวจแล้ว" ก่อนส่งอนุมัติ
   • ขั้นตอน: ร่าง → รออนุมัติ (QS Manager / ผู้บริหาร · ห้ามอนุมัติใบของตัวเอง) → อนุมัติแล้ว → ส่งลูกค้าแล้ว · ส่งกลับแก้ไข / ยกเลิก
   • เอกสารลูกค้า: ราคา / หน่วยรวม OH&P แล้ว (ไม่แสดงกำไร) · ระบุ ไม่รวม VAT / รวม VAT 7% · ลายน้ำ DRAFT จนกว่าจะอนุมัติ
   • ข้อมูล: app_state 'quotations' { <pid> | '_new': [ใบเสนอราคา] } — อ่าน-รวม-เขียนรายใบ · ไฟล์แบบ: bucket general-photo โฟลเดอร์ quotation/ · ไม่ต้องรัน SQL
   ===================================================================== */
(() => {
'use strict';
const QM_VER = 'v1.1.0';   // 1.1.0: หน้าเริ่มงานใหม่ — แผงนำดำ-ทอง · ภาพเส้นแบบแปลนเคลื่อนไหว · การ์ดประเภทงานกดเริ่มได้เลย · ตัวเลขสรุปงาน
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h))   /* กติกาเดียวกับแอปหลัก: ข้อมูลจริง = เฉพาะ *.vercel.app */) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
const KEY = 'quotations', NEW = '_new', BUCKET = 'general-photo', TAB = 'tab:quo', TAG_APP = 'Quotation Maker';
const CO = { th: 'บริษัท เวลล์คอน อินทีเรีย จำกัด', en: 'Wellcon Interior Co., Ltd.', tax: '0105560007187', addr: 'เซ็นโทรพอร์ต 36/38 ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150', web: 'www.wellcon.co.th' };
const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
const ROLE_TH = { pm: 'Project Manager', pm_mgr: 'Project Manager', director: 'Project Director', qs: 'QS', qs_mgr: 'QS Manager', superadmin: 'Admin' };
const DEF_ROLES = ['qs', 'qs_mgr', 'director'];              // ตำแหน่งที่มีการ์ด Quotation Maker ในชุดเริ่มต้น (ตรงกับ WORK_DEF ของแอปหลัก)
const APPROVER_R = ['qs_mgr', 'director', 'superadmin'];
const VAT = 7, PRELIM_RANGE = [8, 20], OHP_RANGE = [10, 15]; // มาตรฐานบริษัท: Preliminary 8–20% · OH&P 10–15%
const MAX_ATT = 12, MAX_AI_IMG = 8, AI_EDGE = 1568, KEEP_EDGE = 2800;
const KINDS = [['area', '🏠', 'พื้นที่เดียว', 'ห้อง / โซนเดียว'], ['furn', '🪑', 'เฟอร์นิเจอร์', 'Built-in / Loose'], ['damage', '🛠', 'งานซ่อมความเสียหาย', 'ซ่อม / เปลี่ยนของเสียหาย'], ['dco', '✏️', 'งานเปลี่ยนแบบ', 'Design Change Order']];
const SECS = [['floor', 'งานพื้น', 'Flooring Works'], ['ceil', 'งานฝ้าเพดาน', 'Ceiling Works'], ['wall', 'งานผนัง', 'Wall Works'], ['bi', 'FF&E — เฟอร์นิเจอร์ Built-in', 'FF&E — Built-in Furniture'],
  ['loose', 'FF&E — เฟอร์นิเจอร์ลอยตัว (Loose)', 'FF&E — Loose Furniture'], ['mep', 'งานระบบ (MEP)', 'MEP Works'], ['demo', 'งานรื้อถอน / ซ่อมแซม', 'Demolition / Repair Works'], ['other', 'งานอื่น ๆ', 'Other Works']];
const AKINDS = [['plan', 'ผัง (Plan)'], ['elev', 'รูปด้าน (Elevation)'], ['sect', 'รูปตัด / ดีเทล (Section / Detail)'], ['persp', 'Perspective'], ['spec', 'สเปก (Specification)'], ['photo', 'รูปถ่ายหน้างาน'], ['other', 'อื่น ๆ']];
const UNITS = ['ตร.ม.', 'ม.', 'ชุด', 'ชิ้น', 'ตัว', 'จุด', 'แผ่น', 'บาน', 'เหมา', 'วัน', 'คน-วัน', 'เที่ยว', 'ครั้ง'];
const RATE_G = { labor: 'ค่าแรงช่าง', mat: 'วัสดุมาตรฐาน', staff: 'บุคลากรควบคุมงาน', doc: 'งานแบบและเอกสาร', trans: 'เดินทางและขนส่ง', tool: 'เครื่องมือและอุปกรณ์', site: 'ค่าใช้จ่ายหน้างาน', prot: 'งานป้องกันและตัวอย่าง' };
const STS = { draft: ['ร่าง', '#F3EDE1', '#6B6758'], sent: ['รออนุมัติ', '#FAF1D6', '#8A6D10'], returned: ['ส่งกลับแก้ไข', '#FBEDE9', '#B4442E'], approved: ['อนุมัติแล้ว', '#E6EFE0', '#2E7D46'],
  issued: ['ส่งลูกค้าแล้ว', '#E1EEF4', '#2A7DA3'], cancelled: ['ยกเลิก', '#ECEAE4', '#8A8375'] };

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const pad = (n, w) => String(n).padStart(w || 2, '0');
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
const has = (v) => String(v == null ? '' : v).trim() !== '' && isFinite(parseFloat(String(v).replace(/,/g, '')));
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const f2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const baht = (n) => '฿' + f2(n);
const fq = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const dmy = (t) => { if (!t) return ''; const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const dmyhm = (t) => { if (!t) return ''; const d = new Date(t); return dmy(t) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const rowOf = (r) => ({ ...(r.data || {}), id: r.id, ...(r.project ? { project: r.project } : {}) });
const seesAll = (a) => a.allProj === true || (a.allProj !== false && ALL_SCOPE.includes(a.roleKey));
const projName = (p) => p ? (p.name || p.project || p.title || p.id) : '';
const projCode = (p) => p ? (p.code || p.jobNo || p.no || '') : '';
const uid = (p) => (p || 'q') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = (o) => JSON.parse(JSON.stringify(o));
const lines = (t) => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
const secOf = (k) => SECS.find(s => s[0] === k) || SECS[SECS.length - 1];
const kindOf = (k) => KINDS.find(x => x[0] === k) || KINDS[0];
const akOf = (k) => (AKINDS.find(x => x[0] === k) || AKINDS[AKINDS.length - 1])[1];
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2800); }

const APP = { acc: null, me: null, accounts: [], projects: [], all: {}, rates: [], ohp: null, FP: {}, aiOff: false, scope: 'all', filter: 'all', find: '', cur: null, dirty: false, busy: false, screen: 'msg', blobs: {} };
const SCR = ['msg', 'list', 'edit', 'view'];
function show(s) { APP.screen = s; SCR.forEach(k => { $('scr' + k[0].toUpperCase() + k.slice(1)).hidden = k !== s; }); }
function msg(html) { $('msgBody').innerHTML = html; show('msg'); }
const card = (t, s, extra) => `<div class="card" style="margin-top:20px"><b>${t}</b><span class="mut" style="font-size:14px">${s}</span>${extra || `<a class="btn pri" href="${pmUrl()}">ไปหน้า Wellcon PM</a>`}</div>`;

// ---------- กล่องถาม / ยืนยัน (แทน prompt / confirm ของเบราว์เซอร์) ----------
function dlg(o) {   // o: { title, text, input:{ value, placeholder, area }, ok, cancel, bad, html } → Promise<string|true|null>
  return new Promise((res) => {
    const b = $('dlgBox');
    b.innerHTML = `<b>${esc(o.title || '')}</b>${o.text ? `<div class="mut" style="font-size:14px;white-space:pre-line">${esc(o.text)}</div>` : ''}${o.html || ''}`
      + (o.input ? (o.input.area ? `<textarea id="dlgIn" style="border:1.5px solid var(--line);border-radius:11px;padding:9px 11px;min-height:96px;width:100%" placeholder="${esc(o.input.placeholder || '')}">${esc(o.input.value || '')}</textarea>`
        : `<input id="dlgIn" style="border:1.5px solid var(--line);border-radius:11px;padding:9px 11px;min-height:44px;width:100%" placeholder="${esc(o.input.placeholder || '')}" value="${esc(o.input.value || '')}">`) : '')
      + `<div class="ac">${o.cancel === false ? '' : `<button class="btn sm" data-d="no">${esc(o.cancel || 'ยกเลิก')}</button>`}${o.ok === false ? '' : `<button class="btn sm ${o.bad ? 'bad' : 'pri'}" data-d="ok">${esc(o.ok || 'ตกลง')}</button>`}</div>`;
    $('dlg').hidden = false;
    const inp = $('dlgIn'); if (inp) setTimeout(() => inp.focus(), 30);
    const done = (v) => { $('dlg').hidden = true; b.onclick = null; b.onkeydown = null; b._pick = null; res(v); };
    b._pick = done;
    b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (!d) return; done(d.dataset.d === 'ok' ? (inp ? inp.value.trim() : true) : null); };
    b.onkeydown = (e) => { if (e.key === 'Escape') done(null); if (e.key === 'Enter' && inp && inp.tagName === 'INPUT') done(inp.value.trim()); };
  });
}
const ask = (title, text, ok, bad) => dlg({ title, text, ok, bad });

// =====================================================================
// ข้อมูล (app_state: 1 คีย์ = 1 แถว · data.v) — อ่าน-รวม-เขียนรายใบ กันบันทึกทับกัน
// =====================================================================
async function stGet(id) { const r = await sb.from('app_state').select('data').eq('id', id).maybeSingle(); if (r.error) throw r.error; return (r.data && r.data.data && r.data.data.v) || null; }
async function loadAll() { const v = await stGet(KEY); APP.all = (v && typeof v === 'object') ? v : {}; }
const allQ = (v) => Object.keys(v || {}).reduce((a, k) => a.concat(Array.isArray(v[k]) ? v[k] : []), []);
const findQ = (id) => allQ(APP.all).find(x => x && x.id === id) || null;
function nextNo(v) { const d = new Date(), pre = 'QT-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + '-'; let mx = 0;
  allQ(v).forEach(x => { const m = new RegExp('^' + pre + '(\\d+)').exec((x && x.no) || ''); if (m) mx = Math.max(mx, Number(m[1])); }); return pre + pad(mx + 1, 3); }
// เขียนใบเดียว: อ่านล่าสุด → ตรวจ (check ได้ใบล่าสุดบนเซิร์ฟเวอร์ · โยน Error = ไม่เขียน) → รวม → เขียน
async function writeQ(q, check) {
  const v = { ...((await stGet(KEY)) || {}) };
  const prev = allQ(v).find(x => x && x.id === q.id) || null;
  if (check) check(prev);
  if (!q.no) q.no = q.revOf ? revNo(v, q) : nextNo(v);
  Object.keys(v).forEach(k => { if (Array.isArray(v[k]) && v[k].some(x => x && x.id === q.id)) v[k] = v[k].filter(x => x && x.id !== q.id); });
  const sc = q.pid || NEW; v[sc] = [clone(q), ...(Array.isArray(v[sc]) ? v[sc] : [])];
  const up = await sb.from('app_state').upsert([{ id: KEY, data: { v }, updated_by: APP.me.email }], { onConflict: 'id' });
  if (up.error) throw up.error;
  APP.all = v; return q;
}
function revNo(v, q) { const base = String(q.revBase || '').replace(/-R\d+$/, ''); let mx = 0;
  allQ(v).forEach(x => { const m = new RegExp('^' + base.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '-R(\\d+)$').exec((x && x.no) || ''); if (m) mx = Math.max(mx, Number(m[1])); }); return base + '-R' + (mx + 1); }
// เปลี่ยนสถานะ: ต้องยังอยู่ในสถานะที่คาดไว้ (กันสองคนกดพร้อมกัน)
async function transition(id, expect, mut) {
  const cur = findQ(id); if (!cur) throw new Error('ไม่พบใบเสนอราคานี้');
  let out = null;
  await writeQ(cur, (prev) => { if (!prev) throw new Error('ไม่พบใบเสนอราคานี้ในระบบ'); if (!expect.includes(prev.status)) throw new Error('ใบนี้มีคนดำเนินการไปก่อนแล้ว (สถานะล่าสุด: ' + (STS[prev.status] || [prev.status])[0] + ') — โหลดล่าสุดแล้ว');
    Object.keys(cur).forEach(k => delete cur[k]); Object.assign(cur, clone(prev)); mut(cur); out = cur; });
  return out;
}
const logIt = (q, act, note) => { q.log = [...(q.log || []), { at: Date.now(), by: APP.me.name, email: APP.me.email, act, note: note || '' }].slice(-60); };

// =====================================================================
// สิทธิ์
// =====================================================================
const isMine = (q) => norm(q.byEmail) === APP.me.email;
const isBoss = () => ['superadmin', 'director'].includes(APP.me.role);
const canEdit = (q) => ['draft', 'returned'].includes(q.status || 'draft') && (isMine(q) || isBoss() || APP.me.role === 'qs_mgr');
const canApprove = (q) => q.status === 'sent' && APPROVER_R.includes(APP.me.role) && !isMine(q);
const actv = () => APP.accounts.filter(a => a && a.email && a.active !== false && !a.disabled);
function approversFor(q) { const req = norm(q.byEmail), em = (L) => L.map(a => norm(a.email)).filter(e => e && e !== req);
  const m = em(actv().filter(a => a.roleKey === 'qs_mgr')); return m.length ? m : em(actv().filter(a => a.roleKey === 'director')); }
const nameOf = (e) => { const a = APP.accounts.find(x => norm(x.email) === norm(e)); return a ? nickOf(a) : e; };
const qUrl = (q) => location.origin + '/quotation.html?' + (q.pid ? 'pid=' + encodeURIComponent(q.pid) + '&' : '') + 'q=' + encodeURIComponent(q.id) + (IS_STG ? '&env=staging' : '');
async function notify(q, o) {   // o: { title, note, to:[], approve:[], close }
  if (!window.WCTag) return;
  try { if (o.close) await WCTag.close({ app: TAG_APP, ref_type: 'quo', ref_id: q.id, ...(o.close === 'approve' ? { kind: 'approve' } : {}) });
    const ap = [...new Set(o.approve || [])], to = [...new Set(o.to || [])].filter(e => e && !ap.includes(e));
    if (to.length || ap.length) await WCTag.send({ app: TAG_APP, project: q.pid || null, ref_type: 'quo', ref_id: q.id, title: o.title, note: o.note || '', url: qUrl(q), to, approve: ap });
  } catch (e) { console.warn(e); }
}

// =====================================================================
// คำนวณยอด — ใช้ชุดเดียวกันทั้งหน้าจอและเอกสารพิมพ์
//   ค่าเริ่มต้น: OH&P รวมอยู่ในราคา / หน่วย (เอกสารลูกค้าไม่แสดงกำไร) · q.ohpShow = แสดง OH&P เป็นบรรทัดแยก
// =====================================================================
function calc(q) {
  const ohp = num(q.ohpPct), pre = num(q.prelimPct), fold = !q.ohpShow, k = fold ? 1 + ohp / 100 : 1;
  const rows = (q.items || []).map(it => { const qty = num(it.qty), base = num(it.rate), price = r2(base * k); return { it, qty, base, price, amt: r2(qty * price), baseAmt: r2(qty * base) }; });
  const direct = r2(rows.reduce((s, r) => s + r.amt, 0)), directBase = r2(rows.reduce((s, r) => s + r.baseAmt, 0));
  const prelim = r2(direct * pre / 100), sub = r2(direct + prelim);
  const ohpAmt = fold ? 0 : r2(sub * ohp / 100);
  const disc = Math.max(0, Math.min(num(q.discount), sub + ohpAmt));
  const net = r2(sub + ohpAmt - disc), vat = r2(net * VAT / 100), grand = r2(net + vat);
  const ohpIn = fold ? r2(sub - (directBase + r2(directBase * pre / 100))) : ohpAmt;   // OH&P ที่อยู่ในยอด (ภายใน)
  return { rows, direct, directBase, prelim, sub, ohpAmt, ohpIn, disc, net, vat, grand, ohp, pre, fold };
}
function warnsOf(q) { const W = [], c = calc(q);
  if (!has(q.prelimPct)) W.push(['bad', 'ยังไม่ได้ใส่ Preliminary % (มาตรฐานบริษัท ' + PRELIM_RANGE[0] + '–' + PRELIM_RANGE[1] + '%)']);
  else if (c.pre < PRELIM_RANGE[0] || c.pre > PRELIM_RANGE[1]) W.push(['', 'Preliminary ' + fq(c.pre) + '% อยู่นอกช่วงมาตรฐานบริษัท ' + PRELIM_RANGE[0] + '–' + PRELIM_RANGE[1] + '% — ผู้อนุมัติจะเห็นข้อความนี้']);
  if (!has(q.ohpPct)) W.push(['bad', 'ยังไม่ได้ใส่ OH&P % (มาตรฐานบริษัท ' + OHP_RANGE[0] + '–' + OHP_RANGE[1] + '%)']);
  else if (c.ohp < OHP_RANGE[0] || c.ohp > OHP_RANGE[1]) W.push(['', 'OH&P ' + fq(c.ohp) + '% อยู่นอกช่วงมาตรฐานบริษัท ' + OHP_RANGE[0] + '–' + OHP_RANGE[1] + '% — ผู้อนุมัติจะเห็นข้อความนี้']);
  if (c.disc > 0) W.push(['', 'มีส่วนลด ' + baht(c.disc) + ' — ผู้อนุมัติต้องเห็นชอบส่วนลดนี้']);
  const man = (q.items || []).filter(i => !i.rk).length; if (man) W.push(['', man + ' รายการใช้ราคาที่ QS กรอกเอง (ไม่ได้มาจากอัตรากลาง) — ตรวจกับฝ่ายประมาณราคา']);
  const ai = (q.items || []).filter(i => i.ai && !i.chk).length; if (ai) W.push(['bad', ai + ' รายการมาจาก AI และยังไม่ได้ติ๊ก "ตรวจแล้ว"']);
  return W; }
const warnHtml = (W) => W.map(w => `<div class="warn ${w[0]}">⚠ ${esc(w[1])}</div>`).join('');

// =====================================================================
// เริ่มต้น
// =====================================================================
async function boot() {
  $('verTxt').textContent = 'Quotation Maker ' + QM_VER;
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง'; s.prepend(d); });
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg(card('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “Quotation Maker” จากหน้าโครงการ')); return; }
    const [a, p, st] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('projects').select('id,project,data'),
      sb.from('app_state').select('id,data').in('id', ['featGlobal', 'featProj', 'workPages', 'workUser', 'claimRates'])]);
    if (a.error) throw a.error; if (p.error) throw p.error;
    APP.accounts = (a.data || []).map(rowOf);
    const live = (p.data || []).map(rowOf).filter(x => !x.deleted && !x.del);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && APP.accounts.find(x => norm(x.email) === norm(sess.email) && x.active !== false && !x.disabled);
    if (!acc) { msg(card('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “Quotation Maker” จากหน้าโครงการ')); return; }
    APP.acc = acc;
    APP.me = { name: nickOf(acc), full: acc.name || nickOf(acc), email: norm(acc.email), role: acc.roleKey || '', title: String(acc.title || '').trim() || ROLE_TH[acc.roleKey] || '' };
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'quo' }).then(() => {}, () => {}); } catch (e) {}
    if (window.WCTag) WCTag.setup({ sb, app: TAG_APP, me: APP.me, accounts: actv(), projects: live });
    const sv = (id) => { const r = ((!st.error && st.data) || []).find(x => x.id === id); return (r && r.data && r.data.v) || {}; };
    const FG = sv('featGlobal'), WP = sv('workPages'), WU = sv('workUser'); APP.FP = sv('featProj');
    const back = `<a class="btn pri" href="${pmUrl()}">กลับ Wellcon PM</a>`;
    if (FG[TAB] === false) { msg(card('ผู้ดูแลระบบปิด “Quotation Maker” ไว้', 'ถ้าต้องการใช้งาน แจ้ง Admin เปิดที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน', back)); return; }
    // สิทธิ์เข้าหน้า = การ์ดที่เปิดให้ (ตำแหน่ง ∪ รายคน) แบบเดียวกับแอปหลัก · ชุดเริ่มต้น: QS · QS Manager · Director · Super Admin เข้าได้เสมอ
    const roleCards = Array.isArray(WP[APP.me.role]) ? WP[APP.me.role] : (DEF_ROLES.includes(APP.me.role) ? [TAB] : []);
    const mine = Array.isArray(WU[APP.me.email]) ? WU[APP.me.email] : [];
    if (APP.me.role !== 'superadmin' && ![...roleCards, ...mine].includes(TAB)) { msg(card('หน้านี้ยังไม่ได้เปิดให้ตำแหน่งของคุณ', 'Quotation Maker มีตัวเลขราคา — เปิดให้ QS · QS Manager · ผู้บริหาร เป็นค่าเริ่มต้น · ถ้าต้องการใช้ แจ้ง Admin เพิ่มการ์ด “Quotation Maker” ให้', back)); return; }
    APP.aiOff = (FG.ai === false && APP.me.role !== 'superadmin') || acc.aiOff === true;
    const projOff = (id) => { const o = APP.FP[id]; return !!o && typeof o === 'object' && o[TAB] === false; };
    APP.projects = live.filter(x => seesAll(acc) || (acc.projects || []).includes(x.id)).filter(x => !projOff(x.id));
    // อัตรากลาง (ราคาเรียกเก็บลูกค้า ไม่รวม VAT) — ค่าแรงช่าง + รายการทุกหมวด
    const RC = sv('claimRates'); APP.ohp = has(RC.ohp) ? num(RC.ohp) : null; APP.rates = [];
    (Array.isArray(RC.trades) ? RC.trades : []).forEach(x => { if (x && String(x.n || '').trim()) APP.rates.push({ k: 't:' + String(x.n).trim(), g: 'labor', n: 'ค่าแรง ' + String(x.n).trim(), u: 'คน-วัน', rate: num(x.rate) }); });
    (Array.isArray(RC.items) ? RC.items : []).forEach(x => { if (x && String(x.n || '').trim()) APP.rates.push({ k: 'i:' + (x.id || x.n), g: x.g || 'site', n: String(x.n).trim(), u: x.u || 'เหมา', rate: num(x.rate) }); });
    await loadAll();
    const P = new URLSearchParams(location.search), pid = P.get('pid'), qid = P.get('q');
    if (pid && projOff(pid)) { msg(card('ผู้ดูแลระบบปิด “Quotation Maker” ของโครงการนี้ไว้', 'ถ้าต้องการใช้งาน แจ้ง Admin เปิดที่ ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน → รายโครงการ', back)); return; }
    if (pid && APP.projects.some(x => x.id === pid)) { APP.scope = pid; try { localStorage.setItem('wellcon_pm_workpid', pid); } catch (e) {} }
    renderList();
    const tk = P.get('tk');
    if (tk && !qid) { try { await tkLoad(); const r = TK.folders.find(f => f.id === tk && !f.parent_id); if (r) { const inPm = APP.projects.some(x => x.id === r.pm_project_id); if (inPm) APP.scope = r.pm_project_id; const n = blank(); n.tk = r.id; if (!inPm) { n.pid = ''; n.title = r.name || ''; n.site = r.name || ''; n.cust = ''; } openEdit(n); } } catch (e) { console.warn(e); } }
    if (qid) { const q = findQ(qid); if (q && canSee(q)) openQ(q.id); else toast('ไม่พบใบเสนอราคาตามลิงก์ หรือคุณไม่มีสิทธิ์เปิด'); }
  } catch (e) {
    console.error(e);
    msg(card('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', esc((e && e.message) || e), '<button class="btn pri" onclick="location.reload()">ลองใหม่</button>'));
  }
}
const canSee = (q) => !q.pid || APP.projects.some(p => p.id === q.pid);
const scopeName = (q) => q.pid ? ([projName(APP.projects.find(p => p.id === q.pid)), projCode(APP.projects.find(p => p.id === q.pid))].filter(Boolean).join(' · ') || 'โครงการ') : 'งานใหม่นอกโครงการ';

// =====================================================================
// รายการใบเสนอราคา
// =====================================================================
const FILT = [['all', 'ทั้งหมด'], ['draft', 'ร่าง'], ['sent', 'รออนุมัติ'], ['returned', 'ส่งกลับแก้ไข'], ['approved', 'อนุมัติแล้ว'], ['issued', 'ส่งลูกค้าแล้ว'], ['cancelled', 'ยกเลิก']];
const stTag = (s) => { const x = STS[s] || STS.draft; return `<span class="st" style="background:${x[1]};color:${x[2]}">${x[0]}</span>`; };
function visible() { return allQ(APP.all).filter(q => q && !q.deleted && canSee(q)).sort((a, b) => (b.upAt || b.at || 0) - (a.upAt || a.at || 0)); }
function renderList() {
  const sel = $('fScope');
  sel.innerHTML = `<option value="all">ทุกงานที่ฉันเห็น</option><option value="${NEW}">งานใหม่นอกโครงการ</option>` + APP.projects.map(p => `<option value="${esc(p.id)}">${esc([projName(p), projCode(p)].filter(Boolean).join(' · '))}</option>`).join('');
  sel.value = APP.scope; if (sel.value !== APP.scope) { APP.scope = 'all'; sel.value = 'all'; }
  const base = visible().filter(q => APP.scope === 'all' || (q.pid || NEW) === APP.scope);
  const cnt = (k) => base.filter(q => k === 'all' ? q.status !== 'cancelled' : q.status === k).length;
  $('fChips').innerHTML = FILT.map(([k, t]) => `<button class="chip${APP.filter === k ? ' on' : ''}" data-f="${k}">${t} <small>${cnt(k)}</small></button>`).join('');
  const f = norm(APP.find);
  const L = base.filter(q => (APP.filter === 'all' ? q.status !== 'cancelled' : q.status === APP.filter) && (!f || norm([q.no, q.title, q.area, q.cust, scopeName(q)].join(' ')).includes(f)));
  const wait = visible().filter(canApprove);
  $('listInbox').innerHTML = wait.length ? `<div class="card" style="border-color:var(--gold)"><div class="h">✍️ รอคุณอนุมัติ <small>${wait.length} ใบ</small></div>${wait.map(rowHtml).join('')}</div>` : '';
  $('listBody').innerHTML = L.length ? L.map(rowHtml).join('') : `<p class="empty">ยังไม่มีใบเสนอราคา${APP.filter === 'all' ? '' : 'ในสถานะนี้'} — กด “＋ สร้างใบเสนอราคา” เพื่อเริ่ม</p>`;
  renderHero();
  $('listSub').textContent = APP.scope === 'all' ? 'ใบเสนอราคาด่วน · ทุกงาน' : APP.scope === NEW ? 'งานใหม่นอกโครงการ' : [projName(APP.projects.find(p => p.id === APP.scope))].join('');
  show('list');
}
// ---------- หน้าเริ่มงาน: ตัวเลขสรุป (นับขึ้น) + การ์ดประเภทงาน ----------
const KIC = { area: ['#B8582A', 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-7h6v7'], furn: ['#0D5C63', 'M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 11h18v6H3zM5 17v3M19 17v3'],
  damage: ['#A16207', 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z'], dco: ['#5B2E91', 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'] };
const KHINT = { area: 'ห้อง / โซนเดียว — พื้น ฝ้า ผนัง ครบในใบเดียว', furn: 'Built-in / Loose ตามรูปด้านและรูปตัด', damage: 'ซ่อม / เปลี่ยนของเสียหาย แนบรูปถ่ายหน้างาน', dco: 'Design Change — เทียบแบบเดิมกับแบบใหม่' };
function countUp(el, to) { const t0 = performance.now(), d = 700; if (!to || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) { el.textContent = to; return; }
  const tick = (t) => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
function renderHero() { const V = visible(), n = (f) => V.filter(f).length;
  const S = [['draft', 'ร่างของฉัน', n(q => ['draft', 'returned'].includes(q.status || 'draft') && isMine(q))], ['sent', 'รออนุมัติ', n(q => q.status === 'sent')], ['approved', 'อนุมัติแล้ว', n(q => q.status === 'approved' || q.status === 'issued')]];
  const key = S.map(x => x[2]).join(',');
  if (APP.heroKey !== key) { APP.heroKey = key; $('heroStats').innerHTML = S.map(x => `<button class="hstat" data-stat="${x[0]}" title="กดเพื่อดูรายการ"><b data-n="${x[2]}">0</b><span>${x[1]}</span></button>`).join(''); $('heroStats').querySelectorAll('b').forEach(b => countUp(b, Number(b.dataset.n))); }
  if (!$('heroKinds').childElementCount) $('heroKinds').innerHTML = KINDS.map(k => `<button class="kc" data-newkind="${k[0]}" style="--kc:${KIC[k[0]][0]}"><span class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${KIC[k[0]][1]}"/></svg></span><b>${k[2]}</b><small>${KHINT[k[0]]}</small><span class="ar">เริ่มเลย <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>`).join(''); }
function rowHtml(q) { const k = kindOf(q.kind), c = calc(q);
  return `<button class="qrow" data-open="${esc(q.id)}"><span class="k">${k[1]}</span><span class="m"><b>${esc(q.title || '(ยังไม่มีชื่องาน)')}</b><span>${esc([q.no || 'ยังไม่มีเลขที่', scopeName(q), q.cust, 'โดย ' + (q.by || '')].filter(Boolean).join(' · '))}</span></span>
    <span class="v">${stTag(q.status || 'draft')}<b>${baht(c.net)}</b><small class="mut" style="font-size:11px">ไม่รวม VAT</small></span></button>`; }
function openQ(id) { const q = findQ(id); if (!q) { toast('ไม่พบใบเสนอราคานี้'); return; } if (canEdit(q)) openEdit(clone(q)); else openView(q); }

// =====================================================================
// แก้ไข
// =====================================================================
function blank() { const pid = APP.scope !== 'all' && APP.scope !== NEW ? APP.scope : ''; const p = APP.projects.find(x => x.id === pid);
  return { id: uid('q'), no: '', pid, kind: 'area', title: '', area: '', desc: '', cust: p ? (p.client || '') : '', attn: '', site: p ? projName(p) : '', atts: [], items: [], prelimPct: '', ohpPct: APP.ohp == null ? '' : APP.ohp, discount: '', ohpShow: false,
    valid: 30, lead: '', pay: '', assume: '', excl: '', memo: '', form: 'wellcon', lang: 'th', ai: null, status: 'draft', by: APP.me.name, byFull: APP.me.full, byEmail: APP.me.email, byTitle: APP.me.title, at: Date.now(), log: [] }; }
const C = () => APP.cur;
function touch() { APP.dirty = true; $('edSaved').textContent = 'ยังไม่ได้บันทึก'; }
function openEdit(q) {
  APP.cur = q; APP.dirty = false; APP.aiAns = '';
  $('edTitle').textContent = q.no ? 'แก้ไข ' + q.no : 'ใบเสนอราคาใหม่'; $('edSaved').textContent = q.no ? 'บันทึกล่าสุด ' + dmyhm(q.upAt || q.at) : '';
  $('edNote').innerHTML = q.status === 'returned' ? `<div class="warn bad"><b>ผู้อนุมัติส่งกลับแก้ไข:</b> ${esc(q.retNote || '')} — ${esc(q.retBy || '')} ${dmyhm(q.retAt)}</div>` : '';
  $('edKind').innerHTML = KINDS.map(k => `<button class="chip${q.kind === k[0] ? ' on' : ''}" data-kind="${k[0]}">${k[1]} ${k[2]} <small>${k[3]}</small></button>`).join('');
  $('edScope').innerHTML = `<option value="">งานใหม่นอกโครงการ</option>` + APP.projects.map(p => `<option value="${esc(p.id)}">ในโครงการ: ${esc([projName(p), projCode(p)].filter(Boolean).join(' · '))}</option>`).join('');
  $('edScope').value = q.pid || '';
  const set = (id, v) => { $(id).value = v == null ? '' : v; };
  set('edTitleIn', q.title); set('edArea', q.area); set('edCust', q.cust); set('edAttn', q.attn); set('edSite', q.site); set('edDesc', q.desc);
  set('edValid', q.valid); set('edLead', q.lead); set('edForm', q.form || 'wellcon'); set('edLang', q.lang || 'th'); set('edPay', q.pay); set('edAssume', q.assume); set('edExcl', q.excl); set('edMemo', q.memo); set('edAiHint', q.aiHint);
  $('edDel').hidden = !q.no; $('edSub').textContent = scopeName(q);
  $('edAiRun').disabled = APP.aiOff; $('edAiAsk').disabled = APP.aiOff;
  renderAtts(); renderItems(); renderSum(); renderAi();
  show('edit'); $('scrEdit').querySelector('.body').scrollTop = 0;
}
const BIND = { edTitleIn: 'title', edArea: 'area', edCust: 'cust', edAttn: 'attn', edSite: 'site', edDesc: 'desc', edValid: 'valid', edLead: 'lead', edForm: 'form', edLang: 'lang', edPay: 'pay', edAssume: 'assume', edExcl: 'excl', edMemo: 'memo', edAiHint: 'aiHint' };

// ---------- แบบแนบ ----------
function guessKind(name, isImg) { const n = norm(name);
  if (/spec|สเปก|material|วัสดุ|schedule/.test(n)) return 'spec'; if (/persp|3d|render|view|ทัศนียภาพ/.test(n)) return 'persp';
  if (/sec|detail|ดีเทล|รูปตัด|\bdt[-_ ]?\d/.test(n)) return 'sect'; if (/elev|รูปด้าน|\bel[-_ ]?\d/.test(n)) return 'elev';
  if (/plan|ผัง|layout|แปลน/.test(n)) return 'plan'; return isImg && /^(img|dsc|pxl|photo|line_|\d{8})/.test(n) ? 'photo' : 'plan'; }
const markHtml = (a, lab) => (a.marks || []).map(m => `<div class="mk" style="left:${m.x * 100}%;top:${m.y * 100}%;width:${m.w * 100}%;height:${m.h * 100}%">${lab && m.t ? `<span>${esc(m.t)}</span>` : ''}</div>`).join('');
function renderAtts() { const q = C();
  $('edAtts').innerHTML = (q.atts || []).map((a, i) => `<div class="att" data-att="${esc(a.id)}"><div class="th" data-zoom="${esc(a.id)}" title="กดเพื่อซูม / ตีกรอบพื้นที่"><img src="${esc(a.url)}" alt="" loading="lazy">${markHtml(a)}<span class="zb">🔍 ${(a.marks || []).length ? 'ตีกรอบ ' + a.marks.length + ' จุด' : 'ซูม / ตีกรอบ'}</span></div>
    <div class="bd"><select data-ak="${esc(a.id)}" aria-label="ชนิดแบบ">${AKINDS.map(k => `<option value="${k[0]}"${a.kind === k[0] ? ' selected' : ''}>${k[1]}</option>`).join('')}</select><div class="nm" title="${esc(a.name)}">แบบที่ ${i + 1}${a.src ? ' · Take-off' : ''} · ${esc(a.name)}</div>
    <div class="r"><label><input type="checkbox" data-aai="${esc(a.id)}"${a.inAi !== false ? ' checked' : ''}> ให้ AI อ่าน</label><label><input type="checkbox" data-apr="${esc(a.id)}"${a.inPrint !== false ? ' checked' : ''}> แนบท้ายเอกสาร</label><button class="x" data-adel="${esc(a.id)}" title="เอาแบบนี้ออก" aria-label="เอาแบบนี้ออก">✕</button></div></div></div>`).join('');
}
function bmpOf(blob) { return window.createImageBitmap ? createImageBitmap(blob) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); }); }
function toJpeg(src, sx, sy, sw, sh, edge, q) { const k = Math.min(1, edge / Math.max(sw, sh)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res({ blob: b, w: c.width, h: c.height }), 'image/jpeg', q || 0.86)); }
async function pdfLib() { if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = res; s.onerror = () => rej(new Error('โหลดตัวอ่าน PDF ไม่สำเร็จ')); document.head.appendChild(s); });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; return window.pdfjsLib; }
const pgRange = (t, n) => { const o = {}; String(t || '').split(/[,\s]+/).forEach(x => { const m = x.match(/^(\d+)(?:-(\d+))?$/); if (!m) return; const a = +m[1], b = +(m[2] || m[1]); for (let i = Math.min(a, b); i <= Math.max(a, b) && i <= n; i++) if (i >= 1) o[i] = 1; }); return Object.keys(o).map(Number).sort((a, b) => a - b); };
async function ingest(f, fname, o) { const q = C(); o = o || {};   // f = File / Blob · คืน false = หยุด (เต็มแล้ว)
  const left = MAX_ATT - (q.atts || []).length; if (left <= 0) { toast('แนบได้สูงสุด ' + MAX_ATT + ' แผ่นต่อใบ'); return false; }
  const isPdf = /pdf/i.test(f.type || o.mime || '') || /\.pdf$/i.test(fname), isImg = /^image\//.test(f.type || o.mime || '') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(fname);
  if (!isPdf && !isImg) { toast(fname + ' — รองรับเฉพาะรูปและ PDF'); return true; }
  if (f.size > 60 * 1024 * 1024) { toast(fname + ' ใหญ่เกิน 60MB'); return true; }
  const base = o.title || fname.replace(/\.[^.]+$/, ''), kind = o.kind || guessKind(base + ' ' + fname, isImg && !o.title), ex = o.src ? { src: o.src } : null;
  if (isPdf) {
    toast('กำลังเปิด ' + base + ' …', 6000);
    const doc = await (await pdfLib()).getDocument({ data: await f.arrayBuffer() }).promise; let pages = [1];
    if (doc.numPages > 1) { const t = await dlg({ title: 'เลือกหน้าของ ' + base, text: 'ไฟล์นี้มี ' + doc.numPages + ' หน้า — พิมพ์เลขหน้าที่ต้องใช้ เช่น 1,3-4 (เพิ่มได้อีก ' + left + ' แผ่น)', input: { value: '1' + (left > 1 ? '-' + Math.min(doc.numPages, left, 4) : '') }, ok: 'เพิ่มหน้าเหล่านี้' });
      if (t == null) return true; pages = pgRange(t, doc.numPages).slice(0, left); if (!pages.length) { toast('ไม่ได้เลือกหน้า'); return true; } }
    for (const n of pages) { toast('กำลังแปลงหน้า ' + n + ' …', 8000); const pg = await doc.getPage(n), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(4, KEEP_EDGE / Math.max(v0.width, v0.height)) });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise;
      await putAtt(await toJpeg(c, 0, 0, c.width, c.height, KEEP_EDGE, 0.88), base + (doc.numPages > 1 ? ' · หน้า ' + n : ''), kind, ex); }
  } else { const bmp = await bmpOf(f); await putAtt(await toJpeg(bmp, 0, 0, bmp.width, bmp.height, KEEP_EDGE, 0.86), base, kind, ex); }
  return true;
}
async function addFiles(files) { if (!C() || APP.busy) return; APP.busy = true;
  try { for (const f of files) { if ((await ingest(f, f.name)) === false) break; } } catch (e) { console.error(e); toast('แนบไฟล์ไม่สำเร็จ: ' + ((e && e.message) || e), 5000); }
  APP.busy = false; renderAtts();
}
// ---------- คลังแบบ QS Take-off (อ่านอย่างเดียว — ไม่เขียนตาราง takeoff_*) : โครงการ PM + งาน Tender ----------
const TK = { folders: null, files: {} }, TK_BUCKET = 'takeoff-drawings';
async function tkLoad() { if (TK.folders) return TK.folders; const r = await sb.from('takeoff_folders').select('id,pm_project_id,parent_id,name,job_type,sort').is('deleted_at', null).limit(3000); if (r.error) throw r.error; TK.folders = r.data || []; return TK.folders; }
const tkKids = (id) => { const out = [id]; for (let i = 0; i < out.length && out.length < 3000; i++) TK.folders.forEach(f => { if (f.parent_id === out[i]) out.push(f.id); }); return out; };
const tkPath = (id, root) => { const P = []; let f = TK.folders.find(x => x.id === id), n = 0; while (f && f.id !== root && n++ < 20) { P.unshift(f.name); f = TK.folders.find(x => x.id === f.parent_id); } return P.join(' / '); };
const tkIsPm = (r) => APP.projects.some(p => p.id === r.pm_project_id);
const tkLabel = (r) => (tkIsPm(r) ? 'โครงการ: ' : 'งาน Tender: ') + (r.name || projName(APP.projects.find(p => p.id === r.pm_project_id)) || r.pm_project_id || '');
async function tkFiles(root) { if (TK.files[root]) return TK.files[root]; const ids = tkKids(root), out = [];
  for (let i = 0; i < ids.length; i += 80) { const r = await sb.from('takeoff_files').select('id,folder_id,file_name,storage_path,mime_type,page_count,drawing_no,revision,superseded_by,sheet_title,sheet_type,room_label,sort').in('folder_id', ids.slice(i, i + 80)).limit(2000); if (r.error) throw r.error; out.push(...(r.data || [])); }
  TK.files[root] = out.filter(f => !f.superseded_by).sort((a, b) => String(a.drawing_no || a.file_name).localeCompare(String(b.drawing_no || b.file_name), 'th', { numeric: true })); return TK.files[root]; }
const tkTitle = (f) => [f.drawing_no, f.sheet_title || String(f.file_name || '').replace(/\.[^.]+$/, '')].filter(Boolean).join(' · ') + (f.revision ? ' · Rev.' + f.revision : '');
async function pickTakeoff() { const q = C(); if (!q || APP.busy) return;
  try { await tkLoad(); } catch (e) { console.error(e); toast('เปิดคลังแบบ QS Take-off ไม่สำเร็จ: ' + ((e && e.message) || e), 5000); return; }
  const roots = TK.folders.filter(f => !f.parent_id && (!tkIsPm(f) ? true : APP.projects.some(p => p.id === f.pm_project_id))).sort((a, b) => (tkIsPm(a) ? 0 : 1) - (tkIsPm(b) ? 0 : 1) || String(a.name).localeCompare(String(b.name), 'th'));
  if (!roots.length) { await dlg({ title: 'คลังแบบ QS Take-off ยังว่าง', text: 'เพิ่มโครงการ / งาน Tender และอัปโหลดแบบในแอป QS Take-off ก่อน — หรือแนบไฟล์จากเครื่องได้เลย', cancel: false, ok: 'รับทราบ' }); return; }
  let cur = (q.tk && roots.find(r => r.id === q.tk)) || (q.pid && roots.find(r => r.pm_project_id === q.pid)) || roots[0];
  const p = dlg({ title: 'เลือกแบบจากคลังแบบ QS Take-off', text: 'กดแบบที่ต้องการ — ระบบคัดลอกมาแนบในใบเสนอราคา (แบบต้นฉบับใน Take-off ไม่เปลี่ยน)', ok: false, cancel: 'ปิด',
    html: `<select id="tkR" style="border:1.5px solid var(--line);border-radius:11px;padding:8px 11px;min-height:44px;width:100%;background:#fff">${roots.map(r => `<option value="${esc(r.id)}"${r === cur ? ' selected' : ''}>${esc(tkLabel(r))}</option>`).join('')}</select><input id="tkQ" placeholder="ค้นหาเลขที่แบบ / ชื่อแผ่น / ห้อง" style="border:1.5px solid var(--line);border-radius:11px;padding:9px 11px;min-height:44px;width:100%"><div class="pl" id="tkL"><p class="empty">กำลังโหลด…</p></div>` });
  const box = $('dlgBox'); let F = [];
  const draw = () => { const t = norm($('tkQ').value); const L = F.filter(f => !t || norm([tkTitle(f), f.room_label, f.sheet_type, tkPath(f.folder_id, cur.id)].join(' ')).includes(t)).slice(0, 120);
    $('tkL').innerHTML = L.length ? L.map(f => `<button data-tk="${esc(f.id)}"><span><b>${esc(tkTitle(f))}</b><br><small>${esc([tkPath(f.folder_id, cur.id), f.room_label].filter(Boolean).join(' · ') || '—')}</small></span><small>${/pdf/i.test(f.mime_type || '') ? 'PDF ' + (f.page_count || 1) + ' หน้า' : 'รูป'}</small></button>`).join('') : '<p class="empty">ไม่พบแบบในงานนี้</p>'; };
  const load = async () => { $('tkL').innerHTML = '<p class="empty">กำลังโหลด…</p>'; try { F = await tkFiles(cur.id); } catch (e) { console.error(e); F = []; toast('โหลดรายการแบบไม่สำเร็จ'); } if ($('tkL')) draw(); };
  $('tkR').onchange = (e) => { cur = roots.find(r => r.id === e.target.value) || cur; load(); }; $('tkQ').oninput = draw;
  $('tkL').onclick = (e) => { const b = e.target.closest('[data-tk]'); if (b) box._pick({ f: F.find(x => x.id === b.dataset.tk), root: cur }); };
  load(); const r = await p; if (!r || !r.f) return;
  APP.busy = true;
  try { toast('กำลังดึงแบบจาก QS Take-off …', 8000); const d = await sb.storage.from(TK_BUCKET).download(r.f.storage_path); if (d.error) throw d.error;
    q.tk = r.root.id; await ingest(d.data, r.f.file_name || 'drawing.pdf', { title: tkTitle(r.f), mime: r.f.mime_type || '', kind: guessKind([r.f.sheet_type, r.f.sheet_title, r.f.file_name].join(' '), false), src: 'tko:' + r.f.id });
    toast('แนบแบบจาก QS Take-off แล้ว');
  } catch (e) { console.error(e); toast('ดึงแบบไม่สำเร็จ: ' + ((e && e.message) || e), 5000); }
  APP.busy = false; renderAtts();
}
// ปริมาณที่ QS ส่งต่อจาก Take-off (ช่องทาง takeoff_pm_feed — ไม่มีราคา) → เพิ่มเป็นรายการ
async function pickQty() { const q = C(); if (!q) return;
  if (!q.pid) { await dlg({ title: 'ใช้ได้กับงานในโครงการ', text: 'ปริมาณจาก QS Take-off ผูกกับโครงการใน Wellcon PM — งานนอกโครงการให้เลือกแบบจากคลังแบบ แล้วให้ AI อ่านหรือกรอกปริมาณเอง', cancel: false, ok: 'รับทราบ' }); return; }
  let Q = []; try { const r = await sb.rpc('takeoff_pm_feed', { p_pm_project_id: q.pid }); if (!r.error && r.data) Q = (r.data.quantities || []).filter(x => x && num(x.net) > 0); } catch (e) { console.warn(e); }
  if (!Q.length) { await dlg({ title: 'ยังไม่มีปริมาณจาก QS Take-off', text: 'โครงการนี้ยังไม่มีปริมาณที่ส่งต่อจากแอป QS Take-off (ปุ่ม “ส่งต่อ” ในงานของโครงการ) — เมื่อส่งต่อแล้วจะเลือกมาใส่ได้ที่นี่', cancel: false, ok: 'รับทราบ' }); return; }
  const nm = (x) => [x.catName || x.cat, x.desc].filter(Boolean).join(' · '); let n = 0;
  const p = dlg({ title: 'ดึงปริมาณจาก QS Take-off', text: 'ปริมาณสุทธิที่ QS วัดจากแบบ — กดรายการเพื่อเพิ่มลงตาราง (ราคาใส่จากอัตรากลางหรือกรอกเอง)', ok: false, cancel: 'เสร็จ',
    html: `<div class="pl" id="tqL">${Q.slice(0, 200).map((x, i) => `<button data-tq="${i}"><span><b>${esc(nm(x))}</b></span><small>${fq(x.net)} ${esc(x.unit || x.u || '')}</small></button>`).join('')}</div>` });
  $('tqL').onclick = (e) => { const b = e.target.closest('[data-tq]'); if (!b || b.dataset.done) return; const x = Q[Number(b.dataset.tq)];
    addRow({ desc: nm(x), unit: x.unit || x.u || '', qty: r2(num(x.net)), sec: secGuess(nm(x)), src: 'tko' }); b.dataset.done = 1; b.style.background = '#E6EFE0'; n++; };
  await p; if (n) { renderItems(); sumOut(); toast('เพิ่ม ' + n + ' รายการจาก QS Take-off แล้ว — ใส่ราคาให้ครบ'); }
}
async function putAtt(j, name, kind, ex) { const q = C(), id = uid('a'), path = 'quotation/' + q.id + '/' + id + '.jpg';
  const up = await sb.storage.from(BUCKET).upload(path, j.blob, { contentType: 'image/jpeg', upsert: false }); if (up.error) throw up.error;
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  APP.blobs[id] = j.blob; q.atts = [...(q.atts || []), { id, kind, name: String(name).slice(0, 120), path, url, w: j.w, h: j.h, marks: [], inAi: true, inPrint: true, ...(ex || {}) }]; touch(); renderAtts(); }
async function blobOf(a) { if (APP.blobs[a.id]) return APP.blobs[a.id]; const r = await sb.storage.from(BUCKET).download(a.path); if (r.error) throw r.error; APP.blobs[a.id] = r.data; return r.data; }

// ---------- ตัวเปิดแบบ: ซูม · เลื่อน · ตีกรอบพื้นที่ ----------
const VW = { a: null, edit: false, s: 1, x: 0, y: 0, mark: false, pts: new Map(), drag: null, pinch: null, onChange: null };
function vwApply() { $('vwLayer').style.transform = `translate(${VW.x}px,${VW.y}px) scale(${VW.s})`; $('vwZoom').textContent = Math.round(VW.s * 100) + '%';
  $('vwLayer').querySelectorAll('.mk').forEach(m => { m.style.borderWidth = (3 / VW.s) + 'px'; const sp = m.querySelector('span'); if (sp) { sp.style.fontSize = (14 / VW.s) + 'px'; sp.style.left = (-3 / VW.s) + 'px'; sp.style.top = (-3 / VW.s) + 'px'; sp.style.padding = (1 / VW.s) + 'px ' + (8 / VW.s) + 'px'; } }); }
function vwFit() { const st = $('vwStage').getBoundingClientRect(), a = VW.a; VW.s = Math.min(st.width / a.w, st.height / a.h) * 0.96; VW.x = (st.width - a.w * VW.s) / 2; VW.y = (st.height - a.h * VW.s) / 2; vwApply(); }
function vwZoom(f, cx, cy) { const st = $('vwStage').getBoundingClientRect(); if (cx == null) { cx = st.width / 2; cy = st.height / 2; }
  const min = Math.min(st.width / VW.a.w, st.height / VW.a.h) * 0.5, s2 = Math.max(min, Math.min(8, VW.s * f)); VW.x = cx - (cx - VW.x) * (s2 / VW.s); VW.y = cy - (cy - VW.y) * (s2 / VW.s); VW.s = s2; vwApply(); }
function vwMarks() { const a = VW.a; $('vwLayer').querySelectorAll('.mk').forEach(m => m.remove());
  (a.marks || []).forEach(m => { const d = document.createElement('div'); d.className = 'mk'; d.style.cssText = `left:${m.x * a.w}px;top:${m.y * a.h}px;width:${m.w * a.w}px;height:${m.h * a.h}px`; if (m.t) { const s = document.createElement('span'); s.textContent = m.t; d.appendChild(s); } $('vwLayer').appendChild(d); });
  $('vwMarks').innerHTML = (a.marks || []).map((m, i) => `<button data-mdel="${i}"${VW.edit ? '' : ' disabled'} title="${VW.edit ? 'กดเพื่อลบกรอบนี้' : ''}">▭ ${esc(m.t || 'พื้นที่ ' + (i + 1))}${VW.edit ? ' ✕' : ''}</button>`).join('');
  vwApply(); }
function openViewer(a, edit, onChange) { VW.a = a; VW.edit = !!edit; VW.onChange = onChange || null; VW.mark = false; VW.pts.clear();
  $('vwName').textContent = akOf(a.kind) + ' · ' + a.name; $('vwMark').hidden = !edit; $('vwMark').classList.remove('on'); $('vwStage').classList.remove('mark');
  $('vwHelp').textContent = 'หมุนล้อเมาส์ / ถ่างนิ้วเพื่อซูม · ลากเพื่อเลื่อน' + (edit ? ' · กด “ตีกรอบพื้นที่” แล้วลากครอบส่วนที่เสนอราคา' : '');
  const im = $('vwImg'); im.style.width = a.w + 'px'; im.style.height = a.h + 'px'; im.src = a.url; $('vwLayer').style.width = a.w + 'px'; $('vwLayer').style.height = a.h + 'px';
  $('vw').hidden = false; vwMarks(); vwFit(); }
function vwClose() { $('vw').hidden = true; $('vwImg').removeAttribute('src'); if (VW.onChange) VW.onChange(); }
(function vwBind() { const st = $('vwStage');
  const pos = (e) => { const r = st.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const img = (p) => [(p[0] - VW.x) / VW.s, (p[1] - VW.y) / VW.s];
  st.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); vwZoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, p[0], p[1]); }, { passive: false });
  st.addEventListener('pointerdown', (e) => { if (!VW.a) return; try { st.setPointerCapture(e.pointerId); } catch (x) {} const p = pos(e); VW.pts.set(e.pointerId, p);
    if (VW.pts.size === 2) { const [a, b] = [...VW.pts.values()]; VW.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; VW.drag = null; return; }
    if (VW.mark && VW.edit) { const d = document.createElement('div'); d.className = 'mk tmp'; $('vwLayer').appendChild(d); VW.drag = { kind: 'mark', a: img(p), el: d }; }
    else VW.drag = { kind: 'pan', p, x: VW.x, y: VW.y }; });
  st.addEventListener('pointermove', (e) => { if (!VW.pts.has(e.pointerId)) return; const p = pos(e); VW.pts.set(e.pointerId, p);
    if (VW.pinch && VW.pts.size === 2) { const [a, b] = [...VW.pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (VW.pinch.d > 0) vwZoom(d / VW.pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); VW.pinch.d = d; return; }
    const g = VW.drag; if (!g) return;
    if (g.kind === 'pan') { VW.x = g.x + p[0] - g.p[0]; VW.y = g.y + p[1] - g.p[1]; vwApply(); }
    else { const b = img(p), A = VW.a, x0 = Math.max(0, Math.min(g.a[0], b[0])), y0 = Math.max(0, Math.min(g.a[1], b[1])), x1 = Math.min(A.w, Math.max(g.a[0], b[0])), y1 = Math.min(A.h, Math.max(g.a[1], b[1]));
      g.r = [x0, y0, x1 - x0, y1 - y0]; g.el.style.cssText = `left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;border-width:${3 / VW.s}px`; } });
  const up = async (e) => { VW.pts.delete(e.pointerId); if (VW.pts.size < 2) VW.pinch = null; const g = VW.drag; VW.drag = null; if (!g || g.kind !== 'mark') return;
    g.el.remove(); const A = VW.a, r = g.r; if (!r || r[2] * VW.s < 14 || r[3] * VW.s < 14) return;
    const t = await dlg({ title: 'ชื่อพื้นที่ที่ตีกรอบ', text: 'ผู้อนุมัติจะเห็นกรอบนี้พร้อมชื่อ เช่น “ผนังด้าน A” · “ตู้ TV ยาว 3.20 ม.”', input: { value: C() ? (C().area || '') : '', placeholder: 'ชื่อพื้นที่ / ส่วนงาน' }, ok: 'บันทึกกรอบ' });
    if (t == null) return; A.marks = [...(A.marks || []), { x: r[0] / A.w, y: r[1] / A.h, w: r[2] / A.w, h: r[3] / A.h, t: String(t).slice(0, 60) }]; touch(); vwMarks();
    VW.mark = false; $('vwMark').classList.remove('on'); st.classList.remove('mark'); };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  $('vw').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'), d = e.target.closest('[data-mdel]');
    if (d && VW.edit) { VW.a.marks.splice(Number(d.dataset.mdel), 1); touch(); vwMarks(); return; }
    if (!b) return; const v = b.dataset.v;
    if (v === 'in') vwZoom(1.4); else if (v === 'out') vwZoom(1 / 1.4); else if (v === 'fit') vwFit(); else if (v === 'close') vwClose();
    else if (v === 'mark') { VW.mark = !VW.mark; b.classList.toggle('on', VW.mark); st.classList.toggle('mark', VW.mark); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('vw').hidden && $('dlg').hidden) vwClose(); });
})();

// ---------- รายการ ----------
function renderItems() { const q = C(), c = calc(q); let n = 0; const H = [];
  SECS.forEach(s => { const L = c.rows.filter(r => (r.it.sec || 'other') === s[0]); if (!L.length) return;
    H.push(`<tr class="sec"><td colspan="5">${esc(s[1])} <small>${L.length} รายการ</small></td><td class="amt" colspan="2" data-secamt="${s[0]}">${f2(L.reduce((a, r) => a + r.baseAmt, 0))}</td></tr>`);
    L.forEach(r => { const it = r.it; n++;
      H.push(`<tr data-row="${esc(it.id)}"><td class="no">${n}</td><td>
        <div style="display:flex;gap:6px;align-items:center;padding:0 2px"><select data-k="sec" style="width:auto;font-size:12px;color:var(--mut);padding:2px 4px" aria-label="หมวดงาน">${SECS.map(x => `<option value="${x[0]}"${(it.sec || 'other') === x[0] ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</select>
          ${it.ai ? `<label style="font-size:12px;display:flex;align-items:center;gap:4px;white-space:nowrap"><span class="aib ${it.chk ? 'ok' : it.ai.conf === 'low' ? 'low' : ''}">AI${it.ai.conf === 'low' ? ' · ไม่แน่ใจ' : ''}</span><input type="checkbox" data-k="chk"${it.chk ? ' checked' : ''} style="width:auto"> ตรวจแล้ว</label>` : ''}${it.rk ? '<span class="aib ok" title="ราคาจากอัตรากลาง">อัตรากลาง</span>' : ''}${it.src === 'tko' ? '<span class="aib" title="ปริมาณจาก QS Take-off">Take-off</span>' : ''}</div>
        <textarea data-k="desc" rows="1" placeholder="รายการ" maxlength="300">${esc(it.desc)}</textarea><input data-k="spec" placeholder="สเปก / วัสดุ / ขนาด (ตามแบบ)" maxlength="300" value="${esc(it.spec)}" style="font-size:12.5px;color:var(--ink2)">
        ${it.ai && it.ai.basis ? `<div class="basis">ที่มา (AI): ${esc(it.ai.basis)}</div>` : ''}</td>
        <td><input data-k="unit" list="unitL" value="${esc(it.unit)}" maxlength="20" aria-label="หน่วย"></td>
        <td><input data-k="qty" class="num" inputmode="decimal" value="${esc(it.qty)}" aria-label="จำนวน"></td>
        <td><input data-k="rate" class="num" inputmode="decimal" value="${esc(it.rate)}" aria-label="ราคาต่อหน่วย"></td>
        <td class="amt" data-amt>${f2(r.baseAmt)}</td><td><button class="x" data-rdel title="ลบรายการ" aria-label="ลบรายการ">✕</button></td></tr>`); }); });
  $('edItems').innerHTML = H.join('') || '<tr><td colspan="7" class="empty">ยังไม่มีรายการ — ให้ AI อ่านแบบ · เลือกจากอัตรากลาง · หรือกด “＋ เพิ่มรายการ”</td></tr>';
  if (!$('unitL')) { const d = document.createElement('datalist'); d.id = 'unitL'; d.innerHTML = UNITS.map(u => `<option value="${u}">`).join(''); document.body.appendChild(d); }
  $('edItems').querySelectorAll('textarea').forEach(grow); itemsFoot();
}
// อัปเดตยอดรวมหมวด + คำเตือน โดยไม่วาดตารางใหม่ (ไม่ให้ช่องที่กำลังพิมพ์หลุดโฟกัส)
function itemsFoot() { const q = C();
  $('edItems').querySelectorAll('[data-secamt]').forEach(td => { td.textContent = f2((q.items || []).filter(i => (i.sec || 'other') === td.dataset.secamt).reduce((a, i) => a + r2(num(i.qty) * num(i.rate)), 0)); });
  const bad = (q.items || []).filter(i => !(num(i.qty) > 0) || !(num(i.rate) > 0)).length;
  $('edItemWarn').innerHTML = bad ? `<div class="warn">มี ${bad} รายการที่ยังไม่มีจำนวนหรือราคา — ต้องใส่ให้ครบก่อนส่งขออนุมัติ</div>` : '';
}
function grow(t) { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight) + 'px'; }
function renderSum() { const q = C(), c = calc(q);
  $('edSum').innerHTML = `<div class="r"><span>ค่างานตามรายการ <small>(ราคา / หน่วย × จำนวน)</small></span><b id="sBase">${baht(c.directBase)}</b></div>
    <div class="r"><span>Preliminary <small>ค่าดำเนินการ · มาตรฐาน ${PRELIM_RANGE[0]}–${PRELIM_RANGE[1]}%</small></span><span><input id="sPre" inputmode="decimal" value="${esc(q.prelimPct)}" aria-label="Preliminary %"> %</span></div>
    <div class="r"><span>OH&amp;P <small>ค่าบริหารและกำไร · มาตรฐาน ${OHP_RANGE[0]}–${OHP_RANGE[1]}%${APP.ohp != null ? ' · อัตรากลาง ' + fq(APP.ohp) + '%' : ''}</small></span><span><input id="sOhp" inputmode="decimal" value="${esc(q.ohpPct)}" aria-label="OH&P %"> %</span></div>
    <div class="r"><span><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="sShow"${q.ohpShow ? ' checked' : ''}> แสดง OH&amp;P เป็นบรรทัดแยกในเอกสารลูกค้า <small>(ปกติรวมอยู่ในราคา / หน่วย)</small></label></span></div>
    <div class="r"><span>ส่วนลด <small>(บาท · ถ้ามี)</small></span><span><input id="sDisc" inputmode="decimal" value="${esc(q.discount)}" aria-label="ส่วนลด" style="width:128px"> ฿</span></div>
    <div id="sOut"></div>`;
  sumOut();
}
function sumOut() { const q = C(), c = calc(q); $('sBase').textContent = baht(c.directBase);
  $('sOut').innerHTML = `<div class="r"><span>Preliminary ${fq(c.pre)}%</span><span>${baht(c.prelim)}</span></div>
    <div class="r"><span>OH&amp;P ${fq(c.ohp)}% <small>(ภายใน — ${c.fold ? 'รวมอยู่ในราคา / หน่วยของเอกสารลูกค้า' : 'แสดงเป็นบรรทัดแยก'})</small></span><span>${baht(c.ohpIn)}</span></div>
    ${c.disc ? `<div class="r"><span>ส่วนลด</span><span>−${baht(c.disc)}</span></div>` : ''}
    <div class="r t"><span>รวมเป็นเงิน <small>ไม่รวม VAT</small></span><span>${baht(c.net)}</span></div>
    <div class="r"><span>VAT ${VAT}%</span><span>${baht(c.vat)}</span></div>
    <div class="r t"><span>รวมทั้งสิ้น <small>รวม VAT ${VAT}%</small></span><span>${baht(c.grand)}</span></div>`;
  $('edSumWarn').innerHTML = warnHtml(warnsOf(q));
}
function addRow(o) { const q = C(); const it = { id: uid('i'), sec: 'other', desc: '', spec: '', unit: '', qty: '', rate: '', rk: '', ai: null, chk: false, ...(o || {}) }; q.items = [...(q.items || []), it]; touch(); return it; }
async function pickRate() {
  if (!APP.rates.length) { await dlg({ title: 'ยังไม่มีอัตรากลาง', text: 'ผู้บริหาร / QS Manager ตั้งอัตราได้ที่ Wellcon PM → ตั้งค่าระบบ → อัตรากลาง\nระหว่างนี้กด “＋ เพิ่มรายการ” แล้วกรอกราคาเองได้', cancel: false, ok: 'รับทราบ' }); return; }
  const list = (f) => { const t = norm(f); const L = APP.rates.filter(r => !t || norm(r.n + ' ' + (RATE_G[r.g] || '')).includes(t)).slice(0, 80);
    return L.length ? L.map(r => `<button data-rk="${esc(r.k)}"><span><b>${esc(r.n)}</b><br><small>${esc(RATE_G[r.g] || '')}</small></span><small>${r.rate > 0 ? baht(r.rate) + ' / ' + esc(r.u) : 'ยังไม่ใส่อัตรา'}</small></button>`).join('') : '<p class="empty">ไม่พบรายการ</p>'; };
  const p = dlg({ title: 'เลือกจากอัตรากลาง', text: 'ราคาเรียกเก็บลูกค้า ไม่รวม VAT — กดรายการเพื่อเพิ่ม (เพิ่มได้หลายรายการ)', html: `<input id="rkQ" placeholder="ค้นหา เช่น ยิปซัม · ช่างไม้" style="border:1.5px solid var(--line);border-radius:11px;padding:9px 11px;min-height:44px;width:100%"><div class="pl" id="rkL">${list('')}</div>`, ok: false, cancel: 'เสร็จ' });
  const b = $('dlgBox'); let n = 0;
  $('rkQ').oninput = (e) => { $('rkL').innerHTML = list(e.target.value); };
  $('rkL').onclick = (e) => { const x = e.target.closest('[data-rk]'); if (!x) return; const r = APP.rates.find(y => y.k === x.dataset.rk); if (!r) return;
    addRow({ desc: r.n, unit: r.u, rate: r.rate > 0 ? r.rate : '', rk: r.k, sec: r.g === 'labor' ? 'other' : secGuess(r.n) }); n++; x.style.background = '#E6EFE0'; toast('เพิ่ม “' + r.n + '” แล้ว'); };
  await p; if (n) { renderItems(); sumOut(); } void b;
}
function secGuess(t) { const n = norm(t);
  if (/รื้อ|ซ่อม|demol|repair/.test(n)) return 'demo'; if (/ฝ้า|ceiling|ยิปซัม/.test(n)) return 'ceil'; if (/พื้น|floor|กระเบื้องพื้น|พรม|ลามิเนต|spc|ไวนิล/.test(n)) return 'floor';
  if (/ผนัง|wall|วอลเปเปอร์|ทาสี|บัว|กรุ/.test(n)) return 'wall'; if (/ตู้|built|บิวท์|บิ้ว|เคาน์เตอร์|ชั้นวาง|joinery|millwork/.test(n)) return 'bi'; if (/โซฟา|เก้าอี้|โต๊ะ|เตียง|loose|พรมลอย|โคมตั้ง/.test(n)) return 'loose';
  if (/ไฟ|ปลั๊ก|สวิตช์|แอร์|ท่อ|สุขภัณฑ์|ประปา|electrical|mep|โคม/.test(n)) return 'mep'; return 'other'; }

// =====================================================================
// ผู้ช่วย AI — อ่านแบบ (ผัง · รูปด้าน · รูปตัด · Perspective · สเปก) → รายการ + ปริมาณ + ที่มา · ไม่มีราคา
// =====================================================================
const AI_SYS = `คุณเป็นผู้ช่วย QS (ผู้ประมาณราคา) ของบริษัทรับเหมาตกแต่งภายในระดับ luxury ทำหน้าที่อ่านแบบ (ผัง รูปด้าน รูปตัด ดีเทล Perspective) และสเปก แล้วถอดรายการงานกับปริมาณสำหรับทำใบเสนอราคางานขนาดเล็ก
กติกาที่ต้องทำตามทุกข้อ:
1. ห้ามใส่ราคา ต้นทุน หรือมูลค่าเงินใด ๆ
2. ปริมาณต้องคำนวณจากระยะ / จำนวนที่อ่านได้จริงในแบบหรือสเปก หรือจากข้อความของผู้ใช้เท่านั้น ใช้หน่วย metric (ตร.ม. ม. ชุด ชิ้น จุด) และเขียนที่มาใน basis ให้ตรวจย้อนได้ (แบบที่เท่าไร ระยะอะไร คิดอย่างไร)
3. อ่านระยะไม่ชัด ไม่มีสเกล หรือไม่แน่ใจ ให้ใส่ qty เป็น null ใส่ conf เป็น "low" และเขียนคำถามใน questions — ห้ามเดาตัวเลข
4. สเปกวัสดุ ยี่ห้อ รุ่น สี ใส่เฉพาะที่ปรากฏในแบบหรือสเปก ถ้าไม่ปรากฏให้ spec เป็น "" และถามใน questions — ห้ามแต่งขึ้นเอง
5. ถ้าผู้ใช้ตีกรอบพื้นที่ไว้ ให้ถอดเฉพาะงานในกรอบนั้น
6. รวมงานชนิดเดียวกันเป็นรายการเดียว ไม่เกิน 30 รายการ
7. sec เลือกจาก: floor (พื้น) ceil (ฝ้า) wall (ผนัง) bi (เฟอร์นิเจอร์ Built-in) loose (เฟอร์นิเจอร์ลอยตัว) mep (งานระบบ) demo (รื้อถอน / ซ่อม) other
8. rk: ถ้ารายการตรงกับรายการใน "อัตรากลาง" ที่ให้มา ใส่รหัสของรายการนั้น ไม่ตรงให้ใส่ ""
9. conf: "high" = อ่านระยะได้ชัดจากแบบ · "mid" = อนุมานจากสเกลหรือแบบประกอบ · "low" = ไม่แน่ใจ
ตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น ไม่มี markdown ตามรูปแบบนี้:
{"summary":"สรุปขอบเขตงานที่เห็นจากแบบ 2-4 ประโยค","items":[{"sec":"wall","desc":"ชื่อรายการ","spec":"สเปกตามแบบ","unit":"ตร.ม.","qty":12.5,"basis":"แบบที่ 2 รูปด้าน A: 4.20 x 2.70 ม. หักประตู 0.90 x 2.10","conf":"high","rk":""}],"assume":["ข้อสมมติฐานที่ใช้"],"excl":["งานที่ไม่รวม"],"questions":["คำถามที่ต้องถามผู้ออกแบบ / ลูกค้าก่อนยืนยันราคา"]}`;
async function aiCall(system, content, maxTok) {
  const res = await fetch(CFG.url + '/functions/v1/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: maxTok || 4000, system, messages: [{ role: 'user', content }], staffId: APP.acc.id || null, staffName: APP.me.name, projectId: (C() && C().pid) || null }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const map = { unauthorized: 'ต้องเข้าสู่ระบบก่อนใช้ผู้ช่วย AI', ai_disabled_for_user: 'บัญชีนี้ยังไม่ได้เปิดสิทธิ์ใช้ผู้ช่วย AI', daily_limit_reached: 'ใช้ครบโควตา AI ของวันนี้แล้ว', too_many_requests: 'ถามถี่เกินไป รอสักครู่แล้วลองใหม่', server_not_configured: 'ยังไม่ได้เปิดใช้งานผู้ช่วย AI บนเซิร์ฟเวอร์', upstream_error: 'ผู้ช่วย AI อ่านไฟล์ชุดนี้ไม่ได้ — ลองลดจำนวนแบบ หรือลองใหม่อีกครั้ง' };
    throw new Error(res.status === 404 ? 'ยังไม่ได้เปิดใช้งานผู้ช่วย AI บนเซิร์ฟเวอร์' : (map[data.error] || 'เชื่อมต่อผู้ช่วย AI ไม่สำเร็จ')); }
  return String(data.text || '');
}
const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
// ภาพที่ส่งให้ AI: ทั้งแผ่น (ย่อด้านยาว ≤ 1568px) + ภาพขยายเฉพาะกรอบที่ตีไว้ (อ่านตัวเลขระยะได้ชัดขึ้น)
async function aiBlocks(q) { const A = (q.atts || []).filter(a => a.inAi !== false); const out = []; let n = 0;
  for (const a of A) { if (n >= MAX_AI_IMG) break; const idx = q.atts.indexOf(a) + 1, bmp = await bmpOf(await blobOf(a));
    const full = await toJpeg(bmp, 0, 0, bmp.width, bmp.height, AI_EDGE, 0.85);
    out.push({ type: 'text', text: 'แบบที่ ' + idx + ' — ' + akOf(a.kind) + ' — ' + a.name + ((a.marks || []).length ? ' (ผู้ใช้ตีกรอบพื้นที่ไว้ ' + a.marks.length + ' จุด: ' + a.marks.map(m => m.t || 'ไม่มีชื่อ').join(', ') + ')' : '') });
    out.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await b64(full.blob) } }); n++;
    for (const m of (a.marks || [])) { if (n >= MAX_AI_IMG) break; const sw = Math.max(8, m.w * bmp.width), sh = Math.max(8, m.h * bmp.height); if (sw * sh > bmp.width * bmp.height * 0.7) continue;
      const cr = await toJpeg(bmp, m.x * bmp.width, m.y * bmp.height, sw, sh, AI_EDGE, 0.88);
      out.push({ type: 'text', text: 'ภาพขยายของแบบที่ ' + idx + ' เฉพาะกรอบ “' + (m.t || 'พื้นที่') + '”' }); out.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await b64(cr.blob) } }); n++; } }
  return out; }
const jobText = (q) => 'ประเภทงาน: ' + kindOf(q.kind)[2] + ' (' + kindOf(q.kind)[3] + ')\nเรื่อง: ' + (q.title || '-') + '\nพื้นที่: ' + (q.area || '-') + '\nรายละเอียดงานจาก QS: ' + (q.desc || '-') + (q.aiHint ? '\nคำสั่งเพิ่มเติมจาก QS: ' + q.aiHint : '');
function parseAi(t) { let s = String(t || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim(); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('AI ตอบไม่ครบ — ลองลดจำนวนแบบที่ให้อ่าน หรือลองใหม่อีกครั้ง');
  let o; try { o = JSON.parse(s.slice(a, b + 1)); } catch (e) { throw new Error('AI ตอบไม่ครบ — ลองลดจำนวนแบบที่ให้อ่าน หรือลองใหม่อีกครั้ง'); }
  const arr = (x) => (Array.isArray(x) ? x : []).map(v => String(v || '').trim()).filter(Boolean).slice(0, 20);
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 40).map(x => ({ sec: SECS.some(s => s[0] === x.sec) ? x.sec : 'other', desc: String(x.desc || '').trim().slice(0, 300), spec: String(x.spec || '').trim().slice(0, 300), unit: String(x.unit || '').trim().slice(0, 20),
    qty: (x.qty == null || !isFinite(Number(x.qty)) || Number(x.qty) <= 0) ? null : r2(Number(x.qty)), basis: String(x.basis || '').trim().slice(0, 400), conf: ['high', 'mid', 'low'].includes(x.conf) ? x.conf : 'mid',
    rk: APP.rates.some(r => r.k === x.rk) ? x.rk : '' })).filter(x => x.desc);
  return { summary: String(o.summary || '').trim().slice(0, 1200), items, assume: arr(o.assume), excl: arr(o.excl), questions: arr(o.questions) }; }
async function aiRun() { const q = C(); if (APP.aiBusy) return;
  if (APP.aiOff) { toast('บัญชีนี้ยังไม่ได้เปิดสิทธิ์ใช้ผู้ช่วย AI'); return; }
  const A = (q.atts || []).filter(a => a.inAi !== false);
  if (!A.length) { toast('แนบแบบอย่างน้อย 1 แผ่น และติ๊ก “ให้ AI อ่าน” ก่อน'); return; }
  APP.aiBusy = true; APP.aiErr = ''; renderAi();
  try { const blocks = await aiBlocks(q);
    const rates = APP.rates.slice(0, 160).map(r => r.k + ' = ' + r.n + ' (' + r.u + ')').join('\n');
    blocks.push({ type: 'text', text: jobText(q) + '\n\nอัตรากลาง (รหัส = ชื่อรายการ (หน่วย)) — ใช้จับคู่ rk เท่านั้น:\n' + (rates || '(ยังไม่มี)') + '\n\nถอดรายการและปริมาณจากแบบข้างบน แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด' });
    const r = parseAi(await aiCall(AI_SYS, blocks, 4000));
    q.ai = { at: Date.now(), by: APP.me.name, n: A.length, ...r, pick: r.items.map(x => x.qty != null) }; touch();
  } catch (e) { console.error(e); APP.aiErr = (e && e.message) || String(e); }
  APP.aiBusy = false; renderAi();
}
async function aiAsk() { const q = C(); if (APP.aiBusy) return;
  if (APP.aiOff) { toast('บัญชีนี้ยังไม่ได้เปิดสิทธิ์ใช้ผู้ช่วย AI'); return; }
  if (!(q.atts || []).some(a => a.inAi !== false)) { toast('แนบแบบอย่างน้อย 1 แผ่น และติ๊ก “ให้ AI อ่าน” ก่อน'); return; }
  const t = await dlg({ title: 'ถาม AI เกี่ยวกับแบบ', text: 'เช่น “ผนังด้าน A ยาวเท่าไร” · “สเปกพื้นระบุวัสดุอะไร” · “มีงานอะไรที่แบบยังไม่ชัด”', input: { area: true, placeholder: 'พิมพ์คำถาม' }, ok: 'ถาม AI' }); if (!t) return;
  APP.aiBusy = true; APP.aiErr = ''; APP.aiAns = ''; renderAi();
  try { const blocks = await aiBlocks(q); blocks.push({ type: 'text', text: jobText(q) + '\n\nคำถามจาก QS: ' + t });
    APP.aiAns = { q: t, a: await aiCall('คุณเป็นผู้ช่วย QS ของบริษัทรับเหมาตกแต่งภายใน ตอบคำถามจากแบบและสเปกที่แนบเท่านั้น ตอบภาษาไทย กระชับ ระบุว่าอ่านจากแบบที่เท่าไร ถ้าอ่านไม่ได้หรือแบบไม่ได้ระบุ ให้บอกตรง ๆ ว่าไม่พบ ห้ามเดา ห้ามให้ราคาหรือต้นทุน ไม่ใช้ markdown', blocks, 1500) };
  } catch (e) { console.error(e); APP.aiErr = (e && e.message) || String(e); }
  APP.aiBusy = false; renderAi();
}
const CONF = { high: 'อ่านจากแบบได้ชัด', mid: 'อนุมานจากแบบ', low: 'ไม่แน่ใจ — ต้องตรวจ' };
function renderAi() { const q = C(), o = $('edAiOut'); if (!q) return; const H = [];
  if (APP.aiOff) H.push('<div class="warn">บัญชีนี้ยังไม่ได้เปิดสิทธิ์ใช้ผู้ช่วย AI — ขอเปิดที่ผู้ดูแลระบบ (ยังทำใบเสนอราคาเองได้ตามปกติ)</div>');
  if (APP.aiBusy) H.push('<div class="ai"><h4><span class="spin"></span>AI กำลังอ่านแบบ… ใช้เวลาราว 20–60 วินาที</h4></div>');
  if (APP.aiErr) H.push(`<div class="warn bad">${esc(APP.aiErr)}</div>`);
  if (APP.aiAns && APP.aiAns.a) H.push(`<div class="ai"><h4>💬 ${esc(APP.aiAns.q)}</h4><div style="white-space:pre-line;font-size:13.5px">${esc(APP.aiAns.a)}</div><div class="mut" style="font-size:12px">คำตอบจาก AI — ตรวจกับแบบก่อนใช้</div></div>`);
  const a = q.ai;
  if (a && !APP.aiBusy) { const pk = a.pick || []; const n = pk.filter(Boolean).length;
    H.push(`<div class="ai"><h4>✨ ผลจาก AI <small class="mut" style="font-weight:500">อ่าน ${a.n || ''} แผ่น · ${dmyhm(a.at)} · ${esc(a.by || '')}</small></h4>
      ${a.summary ? `<div style="font-size:13.5px">${esc(a.summary)}</div>` : ''}
      ${a.items.length ? a.items.map((x, i) => `<label class="pi"><input type="checkbox" data-aipk="${i}"${pk[i] ? ' checked' : ''}${a.added && a.added[i] ? ' disabled' : ''}><span class="t"><b>${esc(x.desc)}</b> <span class="aib ${x.conf === 'low' ? 'low' : x.conf === 'high' ? 'ok' : ''}">${CONF[x.conf]}</span>${a.added && a.added[i] ? ' <span class="aib ok">เพิ่มแล้ว</span>' : ''}<small>${esc(secOf(x.sec)[1])}${x.spec ? ' · ' + esc(x.spec) : ''}</small>${x.basis ? `<small>ที่มา: ${esc(x.basis)}</small>` : ''}</span><span class="q">${x.qty == null ? '— ' : fq(x.qty) + ' '}${esc(x.unit)}</span></label>`).join('') : '<div class="mut">AI ไม่พบรายการที่ถอดได้จากแบบชุดนี้</div>'}
      ${a.items.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm dk" data-act="aiAdd"${n ? '' : ' disabled'}>＋ เพิ่ม ${n} รายการที่ติ๊กลงตาราง</button><button class="btn sm" data-act="aiTerms"${(a.assume.length || a.excl.length) ? '' : ' disabled'}>ใส่ข้อสมมติฐาน / ข้อยกเว้นลงเงื่อนไข</button></div>` : ''}
      ${a.questions.length ? `<h4 style="margin-top:4px">❓ ต้องถามก่อนยืนยันราคา</h4><ul>${a.questions.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div><button class="btn sm" data-act="aiCopyQ">คัดลอกคำถาม (ใช้ทำ RFI)</button></div>` : ''}
      ${a.assume.length ? `<h4 style="margin-top:4px">ข้อสมมติฐานของ AI</h4><ul>${a.assume.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="mut" style="font-size:12px">ปริมาณจาก AI เป็นค่าตั้งต้น — QS ต้องตรวจกับแบบและติ๊ก “ตรวจแล้ว” ทุกรายการก่อนส่งขออนุมัติ</div></div>`); }
  o.innerHTML = H.join('');
}
function aiAdd() { const q = C(), a = q.ai; if (!a) return; a.added = a.added || []; let n = 0;
  a.items.forEach((x, i) => { if (!(a.pick || [])[i] || a.added[i]) return; const r = x.rk ? APP.rates.find(y => y.k === x.rk) : null;
    addRow({ sec: x.sec, desc: x.desc, spec: x.spec, unit: x.unit || (r ? r.u : ''), qty: x.qty == null ? '' : x.qty, rate: r && r.rate > 0 ? r.rate : '', rk: r ? r.k : '', ai: { conf: x.conf, basis: x.basis }, chk: false }); a.added[i] = true; a.pick[i] = false; n++; });
  if (!n) { toast('ติ๊กรายการที่ต้องการก่อน'); return; } renderItems(); sumOut(); renderAi(); toast('เพิ่ม ' + n + ' รายการแล้ว — ตรวจปริมาณกับแบบ ใส่ราคา แล้วติ๊ก “ตรวจแล้ว”', 4500); }
function aiTerms() { const q = C(), a = q.ai; if (!a) return; const add = (cur, L) => { const have = lines(cur); L.forEach(x => { if (!have.includes(x)) have.push(x); }); return have.join('\n'); };
  q.assume = add(q.assume, a.assume); q.excl = add(q.excl, a.excl); $('edAssume').value = q.assume; $('edExcl').value = q.excl; touch(); toast('ใส่ลงเงื่อนไขแล้ว — ตรวจข้อความก่อนส่ง'); }

// ---------- บันทึก / ส่งอนุมัติ ----------
function pull() { const q = C(); Object.keys(BIND).forEach(id => { q[BIND[id]] = $(id).value; }); q.pid = $('edScope').value || ''; return q; }
async function save(silent) { const q = pull();
  if (!String(q.title || '').trim()) { toast('ใส่ “เรื่อง / ชื่องาน” ก่อนบันทึก'); $('edTitleIn').focus(); return false; }
  if (APP.saving) return false; APP.saving = true;
  try { q.upAt = Date.now(); if (!q.no) logIt(q, 'สร้างร่าง');
    await writeQ(q, (prev) => { if (prev && !['draft', 'returned'].includes(prev.status || 'draft')) throw new Error('ใบนี้ถูกส่ง / ดำเนินการไปแล้ว แก้ไขไม่ได้ — โหลดล่าสุดแล้ว'); });
    APP.dirty = false; $('edTitle').textContent = 'แก้ไข ' + q.no; $('edSaved').textContent = 'บันทึกแล้ว ' + dmyhm(q.upAt); $('edDel').hidden = false; $('edSub').textContent = scopeName(q);
    if (!silent) toast('บันทึกร่าง ' + q.no + ' แล้ว'); APP.saving = false; return true;
  } catch (e) { console.error(e); APP.saving = false; toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 5000); return false; }
}
async function send() { const q = pull(); const miss = [];
  if (!String(q.title || '').trim()) miss.push('เรื่อง / ชื่องาน'); if (!String(q.cust || '').trim()) miss.push('ลูกค้า / ผู้ว่าจ้าง');
  if (!(q.atts || []).length) miss.push('แบบแนบอย่างน้อย 1 แผ่น (ให้ผู้อนุมัติเห็นพื้นที่)');
  if (!(q.items || []).length) miss.push('รายการอย่างน้อย 1 รายการ');
  const bad = (q.items || []).filter(i => !String(i.desc || '').trim() || !(num(i.qty) > 0) || !(num(i.rate) > 0)).length; if (bad) miss.push(bad + ' รายการยังไม่มีชื่อ / จำนวน / ราคา');
  const ai = (q.items || []).filter(i => i.ai && !i.chk).length; if (ai) miss.push(ai + ' รายการจาก AI ยังไม่ได้ติ๊ก “ตรวจแล้ว”');
  if (!has(q.prelimPct)) miss.push('Preliminary % (ใส่ 0 ได้ถ้าไม่คิด)'); if (!has(q.ohpPct)) miss.push('OH&P %');
  if (miss.length) { await dlg({ title: 'ยังส่งขออนุมัติไม่ได้', text: 'ต้องมีให้ครบก่อน:\n• ' + miss.join('\n• '), cancel: false, ok: 'กลับไปแก้' }); return; }
  const ap = approversFor(q); const c = calc(q), W = warnsOf(q).filter(w => w[0] !== 'bad');
  if (!ap.length) { await dlg({ title: 'ยังไม่มีผู้อนุมัติ', text: 'ไม่พบ QS Manager / ผู้บริหารคนอื่นในระบบ (ห้ามอนุมัติใบของตัวเอง) — แจ้ง Admin ตรวจบัญชีผู้ใช้', cancel: false, ok: 'รับทราบ' }); return; }
  if (!(await ask('ส่งขออนุมัติใบเสนอราคา?', 'ยอด ' + baht(c.net) + ' ไม่รวม VAT (' + baht(c.grand) + ' รวม VAT ' + VAT + '%)\nผู้อนุมัติ: ' + ap.map(nameOf).join(', ') + (W.length ? '\n\nผู้อนุมัติจะเห็นข้อสังเกตนี้:\n• ' + W.map(w => w[1]).join('\n• ') : '') + '\n\nส่งแล้วแก้ไขไม่ได้จนกว่าจะดึงกลับ', 'ส่งขออนุมัติ'))) return;
  if (!(await save(true))) return;
  try { const x = await transition(q.id, ['draft', 'returned'], (z) => { z.status = 'sent'; z.sentAt = Date.now(); z.upAt = Date.now(); z.retNote = ''; logIt(z, 'ส่งขออนุมัติ', 'ถึง ' + ap.map(nameOf).join(', ')); });
    await notify(x, { title: 'ขออนุมัติใบเสนอราคา ' + x.no + ' · ' + x.title, note: scopeName(x), approve: ap, close: 'all' });
    APP.cur = null; APP.dirty = false; toast('ส่งขออนุมัติแล้ว — แจ้ง ' + ap.map(nameOf).join(', ')); renderList(); openView(x);
  } catch (e) { console.error(e); toast((e && e.message) || 'ส่งไม่สำเร็จ', 5000); }
}

// =====================================================================
// ดู / อนุมัติ
// =====================================================================
function itemsTable(q, c, internal) { let n = 0; const H = [];
  SECS.forEach(s => { const L = c.rows.filter(r => (r.it.sec || 'other') === s[0]); if (!L.length) return;
    H.push(`<tr class="sec"><td colspan="5">${esc(s[1])}</td><td class="r">${f2(L.reduce((a, r) => a + (internal ? r.baseAmt : r.amt), 0))}</td></tr>`);
    L.forEach(r => { n++; const it = r.it; H.push(`<tr><td>${n}</td><td>${esc(it.desc)}${it.spec ? `<small>${esc(it.spec)}</small>` : ''}${internal && it.ai ? `<small><span class="aib ${it.chk ? 'ok' : 'low'}">AI${it.chk ? ' · QS ตรวจแล้ว' : ' · ยังไม่ตรวจ'}</span>${esc(it.ai.basis || '')}</small>` : ''}${internal && !it.rk ? '<small>ราคา QS กรอกเอง</small>' : ''}</td>
      <td>${esc(it.unit)}</td><td class="r">${fq(r.qty)}</td><td class="r">${f2(internal ? r.base : r.price)}</td><td class="r">${f2(internal ? r.baseAmt : r.amt)}</td></tr>`); }); });
  return `<div class="tbw"><table class="vq"><thead><tr><th style="width:36px">ที่</th><th>รายการ / สเปก</th><th>หน่วย</th><th class="r">จำนวน</th><th class="r">ราคา / หน่วย</th><th class="r">รวม (฿)</th></tr></thead><tbody>${H.join('')}</tbody></table></div>`; }
function openView(q) { APP.view = q.id; const c = calc(q), k = kindOf(q.kind), W = warnsOf(q);
  $('vwTitle').textContent = (q.no || 'ใบเสนอราคา') + ' · ' + (q.title || ''); $('vwSub').textContent = scopeName(q);
  const vf = (l, v) => v ? `<div class="vf2"><small>${l}</small><b>${esc(v)}</b></div>` : '';
  const a = q.ai;
  $('vwBody').innerHTML = `
    <div class="card"><div class="h">${k[1]} ${esc(k[2])} ${stTag(q.status)}<span class="sp"></span><b style="font-size:17px">${baht(c.net)} <small>ไม่รวม VAT</small></b></div>
      ${q.status === 'returned' ? `<div class="warn bad"><b>ส่งกลับแก้ไข:</b> ${esc(q.retNote || '')} — ${esc(q.retBy || '')} ${dmyhm(q.retAt)}</div>` : ''}
      ${q.status === 'cancelled' ? `<div class="warn bad"><b>ยกเลิก:</b> ${esc(q.cancelNote || '')} — ${esc(q.cancelBy || '')} ${dmyhm(q.cancelAt)}</div>` : ''}
      ${q.status === 'approved' || q.status === 'issued' ? `<div class="info">อนุมัติโดย ${esc(q.apBy || '')} ${dmyhm(q.apAt)}${q.apNote ? ' — ' + esc(q.apNote) : ''}${q.issuedAt ? ' · บันทึกส่งลูกค้า ' + dmyhm(q.issuedAt) : ''}${q.kind === 'dco' ? '<br>งานเปลี่ยนแบบ: ต้องมี VO ลงนามจากลูกค้าก่อนเริ่มงานเพิ่ม (No Signed VO = No Additional Work)' : '<br>เริ่มผลิต / ทำงานได้เมื่อลูกค้าลงนามยืนยัน (No Signature = No Production)'}</div>` : ''}
      <div class="vgrid">${vf('ใช้กับ', scopeName(q))}${vf('ลูกค้า / ผู้ว่าจ้าง', q.cust)}${vf('เรียน', q.attn)}${vf('พื้นที่ / ห้อง', q.area)}${vf('สถานที่', q.site)}${vf('ผู้จัดทำ', (q.by || '') + (q.byTitle ? ' · ' + q.byTitle : ''))}${vf('ส่งขออนุมัติ', dmyhm(q.sentAt))}${vf('ยืนราคา', q.valid ? q.valid + ' วัน' : '')}${vf('ระยะเวลาดำเนินการ', q.lead)}</div>
      ${q.desc ? `<div><small class="mut">รายละเอียดงาน</small><div style="white-space:pre-line">${esc(q.desc)}</div></div>` : ''}
      ${q.memo ? `<div class="info"><b>หมายเหตุถึงผู้อนุมัติ:</b> ${esc(q.memo)}</div>` : ''}</div>
    ${W.length && q.status === 'sent' ? `<div class="card"><div class="h">ข้อสังเกตสำหรับผู้อนุมัติ</div>${warnHtml(W)}</div>` : ''}
    <div class="card"><div class="h">แบบแนบ · พื้นที่ที่เสนอราคา<small>กดที่แบบเพื่อซูมดูรายละเอียด · กรอบแดง = ส่วนที่เสนอราคา</small></div>
      ${(q.atts || []).length ? `<div class="dwgs">${q.atts.map((x, i) => `<div class="dwg"><div class="im" data-zoom="${esc(x.id)}"><img src="${esc(x.url)}" alt="" loading="lazy">${markHtml(x, true)}</div><div class="cp"><b>แบบที่ ${i + 1} · ${esc(x.name)}</b><span class="mut">${esc(akOf(x.kind))}</span><button class="btn sm" data-zoom="${esc(x.id)}">🔍 ซูม</button></div></div>`).join('')}</div>` : '<p class="empty">ไม่มีแบบแนบ</p>'}</div>
    ${a && (a.summary || a.questions.length) ? `<div class="card"><div class="h">✨ สรุปจาก AI<small>อ่านแบบ ${a.n || ''} แผ่น · ${dmyhm(a.at)} — เป็นข้อมูลประกอบ ไม่ใช่ข้อยืนยัน</small></div>${a.summary ? `<div>${esc(a.summary)}</div>` : ''}${a.questions.length ? `<div><b style="font-size:13.5px">คำถามที่ AI เห็นว่าควรถามก่อนยืนยันราคา</b><ul style="margin:4px 0 0;padding-left:20px;font-size:13.5px">${a.questions.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
    <div class="card"><div class="h">รายการและราคา<small>มุมมองภายใน — ราคา / หน่วยก่อนรวม OH&amp;P</small></div>${itemsTable(q, c, true)}
      <div class="sum" style="max-width:520px;margin-left:auto;width:100%">
        <div class="r"><span>ค่างานตามรายการ</span><span>${baht(c.directBase)}</span></div><div class="r"><span>Preliminary ${fq(c.pre)}%</span><span>${baht(c.prelim)}</span></div>
        <div class="r"><span>OH&amp;P ${fq(c.ohp)}% <small>(ภายใน · ${c.fold ? 'รวมในราคา / หน่วยของเอกสารลูกค้า' : 'แสดงเป็นบรรทัดแยก'})</small></span><span>${baht(c.ohpIn)}</span></div>
        ${c.disc ? `<div class="r"><span>ส่วนลด</span><span>−${baht(c.disc)}</span></div>` : ''}
        <div class="r t"><span>รวมเป็นเงิน <small>ไม่รวม VAT</small></span><span>${baht(c.net)}</span></div><div class="r"><span>VAT ${VAT}%</span><span>${baht(c.vat)}</span></div><div class="r t"><span>รวมทั้งสิ้น <small>รวม VAT ${VAT}%</small></span><span>${baht(c.grand)}</span></div></div></div>
    ${(q.pay || q.assume || q.excl) ? `<div class="card"><div class="h">เงื่อนไข</div>${q.pay ? `<div><small class="mut">การชำระเงิน</small><div style="white-space:pre-line">${esc(q.pay)}</div></div>` : ''}${q.assume ? `<div><small class="mut">ข้อสมมติฐาน</small><ul style="margin:2px 0 0;padding-left:20px">${lines(q.assume).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${q.excl ? `<div><small class="mut">ไม่รวมในราคา</small><ul style="margin:2px 0 0;padding-left:20px">${lines(q.excl).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
    <div class="card"><div class="h">ประวัติ</div><div class="log">${(q.log || []).slice().reverse().map(l => `<div><span>${dmyhm(l.at)}</span> · <b>${esc(l.by)}</b> ${esc(l.act)}${l.note ? ' — ' + esc(l.note) : ''}</div>`).join('')}</div></div>`;
  const B = [];
  if (canApprove(q)) B.push('<button class="btn bad" data-act="ret">ส่งกลับแก้ไข</button>', '<span style="flex:1"></span>', '<button class="btn" data-act="vPrint">ดูเอกสารลูกค้า (DRAFT)</button>', '<button class="btn ok" data-act="approve">✓ อนุมัติ</button>');
  else if (q.status === 'sent') { if (isMine(q) || isBoss()) B.push('<button class="btn" data-act="recall">ดึงกลับมาแก้ไข</button>'); B.push('<span style="flex:1"></span>', '<button class="btn" data-act="vPrint">ดูเอกสารลูกค้า (DRAFT)</button>'); if (isMine(q)) B.push('<span class="mut" style="align-self:center">รอ ' + esc(approversFor(q).map(nameOf).join(', ')) + ' อนุมัติ</span>'); }
  else if (q.status === 'approved' || q.status === 'issued') { if (isMine(q) || isBoss() || APP.me.role === 'qs_mgr') B.push('<button class="btn bad" data-act="cancel">ยกเลิกใบนี้</button>', '<button class="btn" data-act="revise">สร้างฉบับแก้ไข (Rev.)</button>');
    B.push('<span style="flex:1"></span>', '<button class="btn" data-act="copyTsv">คัดลอกตาราง (วางใน Excel)</button>'); if (q.status === 'approved') B.push('<button class="btn" data-act="issued">บันทึกว่าส่งลูกค้าแล้ว</button>'); B.push('<button class="btn pri" data-act="vPrint">พิมพ์ / PDF</button>'); }
  else B.push('<span style="flex:1"></span>', '<button class="btn" data-act="vPrint">ดูเอกสาร (DRAFT)</button>');
  $('vwFoot').innerHTML = B.join(''); show('view'); $('scrView').querySelector('.body').scrollTop = 0;
}
const VQ = () => findQ(APP.view);
async function act(fn, okMsg) { if (APP.busy) return; APP.busy = true; try { const x = await fn(); if (okMsg) toast(okMsg); if (x) openView(x); } catch (e) { console.error(e); toast((e && e.message) || 'ทำรายการไม่สำเร็จ', 5000); try { await loadAll(); const q = VQ(); if (q) openView(q); } catch (x) {} } APP.busy = false; }
async function approve() { const q = VQ(); if (!q || !canApprove(q)) return; const c = calc(q), W = warnsOf(q);
  if (W.some(w => w[0] === 'bad')) { await dlg({ title: 'ยังอนุมัติไม่ได้', text: W.filter(w => w[0] === 'bad').map(w => '• ' + w[1]).join('\n') + '\n\nส่งกลับให้ผู้จัดทำแก้ไขก่อน', cancel: false, ok: 'รับทราบ' }); return; }
  const note = await dlg({ title: 'อนุมัติใบเสนอราคา ' + q.no + '?', text: 'ยอด ' + baht(c.net) + ' ไม่รวม VAT · ' + baht(c.grand) + ' รวม VAT ' + VAT + '%' + (W.length ? '\n\nข้อสังเกต:\n• ' + W.map(w => w[1]).join('\n• ') : '') + '\n\nอนุมัติแล้วเอกสารจะไม่มีลายน้ำ DRAFT และส่งลูกค้าได้', input: { placeholder: 'หมายเหตุ (ไม่บังคับ)' }, ok: '✓ อนุมัติ' });
  if (note == null) return;
  await act(async () => { const x = await transition(q.id, ['sent'], (z) => { z.status = 'approved'; z.apAt = Date.now(); z.upAt = Date.now(); z.apBy = APP.me.name; z.apFull = APP.me.full; z.apEmail = APP.me.email; z.apTitle = APP.me.title; z.apNote = note; logIt(z, 'อนุมัติ', note); });
    await notify(x, { title: 'อนุมัติแล้ว: ใบเสนอราคา ' + x.no + ' · ' + x.title, note: 'พิมพ์ / ส่งลูกค้าได้', to: [norm(x.byEmail)], close: 'all' }); return x; }, 'อนุมัติแล้ว — แจ้งผู้จัดทำแล้ว'); }
async function ret() { const q = VQ(); if (!q || !canApprove(q)) return;
  const note = await dlg({ title: 'ส่งกลับแก้ไข', text: 'บอกผู้จัดทำว่าต้องแก้อะไร', input: { area: true, placeholder: 'เช่น ปริมาณผนังด้าน A ไม่ตรงกับรูปด้าน · ขอแนบรูปตัดตู้' }, ok: 'ส่งกลับ', bad: true }); if (note == null) return; if (!note) { toast('ต้องใส่เหตุผล'); return; }
  await act(async () => { const x = await transition(q.id, ['sent'], (z) => { z.status = 'returned'; z.retAt = Date.now(); z.upAt = Date.now(); z.retBy = APP.me.name; z.retNote = note; logIt(z, 'ส่งกลับแก้ไข', note); });
    await notify(x, { title: 'ส่งกลับแก้ไข: ใบเสนอราคา ' + x.no + ' · ' + x.title, note, to: [norm(x.byEmail)], close: 'all' }); return x; }, 'ส่งกลับแล้ว — แจ้งผู้จัดทำแล้ว'); }
async function recall() { const q = VQ(); if (!q || q.status !== 'sent') return; if (!(await ask('ดึงกลับมาแก้ไข?', 'ใบนี้จะกลับเป็นร่าง และยกเลิกคำขออนุมัติ', 'ดึงกลับ'))) return;
  await act(async () => { const x = await transition(q.id, ['sent'], (z) => { z.status = 'draft'; z.upAt = Date.now(); logIt(z, 'ดึงกลับมาแก้ไข'); }); await notify(x, { close: 'all' }); renderList(); openEdit(clone(x)); return null; }, 'ดึงกลับแล้ว'); }
async function issued() { const q = VQ(); if (!q || q.status !== 'approved') return; if (!(await ask('บันทึกว่าส่งลูกค้าแล้ว?', 'ใช้ติดตามว่าใบไหนส่งออกไปแล้ว', 'บันทึก'))) return;
  await act(() => transition(q.id, ['approved'], (z) => { z.status = 'issued'; z.issuedAt = Date.now(); z.upAt = Date.now(); logIt(z, 'ส่งลูกค้าแล้ว'); }), 'บันทึกแล้ว'); }
async function cancelQ() { const q = VQ(); if (!q) return;
  const note = await dlg({ title: 'ยกเลิกใบเสนอราคา ' + q.no + '?', text: 'ใบที่ยกเลิกยังอยู่ในประวัติ แต่ใช้ส่งลูกค้าไม่ได้', input: { placeholder: 'เหตุผล (ต้องใส่)' }, ok: 'ยกเลิกใบนี้', bad: true }); if (note == null) return; if (!note) { toast('ต้องใส่เหตุผล'); return; }
  await act(async () => { const x = await transition(q.id, ['approved', 'issued'], (z) => { z.status = 'cancelled'; z.cancelAt = Date.now(); z.upAt = Date.now(); z.cancelBy = APP.me.name; z.cancelNote = note; logIt(z, 'ยกเลิก', note); });
    await notify(x, { title: 'ยกเลิกใบเสนอราคา ' + x.no + ' · ' + x.title, note, to: [norm(x.byEmail), norm(x.apEmail)].filter(e => e && e !== APP.me.email), close: 'all' }); return x; }, 'ยกเลิกแล้ว'); }
async function revise() { const q = VQ(); if (!q) return; if (!(await ask('สร้างฉบับแก้ไข?', 'คัดลอกใบ ' + q.no + ' เป็นร่างใหม่ (เลขที่ต่อท้าย -R) — ต้องส่งขออนุมัติใหม่ · ใบเดิมไม่เปลี่ยน', 'สร้างฉบับแก้ไข'))) return;
  const n = clone(q); Object.assign(n, { id: uid('q'), no: '', revOf: q.id, revBase: q.no, status: 'draft', by: APP.me.name, byFull: APP.me.full, byEmail: APP.me.email, byTitle: APP.me.title, at: Date.now(), upAt: Date.now(), log: [] });
  ['sentAt', 'apAt', 'apBy', 'apFull', 'apEmail', 'apTitle', 'apNote', 'retAt', 'retBy', 'retNote', 'issuedAt', 'cancelAt', 'cancelBy', 'cancelNote'].forEach(k => delete n[k]);
  logIt(n, 'สร้างฉบับแก้ไขจาก ' + q.no);
  await act(async () => { await writeQ(n); openEdit(clone(n)); return null; }, 'สร้างร่างฉบับแก้ไขแล้ว'); }
async function del() { const q = C(); if (!q || !q.no) return; if (!(await dlg({ title: 'ลบร่าง ' + q.no + '?', text: 'ลบแล้วไม่แสดงในรายการอีก', ok: 'ลบร่าง', bad: true }))) return;
  try { q.deleted = true; q.upAt = Date.now(); logIt(q, 'ลบร่าง'); await writeQ(q, (prev) => { if (prev && !['draft', 'returned'].includes(prev.status || 'draft')) throw new Error('ใบนี้ถูกส่งไปแล้ว ลบไม่ได้'); });
    APP.cur = null; APP.dirty = false; toast('ลบร่างแล้ว'); renderList(); } catch (e) { q.deleted = false; toast((e && e.message) || 'ลบไม่สำเร็จ', 5000); } }

// =====================================================================
// เอกสารลูกค้า (แบบฟอร์ม Wellcon) — ไม่มีต้นทุน / กำไร · ลายน้ำ DRAFT จนกว่าจะอนุมัติ
// =====================================================================
const PV_CSS = `#pv{position:fixed;inset:0;z-index:70;background:#6E6A60;overflow:auto;-webkit-overflow-scrolling:touch}
#pv .bar{position:sticky;top:0;z-index:6;background:#1C1B18;color:#fff;display:flex;gap:8px;align-items:center;padding:10px 14px;flex-wrap:wrap}
#pv .bar b{flex:1;min-width:140px}
#pv .bar button{min-height:40px;border-radius:11px;border:1px solid #4A463C;background:#26241F;color:#fff;padding:0 14px;font-weight:600}
#pv .bar button.g{background:#C9A961;border-color:#C9A961;color:#1C1B18}
#pv .sheet{position:relative;background:#fff;color:#111;width:210mm;max-width:100%;margin:14px auto;padding:14mm;box-shadow:0 6px 30px rgba(0,0,0,.35);font-size:11pt;line-height:1.45;overflow:hidden}
#pv .wm{position:absolute;left:0;right:0;top:120mm;text-align:center;font-size:120pt;font-weight:800;color:rgba(180,68,46,.11);transform:rotate(-28deg);pointer-events:none;letter-spacing:.08em;z-index:3}
#pv .hd{display:flex;gap:14px;align-items:flex-start;border-bottom:2.5px solid #1C1B18;padding-bottom:8px}
#pv .hd .co{flex:1}#pv .hd .co b{font-size:14pt}#pv .hd .co div{font-size:9pt;color:#444}
#pv .hd .tt{text-align:right}#pv .hd .tt b{font-size:17pt;letter-spacing:.04em}#pv .hd .tt div{font-size:9.5pt}
#pv .dr{background:#B4442E;color:#fff;font-weight:700;text-align:center;padding:3px 8px;font-size:9.5pt;margin-top:6px}
#pv .inf{display:grid;grid-template-columns:1fr 1fr;gap:2px 18px;margin:10px 0;font-size:10.5pt}
#pv .inf div{display:flex;gap:6px}#pv .inf span{color:#555;flex:none;min-width:86px}
#pv table{border-collapse:collapse;width:100%;font-size:10pt}
#pv th{background:#EFEAE0;border:1px solid #9A958A;padding:4px 6px;font-weight:700;text-align:center}
#pv td{border:1px solid #9A958A;padding:3px 6px;vertical-align:top}
#pv td.r{text-align:right;white-space:nowrap}#pv td.c{text-align:center}
#pv tr.sec td{background:#F7F3EA;font-weight:700}
#pv td small{display:block;color:#555;font-size:8.8pt}
#pv tr.tot td{font-weight:700}#pv tr.g td{background:#EFEAE0;font-weight:800;font-size:11pt}
#pv .tm{margin-top:10px;font-size:10pt}#pv .tm b{display:block;margin-top:6px}#pv .tm ul{margin:2px 0 0;padding-left:18px}
#pv .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px;font-size:10pt;text-align:center;break-inside:avoid}
#pv .sg div{border-top:1px solid #333;padding-top:5px;margin-top:38px}
#pv .ap{break-before:page;page-break-before:always;margin-top:14px}
#pv .ap h3{font-size:11.5pt;margin:0 0 6px;border-bottom:1.5px solid #1C1B18;padding-bottom:4px}
#pv .ap .im{position:relative;border:1px solid #9A958A;line-height:0}
#pv .ap .im img{width:100%;max-height:235mm;object-fit:contain;display:block}
#pv .ap .im .mk{position:absolute;border:2.2px solid #D2462E;background:rgba(210,70,46,.1)}
#pv .ap .im .mk span{position:absolute;left:-2.2px;top:-2.2px;transform:translateY(-100%);background:#D2462E;color:#fff;font-size:8.5pt;font-weight:700;padding:1px 6px;line-height:1.3;white-space:nowrap}
#pv .ft{margin-top:10px;font-size:8.5pt;color:#666;text-align:center}
@page{size:A4;margin:12mm}
@media print{html,body{height:auto!important;background:#fff!important}#pv{position:static;background:#fff;overflow:visible}#pv .bar{display:none}#pv .sheet{box-shadow:none;margin:0;padding:0;width:auto;overflow:visible}#pv .wm{position:fixed;top:40%}
  #pv,#pv *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
function docHtml(q) { const c = calc(q), en = q.lang === 'en', T = (th, e) => en ? e + ' / ' + th : th, draft = !['approved', 'issued'].includes(q.status);
  const p = APP.projects.find(x => x.id === q.pid); let n = 0; const R = [];
  SECS.forEach(s => { const L = c.rows.filter(r => (r.it.sec || 'other') === s[0]); if (!L.length) return;
    R.push(`<tr class="sec"><td colspan="5">${esc(en ? s[2] + ' / ' + s[1] : s[1])}</td><td class="r">${f2(L.reduce((a, r) => a + r.amt, 0))}</td></tr>`);
    L.forEach(r => { n++; R.push(`<tr><td class="c">${n}</td><td>${esc(r.it.desc)}${r.it.spec ? `<small>${esc(r.it.spec)}</small>` : ''}</td><td class="c">${esc(r.it.unit)}</td><td class="r">${fq(r.qty)}</td><td class="r">${f2(r.price)}</td><td class="r">${f2(r.amt)}</td></tr>`); }); });
  const tr = (l, v, cls) => `<tr class="${cls || 'tot'}"><td colspan="5" class="r">${l}</td><td class="r">${v}</td></tr>`;
  const A = (q.atts || []).filter(a => a.inPrint !== false), until = q.valid ? dmy((q.apAt || Date.now()) + num(q.valid) * 864e5) : '';
  const ul = (t) => `<ul>${lines(t).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<div class="sheet">${draft ? '<div class="wm">DRAFT</div>' : ''}
    <div class="hd"><div class="co"><b>${CO.th}</b><div>${CO.en}</div><div>${CO.addr}</div><div>${T('เลขประจำตัวผู้เสียภาษี', 'Tax ID')} ${CO.tax} · ${CO.web}</div></div>
      <div class="tt"><b>${en ? 'QUOTATION' : 'ใบเสนอราคา'}</b><div>${en ? 'ใบเสนอราคา' : 'QUOTATION'}</div><div>${T('เลขที่', 'No.')} <b style="font-size:11pt">${esc(q.no || '(ร่าง)')}</b></div><div>${T('วันที่', 'Date')} ${dmy(q.apAt || Date.now())}</div></div></div>
    ${draft ? '<div class="dr">DRAFT — ยังไม่ผ่านการอนุมัติของผู้บริหาร ห้ามส่งลูกค้า</div>' : ''}
    <div class="inf"><div><span>${T('ลูกค้า', 'Customer')}</span><b>${esc(q.cust)}</b></div><div><span>${T('โครงการ', 'Project')}</span><b>${esc(p ? [projName(p), projCode(p)].filter(Boolean).join(' · ') : (q.site || '-'))}</b></div>
      <div><span>${T('เรียน', 'Attention')}</span><b>${esc(q.attn || '-')}</b></div><div><span>${T('สถานที่', 'Location')}</span><b>${esc(q.site || '-')}</b></div>
      <div><span>${T('เรื่อง', 'Subject')}</span><b>${esc(q.title)}</b></div><div><span>${T('พื้นที่', 'Area')}</span><b>${esc(q.area || '-')}</b></div></div>
    ${q.desc ? `<div style="font-size:10.5pt;margin-bottom:8px;white-space:pre-line"><b>${T('ขอบเขตงาน', 'Scope of Work')}:</b> ${esc(q.desc)}</div>` : ''}
    <table><thead><tr><th style="width:9mm">${T('ที่', 'No.')}</th><th>${T('รายการ', 'Description')}</th><th style="width:16mm">${T('หน่วย', 'Unit')}</th><th style="width:20mm">${T('จำนวน', 'Qty')}</th><th style="width:27mm">${T('ราคา/หน่วย', 'Unit Price')}</th><th style="width:30mm">${T('รวม (บาท)', 'Amount (THB)')}</th></tr></thead><tbody>${R.join('')}
      ${tr(T('รวมค่างาน', 'Sub-total'), f2(c.direct))}${c.prelim ? tr(T('ค่าดำเนินการ (Preliminary)', 'Preliminaries') + ' ' + fq(c.pre) + '%', f2(c.prelim)) : ''}${c.ohpAmt ? tr(T('ค่าบริหารและกำไร (OH&P)', 'Overhead & Profit') + ' ' + fq(c.ohp) + '%', f2(c.ohpAmt)) : ''}${c.disc ? tr(T('ส่วนลด', 'Discount'), '−' + f2(c.disc)) : ''}
      ${tr(T('รวมเป็นเงิน (ไม่รวม VAT)', 'Total (excl. VAT)'), f2(c.net))}${tr(T('ภาษีมูลค่าเพิ่ม', 'VAT') + ' ' + VAT + '%', f2(c.vat))}${tr(T('รวมทั้งสิ้น (รวม VAT ' + VAT + '%)', 'Grand Total (incl. VAT ' + VAT + '%)'), '฿' + f2(c.grand), 'tot g')}</tbody></table>
    <div class="tm"><b>${T('เงื่อนไข', 'Terms & Conditions')}</b><ul>
      <li>${T('ราคาข้างต้นเป็นเงินบาท', 'Prices are in Thai Baht')} — ${T('รวมทั้งสิ้นเป็นราคารวม VAT ' + VAT + '% แล้ว', 'grand total includes VAT ' + VAT + '%')}</li>
      ${q.valid ? `<li>${T('ยืนราคา', 'Validity')} ${esc(q.valid)} ${T('วัน', 'days')}${until ? ' (' + T('ถึงวันที่', 'until') + ' ' + until + ')' : ''}</li>` : ''}${q.lead ? `<li>${T('ระยะเวลาดำเนินการ', 'Lead time')}: ${esc(q.lead)}</li>` : ''}
      ${A.length ? `<li>${T('ราคานี้จัดทำตามแบบแนบท้าย ' + A.length + ' แผ่น — งานนอกเหนือจากแบบแนบถือเป็นงานเพิ่ม ต้องมีเอกสารงานเพิ่ม (VO) ลงนามก่อนดำเนินการ', 'This quotation is based on the ' + A.length + ' attached drawing(s); any work beyond them is a variation and requires a signed Variation Order before proceeding')}</li>` : ''}</ul>
      ${q.pay ? `<b>${T('การชำระเงิน', 'Payment Terms')}</b><div style="white-space:pre-line">${esc(q.pay)}</div>` : ''}${lines(q.assume).length ? `<b>${T('ข้อสมมติฐาน', 'Assumptions')}</b>${ul(q.assume)}` : ''}${lines(q.excl).length ? `<b>${T('ไม่รวมในราคา', 'Exclusions')}</b>${ul(q.excl)}` : ''}</div>
    <div class="sg"><div>${esc(q.byFull || q.by || '')}<br>${T('ผู้เสนอราคา', 'Prepared by')}${q.byTitle ? ' · ' + esc(q.byTitle) : ''}</div><div>${draft ? '&nbsp;' : esc(q.apFull || q.apBy || '')}<br>${T('ผู้อนุมัติ', 'Approved by')}${!draft && q.apTitle ? ' · ' + esc(q.apTitle) : ''}</div><div>&nbsp;<br>${T('ลูกค้ายืนยันสั่งงาน · วันที่ ____/____/______', 'Customer acceptance · Date ____/____/______')}</div></div>
    ${A.map((a, i) => `<div class="ap"><h3>${T('เอกสารแนบ', 'Attachment')} ${i + 1}/${A.length} — ${esc(akOf(a.kind))} · ${esc(a.name)}${(a.marks || []).length ? ' — ' + T('กรอบแดง = พื้นที่ที่เสนอราคา', 'red frame = quoted area') : ''}</h3><div class="im"><img src="${esc(a.url)}" alt="">${markHtml(a, true)}</div></div>`).join('')}
    <div class="ft">${CO.th} · ${T('เลขประจำตัวผู้เสียภาษี', 'Tax ID')} ${CO.tax} · ${CO.web} — ${esc(q.no || 'DRAFT')}</div></div>`; }
function preview(q) { if (!$('pvCss')) { const s = document.createElement('style'); s.id = 'pvCss'; s.textContent = PV_CSS; document.head.appendChild(s); }
  const draft = !['approved', 'issued'].includes(q.status);
  $('printRoot').innerHTML = `<div id="pv"><div class="bar"><b>${esc(q.no || 'ร่าง')} · เอกสารลูกค้า${draft ? ' (DRAFT — ยังส่งลูกค้าไม่ได้)' : ''}</b>${q.form === 'owner' ? '<button data-pv="tsv">คัดลอกตาราง (วางในฟอร์ม Owner)</button>' : ''}<button class="g" data-pv="print">พิมพ์ / บันทึก PDF</button><button data-pv="close">✕ ปิด</button></div>${docHtml(q)}</div>`;
  $('printRoot').onclick = (e) => { const b = e.target.closest('[data-pv]'); if (!b) return; if (b.dataset.pv === 'close') $('printRoot').innerHTML = ''; else if (b.dataset.pv === 'tsv') copyTsv(q); else window.print(); };
}
// Type 1 (ใช้ฟอร์มของ Owner): คัดลอกตารางเป็นข้อความคั่นแท็บ — วางใน Excel / Google Sheet ได้ทันที
async function copyTsv(q) { const c = calc(q); let n = 0; const R = [['ที่', 'รายการ', 'สเปก', 'หน่วย', 'จำนวน', 'ราคา/หน่วย', 'รวม (บาท)']];
  SECS.forEach(s => { const L = c.rows.filter(r => (r.it.sec || 'other') === s[0]); if (!L.length) return; R.push(['', s[1], '', '', '', '', r2(L.reduce((a, r) => a + r.amt, 0))]);
    L.forEach(r => { n++; R.push([n, r.it.desc, r.it.spec, r.it.unit, r.qty, r.price, r.amt]); }); });
  R.push(['', 'รวมค่างาน', '', '', '', '', c.direct]); if (c.prelim) R.push(['', 'ค่าดำเนินการ (Preliminary) ' + fq(c.pre) + '%', '', '', '', '', c.prelim]); if (c.ohpAmt) R.push(['', 'OH&P ' + fq(c.ohp) + '%', '', '', '', '', c.ohpAmt]); if (c.disc) R.push(['', 'ส่วนลด', '', '', '', '', -c.disc]);
  R.push(['', 'รวมเป็นเงิน (ไม่รวม VAT)', '', '', '', '', c.net], ['', 'VAT ' + VAT + '%', '', '', '', '', c.vat], ['', 'รวมทั้งสิ้น (รวม VAT ' + VAT + '%)', '', '', '', '', c.grand]);
  const t = R.map(r => r.map(x => String(x == null ? '' : x).replace(/[\t\n]+/g, ' ')).join('\t')).join('\n');
  try { await navigator.clipboard.writeText(t); toast('คัดลอกตารางแล้ว — พร้อม copy ไปวางใน Excel / ฟอร์มของ Owner' + (['approved', 'issued'].includes(q.status) ? '' : ' (ยังเป็น DRAFT)'), 4500); }
  catch (e) { await dlg({ title: 'คัดลอกตารางเอง', text: 'เบราว์เซอร์ไม่ให้คัดลอกอัตโนมัติ — เลือกข้อความด้านล่างแล้วคัดลอก', input: { area: true, value: t }, cancel: false, ok: 'ปิด' }); } }

// =====================================================================
// ปุ่ม / เหตุการณ์
// =====================================================================
async function leaveEdit() { if (APP.dirty) { const r = await dlg({ title: 'ยังไม่ได้บันทึก', text: 'บันทึกร่างก่อนออกไหม?', ok: 'บันทึกแล้วออก', cancel: 'ออกโดยไม่บันทึก' }); if (r && !(await save(true))) return false; } APP.cur = null; APP.dirty = false; return true; }
document.addEventListener('click', async (e) => {
  const t = e.target;
  const z = t.closest('[data-zoom]'); if (z) { const q = APP.screen === 'edit' ? C() : VQ(); const a = q && (q.atts || []).find(x => x.id === z.dataset.zoom); if (a) openViewer(a, APP.screen === 'edit', APP.screen === 'edit' ? renderAtts : null); return; }
  const o = t.closest('[data-open]'); if (o) { openQ(o.dataset.open); return; }
  const f = t.closest('[data-f]'); if (f) { APP.filter = f.dataset.f; renderList(); return; }
  const nk = t.closest('[data-newkind]'); if (nk) { const n = blank(); n.kind = nk.dataset.newkind; openEdit(n); return; }
  const hs = t.closest('[data-stat]'); if (hs) { APP.filter = hs.dataset.stat; renderList(); $('listTop').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const kd = t.closest('[data-kind]'); if (kd && C()) { C().kind = kd.dataset.kind; touch(); $('edKind').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === kd)); return; }
  const ad = t.closest('[data-adel]'); if (ad && C()) { if (await ask('เอาแบบนี้ออกจากใบเสนอราคา?', '', 'เอาออก', true)) { C().atts = C().atts.filter(a => a.id !== ad.dataset.adel); touch(); renderAtts(); } return; }
  const rd = t.closest('[data-rdel]'); if (rd && C()) { const id = rd.closest('[data-row]').dataset.row; C().items = C().items.filter(i => i.id !== id); touch(); renderItems(); sumOut(); return; }
  if (t.closest('#edDrop')) { $('edFile').click(); return; }
  const b = t.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'toPm') { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back(); else location.href = pmUrl() + '#/work'; }
  else if (a === 'back') { if (APP.screen === 'edit' && !(await leaveEdit())) return; try { await loadAll(); } catch (x) {} renderList(); }
  else if (a === 'new') openEdit(blank());
  else if (a === 'toList') $('listTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
  else if (a === 'rowAdd') { const it = addRow({ sec: C().kind === 'furn' ? 'bi' : C().kind === 'damage' ? 'demo' : 'other' }); renderItems(); sumOut(); const r = $('edItems').querySelector(`[data-row="${it.id}"] textarea`); if (r) r.focus(); }
  else if (a === 'rateAdd') pickRate(); else if (a === 'tkAdd') pickTakeoff(); else if (a === 'tqAdd') pickQty();
  else if (a === 'aiRun') { pull(); aiRun(); } else if (a === 'aiAsk') { pull(); aiAsk(); } else if (a === 'aiAdd') aiAdd(); else if (a === 'aiTerms') aiTerms();
  else if (a === 'aiCopyQ') { const L = (C().ai && C().ai.questions) || []; try { await navigator.clipboard.writeText(L.map((x, i) => (i + 1) + '. ' + x).join('\n')); toast('คัดลอกคำถามแล้ว — นำไปออก RFI ได้'); } catch (x) { toast('คัดลอกไม่สำเร็จ'); } }
  else if (a === 'save') save(); else if (a === 'send') send(); else if (a === 'del') del();
  else if (a === 'preview') preview(pull());
  else if (a === 'vPrint') { const q = VQ(); if (q) preview(q); } else if (a === 'copyTsv') { const q = VQ(); if (q) copyTsv(q); }
  else if (a === 'approve') approve(); else if (a === 'ret') ret(); else if (a === 'recall') recall(); else if (a === 'issued') issued(); else if (a === 'cancel') cancelQ(); else if (a === 'revise') revise();
});
document.addEventListener('input', (e) => { const t = e.target, q = C();
  if (t.id === 'fQ') { APP.find = t.value; renderList(); $('fQ').focus(); return; }
  if (!q || APP.screen !== 'edit') return;
  if (BIND[t.id]) { q[BIND[t.id]] = t.value; touch(); return; }
  if (t.id === 'sPre') { q.prelimPct = t.value; touch(); sumOut(); return; } if (t.id === 'sOhp') { q.ohpPct = t.value; touch(); sumOut(); return; } if (t.id === 'sDisc') { q.discount = t.value; touch(); sumOut(); return; }
  const row = t.closest('[data-row]'); if (row && t.dataset.k) { const it = q.items.find(i => i.id === row.dataset.row); if (!it) return; const k = t.dataset.k;
    if (k === 'chk') it.chk = t.checked; else it[k] = t.value;
    if (k === 'rate' && it.rk) { it.rk = ''; const bd = [...row.querySelectorAll('.aib')].find(x => x.textContent === 'อัตรากลาง'); if (bd) bd.remove(); }   // แก้ราคาเอง = ไม่ใช่ราคาอัตรากลางแล้ว
    if (t.tagName === 'TEXTAREA') grow(t);
    if (k === 'qty' || k === 'rate') { row.querySelector('[data-amt]').textContent = f2(r2(num(it.qty) * num(it.rate))); itemsFoot(); sumOut(); }
    if (k === 'chk') { const bd = row.querySelector('.aib'); if (bd) { bd.classList.toggle('ok', it.chk); bd.classList.toggle('low', !it.chk && it.ai && it.ai.conf === 'low'); } }
    touch(); if (k === 'chk') sumOut(); }
});
document.addEventListener('change', (e) => { const t = e.target, q = C();
  if (t.id === 'fScope') { APP.scope = t.value; renderList(); return; }
  if (t.id === 'edFile') { const F = [...t.files]; t.value = ''; addFiles(F); return; }
  if (!q || APP.screen !== 'edit') return;
  if (t.id === 'edScope') { q.pid = t.value || ''; const p = APP.projects.find(x => x.id === q.pid); if (p) { if (!String(q.cust || '').trim()) { q.cust = p.client || ''; $('edCust').value = q.cust; } if (!String(q.site || '').trim()) { q.site = projName(p); $('edSite').value = q.site; } } $('edSub').textContent = scopeName(q); touch(); return; }
  if (t.id === 'sShow') { q.ohpShow = t.checked; touch(); sumOut(); return; }
  if (t.dataset.ak) { const a = q.atts.find(x => x.id === t.dataset.ak); if (a) { a.kind = t.value; touch(); } return; }
  if (t.dataset.aai) { const a = q.atts.find(x => x.id === t.dataset.aai); if (a) { a.inAi = t.checked; touch(); } return; }
  if (t.dataset.apr) { const a = q.atts.find(x => x.id === t.dataset.apr); if (a) { a.inPrint = t.checked; touch(); } return; }
  if (t.dataset.aipk != null && q.ai) { q.ai.pick[Number(t.dataset.aipk)] = t.checked; renderAi(); return; }
  const row = t.closest('[data-row]'); if (row && t.dataset.k === 'sec') { renderItems(); return; }   // ย้ายหมวด = จัดกลุ่มใหม่
});
(function dropBind() { const d = $('edDrop'); ['dragenter', 'dragover'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.remove('on'); })); d.addEventListener('drop', (e) => { addFiles([...(e.dataTransfer.files || [])]); });
  document.addEventListener('paste', (e) => { if (APP.screen !== 'edit' || !$('dlg').hidden || !$('vw').hidden) return; const F = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => /^image\//.test(f.type)); if (F.length) { e.preventDefault(); addFiles(F); } }); })();
window.addEventListener('beforeunload', (e) => { if (APP.dirty && APP.screen === 'edit') { e.preventDefault(); e.returnValue = ''; } });
window.__QM = { calc, parseAi, nextNo, warnsOf, ver: QM_VER };   // ใช้ตรวจสอบในชุดทดสอบ
boot();
})();
