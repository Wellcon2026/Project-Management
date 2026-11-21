/* =====================================================================
   Wellcon Photo Editor — แต่งรูปผลงานแบบง่าย (หน้าแยกใน Wellcon PM: photo.html · ติดตั้งเป็นไอคอนแยกได้ photo.webmanifest)
   ---------------------------------------------------------------------
   • ครอป (สัดส่วน · ปรับเอียง + อัตโนมัติ · เส้นตาราง) · หมุน 90° / กลับด้าน · ดัดเส้นตรง (เส้นนำ Guided + ปรับเอง)
     · เอฟเฟกต์: พื้นผิว (Texture) · ความคมชัด (Clarity) · ลดหมอก (Dehaze) · ขอบมืด (Vignette) · เกรน (Grain)
   • เปลี่ยนชื่อหลายรูป (v1.4.0): ชื่อ + เลขรัน — เลือกโฟลเดอร์ในเครื่อง (เปลี่ยนชื่อไฟล์จริง · ย้อนกลับได้ · Chrome / Edge บนคอม) หรือเลือกรูป → ZIP ชื่อใหม่
   • ทำงานในเบราว์เซอร์ทั้งหมด (ไม่มีไลบรารีเพิ่ม) — รูปไม่ถูกอัปโหลด · ไฟล์ต้นฉบับไม่ถูกแก้ (บันทึกเป็น JPEG ไฟล์ใหม่)
   • ตำแหน่งทั้งหมดเก็บเป็นหน่วยสัมพัทธ์ (ไม่ขึ้นกับความละเอียด) → ภาพตัวอย่าง (≤1600 px) กับไฟล์ที่บันทึก (เต็มความละเอียด) ตรงกัน
   • ใช้การเข้าสู่ระบบของ Wellcon PM · สิทธิ์ = การ์ด 'tab:photo' (ชุดเดียวกับแอปหลัก)
   ===================================================================== */
(() => {
'use strict';
const PE_VER = 'v1.4.0';
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h))) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14, TAB = 'tab:photo';
const PREV = 1600;                                   // ภาพตัวอย่างด้านยาวสุด (px)
const MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const EMBED = /[?&]embed=1/.test(location.search) && window.parent !== window;   // เปิดจาก Layboard (แต่งรูปบนบอร์ด)
const OUT_MAX = EMBED ? (MOBILE ? 4096 : 5000) : MOBILE ? 4096 : 6000;   // ไฟล์ที่บันทึก ด้านยาวสุด (iPhone จำกัดขนาด canvas · Layboard เก็บรูปสูงสุด 5000 px)
const toParent = (m) => { try { window.parent.postMessage(m, location.origin); } catch (e) {} };
// SOLO: สำเนาในแอป Layboard แยก (layboard.vercel.app · photo-editor.html ตั้ง window.PE_CFG = { solo: true }) — ไม่มีบัญชี Wellcon PM · ทำงานในเครื่องล้วน · หน้า photo.html ใน PM ไม่ตั้งค่านี้
const SOLO = !!(window.PE_CFG && window.PE_CFG.solo);
const sb = SOLO ? null : window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const uid = (p) => (p || 'i') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pmUrl = () => SOLO ? '/' : '/' + (IS_STG ? '?env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busyTxt').textContent = txt; }
const tick = () => new Promise(r => setTimeout(r, 30));

const APP = { me: null, photos: [], cur: -1, panel: 'geo', guideMode: false, before: false, dirty: false, view: 'edit', wbPick: false, mixSel: 'red' };
const DEF = () => ({ rot: 0, fh: false, fv: false, angle: 0, upright: 'off', guides: [], tf: { v: 0, h: 0, r: 0, a: 0, s: 100, x: 0, y: 0 },
  constrain: true, aspect: 'orig', crop: null, overlay: 'thirds', fx: { tex: 0, cla: 0, dhz: 0, vig: 0, grn: 0 },
  lc: { exp: 0, con: 0, hi: 0, sh: 0, wh: 0, bl: 0, curve: [0, 0.25, 0.5, 0.75, 1], temp: 0, tint: 0, wb: null, vib: 0, sat: 0, mix: {} } });
const FX = [['tex', 'พื้นผิว', 'Texture', -100, 100], ['cla', 'ความคมชัด', 'Clarity', -100, 100], ['dhz', 'ลดหมอก', 'Dehaze', -100, 100], ['vig', 'ขอบมืด / สว่าง', 'Vignette', -100, 100], ['grn', 'เกรนฟิล์ม', 'Grain', 0, 100]];
const TF = [['v', 'แนวตั้ง', 'Vertical', -100, 100, 1], ['h', 'แนวนอน', 'Horizontal', -100, 100, 1], ['r', 'หมุน', 'Rotate', -10, 10, 0.1], ['a', 'สัดส่วนภาพ', 'Aspect', -100, 100, 1], ['s', 'ขนาด', 'Scale', 50, 150, 1], ['x', 'เลื่อนซ้าย-ขวา', 'X Offset', -100, 100, 1], ['y', 'เลื่อนขึ้น-ลง', 'Y Offset', -100, 100, 1]];
const ASPECTS = [['orig', 'ตามรูปเดิม'], ['free', 'อิสระ'], ['1:1', '1 : 1 (จัตุรัส)'], ['4:5', '4 : 5 (โพสต์แนวตั้ง)'], ['5:4', '5 : 4'], ['3:4', '3 : 4'], ['4:3', '4 : 3'], ['2:3', '2 : 3'], ['3:2', '3 : 2'], ['9:16', '9 : 16 (สตอรี่)'], ['16:9', '16 : 9 (จอกว้าง)']];

// =====================================================================
// เข้าสู่ระบบ + สิทธิ์
// =====================================================================
function msg(t, s) { $('msgBody').innerHTML = `<img src="photo-icon.svg" alt="" style="width:80px;height:80px"><h1 style="font-size:20px;margin:0">${t}</h1><p>${s}</p>${EMBED ? '<button class="btn dk" data-act="toPm">ปิด กลับไป Layboard</button>' : `<a class="btn dk" style="text-decoration:none" href="${pmUrl()}">ไปหน้า Wellcon PM</a>`}`; }
async function boot() {
  if (EMBED) {   // แต่งรูปจาก Layboard: รูปเดียว · ไม่มีปุ่มหน้าแรก / ออกจากระบบ · ปุ่มบันทึก = ใช้รูปนี้ในบอร์ด
    const st = document.createElement('style'); st.textContent = '.pmhome,.pmnav,#hbClose,.fadd,.fi .x{display:none!important}'; document.head.appendChild(st);
    $('hbSave').innerHTML = '✓<span class="tx"> ใช้รูปนี้ในบอร์ด</span>'; $('hbSave').title = 'แทนที่รูปบน Layboard ด้วยรูปที่แต่งแล้ว';
    document.querySelectorAll('[data-act="toPm"]').forEach(b => { b.setAttribute('aria-label', 'ยกเลิก กลับไป Layboard'); b.title = 'ยกเลิก กลับไป Layboard'; });
    window.addEventListener('message', async (e) => { if (e.origin !== location.origin || e.source !== window.parent) return; const m = e.data || {};
      if (m.t === 'pe-open' && m.blob) { const f = new File([m.blob], (m.name || 'รูปจาก Layboard') + '.jpg', { type: m.blob.type || 'image/jpeg' }); await addFiles([f]); APP.dirty = false; renderHead(); } });
  }
  if (SOLO) {   // แอป Layboard แยก: ไม่ตรวจบัญชี Wellcon PM
    APP.me = { email: '', name: '', role: '' }; $('scrMsg').hidden = true; $('scrMain').hidden = false; renderAll();
    if (EMBED) { busy(true, 'กำลังโหลดรูปจาก Layboard…'); toParent({ t: 'pe-ready' }); setTimeout(() => { if (!APP.photos.length) busy(false); }, 15000); }
    return; }
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'โหมดทดสอบ (staging)'; s.prepend(d); });
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “Photo Editor” จากหน้าแรก'); return; }
    const [a, st] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('app_state').select('id,data').in('id', ['featGlobal', 'workPages', 'workUser', 'workUserAdd'])]);
    if (a.error) throw a.error;
    const accs = (a.data || []).map(r => ({ ...(r.data || {}), id: r.id }));
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && accs.find(x => norm(x.email) === norm(sess.email) && x.active !== false && !x.disabled);
    if (!acc) { msg('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “Photo Editor” จากหน้าแรก'); return; }
    APP.me = { email: norm(acc.email), name: nickOf(acc), role: acc.roleKey || '' };
    const sv = (id) => { const r = ((!st.error && st.data) || []).find(x => x.id === id); return (r && r.data && r.data.v) || {}; };
    if (sv('featGlobal')[TAB] === false) { msg('ผู้ดูแลระบบปิด Photo Editor ไว้', 'ถ้าต้องการใช้งาน แจ้ง Admin เปิดที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง'); return; }
    const WP = sv('workPages'), rl = WP[APP.me.role], mine = [...(sv('workUser')[APP.me.email] || []), ...(sv('workUserAdd')[APP.me.email] || [])];
    if (APP.me.role !== 'superadmin' && Array.isArray(rl) && rl.indexOf(TAB) < 0 && mine.indexOf(TAB) < 0) { msg('Photo Editor ยังไม่ได้เปิดให้ตำแหน่งของคุณ', 'แจ้ง Admin เพิ่ม “Photo Editor” ที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง'); return; }
    try { if (sb) sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'photo' }).then(() => {}, () => {}); } catch (e) {}
    if (window.WCTag) WCTag.setup({ sb, app: 'Photo Editor', me: APP.me, accounts: accs.filter(x => x.active !== false && !x.disabled), projects: [] });
    $('scrMsg').hidden = true; $('scrMain').hidden = false; renderAll();
    if (EMBED) { busy(true, 'กำลังโหลดรูปจาก Layboard…'); toParent({ t: 'pe-ready' }); setTimeout(() => { if (!APP.photos.length) busy(false); }, 15000); }
  } catch (e) { console.error(e); msg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', esc((e && e.message) || e)); }
}

// =====================================================================
// เมทริกซ์ 3×3 (พิกัดเอกพันธ์) — หน่วยสัมพัทธ์: จุดศูนย์กลางภาพ = 0 · ด้านยาวสุด = 1
// =====================================================================
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function mul(a, b) { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; }
function inv(m) { const [a, b, c, d, e, f, g, h, i] = m; const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C; if (Math.abs(det) < 1e-12) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]; }
function ap(m, x, y) { const w = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]; }
const Rm = (t) => { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const Tm = (x, y) => [1, 0, x, 0, 1, y, 0, 0, 1];
const Sm = (x, y) => [x, 0, 0, 0, y, 0, 0, 0, 1];
function solve(A, b) {   // Gauss-Jordan · partial pivot
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]); }
function homography(P, Q) {   // DLT least squares (h33 = 1) · P → Q
  const N = Array.from({ length: 8 }, () => new Array(8).fill(0)), r = new Array(8).fill(0);
  const add = (row, v) => { for (let i = 0; i < 8; i++) { r[i] += row[i] * v; for (let j = 0; j < 8; j++) N[i][j] += row[i] * row[j]; } };
  P.forEach(([x, y], k) => { const [u, v] = Q[k]; add([x, y, 1, 0, 0, 0, -u * x, -u * y], u); add([0, 0, 0, x, y, 1, -v * x, -v * y], v); });
  const h = solve(N, r); return h ? [...h, 1] : null; }

// ---------- เส้นนำ (Guided Upright): เส้นที่ลาก → ทำให้ตั้งตรง / ได้ระดับ ----------
function guidedG(gs) {
  if (!gs.length) return I3;
  const dir = (g) => Math.abs(g.b[1] - g.a[1]) >= Math.abs(g.b[0] - g.a[0]) ? 'v' : 'h';
  if (gs.length === 1) { const g = gs[0], dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1]; return Rm(dir(g) === 'v' ? Math.atan(dx / dy) : Math.atan(-dy / dx)); }
  const P = [], Q = [];
  gs.forEach(g => { const [x1, y1] = g.a, [x2, y2] = g.b; P.push(g.a, g.b);
    if (dir(g) === 'v') { const m = (x1 + x2) / 2; Q.push([m, y1], [m, y2]); } else { const m = (y1 + y2) / 2; Q.push([x1, m], [x2, m]); } });
  const H = homography(P, Q); if (!H) return null;
  const [cx, cy] = ap(H, 0, 0); return mul(Tm(-cx, -cy), H);
}
// ---------- ขนาดภาพหลังหมุน 90° ----------
const oDims = (s, W, H) => (s.rot % 2) ? [H, W] : [W, H];
// ---------- การแปลงทั้งหมด: oriented (หน่วยสัมพัทธ์) → frame ----------
function geo(p) {
  const s = p.s, [Wo, Ho] = oDims(s, p.W, p.H), D = Math.max(Wo, Ho), fw = Wo / D, fh = Ho / D;
  let G = s.upright === 'guided' ? (guidedG(s.guides) || I3) : I3;
  const t = s.tf, kv = t.v / 100 * 0.55, kh = t.h / 100 * 0.55, sx = Math.pow(2, t.a / 200), sc = t.s / 100;
  let M = G;
  M = mul([1, 0, 0, 0, 1, 0, 0, -kv, 1], M);            // + = ด้านบนกว้างขึ้น (แก้กล้องเงยถ่าย)
  M = mul([1, 0, 0, 0, 1, 0, -kh, 0, 1], M);            // + = ด้านซ้ายกว้างขึ้น
  { const [cx, cy] = ap(M, 0, 0); M = mul(Tm(-cx, -cy), M); }
  M = mul(Rm(t.r * Math.PI / 180), M);
  M = mul(Sm(sx * sc, sc / sx), M);
  M = mul(Tm(t.x / 100 * 0.3 * fw, t.y / 100 * 0.3 * fh), M);
  M = mul(Rm(s.angle * Math.PI / 180), M);
  const Mi = inv(M) || I3;
  return { T: M, Ti: Mi, fw, fh, Wo, Ho, D };
}
function cropRect(p, g) { g = g || geo(p); return p.s.crop || { x: -g.fw / 2, y: -g.fh / 2, w: g.fw, h: g.fh }; }
function inside(g, x, y) { const [u, v] = ap(g.Ti, x, y); return Math.abs(u) <= g.fw / 2 + 1e-6 && Math.abs(v) <= g.fh / 2 + 1e-6; }
function rectOk(g, r) { const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h], [r.x + r.w / 2, r.y], [r.x + r.w / 2, r.y + r.h], [r.x, r.y + r.h / 2], [r.x + r.w, r.y + r.h / 2]];
  return pts.every(([x, y]) => inside(g, x, y)); }
const inFrame = (g, r) => r.x >= -g.fw / 2 - 1e-6 && r.y >= -g.fh / 2 - 1e-6 && r.x + r.w <= g.fw / 2 + 1e-6 && r.y + r.h <= g.fh / 2 + 1e-6;
function aspectOf(p, g) { const a = p.s.aspect; if (a === 'orig') return g.fw / g.fh; if (a === 'free') { const c = p.s.crop; return c ? c.w / c.h : g.fw / g.fh; } const [x, y] = a.split(':').map(Number); return x / y; }
const needFit = (s) => s.constrain || Math.abs(s.angle) > 0.001;
function fitCrop(p, keepCenter) {   // ครอปใหญ่สุดตามสัดส่วน (ไม่ให้ขอบขาวเข้ามาเมื่อเปิด "ครอปพอดีภาพ" / ปรับเอียง)
  const g = geo(p), r = aspectOf(p, g), c0 = p.s.crop && keepCenter ? [p.s.crop.x + p.s.crop.w / 2, p.s.crop.y + p.s.crop.h / 2] : [0, 0];
  const strict = needFit(p.s);
  const tryC = (cx, cy) => { let lo = 0, hi = Math.min(g.fh, g.fw / r);
    const ok = (h) => { const R = { x: cx - h * r / 2, y: cy - h / 2, w: h * r, h }; return inFrame(g, R) && (!strict || rectOk(g, R)); };
    if (!ok(hi * 0.002)) return 0; if (ok(hi)) return hi; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } return lo; };
  let h = tryC(c0[0], c0[1]), c = c0; if (h < 0.05) { h = tryC(0, 0); c = [0, 0]; }
  if (h <= 0) { p.s.crop = null; return; }
  const R = { x: c[0] - h * r / 2, y: c[1] - h / 2, w: h * r, h };
  p.s.crop = (Math.abs(R.w - g.fw) < 1e-4 && Math.abs(R.h - g.fh) < 1e-4) ? null : R;
}

