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
// v1.369.0 ประเภทเรื่อง: ความเสียหาย (เรียกค่าซ่อม) · ติดงานผู้อื่น (ผู้อื่นไม่ทำงานที่จำเป็น → เราเสนอราคาดำเนินการแทน)
const KINDS = [['dmg', '💥', 'ความเสียหาย', 'งานของเราเสียหายจากผู้อื่น → เรียกค่าซ่อม'], ['obs', '🚧', 'ติดงานผู้อื่น · เสนอราคาทำแทน', 'ผู้อื่นไม่ทำงานที่จำเป็น เราทำงานต่อไม่ได้ → เสนอราคาดำเนินการแทน'],
  ['quo', '💰', 'เสนอราคา', 'งานเพิ่มเติม / เปลี่ยนแปลง → ใบเสนอราคาให้ผู้ว่าจ้างอนุมัติ']];
const CAUSES_QUO = [['owner_req', '🏨', 'ผู้ว่าจ้าง / Owner ขอเพิ่ม'], ['design_chg', '📐', 'Designer เปลี่ยนแบบ'], ['site_cond', '🧱', 'สภาพหน้างานต่างจากแบบ'],
  ['ve', '💡', 'Value Engineering / ทางเลือก'], ['other', '📌', 'อื่น ๆ']];
const KD = (c) => (c && c.kind) || 'dmg';
const T3 = (c, d, o, q) => KD(c) === 'quo' ? q : KD(c) === 'obs' ? o : d;   // ข้อความตามประเภท: ความเสียหาย / ติดงานผู้อื่น / เสนอราคา
const causesOf = (k) => k === 'quo' ? CAUSES_QUO : k === 'obs' ? CAUSES_OBS : CAUSES;
const docNo = (c, no) => KD(c) === 'quo' ? String(no || '').replace(/^CLM-/, 'QT-') : no;
const CAUSES_OBS = [['no_reloc', '🔌', 'ไม่ย้าย / ไม่รื้อสายไฟ-งานระบบ'], ['no_fix', '🧱', 'ไม่ซ่อม / ไม่ปิดฝ้า-ผนังคืนสภาพ'], ['not_ready', '⏳', 'พื้นที่ยังไม่พร้อมให้เข้าทำงาน'],
  ['no_act', '📵', 'แจ้งแล้วไม่ดำเนินการตามกำหนด'], ['other', '📌', 'อื่น ๆ']];
const isObs = (c) => !!c && c.kind === 'obs';
const CM = Object.fromEntries([...CAUSES, ...CAUSES_OBS, ...CAUSES_QUO].map(c => [c[0], c]));
const WORKS = ['ฝ้า', 'ผนัง', 'พื้น', 'วอลเปเปอร์', 'Built-in / เฟอร์นิเจอร์', 'ประตู / หน้าต่าง', 'งานสี / ผิวสำเร็จ', 'อื่น ๆ'];
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
  if (c.st === 'draft' && KD(c) === 'quo') return '';
  if (c.st === 'draft') { const h = hoursSince(c.foundAt || c.t); if (h != null && h > 48) return '⚠ ยังไม่แจ้งลูกค้า — เกิน 48 ชม. นับจาก' + (KD(c) === 'obs' ? 'พบปัญหา' : 'พบความเสียหาย'); return h != null ? 'แจ้งลูกค้าภายใน ' + Math.max(0, Math.ceil(48 - h)) + ' ชม.' : ''; }
  if (c.st === 'notified') { const d = daysSince(F(c, 'notified').date); return d != null && d > 7 ? '⚠ แจ้งแล้ว ' + d + ' วัน — ยังไม่ส่งเคลม' : ''; }
  if (c.st === 'submitted') { const d = daysSince(F(c, 'submitted').date); return d != null && d > 14 ? '⚠ รอผลพิจารณา ' + d + ' วัน — ติดตามลูกค้า' : ''; }
  if (c.st === 'approved') { const d = daysSince(F(c, 'approved').date); return d != null && d > 14 ? '⚠ อนุมัติแล้ว ' + d + ' วัน — ยังไม่วางบิล' : ''; }
  if (c.st === 'invoiced') { const d = daysSince(F(c, 'invoiced').date); return d != null && d > 30 ? '⚠ ค้างรับ ' + d + ' วันหลังวางบิล' : ''; }
  return '';
}
// ---------- v1.371 อนุมัติเอกสารก่อนส่ง: ขั้นเดียว — QS หรือ PM คนใดคนหนึ่งอนุมัติ = ฉบับจริงไม่มีลายน้ำ DRAFT (v1.369 เดิม 3 ขั้น) ----------
// c.appr = { h:<ลายนิ้วมือเนื้อหาตอนอนุมัติ>, ok:{ by, role, at, amt }, back:{ by, at, why } } (ข้อมูลเดิม qs / pm / dir ยังนับเป็นอนุมัติแล้ว) · แก้เนื้อหา / ตัวเลข หลังอนุมัติ = ยกเลิกการอนุมัติทั้งหมดอัตโนมัติ
// ---------- v1.370 แบบประกอบ (บังคับ): แนบแบบจากโครงการ / อัปโหลด PDF · JPG + ปักหมุด / ตีกรอบตำแหน่งงาน → พิมพ์เป็นเอกสารแนบ ก ----------
// c.plan = { url, w, h, name, src:'proj'|'upload', key, pins:[{ x, y }], boxes:[{ x1, y1, x2, y2 }] }  (พิกัด % ของภาพแบบ)
// v1.29 แบบคมชัด (WDraw): P.pdf = { pdf: url ต้นฉบับ, page } · P.kind = 'dxf' (SVG เวกเตอร์ หน่วย มม.)
const WD = window.WDraw || null; if (WD) WD.setBase('vendor/');
const vecOf = (P) => { const o = {}; if (P && P.src && P.src.pdf) o.pdf = { pdf: P.src.pdf, page: P.src.page || 1 }; if (P && P.pdf && P.pdf.pdf) o.pdf = P.pdf; if (P && P.kind === 'dxf') { o.kind = 'dxf'; if (P.mm) o.mm = P.mm; } return o; };
const wdO = (P) => ({ file: P.url || P.file, w: P.w, h: P.h, kind: P.kind || '', src: P.pdf || null });
async function planUp(c, blob, ext, ctype) { const key = 'claims/' + APP.pid + '/' + c.id + '/plan-' + Date.now() + '.' + ext;
  const up = await sb.storage.from(BUCKET).upload(key, blob, { contentType: ctype, upsert: false }); if (up.error) throw up.error; return sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl; }
function planList(PL) { const AR = Array.isArray(PL.__areas) ? PL.__areas : []; const byId = Object.fromEntries(AR.map(a => [a.id, a]));
  const path = (id) => { const o = []; let a = byId[id], g = 0; while (a && g++ < 10) { o.unshift(a.name); a = a.parent ? byId[a.parent] : null; } return o.join(' › '); };
  return Object.keys(PL).filter(k => k.indexOf('__') !== 0 && PL[k] && PL[k].file).map(k => { const P = PL[k], base = k.split('#')[0];
    const nm = base.indexOf('a:') === 0 ? path(base.slice(2)) : base === 'all' ? (String(PL.__allName || '').trim() || 'ทั้งโครงการ') : base;
    return { key: k, file: P.file, w: P.w, h: P.h, ...vecOf(P), name: (nm || P.name || 'แบบ') + (P.label ? ' · ' + P.label : (P.page ? ' · หน้า ' + P.page : '')) }; }).sort((a, b) => a.name.localeCompare(b.name, 'th')); }
const planOv = (P, big) => ((P.boxes || []).map(b => `<div class="pe-box" style="left:${Math.min(b.x1, b.x2)}%;top:${Math.min(b.y1, b.y2)}%;width:${Math.abs(b.x2 - b.x1)}%;height:${Math.abs(b.y2 - b.y1)}%"></div>`).join('') +
  (P.pins || []).map((q, i) => `<div class="pe-pin${big ? '' : ' sm'}" style="left:${q.x}%;top:${q.y}%">${i + 1}</div>`).join(''));
let pdfP = null;
function pdfLib() { if (!pdfP) pdfP = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'vendor/pdf.min.js'; sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(window.pdfjsLib); }; sc.onerror = rej; document.head.appendChild(sc); }); return pdfP; }
async function pdfPage(pdf, n, maxSide) { const pg = await pdf.getPage(n); const v0 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: Math.min(4, maxSide / Math.max(v0.width, v0.height)) });
  const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: cx, viewport: vp }).promise; return cv; }
// เลือกหน้า PDF: ภาพย่อทุกหน้า แตะเลือก
function pickPdfPage(pdf, name) { return new Promise(res => { const w = document.createElement('div'); w.className = 'pdfpk';
  w.innerHTML = '<div class="pdfpk-box"><div class="pdfpk-h"><div><b>เลือกหน้าแบบ</b><span>' + esc(name || 'PDF') + ' · ' + pdf.numPages + ' หน้า · แตะหน้าที่ต้องการ</span></div><button data-x="1">×</button></div><div class="pdfpk-g"></div></div>';
  document.body.appendChild(w); const g = w.querySelector('.pdfpk-g'); let done = false; const fin = (v) => { if (done) return; done = true; w.remove(); res(v); };
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { fin(+b.dataset.p); return; } if (e.target.closest('[data-x]') || e.target === w) fin(null); });
  for (let i = 1; i <= pdf.numPages; i++) { const b = document.createElement('button'); b.className = 'pdfpk-i'; b.dataset.p = String(i); b.innerHTML = '<div class="pdfpk-t">…</div><span>หน้า ' + i + '</span>'; g.appendChild(b); }
  (async () => { for (let i = 1; i <= pdf.numPages && !done; i++) { try { const cv = await pdfPage(pdf, i, 360); const t = g.querySelector('[data-p="' + i + '"] .pdfpk-t'); if (t) { t.innerHTML = ''; const im = new Image(); im.src = cv.toDataURL('image/jpeg', .72); t.appendChild(im); } } catch (e) {} } })(); }); }
