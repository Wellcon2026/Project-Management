/* =====================================================================
   Wellcon PM — Auto PR · ใบขอซื้อ (Purchase Requisition) แบบกรอกให้อัตโนมัติ
   ---------------------------------------------------------------------
   • หน้าแยก (ไม่แตะโค้ด PM หลัก) เปิดจากเมนู "Auto PR · ใบขอซื้อ" ในหน้าโครงการ
     auto-pr.html?pid=<project id>  (+ &env=staging = ข้อมูลทดสอบ)
   • Login: ใช้ session ที่ Wellcon PM จำไว้ในเครื่อง (wellcon_pm_session_v1) — แบบเดียวกับ Quick Measure
   • กรอกให้อัตโนมัติ: ชื่อโครงการ · วันที่ · ผู้ขอซื้อ + ตำแหน่ง · ผู้อนุมัติ (PM ของโครงการ)
     · ต้องการของวันที่ (+3 วัน · ส่งหลังเที่ยง +4) · ประเภทงานที่ใช้ล่าสุด
   • ช่วยเลือก: ของที่ใช้บ่อย (เรียนรู้จากใบเก่าทั้งบริษัท + โครงการนี้ขึ้นก่อน) · หน่วยเดิมของของชิ้นนั้น
     · พื้นที่ / งาน ที่เคยใช้ในโครงการ + ชื่อห้องจาก Takeoff · พูดชื่อของ (🎤 ถ้าเครื่องรองรับ)
   • พิมพ์ / PDF หน้าตาเหมือนฟอร์มกระดาษ "Purchase Requisition (PR) ใบขอซื้อ" · คัดลอกข้อความไป LINE / Mango
   • ข้อมูล: app_state 'autoPR' { <pid>: [pr] } — อ่าน-รวม-เขียนรายใบ (หลายคนบันทึกพร้อมกันไม่ทับกัน) · ไม่ต้องรัน SQL
   • ไม่มีราคา / ต้นทุนใด ๆ
   ===================================================================== */
(() => {
'use strict';
const APR_VER = 'v1.0.0';
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
const KEY = 'autoPR';
const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
const ROLE_TH = { pm: 'Project Manager', pm_mgr: 'Project Manager', director: 'Project Director', sitemgr: 'Site Manager', site: 'หัวหน้าช่าง', qs: 'QS', qs_mgr: 'QS Manager', superadmin: 'Admin',
  designer: 'Designer', design_mgr: 'Design Manager', factory: 'โรงงาน', proc: 'จัดซื้อ', store: 'Store', office: 'ธุรการ', safety: 'จป.', driver: 'พนักงานขับรถ' };
const MANGO_URL = 'https://wellcon-interior.mangoanywhere.com/production.anywhere/page/transaction/of/';
const TYPES = [['subcon', 'ขอจัดจ้าง ของ+แรง', 'Subcon'], ['mat', 'ขอซื้อวัสดุ', 'Material'], ['labour', 'ขอจ้างค่าแรง', 'Labour'],
  ['rent', 'ขอเช่าอุปกรณ์', 'General'], ['cons', 'วัสดุสิ้นเปลือง', 'General'], ['tool', 'ขอซื้อเครื่องมือเครื่องใช้', 'General']];
const UNITS = ['อัน', 'ชิ้น', 'ตัว', 'ม้วน', 'แผ่น', 'มัด', 'เส้น', 'กล่อง', 'ถุง', 'หลอด', 'กระป๋อง', 'แกลลอน', 'ก้อน', 'ชุด', 'คู่', 'ใบ', 'ดอก', 'แพ็ค', 'เมตร', 'ตร.ม.', 'กก.', 'ลิตร', 'วัน', 'งาน'];
// ของใช้บ่อยหน้างาน (ตั้งต้น) — ระบบจะเรียนรู้เพิ่มจากใบขอซื้อจริง
const COMMON = [['เทป PU', 'ม้วน'], ['PU Foam', 'กระป๋อง'], ['ไม้โครง', 'มัด'], ['ไม้อัด', 'แผ่น'], ['ซิลิโคน', 'หลอด'], ['กาวตะปู', 'หลอด'], ['สกรู', 'กล่อง'], ['พุกพลาสติก', 'ถุง'],
  ['ใบตัด', 'ใบ'], ['ดอกสว่าน', 'ดอก'], ['ถ่าน AA', 'ก้อน'], ['ตลับเมตร 5 เมตร', 'อัน'], ['เทปกาวย่น', 'ม้วน'], ['กระดาษทราย', 'แผ่น'], ['ถุงขยะ', 'แพ็ค'], ['แผ่นยิปซัม', 'แผ่น'],
  ['โครงซีลาย', 'เส้น'], ['สีรองพื้น', 'แกลลอน'], ['พลาสติกกันฝุ่น', 'ม้วน'], ['ถุงมือ', 'คู่']];

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const thDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + (Number(m[1]) + 543) : ''; };
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const rowOf = (r) => ({ ...(r.data || {}), id: r.id, ...(r.project ? { project: r.project } : {}) });
const seesAll = (a) => a.allProj === true || (a.allProj !== false && ALL_SCOPE.includes(a.roleKey));
const projName = (p) => p ? (p.name || p.project || p.title || p.id) : '';
const projCode = (p) => p ? (p.code || p.jobNo || p.no || '') : '';
const uid = () => 'pr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }

const APP = { acc: null, me: null, accounts: [], projects: [], pid: '', proj: null, all: {}, rooms: [], pr: null, screen: 'msg', pushed: 0 };
const SCR = ['msg', 'proj', 'list', 'edit', 'view'];
function show(s, push) {
  SCR.forEach(k => { $('scr' + k[0].toUpperCase() + k.slice(1)).hidden = k !== s; });
  if (push) { history.pushState({ apr: s }, ''); APP.pushed++; }
  APP.screen = s;
}
window.addEventListener('popstate', (e) => {
  const s = (e.state && e.state.apr) || (APP.pid ? 'list' : (APP.acc ? 'proj' : 'msg'));
  if (APP.pushed > 0) APP.pushed--;
  show(s, false); if (s === 'list') renderList(); if (s === 'edit') renderEdit();
});
function toPm() { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1 && !APP.pushed) history.back(); else location.href = pmUrl(); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'toPm') toPm(); else if (b.dataset.act === 'back') history.back(); });
function msg(html) { $('msgBody').innerHTML = html; show('msg'); }
const loginCard = (t) => `<div class="card" style="margin-top:20px"><b>${t}</b><span style="color:var(--mut);font-size:14px">เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิดเมนู “Auto PR · ใบขอซื้อ” จากหน้าโครงการ</span>
  <a class="btn pri" href="${pmUrl()}">ไปหน้า Wellcon PM</a></div>`;