// =====================================================================
// วาดภาพ: frame (หน่วยสัมพัทธ์) → พิกเซลต้นฉบับ (bilinear) · นอกภาพ = ขาว
// =====================================================================
function renderGeo(p, src, rect, outW, outH) {
  const s = p.s, Ws = src.width, Hs = src.height, sd = src.data, [Wo, Ho] = oDims(s, Ws, Hs), D = Math.max(Wo, Ho);
  const g = geo(p), Ti = g.Ti, out = new ImageData(outW, outH), od = out.data;
  const dx = rect.w / outW, dy = rect.h / outH, rot = s.rot, fh = s.fh, fv = s.fv, W1 = Ws - 1, H1 = Hs - 1;
  for (let j = 0; j < outH; j++) {
    const ny = rect.y + (j + 0.5) * dy; let nx = rect.x + 0.5 * dx;
    let X = Ti[0] * nx + Ti[1] * ny + Ti[2], Y = Ti[3] * nx + Ti[4] * ny + Ti[5], Wt = Ti[6] * nx + Ti[7] * ny + Ti[8];
    const aX = Ti[0] * dx, aY = Ti[3] * dx, aW = Ti[6] * dx; let o = j * outW * 4;
    for (let i = 0; i < outW; i++, X += aX, Y += aY, Wt += aW, o += 4) {
      let px = (X / Wt) * D + Wo / 2, py = (Y / Wt) * D + Ho / 2;
      if (fh) px = Wo - px; if (fv) py = Ho - py;
      let sx, sy; if (rot === 0) { sx = px; sy = py; } else if (rot === 1) { sx = py; sy = Hs - px; } else if (rot === 2) { sx = Ws - px; sy = Hs - py; } else { sx = Ws - py; sy = px; }
      sx -= 0.5; sy -= 0.5;
      if (sx < -0.5 || sy < -0.5 || sx > W1 + 0.5 || sy > H1 + 0.5) { od[o] = od[o + 1] = od[o + 2] = 255; od[o + 3] = 255; continue; }
      if (sx < 0) sx = 0; if (sy < 0) sy = 0; if (sx > W1) sx = W1; if (sy > H1) sy = H1;
      const x0 = sx | 0, y0 = sy | 0, x1 = x0 < W1 ? x0 + 1 : x0, y1 = y0 < H1 ? y0 + 1 : y0, fx = sx - x0, fy = sy - y0;
      const a = (y0 * Ws + x0) * 4, b = (y0 * Ws + x1) * 4, c = (y1 * Ws + x0) * 4, d = (y1 * Ws + x1) * 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      od[o] = sd[a] * w00 + sd[b] * w10 + sd[c] * w01 + sd[d] * w11;
      od[o + 1] = sd[a + 1] * w00 + sd[b + 1] * w10 + sd[c + 1] * w01 + sd[d + 1] * w11;
      od[o + 2] = sd[a + 2] * w00 + sd[b + 2] * w10 + sd[c + 2] * w01 + sd[d + 2] * w11;
      od[o + 3] = 255;
    }
  }
  return out;
}

// ---------- เบลอแบบกล่อง 3 รอบ (ใกล้ Gaussian) ----------
function boxBlur(src, W, H, r) {
  if (r < 1) return Float32Array.from(src);
  let a = Float32Array.from(src), b = new Float32Array(src.length); const iw = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) { const o = y * W; let acc = a[o] * (r + 1); for (let k = 1; k <= r; k++) acc += a[o + Math.min(k, W - 1)];
      for (let x = 0; x < W; x++) { b[o + x] = acc * iw; acc += a[o + Math.min(x + r + 1, W - 1)] - a[o + Math.max(x - r, 0)]; } }
    for (let x = 0; x < W; x++) { let acc = b[x] * (r + 1); for (let k = 1; k <= r; k++) acc += b[Math.min(k, H - 1) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = acc * iw; acc += b[Math.min(y + r + 1, H - 1) * W + x] - b[Math.max(y - r, 0) * W + x]; } }
  }
  return a;
}
function shrink(L, W, H, f) { const w = Math.max(1, Math.ceil(W / f)), h = Math.max(1, Math.ceil(H / f)), a = new Float32Array(w * h), n = new Float32Array(w * h);
  for (let y = 0; y < H; y++) { const yy = (y / f) | 0; for (let x = 0; x < W; x++) { const k = yy * w + ((x / f) | 0); a[k] += L[y * W + x]; n[k]++; } }
  for (let i = 0; i < a.length; i++) a[i] /= n[i] || 1; return { a, w, h }; }
function upAt(S, f, x, y) { let fx = (x + 0.5) / f - 0.5, fy = (y + 0.5) / f - 0.5; if (fx < 0) fx = 0; if (fy < 0) fy = 0; if (fx > S.w - 1) fx = S.w - 1; if (fy > S.h - 1) fy = S.h - 1;
  const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(x0 + 1, S.w - 1), y1 = Math.min(y0 + 1, S.h - 1), ax = fx - x0, ay = fy - y0, A = S.a;
  return (A[y0 * S.w + x0] * (1 - ax) + A[y0 * S.w + x1] * ax) * (1 - ay) + (A[y1 * S.w + x0] * (1 - ax) + A[y1 * S.w + x1] * ax) * ay; }
function hash2(x, y) { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967295 * 2 - 1; }

// =====================================================================
// เอฟเฟกต์ (ค่าทุกตัวสัมพัทธ์กับขนาดภาพ → ตัวอย่างกับไฟล์จริงเหมือนกัน)
// =====================================================================
// =====================================================================
// แสง · สี (Light · Color) — ลำดับ: สมดุลแสงขาว → ความสว่าง (เชิงเส้น) → โทน (คอนทราสต์ · ส่วนสว่าง / มืด · ขาว / ดำ · เส้นโค้ง) → ความอิ่มสี → ผสมสี
// =====================================================================
const LIGHT = [['exp', 'ความสว่าง', 'Exposure', -4, 4, 0.05], ['con', 'คอนทราสต์', 'Contrast', -100, 100, 1], ['hi', 'ส่วนสว่าง', 'Highlights', -100, 100, 1], ['sh', 'ส่วนมืด', 'Shadows', -100, 100, 1], ['wh', 'ขาวสุด', 'Whites', -100, 100, 1], ['bl', 'ดำสุด', 'Blacks', -100, 100, 1]];
const COLOR = [['temp', 'อุณหภูมิสี', 'Temp', -100, 100, 1, 'linear-gradient(90deg,#3B6FD8,#E8E2D6,#E3B238)'], ['tint', 'โทนเขียว-ม่วง', 'Tint', -100, 100, 1, 'linear-gradient(90deg,#3FA34D,#E8E2D6,#C04BC0)'],
  ['vib', 'ความสดสี', 'Vibrance', -100, 100, 1, 'linear-gradient(90deg,#9A968C,#E8E2D6,#E0543A)'], ['sat', 'ความอิ่มสี', 'Saturation', -100, 100, 1, 'linear-gradient(90deg,#8A8A8A,#E8E2D6,#E0543A)']];
const MIX = [['red', 'แดง', 0, '#D93A2F'], ['orange', 'ส้ม', 30, '#EE8A2A'], ['yellow', 'เหลือง', 60, '#E8C931'], ['green', 'เขียว', 120, '#49A84A'], ['aqua', 'ฟ้าอมเขียว', 180, '#2FB8B3'], ['blue', 'น้ำเงิน', 225, '#3567D6'], ['purple', 'ม่วง', 270, '#8A4FD1'], ['magenta', 'ชมพูม่วง', 315, '#D2479E']];
const LIN8 = (() => { const t = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } return t; })();
const ENC_N = 16384, ENC_MAX = 4, ENC = (() => { const t = new Float32Array(ENC_N + 1); for (let i = 0; i <= ENC_N; i++) { const v = i / ENC_N * ENC_MAX; t[i] = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; } return t; })();
const enc = (v) => v <= 0 ? 0 : ENC[v >= ENC_MAX ? ENC_N : (v / ENC_MAX * ENC_N) | 0];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function curveFn(ys) {   // Monotone cubic (Fritsch–Carlson) ผ่าน 5 จุด x = 0 · ¼ · ½ · ¾ · 1
  const n = ys.length, h = 1 / (n - 1), dk = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) dk.push((ys[i + 1] - ys[i]) / h);
  m[0] = dk[0]; m[n - 1] = dk[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = dk[i - 1] * dk[i] <= 0 ? 0 : (dk[i - 1] + dk[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (!dk[i]) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / dk[i], b = m[i + 1] / dk[i], q = a * a + b * b; if (q > 9) { const t = 3 / Math.sqrt(q); m[i] = t * a * dk[i]; m[i + 1] = t * b * dk[i]; } }
  return (x) => { if (x <= 0) return ys[0]; if (x >= 1) return ys[n - 1]; const i = Math.min(n - 2, (x / h) | 0), t = (x - i * h) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]; };
}
const curveIdentity = (c) => !c || c.every((v, i) => Math.abs(v - i / 4) < 1e-4);
const mixActive = (mx) => !!mx && Object.keys(mx).some(k => (mx[k] || []).some(v => v));
function lcActive(lc) { return !!lc && !!(lc.exp || lc.con || lc.hi || lc.sh || lc.wh || lc.bl || lc.temp || lc.tint || lc.wb || lc.vib || lc.sat || !curveIdentity(lc.curve) || mixActive(lc.mix)); }
function wbMul(lc) {   // ตัวคูณสีแบบเชิงเส้น: จุดสีเทาที่เลือก × อุณหภูมิสี × Tint (คงความสว่างเฉลี่ย)
  let r = 1, g = 1, b = 1; if (lc.wb) { r = lc.wb[0]; g = lc.wb[1]; b = lc.wb[2]; }
  const t = (lc.temp || 0) / 100, n = (lc.tint || 0) / 100; r *= Math.pow(2, 0.42 * t); b *= Math.pow(2, -0.42 * t); g *= Math.pow(2, -0.42 * n);
  const y = (r + g + b) / 3; return [r / y, g / y, b / y];
}
function toneLUT(lc) {   // ฟังก์ชันโทนบนความสว่าง (0 … 2 รองรับส่วนที่สว่างเกินจากการเพิ่ม Exposure)
  const N = 2048, T = new Float32Array(N + 1), c = (lc.con || 0) / 100, h = (lc.hi || 0) / 100, sd = (lc.sh || 0) / 100, w = (lc.wh || 0) / 100, b = (lc.bl || 0) / 100, cv = curveIdentity(lc.curve) ? null : curveFn(lc.curve);
  for (let i = 0; i <= N; i++) { const x = i / N * 2; let y = x;
    if (c) { const k = c > 0 ? 1 + c * 0.55 : 1 + c * 0.6; const xc = Math.min(x, 1.2); y = 0.5 + (xc - 0.5) * k + (x - xc); }
    if (h) y += h * (h < 0 ? 0.32 : 0.22) * smooth(0.45, 1.15, y) * (h < 0 ? Math.min(1, y) : 1);
    if (sd) y += sd * 0.24 * (1 - smooth(0.0, 0.55, y)) * (sd > 0 ? Math.min(1, 0.35 + y * 2) : 1);
    if (w) y += w * 0.16 * smooth(0.6, 1.1, y);
    if (b) y += b * 0.12 * (1 - smooth(0.0, 0.32, y));
    if (y > 0.88) y = 0.88 + 0.12 * Math.tanh((y - 0.88) / 0.12); if (y < 0) y = 0;
    if (cv) y = Math.min(1, Math.max(0, cv(y)));
    T[i] = y; }
  return T;
}
function applyLC(im, lc) {
  if (!lcActive(lc)) return; const d = im.data, n = d.length, [mr, mg, mb] = wbMul(lc), ex = Math.pow(2, lc.exp || 0), kr = mr * ex, kg = mg * ex, kb = mb * ex;
  const T = toneLUT(lc), TN = T.length - 1, sat = (lc.sat || 0) / 100, vib = (lc.vib || 0) / 100, MX = mixActive(lc.mix) ? MIX.map(([k, , hue]) => [hue, ...((lc.mix[k]) || [0, 0, 0]).map(v => v / 100)]) : null;
  for (let o = 0; o < n; o += 4) {
    let r = enc(LIN8[d[o]] * kr), g = enc(LIN8[d[o + 1]] * kg), b = enc(LIN8[d[o + 2]] * kb);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b, L2 = T[Math.min(TN, (L * TN / 2) | 0)];
    if (L > 0.002) { const k = L2 / L; r *= k; g *= k; b *= k; } else { r = g = b = L2; }
    if (r > 1 || g > 1 || b > 1) { const mx = Math.max(r, g, b), Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; if (Y >= 1) { r = g = b = 1; } else { const t = (1 - Y) / (mx - Y); r = Y + (r - Y) * t; g = Y + (g - Y) * t; b = Y + (b - Y) * t; } }
    if (sat || vib) { const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, s0 = Math.max(r, g, b) - Math.min(r, g, b), f = 1 + sat + vib * (vib > 0 ? (1 - s0) * (1 - s0) * 1.2 : 1); r = Y + (r - Y) * f; g = Y + (g - Y) * f; b = Y + (b - Y) * f; }
    if (MX) { r = r < 0 ? 0 : r > 1 ? 1 : r; g = g < 0 ? 0 : g > 1 ? 1 : g; b = b < 0 ? 0 : b > 1 ? 1 : b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
      if (dl > 0.004) { let hh = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; hh *= 60; if (hh < 0) hh += 360; let ss = dl / (1 - Math.abs(2 * l - 1) || 1);
        let dh = 0, dsn = 0, dlm = 0, wsum = 0;
        for (let i = 0; i < 8; i++) { const c = MX[i], c2 = MX[(i + 1) % 8], span = ((c2[0] - c[0]) + 360) % 360; let dd = ((hh - c[0]) + 360) % 360;
          if (dd < span) { const t = dd / span, w1 = 1 - t, w2 = t; dh += w1 * c[1] + w2 * c2[1]; dsn += w1 * c[2] + w2 * c2[2]; dlm += w1 * c[3] + w2 * c2[3]; wsum = 1; break; } }
        if (wsum) { hh = (hh + dh * 30 + 360) % 360; ss = Math.min(1, Math.max(0, ss * (1 + dsn))); let l2 = Math.min(1, Math.max(0, l + dlm * 0.3 * Math.min(1, ss * 2)));
          const C = (1 - Math.abs(2 * l2 - 1)) * ss, X = C * (1 - Math.abs((hh / 60) % 2 - 1)), m0 = l2 - C / 2, sx = (hh / 60) | 0;
          const rgb = sx === 0 ? [C, X, 0] : sx === 1 ? [X, C, 0] : sx === 2 ? [0, C, X] : sx === 3 ? [0, X, C] : sx === 4 ? [X, 0, C] : [C, 0, X]; r = rgb[0] + m0; g = rgb[1] + m0; b = rgb[2] + m0; } } }
    d[o] = r * 255; d[o + 1] = g * 255; d[o + 2] = b * 255;
  }
}
function autoTone(p) {   // ปรับแสงอัตโนมัติ: ความสว่างกลางภาพ ≈ 0.45 · ยืดจุดขาว / ดำ
  const d = p.prev.data, H = new Uint32Array(256); let n = 0; for (let o = 0; o < d.length; o += 16) { H[Math.round(0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2])]++; n++; }
  const pc = (q) => { let a = 0; for (let i = 0; i < 256; i++) { a += H[i]; if (a >= q * n) return i / 255; } return 1; };
  const p01 = pc(0.005), p50 = pc(0.5), p99 = pc(0.995), lin = (v) => LIN8[Math.round(v * 255)] || 1e-4;
  const exp = Math.max(-1.5, Math.min(1.5, Math.log2(lin(0.45) / Math.max(1e-4, lin(p50))) * 0.6));
  return { exp: Math.round(exp * 20) / 20, wh: p99 < 0.93 ? Math.min(50, Math.round((0.97 - p99) * 220)) : 0, bl: p01 > 0.05 ? -Math.min(50, Math.round((p01 - 0.02) * 260)) : 0, con: 10, hi: p99 > 0.98 ? -25 : 0, sh: p50 < 0.3 ? 20 : 0 };
}

function applyFx(im, fx) {
  const W = im.width, H = im.height, d = im.data, N = W * H, diag = Math.hypot(W, H);
  if (fx.dhz) dehaze(d, W, H, fx.dhz / 100, diag);
  if (fx.tex || fx.cla) {
    const L = new Float32Array(N); for (let i = 0, o = 0; i < N; i++, o += 4) L[i] = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255;
    const kt = fx.tex / 100, kc = fx.cla / 100;
    const Bt = kt ? boxBlur(L, W, H, Math.max(1, Math.round(diag * 0.0012))) : null;
    let S = null, f = 1; if (kc) { f = Math.max(1, Math.round(Math.max(W, H) / 700)); const s0 = shrink(L, W, H, f); S = { a: boxBlur(s0.a, s0.w, s0.h, Math.max(1, Math.round(diag * 0.012 / f))), w: s0.w, h: s0.h }; }
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const l = L[i]; let dl = 0;
      if (Bt) dl += kt * (l - Bt[i]) * (kt > 0 ? 1.8 : 1);
      if (S) { const w = 1 - (2 * l - 1) * (2 * l - 1); dl += kc * (l - upAt(S, f, x, y)) * (kc > 0 ? 1.1 : 1) * (0.35 + 0.65 * w); }
      if (dl) { const o = i * 4, v = dl * 255; d[o] += v; d[o + 1] += v; d[o + 2] += v; }
    }
  }
  if (fx.vig) { const k = fx.vig / 100, cx = W / 2, cy = H / 2;
    for (let y = 0, o = 0; y < H; y++) { const ny = (y + 0.5 - cy) / cy; for (let x = 0; x < W; x++, o += 4) { const nx = (x + 0.5 - cx) / cx, r = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
      let t = (r - 0.32) / 0.7; if (t <= 0) continue; if (t > 1) t = 1; const f2 = t * t * (3 - 2 * t);
      if (k < 0) { const m = 1 + k * f2 * 0.95; d[o] *= m; d[o + 1] *= m; d[o + 2] *= m; } else { const m = k * f2 * 0.9; d[o] += (255 - d[o]) * m; d[o + 1] += (255 - d[o + 1]) * m; d[o + 2] += (255 - d[o + 2]) * m; } } } }
  if (fx.grn) { const k = fx.grn / 100 * 0.16 * 255, cs = Math.max(1, diag / 1900);
    for (let y = 0, o = 0; y < H; y++) { const gy = y / cs, y0 = Math.floor(gy), ay = gy - y0; for (let x = 0; x < W; x++, o += 4) {
      const gx = x / cs, x0 = Math.floor(gx), ax = gx - x0;
      const n = (hash2(x0, y0) * (1 - ax) + hash2(x0 + 1, y0) * ax) * (1 - ay) + (hash2(x0, y0 + 1) * (1 - ax) + hash2(x0 + 1, y0 + 1) * ax) * ay;
      const l = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255, w = 0.4 + 0.6 * (1 - (2 * l - 1) * (2 * l - 1)), v = n * k * w;
      d[o] += v; d[o + 1] += v; d[o + 2] += v; } } }
}
function dehaze(d, W, H, k, diag) {
  const N = W * H, step = Math.max(1, Math.floor(Math.sqrt(N / 150000))), cand = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const o = (y * W + x) * 4; cand.push([Math.min(d[o], d[o + 1], d[o + 2]), o]); }
  cand.sort((a, b) => b[0] - a[0]); const top = cand.slice(0, Math.max(1, Math.round(cand.length * 0.002))); const A = [0, 0, 0];
  top.forEach(([, o]) => { A[0] += d[o]; A[1] += d[o + 1]; A[2] += d[o + 2]; }); for (let c = 0; c < 3; c++) A[c] = clamp(A[c] / top.length / 255, 0.55, 1);
  if (k > 0) {
    const f = Math.max(1, Math.round(Math.max(W, H) / 600)), dc = new Float32Array(N);
    for (let i = 0, o = 0; i < N; i++, o += 4) dc[i] = Math.min(d[o] / 255 / A[0], d[o + 1] / 255 / A[1], d[o + 2] / 255 / A[2]);
    const s0 = shrink(dc, W, H, f), S = { a: boxBlur(s0.a, s0.w, s0.h, Math.max(1, Math.round(diag * 0.006 / f))), w: s0.w, h: s0.h };
    for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o += 4) {
      const t = Math.max(1 - 0.92 * k * upAt(S, f, x, y), 0.22);
      for (let c = 0; c < 3; c++) d[o + c] = ((d[o + c] / 255 - A[c]) / t + A[c]) * 255;
    }
  } else { const a = -k * 0.6; for (let o = 0; o < N * 4; o += 4) for (let c = 0; c < 3; c++) d[o + c] += (A[c] * 255 - d[o + c]) * a; }
}

