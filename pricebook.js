/* =====================================================================
   ราคากลาง (Price Book) — Wellcon PM · หน้าแยก pricebook.html (ผู้บริหารสั่ง 19/11/2026)
   หลักการ (docs/pricing-principles.md · docs/pricebook-decisions.md):
   • ข้อมูลราคาชุดเดียวของบริษัท — ยกระดับ "อัตรากลาง" เดิม (app_state 'claimRates') เป็นราคากลาง
     ต้นฉบับ: app_state 'priceBook' = { v:{ ver, eff, pubAt, pubBy, cfg:{ ohp, ot }, items:[…], hist:[…] } }
     ฉบับเผยแพร่สำหรับระบบที่อ่านอยู่แล้ว (Quotation Maker · Claim ในแอป Site Work · OT · VO): เขียนลง 'claimRates' ทุกครั้งที่เผยแพร่
       (เฉพาะรายการที่ "ใช้อยู่" · รูปแบบเดิม { ohp, ot, items:[{ id, g, n, u, t, rate, … }], trades:[{ n, rate }] } — ระบบเดิมไม่ต้องแก้)
   • ราคากลาง = ฐานเริ่มต้นการคุยราคา (ปรับตามเงื่อนไขงานได้ในใบเสนอราคา — ระบบแสดงว่าปรับกี่ %)
   • ราคาเปลี่ยนตามเวลา → ทุกการเปลี่ยนเป็น "คำขอแก้ไข" ต้องผ่าน QS ตรวจ → Director อนุมัติ → Admin เผยแพร่ ก่อนใช้
     (app_state 'priceBookReq' = { v:{ reqs:[…] } } · ภาพก่อนเผยแพร่แต่ละฉบับ: app_state 'priceBookHist')
   • นำเข้า Excel ไม่ทับข้อมูลทันที: แสดงสิ่งที่เปลี่ยนก่อน → ส่งเป็นคำขอแก้ไข · ใบเสนอราคาเก่าเก็บราคาไว้ในใบ (ไม่เปลี่ยนย้อนหลัง)
   • ราคาเรียกเก็บลูกค้า (ไม่รวม VAT) เท่านั้น — ระยะ 1 ยังไม่มีคอลัมน์ต้นทุน · ห้ามใส่ราคาซื้อ / ชื่อผู้รับเหมา
   • สิทธิ์เข้าหน้า = การ์ด 'tab:pbook' (ตำแหน่ง + รายคน — หน้า access.html) · ปิดทั้งระบบที่สวิตช์ featGlobal['tab:pbook']
   ===================================================================== */
(() => {
'use strict';
const PB_VER = 'v1.0.0';
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
const TAB = 'tab:pbook', TAG_APP = 'ราคากลาง', KEY = 'priceBook', RKEY = 'priceBookReq', HKEY = 'priceBookHist', RC_KEY = 'claimRates';
const DEF_ROLES = ['qs', 'qs_mgr', 'director'];
// หมวด (คีย์ตรงกับหมวดงานใน Quotation Maker เพื่อจัดหมวดรายการให้อัตโนมัติ · กลุ่ม Preliminary ตรงกับอัตรากลางเดิม)
const GROUPS = [['labor', 'ค่าแรงช่าง', 'LB'], ['floor', 'งานพื้น', 'FL'], ['ceil', 'งานฝ้าเพดาน', 'CL'], ['wall', 'งานผนัง', 'WL'], ['bi', 'FF&E — เฟอร์นิเจอร์ Built-in', 'BI'],
  ['loose', 'FF&E — เฟอร์นิเจอร์ลอยตัว', 'LS'], ['mep', 'งานระบบ (MEP)', 'MP'], ['demo', 'งานรื้อถอน / ซ่อมแซม', 'DM'], ['mat', 'วัสดุมาตรฐาน', 'MT'],
  ['staff', 'บุคลากรควบคุมงาน', 'ST'], ['doc', 'งานแบบและเอกสาร', 'DC'], ['trans', 'เดินทางและขนส่ง', 'TR'], ['tool', 'เครื่องมือและอุปกรณ์', 'TL'],
  ['site', 'ค่าใช้จ่ายหน้างาน', 'SI'], ['prot', 'งานป้องกันและตัวอย่าง', 'PT'], ['other', 'อื่น ๆ', 'OT']];
const UNITS = ['คน-วัน', 'วัน', 'เดือน', 'เที่ยว', 'ตร.ม.', 'ม.', 'แผ่น', 'ชิ้น', 'ชุด', 'ตัว', 'จุด', 'บาน', 'ครั้ง', 'เหมา'];
const SRCS = [['quote', 'ใบเสนอราคาผู้ขาย'], ['actual', 'ต้นทุนจริงโครงการ'], ['est', 'ประมาณการ QS'], ['contract', 'ราคาสัญญา / BOQ']];
const STEPS = [['qs', 'QS ตรวจ', ['qs', 'qs_mgr']], ['dir', 'Director อนุมัติ', ['director']], ['adm', 'Admin เผยแพร่', ['superadmin']]];
const RST = { qs: ['รอ QS ตรวจ', '#FAF1D6', '#8A6D10'], dir: ['รอ Director อนุมัติ', '#FAF1D6', '#8A6D10'], adm: ['รอ Admin เผยแพร่', '#E1EEF4', '#2A7DA3'],
  pub: ['เผยแพร่แล้ว', '#E6EFE0', '#2E7D46'], rej: ['ส่งกลับ', '#FBEDE9', '#B4442E'], cancel: ['ยกเลิก', '#ECEAE4', '#8A8375'] };
const FIELDS = ['g', 'n', 'spec', 'u', 'mat', 'lab', 'rate', 't', 'eff', 'rev', 'src', 'srcNote', 'st'];
const FL = { g: 'หมวด', n: 'รายการ', spec: 'สเปก / เกรด', u: 'หน่วย', mat: 'ค่าวัสดุ', lab: 'ค่าแรง', rate: 'ราคา / หน่วย', t: 'คิดตามเวลา', eff: 'วันที่มีผล', rev: 'วันทบทวน', src: 'แหล่งที่มา', srcNote: 'หมายเหตุแหล่งที่มา', st: 'สถานะ' };

const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').trim().toLowerCase();
const pad = (n, w) => String(n).padStart(w || 2, '0');
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[,฿\s]/g, '')); return isFinite(n) ? n : 0; };
const has = (v) => String(v == null ? '' : v).trim() !== '' && isFinite(parseFloat(String(v).replace(/[,฿\s]/g, '')));
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const f2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const baht = (n) => '฿' + f2(n);
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = (p) => (p || 'pb') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const dmy = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
const dmyhm = (t) => { if (!t) return ''; const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const addYear = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (Number(m[1]) + 1) + '-' + m[2] + '-' + m[3] : ''; };
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const rowOf = (r) => ({ ...(r.data || {}), id: r.id });
const grp = (k) => GROUPS.find(g => g[0] === k) || GROUPS[GROUPS.length - 1];
const srcL = (k) => (SRCS.find(s => s[0] === k) || ['', ''])[1];
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
const myUrl = (q) => location.origin + '/pricebook.html?' + (q || '') + (IS_STG ? (q ? '&' : '') + 'env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }

const APP = { me: null, acc: null, accounts: [], pb: null, reqs: [], rc: {}, tab: 'list', q: '', g: '', stf: 'on', edit: null, imp: null, busy: false };

// ---------- กล่องถาม ----------
function dlg(o) { return new Promise((res) => { const b = $('dlgBox');
  b.innerHTML = `<b>${esc(o.title || '')}</b>${o.text ? `<div class="mut" style="white-space:pre-line">${esc(o.text)}</div>` : ''}${o.html || ''}
    <div class="ac">${o.cancel === false ? '' : `<button class="btn sm" data-d="no">${esc(o.cancel || 'ยกเลิก')}</button>`}${o.ok === false ? '' : `<button class="btn sm ${o.bad ? 'bad' : 'pri'}" data-d="ok">${esc(o.ok || 'ตกลง')}</button>`}</div>`;
  $('dlg').hidden = false; b.classList.toggle('wide', !!o.wide);
  const done = (v) => { $('dlg').hidden = true; b.onclick = null; res(v); };
  b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (!d) return; if (d.dataset.d !== 'ok') return done(null); if (o.collect) { const v = o.collect(); if (v === false) return; return done(v); } done(true); }; }); }
const ask = (title, text, ok, bad) => dlg({ title, text, ok, bad });

