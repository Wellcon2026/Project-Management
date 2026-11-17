/* =====================================================================
   Wellcon Photo Editor — แต่งรูปผลงานแบบง่าย (หน้าแยกใน Wellcon PM: photo.html · ติดตั้งเป็นไอคอนแยกได้ photo.webmanifest)
   ---------------------------------------------------------------------
   • ครอป (สัดส่วน · ปรับเอียง + อัตโนมัติ · เส้นตาราง) · หมุน 90° / กลับด้าน · ดัดเส้นตรง (เส้นนำ Guided + ปรับเอง)
     · เอฟเฟกต์: พื้นผิว (Texture) · ความคมชัด (Clarity) · ลดหมอก (Dehaze) · ขอบมืด (Vignette) · เกรน (Grain)
   • ทำงานในเบราว์เซอร์ทั้งหมด (ไม่มีไลบรารีเพิ่ม) — รูปไม่ถูกอัปโหลด · ไฟล์ต้นฉบับไม่ถูกแก้ (บันทึกเป็น JPEG ไฟล์ใหม่)
   • ตำแหน่งทั้งหมดเก็บเป็นหน่วยสัมพัทธ์ (ไม่ขึ้นกับความละเอียด) → ภาพตัวอย่าง (≤1600 px) กับไฟล์ที่บันทึก (เต็มความละเอียด) ตรงกัน
   • ใช้การเข้าสู่ระบบของ Wellcon PM · สิทธิ์ = การ์ด 'tab:photo' (ชุดเดียวกับแอปหลัก)
   ===================================================================== */