// ---------- ปรับระดับอัตโนมัติ: หามุมเอียงของเส้นตั้ง / เส้นนอนหลักในภาพ ----------
function autoAngle(p) {
  const src = p.prev, W0 = src.width, H0 = src.height, d = src.data, L0 = new Float32Array(W0 * H0);
  for (let i = 0, o = 0; i < L0.length; i++, o += 4) L0[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  const f = Math.max(1, Math.round(Math.max(W0, H0) / 1000)), S0 = shrink(L0, W0, H0, f), w = S0.w, h = S0.h, L = S0.a;   // ย่อแบบเฉลี่ย (ไม่เกิดขั้นบันได)
  const Lb = boxBlur(L, w, h, 1), N = w * h, Jxx = new Float32Array(N), Jyy = new Float32Array(N), Jxy = new Float32Array(N);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x;   // Sobel บนภาพนุ่มเล็กน้อย
    const gx = (Lb[i - w + 1] + 2 * Lb[i + 1] + Lb[i + w + 1]) - (Lb[i - w - 1] + 2 * Lb[i - 1] + Lb[i + w - 1]);
    const gy = (Lb[i + w - 1] + 2 * Lb[i + w] + Lb[i + w + 1]) - (Lb[i - w - 1] + 2 * Lb[i - w] + Lb[i - w + 1]);
    Jxx[i] = gx * gx; Jyy[i] = gy * gy; Jxy[i] = gx * gy; }
  const r = 4, Sxx = boxBlur(Jxx, w, h, r), Syy = boxBlur(Jyy, w, h, r), Sxy = boxBlur(Jxy, w, h, r);   // structure tensor → ทิศเส้นแม่นกว่ามุมรายพิกเซล
  const B = 241, hist = new Float32Array(B);   // −12° … +12° ทีละ 0.1°
  for (let y = r; y < h - r; y += 2) for (let x = r; x < w - r; x += 2) { const i = y * w + x, tr = Sxx[i] + Syy[i]; if (tr < 4000) continue;
    const df = Sxx[i] - Syy[i], co = Math.sqrt(df * df + 4 * Sxy[i] * Sxy[i]) / tr; if (co < 0.6) continue;
    let a = 0.5 * Math.atan2(2 * Sxy[i], df) * 180 / Math.PI; a = ((a % 90) + 135) % 90 - 45;
    if (Math.abs(a) > 12) continue; hist[Math.round((a + 12) * 10)] += Math.sqrt(tr) * co * co; }
  let best = -1, bv = 0; for (let i = 0; i < B; i++) { let v = 0; for (let k = -3; k <= 3; k++) { const j = i + k; if (j >= 0 && j < B) v += hist[j] * (4 - Math.abs(k)); } if (v > bv) { bv = v; best = i; } }
  if (best < 0) return 0; const dev = best / 10 - 12; const sign = (p.s.fh !== p.s.fv) ? -1 : 1;
  return Math.round(-dev * sign * 10) / 10;
}

// =====================================================================
// เปิดรูป
// =====================================================================
const isImg = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?|psd|psb)$/i.test(f.name);
const extOf = (f) => ((String(f.name || '').match(/\.([^.]+)$/) || [])[1] || '').toLowerCase();
const loadImage = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('เปิดรูปไม่ได้')); i.src = src; });
// ---------- ถอดรหัสไฟล์รูปทุกชนิด → canvas / ImageBitmap (PSD · TIFF ถอดเอง · ที่เหลือใช้เบราว์เซอร์) ----------
window.PE_decode = (f) => decodeAny(f);
window.PE_cloud = () => (sb && APP.me && APP.me.email ? { sb, me: APP.me, stg: IS_STG } : null);   // v1.5.1 Slab Layout บันทึกงานในระบบ (เข้าสู่ระบบแล้วเท่านั้น)   // v1.5.0 ใช้ร่วมกับ Slab Layout (slab.js) — เปิด PSD / TIFF ได้เหมือนกัน
async function decodeAny(file) {
  const e = extOf(file);
  if (e === 'psd' || e === 'psb' || /photoshop/i.test(file.type)) return psdToCanvas(await file.arrayBuffer(), file.name);
  if (e === 'tif' || e === 'tiff' || /tiff/i.test(file.type)) { try { return await createImageBitmap(file); } catch (x) {} return tiffToCanvas(await file.arrayBuffer(), file.name); }
  if (e === 'heic' || e === 'heif') { try { return await decode(file); } catch (x) { throw new Error(file.name + ' — รูป HEIC เปิดได้เฉพาะ Safari (iPhone / Mac) · ใน Chrome ให้ส่งออกเป็น JPG ก่อน หรือตั้งกล้อง iPhone เป็น "เข้ากันได้มากที่สุด"'); } }
  return decode(file);
}
function tiffToCanvas(buf, name) {
  if (!window.UTIF) throw new Error('โหลดตัวอ่าน TIFF ไม่สำเร็จ'); let ifds;
  try { ifds = UTIF.decode(buf); } catch (e) { throw new Error(name + ' — อ่านไฟล์ TIFF ไม่ได้'); }
  const pick = ifds.filter(f => f.t256 && f.t257).sort((a, b) => (b.t256[0] * b.t257[0]) - (a.t256[0] * a.t257[0]))[0];   // หน้าใหญ่สุด (ไม่ใช่ภาพย่อ)
  if (!pick) throw new Error(name + ' — ไม่พบรูปในไฟล์ TIFF');
  const photo0 = pick.t262 ? pick.t262[0] : 2, cmp = pick.t259 ? pick.t259[0] : 1, spp = pick.t277 ? pick.t277[0] : 1;
  // TIFF บีบอัด JPEG ที่เก็บสีเป็น RGB: ปิดการแปลง YCbCr→RGB ของตัวถอด JPEG (ไม่งั้นสีเพี้ยนเขียว-ชมพู) · มีเครื่องหมาย Adobe ในไฟล์ → ตัวถอดใช้ค่าในไฟล์เอง
  const JD = UTIF.JpegDecoder, rgbJpeg = cmp === 7 && photo0 === 2 && spp >= 3;
  if (rgbJpeg) UTIF.JpegDecoder = function () { const d = new JD(); d.B = 0; return d; };
  try { UTIF.decodeImage(buf, pick, ifds); } catch (e) { throw new Error(name + ' — การบีบอัดใน TIFF นี้ยังไม่รองรับ'); } finally { UTIF.JpegDecoder = JD; }
  const W = pick.width, H = pick.height, rgba = UTIF.toRGBA8(pick); if (!W || !H || !rgba || rgba.length < W * H * 4) throw new Error(name + ' — ถอดรหัส TIFF ไม่สำเร็จ');
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const im = g.createImageData(W, H); im.data.set(rgba.subarray ? rgba.subarray(0, W * H * 4) : rgba.slice(0, W * H * 4)); g.putImageData(im, 0, 0); return c;
}
function psdToCanvas(buf, name) {   // ภาพรวม (composite) ของ PSD / PSB — RGB · CMYK · Grayscale · Indexed · 8 / 16 บิต
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let p = 0;
  const r16 = () => { const v = dv.getUint16(p); p += 2; return v; }, r32 = () => { const v = dv.getUint32(p); p += 4; return v; };
  if (r32() !== 0x38425053) throw new Error(name + ' — ไม่ใช่ไฟล์ Photoshop');
  const ver = r16(); if (ver !== 1 && ver !== 2) throw new Error(name + ' — รุ่นไฟล์ PSD ไม่รองรับ'); p += 6;
  const ch = r16(), H = r32(), W = r32(), depth = r16(), mode = r16();
  const cmLen = r32(), cmAt = p; p += cmLen; p += r32();
  const lmLen = ver === 2 ? Number(dv.getBigUint64(p)) : dv.getUint32(p); p += (ver === 2 ? 8 : 4) + lmLen;
  if (depth !== 8 && depth !== 16) throw new Error(name + ' — PSD ' + depth + ' บิต ยังไม่รองรับ (ใช้ 8 / 16 บิต)');
  const need = mode === 3 ? 3 : mode === 4 ? 4 : (mode === 1 || mode === 8 || mode === 2) ? 1 : 0;
  if (!need) throw new Error(name + ' — โหมดสี PSD นี้ยังไม่รองรับ (ใช้ RGB · CMYK · Grayscale)');
  if (ch < need) throw new Error(name + ' — ไฟล์ PSD ไม่สมบูรณ์');
  const comp = r16(), bpc = depth / 8, N = W * H, planes = [];
  if (comp === 0) { for (let c = 0; c < need; c++) { const pl = new Uint8Array(N), base = p + c * N * bpc; for (let i = 0; i < N; i++) pl[i] = u8[base + i * bpc]; planes.push(pl); } }
  else if (comp === 1) {
    const cntSz = ver === 2 ? 4 : 2, counts = new Array(ch * H); for (let i = 0; i < ch * H; i++) counts[i] = cntSz === 4 ? r32() : r16();
    const rowB = W * bpc, row = new Uint8Array(rowB);
    for (let c = 0; c < need; c++) { const pl = new Uint8Array(N);
      for (let y = 0; y < H; y++) { const len = counts[c * H + y], end = p + len; let o = 0;
        while (p < end && o < rowB) { const n = (u8[p++] << 24) >> 24; if (n >= 0) { for (let k = 0; k <= n && o < rowB; k++) row[o++] = u8[p++]; } else if (n !== -128) { const v = u8[p++]; for (let k = 0; k < 1 - n && o < rowB; k++) row[o++] = v; } }
        p = end; const b = y * W; for (let x = 0; x < W; x++) pl[b + x] = row[x * bpc]; }
      planes.push(pl); }
  } else throw new Error(name + ' — การบีบอัดใน PSD นี้ยังไม่รองรับ');
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  const pal = mode === 2 && cmLen >= 768 ? u8.subarray(cmAt, cmAt + 768) : null;
  for (let i = 0, o = 0; i < N; i++, o += 4) {
    if (mode === 3) { d[o] = planes[0][i]; d[o + 1] = planes[1][i]; d[o + 2] = planes[2][i]; }
    else if (mode === 4) { const k = planes[3][i] / 255; d[o] = planes[0][i] * k; d[o + 1] = planes[1][i] * k; d[o + 2] = planes[2][i] * k; }   // CMYK (เก็บกลับด้าน) → RGB แบบประมาณ
    else if (pal) { const v = planes[0][i]; d[o] = pal[v]; d[o + 1] = pal[256 + v]; d[o + 2] = pal[512 + v]; }
    else d[o] = d[o + 1] = d[o + 2] = planes[0][i];
    d[o + 3] = 255; }
  g.putImageData(im, 0, 0);
  if (lmLen > 0 && N > 0) { let flat = true; const s0 = d[0] + d[1] + d[2]; for (let i = 0; i < N * 4 && flat; i += 4 * 997) if (d[i] + d[i + 1] + d[i + 2] !== s0) flat = false;
    if (flat) throw new Error(name + ' — ไฟล์ PSD นี้ไม่มีภาพรวม: เปิดใน Photoshop แล้วบันทึกใหม่โดยติ๊ก "Maximize PSD Compatibility"'); }
  c.__cmyk = mode === 4; return c;
}
async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
  const url = URL.createObjectURL(file); try { return await loadImage(url); } catch (e) { throw new Error(file.name + ' เปิดไม่ได้ — ใช้ไฟล์ JPG / PNG (รูป HEIC จาก iPhone: ตั้งกล้องเป็น "เข้ากันได้มากที่สุด" หรือส่งออกเป็น JPG)'); }
}
async function loadPhoto(file) {
  const bmp = await decodeAny(file), W = bmp.width, H = bmp.height, k = Math.min(1, PREV / Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
  const t = document.createElement('canvas'), tk = 200 / Math.max(W, H); t.width = Math.round(W * tk); t.height = Math.round(H * tk); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  return { id: uid('p'), name: file.name.replace(/\.[^.]+$/, ''), type: file.type, bmp, W, H, prev: g.getImageData(0, 0, c.width, c.height), thumb: t.toDataURL('image/jpeg', 0.7), s: DEF(), hist: [], edited: false };
}
async function addFiles(files) {
  const list = [...files].filter(isImg); if (!list.length) { toast('รองรับเฉพาะไฟล์รูป'); return; }
  busy(true, 'กำลังเปิดรูป…'); let n = 0;
  for (const f of list) { try { APP.photos.push(await loadPhoto(f)); n++; } catch (e) { console.error(e); toast((e && e.message) || 'เปิดรูปไม่ได้', 6000); } await tick(); }
  busy(false); if (!n) return; APP.cur = APP.photos.length - n; renderAll(); toast('เปิด ' + n + ' รูป');
}

// =====================================================================
// แสดงผล
// =====================================================================
const cur = () => APP.photos[APP.cur];
const isCropView = () => APP.panel === 'geo';
let VIEW = null;   // { rect, cw, ch } — ขนาดที่แสดง
function fitSize(aw, ah, rw, rh) { const k = Math.min(aw / rw, ah / rh); return [Math.max(1, Math.floor(rw * k)), Math.max(1, Math.floor(rh * k))]; }
function renderAll() {
  const has = APP.photos.length > 0;
  $('batchPane').hidden = APP.view !== 'batch'; $('renamePane').hidden = APP.view !== 'rename'; $('hbSave').hidden = APP.view !== 'edit'; $('btBatch').hidden = EMBED; $('btRename').hidden = EMBED; $('tbBatch').hidden = EMBED;
  if (APP.view === 'rename') { $('startPane').hidden = true; $('edPane').hidden = true; $('hbClose').hidden = true;
    $('docTitle').textContent = 'เปลี่ยนชื่อหลายรูป'; $('docSub').textContent = RN.dir ? 'โฟลเดอร์ “' + RN.dirName + '” · ' + RN.items.length + ' รูป' : 'ตั้งชื่อ + เลขรัน ทีละหลายรูป'; renderRename(); return; }
  if (APP.view === 'batch') { $('startPane').hidden = true; $('edPane').hidden = true; $('hbClose').hidden = true;
    $('docTitle').textContent = 'แปลงไฟล์ · ย่อรูป'; $('docSub').textContent = BT.fromEd ? 'รูปที่เปิดใน Photo Editor · ' + BT.items.length + ' รูป' : 'PSD · TIFF · PNG ฯลฯ → JPEG · ย่อขนาดทีละหลายรูป'; renderBatch(); return; }
  $('startPane').hidden = has; $('edPane').hidden = !has; $('hbSave').disabled = !has; $('hbClose').hidden = !has;
  const p = cur();
  $('docTitle').textContent = p ? p.name : 'Photo Editor';
  $('docSub').textContent = p ? (p.W + ' × ' + p.H + ' px' + (APP.photos.length > 1 ? ' · รูป ' + (APP.cur + 1) + ' / ' + APP.photos.length : '') + (APP.dirty ? ' · ยังไม่ได้บันทึก' : '')) : 'ครอป · หมุน · ดัดเส้นตรง · เอฟเฟกต์';
  if (!has) return;
  document.querySelectorAll('[data-panel]').forEach(b => b.classList.toggle('on', b.dataset.panel === APP.panel));
  renderFilm(); renderSide(); draw();
}
function renderFilm() {
  $('film').innerHTML = APP.photos.map((p, i) => `<button class="fi${i === APP.cur ? ' on' : ''}" data-ph="${i}" aria-label="รูป ${i + 1} ${esc(p.name)}"><img src="${p.thumb}" alt="">${p.edited ? '<span class="ed1">แต่งแล้ว</span>' : ''}<span class="x" data-phx="${i}" role="button" aria-label="ปิดรูปนี้">✕</span></button>`).join('')
    + '<button class="fadd" data-act="open">＋ เพิ่มรูป</button>';
}
let rafId = 0;
function draw() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(drawNow); }
function drawNow() {
  const p = cur(); if (!p) return; const view = $('view'), aw = Math.max(50, view.clientWidth - 28), ah = Math.max(50, view.clientHeight - 28);
  const g = geo(p), dpr = Math.min(2, window.devicePixelRatio || 1);
  let rect, cw, ch;
  if (APP.before) { const [w, h] = fitSize(aw, ah, p.prev.width, p.prev.height); cw = w; ch = h; }
  else { rect = isCropView() ? { x: -g.fw / 2, y: -g.fh / 2, w: g.fw, h: g.fh } : cropRect(p, g); [cw, ch] = fitSize(aw, ah, rect.w, rect.h); }
  const cv = $('cv'), c = $('cvs'), o = $('ovc'); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const Dp = Math.max(p.prev.width, p.prev.height), pw = Math.max(1, Math.min(Math.round(cw * dpr), Math.round(rect ? rect.w * Dp : p.prev.width))), ph = Math.max(1, Math.round(pw * ch / cw));
  c.width = pw; c.height = ph; const ctx = c.getContext('2d');
  if (APP.before) { const t = document.createElement('canvas'); t.width = p.prev.width; t.height = p.prev.height; t.getContext('2d').putImageData(p.prev, 0, 0); ctx.drawImage(t, 0, 0, pw, ph); }
  else { const im = renderGeo(p, p.prev, rect, pw, ph); applyLC(im, p.s.lc); applyFx(im, p.s.fx); ctx.putImageData(im, 0, 0); }
  VIEW = { rect, cw, ch, g }; o.width = Math.round(cw * dpr); o.height = Math.round(ch * dpr); drawOverlay();
  $('tbInfo').textContent = APP.before ? 'รูปก่อนแต่ง' : isCropView() ? (APP.guideMode ? 'ลากเส้นตามเสา / ขอบผนังที่ควรตรง (สูงสุด 4 เส้น)' : 'ลากมุม / ขอบกรอบเพื่อครอป · ลากในกรอบเพื่อย้าย') : '';
  $('tbUndo').disabled = !p.hist.length;
}
// ---------- กรอบครอป / เส้นนำ ----------
const n2c = (x, y) => { const V = VIEW, r = V.rect; return [(x - r.x) / r.w * V.cw, (y - r.y) / r.h * V.ch]; };
const c2n = (x, y) => { const V = VIEW, r = V.rect; return [r.x + x / V.cw * r.w, r.y + y / V.ch * r.h]; };
let GDRAW = null;
function drawOverlay() {
  const o = $('ovc'), ctx = o.getContext('2d'), p = cur(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, o.width, o.height);
  if (!p || APP.before || !isCropView() || !VIEW) return; const k = o.width / VIEW.cw; ctx.setTransform(k, 0, 0, k, 0, 0);
  const g = VIEW.g, cr = cropRect(p, g), [x0, y0] = n2c(cr.x, cr.y), [x1, y1] = n2c(cr.x + cr.w, cr.y + cr.h), W = VIEW.cw, H = VIEW.ch;
  ctx.fillStyle = 'rgba(20,19,16,.62)'; ctx.fillRect(0, 0, W, y0); ctx.fillRect(0, y1, W, H - y1); ctx.fillRect(0, y0, x0, y1 - y0); ctx.fillRect(x1, y0, W - x1, y1 - y0);
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  const ov = p.s.overlay, n = ov === 'grid' ? 6 : ov === 'thirds' ? 3 : 0;
  if (n) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.moveTo(x0, y); ctx.lineTo(x1, y); } ctx.stroke(); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; const L = 18;
  [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); });
  if (p.s.aspect === 'free') { ctx.lineWidth = 4; [[(x0 + x1) / 2, y0, 1], [(x0 + x1) / 2, y1, 1], [x0, (y0 + y1) / 2, 0], [x1, (y0 + y1) / 2, 0]].forEach(([x, y, hz]) => { ctx.beginPath(); if (hz) { ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); } else { ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); } ctx.stroke(); }); }
  // เส้นนำ (Guided)
  if (p.s.upright === 'guided') { const gs = p.s.guides.map(q => [ap(g.T, q.a[0], q.a[1]), ap(g.T, q.b[0], q.b[1])]);
    if (GDRAW) gs.push([GDRAW.a, GDRAW.b]);
    gs.forEach(([a, b]) => { const A = n2c(a[0], a[1]), B = n2c(b[0], b[1]); ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      ctx.fillStyle = '#F59E0B'; [A, B].forEach(P => { ctx.beginPath(); ctx.arc(P[0], P[1], 4.5, 0, 7); ctx.fill(); }); }); }
}
const DRAG = { on: false };
function hit(px, py) { const p = cur(), cr = cropRect(p, VIEW.g), [x0, y0] = n2c(cr.x, cr.y), [x1, y1] = n2c(cr.x + cr.w, cr.y + cr.h), T = 22;
  const near = (a, b) => Math.abs(a - b) <= T; const free = p.s.aspect === 'free';
  if (near(px, x0) && near(py, y0)) return 'nw'; if (near(px, x1) && near(py, y0)) return 'ne'; if (near(px, x0) && near(py, y1)) return 'sw'; if (near(px, x1) && near(py, y1)) return 'se';
  if (free && py > y0 && py < y1) { if (near(px, x0)) return 'w'; if (near(px, x1)) return 'e'; }
  if (free && px > x0 && px < x1) { if (near(py, y0)) return 'n'; if (near(py, y1)) return 's'; }
  if (px > x0 && px < x1 && py > y0 && py < y1) return 'move'; return ''; }
