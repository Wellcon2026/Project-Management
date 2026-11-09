/* =====================================================================
   Wellcon PM — Claim · เคลมความเสียหาย (Damage Claim)
   ---------------------------------------------------------------------
   • หน้าแยกจาก index.html (ไม่แตะโค้ด PM หลัก) เปิดจากเมนู "Claim · เคลมความเสียหาย" ในหน้าโครงการ
     claim.html?pid=<project id>  (+ &env=staging = ข้อมูลทดสอบ)
   • Login: ใช้ session ที่ Wellcon PM จำไว้ในเครื่อง (wellcon_pm_session_v1) — ไม่มีระบบ login ใหม่
   • ข้อมูล: app_state 'damageClaims' = { <pid>: [claim, ...] }  · บันทึกทีละเคลม (อ่าน-รวม-เขียน)
             app_state 'claimRates'   = { trades:[{ n, rate }], ohp, vat }  (อัตราค่าแรงที่ใช้เรียกเก็บลูกค้า)
     PM หลักไม่อ่าน/ไม่เขียน 2 คีย์นี้ → ไม่ชนกับการ sync ของ PM
   • รูป: อัปโหลดขึ้น Storage bucket general-photo/claims/<pid>/<claimId>/ — เก็บเฉพาะลิงก์ (แถวข้อมูลเล็ก ไม่หายจาก realtime)
   • ตัวเลขเงินเป็น "ราคาเรียกเก็บลูกค้า" เท่านั้น — ห้ามใส่ต้นทุน / กำไรจริงของบริษัทในหน้านี้
   ===================================================================== */
(() => {
'use strict';
const CL_VER = 'v1.0.0';
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || /^(localhost|127\.0\.0\.1)$/.test(h)) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
// ส่งเคลม / บันทึกผลอนุมัติ / วางบิล / รับเงิน — เฉพาะตำแหน่งที่ดูแลเงินของโครงการ
const MONEY_ROLES = ['pm', 'pm_mgr', 'qs', 'qs_mgr', 'director', 'superadmin', 'fin_mgr', 'finance', 'account'];
const RATE_ROLES = ['pm_mgr', 'qs', 'qs_mgr', 'director', 'superadmin'];
const BUCKET = 'general-photo', KEY = 'damageClaims', RKEY = 'claimRates';
const PIC_MAX = 12;

const CAUSES = [['other_con', '🏗', 'ผู้รับเหมาอื่นทำเสียหาย'], ['flood', '🌊', 'น้ำท่วม / น้ำเข้า'], ['pipe', '🚰', 'ท่อรั่ว / ท่อแตก'],
  ['ac', '❄️', 'น้ำแอร์หยด / Condensation'], ['cut_elec', '⚡', 'เจาะ / รื้อ เพื่องานไฟฟ้า'], ['cut_mep', '🔧', 'เจาะ / รื้อ เพื่องานประปา / แอร์'],
  ['owner', '🏨', 'เจ้าของ / ผู้ใช้อาคาร'], ['other', '📌', 'อื่น ๆ']];
const CM = Object.fromEntries(CAUSES.map(c => [c[0], c]));
const WORKS = ['ฝ้า', 'ผนัง', 'พื้น', 'Built-in / เฟอร์นิเจอร์', 'ประตู / หน้าต่าง', 'งานสี / ผิวสำเร็จ', 'อื่น ๆ'];
const ST = [['draft', 'บันทึกความเสียหาย', '#6E695E', '#F2EDE3'], ['notified', 'แจ้งลูกค้าแล้ว', '#2A7DA3', '#E1EEF4'],
  ['submitted', 'ส่งเคลมแล้ว · รอผล', '#C2681E', '#FBEEDF'], ['approved', 'ลูกค้าอนุมัติ', '#2E7D46', '#E7F3EA'],
  ['invoiced', 'วางบิลแล้ว', '#8A6D3B', '#F6EEDC'], ['paid', 'รับเงินแล้ว', '#1F6B3A', '#D6EEDC'], ['rejected', 'ไม่อนุมัติ', '#C4442E', '#FDECEC']];
const SM = Object.fromEntries(ST.map(s => [s[0], s]));
const FLOW = ['draft', 'notified', 'submitted', 'approved', 'invoiced', 'paid'];
const STEP_TH = { draft: 'บันทึก', notified: 'แจ้งลูกค้า', submitted: 'ส่งเคลม', approved: 'อนุมัติ', invoiced: 'วางบิล', paid: 'รับเงิน' };
const CHANNELS = ['หนังสือ', 'อีเมล', 'LINE', 'ประชุมหน้างาน', 'โทรศัพท์'];
const DEF_TRADES = ['ช่างไม้', 'ช่างฝ้า / ยิปซัม', 'ช่างสี', 'ช่างกระเบื้อง / หิน', 'ช่างไฟฟ้า', 'ช่างประปา', 'หัวหน้าช่าง / โฟร์แมน', 'ผู้ช่วยช่าง / กรรมกร'];
const LT = { lab: ['👷', 'ค่าแรง', 'ty-lab'], mat: ['🧱', 'วัสดุ', 'ty-mat'], oth: ['🛠', 'เครื่องมือ / อื่น ๆ', 'ty-oth'] };

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;
const baht = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bahtK = (n) => { n = Number(n || 0); return Math.abs(n) >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : baht(n); };
const pad = (n) => String(n).padStart(2, '0');
const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const dmy = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : '—'; };
const daysSince = (iso) => { if (!iso) return null; const d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return null; return Math.floor((Date.now() - d.getTime()) / 864e5); };
const hoursSince = (iso) => { if (!iso) return null; const d = new Date(iso); return isNaN(d) ? null : (Date.now() - d.getTime()) / 36e5; };
const when = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const uid = () => 'cl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const rowOf = (r) => ({ ...(r.data || {}), id: r.id, ...(r.project ? { project: r.project } : {}) });
const seesAll = (a) => a.allProj === true || (a.allProj !== false && ALL_SCOPE.includes(a.roleKey));
const projName = (p) => p ? (p.name || p.project || p.title || p.id) : '';
const projCode = (p) => p ? (p.code || p.jobNo || p.no || '') : '';
const clone = (o) => JSON.parse(JSON.stringify(o));
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');

// ---------- state ----------
const APP = { me: null, acc: null, projects: [], pid: null, proj: null, claims: [], rates: null, base: {},
  filter: 'all', q: '', cur: null, saveT: null, saving: false, dirty: false, ratesOpen: false, busyPic: '' };
const canMoney = () => !!APP.me && MONEY_ROLES.includes(APP.me.role);
const canRates = () => !!APP.me && RATE_ROLES.includes(APP.me.role);

// ---------- app_state (อ่าน-รวม-เขียน ทีละคีย์ ต่อคิว) ----------
async function stRead(key) { const r = await sb.from('app_state').select('data').eq('id', key).maybeSingle(); if (r.error) throw r.error; return (r.data && r.data.data && r.data.data.v) || {}; }
let wq = Promise.resolve();
function stWrite(key, fn) {
  const p = wq.then(async () => { const m = { ...(await stRead(key)) }; const out = fn(m);
    const up = await sb.from('app_state').upsert([{ id: key, data: { v: out }, updated_by: APP.me.email || null }], { onConflict: 'id' });
    if (up.error) throw up.error; return out; });
  wq = p.catch(() => {}); return p;
}

