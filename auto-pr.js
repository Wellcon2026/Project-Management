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
const APR_VER = 'v1.3.1';   // 1.3.1: ใบ PR เหลือช่องลงนาม 3 ช่อง (ผู้ขอซื้อ · ผู้จัดการโครงการ · ผู้อนุมัติ QS) · 1.3.0: Phase 2 — นำเข้า Material Log / ใบเสนอราคา (Excel · Google Sheet) เป็นรายการวัสดุโครงการ · เลือกจากรายการ · เตือนขอเกิน BOQ · ไม่อ่านราคา · 1.2.0: ใบ PR รูปแบบ Mango (ใบขอซื้อ/ขอจ้าง) · รหัสต้นทุน / รหัสวัสดุ · ผู้ขาย · สถานที่ส่งของ · ส่งออก Excel คอลัมน์ Mango · 1.1.0: ขั้นตอนอนุมัติ QS → จัดซื้อ → รับของ · ติดตามสถานะ · งานที่รอคุณ · แจ้งเตือนแท็ก + LINE · SLA 24 ชม.
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

const APP = { acc: null, me: null, accounts: [], projects: [], pid: '', proj: null, all: {}, cfg: {}, cat: { sources: [], items: [] }, imp: null, catPick: null, catQ: '', catTab: '', rooms: [], pr: null, screen: 'msg', pushed: 0, filt: 'all' };
const SCR = ['msg', 'proj', 'list', 'edit', 'view', 'cat'];
function show(s, push) {
  SCR.forEach(k => { $('scr' + k[0].toUpperCase() + k.slice(1)).hidden = k !== s; });
  if (push) { history.pushState({ apr: s }, ''); APP.pushed++; }
  APP.screen = s;
}
window.addEventListener('popstate', (e) => {
  const s = (e.state && e.state.apr) || (APP.pid ? 'list' : (APP.acc ? 'proj' : 'msg'));
  if (APP.pushed > 0) APP.pushed--;
  show(s, false); if (s === 'list') renderList(); if (s === 'edit') renderEdit(); if (s === 'proj') renderProjects(); if (s === 'cat') renderCat();
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
  const score = new Map(), unit = {}, codes = {};
  const add = (name, u, w, it) => { const k = norm(name); if (!k) return; const o = score.get(k) || { name: String(name).trim(), n: 0 }; o.n += w; score.set(k, o); if (u && !unit[k]) unit[k] = u;
    if (it && (it.code || it.mat) && !codes[k]) codes[k] = { code: it.code || '', mat: it.mat || '' }; };
  Object.keys(APP.all).forEach(pid => (APP.all[pid] || []).forEach(pr => (pr.items || []).forEach(it => add(it.name, it.unit, pid === APP.pid ? 3 : 1, it))));
  COMMON.forEach(([n, u], i) => { add(n, u, 0.2 - i * 0.005); });
  const items = [...score.values()].sort((a, b) => b.n - a.n).map(o => ({ name: o.name, unit: unit[norm(o.name)] || '' }));
  const areas = []; const seenA = new Set();
  myPrs().forEach(pr => { [pr.area, ...(pr.items || []).map(i => i.remark)].forEach(a => { const k = norm(a); if (k && !seenA.has(k)) { seenA.add(k); areas.push(String(a).trim()); } }); });
  APP.rooms.forEach(a => { const k = norm(a); if (k && !seenA.has(k)) { seenA.add(k); areas.push(a); } });
  return { items, areas: areas.slice(0, 14), unitOf: (n) => unit[norm(n)] || '', codesOf: (n) => codes[norm(n)] || { code: '', mat: '' } };
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
    await Promise.all([loadAll(), loadCfg()]);
    escalate();   // SLA 24 ชม. (ทำครั้งเดียวต่อใบ)
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
  const L = APP.projects; $('projInbox').innerHTML = inboxHtml(inboxOf(L.map(p => p.id)), true);
  const pend = (pid) => (APP.all[pid] || []).filter(pr => ['sent', 'approved', 'ordered', 'returned'].includes(pr.status)).length;
  $('projList').innerHTML = L.length ? L.map(p => { const n = pend(p.id); return `<button class="card" data-pid="${esc(p.id)}" style="text-align:left"><b>${esc(projName(p))}</b><span style="font-size:13px;color:var(--mut)">${esc(projCode(p))}${n ? ' · กำลังดำเนินการ ' + n + ' ใบ' : ''}</span></button>`; }).join('')
    : '<p class="empty">ยังไม่มีโครงการที่คุณถูก assign</p>';
  show('proj');
}
$('projInbox').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openPr(b.dataset.opid, b.dataset.open); });
$('projList').addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (!b) return;
  const u = new URL(location.href); u.searchParams.set('pid', b.dataset.pid); history.replaceState(null, '', u); openProject(b.dataset.pid); });
async function openProject(pid) {
  APP.pid = pid; APP.proj = APP.projects.find(x => x.id === pid);
  // ชื่อห้อง / โซนจาก Takeoff (ถ้ามี) — ใช้เป็นตัวเลือก "พื้นที่"
  try { const r = await sb.from('takeoff_field_measures').select('name').eq('pm_project_id', pid).is('deleted_at', null).limit(300);
    if (!r.error) APP.rooms = [...new Set((r.data || []).map(x => String(x.name || '').trim()).filter(Boolean))].slice(0, 20); } catch (e) {}
  await loadCat(pid);
  const sub = [projName(APP.proj), projCode(APP.proj)].filter(Boolean).join(' · ');
  $('listProj').textContent = sub; $('edProj').textContent = sub; $('catProj').textContent = sub;
  show('list'); renderList();
}

// =====================================================================
// รายการใบขอซื้อ
// =====================================================================
const prNo = (pr) => pr.no || '';
// =====================================================================
// v1.1.0 ขั้นตอนอนุมัติ + ติดตาม + แจ้งเตือน
//   ส่ง PR → QS ของโครงการ อนุมัติ / ส่งกลับแก้ไข → จัดซื้อของโครงการ สั่งของ (เลข PR/PO Mango · วันของถึง) → หน้างานยืนยันรับของ
//   แจ้งเตือน: ระบบแท็ก (popup + กระดิ่ง ทุกแอป) + กลุ่ม LINE ของโครงการ / กลุ่มจัดซื้อ (ถ้าตั้งไว้)
//   SLA 24 ชม.: QS ยังไม่อนุมัติ → แจ้ง QS Manager + PM · จัดซื้อยังไม่สั่ง → แจ้งจัดซื้อ + PM (ครั้งเดียวต่อใบ · ตรวจตอนมีคนเปิดแอป)
// =====================================================================
const STS = { draft: ['ร่าง', '#F3EDE1', '#6B6758'], sent: ['รอ QS อนุมัติ', '#FAF1D6', '#8A6D10'], returned: ['QS ส่งกลับแก้ไข', '#F8E4DF', '#B4332A'],
  approved: ['รอจัดซื้อสั่งของ', '#E3ECF5', '#2F5E8C'], ordered: ['สั่งซื้อแล้ว · รอของ', '#EDE7F6', '#5B3F99'], received: ['ได้รับของแล้ว', '#E6EFE0', '#3F5A33'], cancelled: ['ยกเลิก', '#F2EDE3', '#8C877D'] };
