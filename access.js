/* =====================================================================
   Wellcon PM — สิทธิ์ตามตำแหน่ง (หน้าตั้งค่าแบบตาราง เหมือนไฟล์ Excel "Feature by Position")
   ---------------------------------------------------------------------
   • หน้าแยก เปิดจาก ตั้งค่าระบบ → การ์ดหน้าแรก & ฟังก์ชัน → ปุ่ม "ตารางสิทธิ์ตามตำแหน่ง"   access.html (+ ?env=staging)
   • เข้าได้: Super Admin · ผู้มีสิทธิ์ "จัดการผู้ใช้" ระดับแก้ไข (กติกาเดียวกับ _cardAdminOk ของแอปหลัก)
   • ใช้ข้อมูลชุดเดียวกับแอปหลัก — แก้ที่นี่ = แก้ในระบบทันที (อ่านล่าสุด-รวม-เขียน ทีละหัวข้อ ไม่ทับคนอื่น):
       app_state 'workPages'   { roleKey: [การ์ด] }          ← ช่อง ✓ ของแต่ละตำแหน่ง (การ์ดหน้าแรก + สิทธิ์เข้าหน้าในโครงการ)
       app_state 'featGlobal'  { 'tab:<k>': false }         ← สวิตช์ "เปิดใช้" (ปิดกับทุกคน รวม Super Admin)
       app_state 'featRole'    { roleKey: { money: bool } } ← สิทธิ์ดูตัวเลขเงินโครงการ (ต้องมีจึงเห็นการ์ดการเงิน / VO Tracker)
       app_state 'workUserAdd' { email: [การ์ด] }           ← สิทธิ์พิเศษรายคน (เพิ่มจากชุดของตำแหน่ง)
       app_state 'workUser'    { email: [การ์ด] }           ← การ์ดรายคนแบบเดิม (แทนชุดของตำแหน่ง) — ที่นี่ทำได้แค่ "กลับไปใช้ชุดตามตำแหน่ง"
   • Excel: ดาวน์โหลด = ตารางปัจจุบันรูปแบบเดียวกับไฟล์ที่ผู้บริหารอนุมัติ 17/11/2026 · นำเข้า = อ่านชีต "ตำแหน่ง × ฟีเจอร์" → แสดงสิ่งที่จะเปลี่ยน → ยืนยัน → บันทึก
   ===================================================================== */
(() => {
'use strict';
const AC_VER = 'v1.2.0';
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h))) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const rowOf = (r) => ({ ...(r.data || {}), id: r.id });
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2400); }

