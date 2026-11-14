/* =====================================================================
   Wellcon PM — การใช้งานระบบ (Usage Dashboard) · usage.html
   ใครใช้ / ไม่ใช้ระบบ · Daily Report ส่งครบไหม · โมดูลไหนถูกใช้ — เพื่อติดตามให้ทีมใช้งานจริง
   ข้อมูลจากฟังก์ชัน usage_report (ตัวเลขสรุปเท่านั้น ไม่มีราคา) · การเปิดแอปบันทึกด้วย usage_touch
   ===================================================================== */
'use strict';
const US_VER = 'v1.0.0';
const CFG = { url: 'https://botecmzshubflokkdant.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo' };
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h))   /* กติกาเดียวกับแอปหลัก: ข้อมูลจริง = เฉพาะ *.vercel.app · localhost / โดเมนอื่น = ข้อมูลทดสอบ (?env=prod บังคับของจริง) */) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
// ผู้ที่เปิดหน้านี้ได้: ผู้บริหาร · Admin · หัวหน้าฝ่าย · HR
const VIEW_ROLES = ['superadmin', 'director', 'admin', 'pm_mgr', 'qs_mgr', 'design_mgr', 'fin_mgr', 'hr', 'hr_mgr'];
const ROLE_TH = { superadmin: 'Super Admin', director: 'ผู้บริหาร', admin: 'Admin', pm: 'PM', pm_mgr: 'PM Manager', site: 'Site · หน้างาน', sitemgr: 'Site Manager', safety: 'Safety', store: 'คลังสินค้า',
  designer: 'Designer', design_mgr: 'Design Manager', qs: 'QS', qs_mgr: 'QS Manager', proc: 'จัดซื้อ', factory: 'โรงงาน', office: 'ธุรการ', fin_mgr: 'การเงิน', finance: 'การเงิน', hr: 'HR', hr_mgr: 'HR' };
const GROUPS = [['all', 'ทั้งหมด'], ['site', 'หน้างาน', ['site', 'sitemgr', 'safety', 'store']], ['pm', 'PM · QS · จัดซื้อ', ['pm', 'pm_mgr', 'qs', 'qs_mgr', 'proc']], ['design', 'ออกแบบ · โรงงาน', ['designer', 'design_mgr', 'factory']], ['office', 'ออฟฟิศ · ผู้บริหาร', ['office', 'fin_mgr', 'finance', 'hr', 'hr_mgr', 'director', 'superadmin', 'admin']]];
const MOD_TH = [['daily', 'รายงานประจำวัน (Site)', 1], ['defect', 'Site Work · Defect', 1], ['issues', 'Site Issues', 1], ['rfi', 'RFI / RFA', 1], ['submittal', 'Submittal · ส่งอนุมัติวัสดุ', 1], ['po', 'Site PO', 1],
  ['material', 'วัสดุ · Material Log', 0], ['drawings', 'แบบ · Drawing Log', 0], ['vo', 'VO / SI / EOT', 0], ['billing', 'วางบิล', 0], ['plan', 'แผนงาน', 0], ['boq', 'BOQ', 0], ['qs', 'QS Tracking', 0], ['survey', 'As-Built & Survey', 0], ['aw', 'งานเพิ่ม', 0], ['quote', 'ใบเสนอราคา', 0], ['memo', 'Memo', 0], ['log', 'บันทึกกิจกรรม (Level Gate)', 0]];
const APP_TH = { pm: 'Wellcon PM', dc: 'Site Work · Defect', si: 'Site Issues (เดิม)', sv: 'Site Work · Survey', claim: 'Claim', qm: 'Takeoff · วัดหน้างาน' };
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const rowOf = (r) => ({ ...(r.data || {}), id: r.id });
const DAY = 864e5;
const dmy = (d) => { if (!d) return '—'; const x = new Date(d); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear(); };
const ago = (d) => { if (!d) return null; return Math.floor((Date.now() - new Date(d).getTime()) / DAY); };
const APP = { days: 7, grp: 'all', sort: 'least', me: null, data: null };

function msg(html) { $('app').innerHTML = (IS_STG ? '<div class="stg">ข้อมูลทดสอบ (staging)</div>' : '') + '<div class="msg"><div class="card" style="display:grid;gap:10px">' + html + '</div></div>'; }
const hdr = (sub) => (IS_STG ? '<div class="stg">ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง</div>' : '') + '<div class="hdr"><div class="grow"><b>📊 การใช้งานระบบ</b><small>' + esc(sub || 'Wellcon PM · ใครใช้ / ไม่ใช้ · Daily Report') + '</small></div></div>';