const SLA_H = 24;
const QS_R = ['qs', 'qs_mgr', 'superadmin', 'director'], PROC_R = ['proc', 'superadmin'], SITE_R = ['site', 'sitemgr', 'pm', 'pm_mgr', 'store', 'superadmin', 'director'];
const CFG_R = ['pm', 'pm_mgr', 'qs', 'qs_mgr', 'proc', 'superadmin', 'director'];
const stTag = (s) => { const x = STS[s] || STS.draft; return `<span class="st" style="background:${x[1]};color:${x[2]}">${x[0]}</span>`; };
const canApprove = () => QS_R.includes(APP.me.role);
const canProc = () => PROC_R.includes(APP.me.role);
const canCfg = () => CFG_R.includes(APP.me.role);
const isMine = (pr) => norm(pr.byEmail) === APP.me.email;
const canReceive = (pr) => isMine(pr) || SITE_R.includes(APP.me.role);
const canEdit = (pr) => !pr.status || (['draft', 'returned'].includes(pr.status) && (isMine(pr) || SITE_R.includes(APP.me.role))) || (pr.status === 'sent' && canApprove());
const hrs = (t) => t ? (Date.now() - t) / 36e5 : 0;
const ageTxt = (t) => { const h = hrs(t); return h < 1 ? Math.max(1, Math.round(h * 60)) + ' นาที' : h < 48 ? Math.round(h) + ' ชม.' : Math.round(h / 24) + ' วัน'; };
const when2 = (t) => { if (!t) return ''; const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const stAt = (pr) => ({ sent: pr.sentAt, approved: pr.qsAt, ordered: pr.orderedAt, returned: pr.qsAt, received: pr.receivedAt })[pr.status] || pr.upd || pr.at;
const waitOf = (pr) => ({ sent: 'QS', approved: 'จัดซื้อ', returned: 'ผู้ขอแก้ไข' })[pr.status] || '';
const minNeed = (pr) => (pr.items || []).map(i => i.need).filter(Boolean).sort()[0] || '';
const nameOf = (e) => { const a = APP.accounts.find(x => norm(x.email) === norm(e)); return a ? nickOf(a) : e; };
const names = (L) => L.map(nameOf).join(', ') || '—';
function ageBadge(pr) {
  if (pr.status === 'ordered') { const late = pr.eta && pr.eta < isoOf(new Date()); return pr.eta ? `<span class="age ${late ? 'late' : 'ok'}">${late ? 'เลยวันของถึง ' : 'ของถึง '}${esc(thDate(pr.eta))}</span>` : ''; }
  if (!['sent', 'approved', 'returned'].includes(pr.status)) return '';
  const h = hrs(stAt(pr)); const c = h >= SLA_H ? 'late' : h >= SLA_H / 2 ? 'warn' : 'ok';
  return `<span class="age ${c}">รอ${esc(waitOf(pr))} ${ageTxt(stAt(pr))}</span>`;
}
function tracker(pr) {
  const S = pr.status || 'draft', idx = { draft: 0, sent: 1, returned: 1, approved: 2, ordered: 3, received: 4, cancelled: 0 }[S];
  const steps = [['ส่ง PR', pr.sentAt, pr.by], ['QS อนุมัติ', S === 'returned' ? 0 : pr.qsAt, pr.qsBy], ['จัดซื้อสั่งของ', pr.orderedAt, pr.procBy], ['ของถึงหน้างาน', pr.receivedAt, pr.recvBy]];
  return '<div class="trk">' + steps.map(([l, t, who], i) => { const done = i < idx, now = i === idx && S !== 'cancelled', bad = S === 'returned' && i === 1;
    const sub = done && t ? when2(t) + (who ? ' · ' + who : '') : bad ? 'ส่งกลับแก้ไข' : now ? 'กำลังรอ' : '';
    return `<span class="${done ? 'done' : ''}${now ? ' now' : ''}${bad ? ' bad' : ''}">${l}<small>${esc(sub)}</small></span>`; }).join('') + '</div>';
}
// ----- คนรับผิดชอบแต่ละขั้น (ตามทีมโครงการ · ไม่มีในโครงการ → หัวหน้าฝ่าย / ทั้งฝ่าย) -----
const actv = () => APP.accounts.filter(a => a && a.email && a.active !== false && !a.disabled);
const inP = (a, pid) => (a.projects || []).includes(pid);
function qsOf(pid) { const L = actv().filter(a => ['qs', 'qs_mgr'].includes(a.roleKey)); const P = L.filter(a => inP(a, pid)); return (P.length ? P : L.filter(a => a.roleKey === 'qs_mgr')).map(a => norm(a.email)); }
function procOf(pid) { const L = actv().filter(a => a.roleKey === 'proc'); const P = L.filter(a => inP(a, pid)); return (P.length ? P : L).map(a => norm(a.email)); }
function pmsOf(pid) { return actv().filter(a => ['pm', 'pm_mgr'].includes(a.roleKey) && inP(a, pid)).map(a => norm(a.email)); }
const qsMgr = () => actv().filter(a => a.roleKey === 'qs_mgr').map(a => norm(a.email));
// ----- แจ้งเตือน: ระบบแท็ก + LINE -----
const prUrl = (pr) => location.origin + '/auto-pr.html?pid=' + encodeURIComponent(pr.pid) + '&pr=' + encodeURIComponent(pr.id) + (IS_STG ? '&env=staging' : '');
async function notify(pr, o) {   // o: { title, note, to:[], approve:[], close:'approve'|'all', line }
  if (window.WCTag) { try {
    if (o.close) await WCTag.close({ app: 'apr', ref_type: 'apr', ref_id: pr.id, ...(o.close === 'approve' ? { kind: 'approve' } : {}) });
    const ap = [...new Set(o.approve || [])], to = [...new Set(o.to || [])].filter(e => !ap.includes(e));
    if (to.length || ap.length) await WCTag.send({ app: 'apr', project: pr.pid, ref_type: 'apr', ref_id: pr.id, title: o.title, note: o.note || '', url: prUrl(pr), to, approve: ap });
  } catch (e) { console.warn(e); } }
  lineSend(pr, o.line || o.title);
}
const CFG_KEY = 'autoPRCfg';
async function loadCfg() { try { const r = await sb.from('app_state').select('data').eq('id', CFG_KEY).maybeSingle(); APP.cfg = (!r.error && r.data && r.data.data && r.data.data.v) || {}; } catch (e) { APP.cfg = {}; } }
async function saveCfg(k, patch) {
  const r = await sb.from('app_state').select('data').eq('id', CFG_KEY).maybeSingle(); if (r.error) throw r.error;
  const v = { ...((r.data && r.data.data && r.data.data.v) || {}) }; v[k] = { ...(v[k] || {}), ...patch };
  const up = await sb.from('app_state').upsert([{ id: CFG_KEY, data: { v }, updated_by: APP.me.email }], { onConflict: 'id' }); if (up.error) throw up.error; APP.cfg = v;
}
function lineSend(pr, text) {
  const to = [...new Set([((APP.cfg || {})[pr.pid] || {}).line, ((APP.cfg || {})._all || {}).line].map(x => String(x || '').trim()).filter(Boolean))]; if (!to.length) return;
  const msg = '🧾 ' + pr.no + ' · ' + pr.proj + '\n' + text + '\n' + (pr.items || []).length + ' รายการ' + (minNeed(pr) ? ' · ต้องการของ ' + thDate(minNeed(pr)) : '') + '\nเปิด: ' + prUrl(pr);
  to.forEach(t => { try { fetch('/api/line', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: t, text: msg }) }).catch(() => {}); } catch (e) {} });
}
// ----- เปลี่ยนสถานะ: อ่านล่าสุด → ตรวจสถานะยังตรง → แก้ → เขียน (กันกดซ้ำ / สองคนกดพร้อมกัน) -----
const logIt = (pr, act, note) => { pr.log = [...(pr.log || []), { at: Date.now(), by: APP.me.name, email: APP.me.email, act, note: note || '' }]; };
async function transition(pid, id, expect, mut) {
  const r = await sb.from('app_state').select('data').eq('id', KEY).maybeSingle(); if (r.error) throw r.error;
  const v = { ...((r.data && r.data.data && r.data.data.v) || {}) }; const L = (v[pid] || []).slice(); const i = L.findIndex(x => x.id === id);
  if (i < 0) throw new Error('ไม่พบใบขอซื้อนี้');
  const cur = JSON.parse(JSON.stringify(L[i]));
  if (expect && !expect.includes(cur.status)) { APP.all = v; throw new Error('ใบนี้ถูกดำเนินการไปแล้ว (' + (STS[cur.status] || [''])[0] + ') — แสดงสถานะล่าสุดแล้ว'); }
  mut(cur); cur.upd = Date.now(); cur.updBy = APP.me.name; L[i] = cur; v[pid] = L;
  const up = await sb.from('app_state').upsert([{ id: KEY, data: { v }, updated_by: APP.me.email }], { onConflict: 'id' }); if (up.error) throw up.error;
  APP.all = v; return cur;
}
async function escalate() {
  const vis = new Set(APP.projects.map(p => p.id));
  for (const pid of Object.keys(APP.all)) { if (!vis.has(pid)) continue;
    for (const pr of (APP.all[pid] || [])) { if (!pr || pr.deleted) continue;
      if (pr.status === 'sent' && hrs(pr.sentAt) >= SLA_H && !pr.escQs) await esc1(pid, pr, 'sent', 'escQs', [...qsMgr(), ...pmsOf(pid)], 'เกิน 24 ชม. QS ยังไม่อนุมัติ');
      else if (pr.status === 'approved' && hrs(pr.qsAt) >= SLA_H && !pr.escProc) await esc1(pid, pr, 'approved', 'escProc', [...procOf(pid), ...pmsOf(pid)], 'เกิน 24 ชม. จัดซื้อยังไม่สั่งของ'); } }
}
async function esc1(pid, pr, st, flag, to, why) {
  try { const cur = await transition(pid, pr.id, [st], x => { if (x[flag]) throw new Error('done'); x[flag] = Date.now(); logIt(x, '⏰ แจ้งเตือนเกินเวลา', why); });
    await notify(cur, { title: '⏰ ' + why + ' · ' + cur.no + ' · ' + cur.proj, to, line: '⏰ ' + why }); } catch (e) {}
}
// ----- งานที่รอคุณ -----
function inboxOf(pids) {
  const out = [];
  pids.forEach(pid => (APP.all[pid] || []).forEach(pr => { if (!pr || pr.deleted) return; let why = '';
    if (pr.status === 'sent' && canApprove()) why = '✍️ รอคุณอนุมัติ';
    else if (pr.status === 'approved' && canProc()) why = '🛒 รอคุณสั่งของ';
    else if (pr.status === 'returned' && isMine(pr)) why = '↩ QS ส่งกลับ — แก้แล้วส่งใหม่';
    else if (pr.status === 'ordered' && isMine(pr)) why = '📦 ของถึงแล้วหรือยัง? ยืนยันรับของ';
    else if (pr.status === 'draft' && isMine(pr)) why = '📝 ร่างที่ยังไม่ได้ส่ง';
    if (why) out.push({ pr, why, pid }); }));
  return out.sort((a, b) => (stAt(a.pr) || 0) - (stAt(b.pr) || 0));
}
function inboxHtml(L, showProj) {
  if (!L.length) return '';
  return `<div class="card inbox"><div class="h"><span class="n" style="background:var(--acc)">${L.length}</span>งานที่รอคุณ <small>แตะเพื่อเปิด</small></div>` + L.slice(0, 20).map(x =>
    `<button class="ib" data-open="${esc(x.pr.id)}" data-opid="${esc(x.pid)}"><span><b>${esc(x.why)}</b><small>${esc(x.pr.no)}${showProj ? ' · ' + esc(x.pr.proj) : ''} · ${(x.pr.items || []).length} รายการ · ${esc(x.pr.by || '')}</small></span>${ageBadge(x.pr)}</button>`).join('') + '</div>';
}
function openPr(pid, id) {
  const go = () => { const f = (APP.all[pid] || []).find(x => x.id === id); if (!f) { toast('ไม่พบใบขอซื้อนี้'); return; } APP.pr = JSON.parse(JSON.stringify(f)); openView(); };
  if (pid === APP.pid) { go(); return; }
  const u = new URL(location.href); u.searchParams.set('pid', pid); u.searchParams.set('pr', id); history.replaceState(null, '', u); openProject(pid);
}
async function reload() { try { await loadAll(); } catch (e) { toast('โหลดไม่สำเร็จ'); return; } if (APP.screen === 'list') renderList(); else if (APP.screen === 'proj') renderProjects();
  else if (APP.screen === 'view' && APP.pr) { const f = myPrs().find(x => x.id === APP.pr.id); if (f) { APP.pr = JSON.parse(JSON.stringify(f)); renderView(); } } }
setInterval(() => { if (document.visibilityState === 'visible' && APP.me && ['list', 'view', 'proj'].includes(APP.screen)) reload(); }, 60000);
async function editCfg() {
  const cur = ((APP.cfg || {})[APP.pid] || {}).line || '';
  const v = prompt('รหัสกลุ่ม LINE ของโครงการนี้ — แจ้งทุกขั้นตอนของใบขอซื้อเข้ากลุ่ม\nวิธีหารหัส: เชิญบอท Wellcon PM เข้ากลุ่ม LINE แล้วพิมพ์ id ในกลุ่ม\nเว้นว่าง = ไม่ส่ง LINE', cur);
  if (v === null) return;
  try { await saveCfg(APP.pid, { line: v.trim() });
    if (['proc', 'superadmin'].includes(APP.me.role)) { const c2 = ((APP.cfg || {})._all || {}).line || '';
      const v2 = prompt('(ไม่บังคับ) รหัสกลุ่ม LINE ฝ่ายจัดซื้อ — รับแจ้งใบขอซื้อทุกโครงการ\nเว้นว่าง = ไม่ใช้', c2); if (v2 !== null) await saveCfg('_all', { line: v2.trim() }); }
    toast(v.trim() ? 'บันทึกกลุ่ม LINE แล้ว — ขั้นตอนต่อไปจะแจ้งเข้ากลุ่ม' : 'ปิดการแจ้ง LINE ของโครงการนี้แล้ว'); renderList();
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 4000); }
}