// ---------- ฟีเจอร์ (ชื่อตรงกับไฟล์ Excel — ใช้จับคู่ตอนนำเข้า) ----------
const MAT = ['tab:mat', 'tab:procm'];   // Material Log = คู่ mat / procm เหมือนแอปหลัก
const FEATS = [
  { sec: 'proj', name: 'แผนงาน · ความคืบหน้า', use: 'แผนงาน Gantt · % ความคืบหน้า', keys: ['tab:plan'] },
  { sec: 'proj', name: 'รายงานประจำวัน (Site)', use: 'บันทึกงาน · คน · OT · รูปหน้างาน', keys: ['tab:daily'] },
  { sec: 'proj', name: 'Site Work · Defect / Survey', use: 'ปักหมุด Defect บนแบบ · Survey · Scope', keys: ['tab:qc'] },
  { sec: 'proj', name: 'ใบขอซื้อ · ใบขอจ้าง', use: 'ขอซื้อ / ขอจ้าง → PM + QS อนุมัติ', keys: ['tab:apr'] },
  { sec: 'proj', name: 'RFI / RFA', use: 'ถามแบบ · ขออนุมัติ', keys: ['tab:rfi'] },
  { sec: 'proj', name: 'แบบก่อสร้าง (Drawing Log)', use: 'ทะเบียนแบบ · revision ล่าสุด', keys: ['tab:dwg'] },
  { sec: 'proj', name: 'Material Log', use: 'วัสดุขออนุมัติ · ตัวอย่าง · จัดซื้อ', keys: MAT },
  { sec: 'proj', name: 'งานผลิตโรงงาน (FF&E)', use: 'ติดตามงานผลิต · mock-up', keys: ['tab:prod'] },
  { sec: 'proj', name: 'Takeoff · วัดหน้างาน', use: 'วัดบนแบบ / หน้างาน → ส่ง QS', keys: ['tab:qm'] },
  { sec: 'proj', name: 'Claim · เคลมความเสียหาย', use: 'งานเสียหายจากผู้อื่น → เคลม', keys: ['tab:claim'] },
  { sec: 'proj', name: 'ทะเบียนรับ-ส่งเอกสาร', use: 'ทะเบียนเอกสารเข้า-ออก', keys: ['tab:docs'] },
  { sec: 'proj', name: 'งานเพิ่ม · VO Tracker (QS)', use: 'ติดตามมูลค่างานเพิ่ม-ลด', keys: ['tab:aw'], money: true },
  { sec: 'proj', name: 'Quotation Maker', use: 'ใบเสนอราคาด่วน · AI อ่านแบบ', keys: ['tab:quo'], money: true },
  { sec: 'proj', name: 'SketchUp Design (3D)', use: 'โมเดล 3D', keys: ['tab:skp'] },
  { sec: 'proj', name: 'Layboard · บอร์ดนำเสนองาน', use: 'Mood / Material board', keys: ['tab:lay'] },
  { sec: 'proj', name: 'การเงิน · งวดเบิกเงิน', use: 'งวดเบิก · วางบิล · รับเงิน', keys: ['tab:fin'], money: true },
  { sec: 'proj', name: 'VO / SI / EOT · งานเพิ่ม-ลด', use: 'ออก VO · SI · ขอขยายเวลา', keys: ['tab:changes'] },
  { sec: 'proj', name: 'แจ้งล่าช้า · Early Warning', use: 'แจ้งเหตุล่าช้าล่วงหน้า', keys: ['tab:delay'] },
  { sec: 'proj', name: 'ส่งมอบงาน · Handover', use: 'ตรวจรับ · ส่งมอบ', keys: ['tab:handover'] },
  { sec: 'proj', name: 'ปฏิทิน · วันสำคัญ', use: 'วันสำคัญของโครงการ', keys: ['tab:cal'] },
  { sec: 'proj', name: 'สัญญาช่าง · จ่ายงวดช่าง', use: 'สัญญาผู้รับเหมาช่วง · งวดจ่าย', keys: ['tab:subcon'], money: true },
  { sec: 'proj', name: 'Mango ERP · PR / PO', use: 'ลิงก์ระบบ ERP', keys: ['tab:mango'] },
  { sec: 'proj', name: 'ของสั่งทำ · ของนำเข้า', use: 'ของสั่งทำ · นำเข้า · ส่งของ', keys: ['tab:spo'] },
  { sec: 'proj', name: 'ออกหนังสือ / ฟอร์ม', use: 'ออกหนังสือ · แบบฟอร์มบริษัท', keys: ['tab:memo'] },
  { sec: 'proj', name: 'PDF Maker · แก้ไขเอกสาร', use: 'อ่าน · แทรกหน้า · รวมไฟล์ · ลายเซ็น · กรอกฟอร์ม (ไม่ต้องเลือกโครงการ)', keys: ['tab:pdf'] },
  { sec: 'proj', name: 'Photo Editor · แต่งรูปผลงาน', use: 'ครอป · หมุน · ดัดเส้นตรง · เอฟเฟกต์ (ไม่ต้องเลือกโครงการ)', keys: ['tab:photo'] },
  { sec: 'nav', name: 'Design Home', use: 'ภาพรวมงานออกแบบ', keys: ['dhome'] },
  { sec: 'nav', name: 'Home · ภาพรวมทุกโครงการ', use: 'Dashboard ผู้บริหาร', keys: ['nav:dashboard'] },
  { sec: 'nav', name: 'QS Tracking', use: 'งานประมูล · VO รายโครงการ', keys: ['nav:qstrack'] },
  { sec: 'nav', name: 'การเงินรวมบริษัท', use: 'ภาพรวมการเงินทุกโครงการ (CFO)', keys: ['nav:cfo'] },
  { sec: 'nav', name: 'จัดซื้อรวม', use: 'จัดซื้อทุกโครงการ', keys: ['nav:procurement'] },
  { sec: 'nav', name: 'ขอบเขตงาน · JD', use: 'Job Description', keys: ['nav:jd'] },
  { sec: 'nav', name: 'บุคลากร · HR', use: 'ข้อมูลบุคลากร', keys: ['nav:hr'] },
  { sec: 'nav', name: 'Library · คลังความรู้', use: 'บทความ · checklist', keys: ['nav:library'] },
  { sec: 'nav', name: 'Wellcon Training', use: 'หลักสูตรอบรม', keys: ['nav:training'] },
];
const fKey = (f) => f.keys[0];
const SEC = { proj: ['หน้าในโครงการ', 'การ์ดหน้าแรก + สิทธิ์เข้าหน้า'], nav: ['การ์ดเมนูหลัก', 'แสดงเมื่อตำแหน่งนั้นมีสิทธิ์เข้าเมนูนั้นอยู่แล้ว (สิทธิ์เมนูตั้งที่หน้าจัดการผู้ใช้)'] };

// ---------- ตำแหน่ง (ชื่อ / ค่าเริ่มต้นตรงกับแอปหลัก ROLE_DEFS · WORK_DEF) ----------
const ROLE_TH = { superadmin: 'Super Admin', director: 'Project Director', pm: 'Project Manager', pm_mgr: 'ผู้จัดการฝ่ายโครงการ', sitemgr: 'Site Manager', designer: 'Designer',
  design_mgr: 'ผู้จัดการฝ่ายออกแบบ', qs: 'QS', qs_mgr: 'QS Manager', office: 'ธุรการ · ประสานงาน', fin: 'บัญชี · การเงิน', fin_mgr: 'ผู้จัดการฝ่ายการเงิน', hr: 'ฝ่ายบุคคล',
  hr_mgr: 'ผู้จัดการฝ่ายบุคคล', proc: 'จัดซื้อ', store: 'Store Keeper', factory: 'Factory Staff', site: 'หัวหน้าช่าง', safety: 'จป. · ความปลอดภัย', driver: 'พนักงานขับรถ' };