// =====================================================================
// ข้อมูล: app_state 'autoPR' { pid: [pr] }
// =====================================================================
async function loadAll() {
  const r = await sb.from('app_state').select('data').eq('id', KEY).maybeSingle();
  if (r.error) throw r.error;
  APP.all = (r.data && r.data.data && r.data.data.v) || {};
}
// บันทึก 1 ใบ: อ่านล่าสุด → แทน/เพิ่มใบนี้ → เขียน (ไม่ทับใบของคนอื่น)
async function savePr(pr) {
  const r = await sb.from('app_state').select('data').eq('id', KEY).maybeSingle();
  if (r.error) throw r.error;
  const v = { ...((r.data && r.data.data && r.data.data.v) || {}) };
  const L = Array.isArray(v[pr.pid]) ? v[pr.pid].slice() : [];
  const i = L.findIndex(x => x.id === pr.id); if (i >= 0) L[i] = pr; else L.unshift(pr);
  v[pr.pid] = L;
  const up = await sb.from('app_state').upsert([{ id: KEY, data: { v }, updated_by: APP.me.email }], { onConflict: 'id' });
  if (up.error) throw up.error;
  APP.all = v;
}
const myPrs = () => (APP.all[APP.pid] || []).filter(x => x && !x.deleted);

// ===== เรียนรู้จากใบเก่า: ของ · หน่วย · พื้นที่ =====
function learn() {
  const score = new Map(), unit = {};
  const add = (name, u, w) => { const k = norm(name); if (!k) return; const o = score.get(k) || { name: String(name).trim(), n: 0 }; o.n += w; score.set(k, o); if (u && !unit[k]) unit[k] = u; };
  Object.keys(APP.all).forEach(pid => (APP.all[pid] || []).forEach(pr => (pr.items || []).forEach(it => add(it.name, it.unit, pid === APP.pid ? 3 : 1))));
  COMMON.forEach(([n, u], i) => { add(n, u, 0.2 - i * 0.005); });
  const items = [...score.values()].sort((a, b) => b.n - a.n).map(o => ({ name: o.name, unit: unit[norm(o.name)] || '' }));
  const areas = []; const seenA = new Set();
  myPrs().forEach(pr => { [pr.area, ...(pr.items || []).map(i => i.remark)].forEach(a => { const k = norm(a); if (k && !seenA.has(k)) { seenA.add(k); areas.push(String(a).trim()); } }); });
  APP.rooms.forEach(a => { const k = norm(a); if (k && !seenA.has(k)) { seenA.add(k); areas.push(a); } });
  return { items, areas: areas.slice(0, 14), unitOf: (n) => unit[norm(n)] || '' };
}

