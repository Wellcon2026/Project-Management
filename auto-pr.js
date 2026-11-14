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
const APR_VER = 'v1.1.0';   // 1.1.0: ขั้นตอนอนุมัติ QS → จัดซื้อ → รับของ · ติดตามสถานะ · งานที่รอคุณ · แจ้งเตือนแท็ก + LINE · SLA 24 ชม.
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

const APP = { acc: null, me: null, accounts: [], projects: [], pid: '', proj: null, all: {}, cfg: {}, rooms: [], pr: null, screen: 'msg', pushed: 0, filt: 'all' };
const SCR = ['msg', 'proj', 'list', 'edit', 'view'];
function show(s, push) {
  SCR.forEach(k => { $('scr' + k[0].toUpperCase() + k.slice(1)).hidden = k !== s; });
  if (push) { history.pushState({ apr: s }, ''); APP.pushed++; }
  APP.screen = s;
}
window.addEventListener('popstate', (e) => {
  const s = (e.state && e.state.apr) || (APP.pid ? 'list' : (APP.acc ? 'proj' : 'msg'));
  if (APP.pushed > 0) APP.pushed--;
  show(s, false); if (s === 'list') renderList(); if (s === 'edit') renderEdit(); if (s === 'proj') renderProjects();
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
  const sub = [projName(APP.proj), projCode(APP.proj)].filter(Boolean).join(' · ');
  $('listProj').textContent = sub; $('edProj').textContent = sub;
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
  if (e.target.closest('[data-cfg]')) { editCfg(); return; }
  if (ib) { openPr(ib.dataset.opid, ib.dataset.open); return; }
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
  $('edTitle').textContent = pr.status && pr.status !== 'draft' ? 'แก้ไข ' + pr.no : 'ใบขอซื้อใหม่';
  $('btnSend').textContent = pr.status === 'sent' ? '✓ บันทึกการแก้ไข' : pr.status === 'returned' ? '↻ ส่งใหม่ให้ QS' : '✓ ส่ง PR'; $('btnDraft').hidden = pr.status === 'sent';
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
async function doSave(mode) {   // mode: 'draft' | 'send'
  const pr = APP.pr; pr.items = pr.items.filter(i => String(i.name || '').trim());
  const err = check(pr); if (err) { toast(err, 3200); renderItems(); return false; }
  const was = pr.status || 'draft';
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
    await notify(pr, { title: '✍️ ขออนุมัติใบขอซื้อ ' + pr.no + ' · ' + pr.proj + ' (' + pr.items.length + ' รายการ)', note: 'โดย ' + pr.by + (minNeed(pr) ? ' · ต้องการของ ' + thDate(minNeed(pr)) : ''),
      approve: qsOf(pr.pid), to: pmsOf(pr.pid), close: 'all', line: (r.was === 'returned' ? '↻ แก้ไขแล้วส่งใหม่' : '📨 ส่ง PR') + ' โดย ' + pr.by + ' → รอ QS อนุมัติ (' + names(qsOf(pr.pid)) + ')' });
    toast('ส่งแล้ว — แจ้ง QS ของโครงการแล้ว (' + names(qsOf(pr.pid)) + ')', 3200);
  } else toast('บันทึกการแก้ไขแล้ว');
  openView(true);
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
      <div style="flex-direction:column;align-items:stretch;gap:10px;margin:0"><div><b>ผู้ตรวจสอบ :</b><span class="ul">${esc(pr.qsAt && pr.status !== 'returned' ? pr.qsBy || '' : '')}</span></div><div><b>ตำแหน่ง :</b><span class="ul" style="color:#111">ฝ่าย QS ประเมินราคา</span></div><div><b>วันที่ :</b><span class="ul">${esc(pr.qsAt && pr.status !== 'returned' ? thDate(isoOf(new Date(pr.qsAt))) : '')}</span></div></div>
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
function actionsHtml(pr) {
  const S = pr.status || 'draft', out = [];
  const wait = (t, who) => `<div class="card act"><b>⏳ ${t}</b><span class="s">ผู้รับผิดชอบ: ${esc(who)} · ระบบแจ้งเตือนแล้ว</span></div>`;
  if (S === 'draft' || S === 'returned') { if (canEdit(pr)) out.push(`<div class="card act"><b>${S === 'returned' ? '↩ QS ส่งกลับให้แก้ไข' : '📝 ใบนี้ยังเป็นร่าง'}</b><span class="s">${S === 'returned' ? 'แก้ตามหมายเหตุของ QS แล้วกด “↻ ส่งใหม่ให้ QS”' : 'ตรวจรายการ แล้วกด “✓ ส่ง PR” เพื่อส่งให้ QS อนุมัติ'}</span>
    <div class="b"><button class="btn pri" data-a="edit">✎ แก้ไข / ส่ง PR</button><button class="btn sm" data-a="cancel">ยกเลิกใบนี้</button></div></div>`); }
  else if (S === 'sent') { if (canApprove()) out.push(`<div class="card act" style="border-color:#E2CB92;background:#FFFBF0"><b>✍️ รอคุณอนุมัติ</b><span class="s">ตรวจรายการ · จำนวน · สเปก — ถ้าต้องแก้จำนวนเล็กน้อย กด ✎ แก้ไข ได้เลย</span>
    <div class="b"><button class="btn ok" data-a="approve">✓ อนุมัติ → ส่งจัดซื้อ</button><button class="btn" data-a="return">↩ ส่งกลับแก้ไข</button></div></div>`);
    else out.push(wait('รอ QS อนุมัติ', names(qsOf(pr.pid)))); }
  else if (S === 'approved') { if (canProc()) out.push(`<div class="card act" style="border-color:#B7CBE3;background:#F4F8FD"><b>🛒 รอคุณสั่งของ</b><span class="s">เปิด PR / PO ใน Mango แล้วใส่เลขที่ + วันที่คาดว่าของถึง</span>
    <div class="b" style="align-items:flex-end"><label class="fl">เลขที่ PR / PO ใน Mango<input id="aMango" placeholder="เช่น PR6911-0123" autocomplete="off"></label><label class="fl">คาดว่าของถึงวันที่<input id="aEta" type="date" value="${esc(minNeed(pr))}"></label>
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
  $('vwBtns').innerHTML = `<button class="btn sm" data-v="copy">📋 คัดลอกข้อความ (LINE / Mango)</button><a class="btn sm" href="${MANGO_URL}" target="_blank" rel="noopener" style="background:#F28C28;color:#fff;border:0">🛒 เปิด Mango ↗</a>`;
  $('btnEdit').hidden = !canEdit(pr);
  const b = $('pvMain'); b.innerHTML = formHtml(pr); requestAnimationFrame(() => fit(b));
}
function openView(fromSave) {
  if (fromSave && APP.screen === 'edit') { history.replaceState({ apr: 'view' }, ''); show('view', false); } else show('view', true);
  renderView();
}
$('vwBtns').addEventListener('click', async (e) => { const b = e.target.closest('[data-v="copy"]'); if (!b) return;
  const t = textOf(APP.pr); try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว — วางใน LINE หรือช่องรายละเอียดใน Mango ได้เลย'); }
  catch (x) { prompt('คัดลอกข้อความนี้', t); } });
$('vwAct').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, pr = APP.pr;
  if (a === 'edit') { renderEdit(); history.replaceState({ apr: 'edit' }, ''); show('edit', false); return; }
  let note = '';
  if (a === 'approve' && !confirm('อนุมัติใบขอซื้อ ' + pr.no + ' แล้วส่งให้จัดซื้อ?')) return;
  if (a === 'return') { note = prompt('ส่งกลับให้แก้ไขอะไร? (ผู้ขอจะเห็นข้อความนี้)', ''); if (note === null) return; if (!note.trim()) { toast('ใส่เหตุผลที่ส่งกลับก่อน'); return; } }
  if (a === 'cancel' && !confirm('ยกเลิกใบขอซื้อ ' + pr.no + '?')) return;
  if (a === 'partial') { note = prompt('ได้รับไม่ครบ / มีปัญหาอะไร? เช่น เทป PU ได้ 6 จาก 10 ม้วน', ''); if (note === null) return; if (!note.trim()) { toast('ใส่รายละเอียดก่อน'); return; } }
  const mango = a === 'order' ? String(($('aMango') || {}).value || '').trim() : '', eta = a === 'order' ? String(($('aEta') || {}).value || '') : '';
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
    else if (a === 'order') { cur = await transition(pr.pid, pr.id, ['approved'], x => { x.status = 'ordered'; x.orderedAt = Date.now(); x.procBy = me; x.procEmail = APP.me.email; x.mangoNo = mango; x.eta = eta; logIt(x, '🛒 สั่งของแล้ว', [mango && 'Mango ' + mango, eta && 'ของถึง ' + thDate(eta)].filter(Boolean).join(' · ')); });
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

if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__apr = { APP, show, renderList, renderEdit, openView, renderView, renderProjects, formHtml, learn, newPr, addItem, defNeed, textOf, inboxOf, tracker, escalate: () => escalate() };
boot();
})();