// =====================================================================
// รายการใบขอซื้อ
// =====================================================================
const FILT = [['all', 'ทั้งหมด'], ['sent', 'รอ QS'], ['approved', 'รอจัดซื้อ'], ['ordered', 'สั่งแล้ว'], ['received', 'ได้รับแล้ว'], ['draft', 'ร่าง / ส่งกลับ']];
const inF = (pr, k) => k === 'all' ? pr.status !== 'cancelled' : k === 'draft' ? ['draft', 'returned'].includes(pr.status || 'draft') : pr.status === k;
function renderList() {
  const all = myPrs(), f = APP.filt || 'all', L = all.filter(pr => inF(pr, f)); const h = [];
  h.push(inboxHtml(inboxOf([APP.pid]), false));
  h.push('<div class="chips">' + FILT.map(([k, l]) => `<button class="chip${k === f ? ' on' : ''}" data-filt="${k}">${l} <small>${all.filter(pr => inF(pr, k)).length}</small></button>`).join('')
    + `<button class="chip" data-catv>📚 รายการวัสดุ ${(APP.cat.items || []).length ? '(' + APP.cat.items.length + ')' : (canCfg() ? '— นำเข้า' : '')}</button>`
    + '<button class="chip" data-reload title="โหลดใหม่">↻ โหลดใหม่</button>' + (canCfg() ? `<button class="chip add" data-cfg>🔔 LINE ${((APP.cfg || {})[APP.pid] || {}).line ? '✓' : '— ตั้งค่า'}</button>` : '') + '</div>');
  if (!all.length) h.push(`<div class="card" style="align-items:center;text-align:center;padding:26px 16px"><div style="font-size:40px">🧾</div><b style="font-size:17px">ยังไม่มีใบขอซื้อในโครงการนี้</b>
    <span style="color:var(--mut);font-size:14px">กด “＋ สร้างใบขอซื้อใหม่” — ระบบกรอกชื่อโครงการ วันที่ ชื่อผู้ขอ และผู้อนุมัติให้เอง</span></div>`);
  else if (!L.length) h.push('<p class="empty">ไม่มีใบขอซื้อในสถานะนี้</p>');
  else h.push('<div class="list">' + L.map(pr => {
    const n = (pr.items || []).length, first = (pr.items || []).slice(0, 3).map(i => i.name).join(' · ');
    return `<div class="card pr-c"><div class="t"><b>${esc(prNo(pr))}</b>${stTag(pr.status)}</div>
      <div class="s">${esc(thDate(pr.date))} · ${n} รายการ · โดย ${esc(pr.by || '—')}${pr.mangoNo ? ' · Mango ' + esc(pr.mangoNo) : ''}</div><div style="font-size:14px">${esc(first)}${n > 3 ? ' …' : ''}</div>
      ${pr.status && pr.status !== 'cancelled' ? tracker(pr) : ''}<div>${ageBadge(pr)}</div>
      <div class="b"><button class="btn sm dk" data-view="${esc(pr.id)}">👁 เปิด</button>${canEdit(pr) ? `<button class="btn sm" data-edit="${esc(pr.id)}">✎ แก้ไข</button>` : ''}<button class="btn sm" data-copy="${esc(pr.id)}">⧉ ขอซ้ำ</button></div></div>`; }).join('') + '</div>');
  h.push(`<p class="ver">Auto PR ${APR_VER} · ไม่มีราคา · ขั้นตอน: ส่ง PR → QS อนุมัติ → จัดซื้อสั่งของ → หน้างานรับของ</p>`);
  $('listBody').innerHTML = h.join('');
}
$('listBody').addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]'), ed = e.target.closest('[data-edit]'), cp = e.target.closest('[data-copy]'), fl = e.target.closest('[data-filt]'), ib = e.target.closest('[data-open]');
  const find = (id) => myPrs().find(x => x.id === id);
  if (fl) { APP.filt = fl.dataset.filt; renderList(); return; }
  if (e.target.closest('[data-reload]')) { toast('กำลังโหลดใหม่…', 900); reload(); return; }
  if (e.target.closest('[data-catv]')) { openCat(false); return; }
  if (e.target.closest('[data-cfg]')) { editCfg(); return; }
  if (ib) { openPr(ib.dataset.opid, ib.dataset.open); return; }
  if (v) { APP.pr = JSON.parse(JSON.stringify(find(v.dataset.view))); openView(); }
  else if (ed) { APP.pr = JSON.parse(JSON.stringify(find(ed.dataset.edit))); renderEdit(); show('edit', true); }
  else if (cp) { const src = find(cp.dataset.copy); APP.pr = newPr(); APP.pr.types = (src.types || []).slice(); APP.pr.area = src.area || '';
    APP.pr.items = (src.items || []).map(i => ({ ...i, need: defNeed() })); renderEdit(); show('edit', true); toast('คัดลอกรายการจากใบเดิมแล้ว — ตรวจจำนวนอีกครั้ง'); }
});
$('btnNew').addEventListener('click', () => { APP.pr = newPr(); renderEdit(); show('edit', true); });

// =====================================================================
// v1.3.0 Phase 2 — รายการวัสดุโครงการ: นำเข้า Material Log / ใบเสนอราคา (Excel · CSV · ลิงก์ Google Sheet)
//   QS / PM / จัดซื้อ นำเข้า → ระบบหาแถวหัวตาราง + จับคู่คอลัมน์ให้เอง (แก้ได้) → หน้างานกดเลือกของจากรายการ
//   ไม่อ่าน / ไม่เก็บคอลัมน์ราคา · เก็บที่ app_state 'autoPRCat_<pid>' (แยกแถวต่อโครงการ) · ไม่ต้องรัน SQL
//   ปริมาณ: เทียบจำนวนใน Material Log กับที่ขอไปแล้ว (ใบที่ส่ง / อนุมัติ / สั่ง / รับแล้ว) → เตือนเมื่อขอเกิน · QS เห็นคำเตือน
// =====================================================================
const catKey = (pid) => 'autoPRCat_' + pid;
async function loadCat(pid) { try { const r = await sb.from('app_state').select('data').eq('id', catKey(pid)).maybeSingle();
  APP.cat = (!r.error && r.data && r.data.data && r.data.data.v) || { sources: [], items: [] }; } catch (e) { APP.cat = { sources: [], items: [] }; } }
async function saveCat(pid, mut) {
  const r = await sb.from('app_state').select('data').eq('id', catKey(pid)).maybeSingle(); if (r.error) throw r.error;
  const v = (r.data && r.data.data && r.data.data.v) || { sources: [], items: [] }; mut(v);
  const up = await sb.from('app_state').upsert([{ id: catKey(pid), data: { v }, updated_by: APP.me.email }], { onConflict: 'id' }); if (up.error) throw up.error; APP.cat = v;
}
async function xlsxLib() { if (window.XLSX) return window.XLSX;
  await new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'vendor/xlsx.full.min.js'; sc.onload = ok; sc.onerror = () => no(new Error('โหลดตัวอ่าน Excel ไม่สำเร็จ')); document.head.appendChild(sc); });
  return window.XLSX; }
