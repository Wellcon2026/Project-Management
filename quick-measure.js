/* =====================================================================
   Wellcon PM — Quick Measure (วัดพื้นที่ด่วนบนมือถือ)
   ---------------------------------------------------------------------
   • หน้าแยกจาก index.html (ไม่แตะโค้ด PM หลัก) เปิดจากเมนู "Takeoff · วัดหน้างาน" ในหน้าโครงการ
     quick-measure.html?pid=<project id>  (+ &env=staging สำหรับข้อมูลทดสอบ)
   • Login: ใช้ session ที่ Wellcon PM จำไว้ในเครื่อง (wellcon_pm_session_v1) — ไม่มีระบบ login ใหม่
   • อ่านข้อมูล QS ผ่าน takeoff_pm_feed ช่องทางเดียว (ไม่มีราคา) · เคารพสวิตช์ Admin ทุกครั้งที่เปิด
   • ตัวเลขที่วัด → ตาราง takeoff_field_measures (แยกจากตาราง takeoff_* ของ QS)
   • สูตรคำนวณ: takeoff-engine.js (คัดลอกจาก QS — ห้ามแก้ฝั่ง PM)
   • ห้ามแสดง/ดึงราคาใด ๆ
   ===================================================================== */
(() => {
'use strict';
const QM_VER = 'v1.4.0';   // 1.4.0: แบบ PDF คมชัดเมื่อซูม · นำเข้า DXF (สเกลอัตโนมัติ) · 1.3.0: จอคอม 3 ส่วนแบบ QS (ธีม PM) · โน้ต · ไม้บรรทัด · ตัวคูณนับจุด · % เผื่อ · แพ็ก · CSV · ล็อกแนวตรง (Shift) · คีย์ลัด
const E = window.TakeoffEngine;
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
// ข้อมูลจริง = โดเมนจริง · ?env=staging / โดเมนมีคำว่า staging / localhost = ข้อมูลทดสอบ
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || /^(localhost|127\.0\.0\.1)$/.test(h)) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
// role ที่เห็นทุกโครงการ (ตรงกับ ROLE_DEFS ของ PM) · คนอื่นเห็นเฉพาะโครงการที่ถูก assign
const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
const QS_REVIEW = ['qs', 'qs_mgr', 'superadmin', 'director'];
const ROLE_TH = { pm: 'PM', pm_mgr: 'PM', director: 'Director', sitemgr: 'Site Manager', site: 'หัวหน้าช่าง', qs: 'QS', qs_mgr: 'QS', superadmin: 'Admin', designer: 'Designer', factory: 'โรงงาน', proc: 'จัดซื้อ' };
const WORKS = ['พื้น', 'ฝ้า', 'ผนัง', 'บัว', 'Built-in', 'อื่น ๆ'];
const ST = { field: 'วัดหน้างาน', submitted: 'รอ QS ตรวจ', accepted: 'QS รับแล้ว', returned: 'QS ส่งกลับ' };
const UP_BUCKET = 'general-photo', QS_BUCKET = 'takeoff-drawings';
const MAX_BMP = 4096;                         // ด้านยาวสุดของภาพที่วาดบนมือถือ (กัน iOS canvas เกินขนาด)
const RATIOS = [20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 500];

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const f2 = (n) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fq = (q, u) => u === E.UNIT.COUNT ? String(Math.round(q)) : f2(q);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n) => String(n).padStart(2, '0');
const dmy = (d) => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
const when = (iso) => { if (!iso) return ''; const d = new Date(iso), t = new Date(); const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); const dd = (day(t) - day(d)) / 864e5;
  return dd === 0 ? 'วันนี้ ' + hm : dd === 1 ? 'เมื่อวาน ' + hm : dmy(d); };
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
let toastT = null;
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
function toPm() { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1 && !APP.pushed) history.back(); else location.href = pmUrl(); }

// ---------- state ----------
const APP = { acc: null, me: null, projects: [], pid: null, proj: null, feed: null, set: null, rows: [], sheets: [], noTable: false, filter: 'mine', screen: 'msg', pushed: 0, bin: {} };

// ---------- v1.2.0 ย้อน / ทำซ้ำ ทุกการแก้ไข · Ctrl+Z = ย้อน · Ctrl+Y (หรือ Ctrl+Shift+Z) = ทำซ้ำ · มือถือใช้ปุ่ม ↶ / ↷ ----------
//   kind 'draw' = จุดบนแบบที่กำลังวาด (ล้างเมื่อออกจากหน้าวัด/เปิดแบบอื่น) · kind 'act' = ข้อมูลที่บันทึกแล้ว (ย้อนแก้ฐานข้อมูลจริง)
const HIS = { u: [], r: [], busy: false };
function hisBtns() { document.querySelectorAll('[data-his]').forEach(b => { b.disabled = HIS.busy || !(b.dataset.his === 'r' ? HIS.r.length : HIS.u.length); }); }
function hisPush(e) { HIS.u.push(e); if (HIS.u.length > 300) HIS.u.shift(); HIS.r = []; hisBtns(); }
function hisDrop(fn) { HIS.u = HIS.u.filter(e => !fn(e)); HIS.r = HIS.r.filter(e => !fn(e)); hisBtns(); }
async function hisGo(redo) {
  if (HIS.busy) return; const A = redo ? HIS.r : HIS.u, B = redo ? HIS.u : HIS.r; const e = A.pop();
  if (!e) { toast(redo ? 'ไม่มีอะไรให้ทำซ้ำ' : 'ไม่มีอะไรให้ย้อนแล้ว', 1400); hisBtns(); return; }
  HIS.busy = true; hisBtns();
  try { const ok = await (redo ? e.redo() : e.undo()); if (ok === false) throw new Error('สถานะเปลี่ยนไปแล้ว'); B.push(e); if (!e.quiet) toast((redo ? '↷ ทำซ้ำ: ' : '↶ ย้อน: ') + e.label, 1800); }
  catch (x) { console.error(x); toast((redo ? 'ทำซ้ำ' : 'ย้อน') + 'ไม่สำเร็จ — ' + ((x && x.message) || x), 4000); }
  HIS.busy = false; hisBtns();
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return; const k = String(e.key || '').toLowerCase(); if (k !== 'z' && k !== 'y') return;
  const t = e.target; if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;   // ในช่องพิมพ์ = ย้อนตัวอักษรตามปกติ
  if (document.querySelector('dialog[open]')) return;
  e.preventDefault(); hisGo(k === 'y' || e.shiftKey);
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-his]'); if (b && !b.disabled) hisGo(b.dataset.his === 'r'); });
// แก้แถว takeoff_field_measures แล้วซิงก์ APP.rows (ใช้ทั้งงานปกติและการย้อน/ทำซ้ำ)
async function rowSet(id, patch) {
  const q = await sb.from('takeoff_field_measures').update(patch).eq('id', id).select('*');
  if (q.error) throw q.error; const n = q.data && q.data[0]; if (!n) throw new Error('ไม่พบรายการ');
  const i = APP.rows.findIndex(x => x.id === id);
  if (n.deleted_at) { if (i >= 0) APP.rows.splice(i, 1); } else if (i >= 0) APP.rows[i] = n; else APP.rows.unshift(n);
  if (APP.screen === 'list') renderList(); if (APP.screen === 'measure') MV.side(); return n;
}
// แก้แถว takeoff_field_sheets แล้วซิงก์ APP.sheets
async function sheetSet(ids, patch) {
  const q = await sb.from('takeoff_field_sheets').update(patch).in('id', ids).select('*');
  if (q.error) throw q.error;
  (q.data || []).forEach(n => { const i = APP.sheets.findIndex(x => x.id === n.id);
    if (n.deleted_at) { if (i >= 0) APP.sheets.splice(i, 1); } else if (i >= 0) APP.sheets[i] = n; else APP.sheets.unshift(n); });
  if (APP.screen === 'pick') renderPick();
  if (patch.deleted_at && APP.screen === 'measure' && ids.some(id => MV.key() === 'up:' + id)) { renderPick(); show('pick'); }
  return q.data || [];
}
const measuresOn = (ids) => APP.rows.filter(r => ids.includes(r.sheet_id)).length;

// ---------- screens + ปุ่มย้อนกลับของมือถือ ----------
const SCR = ['msg', 'proj', 'list', 'pick', 'measure'];
function show(s, push) {
  SCR.forEach(k => { $('scr' + k[0].toUpperCase() + k.slice(1)).hidden = k !== s; });
  if (push) { history.pushState({ qm: s }, ''); APP.pushed++; }
  APP.screen = s;
  if (s !== 'measure') hisDrop(e => e.kind === 'draw');
  if (s === 'measure') { requestAnimationFrame(() => { MV.resize(); }); }
  hisBtns();
}
window.addEventListener('popstate', (e) => {
  const s = (e.state && e.state.qm) || (APP.pid ? 'list' : (APP.acc ? 'proj' : 'msg'));
  if (APP.pushed > 0) APP.pushed--;
  if (APP.screen === 'measure' && MV.dirty() && !confirm('ยังไม่ได้บันทึกรูปที่วาดอยู่ ออกจากหน้านี้?')) { history.pushState({ qm: 'measure' }, ''); APP.pushed++; return; }
  show(s, false); if (s === 'list') renderList();
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'toPm') toPm(); else if (b.dataset.act === 'back') history.back(); });

function msg(html) { $('msgBody').innerHTML = html; show('msg'); }

// =====================================================================
// boot
// =====================================================================
// ใช้การเชื่อมต่อฐานข้อมูลที่ Wellcon PM เปิดไว้ในเบราว์เซอร์นี้ (โดเมนเดียวกัน = session เดียวกัน)
// หน้านี้ไม่เก็บรหัสผ่านใด ๆ · ไม่มี session → ให้เปิด Wellcon PM ก่อน
async function ensureAuth() {
  let ok = false;
  try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
  return ok;
}
const rowOf = (r) => ({ ...(r.data || {}), id: r.id, ...(r.project ? { project: r.project } : {}) });
const seesAll = (a) => a.allProj === true || (a.allProj !== false && ALL_SCOPE.includes(a.roleKey));
const projName = (p) => p ? (p.name || p.project || p.title || p.id) : '';
const projCode = (p) => p ? (p.code || p.jobNo || p.no || '') : '';

async function boot() {
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง'; s.prepend(d); });
  try {
    if (!(await ensureAuth())) {
      msg(`<div class="card" style="margin-top:20px"><b>ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้</b>
        <span style="color:var(--mut);font-size:14px">เปิด Wellcon PM และเข้าสู่ระบบก่อน แล้วกดเมนู “Takeoff · วัดหน้างาน” จากหน้าโครงการ</span>
        <a class="btn pri" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:8px" href="${pmUrl()}">ไปหน้า Wellcon PM</a></div>`);
      return;
    }
    const [a, p] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('projects').select('id,project,data')]);
    if (a.error) throw a.error; if (p.error) throw p.error;
    const accounts = (a.data || []).map(rowOf);
    const live = (p.data || []).map(rowOf).filter(x => !x.deleted && !x.del);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5
      && accounts.find(x => norm(x.email) === sess.email && x.active !== false && !x.disabled);
    if (!acc) {
      msg(`<div class="card" style="margin-top:20px"><b>ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้</b>
        <span style="color:var(--mut);font-size:14px">เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิดเมนู “Takeoff · วัดหน้างาน” จากหน้าโครงการ</span>
        <a class="btn pri" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:8px" href="${pmUrl()}">ไปหน้า Wellcon PM</a></div>`);
      return;
    }
    APP.acc = acc;
    APP.me = { name: nickOf(acc), email: norm(acc.email), role: acc.roleKey || '', review: QS_REVIEW.includes(acc.roleKey) };
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'qm' }).then(() => {}, () => {}); } catch (e) {}   // นับการเปิดแอป (หน้าการใช้งานระบบ)
    APP.projects = live.filter(x => seesAll(acc) || (acc.projects || []).includes(x.id));
    const pid = new URLSearchParams(location.search).get('pid');
    if (pid) {
      if (!APP.projects.some(x => x.id === pid)) {
        msg(`<div class="card" style="margin-top:20px"><b>คุณไม่ได้รับมอบหมายในโครงการนี้</b><span style="color:var(--mut);font-size:14px">Takeoff · วัดหน้างาน เปิดได้เฉพาะโครงการที่คุณถูก assign — ติดต่อผู้ดูแลระบบถ้าต้องการสิทธิ์</span></div>`);
        return;
      }
      await openProject(pid);
    } else renderProjects();
  } catch (e) {
    console.error(e);
    msg(`<div class="card" style="margin-top:20px"><b>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</b><span style="color:var(--mut);font-size:14px">${esc((e && e.message) || e)}</span>
      <button class="btn pri" onclick="location.reload()">ลองใหม่</button></div>`);
  }
}