// v1.31 เปลี่ยนไฟล์แบบ (JPG → PDF → DXF): ถ้ามีหมุด / กรอบอยู่แล้ว → จัดตำแหน่ง 2 จุด แล้วย้ายหมุด / กรอบตามแบบใหม่ · เก็บไฟล์เดิมไว้ใน plan.prev
async function applyPlan(c, pl, lg) { if (!(APP.cur && APP.cur.id === c.id)) return false; const old = c.plan; let pins = [], boxes = [], note = '';
  if (old && old.url && ((old.pins || []).length || (old.boxes || []).length) && WD) { APP.busyPlan = false; renderSheet();
    const mk = [...(old.pins || []).map(q => [q.x / 100, q.y / 100]), ...(old.boxes || []).flatMap(b => [[b.x1 / 100, b.y1 / 100], [b.x2 / 100, b.y2 / 100]])];
    const A = await WD.alignDialog({ old: { url: old.url, w: old.w, h: old.h, name: old.name, src: old.pdf || null, kind: old.kind }, neu: { url: pl.url, w: pl.w, h: pl.h, name: pl.name, src: pl.pdf || null, kind: pl.kind }, marks: mk, what: 'หมุด / มุมกรอบ', skipLabel: 'ข้าม — ปักหมุดใหม่เอง' });
    if (!A) { toast('ยกเลิก — ยังใช้แบบเดิม'); return true; }
    if (A.map) { const mp = (x, y) => WD.mapPct(A.map, x, y); pins = (old.pins || []).map(q => { const r = mp(q.x, q.y); return { ...q, x: r[0], y: r[1] }; });
      boxes = (old.boxes || []).map(b => { const a = mp(b.x1, b.y1), d = mp(b.x2, b.y2); return { ...b, x1: a[0], y1: a[1], x2: d[0], y2: d[1] }; }); note = ' · ย้ายหมุด ' + pins.length + ' / กรอบ ' + boxes.length + ' ตามแบบใหม่'; } }
  const cc = APP.cur; cc.plan = { ...pl, pins, boxes, ...(old && old.url ? { prev: [...(old.prev || []), { url: old.url, name: old.name || '', at: new Date().toISOString() }].slice(-5) } : {}) };
  logPush(cc, (old && old.url ? 'เปลี่ยนไฟล์แบบประกอบ: ' : 'แนบแบบประกอบ: ') + lg + note); APP.busyPlan = false; renderSheet(); schedule(); openPlanEditor();
  if (note) toast('✓ เปลี่ยนไฟล์แบบแล้ว' + note + ' — ตรวจตำแหน่งแล้วกด ✓ บันทึก', 4000); return true; }
async function planFromCanvas(c, cv, nm, extra) { const blob = await new Promise(r2 => cv.toBlob(r2, 'image/jpeg', .86)); const key = 'claims/' + APP.pid + '/' + c.id + '/plan-' + Date.now() + '.jpg';
  const up = await sb.storage.from(BUCKET).upload(key, blob, { contentType: 'image/jpeg', upsert: false }); if (up.error) throw up.error; const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
  return applyPlan(c, { url: data.publicUrl, w: cv.width, h: cv.height, name: nm, ...(extra || {}) }, nm); }
async function uploadPlan(file) { const c = APP.cur; if (!c) return; if (WD && WD.guardDwg(file)) return; APP.busyPlan = true; renderSheet();
  try { let cv, pg = null, ex = {}; const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name || '');
    if (WD && WD.isDxf(file)) { const R = await WD.importDxf(file); const url = await planUp(c, R.blob, 'svg', 'image/svg+xml');
      await applyPlan(c, { url, w: R.w, h: R.h, name: R.name + ' (DXF)', src: 'upload', kind: 'dxf', mm: [R.wmm, R.hmm] }, R.name + ' (DXF)'); return; }
    if (isPdf) { const lib = await pdfLib(); const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; pg = 1; if (pdf.numPages > 1) { pg = await pickPdfPage(pdf, file.name); if (!pg) { APP.busyPlan = false; renderSheet(); return; } } cv = await pdfPage(pdf, pg, 2400); try { ex.pdf = { pdf: await planUp(c, file.slice(0, file.size, 'application/pdf'), 'pdf', 'application/pdf'), page: pg }; } catch (e) { console.warn('pdf src', e); } }
    else { const u = URL.createObjectURL(file); const im = await new Promise((r2, j2) => { const x = new Image(); x.onload = () => r2(x); x.onerror = j2; x.src = u; }); const k = Math.min(1, 2400 / Math.max(im.width, im.height));
      cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); }
    const nm = String(file.name || 'แบบ').replace(/\.[a-z0-9]+$/i, '') + (pg && pg > 1 ? ' · หน้า ' + pg : '');
    if (await planFromCanvas(c, cv, nm, { src: 'upload', page: pg, ...ex })) return;
  } catch (e) { toast('แนบแบบไม่สำเร็จ — ตรวจไฟล์ / สัญญาณเน็ต'); }
  APP.busyPlan = false; renderSheet(); }
const normZ = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '');
const isImgF = (n) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(String(n || '')) || /\/pic-/i.test(String(n || ''));
// ไฟล์ทั้งหมดของแบบ 1 รายการใน Drawing Log: PDF ล่าสุด · รูป JPG · ไฟล์ revision เก่า
function dwgFiles(d) { const L = [], seen = new Set(); const add = (url, name, lab) => { if (!url || seen.has(url)) return; seen.add(url); L.push({ url, name: name || '', lab, kind: isImgF(name || url) ? 'img' : 'pdf' }); };
  add(d.file, d.fileName, d.rev || 'ล่าสุด'); add(d.pic, 'pic.jpg', 'รูปแนบ');
  (Array.isArray(d.revHist) ? d.revHist : []).slice().reverse().forEach(h => add(h.file, h.fileName, (h.rev || 'Rev เก่า') + ' (เก่า)')); return L; }
// เลือกแบบในโครงการ: Drawing Log (PDF → เลือกหน้าจากภาพย่อ · JPG → ใช้ทันที) · แบบจาก Survey · แบบใน Defect Check
function pickProjPlan() { const c = APP.cur; const D = (APP.dwgs || []).slice(), PL = APP.plans || [], SV = APP.svPlans || [];
  if (!D.length && !PL.length && !SV.length) { toast('โครงการนี้ยังไม่มีแบบใน Drawing Log — อัปโหลด PDF / JPG แทน'); return; }
  const za = normZ(c && c.area), zt = normZ(c && c.title); const hit = (d) => { const z = normZ(d.zone); return !!z && ((za && (za.includes(z) || z.includes(za))) || (zt && zt.includes(z))); };
  D.sort((x, y) => (hit(y) - hit(x)) || String(x.no || '').localeCompare(String(y.no || '')));
  const w = document.createElement('div'); w.className = 'pdfpk'; document.body.appendChild(w); let gen = 0, pdfView = null;
  const close = () => { gen++; w.remove(); };
  const setP = (pl, lg) => { const cc = APP.cur; if (!cc) return; applyPlan(cc, pl, lg); };
  const useImg = (url, name, extra) => { const im = new Image(); im.onload = () => { close(); setP({ url, w: im.naturalWidth, h: im.naturalHeight, name, ...(extra || {}) }, name); }; im.onerror = () => toast('เปิดรูปไม่ได้'); im.src = url; };
  const listHtml = () => '<div class="pdfpk-box"><div class="pdfpk-h"><div><b>เลือกแบบในโครงการ</b><span>' + esc(projName(APP.proj)) + ' · แตะ PDF เพื่อเลือกหน้า · แตะ JPG เพื่อใช้รูป</span></div><button data-x="1">×</button></div><div class="pdfpk-sc">' +
    (D.length ? '<div class="pk-sec">📚 Drawing Log · ' + D.length + ' ชุด' + (D.some(hit) ? ' · <span class="pk-hit">⭐ = โซนตรงกับพื้นที่ของเรื่องนี้</span>' : '') + '</div><div class="pk-dw">' +
      D.map((d, i) => { const F = dwgFiles(d); return '<div class="pk-d' + (hit(d) ? ' hit' : '') + '">' + (d.pic ? '<img class="pk-th" src="' + esc(d.pic) + '" loading="lazy" alt="">' : '<i>PDF</i>') +
        '<span class="pk-tx"><b>' + (hit(d) ? '⭐ ' : '') + esc(d.no || '') + ' · ' + esc(d.name || d.fileName || 'แบบ') + '</b><small>' + [d.rev, d.zone, d.disc && d.disc !== '—' ? d.disc : ''].filter(Boolean).map(esc).join(' · ') + '</small>' +
        '<span class="pk-fs">' + F.map((f, j) => '<button class="pk-f ' + f.kind + '" data-d="' + i + '" data-f="' + j + '">' + (f.kind === 'pdf' ? '📄 PDF · ' : '🖼 JPG · ') + esc(f.lab) + (f.kind === 'pdf' ? ' · เลือกหน้า ›' : '') + '</button>').join('') + '</span></span></div>'; }).join('') + '</div>' : '') +
    (SV.length ? '<div class="pk-sec">📐 แบบที่โหลดในแอป Survey · ' + SV.length + '</div><div class="pdfpk-g">' + SV.map((p, i) => '<button class="pdfpk-i" data-s="' + i + '"><div class="pdfpk-t"><img src="' + esc(p.url) + '" loading="lazy" alt=""></div><span>' + esc(p.name || 'แบบ') + '</span></button>').join('') + '</div>' : '') +
    (PL.length ? '<div class="pk-sec">🗺 แบบใน Defect Check / Site Issues · ' + PL.length + '</div><div class="pdfpk-g">' + PL.map((p, i) => '<button class="pdfpk-i" data-i="' + i + '"><div class="pdfpk-t"><img src="' + esc(p.file) + '" loading="lazy" alt=""></div><span>' + esc(p.name) + '</span></button>').join('') + '</div>' : '') + '</div></div>';
  const showList = () => { gen++; pdfView = null; w.innerHTML = listHtml(); };
  const showPdf = async (d, f) => { const my = ++gen; const nm0 = [d.no, d.name || d.fileName].filter(Boolean).join(' · ') + (f.lab ? ' (' + f.lab + ')' : '');
    w.innerHTML = '<div class="pdfpk-box"><div class="pdfpk-h"><button class="pk-back" data-back="1">‹ กลับ</button><div><b>เลือกหน้า</b><span>' + esc(nm0) + '</span></div><button data-x="1">×</button></div><div class="pdfpk-g" id="pk-pages"><div class="pk-load">กำลังเปิด PDF…</div></div></div>';
    try { const lib = await pdfLib(); const pdf = await lib.getDocument({ url: f.url }).promise; if (my !== gen) return; pdfView = { d, f, pdf, nm0 };
      const g = w.querySelector('#pk-pages'); g.innerHTML = ''; w.querySelector('.pdfpk-h span').textContent = nm0 + ' · ' + pdf.numPages + ' หน้า · แตะหน้าที่ต้องการ';
      for (let i = 1; i <= pdf.numPages; i++) { const b = document.createElement('button'); b.className = 'pdfpk-i'; b.dataset.p = String(i); b.innerHTML = '<div class="pdfpk-t">…</div><span>หน้า ' + i + '</span>'; g.appendChild(b); }
      for (let i = 1; i <= pdf.numPages; i++) { if (my !== gen) return; try { const cv = await pdfPage(pdf, i, 360); const t = g.querySelector('[data-p="' + i + '"] .pdfpk-t'); if (t) { t.innerHTML = ''; const im = new Image(); im.src = cv.toDataURL('image/jpeg', .72); t.appendChild(im); } } catch (e) {} }
    } catch (e) { if (my === gen) { const g = w.querySelector('#pk-pages'); if (g) g.innerHTML = '<div class="pk-load">เปิด PDF ไม่สำเร็จ — ลองไฟล์ JPG หรืออัปโหลดไฟล์แทน</div>'; } } };
  const usePage = async (n) => { const V = pdfView; if (!V) return; close(); const cc = APP.cur; if (!cc) return; APP.busyPlan = true; renderSheet();
    try { const cv = await pdfPage(V.pdf, n, 2400); if (await planFromCanvas(cc, cv, V.nm0 + (V.pdf.numPages > 1 ? ' · หน้า ' + n : ''), { src: 'dwg', dwg: { id: V.d.id, no: V.d.no || '', rev: V.d.rev || '' }, page: n, pdf: { pdf: V.f.url, page: n } })) return; } catch (e) { toast('แนบแบบไม่สำเร็จ — ตรวจสัญญาณเน็ต'); }
    APP.busyPlan = false; renderSheet(); };
  w.addEventListener('click', (e) => { const t = e.target;
    if (t.closest('[data-x]') || t === w) { close(); return; }
    if (t.closest('[data-back]')) { showList(); return; }
    const bp = t.closest('[data-p]'); if (bp && pdfView) { usePage(+bp.dataset.p); return; }
    const bf = t.closest('[data-f]'); if (bf) { const d = D[+bf.dataset.d], f = dwgFiles(d)[+bf.dataset.f]; if (!f) return;
      if (f.kind === 'pdf') showPdf(d, f); else useImg(f.url, [d.no, d.name || d.fileName].filter(Boolean).join(' · ') + ' (' + f.lab + ')', { src: 'dwg', dwg: { id: d.id, no: d.no || '', rev: d.rev || '' } }); return; }
    const bs = t.closest('[data-s]'); if (bs) { const p = SV[+bs.dataset.s]; close(); setP({ url: p.url, w: p.w, h: p.h, name: p.name || 'แบบ (Survey)', src: 'survey', ...vecOf(p) }, p.name || 'แบบ (Survey)'); return; }
    const bi = t.closest('[data-i]'); if (bi) { const p = PL[+bi.dataset.i]; close(); setP({ url: p.file, w: p.w, h: p.h, name: p.name, src: 'proj', key: p.key, ...vecOf(p) }, p.name); return; } });
  showList(); }