// ---------- คำนวณเงิน ----------
function lineAmt(l) { if (l.t === 'lab') return num(l.men) * num(l.days) * num(l.rate); if (l.t === 'mat') return num(l.qty) * num(l.price); return num(l.amt); }
function calc(c) {
  const o = { lab: 0, mat: 0, oth: 0 }; (c.lines || []).forEach(l => { o[l.t] = (o[l.t] || 0) + lineAmt(l); });
  const sub = o.lab + o.mat + o.oth, ohp = sub * num(c.ohp) / 100, pre = sub + ohp, vat = c.vatOn === false ? 0 : pre * 0.07;
  return { ...o, sub: r2(sub), ohp: r2(ohp), pre: r2(pre), vat: r2(vat), total: r2(pre + vat) };
}
const F = (c, k) => (c.flow && c.flow[k]) || {};
const claimAmt = (c) => FLOW.indexOf(c.st) >= 2 || c.st === 'rejected' ? num(F(c, 'submitted').amt) : calc(c).total;
const apprAmt = (c) => ['approved', 'invoiced', 'paid'].includes(c.st) ? num(F(c, 'approved').amt) : 0;
const paidAmt = (c) => c.st === 'paid' ? num(F(c, 'paid').amt) : 0;
function alertOf(c) {
  if (c.st === 'draft') { const h = hoursSince(c.foundAt || c.t); if (h != null && h > 48) return '⚠ ยังไม่แจ้งลูกค้า — เกิน 48 ชม. นับจากพบความเสียหาย'; return h != null ? 'แจ้งลูกค้าภายใน ' + Math.max(0, Math.ceil(48 - h)) + ' ชม.' : ''; }
  if (c.st === 'notified') { const d = daysSince(F(c, 'notified').date); return d != null && d > 7 ? '⚠ แจ้งแล้ว ' + d + ' วัน — ยังไม่ส่งเคลม' : ''; }
  if (c.st === 'submitted') { const d = daysSince(F(c, 'submitted').date); return d != null && d > 14 ? '⚠ รอผลพิจารณา ' + d + ' วัน — ติดตามลูกค้า' : ''; }
  if (c.st === 'approved') { const d = daysSince(F(c, 'approved').date); return d != null && d > 14 ? '⚠ อนุมัติแล้ว ' + d + ' วัน — ยังไม่วางบิล' : ''; }
  if (c.st === 'invoiced') { const d = daysSince(F(c, 'invoiced').date); return d != null && d > 30 ? '⚠ ค้างรับ ' + d + ' วันหลังวางบิล' : ''; }
  return '';
}
const needsAct = (c) => /^⚠/.test(alertOf(c)) || c.st === 'draft';

// =====================================================================
// boot
// =====================================================================
function msg(html) { $('app').innerHTML = `${IS_STG ? '<div class="stg">ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง</div>' : ''}<div class="msg"><div class="card" style="display:grid;gap:8px">${html}</div></div>`; }
async function boot() {
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    const goPm = `<a class="btn pri" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="${pmUrl()}">ไปหน้า Wellcon PM</a>`;
    if (!ok) { msg(`<b>ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้</b><span style="color:var(--mut);font-size:14px">เปิด Wellcon PM และเข้าสู่ระบบก่อน แล้วกดเมนู “Claim · เคลมความเสียหาย” จากหน้าโครงการ</span>${goPm}`); return; }
    const [a, p] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('projects').select('id,project,data')]);
    if (a.error) throw a.error; if (p.error) throw p.error;
    const accounts = (a.data || []).map(rowOf); const live = (p.data || []).map(rowOf).filter(x => !x.deleted && !x.del);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && accounts.find(x => norm(x.email) === sess.email && x.active !== false && !x.disabled);
    if (!acc) { msg(`<b>ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้</b><span style="color:var(--mut);font-size:14px">เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิดเมนู “Claim · เคลมความเสียหาย” จากหน้าโครงการ</span>${goPm}`); return; }
    APP.acc = acc; APP.me = { name: nickOf(acc), email: norm(acc.email), role: acc.roleKey || '' };
    APP.projects = live.filter(x => seesAll(acc) || (acc.projects || []).includes(x.id));
    const pid = new URLSearchParams(location.search).get('pid');
    if (pid && !APP.projects.some(x => x.id === pid)) { msg(`<b>คุณไม่ได้รับมอบหมายในโครงการนี้</b><span style="color:var(--mut);font-size:14px">ติดต่อผู้ดูแลระบบถ้าต้องการสิทธิ์</span>${goPm}`); return; }
    if (pid) await openProject(pid); else renderProjects();
  } catch (e) {
    console.error(e); msg(`<b>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</b><span style="color:var(--mut);font-size:14px">${esc((e && e.message) || e)}</span><button class="btn pri" onclick="location.reload()">ลองใหม่</button>`);
  }
}
function renderProjects() {
  const L = APP.projects;
  $('app').innerHTML = hdr('Claim · เคลมความเสียหาย', 'เลือกโครงการ') + `<main><div class="list">${L.length ? L.map(p => `<button class="cc" data-act="proj" data-id="${esc(p.id)}"><div class="r1"><span class="tt">${esc(projName(p))}</span></div><div class="r2">${esc(projCode(p))}</div></button>`).join('') : '<p class="empty">ยังไม่มีโครงการที่คุณถูก assign</p>'}</div><p class="ver">Claim ${CL_VER}</p></main>`;
}
async function openProject(pid) {
  APP.pid = pid; APP.proj = APP.projects.find(x => x.id === pid) || null;
  const u = new URL(location.href); u.searchParams.set('pid', pid); history.replaceState(null, '', u);
  $('app').innerHTML = hdr(projName(APP.proj), 'Claim · เคลมความเสียหาย') + '<div class="spin"></div>';
  await reload();
}
async function reload() {
  const [m, r] = await Promise.all([stRead(KEY), stRead(RKEY)]);
  APP.claims = Array.isArray(m[APP.pid]) ? m[APP.pid] : [];
  APP.claims.forEach(c => { APP.base[c.id] = c.at || ''; });
  APP.rates = { trades: (r.trades && r.trades.length) ? r.trades : DEF_TRADES.map(n => ({ n, rate: '' })), ohp: r.ohp != null ? r.ohp : 15, by: r.by || '', at: r.at || '' };
  render();
}