// ---------- ข้อมูล ----------
async function stGet(id) { const r = await sb.from('app_state').select('data').eq('id', id).maybeSingle(); if (r.error) throw r.error; return (r.data && r.data.data && r.data.data.v) || null; }
async function stSet(id, v) { const r = await sb.from('app_state').upsert([{ id, data: { v }, updated_by: APP.me.email }], { onConflict: 'id' }); if (r.error) throw r.error; }
// ย้ายจากอัตรากลางเดิม (ครั้งแรก): ค่าแรงช่าง + รายการทุกหมวด · ใส่รหัสให้ตามหมวด · id เดิมคงไว้ (ใบเก่า / Claim อ้าง id เดิม)
function fromRates(rc) { const items = [], seq = {};
  const code = (g) => { const p = grp(g)[2]; seq[p] = (seq[p] || 0) + 1; return p + '-' + pad(seq[p], 3); };
  (Array.isArray(rc.trades) ? rc.trades : []).forEach(x => { if (!x || !String(x.n || '').trim()) return;
    items.push({ id: 'tr:' + String(x.n).trim(), code: x.code || code('labor'), kind: 'trade', g: 'labor', n: String(x.n).trim(), spec: '', u: 'คน-วัน', mat: '', lab: '', rate: num(x.rate) > 0 ? num(x.rate) : '', t: false, eff: '', rev: '', src: '', srcNote: '', st: 'on' }); });
  (Array.isArray(rc.items) ? rc.items : []).forEach(x => { if (!x || !String(x.n || '').trim()) return; const g = GROUPS.some(k => k[0] === x.g) ? x.g : 'other';
    items.push({ id: x.id || uid('ri'), code: x.code || code(g), kind: 'item', g, n: String(x.n).trim(), spec: x.spec || '', u: x.u || 'เหมา', mat: has(x.mat) ? num(x.mat) : '', lab: has(x.lab) ? num(x.lab) : '', rate: num(x.rate) > 0 ? num(x.rate) : '', t: !!x.t, eff: x.eff || '', rev: x.rev || '', src: x.src || '', srcNote: '', st: 'on' }); });
  return { ver: 0, eff: '', mig: true, cfg: { ohp: has(rc.ohp) ? num(rc.ohp) : '', ot: rc.ot || {} }, items, hist: [] }; }
async function load() { const [pb, rq, rc] = await Promise.all([stGet(KEY), stGet(RKEY), stGet(RC_KEY)]);
  APP.rc = rc || {}; APP.pb = pb && Array.isArray(pb.items) ? pb : fromRates(APP.rc); APP.reqs = (rq && Array.isArray(rq.reqs)) ? rq.reqs : []; }
async function writeReqs(fn) { const cur = (await stGet(RKEY)) || {}; const reqs = Array.isArray(cur.reqs) ? cur.reqs : []; const out = fn(reqs) || reqs; await stSet(RKEY, { reqs: out.slice(0, 300) }); APP.reqs = out; }

// ---------- สิทธิ์ ----------
const role = () => APP.me.role;
const isAdmin = () => role() === 'superadmin';
const actv = () => APP.accounts.filter(a => a && a.email && a.active !== false && !a.disabled);
const roleEmails = (R) => actv().filter(a => R.includes(a.roleKey)).map(a => norm(a.email));
const dirExists = () => roleEmails(['director']).length > 0;
function canStep(r) { if (!['qs', 'dir', 'adm'].includes(r.st)) return false; const me = role();
  if (r.st === 'qs') return ['qs', 'qs_mgr'].includes(me) || isAdmin();
  if (r.st === 'dir') return me === 'director' || (isAdmin() && !dirExists());
  return isAdmin(); }
const stepOf = (k) => STEPS.find(s => s[0] === k);
function nextApprovers(st) { const s = stepOf(st); if (!s) return []; const L = roleEmails(s[2]); return L.length ? L : roleEmails(['superadmin']); }

// ---------- แจ้งเตือน (ระบบแท็กเดียวกับแอปหลัก) ----------
async function notify(r, o) { if (!window.WCTag) return;
  try { await WCTag.close({ app: TAG_APP, ref_type: 'pbreq', ref_id: r.id });
    const ap = [...new Set((o.approve || []).filter(e => e && e !== APP.me.email))], to = [...new Set((o.to || []).filter(e => e && e !== APP.me.email && !ap.includes(e)))];
    if (ap.length || to.length) await WCTag.send({ app: TAG_APP, project: null, ref_type: 'pbreq', ref_id: r.id, title: o.title, note: o.note || '', url: myUrl('req=' + encodeURIComponent(r.id)), to, approve: ap });
  } catch (e) { console.warn(e); } }

// ---------- เปรียบเทียบ ----------
const valOf = (it, f) => f === 't' ? !!it[f] : f === 'st' ? (it.st === 'off' ? 'off' : 'on') : ['mat', 'lab', 'rate'].includes(f) ? (has(it[f]) ? r2(num(it[f])) : '') : String(it[f] == null ? '' : it[f]).trim();
const same = (a, b) => FIELDS.every(f => valOf(a, f) === valOf(b, f));
function diffItems(cur, next) { const rows = [], byId = new Map(cur.map(x => [x.id, x]));
  next.forEach(x => { const b = byId.get(x.id); if (!b) rows.push({ op: 'add', id: x.id, code: x.code || '', before: null, after: pick(x) });
    else if (!same(b, x)) rows.push({ op: valOf(x, 'st') === 'off' && valOf(b, 'st') === 'on' && FIELDS.filter(f => f !== 'st').every(f => valOf(b, f) === valOf(x, f)) ? 'off' : 'chg', id: x.id, code: b.code, before: pick(b), after: pick(x) }); });
  return rows; }
const pick = (x) => { const o = { kind: x.kind || (x.g === 'labor' ? 'trade' : 'item') }; FIELDS.forEach(f => { o[f] = valOf(x, f); }); return o; };
const pct = (a, b) => has(a) && num(a) > 0 && has(b) ? r2((num(b) - num(a)) / num(a) * 100) : null;
const fmtV = (f, v) => f === 't' ? (v ? 'ใช่' : 'ไม่') : f === 'st' ? (v === 'off' ? 'เลิกใช้' : 'ใช้อยู่') : f === 'g' ? grp(v)[1] : f === 'src' ? srcL(v) : ['eff', 'rev'].includes(f) ? dmy(v) : ['mat', 'lab', 'rate'].includes(f) ? (has(v) ? f2(v) : '—') : (v || '—');
const cfgSame = (a, b) => JSON.stringify(normCfg(a)) === JSON.stringify(normCfg(b));
const normCfg = (c) => { c = c || {}; const o = c.ot || {}; return { ohp: has(c.ohp) ? num(c.ohp) : '', ot: { hours: has(o.hours) ? num(o.hours) : '', m1: has(o.m1) ? num(o.m1) : '', m2: has(o.m2) ? num(o.m2) : '', m3: has(o.m3) ? num(o.m3) : '' } }; };

// =====================================================================
// เริ่มต้น
// =====================================================================
function msg(t, s) { $('app').innerHTML = `<div class="wrap" style="max-width:560px;margin-top:40px"><div class="card"><b style="font-size:17px">${t}</b><span class="mut">${s || ''}</span><a class="btn pri" href="${pmUrl()}">กลับ Wellcon PM</a></div></div>`; }
async function boot() {
  try {
    let sso = ''; try { if (window.WCTag && /[?&]wsso=/.test(location.search)) sso = (await WCTag.ssoTake(sb)) || ''; } catch (e) {}
    if (sso) { try { localStorage.setItem(SESS_KEY, JSON.stringify({ email: sso, at: Date.now() })); } catch (e) {} }
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เปิด Wellcon PM และเข้าสู่ระบบก่อน แล้วกดการ์ด “ราคากลาง”'); return; }
    const [a, st] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('app_state').select('id,data').in('id', ['featGlobal', 'workPages', 'workUser', 'workUserAdd'])]);
    if (a.error) throw a.error;
    APP.accounts = (a.data || []).map(rowOf);
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && APP.accounts.find(x => norm(x.email) === norm(sess.email) && x.active !== false && !x.disabled);
    if (!acc) { msg('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วกดการ์ด “ราคากลาง”'); return; }
    APP.acc = acc; APP.me = { name: nickOf(acc), full: acc.name || nickOf(acc), email: norm(acc.email), role: acc.roleKey || '' };
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'pbook' }).then(() => {}, () => {}); } catch (e) {}
    const sv = (id) => { const r = ((!st.error && st.data) || []).find(x => x.id === id); return (r && r.data && r.data.v) || {}; };
    const FG = sv('featGlobal'), WP = sv('workPages'), WU = sv('workUser'), WUA = sv('workUserAdd');
    if (FG[TAB] === false && !isAdmin()) { msg('ผู้ดูแลระบบปิด “ราคากลาง” ไว้', 'ถ้าต้องการใช้งาน แจ้ง Admin เปิดที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง'); return; }
    const roleCards = Array.isArray(WP[role()]) ? WP[role()] : (DEF_ROLES.includes(role()) ? [TAB] : []);
    const mine = [...(Array.isArray(WU[APP.me.email]) ? WU[APP.me.email] : []), ...(Array.isArray(WUA[APP.me.email]) ? WUA[APP.me.email] : [])];
    if (!isAdmin() && ![...roleCards, ...mine].includes(TAB)) { msg('หน้านี้ยังไม่ได้เปิดให้ตำแหน่งของคุณ', 'ราคากลางมีราคาเรียกเก็บลูกค้า — Admin เปิดให้ได้ที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง (ตามตำแหน่ง หรือรายคน)'); return; }
    if (window.WCTag) WCTag.setup({ sb, app: TAG_APP, me: APP.me, accounts: actv(), projects: [] });
    await load();
    const P = new URLSearchParams(location.search); if (P.get('req')) { APP.tab = 'req'; render(); openReq(P.get('req')); return; }
    render();
  } catch (e) { console.error(e); msg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', esc((e && e.message) || e)); }
}