// หน้าปักหมุด / ตีกรอบตำแหน่งงานบนแบบ
function openPlanEditor() { const c = APP.cur; if (!c || !c.plan) return; const P = c.plan;
  let pins = (P.pins || []).map(x => ({ ...x })), boxes = (P.boxes || []).map(x => ({ ...x })), mode = pins.length || boxes.length ? 'pin' : 'pin', zoom = 1; const hist = [];
  const w = document.createElement('div'); w.id = 'plan-ed';
  w.innerHTML = `<div class="pe-top"><button class="btn" data-pe="x">ยกเลิก</button><b>📐 ${esc(P.name || 'แบบ')}</b><span class="grow"></span><button class="btn pri" data-pe="ok">✓ บันทึก</button></div>
    <div class="pe-bar"><button data-pe="m" data-m="pin" class="on">📍 ปักหมุดตำแหน่ง</button><button data-pe="m" data-m="box">▢ ตีกรอบพื้นที่</button><i class="sep"></i><button data-pe="undo">↶ ย้อน</button><button data-pe="clr">ล้าง</button><i class="sep"></i><button data-pe="z" data-z="-1">－</button><button data-pe="z" data-z="1">＋</button></div>
    <div class="pe-wrap"><div class="pe-st"><img src="${esc(P.url)}" draggable="false" alt=""><div class="pe-ov"></div></div></div>
    <div class="pe-hint">แตะบนแบบเพื่อปักหมุดตำแหน่งงาน (เลขเรียงให้อัตโนมัติ) · โหมดกรอบ: ลากนิ้วเพื่อตีกรอบพื้นที่ · ＋ / － ซูม แล้วเลื่อนดูแบบ</div>`;
  document.body.appendChild(w); const st = w.querySelector('.pe-st'), ov = w.querySelector('.pe-ov'), wrap = w.querySelector('.pe-wrap');
  const shp = (WD && WD.kindOf(wdO(P))) ? WD.sharpener(st, wdO(P), { clip: wrap, after: () => st.querySelector('img') }) : null; if (shp) { shp.update(300); wrap.addEventListener('scroll', () => shp.update(), { passive: true }); }
  const shpEnd = () => { if (shp) shp.destroy(); };
  const draw = (tmp) => { ov.innerHTML = planOv({ pins, boxes: tmp ? [...boxes, tmp] : boxes }, true); };
  const setMode = (m) => { mode = m; w.querySelectorAll('[data-pe="m"]').forEach(b => b.classList.toggle('on', b.dataset.m === m)); st.style.touchAction = m === 'box' ? 'none' : 'pan-x pan-y'; };
  const pc = (e) => { const r = st.getBoundingClientRect(); return [Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))]; };
  let g = null;
  st.addEventListener('pointerdown', (e) => { const p = pc(e); g = { id: e.pointerId, sx: e.clientX, sy: e.clientY, p, moved: false }; if (mode === 'box') { try { st.setPointerCapture(e.pointerId); } catch (x) {} } });
  st.addEventListener('pointermove', (e) => { if (!g || g.id !== e.pointerId) return; if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 6) g.moved = true; if (mode === 'box' && g.moved) { const q = pc(e); draw({ x1: g.p[0], y1: g.p[1], x2: q[0], y2: q[1] }); } });
  st.addEventListener('pointerup', (e) => { if (!g || g.id !== e.pointerId) return; const q = pc(e), G = g; g = null;
    if (mode === 'pin' && !G.moved) { hist.push(JSON.stringify([pins, boxes])); pins.push({ x: +q[0].toFixed(2), y: +q[1].toFixed(2) }); draw(); }
    else if (mode === 'box' && G.moved && Math.abs(q[0] - G.p[0]) > 0.5 && Math.abs(q[1] - G.p[1]) > 0.5) { hist.push(JSON.stringify([pins, boxes])); boxes.push({ x1: +G.p[0].toFixed(2), y1: +G.p[1].toFixed(2), x2: +q[0].toFixed(2), y2: +q[1].toFixed(2) }); draw(); } else draw(); });
  st.addEventListener('pointercancel', () => { g = null; draw(); });
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-pe]'); if (!b) return; const a = b.dataset.pe;
    if (a === 'x') { shpEnd(); w.remove(); return; }
    if (a === 'ok') { const cc = APP.cur; if (cc && cc.plan) { cc.plan = { ...cc.plan, pins, boxes }; logPush(cc, 'ปักหมุดบนแบบ ' + pins.length + ' จุด · กรอบ ' + boxes.length); renderSheet(); schedule(); } shpEnd(); w.remove(); if (!pins.length && !boxes.length) toast('ยังไม่ได้ระบุตำแหน่งบนแบบ — แนะนำปักหมุดอย่างน้อย 1 จุด', 3500); return; }
    if (a === 'm') setMode(b.dataset.m);
    if (a === 'undo' && hist.length) { [pins, boxes] = JSON.parse(hist.pop()); draw(); }
    if (a === 'clr' && (pins.length || boxes.length) && confirm('ล้างหมุดและกรอบทั้งหมด?')) { hist.push(JSON.stringify([pins, boxes])); pins = []; boxes = []; draw(); }
    if (a === 'z') { zoom = Math.max(1, Math.min(4, zoom * (b.dataset.z === '1' ? 1.5 : 1 / 1.5))); st.style.width = (zoom * 100) + '%'; if (shp) shp.update(); } });
  setMode(mode); draw(); }
function planBox(c) { const P = c.plan;
  if (APP.busyPlan) return '<div class="pl-req busy"><div class="spin"></div>กำลังแนบแบบ…</div>';
  if (!P) return `<div class="pl-req"><b>📐 ยังไม่ได้แนบแบบ</b><small>ต้องแนบแบบแสดงตำแหน่งงานก่อนอนุมัติ / ส่งลูกค้า</small><div class="row2">
    <button class="btn pri" data-act="planproj">🗂 เลือกแบบในโครงการ${((APP.dwgs || []).length + (APP.plans || []).length + (APP.svPlans || []).length) ? ' (' + ((APP.dwgs || []).length + (APP.plans || []).length + (APP.svPlans || []).length) + ')' : ''}</button><label class="btn">📂 อัปโหลด PDF / JPG / DXF<input type="file" accept="application/pdf,.pdf,image/*,.dxf,.dwg" data-planup="1" hidden></label></div></div>`;
  return `<div class="pl-has"><button class="plt" data-act="planed" title="แตะเพื่อปักหมุด / แก้ตำแหน่ง"><img src="${esc(P.url)}" alt="" loading="lazy"><div class="pe-ov">${planOv(P, false)}</div></button>
    <div class="pl-inf"><b>${esc(P.name || 'แบบ')}</b><small>${(P.pins || []).length} หมุด · ${(P.boxes || []).length} กรอบ${!(P.pins || []).length && !(P.boxes || []).length ? ' · <span style="color:var(--red)">ยังไม่ได้ระบุตำแหน่ง</span>' : ''}</small>
    <div class="row2"><button class="btn" data-act="planed">📍 ปักหมุด / แก้ตำแหน่ง</button><button class="btn" data-act="planproj">⇄ เปลี่ยนเป็นแบบในโครงการ</button><label class="btn">⇄ เปลี่ยนเป็นไฟล์ใหม่ (PDF / DXF)<input type="file" accept="application/pdf,.pdf,image/*,.dxf,.dwg" data-planup="1" hidden></label><button class="btn del" data-act="plandel">ลบ</button></div></div></div>`; }
// v1.30 อนุมัติขั้นเดียว: QS หรือ PM คนใดคนหนึ่งอนุมัติ = เอกสารพร้อมส่ง (ลายน้ำ DRAFT หายไป)
const AP_STEPS = [['ok', '✍️', 'อนุมัติเอกสาร · QS หรือ PM', 'ตรวจตัวเลข · เนื้อหา · รูป · แบบประกอบ — คนใดคนหนึ่งอนุมัติได้', ['qs', 'qs_mgr', 'pm', 'pm_mgr']]];
const AP_ROLE = { qs: 'QS', qs_mgr: 'QS', pm: 'PM', pm_mgr: 'PM', superadmin: 'MD' };
const apHash = (c) => { const t = JSON.stringify([c.kind || 'dmg', c.title, c.found, c.area, c.works, c.cause, c.party, c.desc, c.lines, c.ohp, !!c.ohpShow, c.vatOn !== false, c.eot, c.eotWhy, c.valid, c.payTerm, (c.photos || {}).before, c.plan ? [c.plan.url, c.plan.pins, c.plan.boxes] : null]);
  let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length.toString(36); };