(() => {
'use strict';
const PE_VER = 'v1.1.0';
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
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const uid = (p) => (p || 'i') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busyTxt').textContent = txt; }
const tick = () => new Promise(r => setTimeout(r, 30));

const APP = { me: null, photos: [], cur: -1, panel: 'geo', guideMode: false, before: false, dirty: false };
const DEF = () => ({ rot: 0, fh: false, fv: false, angle: 0, upright: 'off', guides: [], tf: { v: 0, h: 0, r: 0, a: 0, s: 100, x: 0, y: 0 },
  constrain: true, aspect: 'orig', crop: null, overlay: 'thirds', fx: { tex: 0, cla: 0, dhz: 0, vig: 0, grn: 0 } });
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
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'photo' }).then(() => {}, () => {}); } catch (e) {}
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
const isImg = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(f.name);
const loadImage = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('เปิดรูปไม่ได้')); i.src = src; });
async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
  const url = URL.createObjectURL(file); try { return await loadImage(url); } catch (e) { throw new Error(file.name + ' เปิดไม่ได้ — ใช้ไฟล์ JPG / PNG (รูป HEIC จาก iPhone: ตั้งกล้องเป็น "เข้ากันได้มากที่สุด" หรือส่งออกเป็น JPG)'); }
}
async function loadPhoto(file) {
  const bmp = await decode(file), W = bmp.width, H = bmp.height, k = Math.min(1, PREV / Math.max(W, H));
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
  else { const im = renderGeo(p, p.prev, rect, pw, ph); applyFx(im, p.s.fx); ctx.putImageData(im, 0, 0); }
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
  const p = cur(); if (!p || !isCropView() || APP.before || !VIEW) return; e.preventDefault(); const [px, py] = pt(e);
  try { $('ovc').setPointerCapture(e.pointerId); } catch (x) {}
  if (APP.guideMode && p.s.upright === 'guided') { if (p.s.guides.length >= 4) { toast('มีเส้นนำครบ 4 เส้นแล้ว — ลบเส้นล่าสุดก่อน'); return; } const a = c2n(px, py); GDRAW = { a, b: a }; DRAG.on = true; DRAG.kind = 'guide'; return; }
  const h = hit(px, py); if (!h) return; pushHist(p);
  Object.assign(DRAG, { on: true, kind: h, p0: c2n(px, py), r0: { ...cropRect(p, VIEW.g) } });
});
$('ovc').addEventListener('pointermove', (e) => {
  const p = cur(); if (!p || !VIEW || !isCropView()) return; const [px, py] = pt(e);
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

// ---------- ย้อนกลับ ----------
function pushHist(p) { p.hist.push(JSON.stringify(p.s)); if (p.hist.length > 60) p.hist.shift(); }
function undo() { const p = cur(); if (!p || !p.hist.length) return; p.s = JSON.parse(p.hist.pop()); markEdited(p); renderSide(); draw(); }
function markEdited(p) { p.edited = JSON.stringify({ ...p.s, overlay: 'thirds' }) !== JSON.stringify(DEF()); APP.dirty = true; }
function changed(refit) { const p = cur(); if (!p) return; if (refit && needFit(p.s)) fitCrop(p, true); markEdited(p); renderFilm(); draw(); renderHead(); }
function renderHead() { const p = cur(); $('docSub').textContent = p ? (p.W + ' × ' + p.H + ' px' + (APP.photos.length > 1 ? ' · รูป ' + (APP.cur + 1) + ' / ' + APP.photos.length : '') + (APP.dirty ? ' · ยังไม่ได้บันทึก' : '')) : ''; }

// =====================================================================
// แผงด้านขวา
// =====================================================================
const fmt = (v, st) => (st && st < 1 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v))).replace(/^(\d)/, (m) => (v > 0 ? '+' : '') + m);
const slider = (attr, key, th, en, min, max, step, val) => `<div class="sl"><div class="sh" data-rst="${attr}:${key}" title="ดับเบิลคลิก = กลับเป็นค่าเริ่มต้น"><span>${th}</span> <i>${en}</i><b id="v_${attr}_${key}">${fmt(val, step)}</b></div><input type="range" ${attr}="${key}" min="${min}" max="${max}" step="${step || 1}" value="${val}" aria-label="${th}"></div>`;
function renderSide() {
  const p = cur(), b = $('pbody'); if (!p) { b.innerHTML = ''; return; } const s = p.s, H = [];
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
async function buildJpeg(p) {
  busy(true, 'กำลังสร้างไฟล์ความละเอียดเต็ม…'); await tick();
  const k = Math.min(1, 8000 / Math.max(p.W, p.H)), c = document.createElement('canvas'); c.width = Math.round(p.W * k); c.height = Math.round(p.H * k);
  const cg = c.getContext('2d', { willReadFrequently: true }); cg.drawImage(p.bmp, 0, 0, c.width, c.height);
  let src = cg.getImageData(0, 0, c.width, c.height); c.width = c.height = 1;
  const g = geo(p), r = cropRect(p, g), [Wo, Ho] = oDims(p.s, src.width, src.height), D = Math.max(Wo, Ho);
  let ow = r.w * D, oh = r.h * D; const m = Math.min(1, OUT_MAX / Math.max(ow, oh)); ow = Math.max(1, Math.round(ow * m)); oh = Math.max(1, Math.round(oh * m));
  busy(true, 'กำลังดัด / ครอป… (' + ow + ' × ' + oh + ' px)'); await tick();
  const im = renderGeo(p, src, r, ow, oh); src = null;
  busy(true, 'กำลังใส่เอฟเฟกต์…'); await tick(); applyFx(im, p.s.fx);
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
// เหตุการณ์
// =====================================================================
document.addEventListener('click', async (e) => { const t = e.target;
  const px = t.closest('[data-phx]'); if (px) { e.stopPropagation(); const i = +px.dataset.phx, p = APP.photos[i];
    if (p.edited && !(await ask('ปิด “' + p.name + '”?', 'การแต่งรูปนี้ที่ยังไม่ได้บันทึกจะหายไป', null))) return;
    APP.photos.splice(i, 1); if (APP.cur >= APP.photos.length) APP.cur = APP.photos.length - 1; else if (APP.cur > i) APP.cur--; APP.guideMode = false; renderAll(); return; }
  const ph = t.closest('[data-ph]'); if (ph) { const i = +ph.dataset.ph; if (i !== APP.cur) { APP.cur = i; APP.guideMode = false; renderAll(); } return; }
  const pn = t.closest('[data-panel]'); if (pn) { APP.panel = pn.dataset.panel; APP.guideMode = false; renderAll(); return; }
  const a = t.closest('[data-act]'); if (!a) return; const k = a.dataset.act, p = cur();
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
  else if (k === 'fxReset') { pushHist(p); s.fx = DEF().fx; changed(false); renderSide(); }
  else if (k === 'fxAll') { if (!(await ask('ใช้ค่าเอฟเฟกต์นี้กับทุกรูป?', 'เฉพาะเอฟเฟกต์ (พื้นผิว · ความคมชัด · ลดหมอก · ขอบมืด · เกรน) — ครอป / หมุน / ดัดเส้นของแต่ละรูปไม่เปลี่ยน', null))) return;
    APP.photos.forEach(q => { if (q !== p) { pushHist(q); q.s.fx = { ...s.fx }; markEdited(q); } }); renderFilm(); toast('ใช้กับ ' + (APP.photos.length - 1) + ' รูปแล้ว'); }
  else if (k === 'resetAll') { if (!(await ask('รีเซ็ตรูปนี้ทั้งหมด?', 'ครอป · หมุน · ดัดเส้น · เอฟเฟกต์ กลับเป็นค่าเริ่มต้น (กด ↶ ย้อน ได้)', null))) return; pushHist(p); p.s = DEF(); APP.guideMode = false; changed(false); renderSide(); }
});
let sliding = null;
document.addEventListener('input', (e) => { const t = e.target, p = cur(); if (!p) return;
  const at = t.dataset.fx ? ['data-fx', 'fx'] : t.dataset.tf ? ['data-tf', 'tf'] : t.dataset.geo ? ['data-geo', 'geo'] : null; if (!at) return;
  const key = t.getAttribute(at[0]), v = +t.value; if (sliding !== t) { pushHist(p); sliding = t; }
  if (at[1] === 'fx') p.s.fx[key] = v; else if (at[1] === 'tf') p.s.tf[key] = v; else p.s[key] = v;
  const lab = $('v_' + at[0] + '_' + key); if (lab) lab.textContent = fmt(v, +t.step);
  changed(at[1] !== 'fx');
});
document.addEventListener('change', (e) => { const t = e.target, p = cur(); sliding = null;
  if (t.id === 'fOpen') { const F = [...t.files]; t.value = ''; if (F.length) addFiles(F); return; }
  if (!p) return; const s = p.s;
  if (t.id === 'selAsp') { pushHist(p); s.aspect = t.value; if (s.aspect === 'orig' && !needFit(s)) s.crop = null; else fitCrop(p, true); changed(false); renderSide(); }
  else if (t.id === 'selOv') { s.overlay = t.value; drawOverlay(); }
  else if (t.id === 'selUp') { pushHist(p); s.upright = t.value; APP.guideMode = t.value === 'guided' && !s.guides.length; changed(true); renderSide(); if (APP.guideMode) toast('ลากเส้นตามเสา / ขอบผนังที่ควรตั้งตรง', 3500); }
  else if (t.id === 'chkCon') { pushHist(p); s.constrain = t.checked; changed(true); }
});
document.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-rst]'); const p = cur(); if (!r || !p) return; const [attr, key] = r.dataset.rst.split(':');
  pushHist(p); const D0 = DEF(); if (attr === 'data-fx') p.s.fx[key] = D0.fx[key]; else if (attr === 'data-tf') p.s.tf[key] = D0.tf[key]; else p.s[key] = D0[key];
  changed(attr !== 'data-fx'); renderSide(); });