function renderProjects() {
  const L = APP.projects;
  $('projList').innerHTML = (L.length ? L.map(p => `<button class="card" data-pid="${esc(p.id)}"><div class="row1"><span class="nm">${esc(projName(p))}</span></div><div class="row2">${esc(projCode(p))}</div></button>`).join('')
    : '<p class="empty">ยังไม่มีโครงการที่คุณถูก assign</p>') + `<p class="ver">Quick Measure ${QM_VER} · engine ${E.ENGINE_VERSION}</p>`;
  show('proj');
}
$('projList').addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (!b) return;
  const u = new URL(location.href); u.searchParams.set('pid', b.dataset.pid); history.replaceState(null, '', u); openProject(b.dataset.pid); });

// =====================================================================
// โหลดข้อมูลโครงการ: feed ของ QS + ค่าตั้ง Admin + รายการที่วัด
// =====================================================================
async function loadSettings() {
  // ช่องทางเดียว: takeoff_pm_feed (ไม่มีราคา) · งานที่ยังไม่ส่งต่อ → อ่านค่าตั้งทั้งบริษัท
  let feed = { handed_off: false };
  const r = await sb.rpc('takeoff_pm_feed', { p_pm_project_id: APP.pid });
  if (!r.error && r.data) feed = r.data;
  let set = feed.settings || null;
  if (!set) {
    const c = await sb.from('takeoff_handoff_settings').select('send_drawings,show_qty,allow_quick_measure').is('root_folder_id', null).limit(1);
    const row = (!c.error && c.data && c.data[0]) || {};
    set = { send_drawings: row.send_drawings !== false, show_qty: !!row.show_qty, allow_quick_measure: row.allow_quick_measure !== false };
  }
  set.show_price = false;   // ล็อกปิดถาวร
  APP.feed = feed; APP.set = set;
}
async function loadRows() {
  const [m, s] = await Promise.all([
    sb.from('takeoff_field_measures').select('*').eq('pm_project_id', APP.pid).is('deleted_at', null).order('created_at', { ascending: false }),
    sb.from('takeoff_field_sheets').select('*').eq('pm_project_id', APP.pid).is('deleted_at', null).order('created_at', { ascending: false })
  ]);
  APP.noTable = !!(m.error && /does not exist|schema cache|relation/i.test(m.error.message || ''));
  if (m.error && !APP.noTable) throw m.error;
  APP.rows = m.error ? [] : (m.data || []);
  APP.sheets = s.error ? [] : (s.data || []);
}
async function openProject(pid) {
  APP.pid = pid; APP.proj = APP.projects.find(x => x.id === pid);
  msg('<div class="spin"></div><p class="empty">กำลังโหลดข้อมูลโครงการ…</p>');
  try { await Promise.all([loadSettings(), loadRows()]); }
  catch (e) { console.error(e); msg(`<div class="card" style="margin-top:20px"><b>โหลดข้อมูลไม่สำเร็จ</b><span style="color:var(--mut);font-size:14px">${esc((e && e.message) || e)}</span><button class="btn pri" onclick="location.reload()">ลองใหม่</button></div>`); return; }
  const sub = [projName(APP.proj), projCode(APP.proj)].filter(Boolean).join(' · ');
  $('listProj').textContent = sub; $('pickProj').textContent = sub;
  show('list'); renderList();
}

// =====================================================================
// หน้ารายการ
// =====================================================================
const isMine = (r) => norm(r.created_email) === APP.me.email;
function rowLabel(r) { return [r.name, r.work].filter(Boolean).join(' · ') || '(ไม่มีชื่อ)'; }
function renderList() {
  const S = APP.set || {}, me = APP.me;
  const rows = APP.rows.filter(r => APP.filter === 'all' || isMine(r));
  const h = [];
  $('listTitle').textContent = APP.filter === 'all' ? 'ที่วัดในโครงการนี้ (ทุกคน)' : 'ที่ฉันวัดในโครงการนี้';
  if (APP.noTable) h.push('<div class="note">ยังใช้งานไม่ได้: ผู้ดูแลระบบต้องรัน SQL <b>supabase-quick-measure.sql</b> ก่อน</div>');
  if (!S.allow_quick_measure) h.push('<div class="info">Admin ปิด Quick Measure ของโครงการนี้ไว้ — ดูรายการเดิมได้ แต่วัดเพิ่มไม่ได้</div>');
  h.push(`<div class="chips" role="tablist"><button class="chip${APP.filter === 'mine' ? ' on' : ''}" data-f="mine">ของฉัน</button><button class="chip${APP.filter === 'all' ? ' on' : ''}" data-f="all">ทุกคน</button>
    <button class="chip" data-f="reload" aria-label="โหลดใหม่">↻ โหลดใหม่</button><button class="chip" data-his="u" title="ย้อน (Ctrl+Z)">↶ ย้อน</button><button class="chip" data-his="r" title="ทำซ้ำ (Ctrl+Y)">↷ ทำซ้ำ</button></div>`);
  if (!rows.length) h.push('<p class="empty">ยังไม่มีรายการ — กด “+ วัดเพิ่ม” เพื่อเริ่มวัด</p>');
  rows.forEach(r => {
    const role = ROLE_TH[r.created_role] || r.created_role || '';
    const who = APP.filter === 'all' ? (r.created_by || '') + (role ? ' (' + role + ')' : '') : role || r.created_by || '';
    h.push(`<button class="card" data-row="${esc(r.id)}"><div class="row1"><span class="nm">${esc(rowLabel(r))}</span><span class="q">${r.qty == null ? '—' : esc(fq(+r.qty, r.unit)) + ' ' + esc(r.unit || '')}</span></div>
      <div class="row2"><span class="tag t-${esc(r.status)}">${esc(ST[r.status] || r.status)}</span><span>${esc(when(r.created_at))}${who ? ' · ' + esc(who) : ''}</span>${r.status === 'returned' && r.qs_note ? `<span style="color:#8C2F2F">QS: ${esc(r.qs_note)}</span>` : ''}</div></button>`);
  });
  h.push('<div class="note">ตัวเลขที่ PM วัด ใช้วางแผนหน้างานและตรวจของเข้า ไม่แทนที่ BOQ ของ QS จนกว่า QS ตรวจรับ</div>');
  // ปริมาณ baseline จาก QS — แสดงเฉพาะเมื่อ Admin เปิด "แสดงปริมาณ BOQ" (ไม่มีราคา)
  const Q = (APP.feed && APP.feed.quantities) || [];
  if (S.show_qty && Q.length) {
    h.push('<div class="sec">ปริมาณ BOQ จาก QS (baseline)</div>');
    h.push('<div class="card">' + Q.map(q => `<div class="row1" style="font-size:14px"><span class="nm" style="font-weight:400">${esc([q.catName || q.cat, q.desc].filter(Boolean).join(' · '))}</span><span class="q">${esc(f2(q.net))} ${esc(q.unit || q.u || '')}</span></div>`).join('') + '</div>');
  }
  if (me.review) {
    const n = APP.rows.filter(r => r.status === 'submitted').length;
    if (n) h.unshift(`<div class="info" style="background:#E3ECF5;color:#2F5E8C">มี ${n} รายการรอ QS ตรวจ — แตะรายการเพื่อ “รับ” หรือ “ส่งกลับ”</div>`);
  }
  h.push(`<p class="ver">Quick Measure ${QM_VER} · engine ${E.ENGINE_VERSION}</p>`);
  $('listBody').innerHTML = h.join('');
  const pend = APP.rows.filter(r => isMine(r) && (r.status === 'field' || r.status === 'returned')).length;
  $('btnSubmit').textContent = 'ส่งให้ QS ตรวจ' + (pend ? ' (' + pend + ')' : '');
  $('btnSubmit').disabled = APP.noTable;
  $('btnNew').hidden = !S.allow_quick_measure || APP.noTable;
  hisBtns();
}
$('listBody').addEventListener('click', async (e) => {
  const f = e.target.closest('[data-f]');
  if (f) { if (f.dataset.f === 'reload') { toast('กำลังโหลดใหม่…', 900); try { await Promise.all([loadSettings(), loadRows()]); } catch (x) { toast('โหลดไม่สำเร็จ'); } } else APP.filter = f.dataset.f; renderList(); return; }
  const b = e.target.closest('[data-row]'); if (b) openRow(b.dataset.row);
});
$('btnNew').addEventListener('click', () => { renderPick(); show('pick', true); });
$('btnSubmit').addEventListener('click', async () => {
  const L = APP.rows.filter(r => isMine(r) && (r.status === 'field' || r.status === 'returned'));
  if (!L.length) { toast('ไม่มีรายการรอส่ง — ทุกรายการของคุณส่ง QS แล้ว'); return; }
  if (!confirm(`ส่ง ${L.length} รายการให้ QS ตรวจ?\nส่งแล้วแก้/ลบไม่ได้ จนกว่า QS จะส่งกลับ`)) return;
  const now = new Date().toISOString();
  const r = await sb.from('takeoff_field_measures').update({ status: 'submitted', submitted_by: APP.me.name, submitted_at: now }).in('id', L.map(x => x.id)).select('*');
  if (r.error) { toast('ส่งไม่สำเร็จ: ' + r.error.message, 4000); return; }
  (r.data || []).forEach(n => { const i = APP.rows.findIndex(x => x.id === n.id); if (i >= 0) APP.rows[i] = n; });
  const prev = L.map(x => ({ id: x.id, status: x.status, submitted_by: x.submitted_by || null, submitted_at: x.submitted_at || null }));
  hisPush({ kind: 'act', label: 'ส่ง QS ' + prev.length + ' รายการ',
    undo: async () => { for (const p of prev) { const c = APP.rows.find(x => x.id === p.id); if (c && c.status !== 'submitted') throw new Error('QS ตรวจรายการแล้ว ย้อนไม่ได้'); }
      for (const p of prev) await rowSet(p.id, { status: p.status, submitted_by: p.submitted_by, submitted_at: p.submitted_at }); },
    redo: async () => { const t = new Date().toISOString(); for (const p of prev) await rowSet(p.id, { status: 'submitted', submitted_by: APP.me.name, submitted_at: t }); } });
  renderList(); toast(`ส่ง ${L.length} รายการให้ QS ตรวจแล้ว · ส่งผิดกด ↶ ย้อน (Ctrl+Z)`);
});