// =====================================================================
// หน้าจอ
// =====================================================================
const pending = () => APP.reqs.filter(r => ['qs', 'dir', 'adm'].includes(r.st));
const mineToDo = () => pending().filter(canStep);
const overdue = (x) => x.st !== 'off' && x.rev && x.rev < today();
function hdr() { const pb = APP.pb;
  return `<div class="hdr"><div class="tt"><b>ราคากลาง</b><span>${pb.ver ? 'ฉบับที่ ' + pb.ver + (pb.eff ? ' · มีผล ' + dmy(pb.eff) : '') + (pb.pubBy ? ' · เผยแพร่โดย ' + esc(pb.pubBy) : '') : 'ข้อมูลตั้งต้นจากอัตรากลางเดิม — ยังไม่เคยเผยแพร่เป็นราคากลาง'}</span></div></div>`; }
function render() { if (!APP.pb) return; const P = pending().length, T = mineToDo().length;
  $('app').innerHTML = hdr() + (IS_STG ? '<div class="stg">ข้อมูลทดสอบ (staging) — ไม่กระทบข้อมูลจริง</div>' : '') + `<div class="body"><div class="wrap">
    <div class="tabs">${[['list', '📒 รายการราคา'], ['req', '📝 คำขอแก้ไข' + (P ? ` <i>${P}</i>` : '')], ['hist', '🕘 ประวัติ']].map(t => `<button class="tb${APP.tab === t[0] ? ' on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${T ? `<div class="warn">มีคำขอแก้ไขรอคุณ ${T} รายการ — <a href="#" data-tab="req">เปิดดู</a></div>` : ''}
    <div id="view"></div>
    <p class="mut" style="text-align:center">ราคากลาง = ราคาเรียกเก็บลูกค้า ไม่รวม VAT · ฐานเริ่มต้นการคุยราคา (ปรับตามเงื่อนไขงานได้ในใบเสนอราคา) · ทุกการเปลี่ยนผ่าน QS → Director → Admin · ราคากลาง ${PB_VER}</p></div></div>`;
  if (APP.tab === 'list') renderList(); else if (APP.tab === 'req') renderReqs(); else renderHist(); }

// ---------- รายการราคา ----------
function filtered(L) { const t = norm(APP.q); return L.filter(x => (!APP.g || x.g === APP.g) && (APP.stf === 'all' || (APP.stf === 'off' ? x.st === 'off' : APP.stf === 'due' ? overdue(x) || (x.st !== 'off' && !x.rev) : x.st !== 'off')) && (!t || norm([x.code, x.n, x.spec, x.u, grp(x.g)[1]].join(' ')).includes(t))); }
const sorted = (L) => L.slice().sort((a, b) => GROUPS.findIndex(g => g[0] === a.g) - GROUPS.findIndex(g => g[0] === b.g) || String(a.code).localeCompare(String(b.code), 'en', { numeric: true }));
function renderList() { const pb = APP.pb, E = APP.edit, L = E ? E.items : pb.items; const all = L.filter(x => x.st !== 'off');
  const nDue = pb.items.filter(x => overdue(x)).length, nNoRev = pb.items.filter(x => x.st !== 'off' && !x.rev).length, nNo = all.filter(x => !has(x.rate)).length;
  const cfg = normCfg(E ? E.cfg : pb.cfg);
  const opt = (L2, v, ph) => (ph ? `<option value="">${ph}</option>` : '') + L2.map(o => `<option value="${esc(o[0])}"${v === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('');
  const rows = sorted(filtered(L));
  const cell = (x, f, w) => { if (!E) return '';
    if (f === 'g') return `<select data-f="g" data-id="${esc(x.id)}"${x.kind === 'trade' ? ' disabled' : ''}>${opt(GROUPS.filter(g => x.kind === 'trade' ? g[0] === 'labor' : g[0] !== 'labor'), x.g)}</select>`;
    if (f === 'src') return `<select data-f="src" data-id="${esc(x.id)}">${opt(SRCS, x.src, '—')}</select>`;
    if (f === 'st') return `<select data-f="st" data-id="${esc(x.id)}">${opt([['on', 'ใช้อยู่'], ['off', 'เลิกใช้']], x.st === 'off' ? 'off' : 'on')}</select>`;
    if (f === 't') return `<input type="checkbox" data-f="t" data-id="${esc(x.id)}"${x.t ? ' checked' : ''}>`;
    if (f === 'eff' || f === 'rev') return `<input type="date" data-f="${f}" data-id="${esc(x.id)}" value="${esc(x[f] || '')}">`;
    if (f === 'u') return `<input data-f="u" data-id="${esc(x.id)}" list="unitL" value="${esc(x.u)}" style="width:${w || 80}px">`;
    return `<input data-f="${f}" data-id="${esc(x.id)}" value="${esc(x[f])}"${['mat', 'lab', 'rate'].includes(f) ? ' inputmode="decimal" class="num"' : ''} style="width:${w || 90}px">`; };
  const chg = (x) => { if (!E) return false; const b = pb.items.find(y => y.id === x.id); return !b || !same(b, x); };
  $('view').innerHTML = `
    ${!E && (nDue || nNoRev || nNo) ? `<div class="warn">${[nDue ? nDue + ' รายการเลยวันทบทวนแล้ว' : '', nNoRev ? nNoRev + ' รายการยังไม่มีวันทบทวน' : '', nNo ? nNo + ' รายการยังไม่ใส่ราคา' : ''].filter(Boolean).join(' · ')} — ราคาเปลี่ยนตามเวลา ควรทบทวนและส่งคำขอแก้ไข</div>` : ''}
    ${pb.mig && !E ? '<div class="info">ตอนนี้แสดงข้อมูลจาก “อัตรากลาง” เดิม (ใส่รหัสให้แล้ว) — คำขอแก้ไขแรกที่เผยแพร่จะสร้างราคากลางฉบับที่ 1 · ระบบเดิมยังใช้ราคาชุดนี้ตามปกติ</div>' : ''}
    <div class="card">
      <div class="bar">
        <input id="q" type="search" placeholder="ค้นหา รหัส / รายการ / สเปก" value="${esc(APP.q)}">
        <select id="gsel">${opt(GROUPS, APP.g, 'ทุกหมวด')}</select>
        <select id="stsel">${opt([['on', 'ใช้อยู่'], ['due', 'ถึงรอบทบทวน / ไม่มีวันทบทวน'], ['off', 'เลิกใช้'], ['all', 'ทั้งหมด']], APP.stf)}</select>
        <span class="sp"></span>
        ${E ? `<button class="btn sm" data-act="addRow">＋ เพิ่มรายการ</button><button class="btn sm" data-act="addTrade">＋ เพิ่มช่าง</button>`
      : `<button class="btn sm" data-act="xlsOut">⬇ ดาวน์โหลด Excel</button><button class="btn sm" data-act="xlsIn">⬆ นำเข้า Excel</button><button class="btn sm dk" data-act="edit">✏️ แก้ไขในหน้านี้</button>`}
        <input id="xf" type="file" accept=".xlsx" hidden>
      </div>
      ${E ? `<div class="info">โหมดแก้ไข — การแก้ยังไม่มีผลกับระบบ จนกว่าคำขอจะผ่าน QS → Director → Admin · แถวสีเหลือง = แก้แล้ว · เลิกใช้รายการ: เปลี่ยนสถานะเป็น “เลิกใช้” (ไม่ลบ เพื่อให้ใบเก่าอ้างอิงได้)</div>` : ''}
      <div class="tbw"><table class="pt"><thead><tr><th>รหัส</th><th>หมวด</th><th>รายการ / สเปก</th><th>หน่วย</th><th class="r">วัสดุ</th><th class="r">ค่าแรง</th><th class="r">ราคา / หน่วย</th><th>คิดตามเวลา</th><th>มีผล</th><th>ทบทวน</th><th>แหล่งที่มา</th><th>สถานะ</th></tr></thead><tbody>
      ${rows.map(x => E ? `<tr class="${chg(x) ? 'chg' : ''}"><td class="cd">${esc(x.code || 'ใหม่')}</td><td>${cell(x, 'g')}</td><td>${cell(x, 'n', 220)}<br>${cell(x, 'spec', 220)}</td><td>${cell(x, 'u')}</td><td>${cell(x, 'mat', 84)}</td><td>${cell(x, 'lab', 84)}</td><td>${cell(x, 'rate', 96)}</td><td class="c">${x.kind === 'trade' ? '' : cell(x, 't')}</td><td>${cell(x, 'eff')}</td><td>${cell(x, 'rev')}</td><td>${cell(x, 'src')}<br>${cell(x, 'srcNote', 130)}</td><td>${cell(x, 'st')}</td></tr>`
      : `<tr class="${x.st === 'off' ? 'off' : ''}"><td class="cd">${esc(x.code)}</td><td>${esc(grp(x.g)[1])}</td><td><b>${esc(x.n)}</b>${x.spec ? `<small>${esc(x.spec)}</small>` : ''}</td><td>${esc(x.u)}</td><td class="r">${has(x.mat) ? f2(x.mat) : '—'}</td><td class="r">${has(x.lab) ? f2(x.lab) : '—'}</td><td class="r"><b>${has(x.rate) ? f2(x.rate) : '<span class="bad">ยังไม่ใส่</span>'}</b></td><td class="c">${x.t ? '✓' : ''}</td><td>${dmy(x.eff) || '—'}</td><td class="${overdue(x) ? 'bad' : ''}">${dmy(x.rev) || '<span class="mut">—</span>'}</td><td>${esc(srcL(x.src)) || '—'}${x.srcNote ? `<small>${esc(x.srcNote)}</small>` : ''}</td><td>${x.st === 'off' ? '<span class="pill off">เลิกใช้</span>' : '<span class="pill on">ใช้อยู่</span>'}</td></tr>`).join('') || '<tr><td colspan="12" class="empty">ไม่พบรายการ</td></tr>'}
      </tbody></table></div>
      <div class="mut">${rows.length} จาก ${L.length} รายการ · ราคาเรียกเก็บลูกค้า ไม่รวม VAT</div>
    </div>
    <div class="card"><div class="h">ค่าตั้งต้น<small>ใช้กับ Quotation Maker · Claim · OT ในรายงานประจำวัน</small></div>
      <div class="grid">${[['ohp', 'OH&P ค่าเริ่มต้น (%)', cfg.ohp], ['ot.hours', 'ชั่วโมงทำงานต่อวัน (ใช้คิด OT)', cfg.ot.hours], ['ot.m1', 'ตัวคูณ OT วันทำงานปกติ', cfg.ot.m1], ['ot.m2', 'ตัวคูณ ทำงานวันหยุด', cfg.ot.m2], ['ot.m3', 'ตัวคูณ ล่วงเวลาในวันหยุด', cfg.ot.m3]]
        .map(c => `<label class="f"><span>${c[1]}</span>${E ? `<input data-cfg="${c[0]}" inputmode="decimal" value="${esc(c[2])}">` : `<b>${has(c[2]) ? esc(c[2]) : '—'}</b>`}</label>`).join('')}</div></div>
    ${E ? `<div class="sticky"><span class="mut" id="chgN"></span><span class="sp"></span><button class="btn" data-act="editCancel">ยกเลิก</button><button class="btn pri" data-act="editSubmit">ส่งคำขอแก้ไข</button></div>` : ''}`;
  if (!$('unitL')) { const d = document.createElement('datalist'); d.id = 'unitL'; d.innerHTML = UNITS.map(u => `<option value="${u}">`).join(''); document.body.appendChild(d); }
  if (E) editCount(); }
function editCount() { const E = APP.edit; if (!E || !$('chgN')) return; const n = diffItems(APP.pb.items, E.items).length + (cfgSame(APP.pb.cfg, E.cfg) ? 0 : 1); $('chgN').textContent = n ? 'แก้แล้ว ' + n + ' จุด' : 'ยังไม่ได้แก้'; }
function startEdit() { APP.edit = { items: clone(APP.pb.items), cfg: clone(normCfg(APP.pb.cfg)) }; renderList(); }
function addRow(kind) { const E = APP.edit; if (!E) return; const g = kind === 'trade' ? 'labor' : (APP.g && APP.g !== 'labor' ? APP.g : 'other');
  E.items.push({ id: uid(kind === 'trade' ? 'tn' : 'ri'), code: '', kind, g, n: '', spec: '', u: kind === 'trade' ? 'คน-วัน' : '', mat: '', lab: '', rate: '', t: false, eff: today(), rev: addYear(today()), src: '', srcNote: '', st: 'on' });
  APP.q = ''; APP.stf = 'on'; if (APP.g && APP.g !== g) APP.g = ''; renderList(); const L = document.querySelectorAll('#view tbody tr'); const tr = L[L.length - 1]; if (tr) { tr.scrollIntoView({ block: 'center' }); const i = tr.querySelector('[data-f="n"]'); if (i) i.focus(); } }

// ---------- ส่งคำขอแก้ไข ----------
function validate(items) { const E = []; const codes = new Map();
  items.forEach(x => { if (x.st === 'off') return; const lab = x.code || 'รายการใหม่';
    if (!String(x.n || '').trim()) E.push(lab + ': ยังไม่ใส่ชื่อรายการ'); if (!String(x.u || '').trim()) E.push(lab + ' ' + (x.n || '') + ': ยังไม่ใส่หน่วย');
    if (has(x.rate) && num(x.rate) < 0) E.push(lab + ': ราคาติดลบ');
    if (x.code) { if (codes.has(x.code)) E.push('รหัสซ้ำ ' + x.code); codes.set(x.code, 1); } });
  return E; }
async function submitReq(next, nextCfg, meta) { const rows = diffItems(APP.pb.items, next); const cfgChg = cfgSame(APP.pb.cfg, nextCfg) ? null : { before: normCfg(APP.pb.cfg), after: normCfg(nextCfg) };
  if (!rows.length && !cfgChg) { toast('ยังไม่มีสิ่งที่เปลี่ยน'); return false; }
  const errs = validate(next); if (errs.length) { await dlg({ title: 'ยังส่งคำขอไม่ได้', text: errs.slice(0, 12).join('\n'), cancel: false, ok: 'กลับไปแก้' }); return false; }
  const v = await dlg({ title: 'ส่งคำขอแก้ไขราคากลาง', text: rows.length + ' รายการ' + (cfgChg ? ' + ค่าตั้งต้น' : '') + ' — ผ่าน QS ตรวจ → Director อนุมัติ → Admin เผยแพร่ ก่อนมีผลกับทุกระบบ',
    html: `<label class="f"><span>เรื่อง</span><input id="rqT" maxlength="120" value="${esc(meta.title || '')}"></label><label class="f"><span>วันที่มีผล (เมื่อเผยแพร่)</span><input id="rqE" type="date" value="${today()}"></label><label class="f"><span>เหตุผล / ที่มา</span><textarea id="rqN" maxlength="600" placeholder="เช่น ปรับตามใบเสนอราคาผู้ขาย 3 ราย เดือน พ.ย. 2569 · ราคาไม้อัดขึ้น 8%"></textarea></label>`,
    ok: 'ส่งคำขอ', collect: () => { const t = $('rqT').value.trim(); if (!t) { toast('ใส่เรื่องก่อน'); return false; } return { title: t, eff: $('rqE').value || today(), note: $('rqN').value.trim() }; } });
  if (!v) return false;
  const isQs = ['qs', 'qs_mgr'].includes(role()); const now = Date.now(); const d = new Date();
  const r = { id: uid('pq'), no: '', title: v.title, note: v.note, eff: v.eff, src: meta.src || 'edit', fileName: meta.fileName || '', by: APP.me.name, byEmail: APP.me.email, byRole: role(), at: now, baseVer: APP.pb.ver || 0,
    rows, cfg: cfgChg, st: isQs ? 'dir' : 'qs', steps: isQs ? { qs: { by: APP.me.name, email: APP.me.email, at: now, note: 'QS เป็นผู้ส่งคำขอ' } } : {}, log: [{ at: now, by: APP.me.name, act: 'ส่งคำขอ', note: v.note }] };
  APP.busy = true;
  try { await writeReqs((L) => { const pre = 'PB-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + '-'; const mx = L.filter(x => String(x.no || '').startsWith(pre)).reduce((m, x) => Math.max(m, Number(String(x.no).slice(pre.length)) || 0), 0); r.no = pre + pad(mx + 1, 3); return [r, ...L]; });
    await notify(r, { title: 'ขออนุมัติราคากลาง ' + r.no + ' · ' + r.title, note: rows.length + ' รายการ' + (cfgChg ? ' + ค่าตั้งต้น' : ''), approve: nextApprovers(r.st) });
    toast('ส่งคำขอ ' + r.no + ' แล้ว — ' + RST[r.st][0], 4000); APP.busy = false; return r;
  } catch (e) { console.error(e); toast('ส่งคำขอไม่สำเร็จ: ' + ((e && e.message) || e), 5000); APP.busy = false; return false; } }

// ---------- คำขอแก้ไข ----------
const stTag = (s) => { const x = RST[s] || RST.qs; return `<span class="st" style="background:${x[1]};color:${x[2]}">${x[0]}</span>`; };
function renderReqs() { const L = APP.reqs.slice().sort((a, b) => (['qs', 'dir', 'adm'].includes(b.st) - ['qs', 'dir', 'adm'].includes(a.st)) || (b.at - a.at));
  $('view').innerHTML = `<div class="card"><div class="h">คำขอแก้ไขราคากลาง<small>QS ตรวจ → Director อนุมัติ → Admin เผยแพร่</small></div>
    ${L.length ? L.map(r => `<button class="rq" data-req="${esc(r.id)}"><span class="m"><b>${esc(r.no)} · ${esc(r.title)}</b><small>${esc(r.by)} · ${dmyhm(r.at)} · ${r.rows.length} รายการ${r.cfg ? ' + ค่าตั้งต้น' : ''}${r.src === 'excel' ? ' · จาก Excel' : ''}</small></span>${canStep(r) ? '<span class="st" style="background:#C9A961;color:#1C1B18">รอคุณ</span>' : ''}${stTag(r.st)}</button>`).join('') : '<p class="empty">ยังไม่มีคำขอแก้ไข</p>'}</div>`; }
function rowsTable(rows) { const H = [];
  rows.forEach(w => { const a = w.after || {}, b = w.before || {}; const fs = w.op === 'add' ? ['g', 'u', 'rate', 'eff', 'src'] : FIELDS.filter(f => fmtV(f, b[f]) !== fmtV(f, a[f]));
    const p = w.op === 'chg' ? pct(b.rate, a.rate) : null; const cls = p == null ? '' : Math.abs(p) >= 50 ? 'big' : Math.abs(p) >= 20 ? 'mid' : '';
    H.push(`<tr class="${cls}"><td><span class="op op-${w.op}">${{ add: 'ใหม่', chg: 'แก้', off: 'เลิกใช้' }[w.op]}</span></td><td class="cd">${esc(w.code || 'ใหม่')}</td><td><b>${esc(a.n || b.n)}</b>${(a.spec || b.spec) ? `<small>${esc(a.spec || b.spec)}</small>` : ''}</td>
      <td>${fs.map(f => `<div class="fd"><span>${FL[f]}</span> ${w.op === 'add' ? '' : `<s>${esc(fmtV(f, b[f]))}</s> → `}<b>${esc(fmtV(f, a[f]))}</b>${f === 'rate' && p != null ? ` <i class="pc">${p > 0 ? '+' : ''}${p}%</i>` : ''}</div>`).join('')}</td></tr>`); });
  return `<div class="tbw"><table class="pt df"><thead><tr><th></th><th>รหัส</th><th>รายการ</th><th>สิ่งที่เปลี่ยน</th></tr></thead><tbody>${H.join('')}</tbody></table></div>`; }
function openReq(id) { const r = APP.reqs.find(x => x.id === id); if (!r) { toast('ไม่พบคำขอนี้'); return; } APP.tab = 'req';
  const stepH = STEPS.map(s => { const d = (r.steps || {})[s[0]]; const cur = r.st === s[0]; return `<div class="sp2 ${d ? 'done' : cur ? 'cur' : ''}"><i>${d ? '✓' : STEPS.indexOf(s) + 1}</i><b>${s[1]}</b><small>${d ? esc(d.by) + ' · ' + dmyhm(d.at) : cur ? 'รอ ' + esc(nextApprovers(s[0]).map(e => nickOf(APP.accounts.find(a => norm(a.email) === e)) || e).join(', ')) : ''}</small></div>`; }).join('');
  const B = []; if (canStep(r)) { B.push('<button class="btn bad" data-ract="rej">ส่งกลับ</button>', `<button class="btn ${r.st === 'adm' ? 'gold' : 'ok'}" data-ract="ok">${r.st === 'qs' ? '✓ QS ตรวจแล้ว' : r.st === 'dir' ? '✓ อนุมัติ' : '🚀 เผยแพร่ราคากลาง'}</button>`); }
  if (norm(r.byEmail) === APP.me.email && ['qs', 'dir', 'adm', 'rej'].includes(r.st)) B.unshift('<button class="btn" data-ract="cancel">ยกเลิกคำขอ</button>');
  $('view').innerHTML = `<div class="card"><div class="h"><button class="btn sm" data-tab="req">‹ คำขอทั้งหมด</button><span class="sp"></span>${stTag(r.st)}</div>
    <div><b style="font-size:17px">${esc(r.no)} · ${esc(r.title)}</b><div class="mut">${esc(r.by)} · ${dmyhm(r.at)} · มีผลเมื่อเผยแพร่: ${dmy(r.eff)}${r.fileName ? ' · ไฟล์ ' + esc(r.fileName) : ''}</div>${r.note ? `<div style="white-space:pre-line;margin-top:4px">${esc(r.note)}</div>` : ''}</div>
    <div class="steps">${stepH}</div>
    ${r.st === 'rej' ? `<div class="warn bad"><b>ส่งกลับ:</b> ${esc(r.rejNote || '')} — ${esc(r.rejBy || '')}</div>` : ''}
    ${r.st === 'adm' && (r.baseVer || 0) !== (APP.pb.ver || 0) ? `<div class="warn">ราคากลางถูกเผยแพร่ฉบับใหม่หลังส่งคำขอนี้ (ฉบับ ${r.baseVer || 0} → ${APP.pb.ver}) — ระบบจะตรวจรายการที่ชนกันตอนเผยแพร่</div>` : ''}
    ${r.cfg ? `<div class="info"><b>ค่าตั้งต้น:</b> ${cfgLines(r.cfg).join(' · ')}</div>` : ''}
    ${r.rows.length ? rowsTable(r.rows) : ''}
    <div class="log">${(r.log || []).slice().reverse().map(l => `<div>${dmyhm(l.at)} · <b>${esc(l.by)}</b> ${esc(l.act)}${l.note ? ' — ' + esc(l.note) : ''}</div>`).join('')}</div>
    <div class="acts">${B.join('')}</div></div>`;
  $('view').dataset.cur = id; }
function cfgLines(c) { const a = c.after, b = c.before, L = []; const lab = { ohp: 'OH&P %', hours: 'ชม. / วัน', m1: 'OT ปกติ', m2: 'วันหยุด', m3: 'ล่วงเวลาวันหยุด' };
  if (a.ohp !== b.ohp) L.push(lab.ohp + ' ' + (b.ohp === '' ? '—' : b.ohp) + ' → ' + (a.ohp === '' ? '—' : a.ohp)); ['hours', 'm1', 'm2', 'm3'].forEach(k => { if (a.ot[k] !== b.ot[k]) L.push(lab[k] + ' ' + (b.ot[k] === '' ? '—' : b.ot[k]) + ' → ' + (a.ot[k] === '' ? '—' : a.ot[k])); }); return L; }
async function reqAct(act) { const id = $('view').dataset.cur; let r = APP.reqs.find(x => x.id === id); if (!r || APP.busy) return;
  if (act === 'cancel') { if (!(await ask('ยกเลิกคำขอ ' + r.no + '?', 'คำขอที่ยกเลิกยังอยู่ในประวัติ', 'ยกเลิกคำขอ', true))) return;
    return mut(id, (z) => { z.st = 'cancel'; z.log.push({ at: Date.now(), by: APP.me.name, act: 'ยกเลิกคำขอ' }); }, null, 'ยกเลิกแล้ว'); }
  if (act === 'rej') { const v = await dlg({ title: 'ส่งกลับคำขอ ' + r.no, html: '<textarea id="rjN" placeholder="เหตุผล (ต้องใส่)"></textarea>', ok: 'ส่งกลับ', bad: true, collect: () => { const t = $('rjN').value.trim(); if (!t) { toast('ใส่เหตุผลก่อน'); return false; } return t; } }); if (!v) return;
    return mut(id, (z) => { z.st = 'rej'; z.rejBy = APP.me.name; z.rejNote = v; z.log.push({ at: Date.now(), by: APP.me.name, act: 'ส่งกลับ', note: v }); }, (z) => notify(z, { title: 'ส่งกลับคำขอราคากลาง ' + z.no, note: v, to: [norm(z.byEmail)] }), 'ส่งกลับแล้ว — แจ้งผู้ส่งคำขอแล้ว'); }
  if (!canStep(r)) return;
  if (r.st === 'adm') return publish(r);
  const nx = r.st === 'qs' ? 'dir' : 'adm';
  if (!(await ask(r.st === 'qs' ? 'QS ตรวจแล้ว — ส่งต่อ Director?' : 'อนุมัติคำขอ ' + r.no + '?', r.rows.length + ' รายการ · ขั้นถัดไป: ' + stepOf(nx)[1], r.st === 'qs' ? '✓ ส่งต่อ' : '✓ อนุมัติ'))) return;
  const cur = r.st; return mut(id, (z) => { z.steps = z.steps || {}; z.steps[cur] = { by: APP.me.name, email: APP.me.email, at: Date.now() }; z.st = nx; z.log.push({ at: Date.now(), by: APP.me.name, act: stepOf(cur)[1] + ' ✓' }); },
    (z) => notify(z, { title: (nx === 'dir' ? 'ขออนุมัติราคากลาง ' : 'รอเผยแพร่ราคากลาง ') + z.no + ' · ' + z.title, note: z.rows.length + ' รายการ', approve: nextApprovers(nx), to: [norm(z.byEmail)] }), 'บันทึกแล้ว — แจ้งขั้นถัดไปแล้ว'); }
async function mut(id, fn, after, okMsg) { APP.busy = true;
  try { let out = null; await writeReqs((L) => L.map(x => { if (x.id !== id) return x; const z = clone(x); fn(z); out = z; return z; })); if (after && out) await after(out); toast(okMsg || 'บันทึกแล้ว'); render(); openReq(id); }
  catch (e) { console.error(e); toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 5000); }
  APP.busy = false; }

// ---------- เผยแพร่: ราคากลางฉบับใหม่ + อัปเดตอัตรากลางที่ระบบเดิมอ่าน ----------
async function publish(r) { APP.busy = true;
  try { const cur = await stGet(KEY); const pb = cur && Array.isArray(cur.items) ? cur : fromRates((await stGet(RC_KEY)) || {});
    const items = clone(pb.items), conflicts = [];
    r.rows.forEach(w => { if (w.op === 'add') return; const x = items.find(y => y.id === w.id); if (!x) { conflicts.push((w.code || '') + ' ไม่พบในราคากลางปัจจุบัน'); return; }
      const now = pick(x); FIELDS.forEach(f => { if (fmtV(f, w.before[f]) !== fmtV(f, w.after[f]) && fmtV(f, now[f]) !== fmtV(f, w.before[f])) conflicts.push((w.code || '') + ' ' + FL[f] + ' ถูกเปลี่ยนไปแล้วเป็น ' + fmtV(f, now[f])); }); });
    APP.busy = false;
    if (!(await ask('เผยแพร่ราคากลาง ' + r.no + '?', `ฉบับ ${pb.ver || 0} → ${(pb.ver || 0) + 1} · มีผล ${dmy(r.eff)} · ${r.rows.length} รายการ\nมีผลกับ Quotation Maker · Claim · OT ทันที (ใบเสนอราคาเก่าไม่เปลี่ยน)` + (conflicts.length ? '\n\n⚠ ชนกับฉบับที่เผยแพร่หลังส่งคำขอ:\n• ' + conflicts.slice(0, 8).join('\n• ') + '\nเผยแพร่ต่อ = ใช้ค่าในคำขอนี้' : ''), '🚀 เผยแพร่'))) return;
    APP.busy = true; const now = Date.now(), seq = {};
    items.forEach(x => { const m = String(x.code || '').match(/^([A-Z]{2})-(\d+)$/); if (m) seq[m[1]] = Math.max(seq[m[1]] || 0, Number(m[2])); });
    r.rows.forEach(w => { const a = w.after;
      if (w.op === 'add') { let code = w.code; if (!code || items.some(y => y.code === code)) { const p = grp(a.g)[2]; seq[p] = (seq[p] || 0) + 1; code = p + '-' + pad(seq[p], 3); }
        items.push({ id: w.id, code, kind: a.kind || (a.g === 'labor' ? 'trade' : 'item'), ...fromPick(a), upAt: now, upBy: APP.me.name }); return; }
      const x = items.find(y => y.id === w.id); if (!x) return; FIELDS.forEach(f => { if (fmtV(f, w.before[f]) !== fmtV(f, w.after[f])) x[f] = fromPick(a)[f]; }); x.upAt = now; x.upBy = APP.me.name; });
    const cfg = r.cfg ? r.cfg.after : normCfg(pb.cfg);
    const nv = { ver: (pb.ver || 0) + 1, eff: r.eff || today(), pubAt: now, pubBy: APP.me.name, cfg, items, hist: [{ ver: (pb.ver || 0) + 1, at: now, by: APP.me.name, eff: r.eff, req: r.id, no: r.no, title: r.title, n: { add: r.rows.filter(w => w.op === 'add').length, chg: r.rows.filter(w => w.op === 'chg').length, off: r.rows.filter(w => w.op === 'off').length, cfg: !!r.cfg } }, ...(pb.hist || [])].slice(0, 200) };
    // ภาพก่อนเผยแพร่ (ตรวจย้อนหลัง / ย้อนฉบับ) — เก็บ 20 ฉบับล่าสุด
    const H = (await stGet(HKEY)) || {}; await stSet(HKEY, { snaps: [{ ver: pb.ver || 0, at: now, eff: pb.eff || '', cfg: pb.cfg, items: pb.items }, ...(Array.isArray(H.snaps) ? H.snaps : [])].slice(0, 20) });
    await stSet(KEY, nv);
    // ระบบเดิมอ่าน 'claimRates' — เขียนเฉพาะรายการที่ใช้อยู่ ในรูปแบบเดิม (+ รหัส / สเปก / วัสดุ / ค่าแรง / วันที่มีผล)
    const rc = (await stGet(RC_KEY)) || {}, on = items.filter(x => x.st !== 'off');
    const ot = {}; ['hours', 'm1', 'm2', 'm3'].forEach(k => { if (has(cfg.ot[k])) ot[k] = num(cfg.ot[k]); });
    await stSet(RC_KEY, { ...rc, at: new Date(now).toISOString(), by: APP.me.name, pbVer: nv.ver, pbEff: nv.eff, ohp: has(cfg.ohp) ? num(cfg.ohp) : rc.ohp, ot: Object.keys(ot).length ? { ...(rc.ot || {}), ...ot } : (rc.ot || {}),
      trades: on.filter(x => x.kind === 'trade').map(x => ({ n: x.n, rate: has(x.rate) ? num(x.rate) : '', code: x.code })),
      items: on.filter(x => x.kind !== 'trade').map(x => ({ id: x.id, g: x.g, n: x.n, u: x.u, t: !!x.t, rate: has(x.rate) ? num(x.rate) : '', code: x.code, spec: x.spec || '', mat: has(x.mat) ? num(x.mat) : '', lab: has(x.lab) ? num(x.lab) : '', eff: x.eff || '' })),
      log: [{ at: new Date(now).toISOString(), by: APP.me.name, what: 'ราคากลางฉบับที่ ' + nv.ver + ' (' + r.no + ')' }, ...(Array.isArray(rc.log) ? rc.log : [])].slice(0, 50) });
    APP.pb = nv;
    await writeReqs((L) => L.map(x => x.id !== r.id ? x : { ...x, st: 'pub', pubVer: nv.ver, steps: { ...(x.steps || {}), adm: { by: APP.me.name, email: APP.me.email, at: now } }, log: [...(x.log || []), { at: now, by: APP.me.name, act: 'เผยแพร่ราคากลางฉบับที่ ' + nv.ver }] }));
    const z = APP.reqs.find(x => x.id === r.id); if (z) await notify(z, { title: 'เผยแพร่ราคากลางฉบับที่ ' + nv.ver + ' แล้ว · ' + z.no, note: z.title, to: [norm(z.byEmail)] });
    toast('เผยแพร่ราคากลางฉบับที่ ' + nv.ver + ' แล้ว — ทุกระบบใช้ราคาชุดนี้', 4500); APP.busy = false; render(); openReq(r.id);
  } catch (e) { console.error(e); toast('เผยแพร่ไม่สำเร็จ: ' + ((e && e.message) || e), 6000); APP.busy = false; } }
const fromPick = (a) => { const o = {}; FIELDS.forEach(f => { o[f] = f === 't' ? !!a[f] : f === 'st' ? (a[f] === 'off' ? 'off' : 'on') : ['mat', 'lab', 'rate'].includes(f) ? (has(a[f]) ? r2(num(a[f])) : '') : String(a[f] == null ? '' : a[f]); }); return o; };

// ---------- ประวัติ ----------
function renderHist() { const H = APP.pb.hist || [];
  $('view').innerHTML = `<div class="card"><div class="h">ประวัติการเผยแพร่<small>ทุกฉบับมีคำขอและผู้อนุมัติครบ</small></div>
    ${H.length ? H.map(h => `<button class="rq" ${h.req ? `data-req="${esc(h.req)}"` : ''}><span class="m"><b>ฉบับที่ ${h.ver} · ${esc(h.no || '')} ${esc(h.title || '')}</b><small>เผยแพร่ ${dmyhm(h.at)} · ${esc(h.by)} · มีผล ${dmy(h.eff)} · ใหม่ ${h.n.add} · แก้ ${h.n.chg} · เลิกใช้ ${h.n.off}${h.n.cfg ? ' · ค่าตั้งต้น' : ''}</small></span></button>`).join('') : '<p class="empty">ยังไม่เคยเผยแพร่ — ตอนนี้ระบบใช้ข้อมูลจากอัตรากลางเดิม</p>'}</div>`; }

// =====================================================================
// Excel: ดาวน์โหลดฟอร์ม · นำเข้า → แสดงสิ่งที่เปลี่ยน → ส่งเป็นคำขอแก้ไข
// =====================================================================
const COLS = [['code', 'รหัส', 11], ['g', 'หมวด', 26], ['n', 'รายการ *', 40], ['spec', 'สเปก / เกรด', 32], ['u', 'หน่วย *', 10], ['mat', 'ค่าวัสดุ / หน่วย', 15], ['lab', 'ค่าแรง / หน่วย', 15],
  ['rate', 'ราคา / หน่วย (ไม่รวม VAT) *', 20], ['t', 'คิดตามเวลา', 12], ['eff', 'วันที่มีผล', 13], ['rev', 'วันทบทวน', 13], ['src', 'แหล่งที่มา', 22], ['srcNote', 'หมายเหตุแหล่งที่มา', 28], ['st', 'สถานะ', 11]];
async function xlsLib() { if (window.ExcelJS) return window.ExcelJS; toast('กำลังเตรียมไฟล์ Excel…', 6000);
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/exceljs.min.js'; s.onload = res; s.onerror = () => rej(new Error('โหลดตัวอ่าน Excel ไม่สำเร็จ')); document.head.appendChild(s); }); return window.ExcelJS; }
const isoDate = (d) => d instanceof Date && !isNaN(d) ? d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) : '';
const toDate = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
async function xlsOut() { if (APP.busy) return; APP.busy = true;
  try { const X = await xlsLib(); const wb = new X.Workbook(); wb.creator = 'Wellcon PM · ราคากลาง'; wb.created = new Date();
    const ws = wb.addWorksheet('ราคากลาง', { views: [{ state: 'frozen', ySplit: 1 }] }), op = wb.addWorksheet('ตัวเลือก', { state: 'veryHidden' }), how = wb.addWorksheet('วิธีกรอก');
    op.getColumn(1).values = ['หมวด', ...GROUPS.map(g => g[1])]; op.getColumn(2).values = ['หน่วย', ...UNITS]; op.getColumn(3).values = ['แหล่งที่มา', ...SRCS.map(s => s[1])]; op.getColumn(4).values = ['สถานะ', 'ใช้อยู่', 'เลิกใช้']; op.getColumn(5).values = ['คิดตามเวลา', 'ใช่', 'ไม่'];
    ws.columns = COLS.map(c => ({ header: c[1], key: c[0], width: c[2] }));
    const hr = ws.getRow(1); hr.height = 30; hr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFE2BC66' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1B18' } }; c.alignment = { vertical: 'middle', wrapText: true }; });
    const L = sorted(APP.pb.items); L.forEach(x => ws.addRow({ code: x.code, g: grp(x.g)[1], n: x.n, spec: x.spec, u: x.u, mat: has(x.mat) ? num(x.mat) : null, lab: has(x.lab) ? num(x.lab) : null, rate: has(x.rate) ? num(x.rate) : null,
      t: x.kind === 'trade' ? '' : x.t ? 'ใช่' : 'ไม่', eff: toDate(x.eff), rev: toDate(x.rev), src: srcL(x.src), srcNote: x.srcNote, st: x.st === 'off' ? 'เลิกใช้' : 'ใช้อยู่' }));
    const last = L.length + 1 + 300;   // แถวว่างให้เพิ่มรายการใหม่ (ไม่ต้องใส่รหัส)
    for (let i = 2; i <= last; i++) { const row = ws.getRow(i);
      COLS.forEach((c, j) => { const cell = row.getCell(j + 1); cell.protection = { locked: j === 0 && i <= L.length + 1 };
        if (['mat', 'lab', 'rate'].includes(c[0])) cell.numFmt = '#,##0.00'; if (['eff', 'rev'].includes(c[0])) cell.numFmt = 'dd/mm/yyyy';
        if (j === 0 && i <= L.length + 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEAE0' } };
        const dv = { g: '$A$2:$A$' + (GROUPS.length + 1), u: '$B$2:$B$' + (UNITS.length + 1), src: '$C$2:$C$' + (SRCS.length + 1), st: '$D$2:$D$3', t: '$E$2:$E$3' }[c[0]];
        if (dv) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ["'ตัวเลือก'!" + dv], showErrorMessage: c[0] !== 'u', errorStyle: c[0] === 'u' ? 'warning' : 'stop', errorTitle: 'เลือกจากรายการ', error: 'เลือกจากรายการที่กำหนด' };
        if (['mat', 'lab', 'rate'].includes(c[0])) cell.dataValidation = { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: 'ตัวเลขเท่านั้น', error: 'ใส่ตัวเลข ไม่ติดลบ (บาท ไม่รวม VAT)' }; }); }
    ws.autoFilter = { from: 'A1', to: { row: 1, column: COLS.length } };
    await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true, autoFilter: true, sort: false, insertRows: false, deleteRows: false });
    how.columns = [{ width: 110 }]; ['วิธีกรอกราคากลาง — Wellcon Interior', '', '1. แก้ราคา / สเปก / วันที่ ในชีต “ราคากลาง” ได้เลย — คอลัมน์ “รหัส” ของรายการเดิมล็อกไว้ (ใช้จับคู่ตอนนำเข้า)',
      '2. รายการใหม่: กรอกในแถวว่างด้านล่าง เว้นช่องรหัสไว้ ระบบใส่รหัสให้ตอนเผยแพร่', '3. เลิกใช้รายการ: เปลี่ยน “สถานะ” เป็น เลิกใช้ (ห้ามลบแถว — ใบเสนอราคาเก่ายังอ้างอิงอยู่)',
      '4. ราคา = ราคาเรียกเก็บลูกค้า ไม่รวม VAT · ถ้ากรอกค่าวัสดุ / ค่าแรง แต่เว้นราคา ระบบรวมให้ · ห้ามใส่ราคาซื้อ / ชื่อผู้รับเหมา',
      '5. ใส่วันทบทวนทุกรายการ (ราคาเปลี่ยนตามเวลา) · แหล่งที่มา: ใบเสนอราคาผู้ขาย / ต้นทุนจริงโครงการ / ประมาณการ QS / ราคาสัญญา',
      '6. นำเข้าที่หน้า “ราคากลาง” → ⬆ นำเข้า Excel → ระบบแสดงสิ่งที่เปลี่ยนก่อน → ส่งเป็นคำขอแก้ไข → QS ตรวจ → Director อนุมัติ → Admin เผยแพร่',
      '', 'ดาวน์โหลดจากราคากลางฉบับที่ ' + (APP.pb.ver || 0) + ' · ' + dmyhm(Date.now()) + ' · ' + APP.me.name].forEach((t, i) => { const c = how.getCell('A' + (i + 1)); c.value = t; if (!i) c.font = { bold: true, size: 14 }; });
    const buf = await wb.xlsx.writeBuffer(); const d = new Date();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = 'ราคากลาง_ฉบับ' + (APP.pb.ver || 0) + '_' + pad(d.getDate()) + pad(d.getMonth() + 1) + d.getFullYear() + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast('ดาวน์โหลดแล้ว — กรอกแล้วกด “นำเข้า Excel”');
  } catch (e) { console.error(e); toast('สร้างไฟล์ไม่สำเร็จ: ' + ((e && e.message) || e), 5000); }
  APP.busy = false; }