// =====================================================================
// boot
// =====================================================================
async function boot() {
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง'; s.prepend(d); });
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg(loginCard('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้')); return; }
    const [a, p] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('projects').select('id,project,data')]);
    if (a.error) throw a.error; if (p.error) throw p.error;
    APP.accounts = (a.data || []).map(rowOf);
    const live = (p.data || []).map(rowOf).filter(x => !x.deleted && !x.del);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5
      && APP.accounts.find(x => norm(x.email) === sess.email && x.active !== false && !x.disabled);
    if (!acc) { msg(loginCard('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้')); return; }
    APP.acc = acc;
    APP.me = { name: nickOf(acc), full: acc.name || nickOf(acc), email: norm(acc.email), role: acc.roleKey || '', title: String(acc.title || '').trim() || ROLE_TH[acc.roleKey] || '' };
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'apr' }).then(() => {}, () => {}); } catch (e) {}
    if (window.WCTag) WCTag.setup({ sb, app: 'apr', me: APP.me, accounts: APP.accounts.filter(x => x.active !== false && !x.disabled), projects: live });
    APP.projects = live.filter(x => seesAll(acc) || (acc.projects || []).includes(x.id));
    await loadAll();
    const pid = new URLSearchParams(location.search).get('pid');
    if (pid) {
      if (!APP.projects.some(x => x.id === pid)) { msg('<div class="card" style="margin-top:20px"><b>คุณไม่ได้รับมอบหมายในโครงการนี้</b><span style="color:var(--mut);font-size:14px">ขอให้ PM เพิ่มคุณเข้าทีมโครงการก่อน</span></div>'); return; }
      await openProject(pid);
    } else renderProjects();
  } catch (e) {
    console.error(e);
    msg(`<div class="card" style="margin-top:20px"><b>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</b><span style="color:var(--mut);font-size:14px">${esc((e && e.message) || e)}</span><button class="btn pri" onclick="location.reload()">ลองใหม่</button></div>`);
  }
}
function renderProjects() {
  const L = APP.projects;
  $('projList').innerHTML = L.length ? L.map(p => `<button class="card" data-pid="${esc(p.id)}" style="text-align:left"><b>${esc(projName(p))}</b><span style="font-size:13px;color:var(--mut)">${esc(projCode(p))}</span></button>`).join('')
    : '<p class="empty">ยังไม่มีโครงการที่คุณถูก assign</p>';
  show('proj');
}
$('projList').addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (!b) return;
  const u = new URL(location.href); u.searchParams.set('pid', b.dataset.pid); history.replaceState(null, '', u); openProject(b.dataset.pid); });
async function openProject(pid) {
  APP.pid = pid; APP.proj = APP.projects.find(x => x.id === pid);
  // ชื่อห้อง / โซนจาก Takeoff (ถ้ามี) — ใช้เป็นตัวเลือก "พื้นที่"
  try { const r = await sb.from('takeoff_field_measures').select('name').eq('pm_project_id', pid).is('deleted_at', null).limit(300);
    if (!r.error) APP.rooms = [...new Set((r.data || []).map(x => String(x.name || '').trim()).filter(Boolean))].slice(0, 20); } catch (e) {}
  const sub = [projName(APP.proj), projCode(APP.proj)].filter(Boolean).join(' · ');
  $('listProj').textContent = sub; $('edProj').textContent = sub;
  show('list'); renderList();
}