const apOf = (c) => { const a = c.appr || {}; return a.h && a.h === apHash(c) ? a : {}; };
const apRec = (c) => { const a = apOf(c); return a.ok || a.dir || a.pm || a.qs || null; };   // รองรับข้อมูลเดิม (qs / pm / dir)
const apN = (c) => apRec(c) ? 1 : 0;
const apOk = (c) => !!apRec(c) && !!c.plan;
const canAp = (k) => { const r = (APP.me && APP.me.role) || ''; if (r === 'superadmin') return true; const st = AP_STEPS.find(x => x[0] === k); return !!st && st[4].includes(r); };
const apTurn = (c) => { if (c._new || apOk(c) || c.st === 'paid' || c.st === 'rejected') return ''; const a = apOf(c);
  return apRec(c) ? '' : (canAp('ok') ? 'ok' : ''); };
function apCheck(c) { if (!c || !c.appr) return; const a = c.appr; if (!(a.ok || a.qs || a.pm || a.dir)) return; if (a.h === apHash(c)) return;
  c.appr = { back: a.back || null }; logPush(c, 'แก้ไขเนื้อหา / ตัวเลขหลังอนุมัติ — ยกเลิกการอนุมัติทั้งหมด ต้องอนุมัติใหม่'); toast('แก้ไขหลังอนุมัติ — ลายน้ำ DRAFT กลับมา ต้องอนุมัติใหม่', 4000);
  // อัปเดตเฉพาะส่วนอนุมัติบนจอ (ไม่ render ทั้งฟอร์ม — ช่องที่กำลังพิมพ์ไม่หลุดโฟกัส)
  try { const el = document.getElementById('apblk'); if (el) el.outerHTML = apWrap(c); const pb = document.querySelector('.bot [data-act="print"]'); if (pb) pb.textContent = '🖨 ' + T3(c, 'หนังสือเคลม', 'หนังสือเสนอราคา', 'ใบเสนอราคา') + ' (DRAFT)';
    const sb2 = document.querySelector('[data-act="go"][data-to="submitted"]'); if (sb2) sb2.disabled = true; } catch (e) {} }