const cellV = (c) => { let v = c && c.value; if (v && typeof v === 'object' && !(v instanceof Date)) v = v.result != null ? v.result : v.text != null ? v.text : Array.isArray(v.richText) ? v.richText.map(t => t.text).join('') : ''; return v == null ? '' : v; };
const pDate = (v) => { if (v instanceof Date) return isoDate(v); const s = String(v || '').trim(); let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) { let y = +m[3]; if (y > 2400) y -= 543; return y + '-' + pad(m[2]) + '-' + pad(m[1]); } m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : ''; };
async function xlsIn(f) { if (!f || APP.busy) return; APP.busy = true;
  try { const X = await xlsLib(); const wb = new X.Workbook(); await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.getWorksheet('ราคากลาง') || wb.worksheets[0]; if (!ws) throw new Error('ไม่พบชีตข้อมูล');
    let hRow = 0, map = {}; for (let r = 1; r <= Math.min(6, ws.rowCount) && !hRow; r++) { const m = {}; ws.getRow(r).eachCell((c, j) => { const t = String(cellV(c)).replace(/\s+/g, ' ').trim(); const k = COLS.find(x => t && x[1].replace(' *', '') === t.replace(' *', '')) || COLS.find(x => t && t.startsWith(x[1].split(' ')[0]) && x[0] !== 'code'); if (k && !m[k[0]]) m[k[0]] = j; if (t === 'รหัส') m.code = j; }); if (m.n && m.rate) { hRow = r; map = m; } }
    if (!hRow) throw new Error('ไม่พบหัวตาราง “รายการ” / “ราคา / หน่วย” — ใช้ไฟล์ที่ดาวน์โหลดจากหน้าราคากลาง');
    const gBy = (v) => { const s = String(v || '').trim(); return (GROUPS.find(g => g[1] === s || g[0] === s || g[2] === s.toUpperCase()) || [''])[0]; };
    const cur = APP.pb.items, byCode = new Map(cur.map(x => [x.code, x])), seen = new Set(), errs = [], next = clone(cur), warn = [];
    for (let r = hRow + 1; r <= ws.rowCount; r++) { const row = ws.getRow(r), g = (k) => map[k] ? cellV(row.getCell(map[k])) : '';
      const vals = COLS.map(c => String(g(c[0]) == null ? '' : g(c[0])).trim()); if (!vals.some(Boolean)) continue;
      const code = String(g('code')).trim(); const ln = 'แถว ' + r + (code ? ' (' + code + ')' : '');
      if (code && seen.has(code)) { errs.push(ln + ': รหัสซ้ำในไฟล์'); continue; } if (code) seen.add(code);
      const base = code ? byCode.get(code) : null; if (code && !base) { errs.push(ln + ': ไม่พบรหัสนี้ในราคากลาง — ถ้าเป็นรายการใหม่ ให้เว้นช่องรหัส'); continue; }
      const gk = gBy(g('g')) || (base ? base.g : ''); const kind = base ? base.kind : (gk === 'labor' ? 'trade' : 'item');
      let mat = String(g('mat')).trim(), lab = String(g('lab')).trim(), rate = String(g('rate')).trim();
      if (!has(rate) && (has(mat) || has(lab))) rate = String(r2(num(mat) + num(lab)));
      if (has(rate) && (has(mat) || has(lab)) && Math.abs(r2(num(mat) + num(lab)) - num(rate)) > 0.01) warn.push(ln + ': ค่าวัสดุ + ค่าแรง ไม่เท่ากับราคา / หน่วย (ใช้ราคา / หน่วยตามที่กรอก)');
      const it = { id: base ? base.id : uid(kind === 'trade' ? 'tn' : 'ri'), code: base ? base.code : '', kind, g: gk || 'other', n: String(g('n')).trim(), spec: String(g('spec')).trim(), u: String(g('u')).trim() || (kind === 'trade' ? 'คน-วัน' : ''),
        mat: has(mat) ? num(mat) : '', lab: has(lab) ? num(lab) : '', rate: has(rate) ? num(rate) : '', t: /^(ใช่|yes|y|true|1|✓)$/i.test(String(g('t')).trim()),
        eff: pDate(g('eff')), rev: pDate(g('rev')), src: (SRCS.find(s => s[1] === String(g('src')).trim() || s[0] === String(g('src')).trim()) || [''])[0], srcNote: String(g('srcNote')).trim(), st: /เลิก|off/i.test(String(g('st'))) ? 'off' : 'on' };
      if (!it.n) { errs.push(ln + ': ไม่มีชื่อรายการ'); continue; } if (!it.u) { errs.push(ln + ': ไม่มีหน่วย'); continue; } if (has(rate) && num(rate) < 0) { errs.push(ln + ': ราคาติดลบ'); continue; }
      if (base) { const i = next.findIndex(x => x.id === base.id); next[i] = { ...next[i], ...it }; } else next.push(it); }
    const rows = diffItems(cur, next), missing = cur.filter(x => x.code && !seen.has(x.code)).length;
    APP.busy = false; await previewImport(f.name, next, rows, errs, warn, missing);
  } catch (e) { console.error(e); APP.busy = false; await dlg({ title: 'อ่านไฟล์ไม่สำเร็จ', text: (e && e.message) || String(e), cancel: false, ok: 'ปิด' }); } }