// =====================================================================
// รายการใบขอซื้อ
// =====================================================================
const prNo = (pr) => pr.no || '';
function renderList() {
  const L = myPrs(); const h = [];
  if (!L.length) h.push(`<div class="card" style="align-items:center;text-align:center;padding:26px 16px"><div style="font-size:40px">🧾</div><b style="font-size:17px">ยังไม่มีใบขอซื้อในโครงการนี้</b>
    <span style="color:var(--mut);font-size:14px">กด “＋ สร้างใบขอซื้อใหม่” — ระบบกรอกชื่อโครงการ วันที่ ชื่อผู้ขอ และผู้อนุมัติให้เอง</span></div>`);
  else h.push('<div class="list">' + L.map(pr => {
    const n = (pr.items || []).length, first = (pr.items || []).slice(0, 3).map(i => i.name).join(' · ');
    return `<div class="card pr-c"><div class="t"><b>${esc(prNo(pr))}</b><span class="st st-${pr.status === 'sent' ? 'sent' : 'draft'}">${pr.status === 'sent' ? 'ส่งแล้ว' : 'ร่าง'}</span></div>
      <div class="s">${esc(thDate(pr.date))} · ${n} รายการ · โดย ${esc(pr.by || '—')}</div><div style="font-size:14px">${esc(first)}${n > 3 ? ' …' : ''}</div>
      <div class="b"><button class="btn sm dk" data-view="${esc(pr.id)}">👁 ดู / พิมพ์</button><button class="btn sm" data-edit="${esc(pr.id)}">✎ แก้ไข</button><button class="btn sm" data-copy="${esc(pr.id)}">⧉ ขอซ้ำ (ใบใหม่)</button></div></div>`; }).join('') + '</div>');
  h.push(`<p class="ver">Auto PR ${APR_VER} · ไม่มีราคา · ใบขอซื้อจริงยังต้องลงนามตามขั้นตอน (ผู้ขอซื้อ → QS → PM)</p>`);
  $('listBody').innerHTML = h.join('');
}
$('listBody').addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]'), ed = e.target.closest('[data-edit]'), cp = e.target.closest('[data-copy]');
  const find = (id) => myPrs().find(x => x.id === id);
  if (v) { APP.pr = JSON.parse(JSON.stringify(find(v.dataset.view))); openView(); }
  else if (ed) { APP.pr = JSON.parse(JSON.stringify(find(ed.dataset.edit))); renderEdit(); show('edit', true); }
  else if (cp) { const src = find(cp.dataset.copy); APP.pr = newPr(); APP.pr.types = (src.types || []).slice(); APP.pr.area = src.area || '';
    APP.pr.items = (src.items || []).map(i => ({ ...i, need: defNeed() })); renderEdit(); show('edit', true); toast('คัดลอกรายการจากใบเดิมแล้ว — ตรวจจำนวนอีกครั้ง'); }
});
$('btnNew').addEventListener('click', () => { APP.pr = newPr(); renderEdit(); show('edit', true); });