const CUR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', move: 'move' };
function pt(e) { const r = $('ovc').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
$('ovc').addEventListener('pointerdown', (e) => {
  const p = cur(); if (p && APP.wbPick && !isCropView() && !APP.before && VIEW) { const [qx, qy] = pt(e), [nx, ny] = c2n(qx, qy), a = sampleSrc(p, nx, ny);   // เลือกจุดสีเทา
    APP.wbPick = false; if (!a || Math.max(...a) < 0.003) { toast('จุดนี้มืดเกินไป — เลือกจุดสีเทา / ขาวที่สว่างกว่า'); renderSide(); return; }
    if (Math.max(...a) > 0.97) { toast('จุดนี้สว่างจนสีขาด — เลือกจุดสีเทาที่ไม่จ้าเกินไป'); renderSide(); return; }
    pushHist(p); const m = (a[0] + a[1] + a[2]) / 3; p.s.lc.wb = [m / a[0], m / a[1], m / a[2]]; p.s.lc.temp = 0; p.s.lc.tint = 0; changed(false); renderSide(); toast('ปรับสมดุลแสงขาวจากจุดที่เลือกแล้ว'); return; }
  if (!p || !isCropView() || APP.before || !VIEW) return; e.preventDefault(); const [px, py] = pt(e);
  try { $('ovc').setPointerCapture(e.pointerId); } catch (x) {}
  if (APP.guideMode && p.s.upright === 'guided') { if (p.s.guides.length >= 4) { toast('มีเส้นนำครบ 4 เส้นแล้ว — ลบเส้นล่าสุดก่อน'); return; } const a = c2n(px, py); GDRAW = { a, b: a }; DRAG.on = true; DRAG.kind = 'guide'; return; }
  const h = hit(px, py); if (!h) return; pushHist(p);
  Object.assign(DRAG, { on: true, kind: h, p0: c2n(px, py), r0: { ...cropRect(p, VIEW.g) } });
});
$('ovc').addEventListener('pointermove', (e) => {
  const p = cur(); if (p && !isCropView()) { $('ovc').style.cursor = APP.wbPick ? 'crosshair' : 'default'; return; } if (!p || !VIEW || !isCropView()) return; const [px, py] = pt(e);
  if (!DRAG.on) { $('ovc').style.cursor = APP.guideMode && p.s.upright === 'guided' ? 'crosshair' : (CUR[hit(px, py)] || 'default'); return; }
  const [nx, ny] = c2n(px, py);
  if (DRAG.kind === 'guide') { GDRAW.b = [nx, ny]; drawOverlay(); return; }
  const g = VIEW.g, r0 = DRAG.r0, DX = nx - DRAG.p0[0], DY = ny - DRAG.p0[1], ar = aspectOf(p, g), free = p.s.aspect === 'free', MIN = 0.04, k = DRAG.kind;
  const build = (t) => { const dx = DX * t, dy = DY * t;
    if (k === 'move') return { ...r0, x: clamp(r0.x + dx, -g.fw / 2, g.fw / 2 - r0.w), y: clamp(r0.y + dy, -g.fh / 2, g.fh / 2 - r0.h) };
    let L = r0.x, T = r0.y, R = r0.x + r0.w, B = r0.y + r0.h;
    if (k.includes('w')) L = Math.min(r0.x + dx, R - MIN); if (k.includes('e')) R = Math.max(R + dx, L + MIN);
    if (k.includes('n')) T = Math.min(r0.y + dy, B - MIN); if (k.includes('s')) B = Math.max(B + dy, T + MIN);
    L = Math.max(L, -g.fw / 2); R = Math.min(R, g.fw / 2); T = Math.max(T, -g.fh / 2); B = Math.min(B, g.fh / 2);
    if (!free && k.length === 2) {   // มุม + ล็อกสัดส่วน: ยึดมุมตรงข้าม
      let w = R - L, h = B - T; if (w / h > ar) w = h * ar; else h = w / ar;
      if (k.includes('w')) L = R - w; else R = L + w; if (k.includes('n')) T = B - h; else B = T + h;
    }
    return { x: L, y: T, w: R - L, h: B - T }; };
  let r = build(1);
  if (needFit(p.s) && !rectOk(g, r)) {   // ห้ามขอบขาวเข้ามา: เลื่อน / ขยายได้ถึงขอบภาพพอดี
    if (k === 'move') {   // ลองทีละแกน ให้ไถลตามขอบได้
      const ax = (t, u) => ({ ...r0, x: clamp(r0.x + DX * t, -g.fw / 2, g.fw / 2 - r0.w), y: clamp(r0.y + DY * u, -g.fh / 2, g.fh / 2 - r0.h) });
      const srch = (f) => { let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (rectOk(g, f(m))) lo = m; else hi = m; } return lo; };
      const tx = srch((m) => ax(m, 0)), ty = srch((m) => ax(tx, m)); r = ax(tx, ty);
    } else { let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (rectOk(g, build(m))) lo = m; else hi = m; } r = build(lo); }
    if (!rectOk(g, r)) return;
  }
  p.s.crop = r; drawOverlay();
});
const endDrag = () => { const p = cur(); if (!DRAG.on || !p) return; DRAG.on = false;
  if (DRAG.kind === 'guide') { const a = GDRAW.a, b = GDRAW.b; GDRAW = null; const g = VIEW.g;
    if (Math.hypot((b[0] - a[0]) / VIEW.rect.w * VIEW.cw, (b[1] - a[1]) / VIEW.rect.h * VIEW.ch) < 24) { drawOverlay(); toast('ลากเส้นให้ยาวขึ้น (ตามเสา / ขอบผนัง)'); return; }
    pushHist(p); p.s.guides.push({ a: ap(g.Ti, a[0], a[1]), b: ap(g.Ti, b[0], b[1]) });
    if (!guidedG(p.s.guides)) { p.s.guides.pop(); toast('เส้นนี้ใช้ไม่ได้ — ลองลากเส้นที่อยู่ห่างกันมากขึ้น'); }
    changed(true); renderSide(); return; }
  changed(false); };
$('ovc').addEventListener('pointerup', endDrag); $('ovc').addEventListener('pointercancel', endDrag);