const GROUPS = [
  { id: 'pm', label: 'PM', roles: ['pm', 'pm_mgr'] }, { id: 'sitemgr', label: 'Site Mgr', roles: ['sitemgr'] }, { id: 'designer', label: 'Designer', roles: ['designer', 'design_mgr'] },
  { id: 'qs', label: 'QS', roles: ['qs', 'qs_mgr'] }, { id: 'office', label: 'Admin (ธุรการ)', roles: ['office'] }, { id: 'director', label: 'Director', roles: ['director'] },
  { id: 'fin', label: 'Finance', roles: ['fin', 'fin_mgr'] }, { id: 'hr', label: 'HR', roles: ['hr', 'hr_mgr'] },
  { id: 'other', label: 'ตำแหน่งอื่น', roles: ['proc', 'store', 'factory', 'site', 'safety', 'driver'], hideGrouped: true },
];
const ALL_ROLES = GROUPS.flatMap(g => g.roles);
const WORK_DEF = {   // ชุดเริ่มต้นของแอปหลัก (ใช้เมื่อตำแหน่งนั้นยังไม่เคยตั้งค่า)
  proc: ['tab:apr', 'tab:mango', ...MAT, 'tab:spo', 'tab:subcon', 'tab:changes', 'nav:procurement', 'nav:subcon', 'tab:pdf', 'tab:photo'],
  store: [...MAT, 'tab:spo', 'tab:mango', 'tab:daily', 'tab:cal', 'nav:procurement', 'tab:pdf', 'tab:photo'],
  factory: ['tab:prod', 'tab:dwg', 'tab:skp', ...MAT, 'tab:qc', 'tab:plan', 'tab:cal', 'tab:pdf', 'tab:photo'],
  driver: ['tab:cal', 'tab:spo', ...MAT, 'tab:daily', 'tab:pdf', 'tab:photo'],
  site: ['tab:daily', 'tab:qc', 'tab:dwg', 'tab:plan', 'tab:apr', 'tab:qm', 'tab:delay', 'tab:cal', 'tab:pdf', 'tab:photo'],
  safety: ['tab:daily', 'tab:qc', 'tab:delay', 'tab:claim', 'tab:plan', 'tab:cal', 'tab:docs', 'tab:memo', 'nav:library', 'nav:training', 'tab:pdf', 'tab:photo'],
  office: ['tab:docs', 'tab:memo', 'tab:daily', 'tab:cal', 'tab:rfi', 'tab:dwg', 'tab:changes', 'tab:claim', 'tab:handover', 'tab:mango', 'nav:library', 'tab:pdf', 'tab:photo'],
};
const MONEY_DEF = ['superadmin', 'director', 'pm', 'pm_mgr', 'qs', 'qs_mgr', 'fin', 'fin_mgr', 'proc', 'design_mgr'];

const APP = { me: null, accounts: [], wp: {}, wu: {}, wua: {}, fg: {}, fr: {}, tab: 'role', split: false, sel: '', uq: '', busy: {} };

// ---------- ข้อมูล (app_state: อ่านล่าสุด → แก้เฉพาะหัวข้อ → เขียน) ----------
async function stGet(id) { const r = await sb.from('app_state').select('data').eq('id', id).maybeSingle(); if (r.error) throw r.error; const v = r.data && r.data.data && r.data.data.v; return (v && typeof v === 'object') ? v : {}; }
async function stSet(id, sub, val) {   // val null / '' = ลบหัวข้อนั้น
  const m = { ...(await stGet(id)) };
  if (val == null || val === '') delete m[sub]; else m[sub] = val;
  const up = await sb.from('app_state').upsert([{ id, data: { v: m }, updated_by: APP.me.email }], { onConflict: 'id' });
  if (up.error) throw up.error; return m;
}
async function loadAll() { const [wp, wu, wua, fg, fr] = await Promise.all(['workPages', 'workUser', 'workUserAdd', 'featGlobal', 'featRole'].map(stGet)); Object.assign(APP, { wp, wu, wua, fg, fr }); }
const roleList = (rk) => Array.isArray(APP.wp[rk]) ? APP.wp[rk] : (WORK_DEF[rk] || []);
const roleHas = (rk, f) => roleList(rk).indexOf(fKey(f)) >= 0;
const globalOff = (f) => f.sec === 'proj' && f.keys.some(k => APP.fg[k] === false);
const moneyOn = (rk) => { const r = (APP.fr[rk] || {}).money; return typeof r === 'boolean' ? r : MONEY_DEF.indexOf(rk) >= 0; };
function applyFeat(L0, f, on) { const L = L0.filter(k => f.keys.indexOf(k) < 0); if (!on) return L;   // ใส่หน้าในโครงการต่อท้ายการ์ดหน้า · ก่อนการ์ดเมนูหลัก
  const nav = L.filter(k => !k.startsWith('tab:')), tabs = L.filter(k => k.startsWith('tab:'));
  return f.sec === 'proj' ? [...tabs, ...f.keys, ...nav] : [...L, ...f.keys]; }
const nextList = (rk, f, on) => applyFeat(roleList(rk), f, on);