// ---------- รายละเอียด 1 รายการ ----------
function openRow(id) {
  const r = APP.rows.find(x => x.id === id); if (!r) return;
  const sh = r.source === 'qs' ? drawingTitle((APP.feed.drawings || []).find(d => d.id === r.qs_file_id), r.page) : ((APP.sheets.find(s => s.id === r.sheet_id) || {}).name || 'รูปที่อัปโหลด');
  $('rwTitle').textContent = rowLabel(r);
  const kv = [['ปริมาณ', r.qty == null ? '—' : fq(+r.qty, r.unit) + ' ' + (r.unit || '')], r.perimeter_m ? ['รอบรูป', f2(+r.perimeter_m) + ' ม.'] : null,
    r.height_mm ? ['ความสูง', f2(r.height_mm / 1000) + ' ม.'] : null, r.deduct ? ['ชนิด', 'หักออก'] : null,
    ['สถานะ', ST[r.status] || r.status], ['แบบ', sh || '—'], ['วัดโดย', (r.created_by || '') + ' · ' + when(r.created_at)],
    r.submitted_at ? ['ส่ง QS', (r.submitted_by || '') + ' · ' + when(r.submitted_at)] : null,
    r.reviewed_at ? ['QS ตรวจ', (r.reviewed_by || '') + ' · ' + when(r.reviewed_at)] : null,
    r.note ? ['หมายเหตุ', r.note] : null, r.qs_note ? ['หมายเหตุ QS', r.qs_note] : null].filter(Boolean);
  $('rwKv').innerHTML = kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const canRev = APP.me.review && r.status === 'submitted';
  const canEdit = isMine(r) && (r.status === 'field' || r.status === 'returned');
  $('rwQsNoteWrap').hidden = !canRev; $('rwQsNote').value = '';
  const B = [];
  if (canRev) { B.push('<button class="btn" value="return">ส่งกลับให้แก้</button>', '<button class="btn pri" value="accept">QS รับแล้ว</button>'); }
  if (canEdit) B.push('<button class="btn" value="del" style="color:#8C2F2F">ลบรายการ</button>');
  B.push('<button class="btn" value="view">ดูบนแบบ</button>', '<button class="btn" value="cancel">ปิด</button>');
  $('rwBtns').innerHTML = B.join('');
  const d = $('dlgRow'); d.returnValue = ''; d.showModal();
  d.onclose = async () => {
    const v = d.returnValue; d.onclose = null;
    if (v === 'accept' || v === 'return') {
      if (v === 'return' && !$('rwQsNote').value.trim()) { toast('ใส่หมายเหตุว่าต้องแก้อะไร ก่อนส่งกลับ'); setTimeout(() => openRow(id), 50); return; }
      const patch = { status: v === 'accept' ? 'accepted' : 'returned', reviewed_by: APP.me.name, reviewed_at: new Date().toISOString(), qs_note: $('rwQsNote').value.trim() || null };
      const before = { status: r.status, reviewed_by: r.reviewed_by || null, reviewed_at: r.reviewed_at || null, qs_note: r.qs_note || null };
      if (await patchRow(r, patch)) hisPush({ kind: 'act', label: (v === 'accept' ? 'QS รับ ' : 'ส่งกลับ ') + rowLabel(r), undo: () => rowSet(r.id, before), redo: () => rowSet(r.id, patch) });
    } else if (v === 'del') {
      if (!confirm('ลบรายการ “' + rowLabel(r) + '”?')) return;
      if (await patchRow(r, { deleted_at: new Date().toISOString() }, true)) hisPush({ kind: 'act', label: 'ลบ ' + rowLabel(r), undo: () => rowSet(r.id, { deleted_at: null }), redo: () => rowSet(r.id, { deleted_at: new Date().toISOString() }) });
    } else if (v === 'view') {
      const src = r.source === 'qs' ? qsSrc((APP.feed.drawings || []).find(x => x.id === r.qs_file_id), r.page) : upSrc(APP.sheets.find(s => s.id === r.sheet_id));
      if (!src) { toast('ไม่พบแบบของรายการนี้แล้ว (อาจถูกแทนด้วย Rev. ใหม่)'); return; }
      show('measure', true); MV.open(src, r.id);
    }
  };
}
async function patchRow(r, patch, remove) {
  const q = await sb.from('takeoff_field_measures').update(patch).eq('id', r.id).select('*');
  if (q.error) { toast('บันทึกไม่สำเร็จ: ' + q.error.message, 4000); return false; }
  const i = APP.rows.findIndex(x => x.id === r.id);
  if (remove) { if (i >= 0) APP.rows.splice(i, 1); } else if (q.data && q.data[0] && i >= 0) APP.rows[i] = q.data[0];
  renderList(); if (APP.screen === 'measure') MV.side(); toast((remove ? 'ลบแล้ว' : 'บันทึกแล้ว') + ' · กด ↶ ย้อน (Ctrl+Z) ได้'); return true;
}

// =====================================================================
// เลือกแบบ: แบบจาก QS (ถ้า Admin เปิด "ส่งแบบและโซน") หรือ อัปโหลดรูป/PDF เอง
// =====================================================================
function drawingTitle(d, page) { if (!d) return ''; const t = [d.drawing_no, d.sheet_title || d.file_name].filter(Boolean).join(' · ');
  return t + (d.page_count > 1 ? ' · หน้า ' + (page + 1) : ''); }
function qsSrc(d, page) { if (!d) return null; const sc = (d.page_scales || [])[page] || {};
  return { key: 'qs:' + d.id + ':' + page, source: 'qs', fileId: d.id, page, name: drawingTitle(d, page), bucket: QS_BUCKET, path: d.storage_path, mime: d.mime_type || '',
    mm: sc.mm || null, r: sc.r || null, mmSrc: sc.mm ? 'qs' : null, rev: d.revision }; }
function upSrc(s) { if (!s) return null; return { key: 'up:' + s.id, source: 'upload', sheetId: s.id, page: s.page || 0, name: s.name || 'รูปที่อัปโหลด', bucket: UP_BUCKET,
  path: s.storage_path, mime: s.mime_type || '', mm: s.mm_per_px ? +s.mm_per_px : null, r: s.page_r ? +s.page_r : null, mmSrc: s.mm_per_px ? 'own' : null }; }
function renderPick() {
  const S = APP.set, F = APP.feed || {}, h = [];
  h.push('<button class="btn pri wide" id="btnUp" style="width:100%">📷 ถ่ายรูป / อัปโหลดแบบ (รูป · PDF · DXF)</button>');
  if (!F.handed_off) h.push('<div class="info">QS ยังไม่ส่งต่องานของโครงการนี้ — อัปโหลดรูปถ่ายหรือ PDF แล้วตั้งสเกลเอง</div>');
  else if (!S.send_drawings) h.push('<div class="info">Admin ปิด “ส่งแบบและโซน” — ใช้รูปถ่าย/PDF ที่อัปโหลดเองแทน</div>');
  else {
    const D = F.drawings || [];
    h.push('<div class="sec">แบบจาก QS</div>');
    if (!D.length) h.push('<p class="empty">QS ยังไม่มีแบบในงานนี้</p>');
    D.forEach(d => { const n = Math.max(1, d.page_count || 1);
      for (let p = 0; p < n; p++) { const sc = (d.page_scales || [])[p] || {}; const zn = (F.zones || []).filter(z => z.file_id === d.id && z.page === p).length;
        h.push(`<button class="card" data-qs="${esc(d.id)}" data-page="${p}"><div class="row1"><span class="nm">${esc(drawingTitle(d, p))}</span>${d.revision ? `<span class="tag t-submitted">${esc(d.revision)}</span>` : ''}</div>
          <div class="row2">${d.floor_label ? esc(d.floor_label) + ' · ' : ''}${zn} โซน · ${sc.mm ? '<span class="tag t-accepted">สเกลจาก QS</span>' : '<span class="tag t-returned">ยังไม่ตั้งสเกล</span>'}</div></button>`); } });
  }
  h.push('<div class="sec" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="flex:1 1 180px">รูป / แบบที่อัปโหลดเอง · แก้ชื่อ / เพิ่มหน้า / ลบ ได้</span><button class="chip" data-his="u" title="ย้อน (Ctrl+Z)" style="min-height:34px;font-size:13px">↶ ย้อน</button><button class="chip" data-his="r" title="ทำซ้ำ (Ctrl+Y)" style="min-height:34px;font-size:13px">↷ ทำซ้ำ</button></div>');
  if (!APP.sheets.length) h.push('<p class="empty" style="padding:12px">ยังไม่มี</p>');
  [...APP.sheets].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(a.storage_path || '').localeCompare(String(b.storage_path || '')) || (a.page || 0) - (b.page || 0)).forEach(s => {
    const nM = APP.rows.filter(r => r.sheet_id === s.id).length;
    h.push(`<div class="upw"><button class="card" data-up="${esc(s.id)}"><div class="row1"><span class="nm">${esc(s.name || 'รูปที่อัปโหลด')}</span></div>
    <div class="row2">${esc(when(s.created_at))} · ${esc(s.created_by || '')} · ${s.mm_per_px ? '<span class="tag t-submitted">ตั้งสเกลแล้ว</span>' : '<span class="tag t-returned">ยังไม่ตั้งสเกล</span>'}${nM ? ' · วัดแล้ว ' + nM + ' รายการ' : ''}</div></button>
    <div class="upa"><button class="chip" data-ren="${esc(s.id)}">✎ แก้ชื่อ</button>${isPdfSheet(s) ? `<button class="chip" data-addpg="${esc(s.id)}">+ เพิ่มหน้าจากไฟล์นี้</button>` : ''}<button class="chip del" data-del="${esc(s.id)}">🗑 ลบ</button></div></div>`); });
  $('pickBody').innerHTML = h.join(''); hisBtns();
}
$('pickBody').addEventListener('click', (e) => {
  if (e.target.closest('#btnUp')) { $('upFile').value = ''; $('upFile').click(); return; }
  const rn = e.target.closest('[data-ren]'); if (rn) { renameSheet(rn.dataset.ren); return; }
  const dl = e.target.closest('[data-del]'); if (dl) { delSheet(dl.dataset.del); return; }
  const ap = e.target.closest('[data-addpg]'); if (ap) { addPages(ap.dataset.addpg); return; }
  const q = e.target.closest('[data-qs]');
  if (q) { const d = (APP.feed.drawings || []).find(x => x.id === q.dataset.qs); show('measure', true); MV.open(qsSrc(d, +q.dataset.page)); return; }
  const u = e.target.closest('[data-up]');
  if (u) { show('measure', true); MV.open(upSrc(APP.sheets.find(s => s.id === u.dataset.up))); }
});
// อัปโหลด: รูปถูกย่อด้านยาวไม่เกิน 4096 px ก่อนส่ง (ประหยัดเน็ตหน้างาน)
// v1.1.0 PDF → เลือกหน้าได้ (หน้าเดียว / หลายหน้า / ช่วงหน้า) · แต่ละหน้าที่เลือก = แบบแยก 1 รายการ (ไฟล์เดียวกัน คนละ page)
//        แก้ชื่อ / เพิ่มหน้าจากไฟล์เดิม / ลบแบบ ได้ตลอดหลังนำเข้า
const pdfOf = async (blob) => pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
const sheetBase = (s) => String((s && s.name) || '').replace(/\s+·\s+หน้า\s+\d+$/, '');
const isPdfSheet = (s) => /pdf/i.test((s && s.mime_type) || '') || /\.pdf$/i.test((s && s.storage_path) || '');
const pgRange = (t, n) => { const o = {}; String(t || '').split(/[,\s]+/).forEach(x => { const m = x.match(/^(\d+)(?:-(\d+))?$/); if (!m) return;
  let a = +m[1], b = m[2] ? +m[2] : a; if (a > b) [a, b] = [b, a]; for (let p = Math.max(1, a); p <= Math.min(n, b); p++) o[p - 1] = true; }); return o; };