const hashId = (t) => { let h = 5381; const x = String(t); for (let i = 0; i < x.length; i++) h = ((h << 5) + h + x.charCodeAt(i)) | 0; return 'c' + (h >>> 0).toString(36); };
const numOf = (v) => { if (typeof v === 'number') return v; const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? null : n; };
// คอลัมน์ราคา / มูลค่า — ไม่อ่านเด็ดขาด
const RX_PRICE = /(ราคา|price|amount|total|cost|rate|บาท|baht|มูลค่า|ค่าแรง|ค่าของ|ส่วนลด|discount|vat)/i;
const RX = { name: /(material|description|รายการ|รายละเอียด|ชื่อสินค้า|ชื่อวัสดุ|^item$|^items?\s*name|spec)/i, qty: /^(qty|q'ty|q\.ty|quantity|จำนวน|ปริมาณ)/i,
  unit: /^(unit|units|หน่วย|uom)$/i, area: /(location|area|zone|room|พื้นที่|ตำแหน่ง|ห้อง|floor|ชั้น)/i };
const CODE_PRI = [/drawing\s*code/i, /item\s*(no|code)/i, /^code$/i, /รหัส/i, /code/i, /^ref/i];
const MAP_KEYS = [['name', 'รายการ'], ['qty', 'จำนวน'], ['unit', 'หน่วย'], ['code', 'รหัส / Drawing code'], ['area', 'พื้นที่ / ตำแหน่ง']];
function detectSheet(aoa) {
  let best = null;
  for (let r = 0; r < Math.min(40, aoa.length); r++) {
    const row = (aoa[r] || []).map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim());
    const m = { name: -1, qty: -1, unit: -1, code: -1, area: -1 }; const price = [];
    row.forEach((h, c) => { if (!h) return; if (RX_PRICE.test(h)) { price.push(c); return; }
      ['name', 'qty', 'unit', 'area'].forEach(k => { if (m[k] < 0 && RX[k].test(h)) m[k] = c; }); });
    for (const re of CODE_PRI) { const c = row.findIndex((h, i) => h && !price.includes(i) && i !== m.name && re.test(h)); if (c >= 0) { m.code = c; break; } }
    const sc = (m.name >= 0 ? 3 : 0) + (m.qty >= 0 ? 2 : 0) + (m.unit >= 0 ? 2 : 0) + (m.code >= 0 ? 1 : 0);
    if (m.name >= 0 && sc >= 5 && (!best || sc > best.sc)) best = { row: r, map: m, sc, cols: row, price };
  }
  return best;
}
// รายละเอียดหลายบรรทัด (Material Log) → ชื่อสั้น + สเปก (ยี่ห้อ · รหัส · ขนาด · วัสดุ · ผิว)
function cleanName(t) {
  const L = String(t == null ? '' : t).split(/\r?\n/).map(x => x.trim()).filter(Boolean); if (!L.length) return { name: '', spec: '' };
  const kv = {}, free = [];
  L.forEach(l => { const m = /^([A-Za-zก-๙ .\/&()]{2,30}?)\s*[:：]\s*(.+)$/.exec(l); if (m) kv[m[1].trim().toUpperCase()] = m[2].trim(); else free.push(l); });
  const nm = kv['FITTING NAME'] || kv['NAME'] || kv['ITEM'] || kv['DESCRIPTION'] || kv['ชื่อ'] || '';
  const name = [free[0] || '', nm].filter(Boolean).join(' — ') || L[0];
  const spec = ['BRAND', 'ยี่ห้อ', 'MODEL', 'รุ่น', 'CODE', 'SIZE', 'ขนาด', 'MATERIAL', 'FINISHED', 'FINISH', 'COLOR', 'COLOUR', 'สี'].map(k => kv[k] || '').filter(Boolean).join(' · ');
  return { name: name.replace(/\s+/g, ' ').slice(0, 160), spec: spec.replace(/\s+/g, ' ').slice(0, 200) };
}
function parseSheet(aoa, map, startRow, cat) {
  const out = []; let section = '';
  for (let r = startRow + 1; r < aoa.length; r++) {
    const row = aoa[r] || []; const raw = row[map.name];
    const filled = row.filter(c => String(c == null ? '' : c).trim()).length;
    const q = map.qty >= 0 ? numOf(row[map.qty]) : null;
    if (!String(raw == null ? '' : raw).trim()) {   // แถวหัวข้อ / กลุ่ม เช่น "D1/D (Corridor …)" → ใช้เป็นพื้นที่ของแถวถัดไป
      if (filled === 1 && q == null) { const t = row.find(c => String(c == null ? '' : c).trim()); section = String(t).replace(/\s+/g, ' ').trim().slice(0, 80); }
      continue; }
    const { name, spec } = cleanName(raw); if (!name || /^(total|รวม|grand total|sub ?total)/i.test(name)) continue;
    const unit = map.unit >= 0 ? String(row[map.unit] == null ? '' : row[map.unit]).trim().slice(0, 20) : '';
    const code = map.code >= 0 ? String(row[map.code] == null ? '' : row[map.code]).replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    const area = (map.area >= 0 ? String(row[map.area] == null ? '' : row[map.area]).replace(/\s+/g, ' ').trim() : '') || section;
    out.push({ cat, name, spec, unit, qty: q, code, area: area.slice(0, 80) });
  }
  return out;
}
async function readWorkbook(buf, label, kind, url) {
  const X = await xlsxLib(); const wb = X.read(buf, { type: 'array' });
  const sheets = wb.SheetNames.map(n => { const aoa = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }); const d = detectSheet(aoa);
    return { n, aoa, det: d, map: d ? { ...d.map } : { name: -1, qty: -1, unit: -1, code: -1, area: -1 }, start: d ? d.row : 0, on: !!d, price: d ? d.price : [] }; });
  APP.imp = { label, kind, url, sheets }; renderCat();
  const n = sheets.filter(x => x.on).length;
  toast(n ? 'อ่านไฟล์แล้ว — พบตารางวัสดุ ' + n + ' แท็บ · ตรวจคอลัมน์แล้วกด “นำเข้า”' : 'ไม่พบหัวตาราง (รายการ / จำนวน / หน่วย) — เลือกคอลัมน์เองด้านล่าง', 4200);
}
async function importFile(f) {
  if (!f) return; if (f.size > 15 * 1024 * 1024) { toast('ไฟล์ใหญ่เกิน 15 MB'); return; }
  try { toast('กำลังอ่านไฟล์…', 1500); await readWorkbook(new Uint8Array(await f.arrayBuffer()), f.name, 'file', ''); } catch (e) { toast('อ่านไฟล์ไม่ได้: ' + ((e && e.message) || e), 4200); }
}
async function importSheetUrl(url) {
  url = String(url || '').trim(); if (!url) return;
  if (!/docs\.google\.com\/spreadsheets\//.test(url)) { toast('ลิงก์ต้องเป็น Google Sheet (docs.google.com/spreadsheets/…)', 3600); return; }
  try { toast('กำลังดึง Google Sheet…', 2000); const r = await fetch('/api/sheet?url=' + encodeURIComponent(url));
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || ('HTTP ' + r.status)); }
    await readWorkbook(new Uint8Array(await r.arrayBuffer()), 'Google Sheet', 'gsheet', url);
  } catch (e) { toast('ดึงชีตไม่ได้: ' + ((e && e.message) || e), 4800); }
}
async function commitImport() {
  const im = APP.imp; if (!im) return; const srcId = hashId(im.kind + '|' + (im.url || im.label));
  let items = [];
  im.sheets.filter(x => x.on && x.map.name >= 0).forEach(x => { items = items.concat(parseSheet(x.aoa, x.map, x.start, x.n)); });
  if (!items.length) { toast('ยังไม่มีรายการให้นำเข้า — เลือกแท็บ / คอลัมน์ “รายการ” ก่อน'); return; }
  const seen = {}; items = items.map(it => { const base = hashId(srcId + '|' + it.cat + '|' + norm(it.name) + '|' + norm(it.spec) + '|' + norm(it.code) + '|' + norm(it.area)); seen[base] = (seen[base] || 0) + 1;
    return { id: seen[base] > 1 ? base + '_' + seen[base] : base, src: srcId, ...it }; });
  const name = prompt('ตั้งชื่อรายการนี้ (แสดงให้หน้างานเห็น)', im.kind === 'gsheet' ? 'Material Log' : String(im.label).replace(/\.(xlsx|xls|csv)$/i, ''));
  if (name === null) return;
  try { await saveCat(APP.pid, v => { v.sources = (v.sources || []).filter(s0 => s0.id !== srcId); v.items = (v.items || []).filter(i => i.src !== srcId).concat(items);
      v.sources.push({ id: srcId, name: name.trim() || im.label, kind: im.kind, url: im.url || '', file: im.kind === 'file' ? im.label : '', count: items.length, tabs: [...new Set(items.map(i => i.cat))], at: Date.now(), by: APP.me.name }); });
    APP.imp = null; renderCat(); toast('นำเข้า ' + items.length + ' รายการแล้ว — หน้างานเลือกจากรายการนี้ได้ทันที', 3600);
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 4200); }
}
// ----- ปริมาณ: Material Log เทียบที่ขอไปแล้ว -----
const COUNTED = ['sent', 'approved', 'ordered', 'received'];
function usedOf(catId, exceptId) { let n = 0; myPrs().forEach(pr => { if (pr.id === exceptId || !COUNTED.includes(pr.status)) return; (pr.items || []).forEach(i => { if (i.catId === catId) n += parseFloat(i.qty) || 0; }); }); return n; }
const catItem = (id) => (APP.cat.items || []).find(i => i.id === id);
function boqInfo(it, prId) { if (!it.catId) return null; const c = catItem(it.catId); if (!c || c.qty == null) return null;
  const used = usedOf(it.catId, prId), left = c.qty - used, want = parseFloat(it.qty) || 0; return { boq: c.qty, used, left, over: Math.max(0, want - left), unit: c.unit || it.unit }; }