// ---------- เริ่มต้น ----------
function msg(t, s) { $('msgBody').innerHTML = `<div class="card" style="margin-top:20px"><b>${t}</b><span class="mut" style="font-size:14px">${s}</span><a class="btn dk" style="text-decoration:none;align-self:flex-start" href="${pmUrl()}">กลับ Wellcon PM</a></div>`; }
async function boot() {
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง'; s.prepend(d); });
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิดจาก ตั้งค่าระบบ'); return; }
    const a = await sb.from('accounts').select('id,data'); if (a.error) throw a.error;
    APP.accounts = (a.data || []).map(rowOf).filter(x => x && x.email && x.active !== false && !x.disabled);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const me = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && APP.accounts.find(x => norm(x.email) === norm(sess.email));
    if (!me) { msg('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิดจาก ตั้งค่าระบบ'); return; }
    // กติกาเดียวกับแอปหลัก (_cardAdminOk): Super Admin หรือสิทธิ์ "จัดการผู้ใช้" ระดับแก้ไข ที่ไม่ใช่ผู้ช่วยจัดทีม
    const adminOk = me.roleKey === 'superadmin' || ((me.perms || {}).admin === 'write' && me.canAssign !== true);
    if (!adminOk) { msg('หน้านี้สำหรับผู้ดูแลระบบ', 'ต้องเป็น Super Admin หรือได้รับสิทธิ์ “จัดการผู้ใช้” ระดับแก้ไข'); return; }
    APP.me = { email: norm(me.email), name: nickOf(me), role: me.roleKey };
    await loadAll();
    try { APP.split = localStorage.getItem('wpm_access_split') === '1'; } catch (e) {}
    $('splitRoles').checked = APP.split;
    $('scrMsg').hidden = true; $('scrMain').hidden = false; setTab(location.hash === '#user' ? 'user' : 'role');
  } catch (e) { console.error(e); msg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', esc((e && e.message) || e)); }
}
function setTab(t) { APP.tab = t; $('tabRole').classList.toggle('on', t === 'role'); $('tabUser').classList.toggle('on', t === 'user');
  $('tabRole').setAttribute('aria-selected', t === 'role'); $('tabUser').setAttribute('aria-selected', t === 'user');
  $('paneRole').hidden = t !== 'role'; $('paneUser').hidden = t !== 'user'; render(); }
function render() {
  const nSp = Object.keys(APP.wua).filter(e => (APP.wua[e] || []).length).length; $('tabUserN').textContent = nSp ? nSp + ' คน' : '';
  const nOff = FEATS.filter(globalOff).length;
  $('topNote').textContent = 'ใช้ข้อมูลชุดเดียวกับแอปหลัก — แก้ที่นี่มีผลทันที (ผู้ใช้เห็นเมื่อเปิดแอปใหม่ / กลับมาหน้าแรก) · ปิดทั้งระบบอยู่ ' + nOff + ' ฟีเจอร์ · Super Admin เห็นทุกฟีเจอร์ที่เปิดอยู่เสมอ · ' + AC_VER;
  if (APP.tab === 'role') renderMatrix(); else renderUsers();
}