// =====================================================================
// หน้ารายการ
// =====================================================================
function hdr(title, sub, extra) {
  return `${IS_STG ? '<div class="stg">ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง</div>' : ''}<div class="hdr"><button class="back" data-act="back" title="กลับ Wellcon PM">‹</button>
    <div class="tt"><b>${esc(title)}</b><span>${esc(sub || '')}</span></div>${extra || ''}</div>`;
}
function summary() {
  const L = APP.claims, live = L.filter(c => c.st !== 'rejected');
  const est = live.filter(c => FLOW.indexOf(c.st) < 2).reduce((s, c) => s + calc(c).total, 0);
  const sent = L.filter(c => FLOW.indexOf(c.st) >= 2 || c.st === 'rejected').reduce((s, c) => s + claimAmt(c), 0);
  const appr = L.reduce((s, c) => s + apprAmt(c), 0), paid = L.reduce((s, c) => s + paidAmt(c), 0);
  const dReq = L.reduce((s, c) => s + (FLOW.indexOf(c.st) >= 2 || c.st === 'rejected' ? num(F(c, 'submitted').days) : 0), 0);
  const dOk = L.reduce((s, c) => s + (['approved', 'invoiced', 'paid'].includes(c.st) ? num(F(c, 'approved').days) : 0), 0);
  const act = L.filter(needsAct).length;
  const pP = appr ? Math.round(paid / appr * 100) : 0, pA = sent ? Math.round(appr / sent * 100) : 0;
  return `<div class="kpis">
    <div class="kpi"><b>${L.length}</b><span>เคลมทั้งหมด${act ? ` · <span style="color:var(--red);font-weight:700">ต้องทำ ${act}</span>` : ''}</span></div>
    <div class="kpi a"><b>${bahtK(est)}</b><span>ประเมินแล้ว · ยังไม่ส่งเคลม</span></div>
    <div class="kpi bl"><b>${bahtK(sent)}</b><span>ส่งเคลมแล้ว</span></div>
    <div class="kpi g"><b>${bahtK(appr)}</b><span>ลูกค้าอนุมัติ${sent ? ' · ' + pA + '%' : ''}</span></div>
    <div class="kpi g"><b>${bahtK(paid)}</b><span>รับเงินแล้ว</span></div>
    <div class="kpi r"><b>${bahtK(appr - paid)}</b><span>ค้างรับ</span></div>
    <div class="kpi"><b>${dReq} / ${dOk} วัน</b><span>ขอขยายเวลา / อนุมัติ</span></div>
  </div>
  <div class="card" style="margin-top:10px;padding:10px 14px"><div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--mut)"><span>ความคืบหน้าการเก็บเงินเคลม (รวม VAT)</span><span>รับแล้ว ${pP}% ของยอดอนุมัติ</span></div>
    <div class="bar"><i style="width:${sent ? Math.round(paid / sent * 100) : 0}%;background:var(--green)"></i><i style="width:${sent ? Math.round((appr - paid) / sent * 100) : 0}%;background:#9CCBA9"></i><i style="width:${sent ? Math.max(0, 100 - Math.round(appr / sent * 100)) : 0}%;background:#F0D9BC"></i></div>
    <div style="display:flex;gap:14px;font-size:11.5px;color:var(--mut);margin-top:6px;flex-wrap:wrap"><span>■ <span style="color:var(--green)">รับเงินแล้ว</span></span><span>■ <span style="color:#5E9A70">อนุมัติ · ค้างรับ</span></span><span>■ <span style="color:var(--amber)">รอผล / ไม่อนุมัติ</span></span></div></div>`;
}
function card(c) {
  const s = SM[c.st] || SM.draft, cz = CM[c.cause] || CM.other, al = alertOf(c), ph = ((c.photos || {}).before || []).slice(0, 3);
  const k = calc(c), st = FLOW.indexOf(c.st);
  return `<button class="cc" data-act="open" data-id="${esc(c.id)}" style="border-left-color:${s[2]}">
    <div class="r1"><span class="no">${esc(c.no || '—')}</span><span class="tt">${esc(c.title || '(ยังไม่ใส่หัวข้อ)')}</span><span class="pill" style="background:${s[3]};color:${s[2]}">${esc(s[1])}</span></div>
    <div class="r2"><span>${cz[1]} ${esc(cz[2])}</span>${c.area ? `<span>· 📍 ${esc(c.area)}</span>` : ''}<span>· พบ ${dmy(c.found)}</span>${c.party ? `<span>· ${esc(c.party)}</span>` : ''}</div>
    <div class="money">${st < 2 && c.st !== 'rejected' ? `<span>ประเมิน <b>${baht(k.total)}</b></span>` : `<span>เคลม <b>${baht(claimAmt(c))}</b></span>`}
      ${apprAmt(c) ? `<span style="color:var(--green)">อนุมัติ <b>${baht(apprAmt(c))}</b></span>` : ''}${paidAmt(c) ? `<span style="color:#1F6B3A">รับแล้ว <b>${baht(paidAmt(c))}</b></span>` : ''}
      ${num(c.eot) ? `<span>⏱ ${num(c.eot)} วัน</span>` : ''}</div>
    ${ph.length ? `<div class="ph">${ph.map(u => `<img src="${esc(u)}" loading="lazy" alt="">`).join('')}</div>` : ''}
    ${/^⚠/.test(al) ? `<div class="warn">${esc(al)}</div>` : ''}</button>`;
}
function render() {
  if (APP.cur) { renderSheet(); return; }
  const L = APP.claims, q = norm(APP.q), f = APP.filter;
  const cnt = (k) => L.filter(c => k === 'act' ? needsAct(c) : c.st === k).length;
  const view = L.filter(c => (f === 'all' || (f === 'act' ? needsAct(c) : c.st === f)) &&
    (!q || norm([c.no, c.title, c.area, c.party, c.desc, (CM[c.cause] || [])[2], (c.works || []).join(' ')].join(' ')).includes(q)))
    .sort((a, b) => (needsAct(b) - needsAct(a)) || String(b.found || '').localeCompare(String(a.found || '')) || String(b.no || '').localeCompare(String(a.no || '')));
  const rateBtn = `<button class="hb" data-act="rates">⚙ อัตราค่าแรง</button>`;
  $('app').innerHTML = hdr(projName(APP.proj), 'Claim · เคลมความเสียหาย' + (projCode(APP.proj) ? ' · ' + projCode(APP.proj) : ''), rateBtn) + `<main>
    ${summary()}
    <div class="sec">รายการเคลม<span class="ln"></span></div>
    <input class="inp" type="search" id="q" placeholder="ค้นหา เลขที่ · หัวข้อ · พื้นที่ · ผู้ทำเสียหาย · สาเหตุ" value="${esc(APP.q)}" style="margin-bottom:8px">
    <div class="scrollx" style="margin-bottom:10px">
      <button class="chip ${f === 'all' ? 'on' : ''}" data-act="f" data-f="all">ทั้งหมด <b>${L.length}</b></button>
      <button class="chip ${f === 'act' ? 'on' : ''}" data-act="f" data-f="act" style="${f === 'act' ? '' : 'color:var(--red);border-color:#F0C9C0'}">⚠ ต้องทำ <b>${cnt('act')}</b></button>
      ${ST.map(s => `<button class="chip ${f === s[0] ? 'on' : ''}" data-act="f" data-f="${s[0]}">${esc(s[1])} <b>${cnt(s[0])}</b></button>`).join('')}
    </div>
    <div class="list">${view.length ? view.map(card).join('') : `<p class="empty" style="grid-column:1/-1">${L.length ? 'ไม่มีรายการในตัวกรองนี้' : 'ยังไม่มีเคลม · กดปุ่ม <b>+ แจ้งความเสียหาย</b> เมื่อพบงานของเราเสียหายจากผู้อื่น น้ำรั่ว น้ำแอร์ หรือการเจาะรื้อ'}</p>`}</div>
    <div class="info" style="margin-top:16px">ขั้นตอน: <b>1</b> ถ่ายรูป + บันทึก → <b>2</b> แจ้งลูกค้าภายใน 48 ชม. → <b>3</b> ประเมินค่าซ่อม + วันที่ขอขยาย → <b>4</b> ส่งหนังสือเคลม (DRAFT ให้ผู้บริหารตรวจก่อนส่ง) → <b>5</b> บันทึกผลอนุมัติ → <b>6</b> วางบิล → <b>7</b> รับเงิน</div>
    <p class="ver">Claim ${CL_VER}${IS_STG ? ' · STAGING' : ''}</p></main>
    <button class="fab" data-act="new">+ แจ้งความเสียหาย</button>${APP.ratesOpen ? ratesSheet() : ''}`;
}

// =====================================================================
// แผ่นรายละเอียดเคลม
// =====================================================================
function newClaim() {
  const L = APP.claims; let n = 0; L.forEach(c => { const m = /(\d+)$/.exec(c.no || ''); if (m) n = Math.max(n, +m[1]); });
  const code = projCode(APP.proj);
  return { id: uid(), no: 'CLM-' + (code ? code + '-' : '') + String(n + 1).padStart(3, '0'), st: 'draft', title: '', found: isoToday(), foundAt: new Date().toISOString(),
    area: '', works: [], cause: '', party: '', desc: '', photos: { before: [], after: [] }, lines: [], ohp: APP.rates ? APP.rates.ohp : 15, vatOn: true,
    eot: '', eotWhy: '', flow: {}, log: [], by: APP.me.name, t: new Date().toISOString(), _new: true };
}
const ro = () => false;   // ทุกคนในโครงการบันทึกความเสียหายได้ · ขั้นเงินเช็ก canMoney() แยก
function inp(path, val, opt) { opt = opt || {};
  const a = `data-f="${path}" ${opt.num ? 'inputmode="decimal"' : ''} ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''} ${opt.dis ? 'disabled' : ''}`;
  if (opt.area) return `<textarea class="inp" ${a} rows="${opt.rows || 3}">${esc(val)}</textarea>`;
  return `<input class="inp" type="${opt.type || 'text'}" ${a} value="${esc(val)}" ${opt.style ? `style="${opt.style}"` : ''}>`; }