const bf = $('tbBefore'); const bOn = (e) => { if (e) e.preventDefault(); APP.before = true; bf.classList.add('on'); draw(); }, bOff = () => { if (!APP.before) return; APP.before = false; bf.classList.remove('on'); draw(); };
bf.addEventListener('pointerdown', bOn); bf.addEventListener('pointerup', bOff); bf.addEventListener('pointerleave', bOff); bf.addEventListener('pointercancel', bOff);
bf.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') bOn(e); }); bf.addEventListener('keyup', bOff);
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && $('dlg').hidden) { e.preventDefault(); undo(); }
  if (e.key === 'Escape' && APP.guideMode) { APP.guideMode = false; renderSide(); draw(); } });
(function dropBind() { const d = $('drop'); ['dragenter', 'dragover'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.remove('on'); })); d.addEventListener('drop', (e) => addFiles([...(e.dataTransfer.files || [])]));
  $('view').addEventListener('dragover', (e) => e.preventDefault()); $('view').addEventListener('drop', (e) => { e.preventDefault(); const F = [...(e.dataTransfer.files || [])]; if (F.length) addFiles(F); }); })();
let rzT = null; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (APP.photos.length) draw(); }, 120); });
window.addEventListener('beforeunload', (e) => { if (!EMBED && APP.photos.some(x => x.edited) && APP.dirty) { e.preventDefault(); e.returnValue = ''; } });
window.__PE = { APP, geo, cropRect, buildJpeg, autoAngle, guidedG, ver: PE_VER };   // ใช้ตรวจสอบในชุดทดสอบ
boot();
})();