async function previewImport(name, next, rows, errs, warn, missing) { const n = (op) => rows.filter(w => w.op === op).length;
  const big = rows.filter(w => { const p = w.op === 'chg' ? pct(w.before.rate, w.after.rate) : null; return p != null && Math.abs(p) >= 20; }).length;
  const ok = await dlg({ title: 'ตรวจก่อนส่งคำขอ: ' + name, wide: true, ok: rows.length ? 'ส่งเป็นคำขอแก้ไข (' + rows.length + ' รายการ)' : false, cancel: 'ปิด',
    html: `<div class="chips"><span class="chip">ใหม่ <b>${n('add')}</b></span><span class="chip">แก้ <b>${n('chg')}</b></span><span class="chip">เลิกใช้ <b>${n('off')}</b></span>${big ? `<span class="chip mid">ราคาเปลี่ยน ≥ 20% <b>${big}</b></span>` : ''}${errs.length ? `<span class="chip bad">ข้อผิดพลาด <b>${errs.length}</b></span>` : ''}</div>
      ${errs.length ? `<div class="warn bad"><b>แถวที่ไม่นำเข้า:</b><br>${errs.slice(0, 15).map(esc).join('<br>')}${errs.length > 15 ? '<br>…' : ''}</div>` : ''}
      ${warn.length ? `<div class="warn">${warn.slice(0, 8).map(esc).join('<br>')}</div>` : ''}
      ${missing ? `<div class="info">${missing} รายการเดิมไม่อยู่ในไฟล์ — ไม่เปลี่ยน (ถ้าต้องการเลิกใช้ ให้เปลี่ยนสถานะเป็น “เลิกใช้” ในไฟล์)</div>` : ''}
      ${rows.length ? rowsTable(rows) : '<p class="empty">ไฟล์นี้ไม่มีสิ่งที่เปลี่ยนจากราคากลางปัจจุบัน</p>'}` });
  if (!ok) return; const r = await submitReq(next, APP.pb.cfg, { title: 'นำเข้า Excel: ' + name.replace(/\.xlsx$/i, ''), src: 'excel', fileName: name }); if (r) { APP.tab = 'req'; render(); openReq(r.id); } }