function pics(kind, label) {
  const L = ((APP.cur.photos || {})[kind]) || [], busy = APP.busyPic === kind;
  return `<div class="lbl">${label} <span class="hint">${L.length}/${PIC_MAX}</span></div><div class="pics">
    ${L.map((u, i) => `<div class="pic"><img src="${esc(u)}" data-act="lb" data-u="${esc(u)}" alt=""><button class="del" data-act="picdel" data-k="${kind}" data-i="${i}" title="ลบรูป">×</button></div>`).join('')}
    ${busy ? '<div class="pic busy">กำลังอัปโหลด…</div>' : ''}
    ${L.length < PIC_MAX && !busy ? `<label class="pic add"><i>📷</i>ถ่าย / เลือกรูป<input type="file" accept="image/*" multiple data-pic="${kind}"></label>` : ''}</div>`;
}
function costLine(l, i) {
  const t = LT[l.t] || LT.oth, tr = (APP.rates && APP.rates.trades) || [];
  let row = '';
  if (l.t === 'lab') row = `<div class="row lab"><label>ตำแหน่งช่าง<select class="inp" data-f="lines.${i}.n" data-trade="${i}"><option value="">— เลือก —</option>${tr.map(x => `<option value="${esc(x.n)}" ${x.n === l.n ? 'selected' : ''}>${esc(x.n)}${num(x.rate) ? ' · ' + baht(x.rate) + '/วัน' : ''}</option>`).join('')}${l.n && !tr.some(x => x.n === l.n) ? `<option selected value="${esc(l.n)}">${esc(l.n)}</option>` : ''}</select></label>
      <label>จำนวนคน${inp(`lines.${i}.men`, l.men, { num: 1, ph: '0' })}</label><label>จำนวนวัน${inp(`lines.${i}.days`, l.days, { num: 1, ph: '0' })}</label><label>฿ / คน / วัน${inp(`lines.${i}.rate`, l.rate, { num: 1, ph: '0.00' })}</label></div>`;
  else if (l.t === 'mat') row = `<div class="row mat"><label>รายการวัสดุ${inp(`lines.${i}.n`, l.n, { ph: 'เช่น แผ่นยิปซัม 9 มม.' })}</label><label>จำนวน${inp(`lines.${i}.qty`, l.qty, { num: 1, ph: '0' })}</label><label>หน่วย${inp(`lines.${i}.unit`, l.unit, { ph: 'แผ่น / ตร.ม.' })}</label><label>฿ / หน่วย${inp(`lines.${i}.price`, l.price, { num: 1, ph: '0.00' })}</label></div>`;
  else row = `<div class="row oth"><label>รายการ${inp(`lines.${i}.n`, l.n, { ph: 'เช่น นั่งร้าน · ขนย้าย · ทำความสะอาด' })}</label><label>จำนวนเงิน (฿)${inp(`lines.${i}.amt`, l.amt, { num: 1, ph: '0.00' })}</label></div>`;
  return `<div class="cl"><div class="top"><span class="ty ${t[2]}">${t[0]} ${t[1]}</span><span class="sum" data-ls="${i}">${baht(lineAmt(l))}</span><button class="rm" data-act="lrm" data-i="${i}" title="ลบรายการ">×</button></div>${row}</div>`;
}
function totals() {
  const c = APP.cur, k = calc(c);
  return `<div class="tot" id="tot"><div><span>ค่าแรง</span><span>${baht(k.lab)}</span></div><div><span>วัสดุ</span><span>${baht(k.mat)}</span></div><div><span>เครื่องมือ / อื่น ๆ</span><span>${baht(k.oth)}</span></div>
    <div><b>รวมค่าซ่อม</b><b>${baht(k.sub)}</b></div>
    <div><span class="pct">ค่าดำเนินการ + กำไร (OH&amp;P)${inp('ohp', c.ohp, { num: 1, style: 'width:74px' })}%</span><span>${baht(k.ohp)}</span></div>
    <div><b>รวมก่อน VAT</b><b>${baht(k.pre)}</b></div>
    <div><label class="pct" style="cursor:pointer"><input type="checkbox" data-f="vatOn" ${c.vatOn === false ? '' : 'checked'}> VAT 7%</label><span>${baht(k.vat)}</span></div>
    <div class="big"><span>ยอดเคลม ${c.vatOn === false ? '(ไม่รวม VAT)' : '(รวม VAT)'}</span><span>${baht(k.total)}</span></div>
    <div class="mut">ราคาเรียกเก็บลูกค้า · ห้ามใส่ต้นทุนจริงของบริษัท · ตรวจตัวเลขกับ QS ก่อนส่ง</div></div>`;
}
function stepper(c) {
  const rej = c.st === 'rejected', cur = rej ? 3 : FLOW.indexOf(c.st);
  return `<div class="steps">${FLOW.map((k, i) => { const cls = rej && i === 3 ? 'rej' : (i < cur || (i === cur && c.st === 'paid')) ? 'done' : i === cur ? 'cur' : '';
    return `<div class="stp ${cls}"><i>${cls === 'done' ? '✓' : cls === 'rej' ? '✕' : i + 1}</i>${rej && i === 3 ? 'ไม่อนุมัติ' : STEP_TH[k]}</div>`; }).join('')}</div>`;
}
function stageBox(c) {
  const st = c.st, money = canMoney(), k = calc(c), d = APP.stg || {};
  const done = (key, html) => F(c, key).date ? `<div class="okbox">${html}</div>` : '';
  const lock = !money ? `<div class="info">ขั้นนี้บันทึกได้เฉพาะ PM / QS / ผู้บริหาร / การเงิน — แจ้ง PM ของโครงการ</div>` : '';
  let h = '';
  const n = F(c, 'notified'), s = F(c, 'submitted'), a = F(c, 'approved'), r = F(c, 'rejected'), v = F(c, 'invoiced'), p = F(c, 'paid');
  if (n.date) h += done('notified', `✓ แจ้งลูกค้าแล้ว ${dmy(n.date)} · ${esc(n.ch || '')}${n.to ? ' · ถึง ' + esc(n.to) : ''}${n.ref ? ' · อ้างอิง ' + esc(n.ref) : ''} <span style="opacity:.7">(${esc(n.by || '')})</span>`);
  if (s.date) h += done('submitted', `✓ ส่งเคลม ${dmy(s.date)} · <b>${baht(s.amt)}</b>${num(s.days) ? ' · ขอขยาย ' + num(s.days) + ' วัน' : ''}${s.ref ? ' · หนังสือ ' + esc(s.ref) : ''} <span style="opacity:.7">(${esc(s.by || '')})</span>`);
  if (a.date && st !== 'rejected') h += done('approved', `✓ ลูกค้าอนุมัติ ${dmy(a.date)} · <b>${baht(a.amt)}</b>${num(a.days) ? ' · ' + num(a.days) + ' วัน' : ''}${a.who ? ' · โดย ' + esc(a.who) : ''}${num(s.amt) && num(a.amt) < num(s.amt) ? ` · <span style="color:var(--amber)">อนุมัติบางส่วน ${Math.round(num(a.amt) / num(s.amt) * 100)}%</span>` : ''}`);
  if (st === 'rejected') h += `<div class="warnbox">✕ ลูกค้าไม่อนุมัติ ${dmy(r.date)}${r.why ? ' · ' + esc(r.why) : ''}</div>`;
  if (v.date) h += done('invoiced', `✓ วางบิล ${dmy(v.date)} · <b>${baht(v.amt)}</b>${v.ref ? ' · เลขที่ ' + esc(v.ref) : ''}`);
  if (p.date) h += done('paid', `✓ รับเงิน ${dmy(p.date)} · <b>${baht(p.amt)}</b>${num(v.amt) && num(p.amt) < num(v.amt) ? ` · <span style="color:var(--red)">ขาดอีก ${baht(num(v.amt) - num(p.amt))}</span>` : ''}`);
  const f = (key, label, val, opt) => `<label style="display:flex;flex-direction:column;font-size:12px;color:var(--mut);gap:3px">${label}<input class="inp" data-s="${key}" type="${(opt || {}).type || 'text'}" value="${esc(d[key] != null ? d[key] : val)}" ${(opt || {}).num ? 'inputmode="decimal"' : ''} ${(opt || {}).ph ? `placeholder="${esc(opt.ph)}"` : ''}></label>`;
  if (st === 'draft') {
    h += `<div class="stage"><h4>2 · แจ้งลูกค้า / ผู้แทนลูกค้า</h4><div style="font-size:12.5px;color:var(--mut)">แจ้งภายใน 48 ชม. หลังพบ พร้อมรูป — ให้ลูกค้ารับทราบก่อนเริ่มซ่อม (เก็บหลักฐานการเคลม)</div>
      <div class="g2" style="margin-top:6px">${f('date', 'วันที่แจ้ง', isoToday(), { type: 'date' })}<label style="display:flex;flex-direction:column;font-size:12px;color:var(--mut);gap:3px">ช่องทาง<select class="inp" data-s="ch">${CHANNELS.map(x => `<option ${(d.ch || 'หนังสือ') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      ${f('to', 'แจ้งถึง', '', { ph: 'ชื่อ / ตำแหน่ง ผู้รับแจ้ง' })}${f('ref', 'เลขที่หนังสือ / อ้างอิง', '', { ph: 'ถ้ามี' })}</div>
      <div class="act"><button class="btn ok" data-act="go" data-to="notified">✓ บันทึกว่าแจ้งลูกค้าแล้ว</button></div></div>`;
  } else if (st === 'notified') {
    h += `<div class="stage"><h4>3 · ส่งหนังสือเคลม</h4>${money ? `<div class="g3">${f('date', 'วันที่ส่ง', isoToday(), { type: 'date' })}${f('amt', 'ยอดเคลม (฿)', k.total, { num: 1 })}${f('days', 'ขอขยายเวลา (วัน)', c.eot || '', { num: 1, ph: '0' })}${f('ref', 'เลขที่หนังสือ', '', { ph: 'เช่น WI-CLM-001' })}</div>
      <div class="info">ยอดเคลมดึงจากตัวคำนวณ (${baht(k.total)}) · แก้ได้ · กด 🖨 พิมพ์หนังสือเคลม (DRAFT) ให้ผู้บริหารตรวจก่อนส่ง</div>
      <div class="act"><button class="btn ok" data-act="go" data-to="submitted">✓ บันทึกว่าส่งเคลมแล้ว</button></div>` : lock}</div>`;
  } else if (st === 'submitted') {
    h += `<div class="stage"><h4>4 · ผลการพิจารณาของลูกค้า</h4>${money ? `<div class="g3">${f('date', 'วันที่ตอบ', isoToday(), { type: 'date' })}${f('amt', 'ยอดที่อนุมัติ (฿)', s.amt, { num: 1 })}${f('days', 'วันที่อนุมัติ', s.days || '', { num: 1, ph: '0' })}${f('who', 'ผู้อนุมัติฝั่งลูกค้า', '', { ph: 'ชื่อ / ตำแหน่ง' })}${f('why', 'เหตุผล (ถ้าไม่อนุมัติ)', '', { ph: 'เช่น ต้องเรียกเก็บจากผู้รับเหมาที่ทำเสียหายเอง' })}</div>
      <div class="act"><button class="btn ok" data-act="go" data-to="approved">✓ อนุมัติ (ทั้งหมด / บางส่วน)</button><button class="btn del" data-act="go" data-to="rejected">✕ ไม่อนุมัติ</button></div>` : lock}</div>`;
  } else if (st === 'approved') {
    h += `<div class="stage"><h4>5 · วางบิล</h4>${money ? `<div class="g3">${f('date', 'วันที่วางบิล', isoToday(), { type: 'date' })}${f('amt', 'ยอดวางบิล (฿)', a.amt, { num: 1 })}${f('ref', 'เลขที่ใบแจ้งหนี้ / งวดเบิก', '', { ph: 'หรือ รวมในงวดที่ / VO เลขที่' })}</div>
      <div class="act"><button class="btn ok" data-act="go" data-to="invoiced">✓ บันทึกว่าวางบิลแล้ว</button></div>` : lock}</div>`;
  } else if (st === 'invoiced') {
    h += `<div class="stage"><h4>6 · รับเงิน</h4>${money ? `<div class="g3">${f('date', 'วันที่รับเงิน', isoToday(), { type: 'date' })}${f('amt', 'ยอดที่ได้รับ (฿)', v.amt, { num: 1 })}</div>
      <div class="info">ตรวจกับใบแจ้งหนี้ + หลักฐานการโอนก่อนบันทึก</div><div class="act"><button class="btn ok" data-act="go" data-to="paid">✓ บันทึกว่ารับเงินแล้ว</button></div>` : lock}</div>`;
  } else if (st === 'rejected' && money) {
    h += `<div class="act"><button class="btn" data-act="resubmit">↺ ส่งเคลมใหม่ (แก้ยอด / เพิ่มหลักฐาน)</button></div>`;
  }
  if (st !== 'draft' && money) h += `<div class="act"><button class="btn" data-act="undo" style="font-size:13px">↶ ย้อนสถานะ 1 ขั้น</button></div>`;
  return h;
}
function renderSheet() {
  const c = APP.cur, sv = APP.saving ? 'กำลังบันทึก…' : APP.dirty ? 'ยังไม่บันทึก' : (c._new ? '' : '✓ บันทึกแล้ว');
  const keep = document.querySelector('.sheet'); const sc = keep ? keep.scrollTop : 0;
  const al = alertOf(c);
  const html = `<div class="scrim"></div><div class="sheet" id="sheet">
    <div class="sh-h"><button class="x" data-act="close" title="ปิด">‹</button><div class="tt"><b>${esc(c.no)} · ${esc(c.title || 'แจ้งความเสียหาย')}</b><span>${esc((SM[c.st] || SM.draft)[1])} · บันทึกโดย ${esc(c.by || '—')}</span></div><span class="sv" id="sv">${sv}</span></div>
    <div class="sh-b">
      ${/^⚠/.test(al) ? `<div class="warnbox">${esc(al)}</div>` : al ? `<div class="info">⏱ ${esc(al)}</div>` : ''}
      <div class="blk"><h3><span class="n">1</span>ความเสียหาย</h3>
        <div class="lbl">หัวข้อ *</div>${inp('title', c.title, { ph: 'เช่น ฝ้าห้อง 1203 เป็นรอยน้ำจากท่อแอร์รั่ว' })}
        <div class="g2"><div><div class="lbl">วันที่พบ</div>${inp('found', c.found, { type: 'date' })}</div><div><div class="lbl">พื้นที่ / ตำแหน่ง</div>${inp('area', c.area, { ph: 'อาคาร · ชั้น · ห้อง' })}</div></div>
        <div class="lbl">งานของเราที่เสียหาย</div><div class="chips">${WORKS.map(w => `<button class="chip ${(c.works || []).includes(w) ? 'on' : ''}" data-act="work" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
        <div class="lbl">สาเหตุ</div><div class="chips">${CAUSES.map(x => `<button class="chip ${c.cause === x[0] ? 'on' : ''}" data-act="cause" data-c="${x[0]}">${x[1]} ${esc(x[2])}</button>`).join('')}</div>
        <div class="lbl">ผู้ทำให้เสียหาย / ฝ่ายที่ต้องรับผิดชอบ <span class="hint">ถ้าทราบ</span></div>${inp('party', c.party, { ph: 'เช่น ผู้รับเหมางานระบบไฟฟ้า · ผู้รับเหมาแอร์' })}
        <div class="lbl">รายละเอียด</div>${inp('desc', c.desc, { area: 1, ph: 'เกิดอะไร เมื่อไร ขนาดความเสียหาย (กว้าง × ยาว) สิ่งที่ต้องซ่อม' })}
        ${pics('before', '📷 รูปความเสียหาย (ก่อนซ่อม)')}${pics('after', '📷 รูปหลังซ่อม')}
      </div>
      <div class="blk"><h3><span class="n">2</span>ค่าซ่อม + วันทำงาน <small>ตัวคำนวณ</small></h3>
        <div class="ln-tabs"><button class="btn" data-act="ladd" data-t="lab">+ 👷 ค่าแรง</button><button class="btn" data-act="ladd" data-t="mat">+ 🧱 วัสดุ</button><button class="btn" data-act="ladd" data-t="oth">+ 🛠 อื่น ๆ</button></div>
        ${(c.lines || []).length ? (c.lines || []).map(costLine).join('') : '<div class="info">เพิ่มรายการ: ค่าแรง (คน × วัน × อัตรา) · วัสดุ (จำนวน × ราคา) · อื่น ๆ (เหมา)</div>'}
        ${totals()}
        <div class="g2"><div><div class="lbl">ขอขยายเวลา (วัน)</div>${inp('eot', c.eot, { num: 1, ph: '0' })}</div><div><div class="lbl">เหตุผลที่กระทบเวลา</div>${inp('eotWhy', c.eotWhy, { ph: 'เช่น ต้องรอแห้ง 3 วันก่อนซ่อม' })}</div></div>
      </div>
      <div class="blk"><h3><span class="n">3</span>ติดตามเคลม <small>แจ้ง → ส่งเคลม → อนุมัติ → วางบิล → รับเงิน</small></h3>${stepper(c)}${c._new ? '<div class="info">ใส่หัวข้อหรือรูปก่อน แล้วระบบจะบันทึกให้อัตโนมัติ</div>' : stageBox(c)}</div>
      ${(c.log || []).length ? `<div class="blk"><h3>ประวัติ</h3><div class="log">${c.log.slice().reverse().map(l => `<div>${esc(l.text)}<br><span>${esc(l.by || '')} · ${when(l.t)}</span></div>`).join('')}</div></div>` : ''}
    </div>
    <div class="bot">${c._new ? '' : `<button class="btn del" data-act="del">🗑</button>`}<button class="btn gold" data-act="print" ${c._new ? 'disabled' : ''}>🖨 หนังสือเคลม (DRAFT)</button><button class="btn pri grow" data-act="close">✓ เสร็จ</button></div>
  </div>`;
  let host = $('sheetHost'); if (!host) { host = document.createElement('div'); host.id = 'sheetHost'; document.body.appendChild(host); }
  host.innerHTML = html; const sh = $('sheet'); if (sh) sh.scrollTop = sc;
}
function setSv() { const e = $('sv'); if (e) e.textContent = APP.saving ? 'กำลังบันทึก…' : APP.dirty ? 'ยังไม่บันทึก' : (APP.cur && !APP.cur._new ? '✓ บันทึกแล้ว' : ''); }
function refreshMoney() { const c = APP.cur; if (!c) return; (c.lines || []).forEach((l, i) => { const e = document.querySelector(`[data-ls="${i}"]`); if (e) e.textContent = baht(lineAmt(l)); });
  const t = $('tot'); if (t) { const a = document.activeElement, f = a && a.dataset && a.dataset.f; t.outerHTML = totals(); if (f === 'ohp') { const n = document.querySelector('[data-f="ohp"]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } } }

// ---------- บันทึก ----------
const hasContent = (c) => !!(String(c.title || '').trim() || ((c.photos || {}).before || []).length || String(c.desc || '').trim());
function logPush(c, text) { c.log = [...(c.log || []), { t: new Date().toISOString(), by: APP.me.name, text }]; }
function schedule() { APP.dirty = true; setSv(); clearTimeout(APP.saveT); APP.saveT = setTimeout(save, 800); }
async function save() {
  const c = APP.cur; if (!c) return; clearTimeout(APP.saveT);
  if (c._new && !hasContent(c)) { APP.dirty = false; setSv(); return; }
  const wasNew = !!c._new; const out = clone(c); delete out._new; out.at = new Date().toISOString(); out.last = APP.me.name;
  if (wasNew) logPush(out, 'สร้างเคลม ' + out.no);
  APP.saving = true; setSv(); let clash = false;
  try {
    const m = await stWrite(KEY, (m) => { const L = Array.isArray(m[APP.pid]) ? m[APP.pid].slice() : []; const i = L.findIndex(x => x.id === out.id);
      if (i >= 0 && APP.base[out.id] && L[i].at && L[i].at !== APP.base[out.id] && L[i].last !== APP.me.name) clash = L[i].last || 'ผู้อื่น';
      if (i >= 0) L[i] = out; else L.unshift(out); m[APP.pid] = L; return m; });
    APP.claims = m[APP.pid] || []; APP.base[out.id] = out.at;
    if (APP.cur && APP.cur.id === out.id) { APP.cur.at = out.at; APP.cur.log = out.log; if (wasNew) { delete APP.cur._new; APP.saving = false; APP.dirty = false; renderSheet(); return; } }
    if (clash) toast('⚠ ' + clash + ' แก้เคลมนี้ในช่วงเดียวกัน — ระบบบันทึกค่าของคุณ ตรวจข้อมูลอีกครั้ง', 4500);
    APP.dirty = false;
  } catch (e) { console.error(e); toast('บันทึกไม่สำเร็จ — ตรวจสัญญาณเน็ต แล้วลองใหม่'); APP.dirty = true; clearTimeout(APP.saveT); APP.saveT = setTimeout(save, 5000); }
  APP.saving = false; setSv();
}
async function closeSheet() {
  if (APP.cur && (APP.dirty || APP.saveT)) await save();
  APP.cur = null; APP.stg = null; const h = $('sheetHost'); if (h) h.innerHTML = ''; render();
}

// ---------- รูป ----------
function resize(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => {
  const sc = Math.min(1, 1600 / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); c.toBlob(b => b ? res(b) : rej(new Error('resize')), 'image/jpeg', .82); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); }); }
async function addPics(kind, files) {
  const c = APP.cur; if (!c) return; c.photos = c.photos || { before: [], after: [] }; c.photos[kind] = c.photos[kind] || [];
  const room = PIC_MAX - c.photos[kind].length; if (room <= 0) { toast('ครบ ' + PIC_MAX + ' รูปแล้ว'); return; }
  if (files.length > room) toast('เพิ่มได้อีก ' + room + ' รูป — ใช้ ' + room + ' รูปแรก');
  APP.busyPic = kind; renderSheet(); let n = 0;
  for (const f of files.slice(0, room)) {
    try { const b = await resize(f); const key = 'claims/' + APP.pid + '/' + c.id + '/' + kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
      const up = await sb.storage.from(BUCKET).upload(key, b, { contentType: 'image/jpeg', upsert: false }); if (up.error) throw up.error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(key); if (APP.cur && APP.cur.id === c.id) { APP.cur.photos[kind].push(data.publicUrl); n++; }
    } catch (e) { console.error(e); toast('อัปโหลดรูปไม่สำเร็จ — ตรวจสัญญาณเน็ต'); }
  }
  APP.busyPic = ''; if (n && APP.cur && APP.cur.id === c.id) { logPush(APP.cur, 'เพิ่มรูป' + (kind === 'after' ? 'หลังซ่อม' : 'ความเสียหาย') + ' ' + n + ' รูป'); renderSheet(); schedule(); } else renderSheet();
}

// ---------- เปลี่ยนสถานะ ----------
function go(to) {
  const c = APP.cur, d = APP.stg || {}; const stI = (k) => (document.querySelector(`[data-s="${k}"]`) || {}).value;
  const v = (k) => d[k] != null ? d[k] : stI(k);
  const date = v('date') || isoToday(); const base = { date, by: APP.me.name, at: new Date().toISOString() };
  c.flow = c.flow || {};
  if (to === 'notified') { c.flow.notified = { ...base, ch: v('ch') || 'หนังสือ', to: v('to') || '', ref: v('ref') || '' }; logPush(c, 'แจ้งลูกค้าแล้ว (' + c.flow.notified.ch + ') ' + dmy(date)); }
  else if (to === 'submitted') { const amt = num(v('amt')); if (!amt) { toast('ใส่ยอดเคลมก่อน'); return; } c.flow.submitted = { ...base, amt, days: num(v('days')), ref: v('ref') || '', calc: calc(c).total }; if (num(v('days'))) c.eot = num(v('days')); logPush(c, 'ส่งเคลม ' + baht(amt) + (num(v('days')) ? ' · ขอขยาย ' + num(v('days')) + ' วัน' : '')); }
  else if (to === 'approved') { const amt = num(v('amt')); if (!amt) { toast('ใส่ยอดที่ลูกค้าอนุมัติ'); return; } c.flow.approved = { ...base, amt, days: num(v('days')), who: v('who') || '' }; delete c.flow.rejected; logPush(c, 'ลูกค้าอนุมัติ ' + baht(amt) + (num(v('days')) ? ' · ' + num(v('days')) + ' วัน' : '')); }
  else if (to === 'rejected') { c.flow.rejected = { ...base, why: v('why') || '' }; logPush(c, 'ลูกค้าไม่อนุมัติ' + (v('why') ? ' — ' + v('why') : '')); }
  else if (to === 'invoiced') { const amt = num(v('amt')); if (!amt) { toast('ใส่ยอดวางบิล'); return; } c.flow.invoiced = { ...base, amt, ref: v('ref') || '' }; logPush(c, 'วางบิล ' + baht(amt) + (v('ref') ? ' · ' + v('ref') : '')); }
  else if (to === 'paid') { const amt = num(v('amt')); if (!amt) { toast('ใส่ยอดที่ได้รับ'); return; } c.flow.paid = { ...base, amt }; logPush(c, 'รับเงิน ' + baht(amt)); }
  c.st = to; APP.stg = null; renderSheet(); schedule(); toast('✓ ' + SM[to][1]);
}
function undo() { const c = APP.cur; const prev = c.st === 'rejected' ? 'submitted' : FLOW[Math.max(0, FLOW.indexOf(c.st) - 1)];
  if (!confirm('ย้อนสถานะจาก "' + SM[c.st][1] + '" กลับเป็น "' + SM[prev][1] + '"?')) return;
  if (c.flow) delete c.flow[c.st]; logPush(c, 'ย้อนสถานะ → ' + SM[prev][1]); c.st = prev; renderSheet(); schedule(); }

// ---------- อัตราค่าแรง ----------
function ratesSheet() {
  const R = APP.rates, ed = canRates();
  return `<div class="scrim" data-act="rclose"></div><div class="sheet"><div class="sh-h"><button class="x" data-act="rclose">‹</button><div class="tt"><b>อัตราค่าแรงสำหรับเคลม</b><span>ใช้ทุกโครงการ · ราคาเรียกเก็บลูกค้า (฿ / คน / วัน)</span></div></div>
    <div class="sh-b"><div class="blk"><div class="info">ตั้งครั้งเดียว ใช้ทุกเคลม — เลือกตำแหน่งช่างแล้วระบบใส่อัตราให้ (แก้รายเคลมได้) · ${ed ? 'ตรวจกับ QS / ผู้บริหารก่อนบันทึก' : 'แก้ได้เฉพาะ QS / PM Manager / ผู้บริหาร'}</div>
      <div class="rates" style="margin-top:10px">${R.trades.map((t, i) => `<div class="rr"><input class="inp" data-r="n" data-i="${i}" value="${esc(t.n)}" ${ed ? '' : 'disabled'}><input class="inp" data-r="rate" data-i="${i}" inputmode="decimal" placeholder="฿ / วัน" value="${esc(t.rate)}" ${ed ? '' : 'disabled'}>${ed ? `<button class="btn" data-act="rrm" data-i="${i}" style="min-height:40px;padding:0;color:var(--red)">×</button>` : '<span></span>'}</div>`).join('')}</div>
      ${ed ? `<div class="act"><button class="btn" data-act="radd">+ เพิ่มตำแหน่ง</button></div>` : ''}
      <div class="lbl">ค่าดำเนินการ + กำไร (OH&amp;P) เริ่มต้น %</div><input class="inp" data-r="ohp" inputmode="decimal" value="${esc(R.ohp)}" ${ed ? '' : 'disabled'} style="max-width:140px">
      ${R.at ? `<div class="info">แก้ล่าสุด ${esc(R.by)} · ${when(R.at)}</div>` : ''}
      ${ed ? `<div class="act"><button class="btn pri" data-act="rsave">✓ บันทึกอัตรา</button></div>` : ''}</div></div></div>`;
}
async function saveRates() {
  const R = APP.rates; const out = { trades: R.trades.filter(t => String(t.n || '').trim()).map(t => ({ n: String(t.n).trim(), rate: t.rate === '' ? '' : num(t.rate) })), ohp: num(R.ohp), by: APP.me.name, at: new Date().toISOString() };
  try { await stWrite(RKEY, () => out); APP.rates = out; APP.ratesOpen = false; render(); toast('✓ บันทึกอัตราค่าแรงแล้ว'); } catch (e) { toast('บันทึกไม่สำเร็จ'); }
}

// ---------- หนังสือเคลม (พิมพ์ / PDF) ----------
function printClaim() {
  const c = APP.cur, p = APP.proj || {}, k = calc(c), cz = CM[c.cause] || CM.other, s = F(c, 'submitted');
  const amt = num(s.amt) || k.total, days = num(s.days) || num(c.eot);
  const rows = (c.lines || []).map((l, i) => { const t = LT[l.t] || LT.oth;
    const q = l.t === 'lab' ? `${num(l.men)} คน × ${num(l.days)} วัน` : l.t === 'mat' ? `${num(l.qty)} ${esc(l.unit || '')}` : 'เหมา';
    const u = l.t === 'lab' ? baht(l.rate) : l.t === 'mat' ? baht(l.price) : baht(l.amt);
    return `<tr><td>${i + 1}</td><td>${t[1]} · ${esc(l.n || '')}</td><td>${q}</td><td class="r">${u}</td><td class="r">${baht(lineAmt(l))}</td></tr>`; }).join('');
  const ph = (L, cap) => (L || []).length ? `<h3>${cap}</h3><div class="ph">${L.slice(0, 8).map(u => `<img src="${esc(u)}">`).join('')}</div>` : '';
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.no)} · หนังสือเคลมความเสียหาย</title><style>
    @page{size:A4 portrait;margin:14mm}body{font-family:"IBM Plex Sans Thai",Sarabun,sans-serif;font-size:11.5px;color:#1C1B18;line-height:1.55}
    .wm{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:110px;font-weight:700;color:rgba(196,68,46,.10);transform:rotate(-24deg);z-index:0}
    .hd{display:flex;justify-content:space-between;border-bottom:2px solid #1C1B18;padding-bottom:6px}.hd b{font-size:15px}
    h1{font-size:16px;margin:12px 0 2px}h2{font-size:12px;font-weight:400;color:#555;margin:0 0 10px}h3{font-size:12.5px;margin:12px 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top}th{background:#F3EDDF;text-align:left}.r{text-align:right;white-space:nowrap}
    .kv td:first-child{width:28%;background:#FAF6EE;font-weight:600}.ph{display:flex;flex-wrap:wrap;gap:4px}.ph img{width:23.5%;height:110px;object-fit:cover;border:1px solid #ccc}
    .sg{display:flex;gap:24px;margin-top:28px}.sg div{flex:1;text-align:center}.sg .ln{border-bottom:1px solid #333;height:34px;margin-bottom:4px}
    .note{font-size:10.5px;color:#8E2F1F;border:1px solid #E8A898;background:#FDECEC;padding:5px 8px;margin-top:10px}</style></head><body>
    <div class="wm">DRAFT</div>
    <div class="hd"><div><b>บริษัท เวลล์คอน อินทีเรีย จำกัด · Wellcon Interior Co., Ltd.</b><br>เซ็นโทรพอร์ต 36/38 ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150<br>เลขประจำตัวผู้เสียภาษี 0105560007187 · www.wellcon.co.th</div><div style="text-align:right">เลขที่ <b>${esc(s.ref || c.no)}</b><br>วันที่ ${dmy(s.date || isoToday())}</div></div>
    <h1>หนังสือแจ้งความเสียหายและขอเรียกร้องค่าเสียหาย</h1><h2>Notice of Damage &amp; Claim for Repair Cost${days ? ' and Extension of Time' : ''}</h2>
    <table class="kv"><tr><td>เรียน / To</td><td>${esc(p.client || p.owner || 'ผู้ว่าจ้าง')}</td></tr><tr><td>โครงการ / Project</td><td>${esc(projName(p))}${projCode(p) ? ' (' + esc(projCode(p)) + ')' : ''}</td></tr>
      <tr><td>เรื่อง / Subject</td><td>${esc(c.title || '')}</td></tr><tr><td>วันที่พบ / Date found</td><td>${dmy(c.found)}</td></tr><tr><td>ตำแหน่ง / Location</td><td>${esc(c.area || '—')}</td></tr>
      <tr><td>งานที่เสียหาย</td><td>${esc((c.works || []).join(', ') || '—')}</td></tr><tr><td>สาเหตุ / Cause</td><td>${esc(cz[2])}${c.party ? ' — ผู้เกี่ยวข้อง: ' + esc(c.party) : ''}</td></tr>
      ${F(c, 'notified').date ? `<tr><td>แจ้งเหตุแล้ว</td><td>${dmy(F(c, 'notified').date)} ทาง${esc(F(c, 'notified').ch || '')}${F(c, 'notified').to ? ' ถึง ' + esc(F(c, 'notified').to) : ''}</td></tr>` : ''}</table>
    <h3>รายละเอียดความเสียหาย</h3><div>${esc(c.desc || '—').replace(/\n/g, '<br>')}</div>
    ${ph((c.photos || {}).before, 'รูปความเสียหาย (ก่อนซ่อม)')}${ph((c.photos || {}).after, 'รูปหลังซ่อม')}
    <h3>ค่าใช้จ่ายในการซ่อมแซม</h3><table><thead><tr><th>#</th><th>รายการ</th><th>จำนวน</th><th class="r">ราคาต่อหน่วย</th><th class="r">จำนวนเงิน</th></tr></thead><tbody>${rows || '<tr><td colspan="5">—</td></tr>'}
      <tr><td colspan="4" class="r">รวมค่าซ่อม</td><td class="r">${baht(k.sub)}</td></tr><tr><td colspan="4" class="r">ค่าดำเนินการ + กำไร ${num(c.ohp)}%</td><td class="r">${baht(k.ohp)}</td></tr>
      <tr><td colspan="4" class="r">รวมก่อน VAT</td><td class="r">${baht(k.pre)}</td></tr><tr><td colspan="4" class="r">VAT 7%</td><td class="r">${baht(k.vat)}</td></tr>
      <tr><td colspan="4" class="r"><b>ยอดเรียกร้อง ${c.vatOn === false ? '(ไม่รวม VAT)' : '(รวม VAT)'}</b></td><td class="r"><b>${baht(amt)}</b></td></tr></tbody></table>
    ${days ? `<h3>ขอขยายระยะเวลาทำงาน</h3><div>${days} วัน${c.eotWhy ? ' — ' + esc(c.eotWhy) : ''}</div>` : ''}
    <div style="margin-top:10px">บริษัทฯ ขอเรียนแจ้งความเสียหายต่องานของบริษัทฯ ซึ่งเกิดจากสาเหตุที่อยู่นอกขอบเขตความรับผิดชอบของบริษัทฯ ตามรายละเอียดข้างต้น และขอเรียกร้องค่าใช้จ่ายในการซ่อมแซม${days ? ' และการขยายระยะเวลา' : ''} จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</div>
    <div class="sg"><div><div class="ln"></div>ผู้จัดทำ<br>${esc(c.by || '')}</div><div><div class="ln"></div>ผู้อนุมัติ · Wellcon Interior</div><div><div class="ln"></div>ผู้รับทราบ · ผู้ว่าจ้าง</div></div>
    <div class="note">DRAFT — ต้องผ่านการตรวจของผู้บริหารก่อนส่ง · ตรวจตัวเลขกับฝ่ายประมาณราคา (QS) · อ้างอิงเงื่อนไขสัญญาของโครงการ</div></body></html>`;
  const old = document.getElementById('cl-print'); if (old) old.remove();
  const f = document.createElement('iframe'); f.id = 'cl-print'; f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(f);
  const d = f.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('พิมพ์ไม่สำเร็จ'); } }, 900);
}

// =====================================================================
// events
// =====================================================================
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { const k = /^\d+$/.test(ks[i]) ? +ks[i] : ks[i]; o = o[k]; if (o == null) return; } o[/^\d+$/.test(ks[ks.length - 1]) ? +ks[ks.length - 1] : ks[ks.length - 1]] = val; }
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, c = APP.cur;
  if (a === 'back') { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back(); else location.href = pmUrl(); }
  else if (a === 'proj') openProject(b.dataset.id);
  else if (a === 'f') { APP.filter = b.dataset.f; render(); }
  else if (a === 'new') { APP.cur = newClaim(); APP.dirty = false; renderSheet(); setTimeout(() => { const t = document.querySelector('[data-f="title"]'); if (t) t.focus(); }, 60); }
  else if (a === 'open') { const x = APP.claims.find(y => y.id === b.dataset.id); if (x) { APP.cur = clone(x); APP.dirty = false; APP.stg = null; renderSheet(); } }
  else if (a === 'close') closeSheet();
  else if (a === 'work' && c) { const w = b.dataset.w; c.works = (c.works || []).includes(w) ? c.works.filter(x => x !== w) : [...(c.works || []), w]; renderSheet(); schedule(); }
  else if (a === 'cause' && c) { c.cause = c.cause === b.dataset.c ? '' : b.dataset.c; renderSheet(); schedule(); }
  else if (a === 'ladd' && c) { const t = b.dataset.t; c.lines = [...(c.lines || []), t === 'lab' ? { t, n: '', men: '', days: '', rate: '' } : t === 'mat' ? { t, n: '', qty: '', unit: '', price: '' } : { t, n: '', amt: '' }]; renderSheet(); schedule(); }
  else if (a === 'lrm' && c) { c.lines.splice(+b.dataset.i, 1); renderSheet(); schedule(); }
  else if (a === 'picdel' && c) { if (!confirm('ลบรูปนี้?')) return; c.photos[b.dataset.k].splice(+b.dataset.i, 1); logPush(c, 'ลบรูป 1 รูป'); renderSheet(); schedule(); }
  else if (a === 'lb') { const d = document.createElement('div'); d.className = 'lb'; d.innerHTML = `<img src="${esc(b.dataset.u)}">`; d.onclick = () => d.remove(); document.body.appendChild(d); }
  else if (a === 'go' && c) go(b.dataset.to);
  else if (a === 'undo' && c) undo();
  else if (a === 'resubmit' && c) { c.st = 'notified'; if (c.flow) { delete c.flow.rejected; delete c.flow.submitted; delete c.flow.approved; } logPush(c, 'เตรียมส่งเคลมใหม่'); renderSheet(); schedule(); }
  else if (a === 'del' && c) { if (!confirm('ลบเคลม ' + c.no + ' ?\nรูปและประวัติของเคลมนี้จะถูกลบด้วย')) return;
    try { const m = await stWrite(KEY, (m) => { m[APP.pid] = (m[APP.pid] || []).filter(x => x.id !== c.id); return m; }); APP.claims = m[APP.pid] || [];
      const keys = [...((c.photos || {}).before || []), ...((c.photos || {}).after || [])].map(u => (String(u).split('/' + BUCKET + '/')[1] || '').split('?')[0]).filter(Boolean);
      if (keys.length) sb.storage.from(BUCKET).remove(keys).catch(() => {});
      APP.cur = null; APP.dirty = false; clearTimeout(APP.saveT); const h = $('sheetHost'); if (h) h.innerHTML = ''; render(); toast('ลบเคลมแล้ว'); } catch (x) { toast('ลบไม่สำเร็จ'); } }
  else if (a === 'print' && c) { if (APP.dirty) await save(); printClaim(); }
  else if (a === 'rates') { APP.ratesOpen = true; render(); }
  else if (a === 'rclose') { APP.ratesOpen = false; render(); }
  else if (a === 'radd') { APP.rates.trades.push({ n: '', rate: '' }); render(); }
  else if (a === 'rrm') { APP.rates.trades.splice(+b.dataset.i, 1); render(); }
  else if (a === 'rsave') saveRates();
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q') { APP.q = t.value; const pos = t.selectionStart; render(); const n = $('q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } return; }
  if (t.dataset.r != null) { const R = APP.rates; if (t.dataset.r === 'ohp') R.ohp = t.value; else R.trades[+t.dataset.i][t.dataset.r] = t.value; return; }
  if (t.dataset.s != null) { APP.stg = APP.stg || {}; APP.stg[t.dataset.s] = t.value; return; }
  const c = APP.cur; if (!c || t.dataset.f == null) return; const f = t.dataset.f;
  if (t.type === 'checkbox') return;
  setPath(c, f, t.value);
  if (/^lines\./.test(f) || f === 'ohp') refreshMoney();
  schedule();
});
document.addEventListener('change', (e) => {
  const t = e.target, c = APP.cur;
  if (t.dataset.pic && c) { const files = [...(t.files || [])]; t.value = ''; if (files.length) addPics(t.dataset.pic, files); return; }
  if (t.dataset.s != null && t.tagName === 'SELECT') { APP.stg = APP.stg || {}; APP.stg[t.dataset.s] = t.value; return; }
  if (!c || t.dataset.f == null) return;
  if (t.type === 'checkbox') { setPath(c, t.dataset.f, t.checked); refreshMoney(); schedule(); return; }
  if (t.dataset.trade != null) { const i = +t.dataset.trade, tr = (APP.rates.trades || []).find(x => x.n === t.value); c.lines[i].n = t.value; if (tr && num(tr.rate)) c.lines[i].rate = tr.rate; renderSheet(); schedule(); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && APP.pid && !APP.cur && !APP.ratesOpen) reload().catch(() => {}); });
window.addEventListener('beforeunload', (e) => { if (APP.dirty) { save(); e.preventDefault(); e.returnValue = ''; } });

boot();
})();