// หน้าต่างเลือกหน้า PDF → คืน [page index เริ่ม 0] หรือ null ถ้ายกเลิก · have = หน้าที่นำเข้าแล้ว
function pickPages(title, doc, have) {
  have = have || {}; const n = doc.numPages;
  if (n <= 1 && !have[0]) return Promise.resolve([0]);
  return new Promise(res => {
    const dlg = $('dlgPages'), grid = $('pgGrid'), sel = {}, tok = { dead: false };
    for (let p = 0; p < n; p++) if (!have[p]) sel[p] = n <= 12;
    const nHave = Object.keys(have).length;
    $('pgTitle').textContent = 'เลือกหน้าที่จะนำเข้า · ' + title; $('pgRange').value = '';
    grid.innerHTML = Array.from({ length: n }, (_, p) => `<button type="button" class="pg${have[p] ? ' had' : ''}" data-pg="${p}"><span class="th"><img alt="" hidden><i>กำลังโหลด…</i></span><b>หน้า ${p + 1}</b><em>${have[p] ? 'มีแล้ว' : '✓'}</em></button>`).join('');
    const draw = () => { const k = Object.keys(sel).filter(p => sel[p]).length;
      $('pgSub').textContent = n + ' หน้า' + (nHave ? ' · นำเข้าแล้ว ' + nHave + ' หน้า' : '') + ' · เลือกแล้ว ' + k + ' หน้า — แตะรูปเพื่อเลือก / ยกเลิก';
      $('pgOk').textContent = k ? '✓ Confirm นำเข้า ' + k + ' หน้า' : 'เลือกหน้าก่อน'; $('pgOk').disabled = !k;
      grid.querySelectorAll('[data-pg]').forEach(b => b.classList.toggle('on', !!sel[+b.dataset.pg])); };
    const done = (v) => { if (tok.dead) return; tok.dead = true; try { dlg.close(); } catch (e) {} res(v); };
    const setAll = (fn) => { for (let p = 0; p < n; p++) if (!have[p]) sel[p] = fn(p); draw(); };
    grid.onclick = (e) => { const b = e.target.closest('[data-pg]'); if (!b) return; const p = +b.dataset.pg; if (have[p]) return; sel[p] = !sel[p]; draw(); };
    $('pgAll').onclick = () => setAll(() => true);
    $('pgNone').onclick = () => setAll(() => false);
    const goRange = () => { const r = pgRange($('pgRange').value, n); if (!Object.keys(r).length) { toast('พิมพ์เลขหน้า เช่น 1-3, 5, 8'); return; } setAll(p => !!r[p]); };
    $('pgGo').onclick = goRange;
    $('pgRange').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); goRange(); } };
    $('pgCancel').onclick = () => done(null);
    dlg.oncancel = (e) => { e.preventDefault(); done(null); };
    $('pgOk').onclick = () => { const ps = Object.keys(sel).filter(p => sel[p]).map(Number).sort((a, b) => a - b);
      if (!ps.length) return; if (ps.length > 80) { toast('เลือกได้ครั้งละไม่เกิน 80 หน้า (เลือกไว้ ' + ps.length + ')', 4000); return; } done(ps); };
    draw(); dlg.showModal();
    (async () => { for (let p = 0; p < Math.min(n, 150); p++) { if (tok.dead) return;
      try { const pg = await doc.getPage(p + 1), v1 = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: 200 / Math.max(v1.width, v1.height) });
        const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: g, viewport: v }).promise; const b = grid.querySelector(`[data-pg="${p}"]`); if (!b) continue;
        const im = b.querySelector('img'); im.src = c.toDataURL('image/jpeg', .72); im.hidden = false; b.querySelector('i').hidden = true; } catch (e) {} } })();
  });
}
$('upFile').addEventListener('change', async () => {
  const f = $('upFile').files[0]; if (!f) return;
  const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  // v1.4.0 DXF (AutoCAD): แปลงในเครื่องเป็นภาพคมชัด + สเกลอัตโนมัติ (มม. ต่อ px จากหน่วยใน DXF) — ไม่ต้องตั้งสเกลเอง
  let dx = null;
  if (/\.dxf$/i.test(f.name)) { if (!window.WDraw) { toast('ตัวอ่าน DXF ยังโหลดไม่เสร็จ — ลองใหม่'); return; } toast('กำลังแปลง DXF…', 30000);
    try { const R = await WDraw.importDxf(f); const k = MAX_BMP / Math.max(R.w, R.h), pw = Math.round(R.w * k), ph = Math.round(R.h * k); const u = URL.createObjectURL(R.blob);
      let c; try { c = await WDraw.renderSvgRegion(u, { x: 0, y: 0, w: 1, h: 1 }, pw, ph, 1.6); } finally { URL.revokeObjectURL(u); }
      dx = { blob: await new Promise(res => c.toBlob(res, 'image/png')), mm: R.wmm / c.width }; $('toast').hidden = true; }
    catch (e) { console.error(e); toast('อ่าน DXF ไม่ได้: ' + ((e && e.message) || e) + ' — ใน AutoCAD ใช้ Save As → DXF แล้วลองใหม่', 6000); return; } }
  if (!dx && !isPdf && !/^image\//.test(f.type)) { toast('รองรับรูปภาพ · PDF · DXF'); return; }
  let doc = null, pages = [0];
  if (isPdf) {
    toast('กำลังเปิด PDF…', 30000);
    try { doc = await pdfOf(f); } catch (e) { console.error(e); toast('เปิด PDF ไม่ได้: ' + ((e && e.message) || e), 5000); return; }
    $('toast').hidden = true;
    pages = await pickPages(f.name, doc, {}); if (!pages || !pages.length) return;
  }
  const multi = !!(doc && doc.numPages > 1);
  const name = prompt(multi ? 'ตั้งชื่อชุดแบบ (แต่ละหน้าจะต่อท้าย “· หน้า N”)' : 'ตั้งชื่อแบบ / รูปนี้', f.name.replace(/\.[^.]+$/, '')); if (name === null) return;
  const base = (name || '').trim() || f.name.replace(/\.[^.]+$/, '');
  toast('กำลังอัปโหลด…', 30000);
  try {
    let blob = f, ext = isPdf ? 'pdf' : 'jpg', mime = isPdf ? 'application/pdf' : 'image/jpeg';
    if (dx) { blob = dx.blob; ext = 'png'; mime = 'image/png'; } else if (!isPdf) blob = await shrinkImage(f);
    const key = 'quick-measure/' + APP.pid.replace(/[^\w-]/g, '_') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const up = await sb.storage.from(UP_BUCKET).upload(key, blob, { contentType: mime, upsert: false });
    if (up.error) throw up.error;
    const recs = pages.map(p => ({ pm_project_id: APP.pid, name: multi ? base + ' · หน้า ' + (p + 1) : base, storage_path: key, mime_type: mime, page: p, created_by: APP.me.name, created_email: APP.me.email, ...(dx ? { mm_per_px: dx.mm } : {}) }));
    const ins = await sb.from('takeoff_field_sheets').insert(recs).select('*');
    if (ins.error) { sb.storage.from(UP_BUCKET).remove([key]); throw ins.error; }
    const got = (ins.data || []).slice().sort((a, b) => (a.page || 0) - (b.page || 0));
    got.forEach(s => { APP.bin['up:' + s.id] = blob; }); APP.sheets.unshift(...got);
    { const ids = got.map(x => x.id); hisPush({ kind: 'act', label: 'นำเข้า ' + base + (ids.length > 1 ? ' (' + ids.length + ' หน้า)' : ''),
      undo: () => { const n = measuresOn(ids); if (n) throw new Error('มีรายการวัดบนแบบนี้ ' + n + ' รายการ'); return sheetSet(ids, { deleted_at: new Date().toISOString() }); },
      redo: () => sheetSet(ids, { deleted_at: null }) }); }
    if (got.length === 1) { toast(dx ? '✓ นำเข้า DXF แล้ว — สเกลจริงจากไฟล์ (ไม่ต้องตั้งสเกล) วัดได้ทันที' : 'อัปโหลดแล้ว — ขั้นแรก ตั้งสเกล', 3500); show('measure', true); MV.open(upSrc(got[0])); }
    else { renderPick(); toast('นำเข้าแล้ว ' + got.length + ' หน้า — แตะหน้าที่จะวัด (ตั้งสเกลแต่ละหน้า)', 4000); }
  } catch (e) { console.error(e); toast('อัปโหลดไม่สำเร็จ: ' + ((e && e.message) || e), 5000); }
});
// ---- จัดการแบบที่อัปโหลดเอง: แก้ชื่อ / เพิ่มหน้า / ลบ ----
async function renameSheet(id) {
  const s = APP.sheets.find(x => x.id === id); if (!s) return;
  const v = prompt('ชื่อแบบ', s.name || ''); if (v === null) return; const nm = v.trim(); if (!nm || nm === s.name) return;
  const r = await sb.from('takeoff_field_sheets').update({ name: nm }).eq('id', id).select('*');
  if (r.error) { toast('แก้ชื่อไม่สำเร็จ: ' + r.error.message, 4000); return; }
  const old = s.name || ''; Object.assign(s, (r.data && r.data[0]) || { name: nm }); renderPick(); toast('แก้ชื่อแล้ว · กด ↶ ย้อน (Ctrl+Z) ได้');
  hisPush({ kind: 'act', label: 'แก้ชื่อ ' + nm, undo: () => sheetSet([id], { name: old }), redo: () => sheetSet([id], { name: nm }) });
}
async function delSheet(id) {
  const s = APP.sheets.find(x => x.id === id); if (!s) return;
  const n = APP.rows.filter(r => r.sheet_id === id).length;
  if (n) { alert('ลบไม่ได้ — มีรายการวัด ' + n + ' รายการบนแบบ “' + (s.name || '') + '”\nลบรายการวัดเหล่านั้นก่อน แล้วค่อยลบแบบ'); return; }
  if (!confirm('ลบแบบ “' + (s.name || '') + '”?')) return;
  const r = await sb.from('takeoff_field_sheets').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (r.error) { toast('ลบไม่สำเร็จ: ' + r.error.message, 4000); return; }
  APP.sheets = APP.sheets.filter(x => x.id !== id); renderPick(); toast('ลบแบบแล้ว · ลบผิดกด ↶ ย้อน (Ctrl+Z)');
  hisPush({ kind: 'act', label: 'ลบแบบ ' + (s.name || ''), undo: () => sheetSet([id], { deleted_at: null }),
    redo: () => { const n = measuresOn([id]); if (n) throw new Error('มีรายการวัดบนแบบนี้ ' + n + ' รายการ'); return sheetSet([id], { deleted_at: new Date().toISOString() }); } });
}
async function addPages(id) {
  const s0 = APP.sheets.find(x => x.id === id); if (!s0) return;
  const grp = APP.sheets.filter(x => x.storage_path === s0.storage_path); const have = {}; grp.forEach(x => { have[x.page || 0] = true; });
  toast('กำลังเปิด PDF…', 30000); let blob, doc;
  try { blob = APP.bin['up:' + id]; if (!blob) { const r = await sb.storage.from(UP_BUCKET).download(s0.storage_path); if (r.error) throw r.error; blob = r.data; } doc = await pdfOf(blob); }
  catch (e) { console.error(e); toast('เปิดไฟล์ไม่ได้: ' + ((e && e.message) || e), 5000); return; }
  $('toast').hidden = true;
  if (Object.keys(have).length >= doc.numPages) { toast('นำเข้าครบทุกหน้าของไฟล์นี้แล้ว'); return; }
  const base = sheetBase(grp.find(x => /\s+·\s+หน้า\s+\d+$/.test(x.name || '')) || s0);
  const pages = await pickPages(base, doc, have); if (!pages || !pages.length) return;
  toast('กำลังเพิ่มหน้า…', 30000);
  const recs = pages.map(p => ({ pm_project_id: APP.pid, name: base + ' · หน้า ' + (p + 1), storage_path: s0.storage_path, mime_type: s0.mime_type || 'application/pdf', page: p, created_by: APP.me.name, created_email: APP.me.email }));
  const ins = await sb.from('takeoff_field_sheets').insert(recs).select('*');
  if (ins.error) { toast('เพิ่มหน้าไม่สำเร็จ: ' + ins.error.message, 5000); return; }
  (ins.data || []).forEach(s => { APP.bin['up:' + s.id] = blob; }); APP.sheets.unshift(...(ins.data || []));
  { const ids = (ins.data || []).map(x => x.id); hisPush({ kind: 'act', label: 'เพิ่ม ' + ids.length + ' หน้า',
    undo: () => { const n = measuresOn(ids); if (n) throw new Error('มีรายการวัดบนหน้าที่เพิ่ม ' + n + ' รายการ'); return sheetSet(ids, { deleted_at: new Date().toISOString() }); },
    redo: () => sheetSet(ids, { deleted_at: null }) }); }
  renderPick(); toast('เพิ่มแล้ว ' + recs.length + ' หน้า — ตั้งสเกลแต่ละหน้าก่อนวัด', 3500);
}
async function shrinkImage(f) {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) return f;
  const k = Math.min(1, MAX_BMP / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(b => res(b || f), 'image/jpeg', 0.9));
}