const apWrap = (c) => `<div class="blk" id="apblk"><h3><span class="n">✓</span>อนุมัติเอกสารก่อนส่ง <small>QS หรือ PM อนุมัติ · ${apN(c) ? 'อนุมัติแล้ว' : 'รออนุมัติ'}</small></h3>${apBlock(c)}</div>`;
const needsAct = (c) => /^⚠/.test(alertOf(c)) || c.st === 'draft' || !!apTurn(c);

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
    let ho = null; try { ho = JSON.parse(localStorage.getItem('wellcon_pm_handoff') || 'null'); } catch (e) {}   // ตัวตนที่ PM ส่งมาตอนกดเมนู (ภายใน 12 ชม.)
    const okAcc = accounts.filter(x => x.active !== false && !x.disabled);
    const match = (x, o) => !!o && ((o.email && norm(x.email) === norm(o.email)) || (o.id && String(x.id) === String(o.id)) || (o.username && norm(x.username) === norm(o.username)));
    const acc = (ho && Date.now() - Number(ho.at || 0) < 12 * 36e5 && okAcc.find(x => match(x, ho))) || (sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && okAcc.find(x => match(x, { email: sess.email }))) || null;
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
  const [m, r, dp] = await Promise.all([stRead(KEY), stRead(RKEY), stRead('defectPlans').catch(() => ({}))]);
  APP.plans = planList((dp || {})[APP.pid] || {});
  // แบบที่มีอยู่แล้วในโครงการ: Drawing Log (ตาราง drawings) + แบบที่โหลดในแอป Survey (survey_log)
  try { const [dw, sv] = await Promise.all([sb.from('drawings').select('id,data').eq('project', APP.pid), sb.from('survey_log').select('id,data').eq('project', APP.pid)]);
    APP.dwgs = ((dw && dw.data) || []).map(r => ({ id: r.id, ...(r.data || {}) })).filter(d => d.file && !d.deleted);
    const seen = new Set(); APP.svPlans = ((sv && sv.data) || []).map(r => (((r.data || {}).sk || {}).bg)).filter(b => b && b.url && !seen.has(b.url) && seen.add(b.url)); } catch (e) { APP.dwgs = APP.dwgs || []; APP.svPlans = APP.svPlans || []; }
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
    <div class="r1"><span class="no">${esc(docNo(c, c.no) || '—')}</span><span class="tt">${T3(c, '', '🚧 ', '💰 ')}${esc(c.title || '(ยังไม่ใส่หัวข้อ)')}</span><span class="pill" style="background:${s[3]};color:${s[2]}">${esc(s[1])}</span></div>
    ${!c.plan && c.st !== 'paid' && c.st !== 'rejected' ? '<div class="apst no">📐 ยังไม่แนบแบบ</div> ' : ''}${c.st !== 'paid' && c.st !== 'rejected' ? `<div class="apst ${apOk(c) ? 'ok' : apTurn(c) ? 'me' : ''}">${apOk(c) ? '✓ อนุมัติแล้ว · พร้อมส่ง' : '⏳ DRAFT · รอ QS / PM อนุมัติ' + (apTurn(c) ? ' · คุณอนุมัติได้' : '')}</div>` : ''}
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
    <div class="info" style="margin-top:16px">ขั้นตอน: <b>1</b> ถ่ายรูป + บันทึก → <b>2</b> แจ้งลูกค้าภายใน 48 ชม. → <b>3</b> ประเมินค่าซ่อม + วันที่ขอขยาย → <b>4</b> อนุมัติเอกสาร โดย QS หรือ PM (อนุมัติแล้วลายน้ำ DRAFT หาย) แล้วส่งหนังสือเคลม (DRAFT ให้ผู้บริหารตรวจก่อนส่ง) → <b>5</b> บันทึกผลอนุมัติ → <b>6</b> วางบิล → <b>7</b> รับเงิน</div>
    <p class="ver">Claim ${CL_VER}${IS_STG ? ' · STAGING' : ''}</p></main>
    <button class="fab" data-act="new">+ แจ้งเคลม / เสนอราคา</button>${APP.ratesOpen ? ratesSheet() : ''}`;
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
    <div><b>${T3(c, 'รวมค่าซ่อม', 'รวมค่าดำเนินการ', 'รวมค่างาน')}</b><b>${baht(k.sub)}</b></div>
    <div><span class="pct">ค่าดำเนินการ + กำไร (OH&amp;P)${inp('ohp', c.ohp, { num: 1, style: 'width:74px' })}%</span><span>${baht(k.ohp)}</span></div>
    <div><b>รวมก่อน VAT</b><b>${baht(k.pre)}</b></div>
    <div><label class="pct" style="cursor:pointer"><input type="checkbox" data-f="vatOn" ${c.vatOn === false ? '' : 'checked'}> VAT 7%</label><span>${baht(k.vat)}</span></div>
    <div class="big"><span>${T3(c, 'ยอดเคลม', 'ยอดเสนอราคา', 'ยอดเสนอราคา')} ${c.vatOn === false ? '(ไม่รวม VAT)' : '(รวม VAT)'}</span><span>${baht(k.total)}</span></div>
    <div><label class="pct" style="cursor:pointer"><input type="checkbox" data-f="ohpShow" ${c.ohpShow ? 'checked' : ''}> แสดง OH&amp;P แยกบรรทัดในหนังสือ</label><span class="mut" style="text-align:right">${c.ohpShow ? 'ลูกค้าเห็น % ค่าดำเนินการ + กำไร' : 'ค่าเริ่มต้น: รวมไว้ในราคาต่อหน่วย'}</span></div>
    <div class="mut">ราคาเรียกเก็บลูกค้า · ห้ามใส่ต้นทุนจริงของบริษัท · ตรวจตัวเลขกับ QS ก่อนส่ง</div></div>`;
}
function apBlock(c) {
  const ok = apOk(c), k = calc(c), back = (c.appr || {}).back, v = apRec(c), can = canAp('ok');
  const roleTx = (r) => AP_ROLE[r] || '';
  const row = `<div class="ap-r ${v ? 'ok' : ''}"><i>${v ? '✓' : '✍️'}</i><div class="ap-t"><b>${esc(AP_STEPS[0][2])}</b><small>${v ? `${esc(v.by)}${roleTx(v.role) ? ' (' + roleTx(v.role) + ')' : ''} · ${when(v.at)}` : esc(AP_STEPS[0][3])}</small></div>
      ${v ? (v.by === APP.me.name || APP.me.role === 'superadmin' ? `<button class="btn" data-act="unappr" data-k="ok" style="font-size:12.5px">ยกเลิก</button>` : '')
        : can ? `<button class="btn ok" data-act="appr" data-k="ok" ${!c.plan ? 'disabled title="ต้องแนบแบบประกอบก่อน"' : ''}>อนุมัติ</button>` : `<span class="ap-w">รอ QS / PM</span>`}</div>`;
  return `${!c.plan ? `<div class="warnbox">📐 ต้องแนบแบบประกอบ (ข้อ 1) ก่อนจึงอนุมัติได้</div>` : ''}${ok ? `<div class="ap-ok">✓ อนุมัติแล้ว — พิมพ์ <b>ฉบับจริง</b> (ไม่มีลายน้ำ DRAFT) ส่งลูกค้าได้ · ยอด ${baht(k.total)}</div>` : `<div class="info">เอกสารมีลายน้ำ <b>DRAFT</b> จนกว่า <b>QS หรือ PM</b> คนใดคนหนึ่งอนุมัติ · แก้ข้อมูล / ตัวเลขหลังอนุมัติ = ต้องอนุมัติใหม่</div>`}
    ${back && !apN(c) ? `<div class="warnbox">↩ ส่งกลับแก้ไข โดย ${esc(back.by)} · ${when(back.at)}${back.why ? ' — ' + esc(back.why) : ''}</div>` : ''}
    <div class="ap">${row}</div>
    ${!ok && can ? `<div class="act"><button class="btn del" data-act="apback" style="font-size:13px">↩ ส่งกลับแก้ไข</button></div>` : ''}`;
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
    h += `<div class="stage"><h4>3 · ${T3(c, 'ส่งหนังสือเคลม', 'ส่งหนังสือเสนอราคา', 'ส่งใบเสนอราคา')}</h4>${money ? `<div class="g3">${f('date', 'วันที่ส่ง', isoToday(), { type: 'date' })}${f('amt', 'ยอดเคลม (฿)', k.total, { num: 1 })}${f('days', 'ขอขยายเวลา (วัน)', c.eot || '', { num: 1, ph: '0' })}${f('ref', 'เลขที่หนังสือ', '', { ph: 'เช่น WI-CLM-001' })}</div>
      <div class="info">ยอดดึงจากตัวคำนวณ (${baht(k.total)}) · ${apOk(c) ? '✓ เอกสารอนุมัติแล้ว — พิมพ์ฉบับจริงส่งลูกค้า' : '⏳ ต้องให้ QS หรือ PM อนุมัติก่อนส่ง — ตอนนี้ ' + apN(c) + '/3'}</div>
      <div class="act"><button class="btn ok" data-act="go" data-to="submitted" ${apOk(c) ? '' : 'disabled'}>✓ บันทึกว่าส่ง${T3(c, 'เคลม', 'หนังสือ', 'ใบเสนอราคา')}แล้ว</button></div>` : lock}</div>`;
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
    <div class="sh-h"><button class="x" data-act="close" title="ปิด">‹</button><div class="tt"><b>${esc(docNo(c, c.no))} · ${esc(c.title || T3(c, 'แจ้งความเสียหาย', 'เสนอราคาดำเนินการแทน', 'เสนอราคางานเพิ่มเติม'))}</b><span>${esc(KD(c) !== 'dmg' && (c.st || 'draft') === 'draft' ? 'บันทึกเรื่อง' : (SM[c.st] || SM.draft)[1])} · บันทึกโดย ${esc(c.by || '—')}</span></div><span class="sv" id="sv">${sv}</span></div>
    <div class="sh-b">
      ${/^⚠/.test(al) ? `<div class="warnbox">${esc(al)}</div>` : al ? `<div class="info">⏱ ${esc(al)}</div>` : ''}
      <div class="blk"><h3><span class="n">1</span>${T3(c, 'ความเสียหาย', 'งานที่ติดขัด', 'งานที่เสนอราคา')}</h3>
        <div class="lbl">ประเภทเรื่อง</div><div class="kinds">${KINDS.map(x => `<button class="kind ${KD(c) === x[0] ? 'on' : ''}" data-act="kind" data-k="${x[0]}"><i>${x[1]}</i><span><b>${esc(x[2])}</b><small>${esc(x[3])}</small></span></button>`).join('')}</div>
        <div class="lbl">หัวข้อ *</div>${inp('title', c.title, { ph: T3(c, 'เช่น ฝ้าห้อง 1203 เป็นรอยน้ำจากท่อแอร์รั่ว', 'เช่น ย้ายสายไฟและซ่อมฝ้าคืนสภาพ เพื่อติดตั้งวอลเปเปอร์ (ผู้รับเหมาหลักไม่ดำเนินการ)', 'เช่น ติดตั้งวอลเปเปอร์เพิ่ม ผนังห้องอาหาร · บัวฝ้าเพิ่มตามแบบแก้ไข') })}
        <div class="g2"><div><div class="lbl">${T3(c, 'วันที่พบ', 'วันที่พบปัญหา', 'วันที่ขอราคา')}</div>${inp('found', c.found, { type: 'date' })}</div><div><div class="lbl">พื้นที่ / ตำแหน่ง</div>${inp('area', c.area, { ph: 'อาคาร · ชั้น · ห้อง' })}</div></div>
        <div class="lbl">${T3(c, 'งานของเราที่เสียหาย', 'งานของเราที่ทำต่อไม่ได้', 'หมวดงาน')}</div><div class="chips">${WORKS.map(w => `<button class="chip ${(c.works || []).includes(w) ? 'on' : ''}" data-act="work" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
        <div class="lbl">${T3(c, 'สาเหตุ', 'งานที่ผู้อื่นไม่ดำเนินการ', 'ที่มาของงาน')}</div><div class="chips">${causesOf(KD(c)).map(x => `<button class="chip ${c.cause === x[0] ? 'on' : ''}" data-act="cause" data-c="${x[0]}">${x[1]} ${esc(x[2])}</button>`).join('')}</div>
        <div class="lbl">${T3(c, 'ผู้ทำให้เสียหาย / ฝ่ายที่ต้องรับผิดชอบ', 'ผู้ที่ต้องดำเนินการ (ตามขอบเขตงาน)', 'ผู้ขอ / ผู้สั่งงาน')} <span class="hint">ถ้าทราบ</span></div>${inp('party', c.party, { ph: T3(c, 'เช่น ผู้รับเหมางานระบบไฟฟ้า · ผู้รับเหมาแอร์', 'เช่น ผู้รับเหมาหลัก (Main Contractor) · ผู้รับเหมางานระบบไฟฟ้า', 'เช่น ผู้แทน Owner · ID Designer') })}
        <div class="lbl">${T3(c, 'รายละเอียด', 'รายละเอียด', 'ขอบเขตงาน')}</div>${inp('desc', c.desc, { area: 1, ph: T3(c, 'เกิดอะไร เมื่อไร ขนาดความเสียหาย (กว้าง × ยาว) สิ่งที่ต้องซ่อม', 'แจ้งใครไปแล้ว เมื่อไร ได้คำตอบอย่างไร · งานที่ต้องทำแทน (ย้ายสายไฟ · ซ่อมฝ้า) · ผลกระทบต่องานของเรา', 'ขอบเขตงาน · สเปกวัสดุ / รุ่น · ขนาด / ปริมาณ · สิ่งที่ไม่รวมในราคา') })}
        ${pics('before', T3(c, '📷 รูปความเสียหาย (ก่อนซ่อม)', '📷 รูปสภาพหน้างาน (ปัจจุบัน)', '📷 รูปประกอบ / หน้างาน'))}${pics('after', T3(c, '📷 รูปหลังซ่อม', '📷 รูปหลังดำเนินการ', '📷 รูปหลังดำเนินการ'))}
        ${KD(c) === 'quo' ? `<div class="g2"><div><div class="lbl">ยืนราคา (วัน)</div>${inp('valid', c.valid == null ? 30 : c.valid, { num: 1, ph: '30' })}</div><div><div class="lbl">เงื่อนไขชำระเงิน <span class="hint">ถ้ามี</span></div>${inp('payTerm', c.payTerm, { ph: 'เช่น ตามงวดงานในสัญญาหลัก' })}</div></div>` : ''}
        <div class="lbl">📐 แบบประกอบ * <span class="hint">บังคับ · แนบเป็นเอกสารแนบ ก ของหนังสือ</span></div>${planBox(c)}
        ${KD(c) !== 'dmg' ? '<div class="info">หนังสือจะระบุว่า บริษัทฯ เริ่มดำเนินการเมื่อได้รับอนุมัติเป็นลายลักษณ์อักษร (VO) เท่านั้น · No Signed VO = No Additional Work</div>' : ''}
      </div>
      <div class="blk"><h3><span class="n">2</span>${T3(c, 'ค่าซ่อม + วันทำงาน', 'ราคาเสนอดำเนินการแทน + วันทำงาน', 'รายการราคา + ระยะเวลาดำเนินการ')} <small>ตัวคำนวณ</small></h3>
        <div class="ln-tabs"><button class="btn" data-act="ladd" data-t="lab">+ 👷 ค่าแรง</button><button class="btn" data-act="ladd" data-t="mat">+ 🧱 วัสดุ</button><button class="btn" data-act="ladd" data-t="oth">+ 🛠 อื่น ๆ</button></div>
        ${(c.lines || []).length ? (c.lines || []).map(costLine).join('') : '<div class="info">เพิ่มรายการ: ค่าแรง (คน × วัน × อัตรา) · วัสดุ (จำนวน × ราคา) · อื่น ๆ (เหมา)</div>'}
        ${totals()}
        <div class="g2"><div><div class="lbl">${KD(c) === 'quo' ? 'ระยะเวลาดำเนินการ (วัน)' : 'ขอขยายเวลา (วัน)'}</div>${inp('eot', c.eot, { num: 1, ph: '0' })}</div><div><div class="lbl">${KD(c) === 'quo' ? 'หมายเหตุเวลา' : 'เหตุผลที่กระทบเวลา'}</div>${inp('eotWhy', c.eotWhy, { ph: KD(c) === 'quo' ? 'เช่น สั่งวัสดุ 14 วันหลังอนุมัติ' : 'เช่น ต้องรอแห้ง 3 วันก่อนซ่อม' })}</div></div>
      </div>
      ${c._new ? '' : apWrap(c)}
      <div class="blk"><h3><span class="n">3</span>${T3(c, 'ติดตามเคลม', 'ติดตามการอนุมัติ', 'ติดตามใบเสนอราคา')} <small>แจ้ง → ส่งเคลม → อนุมัติ → วางบิล → รับเงิน</small></h3>${stepper(c)}${c._new ? '<div class="info">ใส่หัวข้อหรือรูปก่อน แล้วระบบจะบันทึกให้อัตโนมัติ</div>' : stageBox(c)}</div>
      ${(c.log || []).length ? `<div class="blk"><h3>ประวัติ</h3><div class="log">${c.log.slice().reverse().map(l => `<div>${esc(l.text)}<br><span>${esc(l.by || '')} · ${when(l.t)}</span></div>`).join('')}</div></div>` : ''}
    </div>
    <div class="bot">${c._new ? '' : `<button class="btn del" data-act="del">🗑</button>`}<button class="btn gold" data-act="print" ${c._new ? 'disabled' : ''}>🖨 ${T3(c, 'หนังสือเคลม', 'หนังสือเสนอราคา', 'ใบเสนอราคา')} ${apOk(c) ? '· ฉบับจริง' : '(DRAFT)'}</button><button class="btn pri grow" data-act="close">✓ เสร็จ</button></div>
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
function schedule() { apCheck(APP.cur); APP.dirty = true; setSv(); clearTimeout(APP.saveT); APP.saveT = setTimeout(save, 800); }
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
  else if (to === 'submitted' && !apOk(c)) { toast('ต้องให้ QS หรือ PM อนุมัติก่อนส่งลูกค้า'); return; }
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
// ---------- พิมพ์หนังสือเคลม: เลือกภาษา ไทย / English / สองภาษา (ข้อความที่ผู้ใช้พิมพ์เอง พิมพ์ตามที่กรอก) ----------
const EN_CAUSE = { owner_req: 'Requested by the Employer / Owner', design_chg: 'Design change by the Designer', site_cond: 'Site condition differs from drawings', ve: 'Value engineering / alternative', no_reloc: 'Electrical / MEP services not relocated or removed', no_fix: 'Ceiling / wall not repaired or reinstated', not_ready: 'Area not ready for our works', no_act: 'No action taken after notification',
  other_con: 'Damage by other contractor', flood: 'Flooding / water ingress', pipe: 'Pipe leak / burst', ac: 'A/C condensate leak', cut_elec: 'Cut-out / removal for electrical works', cut_mep: 'Cut-out / removal for plumbing / A/C works', owner: 'Owner / building user', other: 'Other' };
const EN_WORK = { 'ฝ้า': 'Ceiling', 'ผนัง': 'Wall', 'พื้น': 'Floor', 'วอลเปเปอร์': 'Wallpaper', 'Built-in / เฟอร์นิเจอร์': 'Built-in / furniture', 'ประตู / หน้าต่าง': 'Door / window', 'งานสี / ผิวสำเร็จ': 'Paint / finishes', 'อื่น ๆ': 'Other' };
const EN_CH = { 'หนังสือ': 'letter', 'อีเมล': 'email', 'LINE': 'LINE', 'ประชุมหน้างาน': 'site meeting', 'โทรศัพท์': 'phone' };
const EN_LT = { lab: 'Labour', mat: 'Material', oth: 'Tools / others' };
function pickPrintLang() {
  const old = document.getElementById('cl-lang'); if (old) old.remove();
  const w = document.createElement('div'); w.id = 'cl-lang';
  w.innerHTML = `<div class="ll-scrim"></div><div class="ll-box"><b>พิมพ์หนังสือเคลม · เลือกภาษา</b><small>Print claim letter · choose language</small>
    <button data-l="th">🇹🇭 ภาษาไทย</button><button data-l="en">🇬🇧 English</button><button data-l="both">🇹🇭🇬🇧 ไทย + English (สองภาษา)</button><button data-l="" class="x">ยกเลิก</button></div>
    <style>#cl-lang .ll-scrim{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:90}#cl-lang .ll-box{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:91;width:min(340px,calc(100vw - 32px));background:#fff;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:8px;box-shadow:0 18px 50px rgba(0,0,0,.25)}
    #cl-lang b{font-size:16px}#cl-lang small{color:#8C877D;margin:-6px 0 6px}#cl-lang button{min-height:48px;border-radius:12px;border:1px solid #E4DED2;background:#FBF8F1;font:inherit;font-weight:700;font-size:15px;cursor:pointer;text-align:left;padding:0 14px}
    #cl-lang button:hover{border-color:#C9A961}#cl-lang button.x{background:#fff;color:#8C877D;text-align:center;font-weight:600}</style>`;
  document.body.appendChild(w);
  w.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b && !e.target.classList.contains('ll-scrim')) return; const l = b ? b.dataset.l : ''; w.remove(); if (l) { try { localStorage.setItem('wellcon_print_lang', l); } catch (x) {} printClaim(l); } });
  try { const last = localStorage.getItem('wellcon_print_lang'); const lb = last && w.querySelector('button[data-l="' + last + '"]'); if (lb) lb.style.borderColor = '#C9A961'; } catch (x) {}
}
// แปลข้อความไทยที่ผู้ใช้พิมพ์ → อังกฤษ (ตอนพิมพ์ English / สองภาษา): ① ผู้ช่วย AI ของบริษัท (Supabase function ai-assistant) ② สำรอง Google Translate
async function trThai(list, staffId) {
  const TH = /[\u0E01-\u0E3A\u0E40-\u0E5B]/; /* ตัวอักษรไทย ไม่นับ ฿ */ const uniq = [...new Set((list || []).map(x => String(x == null ? '' : x).trim()).filter(x => TH.test(x)))]; const out = {};
  if (!uniq.length) return out;
  try {
    const r = await fetch(CFG.url + '/functions/v1/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, staffId: staffId || null,
        system: 'You translate Thai text from an interior fit-out contractor (Wellcon Interior) into concise, professional English for client documents. Keep numbers, codes, room numbers, brand and product names unchanged. Transliterate Thai person names (e.g. นนท์ → Non) and company names (บจก. / บริษัท ... จำกัด → ... Co., Ltd.). Reply with a JSON array of strings only — same order and length as the input. No explanations.',
        messages: [{ role: 'user', content: JSON.stringify(uniq) }] }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.text) { const a = JSON.parse(String(d.text).replace(/```[a-z]*\n?/gi, '').trim()); if (Array.isArray(a) && a.length === uniq.length) { uniq.forEach((x, i) => { if (a[i]) out[x] = String(a[i]); }); return out; } }
  } catch (e) {}
  await Promise.all(uniq.map(async x => { try { const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=' + encodeURIComponent(x)); const j = await r.json(); const t = (j[0] || []).map(y => y[0]).join(''); if (t) out[x] = t; } catch (e) {} }));
  return out;
}
async function printClaim(lang) {
  lang = lang || 'th'; const EN = lang === 'en', BOTH = lang === 'both';
  const L = (th, en) => EN ? en : BOTH ? th + ' / ' + en : th;           // ป้ายสั้น
  const P = (th, en) => EN ? en : BOTH ? th + '<br><span class="en">' + en + '</span>' : th;   // ย่อหน้า
  const c = APP.cur, p = APP.proj || {}, k = calc(c), cz = CM[c.cause] || CM.other, s = F(c, 'submitted');
  // เอกสารแนบ ก: render แบบใหม่จาก PDF ต้นฉบับที่ 300 dpi (ขนาดบนกระดาษ A4) · DXF = เวกเตอร์คมชัดทุกขนาด
  let PLU = c.plan ? c.plan.url : ''; const PK = c.plan && WD ? WD.kindOf(wdO(c.plan)) : '';
  if (PK) { try { toast('กำลังเตรียมแบบความละเอียดสูง…'); let cv;
      if (PK === 'pdf') cv = await WD.renderPage(c.plan.pdf, 4300);   // A4 · ~360 dpi
      else { const W0 = 4300, H0 = Math.round(W0 * (c.plan.h || 1) / (c.plan.w || 1)); cv = await WD.renderSvgRegion(c.plan.url, { x: 0, y: 0, w: 1, h: 1 }, W0, H0, 2.2); }
      PLU = cv.toDataURL('image/jpeg', .92); } catch (e) { console.warn('hires print', e); } }
  const amt = num(s.amt) || k.total, days = num(s.days) || num(c.eot);
  const causeTx = EN ? (EN_CAUSE[c.cause] || EN_CAUSE.other) : BOTH ? cz[2] + ' / ' + (EN_CAUSE[c.cause] || EN_CAUSE.other) : cz[2];
  const worksTx = (c.works || []).map(x => EN ? (EN_WORK[x] || x) : BOTH ? x + (EN_WORK[x] && EN_WORK[x] !== x ? ' (' + EN_WORK[x] + ')' : '') : x).join(', ') || '—';
  // v1.369.0 ค่าดำเนินการ + กำไร: ค่าเริ่มต้นรวมไว้ในราคาต่อหน่วย (ไม่เปิดเผยอัตรากำไรในเอกสารลูกค้า) · เปิด "แสดง OH&P แยกบรรทัด" ได้รายเรื่อง
  const APOK = apOk(c), AR = apRec(c);
  const OBS = isObs(c), QUO = KD(c) === 'quo', T = (d, o, q) => QUO ? q : OBS ? o : d, showOH = !!c.ohpShow, fx = (!showOH && k.sub > 0) ? k.pre / k.sub : 1;
  const LN = (c.lines || []).map(l => { const u0 = l.t === 'lab' ? num(l.rate) : l.t === 'mat' ? num(l.price) : num(l.amt); return { l, u: r2(u0 * fx), a: r2(lineAmt(l) * fx) }; });
  if (!showOH && LN.length) { const d = r2(k.pre - LN.reduce((t, x) => t + x.a, 0)); LN[LN.length - 1].a = r2(LN[LN.length - 1].a + d); }
  const rowsF = () => LN.map(({ l, u, a }, i) => { const t = LT[l.t] || LT.oth; const tl = EN ? (EN_LT[l.t] || EN_LT.oth) : BOTH ? t[1] + ' / ' + (EN_LT[l.t] || EN_LT.oth) : t[1];
    const q = l.t === 'lab' ? `${num(l.men)} ${L('คน', 'men')} × ${num(l.days)} ${L('วัน', 'days')}` : l.t === 'mat' ? `${num(l.qty)} ${esc(l.unit || '')}` : L('เหมา', 'Lump sum');
    return `<tr><td>${i + 1}</td><td>${tl} · ${Ui(l.n || '')}</td><td>${q}</td><td class="r">${baht(u)}</td><td class="r">${baht(a)}</td></tr>`; }).join('');
  const ph = (Lst, cap) => (Lst || []).length ? `<h3>${cap}</h3><div class="ph">${Lst.slice(0, 8).map(u => `<img src="${esc(u)}">`).join('')}</div>` : '';
  const nf = F(c, 'notified');
  let TRM = {};
  if (EN || BOTH) { toast('กำลังแปลข้อความเป็นภาษาอังกฤษ…', 6000);
    TRM = await trThai([p.client, p.owner, projName(p), c.title, c.area, (c.plan || {}).name, c.party, c.desc, c.eotWhy, c.payTerm, nf.to, c.by, (apRec(c) || {}).by, ...(c.lines || []).map(l => l.n)], APP.acc && APP.acc.id); }
  const U = (v) => { const x = String(v == null ? '' : v); const t = TRM[x.trim()]; if (EN) return esc(t || x); if (BOTH && t) return esc(x) + '<br><span class="en">' + esc(t) + '</span>'; return esc(x); };
  const Ui = (v) => { const x = String(v == null ? '' : v); const t = TRM[x.trim()]; if (EN) return esc(t || x); if (BOTH && t) return esc(x) + ' (' + esc(t) + ')'; return esc(x); };
  const nfTxF = () => nf.date ? (EN ? `${dmy(nf.date)} by ${esc(EN_CH[nf.ch] || nf.ch || '')}${nf.to ? ' to ' + Ui(nf.to) : ''}`
    : `${dmy(nf.date)} ทาง${esc(nf.ch || '')}${nf.to ? ' ถึง ' + Ui(nf.to) : ''}${BOTH ? ' / by ' + esc(EN_CH[nf.ch] || nf.ch || '') : ''}`) : '';
  const doc = `<!doctype html><html lang="${EN ? 'en' : 'th'}"><head><meta charset="utf-8"><title>${esc(docNo(c, c.no))} · ${T(L('หนังสือเคลมความเสียหาย', 'Damage Claim Letter'), L('หนังสือเสนอราคาดำเนินการแทน', 'Proposed Cost Letter'), L('ใบเสนอราคางานเพิ่มเติม', 'Quotation for Additional Works'))}</title><style>
    @page{size:A4 portrait;margin:14mm}body{font-family:"IBM Plex Sans Thai",Sarabun,sans-serif;font-size:11.5px;color:#1C1B18;line-height:1.55}
    .wm{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:110px;font-weight:700;color:rgba(196,68,46,.10);transform:rotate(-24deg);z-index:0}
    .hd{display:flex;justify-content:space-between;border-bottom:2px solid #1C1B18;padding-bottom:6px}.hd b{font-size:15px}
    h1{font-size:16px;margin:12px 0 2px}h2{font-size:12px;font-weight:400;color:#555;margin:0 0 10px}h3{font-size:12.5px;margin:12px 0 4px}.en{color:#555;font-style:italic}
    table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top}th{background:#F3EDDF;text-align:left}.r{text-align:right;white-space:nowrap}
    .kv td:first-child{width:28%;background:#FAF6EE;font-weight:600}.ph{display:flex;flex-wrap:wrap;gap:4px}.ph img{width:23.5%;height:110px;object-fit:cover;border:1px solid #ccc}
    .sg{display:flex;gap:24px;margin-top:28px}.sg div{flex:1;text-align:center}.sg .ln{border-bottom:1px solid #333;height:34px;margin-bottom:4px}
    .att{page-break-before:always;break-before:page}.att .hd{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #1C1B18;padding-bottom:6px;margin-bottom:8px}.pl{position:relative;margin:0 auto;border:1px solid #bbb}.pl img{position:absolute;inset:0;width:100%;height:100%}
    .pe-box{position:absolute;border:2.5px solid #E03131;background:rgba(224,49,49,.08);border-radius:3px}.pe-pin{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#E03131;color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)}
    .lg{margin-top:6px;font-size:10.5px;color:#444}.apv{display:inline-block;font-weight:700;color:#1F6B3A;margin-top:-26px}.apf{margin-top:16px;font-size:9.5px;color:#6E695E;border-top:1px dashed #ccc;padding-top:4px}.note{font-size:10.5px;color:#8E2F1F;border:1px solid #E8A898;background:#FDECEC;padding:5px 8px;margin-top:10px}</style></head><body>
    ${APOK ? '' : '<div class="wm">DRAFT</div>'}
    <div class="hd"><div><b>${EN ? 'Wellcon Interior Co., Ltd.' : 'บริษัท เวลล์คอน อินทีเรีย จำกัด · Wellcon Interior Co., Ltd.'}</b><br>${EN ? 'Centroport 36/38 Moo 13, Bueng Kham Phroi, Lam Luk Ka, Pathum Thani 12150, Thailand' : 'เซ็นโทรพอร์ต 36/38 ม.13 ต.บึงคำพร้อย อ.ลำลูกกา จ.ปทุมธานี 12150'}<br>${L('เลขประจำตัวผู้เสียภาษี', 'Tax ID')} 0105560007187 · www.wellcon.co.th</div><div style="text-align:right">${L('เลขที่', 'No.')} <b>${esc(s.ref || docNo(c, c.no))}</b><br>${L('วันที่', 'Date')} ${dmy(s.date || isoToday())}</div></div>
    ${QUO ? (EN ? `<h1>Quotation for Additional Works</h1>` : `<h1>ใบเสนอราคางานเพิ่มเติม</h1><h2>Quotation for Additional Works</h2>`) : OBS ? (EN ? `<h1>Notice of Work Obstruction &amp; Proposed Cost to Carry Out Works by Others${days ? ' and Extension of Time' : ''}</h1>` : `<h1>หนังสือแจ้งอุปสรรคการทำงานและเสนอราคาดำเนินการแทน</h1><h2>Notice of Work Obstruction &amp; Proposed Cost to Carry Out Works by Others${days ? ' and Extension of Time' : ''}</h2>`)
      : EN ? `<h1>Notice of Damage &amp; Claim for Repair Cost${days ? ' and Working Time' : ''}</h1>` : `<h1>หนังสือแจ้งความเสียหายและขอเรียกร้องค่าเสียหาย</h1><h2>Notice of Damage &amp; Claim for Repair Cost${days ? ' and Working Time' : ''}</h2>`}
    <table class="kv"><tr><td>${L('เรียน', 'To')}</td><td>${U(p.client || p.owner || (EN ? 'The Employer' : 'ผู้ว่าจ้าง'))}</td></tr><tr><td>${L('โครงการ', 'Project')}</td><td>${U(projName(p))}${projCode(p) ? ' (' + esc(projCode(p)) + ')' : ''}</td></tr>
      <tr><td>${L('เรื่อง', 'Subject')}</td><td>${U(c.title || '')}</td></tr><tr><td>${T(L('วันที่พบ', 'Date found'), L('วันที่พบปัญหา', 'Date identified'), L('วันที่ขอราคา', 'Date requested'))}</td><td>${dmy(c.found)}</td></tr><tr><td>${L('ตำแหน่ง', 'Location')}</td><td>${U(c.area || '—')}</td></tr>
      <tr><td>${T(L('งานที่เสียหาย', 'Affected works'), L('งานของเราที่ได้รับผลกระทบ', 'Our works affected'), L('หมวดงาน', 'Work category'))}</td><td>${esc(worksTx)}</td></tr>${c.cause || !QUO ? `<tr><td>${T(L('สาเหตุ', 'Cause'), L('งานที่ยังไม่ได้ดำเนินการ', 'Outstanding works by others'), L('ที่มาของงาน', 'Origin'))}</td><td>${esc(causeTx)}${c.party && !OBS && !QUO ? ' — ' + L('ผู้เกี่ยวข้อง', 'party') + ': ' + Ui(c.party) : ''}</td></tr>` : ''}
      ${(OBS || QUO) && c.party ? `<tr><td>${QUO ? L('ผู้ขอ / ผู้สั่งงาน', 'Requested by') : L('ผู้ที่ต้องดำเนินการ', 'Responsible party')}</td><td>${Ui(c.party)}</td></tr>` : ''}
      ${nf.date ? `<tr><td>${L('แจ้งเหตุแล้ว', 'Notified')}</td><td>${nfTxF()}</td></tr>` : ''}</table>
    <h3>${T(L('รายละเอียดความเสียหาย', 'Description of damage'), L('รายละเอียด', 'Details'), L('ขอบเขตงาน', 'Scope of works'))}</h3><div>${U(c.desc || '—').replace(/\n/g, '<br>')}</div>
    ${ph((c.photos || {}).before, T(L('รูปความเสียหาย (ก่อนซ่อม)', 'Photos of damage (before repair)'), L('รูปสภาพหน้างาน', 'Site condition photos'), L('รูปประกอบ', 'Reference photos')))}${ph((c.photos || {}).after, T(L('รูปหลังซ่อม', 'Photos after repair'), L('รูปหลังดำเนินการ', 'Photos after works'), L('รูปหลังดำเนินการ', 'Photos after works')))}
    <h3>${T(L('ค่าใช้จ่ายในการซ่อมแซม', 'Repair cost'), L('ราคาเสนอดำเนินการแทน', 'Proposed cost'), L('รายการราคา', 'Price breakdown'))}</h3><table><thead><tr><th>#</th><th>${L('รายการ', 'Item')}</th><th>${L('จำนวน', 'Qty')}</th><th class="r">${L('ราคาต่อหน่วย', 'Unit price')}</th><th class="r">${L('จำนวนเงิน', 'Amount')}</th></tr></thead><tbody>${rowsF() || '<tr><td colspan="5">—</td></tr>'}
      ${showOH ? `<tr><td colspan="4" class="r">${T(L('รวมค่าซ่อม', 'Repair subtotal'), L('รวมค่าดำเนินการ', 'Works subtotal'), L('รวมค่างาน', 'Works subtotal'))}</td><td class="r">${baht(k.sub)}</td></tr><tr><td colspan="4" class="r">${L('ค่าดำเนินการ + กำไร', 'Overhead & profit')} ${num(c.ohp)}%</td><td class="r">${baht(k.ohp)}</td></tr>` : ''}
      <tr><td colspan="4" class="r">${L('รวมก่อน VAT', 'Total before VAT')}</td><td class="r">${baht(k.pre)}</td></tr><tr><td colspan="4" class="r">VAT 7%</td><td class="r">${baht(k.vat)}</td></tr>
      <tr><td colspan="4" class="r"><b>${QUO ? (c.vatOn === false ? L('ยอดเสนอราคา (ไม่รวม VAT)', 'Quotation amount (excl. VAT)') : L('ยอดเสนอราคา (รวม VAT)', 'Quotation amount (incl. VAT)')) : OBS ? (c.vatOn === false ? L('ยอดเสนอราคา (ไม่รวม VAT)', 'Proposed amount (excl. VAT)') : L('ยอดเสนอราคา (รวม VAT)', 'Proposed amount (incl. VAT)')) : (c.vatOn === false ? L('ยอดเรียกร้อง (ไม่รวม VAT)', 'Claim amount (excl. VAT)') : L('ยอดเรียกร้อง (รวม VAT)', 'Claim amount (incl. VAT)'))}</b></td><td class="r"><b>${baht(amt)}</b></td></tr></tbody></table>
    ${days ? `<h3>${T(L('ระยะเวลาทำงาน', 'Working time'), L('ระยะเวลาทำงาน / ขอขยายเวลา', 'Working time / extension of time'), L('ระยะเวลาดำเนินการ', 'Duration'))}</h3><div>${days} ${L('วัน', 'days')}${c.eotWhy ? ' — ' + Ui(c.eotWhy) : ''}</div>` : ''}
    ${QUO ? `<h3>${L('เงื่อนไข', 'Terms')}</h3><ol style="margin:0;padding-left:18px">
      <li>${P('ราคานี้ยืนราคา ' + (num(c.valid) || 30) + ' วัน นับจากวันที่ในเอกสาร', 'This quotation is valid for ' + (num(c.valid) || 30) + ' days from the date above.')}</li>
      <li>${P('บริษัทฯ จะเริ่มดำเนินการเมื่อได้รับการอนุมัติเป็นลายลักษณ์อักษร (Variation Order / ใบสั่งงานที่ลงนามแล้ว)', 'Works will commence only upon receipt of written approval (signed Variation Order).')}</li>
      <li>${P('ราคานี้รวมเฉพาะรายการที่ระบุไว้ข้างต้น งานที่ไม่ได้ระบุถือเป็นงานเพิ่มเติม', 'Prices cover only the items listed above; any other works will be treated as additional works.')}</li>
      ${days ? `<li>${P('ระยะเวลาดำเนินการ ' + days + ' วัน นับจากวันที่ได้รับอนุมัติและพื้นที่พร้อมทำงาน', 'Duration: ' + days + ' days from approval and access to a ready work area.')}</li>` : ''}
      ${c.payTerm ? `<li>${L('เงื่อนไขชำระเงิน', 'Payment terms')}: ${Ui(c.payTerm)}</li>` : ''}</ol>` : ''}
    <div style="margin-top:10px">${QUO ? P('บริษัทฯ ขอเสนอราคาสำหรับงานเพิ่มเติมตามรายละเอียดข้างต้น จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ', 'We are pleased to submit our quotation for the additional works described above, for your kind consideration and approval.') : OBS ? P('บริษัทฯ ขอเรียนแจ้งว่า งานตามรายละเอียดข้างต้นซึ่งอยู่ในความรับผิดชอบของ' + (c.party ? ' ' + esc(c.party) : 'ผู้เกี่ยวข้อง') + ' ยังไม่ได้รับการดำเนินการ แม้บริษัทฯ ได้แจ้งแล้ว ทำให้บริษัทฯ ไม่สามารถดำเนินงาน' + esc((c.works || []).join(', ') || 'ของบริษัทฯ') + 'ได้ตามแผนงาน เพื่อไม่ให้งานล่าช้าเพิ่มเติม บริษัทฯ ขอเสนอดำเนินการแทนตามราคาข้างต้น' + (days ? ' และขอขยายระยะเวลา ' + days + ' วัน' : '') + ' ทั้งนี้ บริษัทฯ จะเริ่มดำเนินการเมื่อได้รับการอนุมัติเป็นลายลักษณ์อักษร (Variation Order) และขอสงวนสิทธิ์ในการขอขยายระยะเวลาสำหรับความล่าช้าที่เกิดจากเหตุนี้ จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ',
      'We wish to inform you that the works described above, which are the responsibility of ' + (c.party ? Ui(c.party) : 'others') + ', have not been carried out despite our notification. This has prevented us from proceeding with our ' + esc(worksTx === '—' ? 'works' : worksTx.toLowerCase() + ' works') + ' as programmed. To avoid further delay, we propose to carry out these works on their behalf at the cost stated above' + (days ? ', with an extension of time of ' + days + ' days' : '') + '. The works will commence only upon receipt of your written approval (Variation Order). We reserve our right to an extension of time for any delay arising from this matter. We would be grateful for your kind consideration and approval.') : P('บริษัทฯ ขอเรียนแจ้งความเสียหายต่องานของบริษัทฯ ซึ่งเกิดจากสาเหตุที่อยู่นอกขอบเขตความรับผิดชอบของบริษัทฯ ตามรายละเอียดข้างต้น และขอเรียกร้องค่าใช้จ่ายในการซ่อมแซม' + (days ? ' และการขยายระยะเวลา' : '') + ' จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ',
      'We hereby notify you of the damage to our works, caused by matters outside our scope of responsibility as detailed above, and claim the cost of repair' + (days ? ' together with the additional working time' : '') + '. We would be grateful for your kind consideration and approval.')}</div>
    <div class="sg"><div><div class="ln"></div>${L('ผู้จัดทำ', 'Prepared by')}<br>${Ui(c.by || '')}</div><div><div class="ln"></div>${APOK ? `<span class="apv">${Ui(AR.by)} · ${dmy(String(AR.at).slice(0, 10))}</span><br>` : ''}${L('ผู้อนุมัติ', 'Approved by')} · Wellcon Interior</div><div><div class="ln"></div>${OBS || QUO ? L('ผู้อนุมัติ · ผู้ว่าจ้าง', 'Approved by · Employer') : L('ผู้รับทราบ · ผู้ว่าจ้าง', 'Acknowledged by · Employer')}</div></div>
    ${c.plan ? (() => { const PL = c.plan, ar = (PL.h || 1) / (PL.w || 1), wmm = Math.min(182, 215 / ar); return `<div class="att"><div class="hd"><div><b>${L('เอกสารแนบ ก · แบบแสดงตำแหน่ง', 'Attachment A · Location plan')}</b><br>${U(PL.name || '')}</div><div style="text-align:right">${L('อ้างอิง', 'Ref.')} <b>${esc(s.ref || docNo(c, c.no))}</b><br>${U(c.title || '')}</div></div>
      <div class="pl" style="width:${wmm.toFixed(1)}mm;height:${(wmm * ar).toFixed(1)}mm"><img src="${PLU.indexOf('data:') === 0 ? PLU : esc(PLU)}" alt="">${planOv(PL, true)}</div>
      <div class="lg">${(PL.pins || []).length ? L('หมายเลข', 'Markers') + ' 1–' + PL.pins.length + ' = ' + L('ตำแหน่งงานตามหนังสือฉบับนี้', 'locations referred to in this letter') : ''}${(PL.boxes || []).length ? ((PL.pins || []).length ? ' · ' : '') + L('กรอบสีแดง = พื้นที่ดำเนินการ', 'Red box = work area') : ''}${c.area ? ' · ' + L('ตำแหน่ง', 'Location') + ': ' + U(c.area) : ''}</div></div>`; })() : ''}
    ${APOK ? `<div class="apf">${L('อนุมัติเอกสารแล้ว', 'Document approved')}: ${AP_ROLE[AR.role] ? AP_ROLE[AR.role] + ' ' : ''}${Ui(AR.by)} (${dmy(String(AR.at).slice(0, 10))})</div>` : ''}
    </body></html>`;
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
  else if (a === 'kind' && c) { const k = b.dataset.k; if ((c.kind || 'dmg') !== k) { c.kind = k; if (!CM[c.cause] || !causesOf(k).some(x => x[0] === c.cause)) c.cause = ''; if (k === 'quo' && c.valid == null) c.valid = 30; logPush(c, 'ประเภท → ' + (KINDS.find(x => x[0] === k) || [0, 0, k])[2]); } renderSheet(); schedule(); }
  else if (a === 'ladd' && c) { const t = b.dataset.t; c.lines = [...(c.lines || []), t === 'lab' ? { t, n: '', men: '', days: '', rate: '' } : t === 'mat' ? { t, n: '', qty: '', unit: '', price: '' } : { t, n: '', amt: '' }]; renderSheet(); schedule(); }
  else if (a === 'lrm' && c) { c.lines.splice(+b.dataset.i, 1); renderSheet(); schedule(); }
  else if (a === 'picdel' && c) { if (!confirm('ลบรูปนี้?')) return; c.photos[b.dataset.k].splice(+b.dataset.i, 1); logPush(c, 'ลบรูป 1 รูป'); renderSheet(); schedule(); }
  else if (a === 'lb') { const d = document.createElement('div'); d.className = 'lb'; d.innerHTML = `<img src="${esc(b.dataset.u)}">`; d.onclick = () => d.remove(); document.body.appendChild(d); }
  else if (a === 'go' && c) go(b.dataset.to);
  else if (a === 'planproj' && c) pickProjPlan();
  else if (a === 'planed' && c) openPlanEditor();
  else if (a === 'plandel' && c) { if (confirm('ลบแบบประกอบออกจากเรื่องนี้?')) { c.plan = null; logPush(c, 'ลบแบบประกอบ'); renderSheet(); schedule(); } }
  else if (a === 'appr' && c) { const k = b.dataset.k; if (!canAp(k)) { toast('บัญชีนี้ไม่มีสิทธิ์อนุมัติขั้นนี้'); return; } const ap = apOf(c), t = calc(c).total;
    if (!c.plan) { toast('ต้องแนบแบบประกอบก่อนอนุมัติ'); return; }
    const msg = 'ยืนยันอนุมัติเอกสาร: ตรวจตัวเลข (ยอด ' + baht(t) + ') เนื้อหา รูป และแบบประกอบแล้ว\nลายน้ำ DRAFT จะหายไป และพิมพ์ฉบับจริงส่งลูกค้าได้';
    if (!confirm(msg)) return; const h = apHash(c); const cur = { back: (c.appr || {}).back || null };
    c.appr = { ...cur, h, [k]: { by: APP.me.name, role: APP.me.role, at: new Date().toISOString(), amt: t } };
    logPush(c, 'อนุมัติเอกสาร (' + (AP_ROLE[APP.me.role] || APP.me.role || '') + ') · ' + baht(t) + ' — พร้อมส่งลูกค้า'); renderSheet(); schedule(); toast('✓ อนุมัติแล้ว — พิมพ์ฉบับจริงได้'); }
  else if (a === 'unappr' && c) { const k = b.dataset.k; if (!c.appr) return; c.appr = { back: c.appr.back || null }; logPush(c, 'ยกเลิกการอนุมัติเอกสาร'); renderSheet(); schedule(); }
  else if (a === 'apback' && c) { const why = prompt('เหตุผลที่ส่งกลับแก้ไข (ผู้จัดทำจะเห็นข้อความนี้)', ''); if (why === null) return; c.appr = { back: { by: APP.me.name, at: new Date().toISOString(), why: why.trim() } }; logPush(c, '↩ ส่งกลับแก้ไข' + (why.trim() ? ' — ' + why.trim() : '')); renderSheet(); schedule(); toast('ส่งกลับแก้ไขแล้ว'); }
  else if (a === 'undo' && c) undo();
  else if (a === 'resubmit' && c) { c.st = 'notified'; if (c.flow) { delete c.flow.rejected; delete c.flow.submitted; delete c.flow.approved; } logPush(c, 'เตรียมส่งเคลมใหม่'); renderSheet(); schedule(); }
  else if (a === 'del' && c) { if (!confirm('ลบเคลม ' + c.no + ' ?\nรูปและประวัติของเคลมนี้จะถูกลบด้วย')) return;
    try { const m = await stWrite(KEY, (m) => { m[APP.pid] = (m[APP.pid] || []).filter(x => x.id !== c.id); return m; }); APP.claims = m[APP.pid] || [];
      const keys = [...((c.photos || {}).before || []), ...((c.photos || {}).after || [])].map(u => (String(u).split('/' + BUCKET + '/')[1] || '').split('?')[0]).filter(Boolean);
      if (keys.length) sb.storage.from(BUCKET).remove(keys).catch(() => {});
      APP.cur = null; APP.dirty = false; clearTimeout(APP.saveT); const h = $('sheetHost'); if (h) h.innerHTML = ''; render(); toast('ลบเคลมแล้ว'); } catch (x) { toast('ลบไม่สำเร็จ'); } }
  else if (a === 'print' && c) { if (APP.dirty) await save(); pickPrintLang(); }
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
  if (t.dataset.planup && c) { const f = (t.files || [])[0]; t.value = ''; if (f) uploadPlan(f); return; }
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