// =====================================================================
// สร้าง / แก้ไข
// =====================================================================
function defNeed() { const d = new Date(); d.setDate(d.getDate() + (d.getHours() >= 12 ? 4 : 3)); return isoOf(d); }   // สั่งของ 3 วัน · ส่ง PR ก่อนเที่ยง
const lastTypesKey = () => 'apr_types_' + APP.me.email;
function pmOf(p) { // ผู้อนุมัติ = PM ของโครงการ
  const t = String((p && (p.pm || p.pmName)) || '').split(/[,·/]/)[0].trim(); if (t) return t;
  const a = APP.accounts.find(x => ['pm', 'pm_mgr'].includes(x.roleKey) && (x.projects || []).includes(APP.pid)); return a ? nickOf(a) : '';
}
function newPr() {
  const d = new Date(); let types = ['mat']; try { const s = JSON.parse(localStorage.getItem(lastTypesKey()) || 'null'); if (Array.isArray(s) && s.length) types = s; } catch (e) {}
  const code = String(projCode(APP.proj) || 'PR').replace(/[^\w-]/g, '').slice(0, 12) || 'PR';
  const today = myPrs().filter(x => x.date === isoOf(d)).length + 1;
  return { id: uid(), pid: APP.pid, no: 'PR-' + code + '-' + String(d.getFullYear() + 543).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(today),
    date: isoOf(d), proj: projName(APP.proj), types, area: '', items: [], by: APP.me.full || APP.me.name, byEmail: APP.me.email, byTitle: APP.me.title,
    pm: pmOf(APP.proj), status: 'draft', at: Date.now() };
}
let L = null;   // ผลการเรียนรู้ (คำนวณตอนเปิดหน้าแก้ไข)
function renderEdit() {
  const pr = APP.pr; L = learn();
  $('edTitle').textContent = pr.status === 'sent' ? 'แก้ไข ' + pr.no : 'ใบขอซื้อใหม่';
  // กรอกอัตโนมัติ (แตะเพื่อแก้)
  const F = [['proj', 'ชื่อโครงการ', pr.proj], ['date', 'วันที่', pr.date, 'date'], ['by', 'ผู้ขอซื้อ', pr.by], ['byTitle', 'ตำแหน่ง', pr.byTitle], ['pm', 'ผู้อนุมัติ (PM)', pr.pm]];
  $('autoBox').innerHTML = F.map(([k, l, v, ty]) => `<label class="af"><small>${l} <span class="tag">อัตโนมัติ</span></small><input data-af="${k}" type="${ty || 'text'}" value="${esc(v || '')}"></label>`).join('');
  $('typeBox').innerHTML = TYPES.map(([k, l, e]) => `<button class="chip${pr.types.includes(k) ? ' on' : ''}" data-ty="${k}">${pr.types.includes(k) ? '✓ ' : ''}${l} <small>${e}</small></button>`).join('');
  renderArea(); renderFav(); renderItems(); renderSug(); preview();
}
function renderArea() {
  const pr = APP.pr, A = L.areas.slice(); if (pr.area && !A.some(a => norm(a) === norm(pr.area))) A.unshift(pr.area);
  $('areaBox').innerHTML = A.map(a => `<button class="chip${norm(a) === norm(pr.area) ? ' on' : ''}" data-ar="${esc(a)}">${esc(a)}</button>`).join('') + '<button class="chip add" data-ar-new>＋ พิมพ์พื้นที่ / งาน</button>';
}
function renderFav() {
  const have = new Set(APP.pr.items.map(i => norm(i.name)));
  $('favBox').innerHTML = L.items.filter(i => !have.has(norm(i.name))).slice(0, window.innerWidth < 700 ? 8 : 12).map(i => `<button class="chip" data-fav="${esc(i.name)}">＋ ${esc(i.name)}</button>`).join('');
}
function renderItems() {
  const pr = APP.pr;
  $('itemCount').textContent = pr.items.length ? pr.items.length + ' รายการ' : 'ยังไม่มีรายการ';
  if (!pr.items.length) { $('items').innerHTML = '<p class="empty">ยังไม่มีรายการ — พิมพ์ชื่อของด้านบน หรือแตะ “ของที่ใช้บ่อย”</p>'; return; }
  $('items').innerHTML = pr.items.map((it, i) => {
    const us = UNITS.includes(it.unit) || !it.unit ? UNITS : [it.unit, ...UNITS];
    return `<div class="it" data-i="${i}"><div class="r1"><span class="no">${i + 1}</span><input class="nm" data-f="name" value="${esc(it.name)}" placeholder="ชื่อของ ยี่ห้อ / รุ่น / ขนาด"><button class="del" data-del title="ลบรายการ">✕</button></div>
      <div class="r2"><div class="qty"><button data-q="-1" aria-label="ลด">−</button><input data-f="qty" inputmode="decimal" value="${esc(it.qty)}"><button data-q="1" aria-label="เพิ่ม">＋</button></div>
        <select data-f="unit">${us.map(u => `<option${u === it.unit ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select>
        <label>ต้องการของวันที่<input type="date" data-f="need" value="${esc(it.need)}"></label></div>
      <input class="rm" data-f="remark" value="${esc(it.remark)}" placeholder="หมายเหตุ / ใช้กับงาน / พื้นที่"></div>`; }).join('');
}
function renderSug() {
  const q = norm($('q').value); const box = $('sug');
  if (!q) { box.innerHTML = ''; return; }
  const hit = L.items.filter(i => norm(i.name).includes(q)).slice(0, 5);
  const exact = hit.some(i => norm(i.name) === q);
  box.innerHTML = hit.map(i => `<button data-pick="${esc(i.name)}"><b>${esc(i.name)}</b><small>${esc(i.unit || '')}</small><span style="color:var(--acc);font-weight:700">＋ เพิ่ม</span></button>`).join('')
    + (exact ? '' : `<button data-pick="${esc($('q').value.trim())}"><b>＋ เพิ่ม “${esc($('q').value.trim())}”</b><small>ของใหม่</small></button>`);
}
function addItem(name) {
  const n = String(name || '').trim(); if (!n) return;
  const pr = APP.pr; const ex = pr.items.find(i => norm(i.name) === norm(n));
  if (ex) { ex.qty = String((parseFloat(ex.qty) || 0) + 1); toast('มี “' + n + '” แล้ว — เพิ่มจำนวนเป็น ' + ex.qty); }
  else pr.items.push({ name: n, qty: '1', unit: L.unitOf(n) || 'อัน', code: '', need: defNeed(), remark: pr.area || '' });
  $('q').value = ''; renderSug(); renderFav(); renderItems(); preview(); draftSave();
  const last = document.querySelector('#items .it:last-child'); if (last && !ex) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
// ----- เหตุการณ์ -----
$('autoBox').addEventListener('input', (e) => { const k = e.target.dataset.af; if (!k) return; APP.pr[k] = e.target.value; preview(); draftSave(); });
$('typeBox').addEventListener('click', (e) => { const b = e.target.closest('[data-ty]'); if (!b) return; const T = APP.pr.types, k = b.dataset.ty;
  APP.pr.types = T.includes(k) ? T.filter(x => x !== k) : [...T, k]; renderEdit(); draftSave(); });
$('areaBox').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ar],[data-ar-new]'); if (!b) return; const pr = APP.pr; const old = pr.area;
  let a = b.dataset.ar;
  if (b.hasAttribute('data-ar-new')) { a = prompt('ใช้กับงาน / พื้นที่ไหน?\nเช่น ติดตั้งประตู ชั้น 2 · ห้องน้ำ Master · ทีมช่างเฟอร์นิเจอร์', ''); if (!a || !a.trim()) return; a = a.trim(); }
  else if (norm(a) === norm(old)) a = '';
  pr.area = a; pr.items.forEach(it => { if (!it.remark || norm(it.remark) === norm(old)) it.remark = a; });   // ใส่ให้ทุกรายการที่ยังว่าง / ยังเป็นค่าเดิม
  renderArea(); renderItems(); preview(); draftSave();
});
$('favBox').addEventListener('click', (e) => { const b = e.target.closest('[data-fav]'); if (b) addItem(b.dataset.fav); });
$('sug').addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) addItem(b.dataset.pick); });
$('q').addEventListener('input', renderSug);
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const f = document.querySelector('#sug [data-pick]'); if (f) addItem(f.dataset.pick); } });
$('items').addEventListener('click', (e) => {
  const row = e.target.closest('[data-i]'); if (!row) return; const i = +row.dataset.i, it = APP.pr.items[i];
  if (e.target.closest('[data-del]')) { if (!confirm('ลบ “' + (it.name || 'รายการนี้') + '”?')) return; APP.pr.items.splice(i, 1); renderItems(); renderFav(); preview(); draftSave(); return; }
  const q = e.target.closest('[data-q]'); if (q) { const v = Math.max(0, (parseFloat(it.qty) || 0) + Number(q.dataset.q)); it.qty = String(v); row.querySelector('[data-f="qty"]').value = it.qty; preview(); draftSave(); }
});
$('items').addEventListener('input', (e) => { const f = e.target.dataset.f; const row = e.target.closest('[data-i]'); if (!f || !row) return; APP.pr.items[+row.dataset.i][f] = e.target.value; preview(); draftSave(); });
$('items').addEventListener('change', (e) => { const f = e.target.dataset.f; const row = e.target.closest('[data-i]'); if (!f || !row) return; APP.pr.items[+row.dataset.i][f] = e.target.value; preview(); draftSave(); });
// 🎤 พูดชื่อของ (Chrome / Android / Safari ใหม่)
(() => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; const btn = $('mic'); btn.hidden = false; let rec = null;
  btn.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'th-TH'; rec.interimResults = false; rec.maxAlternatives = 1; btn.classList.add('on'); toast('พูดชื่อของได้เลย…', 2000);
    rec.onresult = (ev) => { const t = ev.results[0][0].transcript || ''; $('q').value = t.trim(); renderSug(); };
    rec.onend = () => { btn.classList.remove('on'); rec = null; }; rec.onerror = () => { btn.classList.remove('on'); rec = null; toast('ฟังไม่ชัด ลองใหม่อีกครั้ง หรือพิมพ์แทน'); };
    try { rec.start(); } catch (x) { btn.classList.remove('on'); rec = null; } }); })();

// ร่างในเครื่อง — กันข้อมูลหายถ้ากดออกโดยไม่ตั้งใจ
const draftKey = () => 'apr_draft_' + SCHEMA + '_' + APP.pid;
let draftT = null;
function draftSave() { clearTimeout(draftT); draftT = setTimeout(() => { try { localStorage.setItem(draftKey(), JSON.stringify(APP.pr)); } catch (e) {} }, 400); }
function draftClear() { try { localStorage.removeItem(draftKey()); } catch (e) {} }

function check(pr) {
  const its = pr.items.filter(i => String(i.name || '').trim());
  if (!pr.types.length) return 'เลือกประเภทงานก่อน (ข้อ 1)';
  if (!its.length) return 'ยังไม่มีรายการของ (ข้อ 3)';
  const bad = its.find(i => !(parseFloat(i.qty) > 0)); if (bad) return 'ใส่จำนวนของ “' + bad.name + '”';
  return '';
}
async function doSave(status) {
  const pr = APP.pr; pr.items = pr.items.filter(i => String(i.name || '').trim());
  const err = check(pr); if (err) { toast(err, 3200); renderItems(); return false; }
  pr.status = status === 'sent' || pr.status === 'sent' ? 'sent' : 'draft'; pr.upd = Date.now(); pr.updBy = APP.me.name;
  if (status === 'sent' && !pr.sentAt) pr.sentAt = Date.now();
  const b1 = $('btnSend'), b2 = $('btnDraft'); b1.disabled = b2.disabled = true;
  try { await savePr(pr); draftClear(); try { localStorage.setItem(lastTypesKey(), JSON.stringify(pr.types)); } catch (e) {} }
  catch (e) { toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 4000); return false; }
  finally { b1.disabled = b2.disabled = false; }
  return true;
}
$('btnDraft').addEventListener('click', async () => { if (await doSave('draft')) { toast('บันทึกร่างแล้ว'); history.back(); setTimeout(renderList, 50); } });
$('btnSend').addEventListener('click', async () => {
  if (!(await doSave('sent'))) return;
  openView(true); toast('บันทึกแล้ว — พิมพ์ / ส่งต่อ แล้วนำไปลงนาม');
  // ระบบแท็ก: แจ้ง QS / PM ของโครงการ
  if (window.WCTag) { try { WCTag.tag({ title: 'ใบขอซื้อ ' + APP.pr.no + ' · ' + projName(APP.proj) + ' (' + APP.pr.items.length + ' รายการ)', sub: 'ตรวจรายการ แล้วลงนาม / เปิด PR ใน Mango',
    project: APP.pid, ref_type: 'apr', ref_id: APP.pr.id, url: location.origin + '/auto-pr.html?pid=' + encodeURIComponent(APP.pid) + (IS_STG ? '&env=staging' : ''),
    roles: [['qs', 'qs_mgr'], ['pm', 'pm_mgr'], ['proc']] }); } catch (e) {} }
});
$('btnPv').addEventListener('click', () => { openView(); });

// =====================================================================
// ใบขอซื้อ (A4) — หน้าตาเหมือนฟอร์มกระดาษ
// =====================================================================
function formHtml(pr) {
  const its = pr.items.filter(i => String(i.name || '').trim()); const rows = Math.max(12, its.length);
  const tr = []; for (let i = 0; i < rows; i++) { const it = its[i];
    tr.push(it ? `<tr><td class="c">${i + 1}.</td><td>${esc(it.name)}</td><td class="c">${esc(it.qty)}</td><td class="c">${esc(it.unit)}</td><td class="c">${esc(it.code || '')}</td><td class="c">${esc(thDate(it.need))}</td><td>${esc(it.remark || '')}</td></tr>`
      : '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'); }
  const bx = (k) => `<span class="bx${pr.types.includes(k) ? ' on' : ''}"></span>`;
  return `<div class="pr">
    <div class="co">wellcon interior co., ltd. 36/38 โครงการเซนโทรพอร์ต ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150 โทร.02-1525430 · เลขผู้เสียภาษี 0105560007187</div>
    <div class="ti">Purchase Requisition(PR)</div><div class="ti2">ใบขอซื้อ</div>
    <div style="margin-top:14px;font-weight:700">ประเภทงาน :</div>
    <div class="ty">${TYPES.map(([k, l, e]) => `<div>${bx(k)}${l} / ${e}</div>`).join('')}</div>
    <div class="ln"><b>ชื่อโครงการ :</b><span class="ul">${esc(pr.proj)}</span><b style="margin-left:18px">วันที่ :</b><span class="ul" style="flex:0 0 190px">${esc(thDate(pr.date))}</span></div>
    <table><thead><tr><th colspan="7">รายการที่ต้องการขอซื้อ</th></tr>
      <tr><th style="width:50px">ลำดับ</th><th>รายการ</th><th style="width:62px">จำนวน</th><th style="width:62px">หน่วย</th><th style="width:76px">รหัสต้นทุน</th><th style="width:96px">ต้องการของวันที่</th><th style="width:170px">หมายเหตุ</th></tr></thead>
      <tbody>${tr.join('')}</tbody></table>
    <div class="red">หมายเหตุ : ระยะเวลาในการสั่งของ 3 วัน (ส่ง PR ก่อนเที่ยง) กรณีเร่งด่วน<br>โปรดระบุชื่อ / ยี่ห้อ / รุ่น / จำนวน / ประเภทสินค้า วัสดุ วัตถุดิบ และใช้กับงานอะไรให้ละเอียดชัดเจน<br>แนบแบบแปลน / ภาพประกอบ พร้อมระบุพื้นที่ในการใช้งานทุกครั้ง</div>
    <div class="sig">
      <div style="flex-direction:column;align-items:stretch;gap:10px;margin:0"><div><b>ผู้ขอซื้อ :</b><span class="ul">${esc(pr.by)}</span></div><div><b>ตำแหน่ง :</b><span class="ul">${esc(pr.byTitle)}</span></div><div><b>วันที่ :</b><span class="ul">${esc(thDate(pr.date))}</span></div></div>
      <div style="flex-direction:column;align-items:stretch;gap:10px;margin:0"><div><b>ผู้ตรวจสอบ :</b><span class="ul"></span></div><div><b>ตำแหน่ง :</b><span class="ul" style="color:#111">ฝ่าย QS ประเมินราคา</span></div><div><b>วันที่ :</b><span class="ul"></span></div></div>
      <div style="flex-direction:column;align-items:stretch;gap:10px;margin:0"><div><b>ผู้อนุมัติ :</b><span class="ul">${esc(pr.pm ? '(' + pr.pm + ')' : '')}</span></div><div><b>ตำแหน่ง :</b><span class="ul" style="color:#111">Project Manager</span></div><div><b>วันที่ :</b><span class="ul"></span></div></div>
    </div>
    <div class="doc"><span>${esc(pr.no)}</span><span>สร้างด้วย Auto PR · Wellcon PM</span></div></div>`;
}
function fit(box) { const w = box.clientWidth; const pr = box.querySelector('.pr'); if (!pr || !w) return; const k = Math.min(1, w / 794); pr.style.transform = 'scale(' + k + ')'; box.style.height = Math.ceil(pr.offsetHeight * k) + 'px'; }
let pvT = null;
function preview() { clearTimeout(pvT); pvT = setTimeout(() => { const b = $('pvSide'); if (!b || getComputedStyle(b.parentElement).display === 'none') return; b.innerHTML = formHtml(APP.pr); fit(b); }, 120); }
window.addEventListener('resize', () => { ['pvSide', 'pvMain'].forEach(id => { const b = $(id); if (b && b.innerHTML) fit(b); }); });

function textOf(pr) {
  const its = pr.items.filter(i => String(i.name || '').trim());
  return ['ใบขอซื้อ ' + pr.no, 'โครงการ: ' + pr.proj, 'วันที่: ' + thDate(pr.date), 'ประเภท: ' + TYPES.filter(t => pr.types.includes(t[0])).map(t => t[1]).join(', '), '',
    ...its.map((i, n) => (n + 1) + '. ' + i.name + ' — ' + i.qty + ' ' + i.unit + (i.need ? ' · ต้องการ ' + thDate(i.need) : '') + (i.remark ? ' · ' + i.remark : '')), '',
    'ผู้ขอซื้อ: ' + pr.by + (pr.byTitle ? ' (' + pr.byTitle + ')' : '') + (pr.pm ? ' · ผู้อนุมัติ: ' + pr.pm : '')].join('\n');
}
function openView(fromSave) {
  const pr = APP.pr; $('vwTitle').textContent = pr.no;
  $('vwBtns').innerHTML = `<button class="btn sm" data-v="copy">📋 คัดลอกข้อความ (LINE / Mango)</button><a class="btn sm" href="${MANGO_URL}" target="_blank" rel="noopener" style="background:#F28C28;color:#fff;border:0">🛒 เปิด Mango ↗</a>`
    + (pr.status === 'sent' ? '' : '<span class="st st-draft" style="align-self:center">ยังเป็นร่าง — กด ✎ แก้ไข แล้ว “บันทึก + ส่ง”</span>');
  if (fromSave && APP.screen === 'edit') { history.replaceState({ apr: 'view' }, ''); show('view', false); } else show('view', true);
  const b = $('pvMain'); b.innerHTML = formHtml(pr); requestAnimationFrame(() => fit(b));
}
$('vwBtns').addEventListener('click', async (e) => { const b = e.target.closest('[data-v="copy"]'); if (!b) return;
  const t = textOf(APP.pr); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว — วางใน LINE หรือช่องรายละเอียดใน Mango ได้เลย'); }
  catch (x) { prompt('คัดลอกข้อความนี้', t); } });
$('btnEdit').addEventListener('click', () => { renderEdit(); if (APP.screen === 'view') { history.replaceState({ apr: 'edit' }, ''); show('edit', false); } });
$('btnPrint').addEventListener('click', () => { $('printArea').innerHTML = formHtml(APP.pr); setTimeout(() => window.print(), 50); });

// คืนร่างที่ค้างในเครื่อง (ถ้าเคยกดออกโดยไม่บันทึก)
const _open = openProject;
openProject = async function (pid) { await _open(pid); let d = null; try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) {}
  if (d && d.pid === pid && (d.items || []).length && !myPrs().some(x => x.id === d.id && x.upd >= (d.upd || 0)) && confirm('มีใบขอซื้อที่ยังไม่ได้บันทึก (' + d.items.length + ' รายการ) — เปิดทำต่อไหม?')) { APP.pr = d; renderEdit(); show('edit', true); }
  else if (d) draftClear(); };

if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__apr = { APP, show, renderList, renderEdit, openView, formHtml, learn, newPr, addItem, defNeed, textOf };
boot();
})();