// ---------- เส้นโค้ง (Curve) ----------
function drawCurve() {
  const c = $('crv'), p = cur(); if (!c || !p) return; const g = c.getContext('2d'), W = c.width, H = c.height, ys = p.s.lc.curve, f = curveFn(ys), P = 24;
  const X = (x) => P + x * (W - 2 * P), Y = (y) => H - P - y * (H - 2 * P);
  g.clearRect(0, 0, W, H);
  try { const d = p.prev.data, hist = new Uint32Array(64); let mxh = 1; for (let o = 0; o < d.length; o += 24) { const l = (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 256; hist[(l * 64) | 0]++; } for (const v of hist) mxh = Math.max(mxh, v);
    g.fillStyle = 'rgba(14,116,144,.13)'; for (let i = 0; i < 64; i++) { const h = hist[i] / mxh * (H - 2 * P); g.fillRect(X(i / 64), H - P - h, (W - 2 * P) / 64 + 0.5, h); } } catch (e) {}
  g.strokeStyle = '#E3DACB'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 4; i++) { g.moveTo(X(i / 4), Y(0)); g.lineTo(X(i / 4), Y(1)); g.moveTo(X(0), Y(i / 4)); g.lineTo(X(1), Y(i / 4)); } g.stroke();
  g.strokeStyle = '#B8AE9C'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(1)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = '#1C1B18'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 100; i++) { const x = i / 100, y = Math.min(1, Math.max(0, f(x))); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); } g.stroke();
  ys.forEach((y, i) => { g.beginPath(); g.arc(X(i / 4), Y(y), 9, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0E7490'; g.stroke(); });
}
const CRV = { i: -1 };
document.addEventListener('pointerdown', (e) => { const c = e.target.closest && e.target.closest('#crv'); const p = cur(); if (!c || !p) return; e.preventDefault();
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; CRV.i = Math.max(0, Math.min(4, Math.round((x * c.width - 24) / (c.width - 48) * 4))); pushHist(p);
  try { c.setPointerCapture(e.pointerId); } catch (x2) {} crvMove(e); });
function crvMove(e) { const c = $('crv'), p = cur(); if (CRV.i < 0 || !c || !p) return; const r = c.getBoundingClientRect(), y = 1 - ((e.clientY - r.top) / r.height * c.height - 24) / (c.height - 48);
  p.s.lc.curve[CRV.i] = Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000; drawCurve(); changed(false); }
document.addEventListener('pointermove', (e) => { if (CRV.i >= 0) crvMove(e); });
document.addEventListener('pointerup', () => { CRV.i = -1; });
// ---------- เลือกจุดสีเทา (สมดุลแสงขาว) ----------
function sampleSrc(p, nx, ny) {   // จุดบนจอ (หน่วยสัมพัทธ์ของ frame) → ค่าสีเฉลี่ย 7×7 ของภาพตัวอย่าง (ก่อนปรับสี)
  const src = p.prev, Ws = src.width, Hs = src.height, [Wo, Ho] = oDims(p.s, Ws, Hs), D = Math.max(Wo, Ho), g = geo(p), [ox, oy] = ap(g.Ti, nx, ny);
  let px = ox * D + Wo / 2, py = oy * D + Ho / 2; if (p.s.fh) px = Wo - px; if (p.s.fv) py = Ho - py; const rot = p.s.rot;
  let sx, sy; if (rot === 0) { sx = px; sy = py; } else if (rot === 1) { sx = py; sy = Hs - px; } else if (rot === 2) { sx = Ws - px; sy = Hs - py; } else { sx = Ws - py; sy = px; }
  sx = Math.round(sx); sy = Math.round(sy); if (sx < 0 || sy < 0 || sx >= Ws || sy >= Hs) return null; const a = [0, 0, 0]; let n = 0;
  for (let y = Math.max(0, sy - 3); y <= Math.min(Hs - 1, sy + 3); y++) for (let x = Math.max(0, sx - 3); x <= Math.min(Ws - 1, sx + 3); x++) { const o = (y * Ws + x) * 4; a[0] += LIN8[src.data[o]]; a[1] += LIN8[src.data[o + 1]]; a[2] += LIN8[src.data[o + 2]]; n++; }
  return a.map(v => v / n);
}
// ---------- ย้อนกลับ ----------
function pushHist(p) { p.hist.push(JSON.stringify(p.s)); if (p.hist.length > 60) p.hist.shift(); }
function undo() { const p = cur(); if (!p || !p.hist.length) return; p.s = JSON.parse(p.hist.pop()); markEdited(p); renderSide(); draw(); }
function markEdited(p) { p.edited = JSON.stringify({ ...p.s, overlay: 'thirds' }) !== JSON.stringify(DEF()); APP.dirty = true; }
function changed(refit) { const p = cur(); if (!p) return; if (refit && needFit(p.s)) fitCrop(p, true); markEdited(p); renderFilm(); draw(); renderHead(); }
function renderHead() { const p = cur(); $('docSub').textContent = p ? (p.W + ' × ' + p.H + ' px' + (APP.photos.length > 1 ? ' · รูป ' + (APP.cur + 1) + ' / ' + APP.photos.length : '') + (APP.dirty ? ' · ยังไม่ได้บันทึก' : '')) : ''; }

// =====================================================================
// แผงด้านขวา
// =====================================================================
const fmt = (v, st) => (st && st < 0.1 ? (Math.round(v * 100) / 100).toFixed(2) : st && st < 1 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v))).replace(/^(\d)/, (m) => (v > 0 ? '+' : '') + m);
const slider = (attr, key, th, en, min, max, step, val, bg) => `<div class="sl"><div class="sh" data-rst="${attr}:${key}" title="ดับเบิลคลิก = กลับเป็นค่าเริ่มต้น"><span>${th}</span> <i>${en}</i><b id="v_${attr}_${key}">${fmt(val, step)}</b></div><input type="range" ${attr}="${key}" min="${min}" max="${max}" step="${step || 1}" value="${val}" aria-label="${th}">${bg ? `<span class="grad" style="background:${bg}"></span>` : ''}</div>`;
function renderSide() {
  const p = cur(), b = $('pbody'); if (!p) { b.innerHTML = ''; return; } const s = p.s, H = [];
  if (APP.panel === 'lc') { const L = s.lc, mx = (L.mix || {})[APP.mixSel] || [0, 0, 0], mc = MIX.find(m => m[0] === APP.mixSel) || MIX[0];
    H.push(`<div class="box"><h3>☀ แสง<small>Light</small></h3>${LIGHT.map(([k, th, en, mn, mxv, st]) => slider('data-lc', k, th, en, mn, mxv, st, L[k])).join('')}
      <div class="row"><button class="btn sm" data-act="lcAuto">✦ ปรับแสงอัตโนมัติ</button><button class="btn sm" data-act="lcLightReset">รีเซ็ตแสง</button></div>
      <details id="dCrv"${curveIdentity(L.curve) && !APP.crvOpen ? '' : ' open'}><summary>เส้นโค้ง (Curve)</summary><canvas id="crv" width="560" height="400" style="width:100%;aspect-ratio:7/5;margin-top:6px;border:1px solid var(--line);border-radius:10px;touch-action:none;cursor:ns-resize;background:#FBF9F4"></canvas>
        <div class="row"><span class="mut" style="flex:1">ลากจุดขึ้น-ลง: ดำ · มืด · กลาง · สว่าง · ขาว</span><button class="btn sm" data-act="crvReset">รีเซ็ตเส้น</button></div></details></div>`);
    H.push(`<div class="box"><h3>🎨 สี<small>Color</small></h3>
      <div class="row"><label style="flex:none;color:var(--ink)">สมดุลแสงขาว</label><span class="mut" style="flex:1">${L.wb ? 'กำหนดจากจุดที่เลือก' : 'ตามที่ถ่าย (As Shot)'}</span>
        <button class="btn sm${APP.wbPick ? ' on' : ''}" data-act="wbPick" title="คลิกจุดในรูปที่ควรเป็นสีขาว / เทา">💧 ${APP.wbPick ? 'คลิกจุดสีเทาในรูป…' : 'เลือกจุดสีเทา'}</button>${L.wb ? '<button class="btn sm" data-act="wbReset">ตามที่ถ่าย</button>' : ''}</div>
      ${COLOR.map(([k, th, en, mn, mxv, st, bg]) => slider('data-lc', k, th, en, mn, mxv, st, L[k], bg)).join('')}
      <details id="dMix"${mixActive(L.mix) || APP.mixOpen ? ' open' : ''}><summary>ผสมสี (Color Mixer)</summary>
        <div class="mixc" style="margin-top:8px">${MIX.map(([k, t, , c]) => `<button data-mixsel="${k}" title="${t}" aria-label="${t}" class="${k === APP.mixSel ? 'on' : ''}" style="background:${c}">${((L.mix || {})[k] || []).some(v => v) ? '•' : ''}</button>`).join('')}</div>
        <div class="mut" style="margin:4px 0">สี: <b style="color:${mc[3]}">${mc[1]}</b></div>
        ${[['0', 'เฉดสี', 'Hue'], ['1', 'ความอิ่มสี', 'Saturation'], ['2', 'ความสว่าง', 'Luminance']].map(([i, th, en]) => slider('data-mix', i, th, en, -100, 100, 1, mx[+i])).join('')}
        <div class="row"><button class="btn sm" data-act="mixReset">รีเซ็ตผสมสี</button></div></details>
      <div class="row"><button class="btn sm" data-act="lcColorReset">รีเซ็ตสี</button>${APP.photos.length > 1 ? '<button class="btn sm" data-act="fxAll">ใช้ค่านี้กับทุกรูป</button>' : ''}</div>
      <div class="mut">ดับเบิลคลิกชื่อแถบ = กลับเป็น 0 · กดค้างปุ่ม “ก่อนแต่ง” เพื่อเทียบ</div></div>`);
    b.innerHTML = H.join('') + `<div class="row" style="padding:0 2px"><button class="btn sm" data-act="resetAll">↺ รีเซ็ตรูปนี้ทั้งหมด</button></div><div class="mut" style="font-size:12px">Photo Editor ${PE_VER}</div>`; drawCurve(); return;
  }
  if (APP.panel === 'geo') {
    H.push(`<div class="box"><h3>✂ ครอป<small>สัดส่วน · ปรับเอียง</small></h3>
      <div class="row"><label style="flex:none">สัดส่วน</label><select id="selAsp">${ASPECTS.map(([k, t]) => `<option value="${k}"${k === s.aspect ? ' selected' : ''}>${t}</option>`).join('')}</select><button class="btn sm" data-act="aspSwap" title="สลับแนวตั้ง / แนวนอน"${['orig', 'free', '1:1'].includes(s.aspect) ? ' disabled' : ''}>⇄</button></div>
      ${slider('data-geo', 'angle', 'ปรับเอียง', 'Straighten', -45, 45, 0.1, s.angle)}
      <div class="row"><button class="btn sm" data-act="autoLevel">✦ ปรับระดับอัตโนมัติ</button><button class="btn sm" data-act="cropReset">คืนกรอบเต็มภาพ</button></div>
      <div class="row"><label style="flex:none">เส้นช่วยจัด</label><select id="selOv"><option value="thirds"${s.overlay === 'thirds' ? ' selected' : ''}>สามส่วน</option><option value="grid"${s.overlay === 'grid' ? ' selected' : ''}>ตาราง</option><option value="none"${s.overlay === 'none' ? ' selected' : ''}>ไม่แสดง</option></select></div></div>`);
    H.push(`<div class="box"><h3>⟳ หมุน · กลับด้าน</h3><div class="ic">
      <button class="btn" data-act="rotCw" title="หมุนตามเข็ม 90°" aria-label="หมุนตามเข็ม 90 องศา">↻</button><button class="btn" data-act="rotCcw" title="หมุนทวนเข็ม 90°" aria-label="หมุนทวนเข็ม 90 องศา">↺</button>
      <button class="btn" data-act="flipH" title="กลับซ้าย-ขวา" aria-label="กลับซ้าย-ขวา">⇋</button><button class="btn" data-act="flipV" title="กลับบน-ล่าง" aria-label="กลับบน-ล่าง">⇵</button></div></div>`);
    H.push(`<div class="box"><h3>📐 ดัดเส้นตรง<small>Geometry</small></h3>
      <div class="row"><label style="flex:none">Upright</label><select id="selUp"><option value="off"${s.upright === 'off' ? ' selected' : ''}>ปิด</option><option value="guided"${s.upright === 'guided' ? ' selected' : ''}>เส้นนำ (Guided)</option></select></div>`);
    if (s.upright === 'guided') H.push(`<div class="info">กด “✏ วาดเส้นนำ” แล้วลากเส้นตามเสา ขอบผนัง หรือขอบประตูที่ควรตั้งตรง / ได้ระดับ — 2 เส้นขึ้นไปจะดัดมุมมอง (สูงสุด 4 เส้น)</div>
      <div class="row"><button class="btn sm${APP.guideMode ? ' on' : ''}" data-act="guideMode">✏ ${APP.guideMode ? 'กำลังวาด… (กดเพื่อหยุด)' : 'วาดเส้นนำ'}</button><span class="mut">${s.guides.length} / 4 เส้น</span></div>
      <div class="row"><button class="btn sm" data-act="guideUndo"${s.guides.length ? '' : ' disabled'}>ลบเส้นล่าสุด</button><button class="btn sm" data-act="guideClear"${s.guides.length ? '' : ' disabled'}>ล้างเส้นทั้งหมด</button></div>`);
    H.push(`<details${Object.keys(s.tf).some(k => s.tf[k] !== DEF().tf[k]) ? ' open' : ''}><summary>ปรับมุมมองเอง (Transform)</summary><div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">${TF.map(([k, th, en, mn, mx, st]) => slider('data-tf', k, th, en, mn, mx, st, s.tf[k])).join('')}
      <div class="row"><button class="btn sm" data-act="tfReset">รีเซ็ตมุมมอง</button></div></div></details>
      <label class="chk"><input type="checkbox" id="chkCon"${s.constrain ? ' checked' : ''}><span>ครอปพอดีภาพ (Constrain Crop) — ตัดขอบขาวที่เกิดจากการดัด / หมุนออกอัตโนมัติ</span></label></div>`);
  } else {
    H.push(`<div class="box"><h3>✦ เอฟเฟกต์<small>Effects</small></h3>${FX.map(([k, th, en, mn, mx]) => slider('data-fx', k, th, en, mn, mx, 1, s.fx[k])).join('')}
      <div class="row"><button class="btn sm" data-act="fxReset">รีเซ็ตเอฟเฟกต์</button>${APP.photos.length > 1 ? '<button class="btn sm" data-act="fxAll">ใช้ค่านี้กับทุกรูป</button>' : ''}</div>
      <div class="mut">ดับเบิลคลิกชื่อแถบ = กลับเป็น 0 · กดค้างปุ่ม “ก่อนแต่ง” (ด้านบนรูป) เพื่อเทียบ</div></div>`);
    H.push(`<div class="mut" style="font-size:12px">ตัวอย่างบนจอใช้ภาพย่อ — ไฟล์ที่บันทึกใช้ความละเอียดเต็ม (สูงสุด ${OUT_MAX.toLocaleString()} px ด้านยาว)</div>`);
  }
  H.push(`<div class="row"><button class="btn sm" data-act="resetAll">↺ รีเซ็ตรูปนี้ทั้งหมด</button></div>
    <div class="mut" style="font-size:12px">รูปอยู่ในเครื่องคุณ ไม่ถูกอัปโหลด · ไฟล์ต้นฉบับไม่ถูกแก้ (บันทึกเป็นไฟล์ใหม่) · ข้อมูลกล้อง (EXIF) ไม่ติดไปกับไฟล์ใหม่ · Photo Editor ${PE_VER}</div>`);
  b.innerHTML = H.join('');
}

// =====================================================================
// บันทึก (ความละเอียดเต็ม)
// =====================================================================
function ask(title, text, value) { return new Promise(res => { const b = $('dlgBox');
  b.innerHTML = `<b class="t">${esc(title)}</b>${text ? `<div class="mut" style="font-size:14px;white-space:pre-line">${esc(text)}</div>` : ''}${value != null ? `<input type="text" id="dlgIn" value="${esc(value)}">` : ''}<div class="ac"><button class="btn" data-d="no">ยกเลิก</button><button class="btn dk" data-d="ok">ตกลง</button></div>`;
  $('dlg').hidden = false; const inp = $('dlgIn'); if (inp) { inp.focus(); inp.select(); }
  const done = (v) => { $('dlg').hidden = true; b.onclick = null; b.onkeydown = null; res(v); };
  b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (d) done(d.dataset.d === 'ok' ? (inp ? inp.value : true) : null); };
  b.onkeydown = (e) => { if (e.key === 'Escape') done(null); if (e.key === 'Enter' && inp) done(inp.value); }; }); }
async function renderFull(p, outMax, quiet) {   // รูปที่แต่งแล้ว ความละเอียดเต็ม → canvas
  const k = Math.min(1, 8000 / Math.max(p.W, p.H)), c = document.createElement('canvas'); c.width = Math.round(p.W * k); c.height = Math.round(p.H * k);
  const cg = c.getContext('2d', { willReadFrequently: true }); cg.drawImage(p.bmp, 0, 0, c.width, c.height);
  let src = cg.getImageData(0, 0, c.width, c.height); c.width = c.height = 1;
  const g = geo(p), r = cropRect(p, g), [Wo, Ho] = oDims(p.s, src.width, src.height), D = Math.max(Wo, Ho);
  let ow = r.w * D, oh = r.h * D; const m = Math.min(1, (outMax || OUT_MAX) / Math.max(ow, oh)); ow = Math.max(1, Math.round(ow * m)); oh = Math.max(1, Math.round(oh * m));
  if (!quiet) { busy(true, 'กำลังดัด / ครอป… (' + ow + ' × ' + oh + ' px)'); await tick(); }
  const im = renderGeo(p, src, r, ow, oh); src = null;
  if (!quiet) { busy(true, 'กำลังปรับแสง · สี · เอฟเฟกต์…'); await tick(); } applyLC(im, p.s.lc); applyFx(im, p.s.fx);
  const o = document.createElement('canvas'); o.width = ow; o.height = oh; o.getContext('2d').putImageData(im, 0, 0); return o;
}
async function buildJpeg(p) {
  busy(true, 'กำลังสร้างไฟล์ความละเอียดเต็ม…'); await tick();
  const k = Math.min(1, 8000 / Math.max(p.W, p.H)), c = document.createElement('canvas'); c.width = Math.round(p.W * k); c.height = Math.round(p.H * k);
  const cg = c.getContext('2d', { willReadFrequently: true }); cg.drawImage(p.bmp, 0, 0, c.width, c.height);
  let src = cg.getImageData(0, 0, c.width, c.height); c.width = c.height = 1;
  const g = geo(p), r = cropRect(p, g), [Wo, Ho] = oDims(p.s, src.width, src.height), D = Math.max(Wo, Ho);
  let ow = r.w * D, oh = r.h * D; const m = Math.min(1, OUT_MAX / Math.max(ow, oh)); ow = Math.max(1, Math.round(ow * m)); oh = Math.max(1, Math.round(oh * m));
  busy(true, 'กำลังดัด / ครอป… (' + ow + ' × ' + oh + ' px)'); await tick();
  const im = renderGeo(p, src, r, ow, oh); src = null;
  busy(true, 'กำลังปรับแสง · สี · เอฟเฟกต์…'); await tick(); applyLC(im, p.s.lc); applyFx(im, p.s.fx);
  const o = document.createElement('canvas'); o.width = ow; o.height = oh; o.getContext('2d').putImageData(im, 0, 0);
  busy(true, 'กำลังบันทึกเป็น JPEG…'); await tick();
  const blob = await new Promise(ok => o.toBlob(ok, 'image/jpeg', 0.92)); o.width = o.height = 1; busy(false);
  if (!blob) throw new Error('สร้างไฟล์ไม่ได้ — รูปใหญ่เกินหน่วยความจำของเครื่อง'); return { blob, ow, oh };
}
async function save() {
  const p = cur(); if (!p) return;
  if (EMBED) { if (!p.edited) { toast('ยังไม่ได้แต่งรูป — กด ‹ เพื่อกลับไป Layboard'); return; }
    try { const { blob } = await buildJpeg(p); APP.dirty = false; toParent({ t: 'pe-done', blob }); } catch (e) { console.error(e); busy(false); toast('สร้างรูปไม่สำเร็จ: ' + ((e && e.message) || e), 6000); } return; }
  const name = await ask('บันทึกลงเครื่อง', 'ไฟล์ต้นฉบับไม่ถูกแก้ — บันทึกเป็น JPEG ไฟล์ใหม่', p.name + ' (แก้ไข)'); if (name == null) return;
  try { const { blob, ow, oh } = await buildJpeg(p), fn = (String(name).trim() || p.name + ' (แก้ไข)').replace(/[\\/:*?"<>|]+/g, ' ') + '.jpg', file = new File([blob], fn, { type: 'image/jpeg' });
    if (MOBILE && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: fn }); APP.dirty = false; renderHead(); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    APP.dirty = APP.photos.some(x => x !== p && x.edited) ; renderHead(); toast('บันทึกแล้ว: ' + fn + ' (' + ow + ' × ' + oh + ' px)', 4000);
  } catch (e) { console.error(e); busy(false); toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e), 6000); }
}

// =====================================================================
// แปลงไฟล์ · ย่อรูปทีละหลายรูป (PSD · TIFF · PNG ฯลฯ → JPEG / PNG / WebP) · หลายไฟล์ = ZIP ไฟล์เดียว
// =====================================================================
const BT_KEY = 'wpe_batch_v1';
const BT = Object.assign({ items: [], fromEd: false, useEdits: true, fmt: 'jpeg', mode: 'long', val: 2048, noUp: true, q: 85, maxKB: '', suffix: '' },
  (() => { try { const o = JSON.parse(localStorage.getItem(BT_KEY) || 'null'); return o && typeof o === 'object' ? { fmt: o.fmt, mode: o.mode, val: o.val, noUp: o.noUp, q: o.q, maxKB: o.maxKB, suffix: o.suffix } : {}; } catch (e) { return {}; } })());