// ---------- ตาราง ตำแหน่ง × ฟีเจอร์ ----------
function columns() { return APP.split ? ALL_ROLES.map(rk => ({ id: rk, label: ROLE_TH[rk] || rk, roles: [rk], sub: rk })) : GROUPS.filter(g => !g.hideGrouped).map(g => ({ ...g, sub: g.roles.length > 1 ? g.roles.map(r => ROLE_TH[r]).join(' + ') : '' })); }
function cellState(col, f) { const n = col.roles.filter(rk => roleHas(rk, f)).length; return n === 0 ? 'no' : n === col.roles.length ? 'all' : 'part'; }
function renderMatrix() {
  const C = columns(), H = [];
  H.push('<thead><tr><th class="fx">ฟีเจอร์</th><th style="min-width:74px">เปิดใช้<small>ทุกคน</small></th>' + C.map(c => `<th>${esc(c.label)}${c.sub && !APP.split ? `<small>${esc(c.sub)}</small>` : ''}</th>`).join('') + '<th>Super Admin<small>เห็นทุกอย่าง</small></th></tr></thead><tbody>');
  ['proj', 'nav'].forEach(sec => {
    H.push(`<tr class="sec"><td colspan="${C.length + 3}">${SEC[sec][0]} <small>· ${SEC[sec][1]}</small></td></tr>`);
    FEATS.filter(f => f.sec === sec).forEach(f => { const off = globalOff(f), fi = FEATS.indexOf(f);
      H.push(`<tr class="${off ? 'offrow' : ''}"><td class="fx"><b>${esc(f.name)}${f.money ? '<span class="flag" title="ต้องมีสิทธิ์ดูตัวเลขเงินโครงการ">฿</span>' : ''}</b><small>${esc(f.use)}${off ? ' · ปิดทั้งระบบอยู่' : ''}</small></td>`);
      H.push(`<td class="gl">${sec === 'proj' ? `<button class="sw${off ? '' : ' on'}${APP.busy['g' + fi] ? ' busy' : ''}" data-glob="${fi}" role="switch" aria-checked="${!off}" aria-label="เปิดใช้ ${esc(f.name)} ทั้งระบบ"></button>` : '<span class="mut">—</span>'}</td>`);
      C.forEach(c => { const s = cellState(c, f), busy = APP.busy[c.id + '|' + fi];
        const noMoney = f.money && s !== 'no' && c.roles.some(rk => roleHas(rk, f) && !moneyOn(rk));
        const cls = s === 'all' ? (off ? 'wait' : 'on') : s === 'part' ? 'part' : '';
        const sym = s === 'all' ? (off ? '○' : '✓') : s === 'part' ? '◐' : '';
        const tip = (s === 'all' ? 'ให้แล้ว' : s === 'part' ? 'บางตำแหน่งในกลุ่ม: ' + c.roles.filter(rk => roleHas(rk, f)).map(r => ROLE_TH[r]).join(', ') : 'ไม่ให้') + ' — กดเพื่อ' + (s === 'all' ? 'เอาออก' : 'ให้') + (noMoney ? ' · ⚠ ยังไม่มีสิทธิ์ดูตัวเลขเงิน การ์ดจะไม่แสดง' : '');
        H.push(`<td class="c"><button class="cell ${cls}${busy ? ' busy' : ''}" data-col="${esc(c.id)}" data-f="${fi}" title="${esc(tip)}" aria-label="${esc(c.label + ' · ' + f.name + ' · ' + tip)}">${sym}${noMoney ? '<span style="position:absolute;margin:-28px -30px 0 0;font-size:12px">⚠</span>' : ''}</button></td>`); });
      H.push(`<td class="c"><span class="cell ro" title="Super Admin เห็นทุกฟีเจอร์ที่เปิดอยู่">${off ? '' : '✓'}</span></td></tr>`); });
  });
  // สิทธิ์ดูตัวเลขเงิน
  H.push(`<tr class="sec"><td colspan="${C.length + 3}">สิทธิ์ <small>· ต้องเปิดจึงเห็นการ์ดที่มี ฿ (การเงิน · VO Tracker · Quotation Maker · สัญญาช่าง)</small></td></tr>`);
  H.push('<tr><td class="fx"><b>ตัวเลขเงินโครงการ</b><small>มูลค่างาน · การเงิน · VO</small></td><td class="gl"><span class="mut">—</span></td>' + C.map(c => { const n = c.roles.filter(moneyOn).length, s = n === 0 ? '' : n === c.roles.length ? 'on' : 'part';
    return `<td class="c"><button class="cell ${s}${APP.busy[c.id + '|money'] ? ' busy' : ''}" data-money="${esc(c.id)}" title="${s === 'on' ? 'เห็นตัวเลขเงิน — กดเพื่อปิด' : 'ไม่เห็นตัวเลขเงิน — กดเพื่อเปิด'}">${s === 'on' ? '✓' : s === 'part' ? '◐' : ''}</button></td>`; }).join('') + '<td class="c"><span class="cell ro">✓</span></td></tr>');
  H.push('</tbody><tfoot><tr><td class="fx">ใช้ได้ตอนนี้ (หน้าในโครงการ)</td><td></td>' + C.map(c => { const rk = c.roles[0];
    return `<td>${FEATS.filter(f => f.sec === 'proj' && !globalOff(f) && roleHas(rk, f)).length}</td>`; }).join('') + `<td>${FEATS.filter(f => f.sec === 'proj' && !globalOff(f)).length}</td></tr></tfoot>`);
  $('mx').innerHTML = H.join('');
  $('mxNote').textContent = APP.split ? 'แสดงแยกทุกตำแหน่ง (20) — ตำแหน่งระดับผู้จัดการตั้งแยกจากพนักงานได้' : 'กลุ่มที่มี 2 ตำแหน่ง (เช่น PM + ผู้จัดการฝ่ายโครงการ) กดครั้งเดียวมีผลทั้งกลุ่ม · ตำแหน่งอื่น (จัดซื้อ · สโตร์ · โรงงาน · หัวหน้าช่าง · จป. · คนขับรถ) ดูได้เมื่อติ๊ก “แยกทุกตำแหน่ง” · แถวรวมนับจากตำแหน่งแรกของกลุ่ม';
}
async function toggleCell(colId, fi) { const col = columns().find(c => c.id === colId), f = FEATS[fi]; if (!col || !f) return;
  const k = colId + '|' + fi; if (APP.busy[k]) return; const want = cellState(col, f) !== 'all';
  APP.busy[k] = 1; renderMatrix();
  try { for (const rk of col.roles) { const L = nextList(rk, f, want); APP.wp = await stSet('workPages', rk, L); }
    toast((want ? 'ให้ ' : 'เอาออก ') + f.name + ' · ' + col.label + (want && globalOff(f) ? ' (ฟีเจอร์นี้ปิดทั้งระบบอยู่ — จะเห็นเมื่อเปิดใช้)' : '')); }
  catch (e) { console.error(e); toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 5000); try { await loadAll(); } catch (x) {} }
  delete APP.busy[k]; render(); }
async function toggleGlobal(fi) { const f = FEATS[fi]; const off = globalOff(f), k = 'g' + fi; if (APP.busy[k]) return;
  if (!off && !(await ask('ปิด “' + f.name + '” กับทุกคน?', 'การ์ดและเมนูหายจากทุกโครงการ รวม Super Admin · เปิดจากลิงก์เก่าไม่ได้ · ข้อมูลเดิมไม่ถูกลบ', 'ปิดทั้งระบบ', true))) return;
  APP.busy[k] = 1; renderMatrix();
  try { for (const key of f.keys) APP.fg = await stSet('featGlobal', key, off ? '' : false); toast((off ? 'เปิด ' : 'ปิด ') + f.name + ' ทั้งระบบแล้ว'); }
  catch (e) { console.error(e); toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 5000); try { await loadAll(); } catch (x) {} }
  delete APP.busy[k]; render(); }
async function toggleMoney(colId) { const col = columns().find(c => c.id === colId); if (!col) return; const k = colId + '|money'; if (APP.busy[k]) return;
  const want = !col.roles.every(moneyOn);
  if (want && !(await ask('ให้ ' + col.label + ' เห็นตัวเลขเงินโครงการ?', 'เห็นมูลค่างาน · การเงิน · VO ของโครงการที่ได้รับมอบหมาย — ตามนโยบายบริษัท ตัวเลขเงินให้เฉพาะคนที่ต้องใช้', 'ให้เห็น'))) return;
  APP.busy[k] = 1; renderMatrix();
  try { for (const rk of col.roles) APP.fr = await stSet('featRole', rk, { ...(APP.fr[rk] || {}), money: want }); toast((want ? 'เปิด' : 'ปิด') + 'สิทธิ์ดูตัวเลขเงิน · ' + col.label); }
  catch (e) { console.error(e); toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 5000); try { await loadAll(); } catch (x) {} }
  delete APP.busy[k]; render(); }