// =====================================================================
// หน้าวัด (canvas): แตะมุมห้องทีละจุด · ลากจุดเพื่อปรับ · สองนิ้ว = ซูม/เลื่อน
// พิกัดทั้งหมดอยู่ใน "พิกเซลของหน้าแบบ" เดียวกับ QS (PDF render ที่ตัวคูณ r) → สูตร engine ใช้ได้ตรง
// =====================================================================
const MV = (() => {
  const cv = $('cv'), box = $('cvw'), ctx = cv.getContext('2d');
  let PGO = null, PR = 1, HI = null, hiT = 0, hiG = 0;   // v1.4 แบบคมชัด: render ใหม่จาก PDF เฉพาะส่วนที่มองเห็นเมื่อซูมเกินความละเอียดภาพ
  let SRC = null, BMP = null, W = 0, H = 0, V = { k: 1, ox: 0, oy: 0 }, dpr = 1, fitV = null;
  let tool = 'area', pts = [], drag = -1, focusId = null, loupe = null, loading = false, scalePts = null;
  const KIND = { area: 'พื้นที่', length: 'ความยาว', count: 'นับจุด', note: 'โน้ต', ruler: 'ไม้บรรทัด', scale: 'ตั้งสเกล' };
  const KEY = { area: 'A', length: 'L', count: 'C', note: 'N', ruler: 'R', scale: 'S' };
  // v1.2.0 ประวัติการวาด (ย้อน/ทำซ้ำ) — เก็บสภาพก่อนแก้ทุกครั้ง
  const snapD = () => ({ pts: pts.map(p => p.slice()), sp: scalePts ? scalePts.map(p => p.slice()) : null, tool });
  function restoreD(st) { pts = st.pts.map(p => p.slice()); scalePts = st.sp ? st.sp.map(p => p.slice()) : null; drag = -1; loupe = null;
    if (st.tool !== tool) { tool = st.tool; tools(); } draw(); upd(); }
  function rec(label) { if (!SRC) return; const key = SRC.key; const e = { kind: 'draw', key, label, quiet: true, before: snapD(), after: null,
      undo: () => { if (!SRC || SRC.key !== key || APP.screen !== 'measure') return false; e.after = snapD(); restoreD(e.before); },
      redo: () => { if (!SRC || SRC.key !== key || APP.screen !== 'measure' || !e.after) return false; restoreD(e.after); } };
    hisPush(e); }
  async function setMm(src, mm, mmSrc) {
    if (src.source === 'upload') { const r = await sb.from('takeoff_field_sheets').update({ mm_per_px: mm }).eq('id', src.sheetId).select('*'); if (r.error) throw r.error;
      const i = APP.sheets.findIndex(s => s.id === src.sheetId); if (i >= 0 && r.data && r.data[0]) APP.sheets[i] = r.data[0]; }
    else { try { if (mm) localStorage.setItem('qm_scale_' + src.key, String(mm)); else localStorage.removeItem('qm_scale_' + src.key); } catch (e) {} }
    src.mm = mm; src.mmSrc = mm ? mmSrc : null;
    if (SRC === src) { if (!mm) tool = 'scale'; else if (tool === 'scale') tool = 'area'; header(); tools(); draw(); upd(); } }

  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 3); const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); if (BMP && !fitV) fit(); paint(); }
  new ResizeObserver(() => { if (APP.screen === 'measure') resize(); }).observe(box);
  function fit() { const w = box.clientWidth, h = box.clientHeight; if (!W || !w) return; const k = Math.min(w / W, h / H) * 0.96;
    V = { k, ox: (w - W * k) / 2, oy: (h - H * k) / 2 }; fitV = { ...V }; }
  const toDoc = (p) => [(p.x - V.ox) / V.k, (p.y - V.oy) / V.k];
  const toScr = (d) => [d[0] * V.k + V.ox, d[1] * V.k + V.oy];

  async function blobOf(src) {
    if (APP.bin[src.key]) return APP.bin[src.key];
    const r = await sb.storage.from(src.bucket).download(src.path);
    if (r.error) throw r.error; APP.bin[src.key] = r.data; return r.data;
  }
  async function open(src, focus) {
    hisDrop(e => e.kind === 'draw');
    SRC = src; BMP = null; W = H = 0; PGO = null; HI = null; hiG++; pts = []; drag = -1; scalePts = null; focusId = focus || null; fitV = null; loading = true;
    tool = src.mm ? 'area' : 'scale';
    header(); tools(); paint(); hint('กำลังเปิดแบบ…'); side(); left();
    try {
      const blob = await blobOf(src);
      const isPdf = /pdf/i.test(src.mime) || /\.pdf$/i.test(src.path);
      if (isPdf) {
        const doc = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
        const page = await doc.getPage(Math.min(src.page, doc.numPages - 1) + 1), v1 = page.getViewport({ scale: 1 });
        // r เดียวกับที่ QS ใช้ (เก็บใน page_scales) — ถ้ายังไม่มี คำนวณสูตรเดียวกับ QS
        const r = src.r || Math.round(clamp(5000 / Math.max(v1.width, v1.height), 1, 2.5) * 1000) / 1000;
        src.r = r; W = Math.floor(v1.width * r); H = Math.floor(v1.height * r);
        // ความคมของภาพแยกจากหน่วยพิกัด: เรนเดอร์อย่างน้อย 2.5 เท่า (ไม่เกิน 4096 px) แล้วย่อ/ขยายวาดลงพิกัด W×H
        // (แผ่นแบบที่ย้ายจาก Takeoff เดิมใช้พิกัด "จุด PDF" r = 1 — ถ้าเรนเดอร์ที่ 1 เท่าภาพจะเบลอ)
        const rr = Math.min(Math.max(r, 2.5), MAX_BMP / Math.max(v1.width, v1.height)), v = page.getViewport({ scale: rr });
        const c = document.createElement('canvas'); c.width = Math.floor(v.width); c.height = Math.floor(v.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: v }).promise; BMP = c; PGO = page; PR = r;
        if (src.source === 'upload' && !src.isPdfR) { src.isPdfR = true; const s = APP.sheets.find(x => x.id === src.sheetId); if (s && !s.page_r) { s.page_r = r; sb.from('takeoff_field_sheets').update({ page_r: r }).eq('id', s.id).then(() => {}); } }
      } else {
        const bmp = await createImageBitmap(blob); W = bmp.width; H = bmp.height;
        if (Math.max(W, H) > MAX_BMP) { const k = MAX_BMP / Math.max(W, H); const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); BMP = c; }
        else BMP = bmp;
      }
      // QS ยังไม่ตั้งสเกลหน้านี้ → ใช้สเกลที่ PM ตั้งเองในเครื่อง (ไม่เขียนกลับไปที่ QS)
      if (src.source === 'qs' && !src.mm) { try { const m = +localStorage.getItem('qm_scale_' + src.key); if (m > 0) { src.mm = m; src.mmSrc = 'own'; tool = 'area'; } } catch (e) {} }
      loading = false; resize(); fit();
      if (focusId) focusRow(focusId);
      header(); tools(); paint(); upd(); side(); left();
    } catch (e) { console.error(e); loading = false; hint('เปิดแบบไม่สำเร็จ: ' + ((e && e.message) || e)); }
  }
  function focusRow(id) { const r = APP.rows.find(x => x.id === id); if (!r || !r.pts || !r.pts.length) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; r.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    const w = box.clientWidth, h = box.clientHeight, bw = Math.max(x1 - x0, 40), bh = Math.max(y1 - y0, 40); const k = Math.min(w / bw, h / bh) * 0.6;
    V = { k, ox: w / 2 - (x0 + x1) / 2 * k, oy: h / 2 - (y0 + y1) / 2 * k }; }
  function header() {
    if (!SRC) return;
    $('mSub').textContent = [SRC.name, projCode(APP.proj) || projName(APP.proj)].filter(Boolean).join(' · ');
    const b = $('mBadge');
    if (SRC.mmSrc === 'qs') { b.textContent = 'สเกลจาก QS'; b.className = 'badge b-qs'; }
    else if (SRC.mm) { b.textContent = 'สเกลที่ตั้งเอง'; b.className = 'badge b-own'; }
    else { b.textContent = 'ยังไม่ตั้งสเกล'; b.className = 'badge b-none'; }
  }
  function tools() {
    const T = ['area', 'length', 'count', 'note', 'ruler']; if (!SRC || SRC.mmSrc !== 'qs') T.push('scale');
    $('mTools').innerHTML = T.map(k => `<button class="chip${tool === k ? ' on' : ''}" data-tool="${k}" aria-pressed="${tool === k}" title="${KIND[k]} (${KEY[k]})">${KIND[k]}</button>`).join('');
    $('btnSave').disabled = !APP.set.allow_quick_measure || APP.noTable;
  }
  function setTool(t) { if (!t || t === tool) return;
    if (pts.length && tool !== 'scale' && tool !== 'ruler' && !confirm('ล้างรูปที่วาดอยู่?')) return;
    if (pts.length || (scalePts && scalePts.length)) rec('เปลี่ยนเครื่องมือ');
    tool = t; pts = []; scalePts = null; tools(); upd(); paint(); }
  $('mTools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });

  function hint(t) { const h = $('mHint'); h.textContent = t || ''; h.hidden = !t; }
  function curMeasure() {
    if (tool === 'scale' || tool === 'note' || !pts.length) return null;
    if (tool === 'area' && pts.length < 3) return null;
    if ((tool === 'length' || tool === 'ruler') && pts.length < 2) return null;
    return E.measure({ type: tool === 'ruler' ? 'length' : tool, pts }, SRC && SRC.mm);
  }
  function upd() {
    if (!SRC || loading) return;
    const m = curMeasure();
    if (m) { $('mQty').textContent = fq(m.q, m.u); $('mUnit').textContent = m.u; $('mPer').textContent = m.perimeter ? 'รอบรูป ' + f2(m.perimeter) + ' ม.' : (tool === 'count' ? '' : ''); }
    else { $('mQty').textContent = '—'; $('mUnit').textContent = ''; $('mPer').textContent = ''; }
    const needScale = tool !== 'count' && tool !== 'scale' && tool !== 'note' && !SRC.mm;
    if (!APP.set.allow_quick_measure) hint('Admin ปิด Quick Measure — ดูแบบได้อย่างเดียว');
    else if (tool === 'note') hint('แตะตำแหน่งบนแบบเพื่อปักโน้ต');
    else if (tool === 'ruler' && !needScale) hint(pts.length === 2 ? 'ไม้บรรทัด: วัดชั่วคราว ไม่บันทึก · แตะใหม่เพื่อวัดอีกเส้น' : 'ไม้บรรทัด: แตะ 2 จุดเพื่อวัดระยะ (ไม่บันทึก)');
    else if (tool === 'scale') hint(scalePts && scalePts.length === 1 ? 'แตะปลายอีกด้านของระยะที่รู้ค่า' : 'ตั้งสเกล: แตะต้นและปลายของระยะที่รู้ค่า (เช่น ประตู 0.90 ม.)');
    else if (needScale) hint('ยังไม่ตั้งสเกล — เลือก “ตั้งสเกล” ก่อนวัดพื้นที่/ความยาว');
    else if (!pts.length) hint(tool === 'count' ? 'แตะเพื่อนับทีละจุด · สองนิ้วเพื่อซูม/เลื่อน' : 'แตะมุมห้องทีละจุด · ลากจุดเพื่อปรับ · สองนิ้วเพื่อซูม/เลื่อน');
    else hint('');
    hisBtns();
    $('btnZoom').textContent = fitV && Math.abs(V.k - fitV.k) < 1e-6 ? 'ซูม' : 'พอดีจอ';
  }

  // ---------- วาด ----------
  const zonesHere = () => SRC && SRC.source === 'qs' && APP.set.send_drawings ? (APP.feed.zones || []).filter(z => z.file_id === SRC.fileId && z.page === SRC.page) : [];
  const rowsHere = () => SRC ? APP.rows.filter(r => SRC.source === 'qs' ? (r.source === 'qs' && r.qs_file_id === SRC.fileId && r.page === SRC.page) : (r.sheet_id === SRC.sheetId)) : [];
  function label(t, x, y, size, col, bold) { ctx.font = (bold ? '600 ' : '') + size + "px 'IBM Plex Sans Thai',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); }
  function hexA(h, a) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 'rgba(42,125,163,' + a + ')'; const n = parseInt(m[1], 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function path(P, close) { ctx.beginPath(); P.forEach((p, i) => { const s = toScr(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); if (close) ctx.closePath(); }
  function hiQ() { clearTimeout(hiT); if (!PGO || !BMP) return; hiT = setTimeout(hiRun, 260); }
  async function hiRun() { const page = PGO, src = SRC; if (!page || !BMP) return; const w = cv.width / dpr, h = cv.height / dpr; const need = V.k * dpr;
    if (need <= (BMP.width / W) * 1.05) { if (HI) { HI = null; paint(); } return; }
    let x0 = Math.max(0, -V.ox / V.k), y0 = Math.max(0, -V.oy / V.k), x1 = Math.min(W, (w - V.ox) / V.k), y1 = Math.min(H, (h - V.oy) / V.k); if (x1 - x0 < 2 || y1 - y0 < 2) return;
    const mx = (x1 - x0) * 0.12, my = (y1 - y0) * 0.12; x0 = Math.max(0, x0 - mx); y0 = Math.max(0, y0 - my); x1 = Math.min(W, x1 + mx); y1 = Math.min(H, y1 + my);
    if (HI && HI.src === src && HI.k === V.k && HI.x <= x0 && HI.y <= y0 && HI.x + HI.w >= x1 && HI.y + HI.h >= y1) return;
    let S = need * PR, cw = (x1 - x0) * need, ch = (y1 - y0) * need; const A = 14e6; if (cw * ch > A) { const f = Math.sqrt(A / (cw * ch)); S *= f; cw *= f; ch *= f; }
    const my_ = ++hiG; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(cw)); c.height = Math.max(1, Math.round(ch)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    try { await page.render({ canvasContext: g, viewport: page.getViewport({ scale: S, offsetX: -x0 / PR * S, offsetY: -y0 / PR * S }) }).promise; } catch (e) { return; }
    if (my_ !== hiG || src !== SRC) return; HI = { c, x: x0, y: y0, w: x1 - x0, h: y1 - y0, k: V.k, src }; paint(); }
  function paint() {
    const w = cv.width / dpr, h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#EDE7DC'; ctx.fillRect(0, 0, w, h);
    if (!BMP) return;
    ctx.save(); ctx.setTransform(dpr * V.k, 0, 0, dpr * V.k, dpr * V.ox, dpr * V.oy); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(BMP, 0, 0, W, H); if (HI && HI.src === SRC) ctx.drawImage(HI.c, HI.x, HI.y, HI.w, HI.h); ctx.restore(); hiQ();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // โซนของ QS: แสดงชื่อโซน · รหัสงาน/ตัวเลข แสดงเฉพาะเมื่อ Admin เปิด "แสดงปริมาณ BOQ"
    // v1.3.0 โซนของ QS = เส้นประจาง + ป้าย "QS ·" (อ่านอย่างเดียว แยกจากรูปที่ PM วัดเอง)
    zonesHere().forEach(z => { const P = z.pts || []; if (!P.length) return; const col = z.color || '#2A7DA3';
      if (z.type === 'count') { P.forEach(p => { const s = toScr(p); ctx.beginPath(); ctx.arc(s[0], s[1], 5, 0, 7); ctx.fillStyle = hexA(col, .5); ctx.fill(); }); return; }
      path(P, z.type === 'area'); if (z.type === 'area') { ctx.fillStyle = hexA(col, z.deduct ? .04 : .08); ctx.fill(); }
      ctx.setLineDash(z.deduct ? [3, 4] : [7, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(col, .75); ctx.stroke(); ctx.setLineDash([]);
      if (z.type === 'area' && z.name) { const c = toScr(E.centroid(P)); label('QS · ' + z.name, c[0], c[1] - (APP.set.show_qty ? 8 : 0), 12, '#2F4F5A');
        if (APP.set.show_qty) { const m = E.measure({ type: 'area', pts: P, deduct: z.deduct }, SRC.mm); const codes = (z.codes || []).join(' ');
          label([m ? f2(m.q) + ' ตร.ม.' : '', codes].filter(Boolean).join(' · '), c[0], c[1] + 9, 11, '#4A4840'); } } });
    // รายการที่วัดไว้แล้วบนแบบนี้
    rowsHere().forEach(r => { const P = r.pts || []; if (!P.length) return; const on = r.id === focusId; const col = on ? '#B8582A' : (r.color || '#8A6D3B');
      if (r.type === 'note') { const s = toScr(P[0]); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] - 7, s[1] - 14); ctx.lineTo(s[0] + 7, s[1] - 14); ctx.closePath(); ctx.fillStyle = on ? '#B8582A' : '#C58A1C'; ctx.fill();
        ctx.beginPath(); ctx.arc(s[0], s[1] - 18, 8, 0, 7); ctx.fill(); label(String(r.note || 'โน้ต').split(' · ')[0].slice(0, 40), s[0], s[1] - 36, 12, '#5A3C08', on); return; }
      if (r.type === 'count') { P.forEach(p => { const s = toScr(p); ctx.beginPath(); ctx.arc(s[0], s[1], 6, 0, 7); ctx.fillStyle = hexA(col, .8); ctx.fill(); }); }
      else { path(P, r.type === 'area'); if (r.type === 'area') { ctx.fillStyle = hexA(col, on ? .22 : .1); ctx.fill(); } ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = col; ctx.stroke(); }
      const c = toScr(r.type === 'length' ? P[Math.floor(P.length / 2)] : E.centroid(P));
      label(rowLabel(r) + (r.qty != null ? ' · ' + fq(+r.qty, r.unit) + ' ' + (r.unit || '') : ''), c[0], c[1] - (r.type === 'length' ? 12 : 0), 12, on ? '#7E3A19' : '#4A4840', on); });
    // รูปที่กำลังวาด
    const D = tool === 'scale' ? (scalePts || []) : pts;
    if (D.length && tool === 'ruler') {   // ไม้บรรทัด: เส้นประสีน้ำเงิน + ระยะ (ไม่บันทึก)
      path(D, false); ctx.setLineDash([8, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2F5E8C'; ctx.stroke(); ctx.setLineDash([]);
      D.forEach(p => { const s = toScr(p); ctx.beginPath(); ctx.arc(s[0], s[1], 6, 0, 7); ctx.fillStyle = '#2F5E8C'; ctx.fill(); });
      const m = curMeasure(); if (m) { const a = toScr(D[0]), b = toScr(D[1]); label(f2(m.q) + ' ม.', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 12, 14, '#1E3F60', true); }
    } else if (D.length) {
      const col = tool === 'scale' ? '#2F5E8C' : '#B8582A';
      if (tool === 'count') D.forEach((p, i) => { const s = toScr(p); ctx.beginPath(); ctx.arc(s[0], s[1], 11, 0, 7); ctx.fillStyle = col; ctx.fill(); label(String(i + 1), s[0], s[1], 11, '#fff', true); });
      else {
        path(D, tool === 'area' && D.length > 2); if (tool === 'area' && D.length > 2) { ctx.fillStyle = hexA(col, .22); ctx.fill(); }
        ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
        // ความยาวแต่ละด้าน
        if (SRC.mm && tool !== 'scale') { const E2 = tool === 'area' && D.length > 2 ? D.concat([D[0]]) : D;
          for (let i = 1; i < E2.length; i++) { const a = toScr(E2[i - 1]), b = toScr(E2[i]); if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 46) continue;
            const L = Math.hypot(E2[i][0] - E2[i - 1][0], E2[i][1] - E2[i - 1][1]) * SRC.mm / 1000; label(f2(L) + ' ม.', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 10, 12, '#4A4840'); } }
        D.forEach((p, i) => { const s = toScr(p); if (i === drag) { ctx.beginPath(); ctx.arc(s[0], s[1], 22, 0, 7); ctx.fillStyle = hexA(col, .18); ctx.fill(); }
          ctx.beginPath(); ctx.arc(s[0], s[1], 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); });
        const m = curMeasure(); if (m && tool === 'area') { const c = toScr(E.centroid(D)); label(f2(m.q) + ' ' + m.u, c[0], c[1], 16, '#22231C', true); }
      }
    }
    // แว่นขยายตอนลากจุด (นิ้วบังจุด)
    if (loupe && BMP) { const R = 56, cx = R + 12, cy = R + 12, z = 2.5, s = loupe;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      const K = V.k * z; ctx.setTransform(dpr * K, 0, 0, dpr * K, dpr * (cx - s[0] * K), dpr * (cy - s[1] * K)); ctx.drawImage(BMP, 0, 0, W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = '#B8582A'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#3E3F32'; ctx.stroke(); }
  }
  let raf = 0; const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };

  // ---------- ดูดจุดเข้ามุมโซนของ QS (แตะใกล้ ≤ 14 px) ----------
  function snap(d) { let best = null, bd = 14 / V.k;
    zonesHere().forEach(z => (z.pts || []).forEach(p => { const dd = Math.hypot(p[0] - d[0], p[1] - d[1]); if (dd < bd) { bd = dd; best = [p[0], p[1]]; } }));
    return best || d; }

  // ---------- นิ้ว / เมาส์ ----------
  const P = new Map(); let g = null;
  const loc = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function start() { const a = [...P.values()];
    if (a.length >= 2) { drag = -1; loupe = null; g = { m: 'pinch', d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, k: V.k, ox: V.ox, oy: V.oy, multi: true }; }
    else if (a.length === 1) { const p = a[0];
      const D = tool === 'scale' ? (scalePts || []) : pts; const hit = D.findIndex(q => { const s = toScr(q); return Math.hypot(s[0] - p.x, s[1] - p.y) < 24; });
      g = { m: hit >= 0 && tool !== 'count' ? 'vertex' : 'pan', i: hit, x: p.x, y: p.y, ox: V.ox, oy: V.oy, moved: false, multi: g && g.multi }; } }
  cv.addEventListener('pointerdown', (e) => { if (!BMP) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} P.set(e.pointerId, loc(e)); start(); });
  cv.addEventListener('pointermove', (e) => { if (!P.has(e.pointerId) || !g) return; const p = loc(e); P.set(e.pointerId, p); const a = [...P.values()];
    if (g.m === 'pinch' && a.length >= 2) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
      const k = clamp(g.k * d / g.d, (fitV ? fitV.k : V.k) * 0.5, 40); const px = (g.cx - g.ox) / g.k, py = (g.cy - g.oy) / g.k; V = { k, ox: cx - px * k, oy: cy - py * k }; draw(); upd(); return; }
    if (Math.abs(p.x - g.x) + Math.abs(p.y - g.y) > 6) g.moved = true;
    if (g.m === 'vertex' && g.moved) { if (!g.rec) { g.rec = true; rec('ย้ายจุด'); } const D = tool === 'scale' ? scalePts : pts; D[g.i] = snap(toDoc(p)); drag = g.i; loupe = D[g.i]; draw(); upd(); }
    else if (g.m === 'pan' && g.moved) { V = { k: V.k, ox: g.ox + p.x - g.x, oy: g.oy + p.y - g.y }; draw(); } });
  function end(e, cancel) { if (!P.has(e.pointerId)) return; const p = P.get(e.pointerId); P.delete(e.pointerId);
    const tap = !cancel && g && !g.moved && !g.multi && P.size === 0; const wasV = g && g.m === 'vertex';
    if (P.size) start(); else { g = null; drag = -1; loupe = null; }
    if (tap && !(wasV && tool !== 'count')) addPt(p, e.shiftKey); draw(); upd(); }
  cv.addEventListener('pointerup', (e) => end(e, false)); cv.addEventListener('pointercancel', (e) => end(e, true));
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = loc(e), f = Math.exp(-e.deltaY * 0.0018), k = clamp(V.k * f, (fitV ? fitV.k : V.k) * 0.5, 40);
    V = { k, ox: p.x - (p.x - V.ox) * k / V.k, oy: p.y - (p.y - V.oy) * k / V.k }; draw(); upd(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  function addPt(p, ortho) {
    if (loading) return;
    let d = snap(toDoc(p)); if (d[0] < 0 || d[1] < 0 || d[0] > W || d[1] > H) return;
    // Shift = ล็อกแนวนอน/แนวตั้งจากจุดก่อนหน้า (เหมือน Takeoff เดิม)
    const prev = tool === 'scale' ? (scalePts || [])[0] : pts[pts.length - 1];
    if (ortho && prev && !(tool === 'ruler' && pts.length >= 2)) d = Math.abs(d[0] - prev[0]) >= Math.abs(d[1] - prev[1]) ? [d[0], prev[1]] : [prev[0], d[1]];
    if (tool === 'ruler') { if (!SRC.mm) { toast('ตั้งสเกลก่อน — เลือก “ตั้งสเกล” ด้านบน'); return; } pts = pts.length >= 2 ? [d] : pts.concat([d]); return; }   // ไม่ลงประวัติ (ไม่บันทึก)
    if (!APP.set.allow_quick_measure) return;
    if (tool === 'note') { saveNote(d); return; }
    if (tool === 'scale') { rec('จุดสเกล'); scalePts = scalePts && scalePts.length < 2 ? scalePts.concat([d]) : [d]; if (scalePts.length === 2) setTimeout(askScale, 120); return; }
    if (tool !== 'count' && !SRC.mm) { toast('ตั้งสเกลก่อน — เลือก “ตั้งสเกล” ด้านบน'); return; }
    if (tool === 'length' && pts.length === 0) focusId = null;
    rec('เพิ่มจุด'); pts.push(d);
  }

  // ---------- ตั้งสเกล ----------
  function askScale() {
    const sel = $('scRatio'); const isPdf = !!SRC.r;
    sel.innerHTML = '<option value="">— ไม่ใช้ —</option>' + RATIOS.map(n => `<option value="${n}">1:${n}</option>`).join('');
    $('scRatioWrap').hidden = !isPdf; $('scLen').value = '';
    const d = $('dlgScale'); d.returnValue = ''; d.showModal(); setTimeout(() => $('scLen').focus(), 80);
    d.onclose = async () => { d.onclose = null; if (d.returnValue !== 'ok') { scalePts = null; draw(); upd(); return; }
      const ratio = +sel.value, len = parseFloat(String($('scLen').value).replace(',', '.'));
      let mm = null;
      if (ratio && isPdf) mm = E.scaleFromRatio(ratio, SRC.r);
      else if (len > 0 && scalePts && scalePts.length === 2) mm = E.scaleFromCalibration(len * 1000, E.polyLength(scalePts, false));
      if (!mm) { toast('ใส่ระยะจริงเป็นเมตร เช่น 0.90'); scalePts = null; draw(); upd(); return; }
      scalePts = null;
      const src = SRC, prevMm = src.mm || null, prevSrc = src.mmSrc || null;
      try { await setMm(src, mm, 'own'); } catch (x) { toast('บันทึกสเกลไม่สำเร็จ: ' + ((x && x.message) || x) + ' — ลองอีกครั้ง', 5000); draw(); upd(); return; }
      tool = 'area'; header(); tools(); draw(); upd(); toast('ตั้งสเกลแล้ว — เริ่มวัดได้เลย · ตั้งผิดกด ↶ ย้อน');
      hisPush({ kind: 'act', label: 'ตั้งสเกล', undo: () => setMm(src, prevMm, prevSrc), redo: () => setMm(src, mm, 'own') }); };
  }

  // ---------- ปุ่มล่าง ----------
  $('btnZoom').addEventListener('click', () => { if (!fitV) return;
    if (Math.abs(V.k - fitV.k) < 1e-6) { const w = box.clientWidth / 2, h = box.clientHeight / 2, c = pts.length ? toScr(E.centroid(pts)) : [w, h], k = fitV.k * 2.5;
      V = { k, ox: w - (c[0] - V.ox) / V.k * k, oy: h - (c[1] - V.oy) / V.k * k }; }
    else V = { ...fitV };
    draw(); upd(); });
  $('btnSave').addEventListener('click', () => {
    if (tool === 'ruler') { toast('ไม้บรรทัดใช้วัดชั่วคราว ไม่บันทึก — เลือก “ความยาว” ถ้าต้องการบันทึก'); return; }
    if (tool === 'note') { toast('แตะบนแบบเพื่อปักโน้ต'); return; }
    const m = curMeasure();
    if (!m) { toast(tool === 'scale' ? 'เลือกชนิดการวัดก่อน' : tool === 'area' ? 'แตะมุมห้องอย่างน้อย 3 จุด' : tool === 'length' ? 'แตะอย่างน้อย 2 จุด' : 'แตะเพื่อนับอย่างน้อย 1 จุด'); return; }
    openSave(m);
  });

  // ---------- บันทึก ----------
  let work = '';
  function openSave(m) {
    // ชื่อห้อง: เดาจากโซนของ QS ที่ครอบจุดกึ่งกลาง
    const c = E.centroid(pts); const inP = (p, Q) => { let k = false; for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) if ((Q[i][1] > p[1]) !== (Q[j][1] > p[1]) && p[0] < (Q[j][0] - Q[i][0]) * (p[1] - Q[i][1]) / (Q[j][1] - Q[i][1]) + Q[i][0]) k = !k; return k; };
    const z = zonesHere().find(z => z.type === 'area' && !z.deduct && z.name && inP(c, z.pts || []));
    $('svName').value = z ? z.name : ''; $('svNote').value = ''; $('svH').value = ''; $('svDed').checked = false; $('svWorkTxt').value = '';
    work = tool === 'area' ? 'พื้น' : tool === 'length' ? 'บัว' : '';
    $('svWork').innerHTML = WORKS.map(w => `<button type="button" class="chip${w === work ? ' on' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
    $('svHWrap').hidden = tool !== 'length'; $('svDedWrap').hidden = tool !== 'area';
    $('svCntWrap').hidden = tool !== 'count'; $('svWasteWrap').hidden = tool === 'count'; $('svCnt').value = ''; $('svWaste').value = '';
    $('svTitle').textContent = 'บันทึก' + KIND[tool];
    const sv = () => { const mm = curSave(); const w = wasteOf(); $('svQty').textContent = fq(mm.q, mm.u); $('svUnit').textContent = mm.u; const ex = [];
      if (mm.perimeter) ex.push('รอบรูป ' + f2(mm.perimeter) + ' ม.'); if (mm.length && mm.height) ex.push('ยาว ' + f2(mm.length) + ' ม. × สูง ' + f2(mm.height / 1000) + ' ม.');
      if (tool === 'count' && perOf() !== 1) ex.push(pts.length + ' จุด × ' + perOf()); if (w) ex.push('รวมเผื่อ ' + w + '% = ' + f2(E.withWaste(mm.q, w)));
      $('svPer').textContent = ex.join(' · '); };
    $('svH').oninput = sv; $('svDed').onchange = sv; $('svCnt').oninput = sv; $('svWaste').oninput = sv; sv();
    const d = $('dlgSave'); d.returnValue = ''; d.showModal();
    d.onclose = () => { d.onclose = null; if (d.returnValue === 'ok') doSave(); };
  }
  $('svWork').addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; work = b.dataset.w; $('svWorkTxt').value = '';
    $('svWork').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); });
  $('svWorkTxt').addEventListener('input', () => { if ($('svWorkTxt').value.trim()) { work = ''; $('svWork').querySelectorAll('.chip').forEach(x => x.classList.remove('on')); } });
  function shape() { const h = parseFloat(String($('svH').value).replace(',', '.')); return { type: tool, pts, deduct: tool === 'area' && $('svDed').checked, height: tool === 'length' && h > 0 ? Math.round(h * 1000) : 0 }; }
  const num0 = (id) => { const v = parseFloat(String($(id).value).replace(',', '.')); return v > 0 ? v : 0; };
  const perOf = () => (tool === 'count' && num0('svCnt')) || 1;          // ตัวคูณนับจุด (ฝั่ง PM — engine นับจุดตามจริง แล้วคูณภายนอก)
  const wasteOf = () => (tool === 'count' ? 0 : num0('svWaste'));
  // ปริมาณที่บันทึก = engine (สูตร QS) × ตัวคูณนับจุด
  const curSave = () => { const m = E.measure(shape(), SRC.mm); return m && tool === 'count' ? { ...m, q: m.q * perOf() } : m; };
  async function doSave() {
    const s = shape(), m = curSave(); if (!m) { toast('ยังไม่ตั้งสเกล'); return; }
    const row = { pm_project_id: APP.pid, source: SRC.source, qs_file_id: SRC.source === 'qs' ? SRC.fileId : null, sheet_id: SRC.source === 'upload' ? SRC.sheetId : null,
      page: SRC.page || 0, mm_per_px: SRC.mm || null, type: tool, pts: pts.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]),
      name: $('svName').value.trim(), work: $('svWorkTxt').value.trim() || work, height_mm: s.height || null, deduct: !!s.deduct,
      qty: Math.round(m.q * 10000) / 10000, unit: m.u, perimeter_m: m.perimeter != null ? Math.round(m.perimeter * 10000) / 10000 : null, engine_version: E.ENGINE_VERSION,
      status: 'field', note: $('svNote').value.trim() || null, created_by: APP.me.name, created_email: APP.me.email, created_role: APP.me.role,
      count_per: perOf(), waste_pct: wasteOf() || null };
    const r = await sb.from('takeoff_field_measures').insert(row).select('*');
    if (r.error) { toast('บันทึกไม่สำเร็จ: ' + r.error.message, 5000); return; }
    const before = snapD(), key = SRC.key, saved = r.data[0];
    APP.rows.unshift(saved); focusId = saved.id; pts = []; draw(); upd();
    hisPush({ kind: 'act', label: 'บันทึก ' + (saved.name || ''),
      undo: async () => { const c = APP.rows.find(x => x.id === saved.id); if (c && c.status !== 'field' && c.status !== 'returned') throw new Error('รายการนี้ส่ง QS แล้ว');
        await rowSet(saved.id, { deleted_at: new Date().toISOString() }); if (SRC && SRC.key === key && APP.screen === 'measure') { focusId = null; restoreD(before); } },
      redo: async () => { await rowSet(saved.id, { deleted_at: null }); if (SRC && SRC.key === key && APP.screen === 'measure') { focusId = saved.id; restoreD({ pts: [], sp: null, tool: before.tool }); } } });
    side(); toast('บันทึกแล้ว · ' + fq(m.q, m.u) + ' ' + m.u + ' — วัดห้องถัดไปได้เลย');
  }

  // ---------- โน้ตบนแบบ (ยกมาจาก Takeoff เดิม) ----------
  async function saveNote(d) {
    const t = prompt('ข้อความโน้ต', ''); if (t === null) return; const tx = t.trim(); if (!tx) return;
    const row = { pm_project_id: APP.pid, source: SRC.source, qs_file_id: SRC.source === 'qs' ? SRC.fileId : null, sheet_id: SRC.source === 'upload' ? SRC.sheetId : null,
      page: SRC.page || 0, mm_per_px: SRC.mm || null, type: 'note', pts: [[Math.round(d[0] * 100) / 100, Math.round(d[1] * 100) / 100]], name: '', work: 'โน้ต',
      qty: null, unit: null, engine_version: E.ENGINE_VERSION, status: 'field', note: tx, created_by: APP.me.name, created_email: APP.me.email, created_role: APP.me.role };
    const r = await sb.from('takeoff_field_measures').insert(row).select('*');
    if (r.error) { toast('บันทึกโน้ตไม่สำเร็จ: ' + r.error.message, 5000); return; }
    const saved = r.data[0]; APP.rows.unshift(saved); focusId = saved.id; draw(); side();
    hisPush({ kind: 'act', label: 'โน้ต ' + tx.slice(0, 20), undo: () => rowSet(saved.id, { deleted_at: new Date().toISOString() }), redo: () => rowSet(saved.id, { deleted_at: null }) });
    toast('ปักโน้ตแล้ว');
  }

  // ---------- จอคอม: แผงซ้าย (แผ่นแบบ) · แผงขวา (รายการวัด + สรุป + ส่งออก) ----------
  const wide = () => window.matchMedia('(min-width:1000px)').matches;
  function left() {
    if (!wide()) return;
    const F = APP.feed || {}, h = ['<div class="side-h"><span>แผ่นแบบในโครงการ</span><button class="chip" data-lup style="min-height:30px;font-size:12px">+ อัปโหลด</button></div><div class="side-b">'];
    if (F.handed_off && APP.set.send_drawings && (F.drawings || []).length) {
      h.push('<div class="sh-g">แบบจาก QS</div>');
      (F.drawings || []).forEach(d => { for (let p = 0; p < Math.max(1, d.page_count || 1); p++) { const k = 'qs:' + d.id + ':' + p;
        h.push(`<button class="sh-i${SRC && SRC.key === k ? ' on' : ''}" data-lqs="${esc(d.id)}" data-page="${p}"><b>${esc(drawingTitle(d, p))}</b><small>${d.revision ? esc(d.revision) + ' · ' : ''}${((d.page_scales || [])[p] || {}).mm ? 'สเกลจาก QS' : 'ยังไม่ตั้งสเกล'}</small></button>`); } });
    }
    h.push('<div class="sh-g">อัปโหลดเอง / ย้ายจาก Takeoff เดิม</div>');
    if (!APP.sheets.length) h.push('<p class="empty" style="padding:8px">ยังไม่มี</p>');
    [...APP.sheets].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th', { numeric: true })).forEach(s => { const n = APP.rows.filter(r => r.sheet_id === s.id).length;
      h.push(`<button class="sh-i${SRC && SRC.key === 'up:' + s.id ? ' on' : ''}" data-lup-s="${esc(s.id)}"><b>${esc(s.name || 'รูปที่อัปโหลด')}</b><small>${s.mm_per_px ? 'ตั้งสเกลแล้ว' : 'ยังไม่ตั้งสเกล'}${n ? ' · วัดแล้ว ' + n : ''}${s.legacy_id ? ' · จาก Takeoff เดิม' : ''}</small></button>`); });
    h.push('</div>'); $('mLeft').innerHTML = h.join('');
  }
  $('mLeft').addEventListener('click', (e) => {
    if (e.target.closest('[data-lup]')) { $('upFile').value = ''; $('upFile').click(); return; }
    const q = e.target.closest('[data-lqs]'), u = e.target.closest('[data-lup-s]');
    if ((q || u) && pts.length && !confirm('ยังไม่ได้บันทึกรูปที่วาดอยู่ เปลี่ยนแบบ?')) return;
    if (q) open(qsSrc((APP.feed.drawings || []).find(x => x.id === q.dataset.lqs), +q.dataset.page));
    else if (u) open(upSrc(APP.sheets.find(s => s.id === u.dataset.lupS)));
  });
  const packKey = () => 'qm_pack_' + SCHEMA + '_' + APP.pid;
  const packs = () => { try { return JSON.parse(localStorage.getItem(packKey()) || '{}') || {}; } catch (e) { return {}; } };
  const gross = (r) => r.qty == null ? null : E.withWaste(+r.qty, +r.waste_pct || 0);
  function summary() {   // รวมทั้งโครงการ ตาม งาน + หน่วย (ไม่รวมโน้ต)
    const m = new Map();
    APP.rows.filter(r => r.type !== 'note' && r.qty != null).forEach(r => { const k = (r.work || '(ไม่ระบุงาน)') + '|' + (r.unit || '');
      const o = m.get(k) || { work: r.work || '(ไม่ระบุงาน)', unit: r.unit || '', net: 0, gross: 0, n: 0 }; o.net += +r.qty; o.gross += gross(r); o.n++; m.set(k, o); });
    return [...m.values()].sort((a, b) => a.work.localeCompare(b.work, 'th'));
  }
  function side() {
    if (!wide()) return;
    const L = rowsHere(), h = [], pk = packs();
    h.push(`<div class="side-h"><span>รายการบนแบบนี้ (${L.length})</span></div><div class="side-b">`);
    if (!L.length) h.push('<p class="empty" style="padding:8px">ยังไม่มี — เลือกเครื่องมือด้านบนแล้ววัดได้เลย</p>');
    L.forEach(r => h.push(`<button class="ms-i${r.id === focusId ? ' on' : ''}" data-mrow="${esc(r.id)}"><span class="sw" style="background:${r.type === 'note' ? '#C58A1C' : esc(r.color || '#8A6D3B')}"></span>
      <span>${esc(r.type === 'note' ? 'โน้ต · ' + String(r.note || '').split(' · ')[0] : rowLabel(r))}</span><span class="q">${r.qty == null ? '' : esc(fq(+r.qty, r.unit)) + ' ' + esc(r.unit || '')}</span>
      <small><span class="tag t-${esc(r.status)}">${esc(ST[r.status] || r.status)}</span> ${r.waste_pct ? '+' + esc(r.waste_pct) + '% ' : ''}${+r.count_per > 1 ? '×' + esc(r.count_per) + ' ' : ''}${esc(r.created_by || '')}</small></button>`));
    h.push('</div><div class="side-h"><span>สรุปทั้งโครงการ</span><button class="chip" data-csv style="min-height:30px;font-size:12px">⬇ CSV</button></div><div class="side-b">');
    const S = summary();
    if (!S.length) h.push('<p class="empty" style="padding:8px">ยังไม่มีตัวเลข</p>');
    else h.push('<table class="sum"><thead><tr><th>งาน</th><th class="n">สุทธิ</th><th class="n">รวมเผื่อ</th><th class="n" title="ขนาด 1 แพ็ก/แผ่น (จำในเครื่องนี้)">แพ็ก</th></tr></thead><tbody>' + S.map(o => { const k = o.work + '|' + o.unit, p = +pk[k] || 0;
      return `<tr><td>${esc(o.work)}<br><small style="color:var(--mut)">${o.n} รายการ · ${esc(o.unit)}</small></td><td class="n">${esc(fq(o.net, o.unit))}</td><td class="n">${esc(fq(o.gross, o.unit))}</td>
        <td class="n"><input data-pack="${esc(k)}" value="${p || ''}" placeholder="—" inputmode="decimal" title="ใส่ขนาด 1 แพ็ก เช่น 2.88">${p ? '<br><b>' + Math.ceil(o.gross / p - 1e-9) + '</b> แพ็ก' : ''}</td></tr>`; }).join('') + '</tbody></table>');
    h.push('<p class="kbd">ไม่มีราคา · ตัวเลขหน้างาน ยังไม่ใช่ BOQ<br>คีย์ลัด: <b>A</b> พื้นที่ <b>L</b> ความยาว <b>C</b> นับจุด <b>N</b> โน้ต <b>R</b> ไม้บรรทัด <b>S</b> สเกล <b>F</b> ซูม/พอดีจอ <b>Enter</b> บันทึก <b>Esc</b> ล้างจุด · กด <b>Shift</b> ค้าง = แนวตรง</p></div>');
    $('mRight').innerHTML = h.join('');
  }
  $('mRight').addEventListener('click', (e) => {
    if (e.target.closest('[data-csv]')) { exportCsv(); return; }
    const b = e.target.closest('[data-mrow]'); if (b) { focusId = b.dataset.mrow; focusRow(focusId); draw(); upd(); side(); }
  });
  $('mRight').addEventListener('change', (e) => { const i = e.target.closest('[data-pack]'); if (!i) return; const pk = packs(), v = parseFloat(String(i.value).replace(',', '.'));
    if (v > 0) pk[i.dataset.pack] = v; else delete pk[i.dataset.pack]; try { localStorage.setItem(packKey(), JSON.stringify(pk)); } catch (x) {} side(); });
  // ---------- ส่งออก CSV (เปิดใน Excel ได้ · ไม่มีราคา) ----------
  function exportCsv() {
    const sheetName = (r) => r.source === 'qs' ? drawingTitle((APP.feed.drawings || []).find(d => d.id === r.qs_file_id), r.page) : ((APP.sheets.find(s => s.id === r.sheet_id) || {}).name || '');
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['ห้อง/โซน', 'งาน', 'ชนิด', 'ปริมาณสุทธิ', 'หน่วย', 'ตัวคูณ', '% เผื่อ', 'รวมเผื่อ', 'รอบรูป (ม.)', 'ความสูง (ม.)', 'หักออก', 'สถานะ', 'แบบ', 'วัดโดย', 'วันที่', 'หมายเหตุ'];
    const TY = { area: 'พื้นที่', length: 'ความยาว', count: 'นับจุด', note: 'โน้ต' };
    const lines = [head.map(q).join(',')].concat(APP.rows.map(r => [r.name, r.work, TY[r.type] || r.type, r.qty == null ? '' : (+r.qty).toFixed(2), r.unit, r.count_per, r.waste_pct,
      r.qty == null ? '' : gross(r).toFixed(2), r.perimeter_m == null ? '' : (+r.perimeter_m).toFixed(2), r.height_mm ? (r.height_mm / 1000).toFixed(2) : '', r.deduct ? 'ใช่' : '',
      ST[r.status] || r.status, sheetName(r), r.created_by, r.created_at ? dmy(new Date(r.created_at)) : '', r.note].map(q).join(',')));
    lines.push('', 'สรุปตามงาน', ['งาน', 'หน่วย', 'สุทธิ', 'รวมเผื่อ', 'จำนวนรายการ'].map(q).join(','));
    summary().forEach(o => lines.push([o.work, o.unit, o.net.toFixed(2), o.gross.toFixed(2), o.n].map(q).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'วัดหน้างาน-' + (projCode(APP.proj) || APP.pid) + '-' + dmy(new Date()).replace(/\//g, '') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('ดาวน์โหลด CSV แล้ว (ไม่มีราคา)');
  }
  // ---------- คีย์ลัด (จอคอม) ----------
  document.addEventListener('keydown', (e) => {
    if (APP.screen !== 'measure' || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const t = e.target; if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
    const k = String(e.key || '').toLowerCase(), map = { a: 'area', l: 'length', c: 'count', n: 'note', r: 'ruler', s: 'scale' };
    if (map[k]) { if (map[k] === 'scale' && SRC && SRC.mmSrc === 'qs') return; e.preventDefault(); setTool(map[k]); }
    else if (k === 'f') { e.preventDefault(); $('btnZoom').click(); }
    else if (k === 'enter') { e.preventDefault(); $('btnSave').click(); }
    else if (k === 'escape') { if (pts.length || (scalePts && scalePts.length)) { rec('ล้างจุด'); pts = []; scalePts = null; draw(); upd(); } }
  });
  window.matchMedia('(min-width:1000px)').addEventListener('change', () => { if (APP.screen === 'measure') { side(); left(); } });

  return { open, resize: () => { resize(); upd(); }, dirty: () => pts.length > 0 && tool !== 'ruler', key: () => (SRC ? SRC.key : ''), side };
})();

// ทดสอบบนเครื่องผู้พัฒนาเท่านั้น (localhost)
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__qm = { APP, MV, show, renderList, renderPick };

boot();
})();