function overList(pr) { return (pr.items || []).map((it, i) => ({ it, i, b: boqInfo(it, pr.id) })).filter(x => x.b && x.b.over > 0); }
const fmtN = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US');
const catLabel = (c) => c.name + (c.spec ? ' · ' + c.spec : '');
function addFromCat(ids) {
  const pr = APP.pr; let n = 0;
  ids.forEach(id => { const c = catItem(id); if (!c) return; if (pr.items.some(i => i.catId === id)) return;
    const left = c.qty != null ? c.qty - usedOf(id, pr.id) : null;
    pr.items.push({ name: catLabel(c).slice(0, 200), qty: String(left != null && left > 0 && left < 1 ? left : 1), unit: c.unit || 'ชุด', code: '', mat: '', catId: id, ref: c.code || '', need: defNeed(),
      remark: [c.area || pr.area || '', c.code ? 'อ้างอิง ' + c.code : ''].filter(Boolean).join(' · ') }); n++; });
  return n;
}
// ----- หน้าจอ: รายการวัสดุโครงการ (ดู · นำเข้า · เลือกใส่ใบ PR) -----
function renderCat() {
  const C = APP.cat || { sources: [], items: [] }, pick = APP.catPick, h = [];
  $('catTitle').textContent = pick ? 'เลือกของจากรายการวัสดุ' : 'รายการวัสดุโครงการ';
  $('catFoot').hidden = !pick; if (pick) $('btnCatAdd').textContent = pick.size ? '✓ เพิ่ม ' + pick.size + ' รายการเข้าใบ PR' : 'แตะ ＋ เพื่อเลือกของ';
  $('btnCatAdd').disabled = !pick || !pick.size;
  if (canCfg() && !pick) {
    h.push(`<div class="card"><div class="h"><span class="n">📥</span>นำเข้า Material Log / ใบเสนอราคา <small>QS · PM · จัดซื้อ</small></div>
      <div class="b2"><label class="btn dk" style="cursor:pointer">📄 อัปโหลด Excel / CSV<input type="file" id="catFile" accept=".xlsx,.xls,.csv" hidden></label><button class="btn" data-c="url">🔗 วางลิงก์ Google Sheet</button></div>
      <span class="s">ระบบหาหัวตาราง (รายการ · จำนวน · หน่วย · รหัส · พื้นที่) ให้เอง · <b>ไม่อ่านคอลัมน์ราคา / มูลค่า</b> · Google Sheet ต้องแชร์ “ทุกคนที่มีลิงก์ดูได้”</span></div>`);
    if (APP.imp) h.push(impHtml(APP.imp));
    if ((C.sources || []).length) h.push('<div class="card"><div class="h">แหล่งข้อมูลที่นำเข้าแล้ว</div>' + C.sources.map(s0 => `<div class="src"><span><b>${s0.kind === 'gsheet' ? '🔗' : '📄'} ${esc(s0.name)}</b><small>${s0.count} รายการ · ${esc((s0.tabs || []).slice(0, 6).join(', '))}${(s0.tabs || []).length > 6 ? ' …' : ''} · ${esc(when2(s0.at))} · ${esc(s0.by || '')}</small></span>
      ${s0.kind === 'gsheet' ? `<button class="btn sm" data-c="refresh" data-id="${esc(s0.id)}">↻ ดึงใหม่</button>` : ''}<button class="btn sm" data-c="del" data-id="${esc(s0.id)}" style="color:#B4442E">🗑</button></div>`).join('') + '</div>');
  }
  const items = C.items || [];
  if (!items.length) { h.push(`<div class="card" style="align-items:center;text-align:center;padding:24px 16px"><div style="font-size:38px">📚</div><b>ยังไม่มีรายการวัสดุของโครงการนี้</b><span class="s">${canCfg() ? 'นำเข้า Material Log หรือใบเสนอราคาด้านบน' : 'ให้ QS / PM / จัดซื้อ นำเข้า Material Log หรือใบเสนอราคาก่อน'}</span></div>`); $('catBody').innerHTML = h.join(''); return; }
  const tabs = [...new Set(items.map(i => i.cat))], tab = tabs.includes(APP.catTab) ? APP.catTab : '', q = norm(APP.catQ);
  const L = items.filter(i => (!tab || i.cat === tab) && (!q || norm(i.name + ' ' + i.spec + ' ' + i.code + ' ' + i.area).includes(q)));
  h.push(`<div class="search"><input id="catQ" value="${esc(APP.catQ)}" placeholder="ค้นหา ชื่อ · ยี่ห้อ · รหัส · พื้นที่" autocomplete="off"></div>`);
  h.push('<div class="chips"><button class="chip' + (!tab ? ' on' : '') + '" data-tab="">ทั้งหมด <small>' + items.length + '</small></button>' + tabs.map(t => `<button class="chip${t === tab ? ' on' : ''}" data-tab="${esc(t)}">${esc(t)} <small>${items.filter(i => i.cat === t).length}</small></button>`).join('') + '</div>');
  h.push('<div class="cl">' + (L.length ? L.slice(0, 300).map(c => { const used = usedOf(c.id, pick ? APP.pr.id : ''), left = c.qty != null ? c.qty - used : null, on = pick && pick.has(c.id), inPr = pick && APP.pr.items.some(i => i.catId === c.id);
    return `<div class="ci${on ? ' on' : ''}"><span class="t"><b>${esc(c.name)}</b>${c.spec ? `<small>${esc(c.spec)}</small>` : ''}<small>${esc([c.cat, c.area, c.code].filter(Boolean).join(' · '))}</small></span>
      <span class="q">${c.qty != null ? `<b>${fmtN(c.qty)} ${esc(c.unit || '')}</b><small class="${left != null && left <= 0 ? 'bad' : ''}">${used ? 'ขอแล้ว ' + fmtN(used) + ' · ' : ''}เหลือ ${fmtN(left)}</small>` : `<small>${esc(c.unit || '')}</small>`}</span>
      ${pick ? (inPr ? '<span class="tagin">อยู่ในใบแล้ว</span>' : `<button class="pk" data-pk="${esc(c.id)}">${on ? '✓' : '＋'}</button>`) : ''}</div>`; }).join('') + (L.length > 300 ? '<p class="empty">แสดง 300 รายการแรก — พิมพ์ค้นหาเพื่อหาเพิ่ม</p>' : '') : '<p class="empty">ไม่พบรายการ</p>') + '</div>');
  $('catBody').innerHTML = h.join('');
  const f = $('catFile'); if (f) f.onchange = (e) => { importFile(e.target.files[0]); e.target.value = ''; };
}
function impHtml(im) {
  return `<div class="card imp"><div class="h"><span class="n">✓</span>ตรวจก่อนนำเข้า — ${esc(im.label)} <small>เลือกแท็บ · ตรวจคอลัมน์ · ดูตัวอย่าง</small></div>` + im.sheets.map((x, si) => {
    const cols = (x.aoa[x.start] || []).map((c, i) => ({ i, t: String(c == null ? '' : c).replace(/\s+/g, ' ').trim() || ('คอลัมน์ ' + (i + 1)) }));
    const sample = x.map.name >= 0 ? parseSheet(x.aoa, x.map, x.start, x.n).slice(0, 4) : [];
    const total = x.map.name >= 0 ? parseSheet(x.aoa, x.map, x.start, x.n).length : 0;
    return `<div class="sh${x.on ? ' on' : ''}"><label class="chk"><input type="checkbox" data-si="${si}" data-k="on"${x.on ? ' checked' : ''}> <b>${esc(x.n)}</b> <small>${x.det ? 'พบหัวตารางแถว ' + (x.start + 1) : 'ไม่พบหัวตาราง'} · ${total} รายการ</small></label>
      ${x.on ? `<div class="mp">${MAP_KEYS.map(([k, l]) => `<label>${l}<select data-si="${si}" data-k="${k}"><option value="-1">— ไม่ใช้ —</option>${cols.filter(c => !x.price.includes(c.i)).map(c => `<option value="${c.i}"${x.map[k] === c.i ? ' selected' : ''}>${esc(c.t.slice(0, 40))}</option>`).join('')}</select></label>`).join('')}
        <label>แถวหัวตาราง<input type="number" min="1" data-si="${si}" data-k="start" value="${x.start + 1}"></label></div>
        ${x.price.length ? `<span class="s">🔒 ไม่อ่านคอลัมน์ราคา: ${esc(x.price.map(i => String((x.aoa[x.start] || [])[i] || '')).join(', '))}</span>` : ''}
        <div class="smp">${sample.map(it => `<div><b>${esc(it.name)}</b>${it.spec ? ` <small>${esc(it.spec)}</small>` : ''}<span>${it.qty != null ? fmtN(it.qty) : '—'} ${esc(it.unit)}${it.area ? ' · ' + esc(it.area) : ''}${it.code ? ' · ' + esc(it.code) : ''}</span></div>`).join('') || '<small>เลือกคอลัมน์ “รายการ” ก่อน</small>'}</div>` : ''}</div>`; }).join('')
    + `<div class="b2"><button class="btn ok" data-c="commit">✓ นำเข้า ${im.sheets.filter(x => x.on && x.map.name >= 0).reduce((n, x) => n + parseSheet(x.aoa, x.map, x.start, x.n).length, 0)} รายการ</button><button class="btn" data-c="cancel">ยกเลิก</button></div></div>`;
}
$('catBody').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-tab]'), pk = e.target.closest('[data-pk]'), c = e.target.closest('[data-c]');
  if (t) { APP.catTab = t.dataset.tab; renderCat(); return; }
  if (pk) { const id = pk.dataset.pk; APP.catPick.has(id) ? APP.catPick.delete(id) : APP.catPick.add(id); renderCat(); return; }
  if (!c) return; const a = c.dataset.c;
  if (a === 'url') { const u = prompt('วางลิงก์ Google Sheet (Material Log / ใบเสนอราคา)\nต้องแชร์ “ทุกคนที่มีลิงก์ดูได้”', ''); if (u) importSheetUrl(u); }
  else if (a === 'commit') commitImport();
  else if (a === 'cancel') { APP.imp = null; renderCat(); }
  else if (a === 'refresh') { const s0 = (APP.cat.sources || []).find(x => x.id === c.dataset.id); if (s0) importSheetUrl(s0.url); }
  else if (a === 'del') { const s0 = (APP.cat.sources || []).find(x => x.id === c.dataset.id); if (!s0 || !confirm('ลบรายการ “' + s0.name + '” (' + s0.count + ' รายการ)?\nใบ PR เดิมไม่เปลี่ยน')) return;
    try { await saveCat(APP.pid, v => { v.sources = (v.sources || []).filter(x => x.id !== s0.id); v.items = (v.items || []).filter(i => i.src !== s0.id); }); renderCat(); toast('ลบแล้ว'); } catch (x) { toast('ลบไม่สำเร็จ: ' + ((x && x.message) || x)); } }
});
$('catBody').addEventListener('change', (e) => {
  const si = e.target.dataset.si; if (si == null || !APP.imp) return; const x = APP.imp.sheets[+si], k = e.target.dataset.k;
  if (k === 'on') x.on = e.target.checked; else if (k === 'start') { x.start = Math.max(0, (parseInt(e.target.value, 10) || 1) - 1); const d = detectSheet(x.aoa.slice(x.start)); if (d && d.row === 0) { x.map = { ...d.map }; x.price = d.price; } }
  else x.map[k] = parseInt(e.target.value, 10);
  renderCat();
});
$('catBody').addEventListener('input', (e) => { if (e.target.id !== 'catQ') return; APP.catQ = e.target.value; clearTimeout(APP._cqT); APP._cqT = setTimeout(() => { const pos = e.target.selectionStart; renderCat(); const q = $('catQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} } }, 250); });
$('btnCatAdd').addEventListener('click', () => { const n = addFromCat([...APP.catPick]); APP.catPick = null; draftSave();
  if (APP.pushed > 0) history.back(); else show('edit', false);
  setTimeout(() => { renderEdit(); toast('เพิ่ม ' + n + ' รายการจาก Material Log แล้ว — ตรวจจำนวนอีกครั้ง', 3000); }, 60); });
function openCat(pickMode) { APP.catPick = pickMode ? new Set() : null; APP.catQ = ''; renderCat(); show('cat', true); }

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
    pm: pmOf(APP.proj), status: 'draft', at: Date.now(),
    deliverTo: projName(APP.proj), vendor: '', subName: '', note: '', buyType: 'Cost', system: 'Construction' };
}
let L = null;   // ผลการเรียนรู้ (คำนวณตอนเปิดหน้าแก้ไข)
function renderEdit() {
  const pr = APP.pr; L = learn();
  $('edTitle').textContent = pr.status && pr.status !== 'draft' ? 'แก้ไข ' + pr.no : 'ใบขอซื้อใหม่';
  $('btnSend').textContent = pr.status === 'sent' ? '✓ บันทึกการแก้ไข' : pr.status === 'returned' ? '↻ ส่งใหม่ให้ QS' : '✓ ส่ง PR'; $('btnDraft').hidden = pr.status === 'sent';
  // กรอกอัตโนมัติ (แตะเพื่อแก้)
  const F = [['proj', 'ชื่อโครงการ', pr.proj], ['date', 'วันที่', pr.date, 'date'], ['by', 'ผู้ขอซื้อ', pr.by], ['byTitle', 'ตำแหน่ง', pr.byTitle], ['pm', 'ผู้อนุมัติ (PM)', pr.pm], ['deliverTo', 'สถานที่ส่งของ', pr.deliverTo == null ? pr.proj : pr.deliverTo]];
  $('autoBox').innerHTML = F.map(([k, l, v, ty]) => `<label class="af"><small>${l} <span class="tag">อัตโนมัติ</span></small><input data-af="${k}" type="${ty || 'text'}" value="${esc(v || '')}"></label>`).join('');
  $('typeBox').innerHTML = TYPES.map(([k, l, e]) => `<button class="chip${pr.types.includes(k) ? ' on' : ''}" data-ty="${k}">${pr.types.includes(k) ? '✓ ' : ''}${l} <small>${e}</small></button>`).join('');
  const nc = (APP.cat.items || []).length; $('catBtn').innerHTML = nc ? `<button class="btn dk" data-catpick style="width:100%">📚 เลือกจากรายการวัสดุโครงการ (${nc} รายการ)</button>` : '';
  renderArea(); renderFav(); renderItems(); renderSug(); preview();
}
$('catBtn').addEventListener('click', (e) => { if (e.target.closest('[data-catpick]')) openCat(true); });
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
      ${(() => { const b = boqInfo(it, pr.id); return b ? `<div class="boq${b.over > 0 ? ' over' : ''}">📚 Material Log ${fmtN(b.boq)} ${esc(b.unit)} · ขอไปแล้ว ${fmtN(b.used)} · เหลือ ${fmtN(b.left)}${b.over > 0 ? ' — ⚠ เกิน ' + fmtN(b.over) + ' ' + esc(b.unit) + ' (QS จะเห็นคำเตือน)' : ''}</div>` : ''; })()}
      <input class="rm" data-f="remark" value="${esc(it.remark)}" placeholder="หมายเหตุ / ใช้กับงาน / พื้นที่">
      <details class="mg"${it.code || it.mat ? ' open' : ''}><summary>รหัส Mango ${it.code || it.mat ? '✓' : '(ไม่บังคับ — QS / จัดซื้อเติมได้)'}</summary><div class="r2">
        <label>รหัสต้นทุน<input data-f="code" value="${esc(it.code || '')}" placeholder="เช่น G150011" autocomplete="off"></label>
        <label>รหัสวัสดุ<input data-f="mat" value="${esc(it.mat || '')}" placeholder="เช่น P2103000100300" autocomplete="off"></label></div></details></div>`; }).join('');
}
function renderSug() {
  const q = norm($('q').value); const box = $('sug');
  if (!q) { box.innerHTML = ''; return; }
  const ch = (APP.cat.items || []).filter(c => norm(c.name + ' ' + c.spec + ' ' + c.code).includes(q) && !APP.pr.items.some(i => i.catId === c.id)).slice(0, 4);
  const hit = L.items.filter(i => norm(i.name).includes(q)).slice(0, ch.length ? 3 : 5);
  const exact = hit.some(i => norm(i.name) === q);
  box.innerHTML = ch.map(c => `<button data-cpick="${esc(c.id)}"><b>📚 ${esc(c.name)}</b><small>${esc([c.spec, c.cat, c.qty != null ? 'เหลือ ' + fmtN(c.qty - usedOf(c.id, APP.pr.id)) + ' ' + (c.unit || '') : ''].filter(Boolean).join(' · '))}</small><span style="color:var(--acc);font-weight:700">＋ เพิ่ม</span></button>`).join('') + hit.map(i => `<button data-pick="${esc(i.name)}"><b>${esc(i.name)}</b><small>${esc(i.unit || '')}</small><span style="color:var(--acc);font-weight:700">＋ เพิ่ม</span></button>`).join('')
    + (exact ? '' : `<button data-pick="${esc($('q').value.trim())}"><b>＋ เพิ่ม “${esc($('q').value.trim())}”</b><small>ของใหม่</small></button>`);
}
function addItem(name) {
  const n = String(name || '').trim(); if (!n) return;
  const pr = APP.pr; const ex = pr.items.find(i => norm(i.name) === norm(n));
  if (ex) { ex.qty = String((parseFloat(ex.qty) || 0) + 1); toast('มี “' + n + '” แล้ว — เพิ่มจำนวนเป็น ' + ex.qty); }
  else { const c = L.codesOf(n); pr.items.push({ name: n, qty: '1', unit: L.unitOf(n) || 'อัน', code: c.code, mat: c.mat, need: defNeed(), remark: pr.area || '' }); }
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
$('sug').addEventListener('click', (e) => { const cb = e.target.closest('[data-cpick]'); if (cb) { addFromCat([cb.dataset.cpick]); $('q').value = ''; renderSug(); renderFav(); renderItems(); preview(); draftSave(); return; } const b = e.target.closest('[data-pick]'); if (b) addItem(b.dataset.pick); });
$('q').addEventListener('input', renderSug);
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const f = document.querySelector('#sug [data-pick]'); if (f) addItem(f.dataset.pick); } });
$('items').addEventListener('click', (e) => {
  const row = e.target.closest('[data-i]'); if (!row) return; const i = +row.dataset.i, it = APP.pr.items[i];
  if (e.target.closest('[data-del]')) { if (!confirm('ลบ “' + (it.name || 'รายการนี้') + '”?')) return; APP.pr.items.splice(i, 1); renderItems(); renderFav(); preview(); draftSave(); return; }
  const q = e.target.closest('[data-q]'); if (q) { const v = Math.max(0, (parseFloat(it.qty) || 0) + Number(q.dataset.q)); it.qty = String(v); if (it.catId) renderItems(); else row.querySelector('[data-f="qty"]').value = it.qty; preview(); draftSave(); }
});
$('items').addEventListener('input', (e) => { const f = e.target.dataset.f; const row = e.target.closest('[data-i]'); if (!f || !row) return; APP.pr.items[+row.dataset.i][f] = e.target.value; preview(); draftSave(); });
$('items').addEventListener('change', (e) => { const f = e.target.dataset.f; const row = e.target.closest('[data-i]'); if (!f || !row) return; APP.pr.items[+row.dataset.i][f] = e.target.value; if (f === 'qty' && APP.pr.items[+row.dataset.i].catId) renderItems(); preview(); draftSave(); });
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
async function doSave(mode) {   // mode: 'draft' | 'send'
  const pr = APP.pr; pr.items = pr.items.filter(i => String(i.name || '').trim());
  const err = check(pr); if (err) { toast(err, 3200); renderItems(); return false; }
  const was = pr.status || 'draft';
  const ov = overList(pr); pr.overBoq = ov.length;
  if (mode === 'send' && ov.length && was !== 'sent' && !confirm('มี ' + ov.length + ' รายการ ขอเกินปริมาณใน Material Log:\n' + ov.map(x => '• ' + x.it.name.slice(0, 40) + ' เกิน ' + fmtN(x.b.over) + ' ' + x.b.unit).join('\n') + '\n\nส่งให้ QS ตัดสินใจ?')) return false;
  if (mode === 'send' && ['draft', 'returned'].includes(was)) { pr.status = 'sent'; pr.sentAt = Date.now(); pr.qsAt = 0; pr.qsBy = ''; pr.escQs = 0; logIt(pr, was === 'returned' ? '↻ แก้ไขแล้วส่งใหม่' : '📨 ส่ง PR'); }
  else if (mode === 'send' && was === 'sent') logIt(pr, '✎ QS แก้ไขรายการ');
  else pr.status = was;
  pr.upd = Date.now(); pr.updBy = APP.me.name;
  const b1 = $('btnSend'), b2 = $('btnDraft'); b1.disabled = b2.disabled = true;
  try { await savePr(pr); draftClear(); try { localStorage.setItem(lastTypesKey(), JSON.stringify(pr.types)); } catch (e) {} }
  catch (e) { pr.status = was; toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 4000); return false; }
  finally { b1.disabled = b2.disabled = false; }
  return { was };
}
$('btnDraft').addEventListener('click', async () => { if (await doSave('draft')) { toast('บันทึกร่างแล้ว'); history.back(); setTimeout(renderList, 50); } });
$('btnSend').addEventListener('click', async () => {
  const r = await doSave('send'); if (!r) return; const pr = APP.pr;
  if (pr.status === 'sent' && r.was !== 'sent') {
    await notify(pr, { title: '✍️ ขออนุมัติใบขอซื้อ ' + pr.no + ' · ' + pr.proj + ' (' + pr.items.length + ' รายการ)', note: 'โดย ' + pr.by + (minNeed(pr) ? ' · ต้องการของ ' + thDate(minNeed(pr)) : '') + (pr.overBoq ? ' · ⚠ ขอเกิน Material Log ' + pr.overBoq + ' รายการ' : ''),
      approve: qsOf(pr.pid), to: pmsOf(pr.pid), close: 'all', line: (r.was === 'returned' ? '↻ แก้ไขแล้วส่งใหม่' : '📨 ส่ง PR') + ' โดย ' + pr.by + ' → รอ QS อนุมัติ (' + names(qsOf(pr.pid)) + ')' });
    toast('ส่งแล้ว — แจ้ง QS ของโครงการแล้ว (' + names(qsOf(pr.pid)) + ')', 3200);
  } else toast('บันทึกการแก้ไขแล้ว');
  openView(true);
});
$('btnPv').addEventListener('click', () => { openView(); });

// =====================================================================
// ใบขอซื้อ (A4) — หน้าตาเหมือนฟอร์มกระดาษ
// =====================================================================
// ===== ใบขอซื้อ/ขอจ้าง — รูปแบบเดียวกับใบพิมพ์จาก Mango ERP (ส่งข้อมูลกลับเข้า Mango ได้ตรงช่อง) =====
const ceDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };   // Mango ใช้ ค.ศ. DD/MM/YYYY
const qty2 = (q) => { const n = parseFloat(q); return isNaN(n) ? String(q || '') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const projLabel = (pr) => { const p = APP.projects.find(x => x.id === pr.pid) || APP.proj; const c = projCode(p); return (pr.proj || projName(p)) + (c ? ' (' + c + ')' : ''); };
function mgNote(pr) {   // หมายเหตุหัวใบ: ประเภทงาน · ใช้กับงาน / พื้นที่ · หมายเหตุรายข้อที่ต่างจากพื้นที่หลัก
  const its = (pr.items || []).filter(i => String(i.name || '').trim());
  const ty = TYPES.filter(t => (pr.types || []).includes(t[0])).map(t => t[1]).join(', ');
  const per = its.map((i, n) => i.remark && norm(i.remark) !== norm(pr.area) ? 'ข้อ ' + (n + 1) + ': ' + i.remark : '').filter(Boolean).join(' · ');
  return [pr.note, ty, pr.area ? 'ใช้กับ: ' + pr.area : '', per].filter(Boolean).join(' · ');
}
function formHtml(pr) {
  const its = (pr.items || []).filter(i => String(i.name || '').trim());
  const qsOk = pr.qsAt && pr.status !== 'returned';
  const sig = (nm, role, dt) => `<div class="sg"><div class="sl"></div><div class="sn">${esc(nm || '')}</div><div class="sr">${role}</div><div class="sd">วันที่ <span>${esc(dt || '')}</span></div></div>`;
  return `<div class="pr mg-f">
    <div class="mh"><div class="lg"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><path d="M20 3 36 11v18L20 37 4 29V11z" fill="#3A3A3A"/><path d="M20 3 36 11 20 19 4 11z" fill="#6B6B6B"/><path d="M20 19v18L4 29V11z" fill="#262626"/></svg>
      <div><b>wellcon</b><small>Interior contractor &amp; furniture maker</small></div></div>
      <div class="co2"><div class="pg">Page 1/1</div><b>บริษัท เวลล์คอน อินทีเรีย จำกัด</b> (สำนักงานใหญ่)<br>36/38 โครงการเซนโทรพอร์ต ม.13 ต.บึงคำพร้อย<br>อ.ลำลูกกา จ.ปทุมธานี 12150 Tel : 02-1525430<br>Tax ID : 0105560007187 mail: service@wellcon.co.th</div></div>
    <div class="mt">ใบขอซื้อ/ขอจ้าง</div>
    <div class="mi"><div>
      <div><b>โครงการ / แผนก</b><span>: ${esc(projLabel(pr))}</span></div>
      <div><b>ผู้ขาย</b><span>: ${esc(pr.vendor || '')}</span></div>
      <div><b>ชื่อแทนผู้รับเหมา</b><span>: ${esc(pr.subName || '')}</span></div>
      <div><b>หมายเหตุ</b><span>: ${esc(mgNote(pr))}</span></div>
      <div><b>สถานที่ส่งของ</b><span>: ${esc(pr.deliverTo == null ? pr.proj : pr.deliverTo)}</span></div></div>
      <div class="r"><div><b>เลขที่</b><span>: ${esc(pr.mangoNo || pr.no)}</span></div><div><b>วันที่</b><span>: ${esc(ceDate(pr.date))}</span></div>
      <div><b>ประเภทการซื้อ</b><span>: ${esc(pr.buyType || 'Cost')}</span></div><div><b>ระบบงาน</b><span>: ${esc(pr.system || 'Construction')}</span></div>
      ${pr.mangoNo ? `<div><b>อ้างอิง</b><span>: ${esc(pr.no)}</span></div>` : ''}</div></div>
    <table class="mtb"><thead><tr><th style="width:44px">ลำดับ</th><th style="width:86px">รหัสต้นทุน</th><th style="width:130px">รหัสวัสดุ</th><th>รายการ</th><th style="width:74px">จำนวน</th><th style="width:62px">หน่วย</th><th style="width:86px">วันที่ส่งของ</th></tr></thead>
      <tbody>${its.map((it, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(it.code || '')}</td><td class="c">${esc(it.mat || '')}</td><td>${esc(it.name)}</td><td class="n">${esc(qty2(it.qty))}</td><td class="c">${esc(it.unit)}</td><td class="c">${esc(ceDate(it.need))}</td></tr>`).join('')}
      <tr class="fill" style="height:${Math.max(40, 560 - its.length * 27)}px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>
    <div class="msg">${sig(pr.by, 'ผู้ขอซื้อ', ceDate(pr.date))}${sig(pr.pm, 'ผู้จัดการโครงการ', '')}${sig(qsOk ? pr.qsBy : '', 'ผู้อนุมัติ', qsOk ? ceDate(isoOf(new Date(pr.qsAt))) : '')}</div>
    <div class="doc"><span>อ้างอิง Auto PR ${esc(pr.no)}</span><span>รูปแบบ Mango · ไม่มีราคา</span></div></div>`;
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
function actionsHtml(pr) {
  const S = pr.status || 'draft', out = [];
  const wait = (t, who) => `<div class="card act"><b>⏳ ${t}</b><span class="s">ผู้รับผิดชอบ: ${esc(who)} · ระบบแจ้งเตือนแล้ว</span></div>`;
  if (S === 'draft' || S === 'returned') { if (canEdit(pr)) out.push(`<div class="card act"><b>${S === 'returned' ? '↩ QS ส่งกลับให้แก้ไข' : '📝 ใบนี้ยังเป็นร่าง'}</b><span class="s">${S === 'returned' ? 'แก้ตามหมายเหตุของ QS แล้วกด “↻ ส่งใหม่ให้ QS”' : 'ตรวจรายการ แล้วกด “✓ ส่ง PR” เพื่อส่งให้ QS อนุมัติ'}</span>
    <div class="b"><button class="btn pri" data-a="edit">✎ แก้ไข / ส่ง PR</button><button class="btn sm" data-a="cancel">ยกเลิกใบนี้</button></div></div>`); }
  else if (S === 'sent') { const ov = overList(pr); if (ov.length) out.push(`<div class="card act" style="border-color:#EBC3B8;background:#FDF3F0"><b>⚠ ขอเกินปริมาณใน Material Log ${ov.length} รายการ</b>${ov.map(x => `<span class="s">${x.i + 1}. ${esc(x.it.name)} — ขอ ${fmtN(parseFloat(x.it.qty) || 0)} · เหลือ ${fmtN(x.b.left)} ${esc(x.b.unit)} (เกิน ${fmtN(x.b.over)})</span>`).join('')}</div>`);
    if (canApprove()) out.push(`<div class="card act" style="border-color:#E2CB92;background:#FFFBF0"><b>✍️ รอคุณอนุมัติ</b><span class="s">ตรวจรายการ · จำนวน · สเปก — ถ้าต้องแก้จำนวนเล็กน้อย กด ✎ แก้ไข ได้เลย</span>
    <div class="b"><button class="btn ok" data-a="approve">✓ อนุมัติ → ส่งจัดซื้อ</button><button class="btn" data-a="return">↩ ส่งกลับแก้ไข</button></div></div>`);
    else out.push(wait('รอ QS อนุมัติ', names(qsOf(pr.pid)))); }
  else if (S === 'approved') { if (canProc()) out.push(`<div class="card act" style="border-color:#B7CBE3;background:#F4F8FD"><b>🛒 รอคุณสั่งของ</b><span class="s">เปิด PR / PO ใน Mango แล้วใส่เลขที่ + วันที่คาดว่าของถึง</span>
    <div class="b" style="align-items:flex-end"><label class="fl">เลขที่ PR / PO ใน Mango<input id="aMango" placeholder="เช่น PR24100014" autocomplete="off"></label><label class="fl">ผู้ขาย<input id="aVendor" value="${esc(pr.vendor || '')}" placeholder="เช่น บจก. พิมพ์ อิเล็คทริค" autocomplete="off"></label><label class="fl">คาดว่าของถึงวันที่<input id="aEta" type="date" value="${esc(minNeed(pr))}"></label>
    <button class="btn ok" data-a="order">✓ สั่งของแล้ว</button><a class="btn sm" href="${MANGO_URL}" target="_blank" rel="noopener" style="background:#F28C28;color:#fff;border:0">เปิด Mango ↗</a></div></div>`);
    else out.push(wait('รอจัดซื้อสั่งของ', names(procOf(pr.pid)))); }
  else if (S === 'ordered') { if (canReceive(pr)) out.push(`<div class="card act" style="border-color:#CFC2EA;background:#F8F5FD"><b>📦 ของถึงหน้างานแล้วหรือยัง?</b><span class="s">ตรวจจำนวน / สภาพของ แล้วกดยืนยัน — ระบบแจ้งจัดซื้อและ QS ให้</span>
    <div class="b"><button class="btn ok" data-a="recv">✓ ได้รับของครบแล้ว</button><button class="btn" data-a="partial">⚠ ได้รับไม่ครบ / มีปัญหา</button></div></div>`);
    else out.push(wait('รอหน้างานยืนยันรับของ', pr.by || '—')); }
  else if (S === 'received') out.push(`<div class="card act" style="background:#EEF6EF;border-color:#B9D3C2"><b>✅ ปิดงานแล้ว — ได้รับของ ${esc(when2(pr.receivedAt))} · ${esc(pr.recvBy || '')}</b></div>`);
  else if (S === 'cancelled') out.push('<div class="card act"><b>ใบนี้ถูกยกเลิกแล้ว</b></div>');
  return out.join('');
}
function logHtml(pr) {
  const L = (pr.log || []).slice().reverse(); if (!L.length) return '';
  return '<div class="card"><div class="h">🕘 ประวัติ</div><div class="log">' + L.map(x => `<div><span>${esc(when2(x.at))}</span><b>${esc(x.act)}</b><small>${esc(x.by || '')}${x.note ? ' — ' + esc(x.note) : ''}</small></div>`).join('') + '</div></div>';
}
function renderView() {
  const pr = APP.pr; $('vwTitle').textContent = pr.no;
  $('vwTrack').innerHTML = `<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1;min-width:0">${esc(pr.proj)} · ${(pr.items || []).length} รายการ · โดย ${esc(pr.by || '—')}</b>${stTag(pr.status)}${ageBadge(pr)}</div>
    ${pr.status !== 'cancelled' ? tracker(pr) : ''}${pr.status === 'returned' && pr.qsNote ? `<div class="note"><b>QS (${esc(pr.qsBy || '')}):</b> ${esc(pr.qsNote)}</div>` : ''}
    ${pr.mangoNo || pr.eta ? `<div class="s">🛒 ${pr.mangoNo ? 'เลขที่ Mango <b>' + esc(pr.mangoNo) + '</b>' : ''}${pr.eta ? ' · คาดว่าของถึง <b>' + esc(thDate(pr.eta)) + '</b>' : ''}${pr.procBy ? ' · ' + esc(pr.procBy) : ''}</div>` : ''}</div>`;
  $('vwAct').innerHTML = actionsHtml(pr); $('vwLog').innerHTML = logHtml(pr);
  $('vwBtns').innerHTML = `<button class="btn sm" data-v="xls">⬇ Excel (คอลัมน์ Mango)</button><button class="btn sm" data-v="tsv">📋 คัดลอกตาราง (วางใน Mango / Excel)</button><button class="btn sm" data-v="copy">💬 ข้อความ LINE</button><a class="btn sm" href="${MANGO_URL}" target="_blank" rel="noopener" style="background:#F28C28;color:#fff;border:0">🛒 เปิด Mango ↗</a>`;
  $('btnEdit').hidden = !canEdit(pr);
  const b = $('pvMain'); b.innerHTML = formHtml(pr); requestAnimationFrame(() => fit(b));
}
function openView(fromSave) {
  if (fromSave && APP.screen === 'edit') { history.replaceState({ apr: 'view' }, ''); show('view', false); } else show('view', true);
  renderView();
}
const MG_COLS = ['ลำดับ', 'รหัสต้นทุน', 'รหัสวัสดุ', 'รายการ', 'จำนวน', 'หน่วย', 'วันที่ส่งของ'];
const mgRows = (pr) => (pr.items || []).filter(i => String(i.name || '').trim()).map((it, i) => [i + 1, it.code || '', it.mat || '', it.name, (parseFloat(it.qty) || 0).toFixed(2), it.unit || '', ceDate(it.need)]);
function mgCsv(pr) {   // 1 แถว / 1 รายการ · หัวใบซ้ำทุกแถว (นำเข้า / กรองใน Excel ง่าย) · UTF-8 BOM ให้ Excel อ่านภาษาไทยถูก
  const H = ['เลขที่', 'วันที่', 'โครงการ / แผนก', 'ผู้ขาย', 'ชื่อแทนผู้รับเหมา', 'สถานที่ส่งของ', 'ประเภทการซื้อ', 'ระบบงาน', 'หมายเหตุ', ...MG_COLS, 'ผู้ขอซื้อ', 'ผู้อนุมัติ (QS)', 'อ้างอิง Auto PR'];
  const head = [pr.mangoNo || '', ceDate(pr.date), projLabel(pr), pr.vendor || '', pr.subName || '', pr.deliverTo == null ? pr.proj : pr.deliverTo, pr.buyType || 'Cost', pr.system || 'Construction', mgNote(pr)];
  const q = (v) => { const t = String(v == null ? '' : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  return '﻿' + [H, ...mgRows(pr).map(r => [...head, ...r, pr.by || '', pr.qsAt && pr.status !== 'returned' ? pr.qsBy || '' : '', pr.no])].map(r => r.map(q).join(',')).join('\r\n');
}
$('vwBtns').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-v]'); if (!b) return; const pr = APP.pr, v = b.dataset.v;
  if (v === 'xls') { const blob = new Blob([mgCsv(pr)], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (pr.mangoNo || pr.no) + '-mango.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('ดาวน์โหลดแล้ว — เปิดด้วย Excel ได้เลย (คอลัมน์ตรงกับ Mango)'); return; }
  const t = v === 'tsv' ? mgRows(pr).map(r => r.join('\t')).join('\n') : textOf(pr);
  try { await navigator.clipboard.writeText(t); toast(v === 'tsv' ? 'คัดลอกตารางแล้ว — วางในตาราง Mango หรือ Excel ได้เลย (ลำดับ · รหัสต้นทุน · รหัสวัสดุ · รายการ · จำนวน · หน่วย · วันที่ส่งของ)' : 'คัดลอกแล้ว — วางใน LINE ได้เลย', 3600); }
  catch (x) { prompt('คัดลอกข้อความนี้', t); }
});
$('vwAct').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, pr = APP.pr;
  if (a === 'edit') { renderEdit(); history.replaceState({ apr: 'edit' }, ''); show('edit', false); return; }
  let note = '';
  if (a === 'approve' && !confirm('อนุมัติใบขอซื้อ ' + pr.no + ' แล้วส่งให้จัดซื้อ?')) return;
  if (a === 'return') { note = prompt('ส่งกลับให้แก้ไขอะไร? (ผู้ขอจะเห็นข้อความนี้)', ''); if (note === null) return; if (!note.trim()) { toast('ใส่เหตุผลที่ส่งกลับก่อน'); return; } }
  if (a === 'cancel' && !confirm('ยกเลิกใบขอซื้อ ' + pr.no + '?')) return;
  if (a === 'partial') { note = prompt('ได้รับไม่ครบ / มีปัญหาอะไร? เช่น เทป PU ได้ 6 จาก 10 ม้วน', ''); if (note === null) return; if (!note.trim()) { toast('ใส่รายละเอียดก่อน'); return; } }
  const mango = a === 'order' ? String(($('aMango') || {}).value || '').trim() : '', eta = a === 'order' ? String(($('aEta') || {}).value || '') : '', vendor = a === 'order' ? String(($('aVendor') || {}).value || '').trim() : '';
  if (a === 'order' && !mango && !confirm('ยังไม่ได้ใส่เลขที่ PR / PO ใน Mango — ยืนยัน “สั่งของแล้ว”?')) return;
  b.disabled = true; const me = APP.me.name;
  try {
    let cur;
    if (a === 'approve') { cur = await transition(pr.pid, pr.id, ['sent'], x => { x.status = 'approved'; x.qsAt = Date.now(); x.qsBy = me; x.qsEmail = APP.me.email; x.qsNote = ''; x.escProc = 0; logIt(x, '✓ QS อนุมัติ'); });
      await notify(cur, { title: '🛒 สั่งของ: ' + cur.no + ' · ' + cur.proj + ' — QS อนุมัติแล้ว', note: (cur.items || []).length + ' รายการ · ต้องการของ ' + thDate(minNeed(cur)), approve: procOf(cur.pid), to: [norm(cur.byEmail)], close: 'approve', line: '✅ QS อนุมัติ (' + me + ') → รอจัดซื้อสั่งของ (' + names(procOf(cur.pid)) + ')' });
      toast('อนุมัติแล้ว — แจ้งจัดซื้อแล้ว'); }
    else if (a === 'return') { cur = await transition(pr.pid, pr.id, ['sent'], x => { x.status = 'returned'; x.qsAt = Date.now(); x.qsBy = me; x.qsNote = note.trim(); logIt(x, '↩ QS ส่งกลับแก้ไข', note.trim()); });
      await notify(cur, { title: '↩ QS ส่งกลับแก้ไข ' + cur.no + ' · ' + cur.proj, note: note.trim(), to: [norm(cur.byEmail)], close: 'approve', line: '↩ QS ส่งกลับแก้ไข (' + me + '): ' + note.trim() });
      toast('ส่งกลับแล้ว — แจ้งผู้ขอแล้ว'); }
    else if (a === 'order') { cur = await transition(pr.pid, pr.id, ['approved'], x => { x.status = 'ordered'; x.orderedAt = Date.now(); x.procBy = me; x.procEmail = APP.me.email; x.mangoNo = mango; x.eta = eta; if (vendor) x.vendor = vendor; logIt(x, '🛒 สั่งของแล้ว', [mango && 'Mango ' + mango, eta && 'ของถึง ' + thDate(eta)].filter(Boolean).join(' · ')); });
      await notify(cur, { title: '🛒 สั่งของแล้ว ' + cur.no + (eta ? ' · คาดว่าของถึง ' + thDate(eta) : ''), note: mango ? 'เลขที่ Mango ' + mango : '', to: [norm(cur.byEmail), ...pmsOf(cur.pid)], close: 'approve', line: '🛒 สั่งของแล้ว (' + me + ')' + (mango ? ' · Mango ' + mango : '') + (eta ? ' · คาดว่าของถึง ' + thDate(eta) : '') });
      toast('บันทึกแล้ว — แจ้งหน้างานแล้ว'); }
    else if (a === 'recv') { cur = await transition(pr.pid, pr.id, ['ordered'], x => { x.status = 'received'; x.receivedAt = Date.now(); x.recvBy = me; logIt(x, '📦 ได้รับของครบแล้ว'); });
      await notify(cur, { title: '📦 ของถึงหน้างานแล้ว ' + cur.no + ' · ' + cur.proj, to: [norm(cur.procEmail), ...procOf(cur.pid), norm(cur.qsEmail)].filter(Boolean), close: 'all', line: '📦 ได้รับของครบแล้ว (' + me + ') — ปิดงาน' });
      toast('ปิดงานแล้ว — ขอบคุณครับ'); }
    else if (a === 'partial') { cur = await transition(pr.pid, pr.id, ['ordered'], x => { x.partial = Date.now(); logIt(x, '⚠ ได้รับไม่ครบ / มีปัญหา', note.trim()); });
      await notify(cur, { title: '⚠ ของมาไม่ครบ ' + cur.no + ' · ' + cur.proj, note: note.trim(), approve: [norm(cur.procEmail) || procOf(cur.pid)[0]].filter(Boolean), to: procOf(cur.pid), line: '⚠ ได้รับไม่ครบ (' + me + '): ' + note.trim() });
      toast('แจ้งจัดซื้อแล้ว'); }
    else if (a === 'cancel') { cur = await transition(pr.pid, pr.id, ['draft', 'returned', 'sent'], x => { x.status = 'cancelled'; logIt(x, 'ยกเลิก'); });
      if (pr.status === 'sent' || pr.status === 'returned') await notify(cur, { title: 'ยกเลิกใบขอซื้อ ' + cur.no, to: qsOf(cur.pid), close: 'all', line: 'ยกเลิกใบขอซื้อ (' + me + ')' });
      toast('ยกเลิกแล้ว'); }
    if (cur) { APP.pr = JSON.parse(JSON.stringify(cur)); renderView(); }
  } catch (x) { toast((x && x.message) || String(x), 3800); const f = myPrs().find(y => y.id === pr.id); if (f) { APP.pr = JSON.parse(JSON.stringify(f)); renderView(); } }
  finally { b.disabled = false; }
});
$('btnEdit').addEventListener('click', () => { renderEdit(); if (APP.screen === 'view') { history.replaceState({ apr: 'edit' }, ''); show('edit', false); } });
$('btnPrint').addEventListener('click', () => { $('printArea').innerHTML = formHtml(APP.pr); setTimeout(() => window.print(), 50); });

// คืนร่างที่ค้างในเครื่อง (ถ้าเคยกดออกโดยไม่บันทึก)
const _open = openProject;
openProject = async function (pid) { await _open(pid);
  const q = new URLSearchParams(location.search).get('pr'); if (q) { const f = myPrs().find(x => x.id === q); if (f) { APP.pr = JSON.parse(JSON.stringify(f)); openView(); return; } }
  let d = null; try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) {}
  if (d && d.pid === pid && (d.items || []).length && !myPrs().some(x => x.id === d.id && x.upd >= (d.upd || 0)) && confirm('มีใบขอซื้อที่ยังไม่ได้บันทึก (' + d.items.length + ' รายการ) — เปิดทำต่อไหม?')) { APP.pr = d; renderEdit(); show('edit', true); }
  else if (d) draftClear(); };

if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__apr = { APP, show, renderList, renderEdit, renderCat, openCat, readWorkbook, commitImport, detectSheet, parseSheet, cleanName, overList, addFromCat, openView, renderView, renderProjects, formHtml, learn, newPr, addItem, defNeed, textOf, inboxOf, tracker, escalate: () => escalate() };
boot();
})();