// ---------- รายคน · สิทธิ์พิเศษ ----------
const uAdd = (e) => Array.isArray(APP.wua[e]) ? APP.wua[e] : [];
function renderUsers() {
  const q = norm(APP.uq), only = $('uOnlySpecial').checked;
  const L = APP.accounts.filter(a => a.roleKey !== 'superadmin').filter(a => !q || norm([a.name, a.nick, a.username, a.email, ROLE_TH[a.roleKey], a.title].join(' ')).includes(q))
    .filter(a => !only || uAdd(norm(a.email)).length || Array.isArray(APP.wu[norm(a.email)]))
    .sort((x, y) => (uAdd(norm(y.email)).length - uAdd(norm(x.email)).length) || String(x.name || '').localeCompare(String(y.name || ''), 'th'));
  $('ulist').innerHTML = L.slice(0, 200).map(a => { const e = norm(a.email), n = uAdd(e).length, own = Array.isArray(APP.wu[e]);
    return `<button class="urow${APP.sel === e ? ' on' : ''}" data-user="${esc(e)}"><span class="av">${esc(nickOf(a).slice(0, 1))}</span><span class="m"><b>${esc(nickOf(a))}${a.name && a.name !== nickOf(a) ? ' · ' + esc(a.name) : ''}</b><span>${esc(ROLE_TH[a.roleKey] || a.title || a.roleKey || '—')}</span></span>${n ? `<span class="pill">+${n} พิเศษ</span>` : own ? '<span class="pill" style="background:#E7E2D6;color:#4A4840">ตั้งรายคน</span>' : ''}</button>`; }).join('') || '<p class="empty">ไม่พบผู้ใช้</p>';
  renderUserPanel();
}
function renderUserPanel() { const a = APP.accounts.find(x => norm(x.email) === APP.sel); const P = $('uPanel');
  if (!a) { P.innerHTML = '<p class="empty">เลือกคนทางซ้าย เพื่อดูและให้ฟีเจอร์พิเศษเฉพาะคนนั้น</p>'; return; }
  const e = norm(a.email), rk = a.roleKey, add = uAdd(e), own = Array.isArray(APP.wu[e]) ? APP.wu[e] : null;
  const row = (f) => { const fi = FEATS.indexOf(f), off = globalOff(f), fromRole = roleHas(rk, f), fromOwn = own && own.indexOf(fKey(f)) >= 0, extra = add.indexOf(fKey(f)) >= 0;
    const st = fromRole ? '<span class="st role">ตามตำแหน่ง</span>' : extra ? '<span class="st add">สิทธิ์พิเศษ</span>' : '<span class="st no">ไม่มี</span>';
    const sw = fromRole ? '<span class="mut" style="font-size:12px;flex:none">แก้ที่ตารางตำแหน่ง</span>' : `<button class="sw${extra ? ' on' : ''}${APP.busy['u' + fi] ? ' busy' : ''}" data-uadd="${fi}" role="switch" aria-checked="${extra}" aria-label="สิทธิ์พิเศษ ${esc(f.name)}"></button>`;
    const warn = (extra || fromRole) && f.money && !moneyOn(rk) ? ' · ⚠ ตำแหน่งนี้ไม่มีสิทธิ์ดูตัวเลขเงิน — การ์ดจะไม่แสดง' : '';
    return `<div class="frow"${off ? ' style="background:#F7F5F0"' : ''}><div class="t"><b>${esc(f.name)}</b><small>${esc(f.use)}${off ? ' · ปิดทั้งระบบอยู่ (ไม่มีใครเห็น)' : ''}${fromOwn && !fromRole && !extra ? ' · มีในการ์ดรายคนเดิม' : ''}${warn}</small></div>${st}${sw}</div>`; };
  P.innerHTML = `<div class="h">${esc(nickOf(a))}<small>${esc(a.name || '')} · ${esc(ROLE_TH[rk] || rk || '—')} · ${esc(a.email)}</small></div>
    <div class="info">เปิดสวิตช์ = ให้ฟีเจอร์นั้น <b>เฉพาะคนนี้</b> เพิ่มจากชุดของตำแหน่ง · ฟีเจอร์ที่ได้จากตำแหน่งแก้ที่แท็บ “ตามตำแหน่ง” · มีผลเมื่อผู้ใช้เปิดแอปใหม่</div>
    ${own ? `<div class="warn">คนนี้ถูกตั้ง <b>การ์ดรายคน</b> ไว้แบบเดิม (${own.length} การ์ด) — หน้าแรกใช้ชุดรายคนแทนชุดของตำแหน่ง แต่สิทธิ์เข้าหน้ายังรวมทั้งสองชุด <button class="btn bad" style="margin-left:6px;min-height:34px" data-act="resetOwn">กลับไปใช้ชุดตามตำแหน่ง</button></div>` : ''}
    <div class="h" style="font-size:14px">หน้าในโครงการ<small>${add.length} สิทธิ์พิเศษ</small></div><div class="flist">${FEATS.filter(f => f.sec === 'proj').map(row).join('')}</div>
    <div class="h" style="font-size:14px">การ์ดเมนูหลัก<small>แสดงเมื่อคนนี้มีสิทธิ์เข้าเมนูนั้นอยู่แล้ว</small></div><div class="flist">${FEATS.filter(f => f.sec === 'nav').map(row).join('')}</div>`;
}
async function toggleUser(fi) { const f = FEATS[fi], e = APP.sel, k = 'u' + fi; if (!f || !e || APP.busy[k]) return;
  const cur = uAdd(e), on = cur.indexOf(fKey(f)) >= 0, nx = on ? cur.filter(x => f.keys.indexOf(x) < 0) : [...cur, ...f.keys.filter(x => cur.indexOf(x) < 0)];
  APP.busy[k] = 1; renderUserPanel();
  try { APP.wua = await stSet('workUserAdd', e, nx.length ? nx : ''); toast((on ? 'เอาสิทธิ์พิเศษออก: ' : 'ให้สิทธิ์พิเศษ: ') + f.name); }
  catch (er) { console.error(er); toast('บันทึกไม่สำเร็จ: ' + ((er && er.message) || er), 5000); try { await loadAll(); } catch (x) {} }
  delete APP.busy[k]; renderUsers(); }