async function boot() {
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    const goPm = '<a class="btn pri" href="/' + (IS_STG ? '?env=staging' : '') + '">ไปหน้า Wellcon PM</a>';
    if (!ok) { msg('<b>ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้</b><span class="sub">เปิด Wellcon PM และเข้าสู่ระบบก่อน แล้วกด "📊 การใช้งานระบบ" ที่หน้าแรก</span>' + goPm); return; }
    const a = await sb.from('accounts').select('id,data'); if (a.error) throw a.error;
    const accs = (a.data || []).map(rowOf);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    let ho = null; try { ho = JSON.parse(localStorage.getItem('wellcon_pm_handoff') || 'null'); } catch (e) {}
    const match = (x, o) => !!o && ((o.email && norm(x.email) === norm(o.email)) || (o.id && String(x.id) === String(o.id)) || (o.username && norm(x.username) === norm(o.username)));
    const acc = (ho && Date.now() - Number(ho.at || 0) < 12 * 36e5 && accs.find(x => match(x, ho))) || (sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * DAY && accs.find(x => match(x, { email: sess.email }))) || null;
    if (!acc) { msg('<b>ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้</b><span class="sub">เข้าสู่ระบบที่ Wellcon PM ก่อน</span>' + goPm); return; }
    if (VIEW_ROLES.indexOf(acc.roleKey) < 0) { msg('<b>หน้านี้สำหรับผู้บริหาร / หัวหน้าฝ่าย / HR</b><span class="sub">ติดต่อผู้ดูแลระบบถ้าต้องการสิทธิ์</span>' + goPm); return; }
    try { if (window.WCTag) WCTag.setup({ sb, app: 'pm', me: { email: norm(acc.email), name: String(acc.nick || '').trim() || acc.name || acc.email, role: acc.roleKey || '' }, accounts: accs.filter(x => x.active !== false && !x.disabled), projects: [] }); } catch (e) {}   // กระดิ่งแจ้งเตือนเหมือนทุกหน้า
    APP.me = acc; await load();
  } catch (e) { console.error(e); msg('<b>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</b><span class="sub">' + esc((e && e.message) || e) + '</span><button class="btn pri" onclick="location.reload()">ลองใหม่</button>'); }
}
async function load() {
  $('app').innerHTML = hdr() + '<div class="spin"></div>';
  const r = await sb.rpc('usage_report', { p_days: APP.days });
  if (r.error) { msg('<b>โหลดข้อมูลไม่สำเร็จ</b><span class="sub">' + esc(r.error.message) + '</span><button class="btn pri" onclick="location.reload()">ลองใหม่</button>'); return; }
  APP.data = r.data; render();
}
// วันทำงาน จันทร์–เสาร์ ในช่วง [a, b]
const workDays = (a, b) => { let n = 0; for (let t = new Date(a); t <= b; t = new Date(t.getTime() + DAY)) if (t.getDay() !== 0) n++; return n; };
function analyse() {
  const D = APP.data, now = new Date(), days = D.days; const t0 = new Date(now.getTime() - days * DAY); t0.setHours(0, 0, 0, 0);
  const users = (D.users || []).map(u => { const last = [u.last_seen, u.last_write].filter(Boolean).sort().pop() || null; const a = ago(last);
    const st = a == null ? 'never' : a <= 1 ? 'ok' : a <= 6 ? 'idle' : 'off'; return { ...u, last, ago: a, st }; });
  const pd = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const projects = (D.projects || []).map(p => { const s = pd(p.start), e = pd(p.end); const active = (+p.progress || 0) < 100 && (!s || s <= now) && ((!!s && (!e || e.getTime() >= now.getTime() - 14 * DAY)) || (+p.writes || 0) > 0); /* กำลังทำงาน = ยังไม่ 100% และ (อยู่ในช่วงสัญญา หรือมีคนบันทึกข้อมูล — งานเลยกำหนดยังนับ) */
    const from = s && s > t0 ? s : t0, to = now; /* งานเลยกำหนดยังต้องส่ง Daily Report — นับถึงวันนี้ */ const exp = active ? Math.max(0, workDays(from, to)) : 0;
    const la = p.daily_last ? ago(p.daily_last) : null; const pct = exp ? Math.min(100, Math.round(p.daily_days / exp * 100)) : null;
    return { ...p, active, exp, pct, dlAgo: la }; });
  return { users, projects };
}
const ST = { ok: ['ใช้งานแล้ว', 'var(--green)', 'var(--greenT)'], idle: ['เริ่มห่าง', 'var(--amber)', 'var(--amberT)'], off: ['ไม่ได้ใช้', 'var(--red)', 'var(--redT)'], never: ['ยังไม่เคยใช้', 'var(--red)', 'var(--redT)'] };
const stTx = (u) => u.st === 'ok' ? (u.ago === 0 ? 'ใช้วันนี้' : 'ใช้เมื่อวาน') : u.st === 'never' ? 'ยังไม่เคยใช้' : ('ไม่ได้ใช้ ' + u.ago + ' วัน');
function render() {
  const D = APP.data, A = analyse(); const U = A.users, P = A.projects.filter(p => p.active);
  const okN = U.filter(u => u.ago != null && u.ago < APP.days).length; const offN = U.filter(u => u.st === 'off' || u.st === 'never').length;
  const today = P.filter(p => p.dlAgo === 0).length; const writes = U.reduce((s, u) => s + (+u.writes || 0), 0);
  const kp = [
    ['ใช้งานใน ' + APP.days + ' วัน', okN + ' / ' + U.length, Math.round(okN / Math.max(1, U.length) * 100) + '% ของผู้ใช้ทั้งหมด', okN / Math.max(1, U.length) >= .7 ? 'var(--green)' : 'var(--red)'],
    ['ไม่ได้ใช้เกิน 7 วัน', String(offN), offN ? 'ต้องติดตาม' : 'ทุกคนใช้งาน', offN ? 'var(--red)' : 'var(--green)'],
    ['Daily Report วันนี้', today + ' / ' + P.length, 'โครงการที่กำลังทำงาน', today >= P.length && P.length ? 'var(--green)' : 'var(--amber)'],
    ['บันทึกข้อมูล', String(writes), 'รายการใน ' + APP.days + ' วัน', 'var(--ink)']];
  // ⚠ ต้องติดตาม
  const att = [];
  P.filter(p => p.pct != null && p.pct < 80).sort((a, b) => (a.pct - b.pct)).forEach(p => att.push({ r: p.pct < 40 ? 0 : 1, nm: p.name, tx: 'Daily Report ' + p.daily_days + ' / ' + p.exp + ' วันทำงาน' + (p.dlAgo == null ? ' · ยังไม่เคยส่ง' : p.dlAgo > 0 ? ' · ส่งล่าสุด ' + p.dlAgo + ' วันก่อน' : ''), tag: p.pct + '%', c: p.pct < 40 ? 'var(--red)' : 'var(--amber)', b: p.pct < 40 ? 'var(--redT)' : 'var(--amberT)' }));
  const siteOff = U.filter(u => ['site', 'sitemgr', 'safety', 'store'].indexOf(u.role) >= 0 && (u.st === 'off' || u.st === 'never'));
  if (siteOff.length) att.push({ r: 0, nm: 'ทีมหน้างาน ' + siteOff.length + ' คน ไม่ได้ใช้ระบบเกิน 7 วัน', tx: siteOff.slice(0, 8).map(u => u.name).join(' · ') + (siteOff.length > 8 ? ' …' : ''), tag: 'หน้างาน', c: 'var(--red)', b: 'var(--redT)' });
  const pmOff = U.filter(u => ['pm', 'pm_mgr', 'qs', 'qs_mgr', 'proc'].indexOf(u.role) >= 0 && (u.st === 'off' || u.st === 'never'));
  if (pmOff.length) att.push({ r: 1, nm: 'PM · QS · จัดซื้อ ' + pmOff.length + ' คน ไม่ได้ใช้เกิน 7 วัน', tx: pmOff.map(u => u.name).join(' · '), tag: 'PM / QS', c: 'var(--amber)', b: 'var(--amberT)' });
  att.sort((a, b) => a.r - b.r);
  // ผู้ใช้
  const G = GROUPS.find(g => g[0] === APP.grp); const L = U.filter(u => !G[2] || G[2].indexOf(u.role) >= 0)
    .sort((a, b) => APP.sort === 'least' ? ((b.ago == null ? 1e9 : b.ago) - (a.ago == null ? 1e9 : a.ago)) || (a.writes - b.writes) : ((a.ago == null ? 1e9 : a.ago) - (b.ago == null ? 1e9 : b.ago)) || (b.writes - a.writes));
  const M = D.modules || {}; const mx = Math.max(1, ...MOD_TH.map(m => +M[m[0]] || 0));
  const appsTx = Object.keys(D.apps || {}).map(k => (APP_TH[k] || k) + ' ' + D.apps[k] + ' คน').join(' · ');
  $('app').innerHTML = hdr((IS_STG ? 'staging · ' : '') + 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.') + '<main>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div class="seg">' + [7, 30].map(d => '<button data-days="' + d + '" class="' + (APP.days === d ? 'on' : '') + '">' + d + ' วัน</button>').join('') + '</div><span class="grow"></span><button class="btn" data-act="reload">⟳ โหลดใหม่</button></div>' +
    '<div class="kpis">' + kp.map(k => '<div class="kpi"><div class="l">' + k[0] + '</div><div class="v" style="color:' + k[3] + '">' + k[1] + '</div><div class="s">' + k[2] + '</div></div>').join('') + '</div>' +
    '<div class="card" style="border-color:' + (att.some(a => a.r === 0) ? '#E8BDB2' : 'var(--line2)') + '"><div class="ch"><b>' + (att.length ? '⚠ ต้องติดตาม' : '✓ ไม่มีเรื่องต้องตาม') + '</b><span>' + (att.length ? att.length + ' เรื่อง' : 'ทุกโครงการส่ง Daily Report ครบ · ทุกคนใช้งาน') + '</span></div>' +
      att.slice(0, 8).map(a => '<div class="row"><span class="dot" style="background:' + a.c + '"></span><div class="grow"><div class="nm" style="white-space:normal">' + esc(a.nm) + '</div><div class="sub">' + esc(a.tx) + '</div></div><span class="tag" style="color:' + a.c + ';background:' + a.b + '">' + esc(a.tag) + '</span></div>').join('') +
      (offN ? '<div style="margin-top:10px"><button class="btn" data-act="copy">📋 คัดลอกรายชื่อคนที่ยังไม่ใช้ (ส่ง LINE)</button></div>' : '') + '</div>' +
    '<div class="card"><div class="ch"><b>📝 Daily Report ตามโครงการ</b><span>' + P.length + ' โครงการที่กำลังทำงาน · นับวันทำงาน จ.–ส.</span></div>' +
      (P.length ? P.sort((a, b) => (a.pct == null ? 999 : a.pct) - (b.pct == null ? 999 : b.pct)).map(p => { const c = p.pct == null ? '#A9A294' : p.pct >= 80 ? 'var(--green)' : p.pct >= 40 ? 'var(--amber)' : 'var(--red)';
        return '<div class="row"><div class="grow"><div style="display:flex;justify-content:space-between;gap:8px"><span class="nm">' + esc(p.name) + '</span><b style="color:' + c + ';white-space:nowrap">' + p.daily_days + ' / ' + p.exp + ' วัน</b></div>' +
          '<div class="bar"><i style="width:' + (p.pct || 0) + '%;background:' + c + '"></i></div><div class="sub">' + (p.dlAgo == null ? 'ยังไม่เคยส่ง Daily Report' : p.dlAgo === 0 ? 'ส่งวันนี้แล้ว ✓' : 'ส่งล่าสุด ' + dmy(p.daily_last) + ' (' + p.dlAgo + ' วันก่อน)') + ' · คนบันทึกข้อมูล ' + p.people + ' คน</div></div></div>'; }).join('') : '<div class="sub">ไม่มีโครงการที่กำลังทำงาน (ตามวันเริ่ม–สิ้นสุด และความคืบหน้า &lt; 100%)</div>') + '</div>' +
    '<div class="card"><div class="ch"><b>👥 ผู้ใช้งาน</b><span>' + L.length + ' คน</span><span class="grow"></span><div class="seg"><button data-sort="least" class="' + (APP.sort === 'least' ? 'on' : '') + '">ใช้น้อยก่อน</button><button data-sort="most" class="' + (APP.sort === 'most' ? 'on' : '') + '">ใช้มากก่อน</button></div></div>' +
      '<div class="chips">' + GROUPS.map(g => { const n = U.filter(u => !g[2] || g[2].indexOf(u.role) >= 0).length; return '<button data-grp="' + g[0] + '" class="' + (APP.grp === g[0] ? 'on' : '') + '">' + g[1] + ' ' + n + '</button>'; }).join('') + '</div>' +
      L.map(u => { const s = ST[u.st]; return '<div class="row"><span class="dot" style="background:' + s[1] + '"></span><div class="grow"><div class="nm">' + esc(u.name) + (u.full && u.full !== u.name ? ' <span class="sub" style="font-weight:500">· ' + esc(u.full) + '</span>' : '') + '</div>' +
        '<div class="sub">' + esc(ROLE_TH[u.role] || u.role || '—') + (u.title && u.title !== ROLE_TH[u.role] ? ' · ' + esc(u.title) : '') + ' · ใช้ ' + u.days + ' วัน · บันทึก ' + u.writes + ' รายการ' + (u.apps && u.apps.length ? ' · ' + u.apps.map(a => APP_TH[a] || a).join(', ') : '') + '</div></div>' +
        '<span class="tag" style="color:' + s[1] + ';background:' + s[2] + '">' + stTx(u) + '</span></div>'; }).join('') + '</div>' +
    '<div class="card"><div class="ch"><b>🧩 โมดูลที่ถูกใช้</b><span>จำนวนรายการที่บันทึก / แก้ไขใน ' + APP.days + ' วัน</span></div><div class="mods">' +
      MOD_TH.filter(m => m[2] || (+M[m[0]] || 0) > 0).map(m => { const n = +M[m[0]] || 0; return '<div><div style="display:flex;justify-content:space-between"><span>' + (m[2] ? '★ ' : '') + esc(m[1]) + '</span></div><div class="bar"><i style="width:' + Math.round(n / mx * 100) + '%;background:' + (n ? 'var(--gold)' : '#E4DED2') + '"></i></div></div><b class="' + (n ? '' : (m[2] ? 'z' : '')) + '">' + (n || (m[2] ? '0 · ยังไม่ใช้' : '0')) + '</b>'; }).join('') + '</div>' +
      '<div class="sub" style="margin-top:8px">★ = งานหน้างานที่ควรใช้ทุกวัน' + (appsTx ? ' · เปิดแอป: ' + esc(appsTx) : '') + '</div></div>' +
    '<div class="note">ใช้งาน = เปิดแอป หรือบันทึก / แก้ไขข้อมูล · ' + (D.tracking_since ? 'เริ่มนับการเปิดแอปตั้งแต่ ' + dmy(D.tracking_since) : 'การนับ "เปิดแอป" เริ่มหลังอัปเดตนี้ — ก่อนหน้านั้นนับเฉพาะการบันทึกข้อมูล') + ' · ไม่มีข้อมูลราคา / ต้นทุน · ' + US_VER + '</div></main>';
}
document.addEventListener('click', async (e) => { const b = e.target.closest('[data-days],[data-grp],[data-sort],[data-act]'); if (!b) return;
  if (b.dataset.days) { APP.days = +b.dataset.days; load(); return; }
  if (b.dataset.grp) { APP.grp = b.dataset.grp; render(); return; }
  if (b.dataset.sort) { APP.sort = b.dataset.sort; render(); return; }
  if (b.dataset.act === 'reload') { load(); return; }
  if (b.dataset.act === 'copy') { const U = analyse().users.filter(u => u.st === 'off' || u.st === 'never');
    const tx = '📲 ขอความร่วมมือใช้ Wellcon PM ทุกวันครับ\nยังไม่ได้ใช้ระบบเกิน 7 วัน (' + U.length + ' คน):\n' + U.map(u => '• ' + u.name + ' (' + (ROLE_TH[u.role] || u.role) + ')' + (u.ago != null ? ' — ' + u.ago + ' วัน' : ' — ยังไม่เคยใช้')).join('\n') + '\n\nติดตั้งแอป: ' + location.origin + '/install/';
    try { await navigator.clipboard.writeText(tx); alert('คัดลอกแล้ว — วางใน LINE กลุ่มได้เลย'); } catch (x) { prompt('คัดลอกข้อความนี้', tx); } } });
boot();