// =====================================================================
// ปุ่ม / เหตุการณ์
// =====================================================================
document.addEventListener('click', async (e) => { const t = e.target;
  const tb = t.closest('[data-tab]'); if (tb) { e.preventDefault(); if (APP.edit && tb.dataset.tab !== 'list' && !(await ask('ออกจากโหมดแก้ไข?', 'สิ่งที่แก้ยังไม่ได้ส่งคำขอ จะหายไป', 'ออก', true))) return; if (tb.dataset.tab !== 'list') APP.edit = null; APP.tab = tb.dataset.tab; render(); return; }
  const rq = t.closest('[data-req]'); if (rq) { openReq(rq.dataset.req); return; }
  const ra = t.closest('[data-ract]'); if (ra) { reqAct(ra.dataset.ract); return; }
  const b = t.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'edit') startEdit(); else if (a === 'addRow') addRow('item'); else if (a === 'addTrade') addRow('trade');
  else if (a === 'editCancel') { if (diffItems(APP.pb.items, APP.edit.items).length && !(await ask('ยกเลิกการแก้ไข?', 'สิ่งที่แก้จะหายไป', 'ยกเลิกการแก้ไข', true))) return; APP.edit = null; renderList(); }
  else if (a === 'editSubmit') { const r = await submitReq(APP.edit.items, APP.edit.cfg, { title: '' }); if (r) { APP.edit = null; APP.tab = 'req'; render(); openReq(r.id); } }
  else if (a === 'xlsOut') xlsOut(); else if (a === 'xlsIn') $('xf').click();
});
document.addEventListener('input', (e) => { const t = e.target;
  if (t.id === 'q') { APP.q = t.value; const p = t.selectionStart; renderList(); const q = $('q'); q.focus(); try { q.setSelectionRange(p, p); } catch (x) {} return; }
  const E = APP.edit; if (!E) return;
  if (t.dataset.cfg) { const k = t.dataset.cfg; if (k === 'ohp') E.cfg.ohp = t.value; else E.cfg.ot[k.slice(3)] = t.value; editCount(); return; }
  if (t.dataset.f && t.dataset.id && t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'date') { const x = E.items.find(y => y.id === t.dataset.id); if (!x) return; x[t.dataset.f] = t.value; t.closest('tr').classList.toggle('chg', !APP.pb.items.some(y => y.id === x.id && same(y, x))); editCount(); }
});
document.addEventListener('change', (e) => { const t = e.target;
  if (t.id === 'gsel') { APP.g = t.value; renderList(); return; } if (t.id === 'stsel') { APP.stf = t.value; renderList(); return; }
  if (t.id === 'xf') { const f = t.files && t.files[0]; t.value = ''; xlsIn(f); return; }
  const E = APP.edit; if (!E || !t.dataset.f || !t.dataset.id) return; const x = E.items.find(y => y.id === t.dataset.id); if (!x) return;
  x[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; if (t.dataset.f === 'g' || t.dataset.f === 'st') renderList(); else { t.closest('tr').classList.toggle('chg', !APP.pb.items.some(y => y.id === x.id && same(y, x))); editCount(); }
});
window.addEventListener('beforeunload', (e) => { if (APP.edit && diffItems(APP.pb.items, APP.edit.items).length) { e.preventDefault(); e.returnValue = ''; } });
window.__PB = { fromRates, diffItems, normCfg, app: APP, ver: PB_VER };   // ใช้ตรวจสอบในชุดทดสอบ
boot();
})();