async function resetOwn() { const e = APP.sel; if (!e) return;
  if (!(await ask('กลับไปใช้ชุดการ์ดตามตำแหน่ง?', 'ลบการ์ดรายคนแบบเดิมของคนนี้ — หน้าแรกจะใช้ชุดของตำแหน่ง + สิทธิ์พิเศษที่ตั้งไว้ที่นี่', 'กลับไปใช้ชุดตามตำแหน่ง', true))) return;
  try { APP.wu = await stSet('workUser', e, ''); toast('กลับไปใช้ชุดตามตำแหน่งแล้ว'); } catch (er) { toast('บันทึกไม่สำเร็จ: ' + ((er && er.message) || er), 5000); }
  renderUsers(); }

// ---------- Excel ----------
async function xlsxLib() { if (window.XLSX) return window.XLSX;
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/xlsx.full.min.js'; s.onload = ok; s.onerror = () => no(new Error('โหลดตัวอ่าน Excel ไม่สำเร็จ')); document.head.appendChild(s); });
  return window.XLSX; }
const XCOLS = [['PM', ['pm', 'pm_mgr']], ['Site Mgr', ['sitemgr']], ['Designer', ['designer', 'design_mgr']], ['QS', ['qs', 'qs_mgr']], ['Admin (ธุรการ)', ['office']], ['Director', ['director']], ['Finance', ['fin', 'fin_mgr']], ['HR', ['hr', 'hr_mgr']]];
async function exportXlsx() { try { const X = await xlsxLib(); const rows = [['WELLCON INTERIOR · สิทธิ์ใช้ฟีเจอร์ตามตำแหน่ง — ส่งออกจากระบบ ' + new Date().toLocaleString('th-TH')], ['✓ ให้ใช้   ○ ให้แล้วแต่ฟีเจอร์ปิดทั้งระบบ   – ไม่ให้   ◐ บางตำแหน่งในกลุ่ม (นำเข้าแล้วไม่แตะ) · แก้แล้วนำเข้าที่หน้า “สิทธิ์ตามตำแหน่ง”'], [],
    ['#', 'ฟีเจอร์', 'ใช้ทำอะไร', 'สถานะในระบบ', ...XCOLS.map(c => c[0]), 'Super Admin']];
  FEATS.forEach((f, i) => { const off = globalOff(f); rows.push([i + 1, f.name, f.use, f.sec === 'nav' ? 'การ์ดเมนูหลัก' : off ? 'ปิด' : 'เปิด', ...XCOLS.map(c => { const n = c[1].filter(rk => roleHas(rk, f)).length; return n === 0 ? '–' : n < c[1].length ? '◐' : (off ? '○' : '✓'); }), off ? '○' : '✓']); });
  const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 34 }, { wch: 14 }, ...XCOLS.map(() => ({ wch: 12 })), { wch: 12 }];
  const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'ตำแหน่ง × ฟีเจอร์'); X.writeFile(wb, 'Wellcon_PM_Feature_by_Position_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  toast('ดาวน์โหลดแล้ว'); } catch (e) { console.error(e); toast('ดาวน์โหลดไม่สำเร็จ: ' + ((e && e.message) || e), 5000); } }
async function importXlsx(file) { try { const X = await xlsxLib(); const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const sn = wb.SheetNames.find(n => /ตำแหน่ง\s*×\s*ฟีเจอร์/.test(n)) || wb.SheetNames.find(n => /×/.test(n)) || wb.SheetNames[0];
  const aoa = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
  const hi = aoa.findIndex(r => r.some(c => String(c).trim() === 'ฟีเจอร์') && r.some(c => /^PM$/.test(String(c).trim())));
  if (hi < 0) throw new Error('ไม่พบหัวตาราง (ต้องมีคอลัมน์ “ฟีเจอร์” และ “PM”) ในชีต ' + sn);
  const head = aoa[hi].map(c => String(c).replace(/\s+/g, ' ').trim()), ci = (lab) => head.findIndex(h => h === lab || h.replace(/\s/g, '') === lab.replace(/\s/g, ''));
  const fcol = head.indexOf('ฟีเจอร์'), map = XCOLS.map(([lab, roles]) => ({ lab, roles, i: ci(lab) })).filter(c => c.i >= 0);
  if (!map.length) throw new Error('ไม่พบคอลัมน์ตำแหน่งในไฟล์');
  const want = {}; ALL_ROLES.forEach(rk => { want[rk] = roleList(rk).slice(); }); const ch = [], unknown = [];
  aoa.slice(hi + 1).forEach(r => { const nm = String(r[fcol] || '').trim(); if (!nm) return; const f = FEATS.find(x => x.name === nm);
    if (!f) { if (/[ก-๙A-Za-z]/.test(nm) && !/^(รวม|①|②|③|💡|WELLCON)/.test(nm)) unknown.push(nm); return; }
    map.forEach(c => { const v = String(r[c.i] || '').trim(); if ((v === '' && f.sec === 'nav') || v === '◐') return;   // เมนูหลักที่เว้นว่าง / ◐ บางตำแหน่งในกลุ่ม = ไม่แตะ
      const on = v === '✓' || v === '○' || /^y(es)?$/i.test(v);
      c.roles.forEach(rk => { if ((want[rk].indexOf(fKey(f)) >= 0) !== on) { want[rk] = applyFeat(want[rk], f, on); ch.push([rk, f.name, on]); } }); }); });
  if (!ch.length) { await dlg({ t: 'ไม่มีอะไรเปลี่ยน', s: 'ข้อมูลในไฟล์ตรงกับระบบอยู่แล้ว' + (unknown.length ? '\nแถวที่ไม่รู้จัก (ข้าม): ' + unknown.join(', ') : ''), ok: 'ปิด', cancel: false }); return; }
  const byRole = {}; ch.forEach(([rk, nm, on]) => { (byRole[rk] = byRole[rk] || []).push((on ? '＋ ' : '－ ') + nm); });
  const ok = await dlg({ t: 'นำเข้าจาก Excel — ' + ch.length + ' รายการจะเปลี่ยน', s: 'ไฟล์: ' + file.name + ' · ชีต ' + sn + (unknown.length ? '\n⚠ แถวที่ไม่รู้จัก (ข้าม): ' + unknown.join(', ') : ''),
    html: '<ul>' + Object.keys(byRole).map(rk => `<li><b>${esc(ROLE_TH[rk] || rk)}</b>: ${byRole[rk].map(esc).join(' · ')}</li>`).join('') + '</ul>', ok: 'บันทึกตามไฟล์' });
  if (!ok) return;
  const roles = Object.keys(byRole);
  for (const rk of roles) APP.wp = await stSet('workPages', rk, want[rk]);
  const n = roles.length;
  toast('บันทึกตามไฟล์แล้ว · ' + n + ' ตำแหน่ง', 4000); render();
  } catch (e) { console.error(e); toast('นำเข้าไม่สำเร็จ: ' + ((e && e.message) || e), 6000); try { await loadAll(); render(); } catch (x) {} } }

// ---------- กล่องยืนยัน ----------
function dlg(o) { return new Promise(res => { const b = $('dlgBox');
  b.innerHTML = `<b class="t">${esc(o.t)}</b>${o.s ? `<div class="mut" style="font-size:14px;white-space:pre-line">${esc(o.s)}</div>` : ''}${o.html || ''}<div class="ac">${o.cancel === false ? '' : '<button class="btn" data-d="no">ยกเลิก</button>'}<button class="btn ${o.bad ? 'bad' : 'dk'}" data-d="ok">${esc(o.ok || 'ตกลง')}</button></div>`;
  $('dlg').hidden = false; b.querySelector('[data-d="ok"]').focus();
  const done = (v) => { $('dlg').hidden = true; b.onclick = null; document.removeEventListener('keydown', kd); res(v); };
  const kd = (e) => { if (e.key === 'Escape') done(false); }; document.addEventListener('keydown', kd);
  b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (d) done(d.dataset.d === 'ok'); }; }); }