const btSaveSet = () => { try { localStorage.setItem(BT_KEY, JSON.stringify({ fmt: BT.fmt, mode: BT.mode, val: BT.val, noUp: BT.noUp, q: BT.q, maxKB: BT.maxKB, suffix: BT.suffix })); } catch (e) {} };
const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const BT_EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const PRESETS = { long: [3840, 2560, 2048, 1920, 1600, 1280, 1024, 800], w: [3840, 2048, 1920, 1280, 1024, 800], h: [2160, 1440, 1080, 1024, 800, 600], pct: [75, 50, 33, 25] };
function btOpen(fromEd) {
  BT.items.forEach(it => { if (it.url) URL.revokeObjectURL(it.url); });
  BT.fromEd = !!fromEd; BT.items = fromEd ? APP.photos.map(p => ({ id: uid('b'), name: p.name, photo: p, size: 0, kind: p.edited ? 'แต่งแล้ว' : 'รูป', thumb: p.thumb, status: '', msg: p.W + ' × ' + p.H + ' px' })) : [];
  APP.view = 'batch'; renderAll();
}
function btAddFiles(files) {
  const list = [...files].filter(isImg); if (!list.length) { toast('รองรับเฉพาะไฟล์รูป (JPG · PNG · WebP · TIFF · PSD …)'); return; }
  list.forEach(f => { const e = extOf(f), web = !/^(psd|psb|tif|tiff|heic|heif)$/.test(e);
    BT.items.push({ id: uid('b'), name: f.name.replace(/\.[^.]+$/, ''), file: f, size: f.size, kind: (e || 'รูป').toUpperCase(), url: web ? URL.createObjectURL(f) : '', status: '', msg: fmtSize(f.size) }); });
  BT.fromEd = BT.fromEd && BT.items.every(it => it.photo || it.file); renderBatch(); toast('เพิ่ม ' + list.length + ' ไฟล์');
}
function btItemHtml(it) {
  const bg = it.thumb || it.url, st = it.status === 'ok' ? 'ok' : it.status === 'bad' ? 'bad' : it.status === 'run' ? 'run' : '';
  return `<div class="bi" data-bi="${it.id}"><span class="tn" style="${bg ? `background-image:url('${bg}')` : ''}">${bg ? '' : esc(it.kind)}</span>
    <span style="min-width:0"><b title="${esc(it.name)}">${esc(it.name)}</b><small${st === 'bad' ? ' style="color:var(--red)"' : ''}>${esc(it.kind)} · ${esc(st === 'bad' ? it.msg.replace(/^✗ /, '') : it.status ? (it.src || '') : it.msg)}</small></span>
    <span style="display:flex;align-items:center;gap:4px"><span class="st ${st}">${st === 'bad' ? '✗ ไม่สำเร็จ' : st ? esc(it.msg) : ''}</span>${BT.running ? '' : `<button class="x" data-btx="${it.id}" aria-label="เอาออก ${esc(it.name)}" title="เอาออก">✕</button>`}</span></div>`;
}
function paintItem(it) { const el = document.querySelector(`[data-bi="${it.id}"]`); if (el) el.outerHTML = btItemHtml(it); }
function btOutName(it) { return (it.name + (BT.suffix || '')).replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.' + BT_EXT[BT.fmt]; }
function renderBatch() {
  const n = BT.items.length;
  $('btList').innerHTML = n ? BT.items.map(btItemHtml).join('') : '<div class="mut" style="text-align:center;padding:18px">ยังไม่มีไฟล์ — เลือกไฟล์ หรือลากมาวางด้านบน</div>';
  const unit = BT.mode === 'pct' ? '%' : 'px', pre = PRESETS[BT.mode] || [];
  $('btSet').innerHTML = `<h3>⚙ ตั้งค่าการแปลง<small>${n} ไฟล์</small></h3>
    <div style="font-size:13px;font-weight:600">บันทึกเป็น</div>
    <div class="seg">${[['jpeg', 'JPEG'], ['png', 'PNG'], ['webp', 'WebP']].map(([k, t]) => `<button class="btn${BT.fmt === k ? ' on' : ''}" data-btfmt="${k}">${t}</button>`).join('')}</div>
    <div style="font-size:13px;font-weight:600">ขนาดรูป</div>
    <div class="row"><select id="btMode" style="min-height:36px;border:1px solid var(--line);border-radius:10px;padding:0 8px;background:#fff;flex:1">${[['orig', 'คงขนาดเดิม'], ['long', 'ด้านยาวไม่เกิน'], ['w', 'ความกว้าง'], ['h', 'ความสูง'], ['pct', 'ย่อเป็นเปอร์เซ็นต์']].map(([k, t]) => `<option value="${k}"${BT.mode === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
      ${BT.mode === 'orig' ? '' : `<input type="number" id="btVal" min="1" max="${BT.mode === 'pct' ? 100 : 20000}" value="${BT.val}"><span class="mut">${unit}</span>`}</div>
    ${BT.mode === 'orig' ? '' : `<div class="chips">${pre.map(v => `<button data-btpre="${v}" class="${+BT.val === v ? 'on' : ''}">${v}${unit === '%' ? '%' : ''}</button>`).join('')}</div>
    ${BT.mode === 'pct' ? '' : `<label class="chk"><input type="checkbox" id="btNoUp"${BT.noUp ? ' checked' : ''}><span>ไม่ขยายรูปที่เล็กกว่าขนาดนี้</span></label>`}`}
    ${BT.fmt === 'png' ? '<div class="mut">PNG ไม่บีบอัดแบบเสียคุณภาพ — ไฟล์ใหญ่กว่า JPEG มาก</div>' : `<div class="sl"><div class="sh"><span>คุณภาพ</span> <i>Quality</i><b id="btQv">${BT.q}</b></div><input type="range" id="btQ" min="50" max="100" step="1" value="${BT.q}" aria-label="คุณภาพ"></div>
    <div class="row"><label style="color:var(--ink)">ขนาดไฟล์ไม่เกิน</label><input type="number" id="btMax" min="20" step="10" placeholder="ไม่จำกัด" value="${esc(BT.maxKB)}"><span class="mut">KB</span></div>`}
    <div class="row"><label style="color:var(--ink)">ต่อท้ายชื่อไฟล์</label><input type="text" id="btSuf" maxlength="30" placeholder="เช่น _web" value="${esc(BT.suffix)}"></div>
    <div class="mut" id="btEx">ตัวอย่าง: ${esc(n ? btOutName(BT.items[0]) : 'ชื่อเดิม' + (BT.suffix || '') + '.' + BT_EXT[BT.fmt])}</div>
    ${BT.fromEd ? `<label class="chk"><input type="checkbox" id="btEdits"${BT.useEdits ? ' checked' : ''}><span>ใช้การแต่งรูปที่ทำไว้ (ครอป · หมุน · ดัดเส้น · เอฟเฟกต์)</span></label>` : ''}
    <div class="info">ไฟล์ต้นฉบับไม่ถูกแก้ · หลายไฟล์ = ดาวน์โหลดเป็น ZIP ไฟล์เดียว · ทำในเครื่องคุณ ไม่อัปโหลด · ข้อมูลกล้อง (EXIF) ไม่ติดไปกับไฟล์ใหม่ · PSD ใช้ภาพรวมของไฟล์ (บันทึกแบบ Maximize Compatibility) · สี CMYK แปลงแบบประมาณ</div>
    <button class="btn teal" data-act="btRun" style="width:100%;min-height:46px;font-size:15px"${n ? '' : ' disabled'}>⬇ แปลงและดาวน์โหลด (${n} ไฟล์)</button>
    <div class="row"><button class="btn sm" data-act="btAdd">＋ เพิ่มไฟล์</button>${n ? '<button class="btn sm" data-act="btClear">ล้างรายการ</button>' : ''}</div>
    <div id="btSum" class="mut"></div>`;
}
function btTarget(w, h) {
  const v = Math.max(1, +BT.val || 1); let k = 1;
  if (BT.mode === 'long') k = v / Math.max(w, h); else if (BT.mode === 'w') k = v / w; else if (BT.mode === 'h') k = v / h; else if (BT.mode === 'pct') k = Math.min(100, v) / 100;
  if (BT.mode !== 'pct' && BT.noUp) k = Math.min(k, 1);
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}
function resizeTo(src, w, h, white) {   // ย่อทีละครึ่ง (คมกว่าย่อครั้งเดียว) แล้วลงขนาดจริง
  let curC = src, cw = src.width, ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) { const t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2); const g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(curC, 0, 0, t.width, t.height);
    if (curC !== src) curC.width = curC.height = 0; curC = t; cw = t.width; ch = t.height; }
  const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d'); if (white) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
  g.imageSmoothingQuality = 'high'; g.drawImage(curC, 0, 0, w, h); if (curC !== src) curC.width = curC.height = 0; return o;
}
const toBlob = (c, type, q) => new Promise(ok => c.toBlob(ok, type, q));
async function btEncode(c) {
  const type = 'image/' + BT.fmt; let q = BT.q / 100, b = await toBlob(c, type, q);
  if (!b) throw new Error('สร้างไฟล์ไม่ได้ — รูปใหญ่เกินหน่วยความจำของเครื่อง');
  const max = (+BT.maxKB || 0) * 1024; let over = false, w = c.width, h = c.height, shrunk = false;
  if (max && BT.fmt !== 'png' && b.size > max) {   // ลดคุณภาพ (ไม่ต่ำกว่า 55) ก่อน · ยังเกิน → ย่อขนาดรูปลงทีละขั้น
    let src = c, qMin = Math.min(0.55, q);
    for (let round = 0; round < 6; round++) {
      let lo = qMin, hi = q, best = null; const t0 = await toBlob(src, type, qMin);
      if (t0 && t0.size <= max) { best = t0; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2, t = await toBlob(src, type, m); if (t && t.size <= max) { best = t; lo = m; } else hi = m; } }
      if (best) { b = best; break; }
      const f = Math.max(0.5, Math.sqrt(max / t0.size) * 0.92); w = Math.max(1, Math.round(w * f)); h = Math.max(1, Math.round(h * f));
      const n = resizeTo(src, w, h, true); if (src !== c) src.width = src.height = 0; src = n; shrunk = true; b = t0;
      if (round === 5) { b = await toBlob(src, type, qMin); over = b.size > max; } }
    if (src !== c) src.width = src.height = 0;
  }
  return { blob: b, over, w, h, shrunk };
}
// ---------- ZIP (เก็บแบบไม่บีบอัด — JPEG บีบอัดแล้ว · ชื่อไฟล์ภาษาไทยใช้ UTF-8) ----------
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
async function makeZip(files) {
  const te = new TextEncoder(), parts = [], cen = [], d = new Date(); let off = 0;
  const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  for (const f of files) { const data = new Uint8Array(await f.blob.arrayBuffer()), nm = te.encode(f.name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(h, nm, data); cen.push(c, nm); off += 30 + nm.length + data.length; }
  const cenLen = cen.reduce((a, x) => a + x.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cenLen, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, e], { type: 'application/zip' });
}
function downloadBlob(blob, fn) { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
async function btRun() {
  const n = BT.items.length; if (!n || BT.running) return; BT.running = true; renderBatch();
  const out = [], used = new Set(); let inB = 0, outB = 0, bad = 0, over = 0, i = 0;
  for (const it of BT.items) { i++; it.status = 'run'; it.msg = 'กำลังแปลง…'; paintItem(it); busy(true, 'กำลังแปลง ' + i + ' / ' + n + ' — ' + it.name); await tick();
    let src = null, own = false;
    try {
      if (it.photo) { if (BT.useEdits && it.photo.edited) { src = await renderFull(it.photo, 20000, true); own = true; } else src = it.photo.bmp; }
      else { src = await decodeAny(it.file); own = true; }
      it.src = src.width + ' × ' + src.height + ' px' + (src.__cmyk ? ' · CMYK' : '');
      const [tw, th] = btTarget(src.width, src.height), c = resizeTo(src, tw, th, BT.fmt !== 'png');
      if (own) { if (src.close) { try { src.close(); } catch (x) {} } else src.width = src.height = 0; } src = null;
      const r = await btEncode(c); c.width = c.height = 0; const ow = r.w, oh = r.h;
      let fn = btOutName(it), k = 2; while (used.has(fn.toLowerCase())) fn = btOutName({ name: it.name + ' (' + (k++) + ')' }); used.add(fn.toLowerCase());
      out.push({ name: fn, blob: r.blob }); inB += it.size || 0; outB += r.blob.size; if (r.over) over++;
      it.status = 'ok'; it.msg = '✓ ' + ow + ' × ' + oh + ' · ' + fmtSize(r.blob.size) + (r.over ? ' (เกินที่กำหนด)' : r.shrunk ? ' (ย่อเพิ่มให้ไม่เกินขนาดไฟล์)' : '');
    } catch (e) { console.error(e); it.status = 'bad'; it.msg = '✗ ' + String((e && e.message) || e).replace(it.file ? it.file.name + ' — ' : '', ''); bad++;
      if (own && src) { try { if (src.close) src.close(); else src.width = src.height = 0; } catch (x) {} } }
    paintItem(it); }
  BT.running = false;
  if (!out.length) { busy(false); renderBatch(); toast('แปลงไม่สำเร็จ — ดูเหตุผลในรายการ', 5000); return; }
  try { if (out.length === 1) { busy(false); downloadBlob(out[0].blob, out[0].name); }
    else { busy(true, 'กำลังรวมเป็นไฟล์ ZIP…'); await tick(); const d = new Date(), z = await makeZip(out); busy(false);
      downloadBlob(z, 'Wellcon รูป ' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + ' (' + out.length + ' รูป).zip'); }
  } catch (e) { busy(false); toast('ดาวน์โหลดไม่สำเร็จ: ' + ((e && e.message) || e), 6000); }
  renderBatch();
  const sum = 'เสร็จ ' + out.length + ' / ' + n + ' ไฟล์' + (bad ? ' · ไม่สำเร็จ ' + bad : '') + (over ? ' · เกินขนาดที่กำหนด ' + over : '') + (inB ? ' · ' + fmtSize(inB) + ' → ' + fmtSize(outB) : ' · รวม ' + fmtSize(outB));
  $('btSum').textContent = sum; toast(sum, 5000);
}

// =====================================================================
// เปลี่ยนชื่อรูปทีละหลายรูป (Batch Rename) — ชื่อ + เลขรัน
//   • เลือกโฟลเดอร์ในเครื่อง (Chrome / Edge บนคอม) → เปลี่ยนชื่อไฟล์จริงในโฟลเดอร์ · ย้อนกลับชื่อเดิมได้ · ไม่ทับไฟล์ที่มีอยู่
//   • เลือกรูป / ลากมาวาง → ดาวน์โหลดสำเนาชื่อใหม่เป็น ZIP (ไฟล์ต้นฉบับไม่ถูกแก้)
//   • ไม่แปลง / ไม่บีบอัดรูป — เปลี่ยนเฉพาะชื่อ (นามสกุลไฟล์เดิม) · ทำในเครื่อง ไม่อัปโหลด
// =====================================================================
const RN_KEY = 'wpe_rename_v1';
const RN = Object.assign({ items: [], dir: null, dirName: '', prefix: '', sep: '-', start: 1, digits: 3, sort: 'name', running: false, undo: null, forceCopy: false, sum: '' },
  (() => { try { const o = JSON.parse(localStorage.getItem(RN_KEY) || 'null'); return o && typeof o === 'object' ? { prefix: String(o.prefix || ''), sep: ['-', '_', ' ', ''].includes(o.sep) ? o.sep : '-', start: o.start == null ? 1 : Math.max(0, Math.floor(+o.start || 0)), digits: clamp(Math.floor(+o.digits || 3), 1, 6), sort: ['name', 'old', 'new', 'add'].includes(o.sort) ? o.sort : 'name' } : {}; } catch (e) { return {}; } })());
const RN_DIR_OK = typeof window.showDirectoryPicker === 'function' && !MOBILE && !EMBED;
const RN_ZIP_MAX = 1024 * 1048576;   // ZIP รวมไม่เกิน ~1 GB (ทำในหน่วยความจำ)
const rnSaveSet = () => { try { localStorage.setItem(RN_KEY, JSON.stringify({ prefix: RN.prefix, sep: RN.sep, start: RN.start, digits: RN.digits, sort: RN.sort })); } catch (e) {} };
const rnClean = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '');
const rnExt = (n) => { const m = String(n).match(/^.+\.([^.]+)$/); return m ? m[1] : ''; };
const natCmp = new Intl.Collator('th', { numeric: true, sensitivity: 'base' }).compare;
const rnWeb = (ext) => !/^(psd|psb|tif|tiff|heic|heif)$/i.test(ext);
function rnSorted() { const a = RN.items.slice();
  if (RN.sort === 'name') a.sort((x, y) => natCmp(x.name, y.name)); else if (RN.sort === 'old') a.sort((x, y) => x.lm - y.lm || natCmp(x.name, y.name)); else if (RN.sort === 'new') a.sort((x, y) => y.lm - x.lm || natCmp(x.name, y.name));
  return a; }   // 'add' = ตามลำดับที่เพิ่ม
function rnPlan() {   // [{ it, from, to }] เรียงตามที่ตั้งไว้
  const pre = rnClean(RN.prefix).trim().replace(/[. ]+$/, ''), st = Math.max(0, Math.floor(+RN.start || 0)), dg = clamp(Math.floor(+RN.digits || 1), 1, 6);
  return rnSorted().map((it, i) => ({ it, from: it.name, to: (pre ? pre + RN.sep : '') + String(st + i).padStart(dg, '0') + (it.ext ? '.' + it.ext : '') })); }
function rnFree() { RN.items.forEach(it => { if (it.url) URL.revokeObjectURL(it.url); }); RN.items = []; RN.dir = null; RN.dirName = ''; RN.undo = null; RN.sum = ''; }
function rnOpen() { APP.view = 'rename'; renderAll(); }
function rnItem(name, file, h) { const ext = rnExt(name); return { id: uid('r'), name, ext, file, h: h || null, size: file.size, lm: file.lastModified || 0, url: rnWeb(ext) ? URL.createObjectURL(file) : '' }; }
function rnAddFiles(files) {
  const list = [...files].filter(isImg); if (!list.length) { toast('รองรับเฉพาะไฟล์รูป (JPG · PNG · WebP · TIFF · PSD …)'); return; }
  if (RN.dir) rnFree();   // เปลี่ยนจากโหมดโฟลเดอร์ → โหมดเลือกรูป
  list.forEach(f => RN.items.push(rnItem(f.name, f))); RN.sum = ''; renderAll(); toast('เพิ่ม ' + list.length + ' รูป');
}
async function rnLoadDir(d) {   // อ่านรูปในโฟลเดอร์ (ชั้นเดียว ไม่รวมโฟลเดอร์ย่อย)
  busy(true, 'กำลังอ่านโฟลเดอร์ “' + d.name + '”…'); await tick();
  try { const got = []; for await (const [name, h] of d.entries()) { if (h.kind !== 'file' || !isImg({ name, type: '' }) || /^__wren/.test(name)) continue; got.push(rnItem(name, await h.getFile(), h)); }
    rnFree(); RN.dir = d; RN.dirName = d.name; RN.items = got; busy(false); renderAll();
    toast(got.length ? 'พบ ' + got.length + ' รูปในโฟลเดอร์ “' + d.name + '”' : 'ไม่พบไฟล์รูปในโฟลเดอร์นี้ (ไม่รวมโฟลเดอร์ย่อย)', 4000);
  } catch (e) { console.error(e); busy(false); toast('อ่านโฟลเดอร์ไม่ได้: ' + ((e && e.message) || e), 6000); }
}
async function rnPickDir() {
  if (!RN_DIR_OK) { toast('เบราว์เซอร์นี้เลือกโฟลเดอร์ไม่ได้ — ใช้ Chrome หรือ Edge บนคอม หรือกด “เลือกรูป”', 6000); return; }
  let d = null; try { d = await window.showDirectoryPicker({ mode: 'readwrite', id: 'wpe-rename' }); } catch (e) { if (e && e.name !== 'AbortError') toast('เปิดโฟลเดอร์ไม่ได้: ' + ((e && e.message) || e), 6000); return; }
  await rnLoadDir(d);
}
async function rnExists(dir, name) { try { await dir.getFileHandle(name); return true; } catch (e) { if (e && e.name === 'NotFoundError') return false; if (e && e.name === 'TypeMismatchError') return true; throw e; } }
async function rnMove(dir, h, from, to) {   // เปลี่ยนชื่อ 1 ไฟล์ — ไม่ทับไฟล์ที่มีอยู่ · คืน handle ของไฟล์ชื่อใหม่
  if (from.toLowerCase() === to.toLowerCase()) throw new Error('ชื่อเดิมและชื่อใหม่ซ้ำกัน: ' + to);
  if (await rnExists(dir, to)) throw new Error('มีไฟล์ชื่อ “' + to + '” อยู่แล้ว');
  if (!RN.forceCopy && typeof h.move === 'function') { try { await h.move(to); return await dir.getFileHandle(to); } catch (e) { if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw e; if (await rnExists(dir, to) && !(await rnExists(dir, from))) return await dir.getFileHandle(to); } }
  // เบราว์เซอร์ที่เปลี่ยนชื่อตรง ๆ ไม่ได้: คัดลอกเป็นชื่อใหม่ → ตรวจขนาด → ลบไฟล์ชื่อเดิม
  const f = await h.getFile(), nh = await dir.getFileHandle(to, { create: true }), w = await nh.createWritable(); await w.write(f); await w.close();
  const g = await nh.getFile(); if (g.size !== f.size) { try { await dir.removeEntry(to); } catch (x) {} throw new Error('คัดลอก “' + from + '” ไม่ครบ — ไม่เปลี่ยนชื่อไฟล์นี้'); }
  await dir.removeEntry(from); return nh;
}
async function rnApply(dir, pairs, onStep) {   // pairs: [{ h, from, to }] (from ≠ to) — ผิดพลาดกลางทาง = คืนชื่อเดิมทั้งหมดที่ทำไปแล้ว
  const fromSet = new Set(pairs.map(p => p.from.toLowerCase())), seen = new Set();
  for (const p of pairs) { const k = p.to.toLowerCase(); if (seen.has(k)) throw Object.assign(new Error('ชื่อใหม่ซ้ำกัน: ' + p.to), { rolled: true }); seen.add(k);
    if (!fromSet.has(k) && await rnExists(dir, p.to)) throw Object.assign(new Error('มีไฟล์ชื่อ “' + p.to + '” อยู่ในโฟลเดอร์แล้ว (ไม่ใช่รูปในรายการนี้) — เปลี่ยนชื่อ หรือเลขเริ่มต้น แล้วลองใหม่'), { rolled: true }); }
  // ชื่อใหม่ไปชนชื่อเดิมของรูปในรายการ (เช่น รันเลขใหม่ทับชุดเดิม · เปลี่ยนแค่ตัวพิมพ์เล็ก-ใหญ่) → พักเป็นชื่อชั่วคราวก่อน แล้วค่อยตั้งชื่อจริง
  const two = pairs.some(p => fromSet.has(p.to.toLowerCase())), tag = '__wren' + Date.now().toString(36) + '_', done = [], total = pairs.length * (two ? 2 : 1); let n = 0;
  const tmpOf = (p, i, k) => tag + k + i + (rnExt(p.from) ? '.' + rnExt(p.from) : '');
  try {
    if (two) for (let i = 0; i < pairs.length; i++) { const p = pairs[i], t = tmpOf(p, i, 'a'); p.h = await rnMove(dir, p.h, p.from, t); p.cur = t; done.push(p); if (onStep) await onStep(++n, total, p.from); }
    for (const p of pairs) { p.h = await rnMove(dir, p.h, p.cur || p.from, p.to); if (!p.cur) done.push(p); p.cur = p.to; if (onStep) await onStep(++n, total, p.to); }
  } catch (e) { console.error(e); let fail = 0;
    if (two) for (let i = 0; i < done.length; i++) { const p = done[i]; if (p.cur.indexOf(tag) === 0) continue; try { const t = tmpOf(p, i, 'r'); p.h = await rnMove(dir, await dir.getFileHandle(p.cur), p.cur, t); p.cur = t; } catch (x) { console.error(x); fail++; } }
    for (const p of done) { try { p.h = await rnMove(dir, await dir.getFileHandle(p.cur), p.cur, p.from); p.cur = p.from; } catch (x) { console.error(x); fail++; } }
    const err = new Error(String((e && e.message) || e)); err.rolled = !fail; err.left = fail; throw err; }
  return pairs;
}
async function rnCommit(pairs, verb) {   // เปลี่ยนชื่อจริงในโฟลเดอร์ + อัปเดตรายการ
  RN.running = true; RN.sum = ''; renderRename(); busy(true, verb + '…');
  try { await rnApply(RN.dir, pairs, async (i, n, nm) => { if (i % 5 === 0 || i === n) { busy(true, verb + ' ' + i + ' / ' + n + ' — ' + nm); await tick(); } });
    for (const p of pairs) { const it = p.it; it.name = p.to; it.ext = rnExt(p.to); it.h = p.h; try { it.file = await p.h.getFile(); it.size = it.file.size; it.lm = it.file.lastModified || it.lm; } catch (x) {}
      if (it.url) { URL.revokeObjectURL(it.url); it.url = rnWeb(it.ext) ? URL.createObjectURL(it.file) : ''; } }
    RN.running = false; busy(false); return true;
  } catch (e) { RN.running = false; busy(false);
    // คืนชื่อไม่ครบ → อ่านโฟลเดอร์ใหม่ให้รายการตรงกับของจริง
    if (!e.rolled) { const d = RN.dir; await rnLoadDir(d); }
    RN.sum = '✗ ' + e.message + (e.rolled ? ' — ไม่มีไฟล์ใดถูกเปลี่ยนชื่อ' : ' — มี ' + e.left + ' ไฟล์ที่คืนชื่อเดิมไม่ได้ ตรวจโฟลเดอร์ (ไฟล์ชื่อขึ้นต้น __wren คือไฟล์ที่ค้าง)'); renderRename(); toast(RN.sum, 8000); return false; }
}
async function rnRun() {
  if (!RN.dir || RN.running) return; const plan = rnPlan(), pairs = plan.filter(p => p.from !== p.to).map(p => ({ it: p.it, h: p.it.h, from: p.from, to: p.to }));
  if (!pairs.length) { toast('ชื่อไฟล์ตรงกับที่ตั้งไว้อยู่แล้ว'); return; }
  if (!(await ask('เปลี่ยนชื่อ ' + pairs.length + ' ไฟล์ในโฟลเดอร์ “' + RN.dirName + '”?', 'ไฟล์จริงในเครื่องจะถูกเปลี่ยนชื่อ เช่น\n' + pairs[0].from + '  →  ' + pairs[0].to + '\n\nกด “↶ ย้อนกลับชื่อเดิม” ได้ตราบที่ยังไม่ปิดหน้านี้', null))) return;
  if (await rnCommit(pairs, 'กำลังเปลี่ยนชื่อ')) { RN.undo = pairs.map(p => ({ it: p.it, from: p.to, to: p.from })); RN.sum = '✓ เปลี่ยนชื่อ ' + pairs.length + ' ไฟล์ในโฟลเดอร์ “' + RN.dirName + '” แล้ว'; renderRename(); toast(RN.sum, 5000); }
}
async function rnUndo() {
  if (!RN.dir || RN.running || !RN.undo) return; const pairs = RN.undo.filter(u => RN.items.indexOf(u.it) >= 0 && u.it.name === u.from).map(u => ({ it: u.it, h: u.it.h, from: u.from, to: u.to }));
  if (!pairs.length) { RN.undo = null; renderRename(); return; }
  if (await rnCommit(pairs, 'กำลังคืนชื่อเดิม')) { RN.undo = null; RN.sum = '↶ คืนชื่อเดิม ' + pairs.length + ' ไฟล์แล้ว'; renderRename(); toast(RN.sum, 5000); }
}
async function rnZip() {   // สำเนาชื่อใหม่ (ไฟล์ต้นฉบับไม่ถูกแก้)
  if (RN.running || !RN.items.length) return; const plan = rnPlan(), tot = plan.reduce((a, p) => a + (p.it.size || 0), 0);
  if (tot > RN_ZIP_MAX) { toast('รูปรวม ' + fmtSize(tot) + ' ใหญ่เกินกว่าจะรวมเป็น ZIP (ไม่เกิน 1 GB) — ' + (RN_DIR_OK ? 'ใช้ “เลือกโฟลเดอร์ในเครื่อง” เพื่อเปลี่ยนชื่อไฟล์จริงแทน' : 'แบ่งทำทีละชุด'), 8000); return; }
  RN.running = true; busy(true, 'กำลังรวมเป็นไฟล์ ZIP…'); await tick();
  try { if (plan.length === 1) downloadBlob(plan[0].it.file, plan[0].to);
    else { const d = new Date(), z = await makeZip(plan.map(p => ({ name: p.to, blob: p.it.file })));
      downloadBlob(z, 'Wellcon เปลี่ยนชื่อรูป ' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + ' (' + plan.length + ' รูป).zip'); }
    RN.sum = '✓ ดาวน์โหลด ' + plan.length + ' รูปชื่อใหม่แล้ว · รวม ' + fmtSize(tot) + ' · ไฟล์ต้นฉบับไม่ถูกแก้';
  } catch (e) { console.error(e); RN.sum = '✗ ดาวน์โหลดไม่สำเร็จ: ' + ((e && e.message) || e); }
  RN.running = false; busy(false); renderRename(); toast(RN.sum, 5000);
}
function rnItemHtml(p, i) { const it = p.it, same = p.from === p.to;
  return `<div class="bi" data-rn="${it.id}"><span class="tn">${it.url ? `<img src="${it.url}" loading="lazy" decoding="async" alt="">` : esc((it.ext || 'รูป').toUpperCase())}</span>
    <span style="min-width:0"><b title="${esc(p.to)}">${esc(p.to)}</b><small title="${esc(p.from)}">${same ? 'ชื่อนี้อยู่แล้ว' : 'เดิม: ' + esc(p.from)} · ${fmtSize(it.size)}</small></span>
    <span style="display:flex;align-items:center;gap:4px"><span class="st">${i + 1}</span>${RN.running ? '' : `<button class="x" data-rnx="${it.id}" aria-label="เอาออกจากรายการ ${esc(it.name)}" title="เอาออกจากรายการ (ไม่ลบไฟล์)">✕</button>`}</span></div>`;
}
function rnPaintNames() {   // พิมพ์ชื่อ / เลข → เปลี่ยนเฉพาะข้อความ (ไม่วาดรูปย่อใหม่)
  const plan = rnPlan(); plan.forEach(p => { const el = document.querySelector(`[data-rn="${p.it.id}"]`); if (!el) return; const b = el.querySelector('b'), s = el.querySelector('small');
    b.textContent = p.to; b.title = p.to; s.textContent = (p.from === p.to ? 'ชื่อนี้อยู่แล้ว' : 'เดิม: ' + p.from) + ' · ' + fmtSize(p.it.size); });
  const ex = $('rnEx'); if (ex) ex.textContent = rnExTxt(plan);
}
const rnExTxt = (plan) => plan.length ? 'ตัวอย่าง: ' + plan[0].to + (plan.length > 1 ? '  …  ' + plan[plan.length - 1].to : '') : 'ตัวอย่าง: ' + ((rnClean(RN.prefix).trim() ? rnClean(RN.prefix).trim() + RN.sep : '') + String(Math.max(0, Math.floor(+RN.start || 0))).padStart(clamp(Math.floor(+RN.digits || 1), 1, 6), '0')) + '.jpg';
function renderRename() {
  const plan = rnPlan(), n = plan.length, chg = plan.filter(p => p.from !== p.to).length;
  $('rnDirBtn').hidden = !RN_DIR_OK;
  $('rnDropTx').textContent = RN.dir ? '📁 โฟลเดอร์ “' + RN.dirName + '” · ' + n + ' รูป (ไม่รวมโฟลเดอร์ย่อย)' : RN_DIR_OK ? 'เลือกโฟลเดอร์ในเครื่อง = เปลี่ยนชื่อไฟล์จริงในโฟลเดอร์ · เลือกรูป / ลากรูปมาวาง = ได้สำเนาชื่อใหม่เป็น ZIP' : 'เลือกรูป หรือลากรูปมาวาง → ได้สำเนาชื่อใหม่เป็น ZIP (เปลี่ยนชื่อไฟล์จริงในโฟลเดอร์ ใช้ Chrome / Edge บนคอม)';
  $('rnList').innerHTML = n ? plan.map(rnItemHtml).join('') : '<div class="mut" style="text-align:center;padding:18px">ยังไม่มีรูป — เลือกโฟลเดอร์ เลือกรูป หรือลากรูปมาวางด้านบน</div>';
  const dis = n && !RN.running ? '' : ' disabled';
  $('rnSet').innerHTML = `<h3>✎ ตั้งชื่อใหม่<small>${n} รูป</small></h3>
    <div class="row"><label style="color:var(--ink)">ชื่อ</label><input type="text" id="rnPre" maxlength="80" placeholder="เช่น MVC-Lobby" value="${esc(RN.prefix)}" style="flex:1;width:auto"></div>
    <div style="font-size:13px;font-weight:600">ตัวคั่นระหว่างชื่อกับเลข</div>
    <div class="chips">${[['-', 'ขีด -'], ['_', 'ขีดล่าง _'], [' ', 'เว้นวรรค'], ['', 'ไม่มี']].map(([k, t]) => `<button data-rnsep="${esc(k)}" class="${RN.sep === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="row"><label style="color:var(--ink)">เลขเริ่มต้น</label><input type="number" id="rnStart" min="0" step="1" value="${RN.start}"></div>
    <div style="font-size:13px;font-weight:600">จำนวนหลักของเลข</div>
    <div class="chips">${[1, 2, 3, 4, 5].map(v => `<button data-rndig="${v}" class="${+RN.digits === v ? 'on' : ''}">${v} หลัก (${String(1).padStart(v, '0')})</button>`).join('')}</div>
    <div class="row"><label style="color:var(--ink)">เรียงลำดับ</label><select id="rnSort" style="min-height:36px;border:1px solid var(--line);border-radius:10px;padding:0 8px;background:#fff;flex:1">${[['name', 'ตามชื่อเดิม (ก-ฮ · 1-9)'], ['old', 'วันที่ของไฟล์ เก่า → ใหม่'], ['new', 'วันที่ของไฟล์ ใหม่ → เก่า'], ['add', 'ตามลำดับที่เพิ่ม']].map(([k, t]) => `<option value="${k}"${RN.sort === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="mut" id="rnEx">${esc(rnExTxt(plan))}</div>
    <div class="info">เปลี่ยนเฉพาะชื่อไฟล์ — ไม่แปลง ไม่ย่อ ไม่บีบอัดรูป · นามสกุลไฟล์เดิม · ทำในเครื่องคุณ ไม่อัปโหลด${RN.dir ? ' · ไม่ทับไฟล์ที่มีอยู่ในโฟลเดอร์ · ไม่แตะโฟลเดอร์ย่อยและไฟล์ที่ไม่ใช่รูป' : ' · ไฟล์ต้นฉบับไม่ถูกแก้'}</div>
    ${RN.dir ? `<button class="btn teal" data-act="rnRun" style="width:100%;min-height:46px;font-size:15px"${chg && !RN.running ? '' : ' disabled'}>✎ เปลี่ยนชื่อในโฟลเดอร์ (${chg} ไฟล์)</button>
    ${RN.undo ? `<button class="btn" data-act="rnUndo" style="width:100%"${RN.running ? ' disabled' : ''}>↶ ย้อนกลับชื่อเดิม (${RN.undo.length} ไฟล์)</button>` : ''}
    <button class="btn sm" data-act="rnZip" style="width:100%"${dis}>⬇ ดาวน์โหลดสำเนาชื่อใหม่เป็น ZIP แทน</button>`
    : `<button class="btn teal" data-act="rnZip" style="width:100%;min-height:46px;font-size:15px"${dis}>⬇ ดาวน์โหลดชื่อใหม่ (${n} รูป${n > 1 ? ' · ZIP' : ''})</button>`}
    <div class="row">${RN_DIR_OK ? '<button class="btn sm" data-act="rnDir">📁 เลือกโฟลเดอร์</button>' : ''}<button class="btn sm" data-act="rnAdd">＋ เลือกรูป</button>${n ? '<button class="btn sm" data-act="rnClear">ล้างรายการ</button>' : ''}</div>
    <div id="rnSum" class="mut"${/^✗/.test(RN.sum) ? ' style="color:var(--red)"' : ''}>${esc(RN.sum)}</div>`;
}

// =====================================================================
// เหตุการณ์
// =====================================================================
document.addEventListener('click', async (e) => { const t = e.target;
  const bx = t.closest('[data-btx]'); if (bx) { const i = BT.items.findIndex(x => x.id === bx.dataset.btx); if (i >= 0) { const [it] = BT.items.splice(i, 1); if (it.url) URL.revokeObjectURL(it.url); } renderBatch(); return; }
  const rx = t.closest('[data-rnx]'); if (rx) { if (RN.running) return; const i = RN.items.findIndex(x => x.id === rx.dataset.rnx); if (i >= 0) { const [it] = RN.items.splice(i, 1); if (it.url) URL.revokeObjectURL(it.url); } RN.sum = ''; renderAll(); return; }
  const rs = t.closest('[data-rnsep]'); if (rs) { RN.sep = rs.dataset.rnsep; rnSaveSet(); renderRename(); return; }
  const rd = t.closest('[data-rndig]'); if (rd) { RN.digits = +rd.dataset.rndig; rnSaveSet(); renderRename(); return; }
  const bf2 = t.closest('[data-btfmt]'); if (bf2) { BT.fmt = bf2.dataset.btfmt; btSaveSet(); renderBatch(); return; }
  const bp = t.closest('[data-btpre]'); if (bp) { BT.val = +bp.dataset.btpre; btSaveSet(); renderBatch(); return; }
  const px = t.closest('[data-phx]'); if (px) { e.stopPropagation(); const i = +px.dataset.phx, p = APP.photos[i];
    if (p.edited && !(await ask('ปิด “' + p.name + '”?', 'การแต่งรูปนี้ที่ยังไม่ได้บันทึกจะหายไป', null))) return;
    APP.photos.splice(i, 1); if (APP.cur >= APP.photos.length) APP.cur = APP.photos.length - 1; else if (APP.cur > i) APP.cur--; APP.guideMode = false; renderAll(); return; }
  const ph = t.closest('[data-ph]'); if (ph) { const i = +ph.dataset.ph; if (i !== APP.cur) { APP.cur = i; APP.guideMode = false; renderAll(); } return; }
  const ms = t.closest('[data-mixsel]'); if (ms) { APP.mixSel = ms.dataset.mixsel; renderSide(); return; }
  const pn = t.closest('[data-panel]'); if (pn) { APP.panel = pn.dataset.panel; APP.guideMode = false; APP.wbPick = false; renderAll(); return; }
  const a = t.closest('[data-act]'); if (!a) return; const k = a.dataset.act, p = cur();
  if (k === 'toPm' && APP.view === 'batch') { if (BT.running) return; APP.view = 'edit'; renderAll(); return; }
  if (k === 'toPm' && APP.view === 'rename') { if (RN.running) return; APP.view = 'edit'; renderAll(); return; }
  if (k === 'renameOpen') { rnOpen(); return; }
  if (k === 'rnDir') { if (!RN.running) rnPickDir(); return; }
  if (k === 'rnAdd') { if (!RN.running) $('fRename').click(); return; }
  if (k === 'rnRun') { rnRun(); return; }
  if (k === 'rnUndo') { rnUndo(); return; }
  if (k === 'rnZip') { rnZip(); return; }
  if (k === 'rnClear') { if (RN.running) return; rnFree(); renderAll(); return; }
  if (k === 'batchOpen') { btOpen(false); return; }
  if (k === 'batchFromEd') { if (!APP.photos.length) return; btOpen(true); return; }
  if (k === 'btAdd') { $('fBatch').click(); return; }
  if (k === 'btRun') { btRun(); return; }
  if (k === 'btClear') { BT.items.forEach(it => { if (it.url) URL.revokeObjectURL(it.url); }); BT.items = []; BT.fromEd = false; renderAll(); return; }
  if (k === 'toPm' && EMBED) { if (APP.photos.some(x => x.edited) && !(await ask('ยกเลิกการแต่งรูป?', 'รูปบน Layboard จะไม่เปลี่ยน', null))) return; toParent({ t: 'pe-cancel' }); return; }
  if (k === 'toPm') { if (APP.dirty && APP.photos.some(x => x.edited) && !(await ask('ออกโดยไม่บันทึก?', 'รูปที่แต่งแล้วยังไม่ได้บันทึกจะหายไป', null))) return; APP.dirty = false; location.href = pmUrl() + '#/work'; return; }
  if (k === 'open') { $('fOpen').click(); return; }
  if (k === 'save') { save(); return; }
  if (k === 'closeAll') { if (APP.photos.some(x => x.edited) && !(await ask('ปิดรูปทั้งหมด?', 'การแต่งรูปที่ยังไม่ได้บันทึกจะหายไป', null))) return; Object.assign(APP, { photos: [], cur: -1, dirty: false, guideMode: false }); renderAll(); return; }
  if (k === 'undo') { undo(); return; }
  if (!p) return; const s = p.s;
  if (k === 'rotCw' || k === 'rotCcw') { pushHist(p); s.rot = (s.rot + (k === 'rotCw' ? 1 : 3)) % 4; [s.fh, s.fv] = [s.fv, s.fh]; s.crop = null; s.guides = []; if (s.aspect !== 'orig' && s.aspect !== 'free' && s.aspect !== '1:1') { const [x, y] = s.aspect.split(':'); const sw = y + ':' + x; if (ASPECTS.some(q => q[0] === sw)) s.aspect = sw; } changed(true); renderSide(); }
  else if (k === 'flipH' || k === 'flipV') { pushHist(p); if (k === 'flipH') s.fh = !s.fh; else s.fv = !s.fv; s.guides = []; if (s.crop) { if (k === 'flipH') s.crop.x = -s.crop.x - s.crop.w; else s.crop.y = -s.crop.y - s.crop.h; } s.angle = -s.angle; changed(true); renderSide(); }
  else if (k === 'autoLevel') { pushHist(p); s.angle = clamp(autoAngle(p), -45, 45); changed(true); renderSide(); toast(s.angle ? 'ปรับเอียง ' + fmt(s.angle, 0.1) + '°' : 'ภาพได้ระดับอยู่แล้ว'); }
  else if (k === 'cropReset') { pushHist(p); s.crop = null; if (needFit(s)) fitCrop(p, false); changed(false); }
  else if (k === 'aspSwap') { pushHist(p); const [x, y] = s.aspect.split(':'), sw = y + ':' + x; if (ASPECTS.some(q => q[0] === sw)) { s.aspect = sw; fitCrop(p, true); changed(false); renderSide(); } }
  else if (k === 'guideMode') { APP.guideMode = !APP.guideMode; renderSide(); draw(); }
  else if (k === 'guideUndo') { pushHist(p); s.guides.pop(); changed(true); renderSide(); }
  else if (k === 'guideClear') { pushHist(p); s.guides = []; changed(true); renderSide(); }
  else if (k === 'tfReset') { pushHist(p); s.tf = DEF().tf; changed(true); renderSide(); }
  else if (k === 'lcAuto') { pushHist(p); Object.assign(p.s.lc, autoTone(p)); changed(false); renderSide(); toast('ปรับแสงอัตโนมัติแล้ว — ปรับแถบต่อได้'); }
  else if (k === 'lcLightReset') { pushHist(p); const D0 = DEF().lc; ['exp', 'con', 'hi', 'sh', 'wh', 'bl', 'curve'].forEach(x => { p.s.lc[x] = D0[x]; }); changed(false); renderSide(); }
  else if (k === 'lcColorReset') { pushHist(p); const D0 = DEF().lc; ['temp', 'tint', 'wb', 'vib', 'sat', 'mix'].forEach(x => { p.s.lc[x] = D0[x]; }); APP.wbPick = false; changed(false); renderSide(); }
  else if (k === 'crvReset') { pushHist(p); p.s.lc.curve = DEF().lc.curve; changed(false); renderSide(); }
  else if (k === 'mixReset') { pushHist(p); p.s.lc.mix = {}; changed(false); renderSide(); }
  else if (k === 'wbPick') { APP.wbPick = !APP.wbPick; renderSide(); if (APP.wbPick) toast('คลิกจุดในรูปที่ควรเป็นสีขาว / เทา (เช่น ผนังขาว · ฝ้า · กระดาษ)', 3500); }
  else if (k === 'wbReset') { pushHist(p); p.s.lc.wb = null; changed(false); renderSide(); }
  else if (k === 'fxReset') { pushHist(p); s.fx = DEF().fx; changed(false); renderSide(); }
  else if (k === 'fxAll') { if (!(await ask('ใช้ค่าแสง · สี · เอฟเฟกต์นี้กับทุกรูป?', 'แสง · สี (รวมสมดุลแสงขาว · เส้นโค้ง · ผสมสี) และเอฟเฟกต์ — ครอป / หมุน / ดัดเส้นของแต่ละรูปไม่เปลี่ยน', null))) return;
    APP.photos.forEach(q => { if (q !== p) { pushHist(q); q.s.fx = { ...s.fx }; q.s.lc = JSON.parse(JSON.stringify(s.lc)); markEdited(q); } }); renderFilm(); toast('ใช้กับ ' + (APP.photos.length - 1) + ' รูปแล้ว'); }
  else if (k === 'resetAll') { if (!(await ask('รีเซ็ตรูปนี้ทั้งหมด?', 'ครอป · หมุน · ดัดเส้น · เอฟเฟกต์ กลับเป็นค่าเริ่มต้น (กด ↶ ย้อน ได้)', null))) return; pushHist(p); p.s = DEF(); APP.guideMode = false; changed(false); renderSide(); }
});
let sliding = null;
document.addEventListener('input', (e) => { const t = e.target;
  if (t.id === 'btQ') { BT.q = +t.value; $('btQv').textContent = BT.q; btSaveSet(); return; }
  if (t.id === 'btVal') { BT.val = Math.max(1, +t.value || 1); btSaveSet(); document.querySelectorAll('[data-btpre]').forEach(b => b.classList.toggle('on', +b.dataset.btpre === +BT.val)); return; }
  if (t.id === 'btMax') { BT.maxKB = t.value; btSaveSet(); return; }
  if (t.id === 'rnPre') { const v = rnClean(t.value); if (v !== t.value) t.value = v; RN.prefix = v; RN.sum = ''; rnSaveSet(); rnPaintNames(); return; }
  if (t.id === 'rnStart') { RN.start = Math.max(0, Math.floor(+t.value || 0)); RN.sum = ''; rnSaveSet(); rnPaintNames(); return; }
  if (t.id === 'btSuf') { BT.suffix = t.value.replace(/[\/:*?"<>|]+/g, ''); btSaveSet(); const ex = $('btEx'); if (ex) ex.textContent = 'ตัวอย่าง: ' + (BT.items.length ? btOutName(BT.items[0]) : 'ชื่อเดิม' + BT.suffix + '.' + BT_EXT[BT.fmt]); return; }
  const p = cur(); if (!p) return;
  if (t.dataset.lc || t.dataset.mix) { const key = t.dataset.lc || t.dataset.mix, v = +t.value; if (sliding !== t) { pushHist(p); sliding = t; }
    if (t.dataset.lc) p.s.lc[key] = v; else { const mx = { ...(p.s.lc.mix || {}) }, a = (mx[APP.mixSel] || [0, 0, 0]).slice(); a[+key] = v; mx[APP.mixSel] = a; p.s.lc.mix = mx; }
    const lab = $('v_' + (t.dataset.lc ? 'data-lc' : 'data-mix') + '_' + key); if (lab) lab.textContent = fmt(v, +t.step); changed(false); return; }
  const at = t.dataset.fx ? ['data-fx', 'fx'] : t.dataset.tf ? ['data-tf', 'tf'] : t.dataset.geo ? ['data-geo', 'geo'] : null; if (!at) return;
  const key = t.getAttribute(at[0]), v = +t.value; if (sliding !== t) { pushHist(p); sliding = t; }
  if (at[1] === 'fx') p.s.fx[key] = v; else if (at[1] === 'tf') p.s.tf[key] = v; else p.s[key] = v;
  const lab = $('v_' + at[0] + '_' + key); if (lab) lab.textContent = fmt(v, +t.step);
  changed(at[1] !== 'fx');
});
document.addEventListener('change', (e) => { const t = e.target, p = cur(); sliding = null;
  if (t.id === 'fOpen') { const F = [...t.files]; t.value = ''; if (F.length) addFiles(F); return; }
  if (t.id === 'fBatch') { const F = [...t.files]; t.value = ''; if (F.length) btAddFiles(F); return; }
  if (t.id === 'fRename') { const F = [...t.files]; t.value = ''; if (F.length) rnAddFiles(F); return; }
  if (t.id === 'rnSort') { RN.sort = t.value; rnSaveSet(); renderRename(); return; }
  if (t.id === 'rnPre' || t.id === 'rnStart') return;
  if (t.id === 'btMode') { BT.mode = t.value; if (BT.mode === 'pct' && +BT.val > 100) BT.val = 50; if (BT.mode !== 'pct' && +BT.val <= 100) BT.val = 2048; btSaveSet(); renderBatch(); return; }
  if (t.id === 'btNoUp') { BT.noUp = t.checked; btSaveSet(); return; }
  if (t.id === 'btEdits') { BT.useEdits = t.checked; return; }
  if (!p) return; const s = p.s;
  if (t.id === 'selAsp') { pushHist(p); s.aspect = t.value; if (s.aspect === 'orig' && !needFit(s)) s.crop = null; else fitCrop(p, true); changed(false); renderSide(); }
  else if (t.id === 'selOv') { s.overlay = t.value; drawOverlay(); }
  else if (t.id === 'selUp') { pushHist(p); s.upright = t.value; APP.guideMode = t.value === 'guided' && !s.guides.length; changed(true); renderSide(); if (APP.guideMode) toast('ลากเส้นตามเสา / ขอบผนังที่ควรตั้งตรง', 3500); }
  else if (t.id === 'chkCon') { pushHist(p); s.constrain = t.checked; changed(true); }
});
document.addEventListener('toggle', (e) => { const t = e.target; if (t.id === 'dCrv') { APP.crvOpen = t.open; if (t.open) drawCurve(); } else if (t.id === 'dMix') APP.mixOpen = t.open; }, true);
document.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-rst]'); const p = cur(); if (!r || !p) return; const [attr, key] = r.dataset.rst.split(':');
  pushHist(p); const D0 = DEF(); if (attr === 'data-lc') { p.s.lc[key] = D0.lc[key]; changed(false); renderSide(); return; }
  if (attr === 'data-mix') { const mx = { ...(p.s.lc.mix || {}) }, a = (mx[APP.mixSel] || [0, 0, 0]).slice(); a[+key] = 0; mx[APP.mixSel] = a; p.s.lc.mix = mx; changed(false); renderSide(); return; }
  if (attr === 'data-fx') p.s.fx[key] = D0.fx[key]; else if (attr === 'data-tf') p.s.tf[key] = D0.tf[key]; else p.s[key] = D0[key];
  changed(attr !== 'data-fx'); renderSide(); });
const bf = $('tbBefore'); const bOn = (e) => { if (e) e.preventDefault(); APP.before = true; bf.classList.add('on'); draw(); }, bOff = () => { if (!APP.before) return; APP.before = false; bf.classList.remove('on'); draw(); };
bf.addEventListener('pointerdown', bOn); bf.addEventListener('pointerup', bOff); bf.addEventListener('pointerleave', bOff); bf.addEventListener('pointercancel', bOff);
bf.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') bOn(e); }); bf.addEventListener('keyup', bOff);
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && $('dlg').hidden) { e.preventDefault(); undo(); }
  if (e.key === 'Escape' && APP.guideMode) { APP.guideMode = false; renderSide(); draw(); } });
(function dropBind() { const d = $('drop'); ['dragenter', 'dragover'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.remove('on'); })); d.addEventListener('drop', (e) => addFiles([...(e.dataTransfer.files || [])]));
  const bd = $('btDrop'); ['dragenter', 'dragover'].forEach(k => bd.addEventListener(k, (e) => { e.preventDefault(); bd.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => bd.addEventListener(k, (e) => { e.preventDefault(); bd.classList.remove('on'); })); bd.addEventListener('drop', (e) => btAddFiles([...(e.dataTransfer.files || [])]));
  const rdz = $('rnDrop'); ['dragenter', 'dragover'].forEach(k => rdz.addEventListener(k, (e) => { e.preventDefault(); rdz.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => rdz.addEventListener(k, (e) => { e.preventDefault(); rdz.classList.remove('on'); }));
  rdz.addEventListener('drop', async (e) => { if (RN.running) return; const dt = e.dataTransfer, F = [...(dt.files || [])], it0 = dt.items && dt.items.length === 1 ? dt.items[0] : null;
    if (RN_DIR_OK && it0 && it0.getAsFileSystemHandle) {   // ลากโฟลเดอร์มาวาง = โหมดโฟลเดอร์ (ขอสิทธิ์เขียนก่อน)
      let h = null; try { h = await it0.getAsFileSystemHandle(); } catch (x) {}
      if (h && h.kind === 'directory') { try { if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') { toast('ไม่ได้รับอนุญาตให้แก้ไขโฟลเดอร์นี้'); return; } } catch (x) { toast('ไม่ได้รับอนุญาตให้แก้ไขโฟลเดอร์นี้'); return; } await rnLoadDir(h); return; } }
    if (F.length) rnAddFiles(F); });
  $('view').addEventListener('dragover', (e) => e.preventDefault()); $('view').addEventListener('drop', (e) => { e.preventDefault(); const F = [...(e.dataTransfer.files || [])]; if (F.length) addFiles(F); }); })();
let rzT = null; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (APP.photos.length) draw(); }, 120); });
window.addEventListener('beforeunload', (e) => { if (!EMBED && APP.photos.some(x => x.edited) && APP.dirty) { e.preventDefault(); e.returnValue = ''; } });
window.__PE = { APP, BT, RN, rnPlan, rnLoadDir, rnAddFiles, rnRun, rnUndo, rnApply, renderRename, applyLC, autoTone, geo, cropRect, buildJpeg, autoAngle, guidedG, makeZip, ver: PE_VER };   // ใช้ตรวจสอบในชุดทดสอบ
boot();
})();