const ask = (t, s, ok, bad) => dlg({ t, s, ok, bad });

// ---------- เหตุการณ์ ----------
document.addEventListener('click', (e) => { const t = e.target;
  const tb = t.closest('[data-tab]'); if (tb) { setTab(tb.dataset.tab); try { history.replaceState(null, '', tb.dataset.tab === 'user' ? '#user' : location.pathname + location.search); } catch (x) {} return; }
  const c = t.closest('[data-col]'); if (c) { toggleCell(c.dataset.col, Number(c.dataset.f)); return; }
  const g = t.closest('[data-glob]'); if (g) { toggleGlobal(Number(g.dataset.glob)); return; }
  const m = t.closest('[data-money]'); if (m) { toggleMoney(m.dataset.money); return; }
  const u = t.closest('[data-user]'); if (u) { APP.sel = u.dataset.user; renderUsers(); return; }
  const ua = t.closest('[data-uadd]'); if (ua) { toggleUser(Number(ua.dataset.uadd)); return; }
  const a = t.closest('[data-act]'); if (!a) return; const k = a.dataset.act;
  if (k === 'toPm') { location.href = pmUrl() + '#/system'; }
  else if (k === 'export') exportXlsx(); else if (k === 'import') $('xlsIn').click(); else if (k === 'resetOwn') resetOwn(); });
document.addEventListener('change', (e) => { const t = e.target;
  if (t.id === 'splitRoles') { APP.split = t.checked; try { localStorage.setItem('wpm_access_split', t.checked ? '1' : '0'); } catch (x) {} renderMatrix(); }
  else if (t.id === 'uOnlySpecial') renderUsers();
  else if (t.id === 'xlsIn') { const f = t.files && t.files[0]; t.value = ''; if (f) importXlsx(f); } });
document.addEventListener('input', (e) => { if (e.target.id === 'uq') { APP.uq = e.target.value; renderUsers(); } });
// แท็บกลับมาเปิด → โหลดค่าล่าสุด (มีคนแก้จากแอปหลักระหว่างนี้)
document.addEventListener('visibilitychange', () => { if (!document.hidden && APP.me) loadAll().then(render, () => {}); });
window.__AC = { FEATS, GROUPS, ver: AC_VER };
boot();
})();
