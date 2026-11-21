/* =====================================================================
   Wellcon Slab Layout · วางแผนตัดแผ่น (หิน / ไม้ / แผ่นวัสดุ) บนรูป — โหมดใน Photo Editor (photo.html)
   v1.0.0 (21/11/2026) นำเข้ารูป · ตั้งสเกล · ปรับสัดส่วน · ตาราง / ไกด์ / Snap · ชิ้นงาน ซม.
   v2.0.0 (21/11/2026) ผู้บริหารสั่ง (ภาพหน้าจอมือถือ ชิ้นงานวางซ้อนโดยไม่ตั้งใจ 8 ชิ้น):
     1 กันวางผิด — วางทีละชิ้นแล้วกลับโหมดเลือก (🔁 วางต่อเนื่องเปิดเอง) · แตะโดนชิ้นเดิม = เลือก ไม่สร้างใหม่
       · วางตอนยกนิ้ว · มี 2 นิ้ว = ซูม / เลื่อน ไม่วาง · ระยะเริ่มลากกันชิ้นขยับเอง
     2 ลากย้ายง่าย — พื้นที่แตะกว้างขึ้น (นิ้ว) · ล็อกชิ้นได้
     3 ตั้งขนาดชิ้นที่เลือก — แถบลอย กว้าง × ยาว (ซม.) · มุม (°) · ที่จับย่อ-ขยาย 8 จุด · ที่จับหมุน
     4 รูปทรง — สี่เหลี่ยม · จัตุรัส · วงกลม · วงรี · หลายเหลี่ยม (n ด้าน) · แตะ = ขนาดที่ตั้ง · ลาก = วาดขนาดเอง
     5 วาดอิสระ — ลากเส้นมือ / จุดต่อจุดแล้วปิดรูป
     6 ซูมแม่นยำ — แว่นขยาย 3× + เป้าเล็ง ขณะวางจุด / ลากที่จับ · จุดสเกล / 4 มุม ลากแก้ได้ · ปุ่มขยับละเอียด
       · แถบซูม % · แตะ 2 ครั้ง = ซูมจุดนั้น · ซูมไปชิ้นที่เลือก · เครื่องมือวัดระยะ
   - หน่วยโลก = ซม. · รูปวางที่ (0,0) ขนาด w·cmx × h·cmy (cmx / cmy = ซม. ต่อพิกเซล แยกแกน)
   - ทำงานในเบราว์เซอร์ทั้งหมด รูปไม่ถูกอัปโหลด · งานล่าสุดเก็บในเครื่อง (IndexedDB) · บันทึก / เปิดไฟล์งาน .json
   v2.1.0 (21/11/2026) ผู้บริหารสั่ง: "adjust opacity 0-100% individual or all of the object" — ◐ ที่แถบบน (ทุกชิ้น) · แถบล่างของชิ้นที่เลือก (รายชิ้น / หลายชิ้น)
   v2.2.0 (21/11/2026) ผู้บริหารสั่ง: 1 หมุนเส้นตัดได้ทุกองศาด้วยการลาก 2 ตั้งสเกลแล้วแสดงขนาดแผ่นบนรูป 3 ความทึบสลับ 10% / 0% · เส้นตัดเห็น 70% ตลอด
   v2.3.0 (21/11/2026) ผู้บริหารสั่ง: "pick the point and set the dimension vertical and horizontal · scale unproportionally · the set dimension at the point stays at all time"
   ===================================================================== */
(() => {
'use strict';
const VER = '3.2.0';   // 3.2.0: เปิด / ปิดขนาดรายชิ้น · รายเส้น · เส้นขนาดแผ่น ↔ / ↕ แยกกัน (เมนู ↔ ขนาด ▾) · 3.1.0: 💾 บันทึกงานในระบบ · 📂 งานที่บันทึก (ของฉัน / ทั้งทีม · เปิด · เปลี่ยนชื่อ · ลบ) · เตือนเมื่อยังไม่บันทึก · 3.0.0: เส้น CAD — เขียนเส้นตรง / โค้ง 3 จุด / วงกลม · Snap จุดปลาย / กึ่งกลาง / จุดตัด / ศูนย์กลาง · ตัด (Trim) · ยืด (Extend) · เส้นขนาน (Offset) · ลบ · แตกชิ้น (Explode) · ทำเป็นชิ้นงาน (Region) · 2.4.0: ลากเส้นขนาด / ป้ายออกจากจุดที่ตั้งได้อิสระ (จุด + สเกลคงเดิม) · แตะป้าย 2 ครั้ง = กลับที่เดิม · 2.3.1: เส้นประตามขอบผ่านจุดขนาด (เห็นกรอบแผ่นที่ตั้ง) · ลากจุดขนาดได้ในโหมดเลือก → คำนวณสเกลใหม่ · เส้นเล็งยาวขณะวางจุด · 2.3.0: 2.3.0: ตั้งขนาดแผ่นจากจุดบนแผ่นจริง แนวนอน / แนวตั้ง แยกกัน (สเกลแยกแกน) · เส้นขนาดติดอยู่ที่จุดตลอด · 2.2.0: 2.2.0: หมุนอิสระทุกองศา · เส้นบอกขนาดแผ่น · ปุ่มทึบ 10% ↔ 0% · เส้นตัด 70% คงที่ · 2.1.0: 2.1.0: ความทึบ 0–100% (พื้นชิ้น / เส้นตัด) รายชิ้น · ชิ้นที่เลือก · ทุกชิ้น
if (window.WCSlab) return;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => { const x = r1(v); return Number.isInteger(x) ? String(x) : x.toFixed(1); };
const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const COLORS = [['#E5484D', 'แดง'], ['#C9A961', 'ทอง'], ['#2F80ED', 'ฟ้า'], ['#2E9E5B', 'เขียว'], ['#FFFFFF', 'ขาว']];
const PRESETS = [[45, 120], [60, 120], [60, 60], [30, 60], [80, 160], [120, 240], [90, 180], [20, 120]];
const STEPS = [1, 5, 10, 20, 30, 45, 50, 60, 100];
const SHAPES = [['rect', '▭', 'สี่เหลี่ยม'], ['sq', '◻', 'จัตุรัส'], ['circle', '◯', 'วงกลม'], ['ellipse', '⬭', 'วงรี'], ['poly', '⬡', 'หลายเหลี่ยม']];
const TNAME = { rect: 'สี่เหลี่ยม', sq: 'จัตุรัส', circle: 'วงกลม', ellipse: 'วงรี', poly: 'หลายเหลี่ยม', free: 'อิสระ' };
const D2R = Math.PI / 180;
// ---------- สถานะ ----------
const S = {
  open: false, img: null, name: '', cmx: 0.1, cmy: 0.1, scaled: false, lockRatio: true,
  shapes: [], guides: [], sel: [], tool: 'move', next: 1, lines: [], lsel: [], cad: 'line', ced: 'trim', cpts: [], chain: [], ortho: false, offD: 2, offSrc: null, lastLoop: null, cin: { len: '', ang: '', rad: '' }, osHit: null, hoverP: null, hoverL: null,
  shape: 'rect', sides: 6, repeat: false, freeMode: 'drag', nudge: 0.5,
  grid: { on: true, step: 10 }, guidesOn: true, ldims: true, dimH: { x: false, y: false }, snap: { on: true, grid: true, guide: true, edge: true, obj: true }, dims: true,
  opDef: 10, lineDef: 70, joint: 3, defW: 45, defH: 120, color: '#E5484D', pat: { c: 3, r: 2, fill: false, cut: true },
  view: { z: 1, ox: 0, oy: 0 }, fitZ: 1,
  dimx: null, dimy: null, cal: [], calLen: '', calAxis: 'x', persp: [], pw: '', ph: '', drawPts: [], meas: null, act: null,
  hover: null, snapHit: null, work: null, dirty: false, imgDirty: false, wk: null, hist: [], redo: [], prevImg: null, cursor: null, panel: true, loupe: null,
};
let root, cv, ctx, lcv, lctx, W = 0, H = 0, DPR = 1, raf = 0;
const touchy = () => matchMedia('(pointer:coarse)').matches;
// ---------- เก็บงานล่าสุดในเครื่อง (IndexedDB) ----------
const DB = { db: null,
  async open() { if (this.db) return this.db; return new Promise((ok) => { try { const q = indexedDB.open('wcslab', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => { this.db = q.result; ok(this.db); }; q.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async get(k) { const d = await this.open(); if (!d) return null; return new Promise((ok) => { try { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async put(k, v) { const d = await this.open(); if (!d) return; await new Promise((ok) => { try { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => ok(); } catch (e) { ok(); } }); },
  async del(k) { const d = await this.open(); if (!d) return; await new Promise((ok) => { try { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => ok(); t.onerror = () => ok(); } catch (e) { ok(); } }); },
  async list(pre) { const d = await this.open(); if (!d) return []; return new Promise((ok) => { const out = []; try { const q = d.transaction('kv').objectStore('kv').openCursor(); q.onsuccess = () => { const c = q.result; if (!c) { ok(out); return; } if (String(c.key).startsWith(pre)) { const { blob, st, ...m } = c.value || {}; out.push(m); } c.continue(); }; q.onerror = () => ok(out); } catch (e) { ok(out); } }); } };
let saveT = 0;
function autosave() { clearTimeout(saveT); saveT = setTimeout(async () => { if (!S.img) return; try { const blob = await new Promise((ok) => S.img.toBlob(ok, 'image/jpeg', 0.9)); await DB.put('last', { at: new Date().toISOString(), name: S.name, blob, st: snapData(), work: S.work, dirty: S.dirty, imgDirty: S.imgDirty }); } catch (e) {} }, 800); }
function snapData() { return { cmx: S.cmx, cmy: S.cmy, scaled: S.scaled, lockRatio: S.lockRatio, shapes: S.shapes, guides: S.guides, grid: S.grid, snap: S.snap, guidesOn: S.guidesOn, joint: S.joint, defW: S.defW, defH: S.defH, next: S.next, color: S.color, shape: S.shape, sides: S.sides, dims: S.dims, opDef: S.opDef, lineDef: S.lineDef, dimx: S.dimx, dimy: S.dimy, lines: S.lines, ldims: S.ldims, dimH: S.dimH }; }
function applyData(d) { ['cmx', 'cmy', 'scaled', 'lockRatio', 'joint', 'defW', 'defH', 'next', 'color', 'guidesOn', 'shape', 'sides', 'dims', 'opDef', 'lineDef', 'dimx', 'dimy', 'ldims'].forEach((k) => { if (d[k] !== undefined) S[k] = d[k]; }); S.dimH = { x: false, y: false, ...(d.dimH || {}) };
  S.shapes = (d.shapes || d.pieces || []).map((p) => ({ t: 'rect', rot: 0, ...p })); S.guides = (d.guides || []).map((g) => ({ ...g })); S.lines = (d.lines || []).map((e) => JSON.parse(JSON.stringify(e))); if (d.grid) S.grid = { ...S.grid, ...d.grid }; if (d.snap) S.snap = { ...S.snap, ...d.snap }; }
// ---------- ย้อนกลับ / ทำซ้ำ ----------
function push() { S.dirty = true; markDirty(); S.hist.push(JSON.stringify(snapData())); if (S.hist.length > 80) S.hist.shift(); S.redo = []; }
function restorePrev() { const p = S.prevImg; if (!p) return; S.prevImg = null; S.img = p.img; S.imgDirty = true; S.dirty = true; applyData(JSON.parse(p.st)); S.hist = p.hist; S.sel = []; fit(); ui(); autosave(); toast('คืนรูปก่อนดัดแล้ว'); }
function undo() { if (S.prevImg && S.histImgAt === S.hist.length) { restorePrev(); return; }
  const h = S.hist.pop(); if (!h) { toast('ไม่มีอะไรให้ย้อน'); return; } S.redo.push(JSON.stringify(snapData())); applyData(JSON.parse(h)); S.sel = S.sel.filter((id) => S.shapes.some((s) => s.id === id)); S.lsel = S.lsel.filter((id) => S.lines.some((e) => e.id === id)); S.chain = []; S.cpts = []; ui(); autosave(); }
function redo() { const h = S.redo.pop(); if (!h) return; S.hist.push(JSON.stringify(snapData())); applyData(JSON.parse(h)); S.lsel = []; ui(); autosave(); }
// ---------- พิกัด ----------
const IW = () => (S.img ? S.img.width * S.cmx : 0), IH = () => (S.img ? S.img.height * S.cmy : 0);
const toS = (x, y) => [S.view.ox + x * S.view.z, S.view.oy + y * S.view.z];
const toW = (sx, sy) => [(sx - S.view.ox) / S.view.z, (sy - S.view.oy) / S.view.z];
const ZMAX = () => Math.max(4, 40 / Math.min(S.cmx, S.cmy));
function fit() { if (!S.img || !W) return; const pad = 30, z = Math.min((W - pad * 2) / IW(), (H - pad * 2) / IH()); S.view.z = S.fitZ = z > 0 ? z : 1; S.view.ox = (W - IW() * S.view.z) / 2; S.view.oy = (H - IH() * S.view.z) / 2; draw(); zoomUi(); }
function zoomAt(sx, sy, nz) { nz = Math.max(S.fitZ * 0.2, Math.min(ZMAX(), nz)); S.view.ox = sx - (sx - S.view.ox) * (nz / S.view.z); S.view.oy = sy - (sy - S.view.oy) * (nz / S.view.z); S.view.z = nz; draw(); zoomUi(); stat(); }
function zoomTo(x, y, w, h) { const pad = 60, z = Math.min((W - pad * 2) / Math.max(w, 1), (H - pad * 2) / Math.max(h, 1), ZMAX()); S.view.z = z; S.view.ox = W / 2 - (x + w / 2) * z; S.view.oy = H / 2 - (y + h / 2) * z; draw(); zoomUi(); }
// ---------- เรขาคณิตของรูปทรง ----------
const rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
const ctr = (s) => [s.x + s.w / 2, s.y + s.h / 2];
const loc = (s, wx, wy) => { const [cx, cy] = ctr(s); return rot(wx - cx, wy - cy, -(s.rot || 0) * D2R); };
const wld = (s, lx, ly) => { const [cx, cy] = ctr(s), [a, b] = rot(lx, ly, (s.rot || 0) * D2R); return [cx + a, cy + b]; };
function lverts(s) { const w = s.w / 2, h = s.h / 2;
  if (s.t === 'rect' || s.t === 'sq') return [[-w, -h], [w, -h], [w, h], [-w, h]];
  if (s.t === 'poly') { const n = Math.max(3, s.sides || 6), out = []; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n + (n % 2 ? 0 : Math.PI / n); out.push([Math.cos(a) * w, Math.sin(a) * h]); } return out; }
  if (s.t === 'free') return (s.pts || []).map(([u, v]) => [u * s.w, v * s.h]);
  const out = []; for (let i = 0; i < 48; i++) { const a = i / 48 * 2 * Math.PI; out.push([Math.cos(a) * w, Math.sin(a) * h]); } return out; }
const wverts = (s) => lverts(s).map(([a, b]) => wld(s, a, b));
function bbox(s) { if (!((s.rot || 0) % 360)) return [s.x, s.y, s.w, s.h]; const V = wverts(s), xs = V.map((v) => v[0]), ys = V.map((v) => v[1]); const x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; }
function area(s) { if (s.t === 'rect' || s.t === 'sq') return s.w * s.h; if (s.t === 'circle' || s.t === 'ellipse') return Math.PI * s.w * s.h / 4; const V = lverts(s); let a = 0; for (let i = 0; i < V.length; i++) { const p = V[i], q = V[(i + 1) % V.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; }
function segD(x, y, p, q) { const dx = q[0] - p[0], dy = q[1] - p[1], L = dx * dx + dy * dy; let t = L ? ((x - p[0]) * dx + (y - p[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (p[0] + t * dx), y - (p[1] + t * dy)); }
function hitShape(s, wx, wy, tol) { const [lx, ly] = loc(s, wx, wy);
  if (s.t === 'rect' || s.t === 'sq') return Math.abs(lx) <= s.w / 2 + tol && Math.abs(ly) <= s.h / 2 + tol;
  if (s.t === 'circle' || s.t === 'ellipse') { const a = s.w / 2 + tol, b = s.h / 2 + tol; return (lx * lx) / (a * a) + (ly * ly) / (b * b) <= 1; }
  const V = lverts(s); if (inPoly(V, lx, ly)) return true; for (let i = 0; i < V.length; i++) { const p = V[i], q = V[(i + 1) % V.length]; if (segD(lx, ly, p, q) <= tol) return true; } return false; }
const tolPx = () => (touchy() ? 14 : 6);
function hitAny(wx, wy) { const tol = tolPx() / S.view.z; for (let i = S.shapes.length - 1; i >= 0; i--) if (hitShape(S.shapes[i], wx, wy, 0)) return S.shapes[i]; for (let i = S.shapes.length - 1; i >= 0; i--) if (hitShape(S.shapes[i], wx, wy, tol)) return S.shapes[i]; return null; }
function hitGuide(sx, sy) { if (!S.guidesOn) return -1; const t = tolPx() + 2; for (let i = S.guides.length - 1; i >= 0; i--) { const g = S.guides[i]; const [gx, gy] = toS(g.p, g.p); if ((g.o === 'v' && Math.abs(sx - gx) < t) || (g.o === 'h' && Math.abs(sy - gy) < t)) return i; } return -1; }
const selected = () => S.shapes.filter((p) => S.sel.indexOf(p.id) >= 0);
const one = () => { const L = selected(); return L.length === 1 ? L[0] : null; };
function handles(s) { const z = S.view.z, w = s.w / 2, h = s.h / 2, out = [];
  [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(([a, b]) => { if ((s.t === 'sq' || s.t === 'circle') && (a === 0 || b === 0)) return; out.push({ k: 'r', a, b, p: wld(s, a * w, b * h) }); });
  out.push({ k: 'rot', p: wld(s, 0, -h - 34 / z) }); return out; }
function hitHandle(sx, sy) { const s = one(); if (!s || s.lock) return null; const [wx, wy] = toW(sx, sy), inside = hitShape(s, wx, wy, 0);
  const r = inside ? (touchy() ? 11 : 6) : (touchy() ? 18 : 9);   // นิ้วอยู่ในตัวชิ้น = ให้สิทธิ์ “ย้าย” ก่อน · ที่จับต้องแตะตรง ๆ
  let best = null, bd = r; for (const hd of handles(s)) { const [hx, hy] = toS(hd.p[0], hd.p[1]), d = Math.hypot(sx - hx, sy - hy); if (d <= bd) { bd = d; best = { s, hd }; } } return best; }
// ---------- Snap ----------
function snapAxis(edges, axis, skip) { const sn = S.snap; if (!sn.on || S.noSnap) return { d: 0, t: null }; const thr = (touchy() ? 14 : 9) / S.view.z, T = [];
  if (sn.grid && S.grid.on) edges.forEach((e) => { const g = S.grid.step; T.push(Math.round(e / g) * g); });
  if (sn.guide && S.guidesOn) S.guides.forEach((g) => { if (g.o === (axis === 'x' ? 'v' : 'h')) T.push(g.p); });
  if (sn.edge) { T.push(0, axis === 'x' ? IW() : IH()); const j = S.joint / 10; S.shapes.forEach((p) => { if (skip && skip.indexOf(p.id) >= 0) return; const b = bbox(p), a = axis === 'x' ? b[0] : b[1], l = axis === 'x' ? b[2] : b[3]; T.push(a, a + l, a - j, a + l + j); }); }
  let best = { d: 0, t: null, m: thr }; edges.forEach((e) => T.forEach((t) => { const d = t - e; if (Math.abs(d) < best.m) best = { d, t, m: Math.abs(d) }; })); return best; }
function snapPt(x, y) { const sx = snapAxis([x], 'x'), sy = snapAxis([y], 'y'); S.snapHit = { x: sx.t, y: sy.t }; return [x + sx.d, y + sy.d]; }
// ---------- UI ----------
const CSS = `
#slab{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#1E1C18;color:#22231C;font-family:'IBM Plex Sans Thai',system-ui,sans-serif;font-size:14px}
#slab .sl-hd{flex:none;display:flex;align-items:center;gap:8px;background:#1C1B18;color:#F6F1E8;padding:8px 10px;padding-top:calc(8px + env(safe-area-inset-top,0px));border-bottom:1px solid #33302A}
#slab .sl-hd .tt{flex:1;min-width:0}#slab .sl-hd .tt b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slab .sl-hd .tt span{display:block;font-size:12px;color:#BDB4A2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slab .sl-ib{flex:none;height:38px;min-width:38px;border-radius:11px;border:1px solid #4A463D;background:#2A2721;color:#F6F1E8;padding:0 10px;font:600 13px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
#slab .sl-ib.dirty{position:relative;border-color:#C9A961}#slab .sl-ib.dirty::after{content:'';position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#FF7A45;box-shadow:0 0 0 2px #2A2721}
#slab .sl-wk .bx{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;gap:6px}#slab .wk-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#slab .wk-hd h3{margin:0}#slab .wk-hd .sl-b{margin-left:auto}
#slab .wk-tab{display:inline-flex;border:1px solid #DDD3C2;border-radius:10px;overflow:hidden}#slab .wk-tab button{border:0;background:#fff;padding:0 14px;height:36px;font:600 13px inherit;font-family:inherit;cursor:pointer}#slab .wk-tab button.on{background:#1C1B18;color:#F6F1E8}
#slab .wk-list{overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:2px;min-height:120px}#slab .wk-c{border:1px solid #E5DCCB;border-radius:12px;background:#fff;display:flex;flex-direction:column;overflow:hidden}#slab .wk-c.cur{border-color:#C9A961;box-shadow:0 0 0 2px rgba(201,169,97,.35)}
#slab .wk-c img,#slab .wk-c .ph{width:100%;height:120px;object-fit:cover;background:#2A2721;display:grid;place-items:center;color:#C9A961;font-size:30px}#slab .wk-c .tx{padding:8px 10px 4px;display:flex;flex-direction:column;gap:2px;font-size:12px;color:#6B6455}#slab .wk-c .tx b{font-size:14px;color:#1C1B18;word-break:break-word}#slab .wk-c .ac{display:flex;gap:6px;padding:6px 10px 10px}#slab .wk-c .ac .dk{flex:1}
@media (max-width:480px){#slab .sl-redo{display:none}}
#slab .sl-ib:hover{background:#36322B}#slab .sl-ib.gold{background:#C9A961;color:#1C1B18;border-color:#C9A961}#slab .sl-ib:disabled{opacity:.4;cursor:default}
#slab .sl-steps{flex:none;display:flex;gap:6px;overflow-x:auto;padding:7px 10px;background:#26241F;border-bottom:1px solid #33302A}
#slab .sl-st{flex:none;display:flex;align-items:center;gap:6px;border:1px solid #4A463D;border-radius:999px;padding:4px 10px 4px 5px;color:#D9CFBD;font-size:12px;background:transparent;font-family:inherit;cursor:pointer}
#slab .sl-st i{font-style:normal;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#3A3832;font-size:11px;font-weight:800}
#slab .sl-st.ok{color:#BFE3C9;border-color:#2E6B43}#slab .sl-st.ok i{background:#2E9E5B;color:#fff}
#slab .sl-body{flex:1;min-height:0;display:flex}
#slab .sl-tools{flex:none;width:66px;display:flex;flex-direction:column;gap:4px;padding:6px 5px;background:#26241F;border-right:1px solid #33302A;overflow-y:auto}
#slab .sl-tool{flex:none;border:1px solid transparent;border-radius:12px;background:transparent;color:#D9CFBD;padding:6px 2px;font:600 10.5px/1.2 inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
#slab .sl-tool b{font-size:19px;line-height:1.1}#slab .sl-tool:hover{background:#33302A}#slab .sl-tool.on{background:#C9A961;color:#1C1B18}#slab .sl-tool:disabled{opacity:.35}
#slab .sl-tool.sep{border-top:1px solid #3A3832;border-radius:0;margin-top:3px;padding-top:9px}
#slab .sl-mid{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
#slab .sl-bar{flex:none;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 8px;background:#2A2721;border-bottom:1px solid #33302A;color:#D9CFBD;font-size:12.5px;position:relative}
#slab .sl-tg{height:32px;border-radius:9px;border:1px solid #4A463D;background:#1E1C18;color:#D9CFBD;padding:0 9px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
#slab .sl-tg.on{background:#0E7490;border-color:#0E7490;color:#fff}
#slab .sl-bar select{height:32px;border-radius:9px;border:1px solid #4A463D;background:#1E1C18;color:#F6F1E8;padding:0 4px;font:13px inherit;font-family:inherit}
#slab .sl-zoom{display:inline-flex;align-items:center;gap:4px;margin-left:auto}#slab .sl-zoom input[type=range]{width:120px;accent-color:#C9A961}#slab .sl-zoom b{min-width:50px;text-align:right;color:#F6F1E8;font-size:12.5px}
#slab .sl-menu{position:absolute;top:42px;z-index:7;background:#FFFDF8;color:#22231C;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.35);padding:8px;min-width:240px}
#slab .sl-menu label{display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:8px;cursor:pointer;font-size:13.5px}#slab .sl-menu label:hover{background:#F3EDE2}
#slab .sl-menu input{width:19px;height:19px;accent-color:#0E7490}
#slab .sl-opi{display:inline-block;flex:none;width:14px;height:14px;border-radius:50%;border:1.5px solid currentColor;background:linear-gradient(90deg,currentColor 50%,transparent 50%);vertical-align:-2px}
#slab .sl-opr{display:flex;align-items:center;gap:8px;padding:6px 8px;font-size:13px}#slab .sl-opr span{width:76px;color:#4A4840}#slab .sl-opr input{flex:1;width:auto;height:24px;accent-color:#C9A961}#slab .sl-opr b{width:40px;text-align:right}
#slab .sl-fb input[type=range]{width:96px;height:26px;padding:0;border:0;background:transparent;accent-color:#C9A961}#slab .sl-fb .opv{min-width:34px;font-size:12px;color:#F6F1E8}
#slab .sl-cw{flex:1;min-height:0;position:relative;background:#1E1C18;touch-action:none;overflow:hidden;user-select:none;-webkit-user-select:none}
#slab .sl-cw canvas.main{position:absolute;inset:0;width:100%;height:100%;display:block}
#slab .sl-loupe{position:absolute;width:150px;height:150px;border-radius:50%;border:3px solid #C9A961;box-shadow:0 8px 24px rgba(0,0,0,.55);pointer-events:none;z-index:4;background:#111}
#slab .sl-fb{position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:rgba(28,27,24,.94);border:1px solid #4A463D;border-radius:14px;padding:7px 9px;color:#F6F1E8;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
#slab .sl-fb:empty{display:none}
#slab .sl-fb .lb{color:#BDB4A2;font-size:12px}#slab .sl-fb .bx{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
#slab .sl-fb input{height:36px;width:74px;border-radius:9px;border:1px solid #4A463D;background:#2A2721;color:#fff;padding:0 7px;font:600 14px inherit;font-family:inherit}
#slab .sl-fb input.sm{width:60px}#slab .sl-fb input:disabled{opacity:.45}
#slab .sl-fb button{height:36px;min-width:36px;border-radius:9px;border:1px solid #4A463D;background:#2A2721;color:#F6F1E8;padding:0 9px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}
#slab .sl-fb button.on{background:#C9A961;color:#1C1B18;border-color:#C9A961}#slab .sl-fb button.go{background:#0E7490;border-color:#0E7490;color:#fff}#slab .sl-fb button.dg{color:#FFB4A8}#slab .sl-fb button:disabled{opacity:.4}
#slab .sl-fb .pad{display:inline-grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(2,30px);gap:2px}#slab .sl-fb .pad button{height:30px;min-width:34px;padding:0}
#slab .sl-fb .sp{flex:1}
#slab .sl-stat{flex:none;display:flex;gap:12px;flex-wrap:wrap;padding:5px 10px;background:#26241F;color:#BDB4A2;font-size:12px;border-top:1px solid #33302A}
#slab .sl-stat b{color:#F6F1E8;font-weight:600}
#slab .sl-pan{flex:none;width:320px;background:#F4EFE6;overflow-y:auto;border-left:1px solid #33302A;padding:10px 12px 30px}
#slab .sl-sec{background:#FFFDF8;border:1px solid #E3DACB;border-radius:14px;padding:11px 12px;margin-bottom:10px}
#slab .sl-sec h4{margin:0 0 8px;font-size:13.5px;display:flex;align-items:center;gap:7px}#slab .sl-sec h4 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:#1C1B18;color:#E2BC66;display:grid;place-items:center;font-size:11.5px}
#slab .sl-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}
#slab .sl-row label{font-size:12.5px;color:#4A4840}
#slab .sl-in{width:76px;height:34px;border:1px solid #D9CFBD;border-radius:9px;padding:0 8px;font:14px inherit;font-family:inherit;background:#fff}
#slab .sl-b{height:34px;border-radius:9px;border:1px solid #D9CFBD;background:#fff;padding:0 10px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;color:#22231C}
#slab .sl-b:hover{background:#F3EDE2}#slab .sl-b.dk{background:#1C1B18;color:#E2BC66;border-color:#1C1B18}#slab .sl-b.tl{background:#0E7490;color:#fff;border-color:#0E7490}#slab .sl-b:disabled{opacity:.45;cursor:default}
#slab .sl-chip{height:30px;border-radius:999px;border:1px solid #D9CFBD;background:#fff;padding:0 10px;font:600 12px inherit;font-family:inherit;cursor:pointer}
#slab .sl-chip.on{background:#1C1B18;color:#E2BC66;border-color:#1C1B18}
#slab .sl-mut{font-size:12px;color:#6B6758;line-height:1.5}
#slab .sl-warn{font-size:12.5px;color:#8A3A1E;background:#FBEDE6;border-radius:9px;padding:7px 9px;margin-top:6px}
#slab .sl-ok{font-size:12.5px;color:#245C38;background:#E7F1EB;border-radius:9px;padding:7px 9px;margin-top:6px}
#slab .sl-sw{width:28px;height:28px;border-radius:50%;border:2px solid #D9CFBD;cursor:pointer;display:inline-block}#slab .sl-sw.on{border-color:#1C1B18;box-shadow:0 0 0 2px #C9A961}
#slab table{width:100%;border-collapse:collapse;font-size:12.5px}#slab td,#slab th{padding:5px 4px;border-bottom:1px solid #EEE6D8;text-align:left}#slab th{font-size:11px;color:#8A6D3B}
#slab .sl-start{position:absolute;inset:0;display:grid;place-items:center;padding:20px;overflow:auto;z-index:6;background:#1E1C18}
#slab .sl-drop{max-width:560px;width:100%;background:#FFFDF8;border:2px dashed #C9A961;border-radius:20px;padding:24px 20px;text-align:center}
#slab .sl-drop h2{margin:6px 0 6px;font-size:21px}#slab .sl-drop p{color:#4A4840;margin:6px 0 14px;line-height:1.6}
#slab .sl-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:16px;text-align:left}
#slab .sl-flow div{background:#F4EFE6;border-radius:12px;padding:9px 11px;font-size:12.5px;color:#4A4840}#slab .sl-flow b{display:block;color:#22231C;font-size:13px}
#slab .sl-dlg{position:absolute;inset:0;z-index:9;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:16px}
#slab .sl-dlg .bx{background:#FFFDF8;border-radius:16px;padding:16px 18px;width:min(420px,100%);box-shadow:0 20px 60px rgba(0,0,0,.4)}
#slab .sl-dlg h3{margin:0 0 8px;font-size:17px}
#slab .sl-toast{position:absolute;left:50%;top:60px;transform:translateX(-50%);background:#1C1B18;color:#fff;border:1px solid #C9A961;border-radius:12px;padding:9px 16px;font-size:13.5px;z-index:10;pointer-events:none;max-width:90%;text-align:center}
#slab .sl-toast.in{top:10px;font-size:13px;padding:7px 13px}
#slab .sl-busy{position:absolute;inset:0;z-index:11;background:rgba(0,0,0,.45);display:grid;place-items:center;color:#fff;font-size:15px}
#slab .sl-pt{display:none}
@media(max-width:760px){#slab .sl-steps{display:none}#slab .sl-body{flex-direction:column}#slab .sl-tools{width:auto;flex-direction:row;border-right:0;border-bottom:1px solid #33302A;overflow-x:auto;padding:4px}
  #slab .sl-tool{min-width:56px;padding:4px 2px;font-size:10px}#slab .sl-tool b{font-size:17px}#slab .sl-tool.sep{border-top:0;border-left:1px solid #3A3832;margin:0 0 0 3px;padding-top:4px}
  #slab .sl-pan{position:absolute;left:0;right:0;bottom:0;width:auto;max-height:62%;z-index:8;border-left:0;border-top:2px solid #C9A961;border-radius:16px 16px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.3)}
  #slab .sl-pan.off{display:none}#slab .sl-pt{display:inline-flex}#slab .sl-hd .tx{display:none}#slab .sl-zoom input[type=range]{width:84px}#slab .sl-bar .wide,#slab .sl-fb .wd{display:none}}`;
function css() { if ($('#slab-css')) return; const s = document.createElement('style'); s.id = 'slab-css'; s.textContent = CSS; document.head.appendChild(s); }
function stepState() { return [!!S.img, S.scaled, S.scaled, S.grid.on || S.guides.length > 0, S.shapes.length > 0]; }
function build() {
  css(); root = document.createElement('div'); root.id = 'slab'; root.setAttribute('translate', 'no');
  root.innerHTML = `<div class="sl-hd"><button class="sl-ib" data-sl="close" aria-label="กลับ Photo Editor" title="กลับ Photo Editor">←</button>
      <div class="tt"><b>Slab Layout · วางแผนตัดแผ่น</b><span id="slSub"></span></div>
      <button class="sl-ib" data-sl="undo" title="ย้อนกลับ (Ctrl+Z)">↶<span class="tx"> ย้อน</span></button>
      <button class="sl-ib sl-redo" data-sl="redo" title="ทำซ้ำ (Ctrl+Y)">↷</button>
      <button class="sl-ib" data-sl="csave" data-g="sl-save" title="บันทึกงานในระบบ (Ctrl+S) — เปิดแก้ต่อได้ที่ 📂 งานที่บันทึก">💾<span class="tx"> บันทึก</span></button>
      <button class="sl-ib sl-pt" data-sl="panel" title="ตั้งค่า / รายการตัด">⚙</button>
      <button class="sl-ib" data-sl="csv" data-g="sl-export" title="รายการตัด (Excel / CSV)">📋<span class="tx"> รายการตัด</span></button>
      <button class="sl-ib gold" data-sl="png" title="บันทึกภาพแผนตัด (PNG)">⬇<span class="tx"> บันทึกภาพ</span></button></div>
    <div class="sl-steps" id="slSteps"></div>
    <div class="sl-body"><div class="sl-tools" id="slTools"></div>
      <div class="sl-mid"><div class="sl-bar" id="slBar"></div><div class="sl-cw" id="slCw" data-g="sl-canvas"><canvas class="main"></canvas><canvas class="sl-loupe" hidden></canvas><div class="sl-fb" id="slFb"></div><div class="sl-start" id="slStart"></div></div><div class="sl-stat" id="slStat"></div></div>
      <div class="sl-pan" id="slPan"></div></div>
    <input type="file" id="slFile" accept="image/*,.psd,.psb,.tif,.tiff" hidden><input type="file" id="slJson" accept=".json,application/json" hidden>`;
  document.body.appendChild(root);
  cv = root.querySelector('canvas.main'); ctx = cv.getContext('2d'); lcv = root.querySelector('.sl-loupe'); lctx = lcv.getContext('2d');
  root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  $('#slFile', root).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) loadFile(f); });
  $('#slJson', root).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) loadJson(f); });
  const cw = $('#slCw', root);
  cv.addEventListener('pointerdown', pDown); cv.addEventListener('pointermove', pMove); cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pCancel); cv.addEventListener('pointerleave', () => { if (!drag) { S.cursor = null; S.hover = null; S.hoverP = null; S.hoverL = null; S.osHit = null; stat(); draw(); } });
  cv.addEventListener('wheel', onWheel, { passive: false }); cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cw.addEventListener('dragover', (e) => { e.preventDefault(); }); cw.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { if (/\.json$/i.test(f.name)) loadJson(f); else loadFile(f); } });
  new ResizeObserver(resize).observe(cw);
}
function resize() { const cw = $('#slCw', root); if (!cw) return; DPR = window.devicePixelRatio || 1; const r = cw.getBoundingClientRect(); const first = !W; W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); lcv.width = lcv.height = Math.round(150 * DPR); if (first && S.img) fit(); else draw(); }
function ui() { steps(); tools(); bar(); panel(); stat(); startPane(); sub(); fbar(); draw(); }
function sub() { markDirty(); const t = $('#slSub', root); if (!t) return; t.textContent = S.img ? (S.name + ' · ' + (S.dimx || S.dimy ? 'แผ่น ↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') + ' ซม.' : S.scaled ? 'แผ่นจริง ' + fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.' : 'ยังไม่ตั้งสเกล')) : 'นำเข้ารูปแผ่นหิน / ไม้ แล้ววางชิ้นงานตามขนาดจริง'; }
function steps() { const st = stepState(); const L = ['นำเข้ารูป', 'ตั้งสเกล', 'ปรับสัดส่วน', 'ตาราง · ไกด์ · Snap', 'วางชิ้นงาน'];
  $('#slSteps', root).innerHTML = L.map((t, i) => `<button class="sl-st${st[i] ? ' ok' : ''}" data-step="${i}"><i>${st[i] ? '✓' : i + 1}</i>${t}</button>`).join(''); }
const TOOLS = [['move', '✋', 'เลือก / ย้าย'], ['scale', '📏', 'ตั้งสเกล'], ['persp', '⬚', 'ดัด 4 มุม'], ['shape', '▭', 'รูปทรง', 1], ['free', '✏', 'วาดอิสระ'], ['cad', '⟋', 'เขียนเส้น'], ['cedit', '✂', 'แก้เส้น'], ['meas', '📐', 'วัดระยะ'], ['gv', '┆', 'ไกด์ตั้ง', 1], ['gh', '┅', 'ไกด์นอน']];
function tools() { $('#slTools', root).innerHTML = TOOLS.map(([k, ic, t, sep]) => `<button class="sl-tool${S.tool === k ? ' on' : ''}${sep ? ' sep' : ''}" data-tool="${k}" data-g="sl-tool-${k}" title="${t}"${!S.img && k !== 'move' ? ' disabled' : ''}><b>${ic}</b>${t}</button>`).join(''); }
function zoomPct() { return Math.round(S.view.z / (S.fitZ || 1) * 100); }
function zoomUi() { const r = $('[data-in="zoom"]', root), b = $('#slZp', root); if (r) r.value = String(Math.log2(S.view.z / (S.fitZ || 1))); if (b) b.textContent = zoomPct() + '%'; }
function bar() { const g = S.grid, sn = S.snap;
  $('#slBar', root).innerHTML = `<button class="sl-tg${g.on ? ' on' : ''}" data-sl="grid" data-g="sl-grid" title="แสดง / ซ่อนตาราง">▦ ตาราง</button>
    <select data-in="gstep" title="ระยะตาราง (ซม.)">${STEPS.map((v) => `<option value="${v}"${v === g.step ? ' selected' : ''}>${v} ซม.</option>`).join('')}${STEPS.indexOf(g.step) < 0 ? `<option value="${g.step}" selected>${g.step} ซม.</option>` : ''}<option value="x">กำหนดเอง…</option></select>
    <button class="sl-tg${S.guidesOn ? ' on' : ''}" data-sl="guides" title="แสดง / ซ่อนเส้นไกด์">┆ ไกด์ ${S.guides.length || ''}</button>
    <button class="sl-tg${sn.on ? ' on' : ''}" data-sl="snapmenu" data-g="sl-snap" title="ตั้งค่า Snap">🧲 Snap ${sn.on ? 'เปิด' : 'ปิด'} ▾</button>
    <button class="sl-tg${S.opDef > 0 ? ' on' : ''}" data-sl="optoggle" data-g="sl-op" title="สลับความทึบพื้นชิ้นงานทุกชิ้น 10% ↔ 0% (เส้นตัดเห็น 70% ตลอด)"><i class="sl-opi"></i> ทึบ ${S.opDef > 0 ? S.opDef + '%' : '0%'}</button>
    <button class="sl-tg${S.dims || S.ldims || !S.dimH.x || !S.dimH.y ? ' on' : ''}" data-sl="dimmenu" data-g="sl-dims" title="เปิด / ปิดการแสดงขนาด">↔ ขนาด ▾</button>
    <span class="sl-zoom" data-g="sl-zoom"><button class="sl-tg" data-sl="zout" title="ซูมออก">－</button><input type="range" data-in="zoom" min="-2" max="6" step="0.05" value="${Math.log2(S.view.z / (S.fitZ || 1))}" aria-label="ซูม"><button class="sl-tg" data-sl="zin" title="ซูมเข้า">＋</button><b id="slZp">${zoomPct()}%</b><button class="sl-tg" data-sl="fit" title="พอดีจอ">⤢</button></span>
    ${S.dimMenu ? (() => { const nh = S.shapes.filter((x) => x.nd).length + S.lines.filter((x) => x.nd).length; return `<div class="sl-menu" style="left:${Math.min(S.dimMenuX || 200, Math.max(8, W - 290))}px"><b style="padding:4px 8px;display:block">แสดงขนาด</b>
      <label><input type="checkbox" data-dm="pcs"${S.dims ? ' checked' : ''}> ขนาดบนชิ้นงาน (กว้าง × ยาว)</label><label><input type="checkbox" data-dm="lns"${S.ldims ? ' checked' : ''}> ความยาว / รัศมีของเส้น</label>
      <label><input type="checkbox" data-dm="x"${!S.dimH.x ? ' checked' : ''}> เส้นขนาดแผ่น ↔ กว้าง</label><label><input type="checkbox" data-dm="y"${!S.dimH.y ? ' checked' : ''}> เส้นขนาดแผ่น ↕ สูง</label>
      <div class="sl-mut" style="padding:4px 8px;max-width:250px">ทีละชิ้น: แตะชิ้นงาน / เส้น → ปุ่ม <b>↔ ขนาด</b> ที่แถบล่าง</div>${nh ? `<div style="padding:4px 8px"><button class="sl-b" data-sl="dimall">แสดงขนาดที่ซ่อนรายชิ้น (${nh})</button></div>` : ''}</div>`; })() : ''}
    ${S.snapMenu ? `<div class="sl-menu" style="left:${Math.min(S.snapMenuX || 200, Math.max(8, W - 260))}px"><label><input type="checkbox" data-snap="on"${sn.on ? ' checked' : ''}> <b>เปิด Snap</b></label><div style="border-top:1px solid #EEE6D8;margin:4px 0"></div>
      <label><input type="checkbox" data-snap="grid"${sn.grid ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดตาราง</label><label><input type="checkbox" data-snap="guide"${sn.guide ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดเส้นไกด์</label>
      <label><input type="checkbox" data-snap="edge"${sn.edge ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดขอบชิ้นงาน / ขอบแผ่น (+ ร่อง)</label><label><input type="checkbox" data-snap="obj"${sn.obj !== false ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดจุดของเส้น (จุดปลาย · กึ่งกลาง · จุดตัด · ศูนย์กลาง · มุม)</label><div class="sl-mut" style="padding:4px 8px">กด Alt ค้างขณะลาก = ปิด Snap ชั่วคราว</div></div>` : ''}`; }
function stat() { const el = $('#slStat', root); if (!el) return; const c = S.cursor;
  el.innerHTML = S.img ? `<span>ตำแหน่ง <b>${c ? fmt(c[0]) + ', ' + fmt(c[1]) + ' ซม.' : '—'}</b></span><span>สเกล <b>${S.scaled ? '1 px = ' + (S.cmx * 10).toFixed(2) + (Math.abs(S.cmx - S.cmy) > 1e-6 ? ' / ' + (S.cmy * 10).toFixed(2) : '') + ' มม.' : 'ยังไม่ตั้ง'}</b></span><span>ชิ้นงาน <b>${S.shapes.length}</b>${S.sel.length ? ' · เลือก ' + S.sel.length : ''}</span>${S.lines.length ? `<span>เส้น <b>${S.lines.length}</b></span>` : ''}` : '<span>ยังไม่มีรูป</span>'; }
function startPane() { const el = $('#slStart', root); if (!el) return; if (S.img) { el.hidden = true; return; } el.hidden = false;
  el.innerHTML = `<div class="sl-drop"><div style="font-size:42px">✂</div><h2>Slab Layout · วางแผนตัดแผ่น</h2><p>นำเข้ารูปแผ่นหิน / ไม้ / แผ่นวัสดุ → ตั้งสเกลตามขนาดจริง → วางชิ้นงาน (เช่น 45×120 ซม.) วงกลม · หลายเหลี่ยม · วาดอิสระ → จัดแพทเทิร์น · ออกรายการตัด</p>
    <div class="sl-row" style="justify-content:center"><button class="sl-b tl" data-sl="pick" data-g="sl-open" style="height:46px;padding:0 20px;font-size:15px">🖼 นำเข้ารูปแผ่น</button><button class="sl-b dk" data-sl="works" data-g="sl-works" style="height:46px">📂 งานที่บันทึก</button>${S.lastAt ? `<button class="sl-b" data-sl="last" style="height:46px">↺ งานล่าสุด · ${esc(S.lastName || '')}</button>` : ''}</div>
    <div class="sl-mut">หรือลากรูปมาวาง · JPG · PNG · WebP · TIFF · PSD — รูปอยู่ในเครื่องคุณ ไม่ถูกอัปโหลด</div>
    <div class="sl-flow"><div><b>1 · นำเข้ารูป</b>รูปแผ่นหิน / dry-lay / แบบ elevation</div><div><b>2 · ตั้งสเกล</b>วาง 2 จุด (มีแว่นขยาย) แล้วใส่ระยะจริง</div><div><b>3 · ปรับสัดส่วน</b>ปรับแกนเดียว หรือดัด 4 มุมให้ตรง</div><div><b>4 · ตาราง · ไกด์ · Snap</b>เปิด-ปิดได้ เลือกให้ติดอะไร</div><div><b>5 · วางชิ้นงาน</b>รูปทรง / วาดอิสระ · ตั้งขนาด ซม. · ลากย้าย · แพทเทิร์น</div></div></div>`; }
function panel() { const P = $('#slPan', root); if (!P) return; P.classList.toggle('off', !S.panel);
  if (!S.img) { P.innerHTML = '<div class="sl-sec"><h4><i>1</i>นำเข้ารูปแผ่น</h4><div class="sl-mut">เริ่มจากนำเข้ารูปแผ่นหิน / ไม้ หรือรูป dry-lay ที่ถ่ายจากโรงงาน</div><div class="sl-row"><button class="sl-b tl" data-sl="pick">🖼 นำเข้ารูป</button></div></div>'; return; }
  const sel = selected(), s1 = one();
  const sum = {}; S.shapes.forEach((p) => { const k = TNAME[p.t] + ' ' + (p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h))); sum[k] = sum[k] || { n: 0, a: 0 }; sum[k].n++; sum[k].a += area(p) / 10000; });
  const tot = Object.values(sum).reduce((a, b) => a + b.a, 0); const thin = S.shapes.filter((p) => Math.min(p.w, p.h) < 10).length;
  P.innerHTML = `
  <div class="sl-sec"><h4><i>1</i>รูปแผ่น</h4><div class="sl-mut">${esc(S.name)} · ${S.img.width} × ${S.img.height} px</div><div class="sl-mut" style="margin-top:4px">${S.work ? (S.work.cloud ? 'บันทึกในระบบ' : 'บันทึกในเครื่องนี้') + ' · ' + esc(fmtAt(S.work.at)) + (S.work.byName ? ' · ' + esc(S.work.byName) : '') + (S.dirty ? ' · <b style="color:#B45309">● มีการแก้ที่ยังไม่บันทึก</b>' : ' · ✓ ล่าสุดแล้ว') : '<b style="color:#B45309">ยังไม่ได้บันทึกงานนี้</b> — กด 💾 บันทึก เพื่อเปิดแก้ต่อภายหลัง'}</div>
    <div class="sl-row"><button class="sl-b dk" data-sl="csave">💾 บันทึก</button><button class="sl-b" data-sl="works">📂 งานที่บันทึก</button>${S.work ? '<button class="sl-b" data-sl="csaveas">⧉ บันทึกเป็นงานใหม่</button>' : ''}</div>
    <div class="sl-row"><button class="sl-b" data-sl="pick">เปลี่ยนรูป</button><button class="sl-b" data-sl="savejson" title="ดาวน์โหลดงาน (รูป + ชิ้นงาน) เป็นไฟล์ .json">⬇ ไฟล์งาน .json</button></div></div>
  <div class="sl-sec" data-g="sl-scale"><h4><i>2</i>สเกล · ขนาดจริง</h4>
    <div class="sl-mut">แตะจุดบน<b>ขอบแผ่นจริง</b> แล้วใส่ขนาด — ตั้งแนวนอน / แนวตั้งแยกกัน รูปจะยืด / หดแต่ละแกนให้ตรง (ไม่ล็อกสัดส่วนรูป)</div>
    <div class="sl-row"><button class="sl-b dk" data-sl="calx">↔ ความกว้าง${S.dimx ? ' ' + fmt(S.dimx.len) + ' ซม. ✓' : ''}</button><button class="sl-b dk" data-sl="caly">↕ ความสูง${S.dimy ? ' ' + fmt(S.dimy.len) + ' ซม. ✓' : ''}</button></div>
    <div class="sl-row" style="margin-top:10px"><label>หรือพิมพ์ขนาดทั้งรูป (ใช้เมื่อแผ่นเต็มรูปพอดี)</label></div>
    <div class="sl-row" data-g="sl-size"><input class="sl-in" data-in="iw" type="number" step="0.1" min="1" value="${fmt(IW())}" title="กว้าง (ซม.)"><span>×</span><input class="sl-in" data-in="ih" type="number" step="0.1" min="1" value="${fmt(IH())}" title="สูง (ซม.)"><span class="sl-mut">ซม.</span></div>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-in="lock"${S.lockRatio ? ' checked' : ''}> <span>ตั้งแกนเดียว = ใช้สเกลเดียวกันทั้ง 2 แกน</span></label>
    ${S.scaled ? `<div class="sl-ok">ตั้งสเกลแล้ว${S.dimx || S.dimy ? ' · แผ่น ↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') + ' ซม.' : ''} · สัดส่วนแกน X : Y = 1 : ${(S.cmy / S.cmx).toFixed(3)}</div>` : '<div class="sl-warn">ยังไม่ตั้งสเกล — แตะ ↔ ความกว้าง / ↕ ความสูง แล้ววางจุดบนขอบแผ่น</div>'}</div>
  <div class="sl-sec" data-g="sl-ratio"><h4><i>3</i>ปรับสัดส่วนรูป</h4><div class="sl-mut">รูปถ่ายมักยืด / หดแกนเดียว — ตั้งสเกลแนวนอน / แนวตั้งแยกกัน หรือดัด 4 มุมถ้ารูปถ่ายเฉียง</div>
    <div class="sl-row"><button class="sl-b" data-sl="calx">↔ สเกลแนวนอน</button><button class="sl-b" data-sl="caly">↕ สเกลแนวตั้ง</button></div>
    <div class="sl-row"><label>ยืดแนวนอน</label><input class="sl-in" data-in="sx" type="number" step="0.5" value="100" style="width:66px"><span class="sl-mut">%</span><label>แนวตั้ง</label><input class="sl-in" data-in="sy" type="number" step="0.5" value="100" style="width:66px"><span class="sl-mut">%</span><button class="sl-b" data-sl="stretch">ใช้</button></div>
    <div class="sl-row"><button class="sl-b dk" data-tool="persp">⬚ ดัดมุมมอง 4 มุม</button>${S.prevImg ? '<button class="sl-b" data-sl="unpersp">↶ คืนรูปก่อนดัด</button>' : ''}</div></div>
  <div class="sl-sec"><h4><i>4</i>ตาราง · ไกด์ · Snap</h4><div class="sl-mut">เปิด-ปิดที่แถบบน · Snap เลือกได้ว่าติดตาราง / เส้นไกด์ / ขอบชิ้นงาน</div>
    <div class="sl-row"><button class="sl-b" data-tool="gv">┆ + ไกด์ตั้ง</button><button class="sl-b" data-tool="gh">┅ + ไกด์นอน</button>${S.guides.length ? '<button class="sl-b" data-sl="gclear">ลบไกด์ทั้งหมด</button>' : ''}</div>
    ${S.guides.map((g, i) => `<div class="sl-row"><span class="sl-mut" style="width:54px">${g.o === 'v' ? '┆ ตั้ง' : '┅ นอน'}</span><input class="sl-in" data-gp="${i}" type="number" step="0.1" value="${fmt(g.p)}"><span class="sl-mut">ซม.</span><button class="sl-b" data-gx="${i}" title="ลบ">✕</button></div>`).join('')}</div>
  <div class="sl-sec" data-g="sl-piece"><h4><i>5</i>ชิ้นงาน · ค่าตั้งต้น</h4>
    <div class="sl-row">${SHAPES.map(([k, ic, t]) => `<button class="sl-chip${S.shape === k ? ' on' : ''}" data-shp="${k}">${ic} ${t}</button>`).join('')}</div>
    <div class="sl-row"><input class="sl-in" data-in="dw" type="number" step="0.1" min="1" value="${fmt(S.defW)}" title="กว้าง (ซม.)" data-g="sl-dw"><span>×</span><input class="sl-in" data-in="dh" type="number" step="0.1" min="1" value="${fmt(S.defH)}" title="ยาว (ซม.)"><span class="sl-mut">ซม.</span><button class="sl-b" data-sl="swapd" title="สลับกว้าง / ยาว">⇄</button></div>
    <div class="sl-row">${PRESETS.map(([a, b]) => `<button class="sl-chip${S.defW === a && S.defH === b ? ' on' : ''}" data-pre="${a}x${b}">${a}×${b}</button>`).join('')}</div>
    <div class="sl-row"><label>ร่อง / ยาแนว</label><input class="sl-in" data-in="joint" type="number" step="0.5" min="0" value="${S.joint}" style="width:62px"><span class="sl-mut">มม.</span></div>
    <div class="sl-row">${COLORS.map(([c, t]) => `<span class="sl-sw${S.color === c ? ' on' : ''}" data-col="${c}" title="${t}" style="background:${c}"></span>`).join('')}</div>
    <div class="sl-row"><button class="sl-b dk" data-tool="shape">▭ วางรูปทรง</button><button class="sl-b" data-sl="center">＋ วางกลางจอ</button></div></div>
  ${sel.length ? `<div class="sl-sec" style="border-color:#C9A961"><h4>✦ ชิ้นที่เลือก ${sel.length > 1 ? '(' + sel.length + ' ชิ้น)' : esc(TNAME[s1.t]) + ' หมายเลข ' + esc(s1.n)}</h4>
    ${s1 ? `<div class="sl-row"><label>ตำแหน่ง X</label><input class="sl-in" data-pe="x" type="number" step="0.1" value="${fmt(s1.x)}"><label>Y</label><input class="sl-in" data-pe="y" type="number" step="0.1" value="${fmt(s1.y)}"></div>
    <div class="sl-row"><label>หมายเลข</label><input class="sl-in" data-pe="n" value="${esc(s1.n)}" style="width:70px">${s1.t === 'poly' ? `<label>จำนวนด้าน</label><input class="sl-in" data-pe="sides" type="number" min="3" max="24" value="${s1.sides || 6}" style="width:60px">` : ''}</div>` : ''}
    <div class="sl-row">${COLORS.map(([c, t]) => `<span class="sl-sw" data-pcol="${c}" title="${t}" style="background:${c}"></span>`).join('')}</div>
    ${s1 ? `<div style="border-top:1px solid #EEE6D8;margin:8px 0 4px"></div><div class="sl-row" data-g="sl-pattern"><b style="font-size:13px">ทำซ้ำเป็นแพทเทิร์น</b></div>
    <div class="sl-row"><label>คอลัมน์</label><input class="sl-in" data-pt="c" type="number" min="1" value="${S.pat.c}" style="width:58px"><label>แถว</label><input class="sl-in" data-pt="r" type="number" min="1" value="${S.pat.r}" style="width:58px"></div>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-pt="fill"${S.pat.fill ? ' checked' : ''}> <span>เต็มแผ่น (คำนวณจำนวนเอง)</span></label>
    ${s1.t === 'rect' || s1.t === 'sq' ? `<label class="sl-row" style="cursor:pointer"><input type="checkbox" data-pt="cut"${S.pat.cut ? ' checked' : ''}> <span>รวมชิ้นตัดที่ขอบแผ่น</span></label>` : ''}
    <div class="sl-row"><button class="sl-b tl" data-sl="pattern">▦ สร้างแพทเทิร์น (ร่อง ${S.joint} มม.)</button></div>` : ''}</div>` : ''}
  <div class="sl-sec"><h4>📋 สรุปรายการตัด</h4>${S.lines.length ? `<div class="sl-row"><span class="sl-mut">เส้น CAD ${S.lines.length} เส้น · ยาวรวม ${(S.lines.reduce((a, e) => a + lLen(e), 0) / 100).toFixed(2)} ม.</span><button class="sl-b" data-sl="lclear">ลบเส้นทั้งหมด</button></div>` : ''}${S.shapes.length ? `<table><tr><th>ชิ้น (ซม.)</th><th>จำนวน</th><th>พื้นที่ ตร.ม.</th></tr>${Object.keys(sum).sort().map((k) => `<tr><td>${k}</td><td>${sum[k].n}</td><td>${sum[k].a.toFixed(2)}</td></tr>`).join('')}<tr><td><b>รวม</b></td><td><b>${S.shapes.length}</b></td><td><b>${tot.toFixed(2)}</b></td></tr></table>${thin ? `<div class="sl-warn">⚠ มีชิ้นแคบกว่า 10 ซม. ${thin} ชิ้น — หินแคบมากเสี่ยงแตก ลองขยับจุดเริ่มแพทเทิร์นให้ชิ้นขอบกว้างขึ้น (แบ่งเศษ 2 ข้าง)</div>` : ''}
    <div class="sl-row"><button class="sl-b" data-sl="renum" title="เรียงหมายเลขจากซ้ายบน → ขวาล่าง">🔢 เรียงหมายเลขใหม่</button><button class="sl-b" data-sl="selall">เลือกทั้งหมด</button><button class="sl-b" data-sl="clear">ลบทั้งหมด</button></div>` : '<div class="sl-mut">ยังไม่มีชิ้นงาน — เลือกเครื่องมือ ▭ รูปทรง หรือ ✏ วาดอิสระ</div>'}</div>
  <div class="sl-mut" style="padding:0 4px">ลัด: แตะ = เลือก · ลาก = ย้าย (ลากที่จับ = ย่อ-ขยาย / หมุน) · 2 นิ้ว = ซูม / เลื่อน · แตะที่ว่าง 2 ครั้ง = ซูมจุดนั้น · Shift + แตะ = เลือกหลายชิ้น · ลูกศร = ขยับ · R = หมุน 90° · Ctrl+D = สำเนา · Delete = ลบ · Ctrl+Z / Ctrl+Y</div>`; }
// ---------- แถบลอยบนภาพ (คำแนะนำ + ตั้งค่าของเครื่องมือ / ชิ้นที่เลือก) ----------
function nudgePad(kind) { return `<span class="pad" title="ขยับละเอียด"><span></span><button data-nud="0,-1" data-nk="${kind}" aria-label="ขึ้น">▲</button><span></span><button data-nud="-1,0" data-nk="${kind}" aria-label="ซ้าย">◀</button><button data-nud="0,1" data-nk="${kind}" aria-label="ลง">▼</button><button data-nud="1,0" data-nk="${kind}" aria-label="ขวา">▶</button></span><select data-in="nstep" title="ระยะขยับ" style="height:36px;border-radius:9px;background:#2A2721;color:#fff;border:1px solid #4A463D">${[0.1, 0.5, 1, 5].map((v) => `<option value="${v}"${v === S.nudge ? ' selected' : ''}>${v} ซม.</option>`).join('')}</select>`; }
function fbar() { const el = $('#slFb', root); if (!el) return; if (!S.img) { el.innerHTML = ''; return; } let h = '';
  const ap = S.act ? `<span class="lb">ขยับจุด</span>${nudgePad('pt')}` : '';
  if (S.tool === 'scale') { const n = S.cal.length, ax = S.calAxis === 'y' ? 'y' : 'x', DX = S.dimx, DY = S.dimy;
    const tabs = `<span class="bx" data-g="sl-axis"><button data-cax="x" class="${ax === 'x' ? 'on' : ''}">↔ แนวนอน${DX ? ' ' + fmt(DX.len) + ' ✓' : ''}</button><button data-cax="y" class="${ax === 'y' ? 'on' : ''}">↕ แนวตั้ง${DY ? ' ' + fmt(DY.len) + ' ✓' : ''}</button></span>`;
    if (n < 2) h = tabs + `<span>${ax === 'x' ? 'แตะขอบ <b>ซ้าย</b> และ <b>ขวา</b> ของแผ่น' : 'แตะขอบ <b>บน</b> และ <b>ล่าง</b> ของแผ่น'} · จุดที่ ${n + 1}/2 (กดค้าง = แว่นขยาย · ให้เส้นชมพูทับขอบแผ่นพอดี)</span><span class="sp"></span>${ap}<button data-sl="tcancel">เสร็จ</button>`;
    else h = tabs + `<span class="bx"><span class="lb">${ax === 'x' ? 'กว้างจริง' : 'สูงจริง'}</span><input data-in="calLen" type="number" step="0.1" min="0" value="${esc(S.calLen)}" placeholder="ซม."><span class="lb">ซม.</span></span><span class="lb">ลากจุดเพื่อแก้</span><span class="sp"></span>${ap}<button data-sl="calReset">ล้างจุด</button><button class="go" data-sl="calOk">✓ ใช้${ax === 'x' ? 'แนวนอน' : 'แนวตั้ง'}</button>`; }
  else if (S.tool === 'persp') { const n = S.persp.length, L = ['ซ้ายบน', 'ขวาบน', 'ขวาล่าง', 'ซ้ายล่าง'];
    if (n < 4) h = `<span>⬚ ดัด 4 มุม: วางมุม <b>${L[n]}</b> ของแผ่น (${n + 1}/4) — กดค้างเพื่อเล็งด้วยแว่นขยาย</span><span class="sp"></span>${ap}<button data-sl="tcancel">ยกเลิก</button>`;
    else h = `<span class="bx"><span class="lb">ขนาดจริง</span><input data-in="pw" type="number" step="0.1" min="0" value="${esc(S.pw)}" placeholder="กว้าง"><span>×</span><input data-in="ph" type="number" step="0.1" min="0" value="${esc(S.ph)}" placeholder="สูง"><span class="lb">ซม.</span></span><span class="lb">ลากมุมเพื่อแก้</span><span class="sp"></span>${ap}<button data-sl="perspReset">ล้างจุด</button><button class="go" data-sl="perspOk">✓ ดัดรูป</button>`; }
  else if (S.tool === 'shape') h = `<span class="bx">${SHAPES.map(([k, ic, t]) => `<button data-shp="${k}" class="${S.shape === k ? 'on' : ''}" title="${t}">${ic}<span class="wd"> ${t}</span></button>`).join('')}</span>
      ${S.shape === 'poly' ? `<span class="bx"><button data-sl="sidesM">－</button><b>${S.sides} ด้าน</b><button data-sl="sidesP">＋</button></span>` : ''}
      <span class="bx"><input data-in="dw" class="sm" type="number" step="0.1" min="1" value="${fmt(S.defW)}" title="กว้าง (ซม.)"><span>×</span><input data-in="dh" class="sm" type="number" step="0.1" min="1" value="${fmt(S.defH)}" title="ยาว (ซม.)"${S.shape === 'sq' || S.shape === 'circle' ? ' disabled' : ''}><span class="lb">ซม.</span></span>
      <button data-sl="repeat" class="${S.repeat ? 'on' : ''}" title="วางต่อเนื่องหลายชิ้น (ปิด = วาง 1 ชิ้นแล้วกลับโหมดเลือก)">🔁 วางต่อ</button><span class="lb">แตะ = วางขนาดนี้ · ลาก = วาดขนาดเอง</span>`;
  else if (S.tool === 'free') h = `<span class="bx"><button data-fm="drag" class="${S.freeMode === 'drag' ? 'on' : ''}">✏ ลากวาดเส้น</button><button data-fm="pts" class="${S.freeMode === 'pts' ? 'on' : ''}">⟋ จุดต่อจุด</button></span>
      ${S.freeMode === 'pts' ? `<span class="lb">${S.drawPts.length ? 'จุด ' + S.drawPts.length + ' · แตะจุดแรกเพื่อปิดรูป' : 'แตะวางจุด (มีแว่นขยาย)'}</span><span class="sp"></span>${ap}${S.drawPts.length ? '<button data-sl="ptUndo">↶ ลบจุด</button><button data-sl="tcancel">ยกเลิก</button>' : ''}${S.drawPts.length >= 3 ? '<button class="go" data-sl="ptClose">✓ ปิดรูป</button>' : ''}` : '<span class="lb">ลากนิ้ว / เมาส์วาดรูปปิด — ปล่อยแล้วเก็บเป็นชิ้นงาน</span>'}`;
  else if (S.tool === 'cad') { const n = S.cpts.length, c = S.cad;
    const tip = c === 'line' ? (n ? 'แตะจุดถัดไป · แตะจุดแรก = ปิดรูป' : 'แตะวางจุดเริ่ม (กดค้าง = แว่นขยาย · ติดจุดปลาย / จุดตัดเอง)') : c === 'arc' ? ['แตะจุดเริ่มโค้ง', 'แตะจุดบนแนวโค้ง', 'แตะจุดปลายโค้ง'][n] : (n ? 'แตะ / พิมพ์รัศมี' : 'แตะจุดศูนย์กลาง');
    h = `<span class="bx" data-g="sl-cad">${CADS.map(([k, ic, t, f]) => `<button data-cad="${k}" class="${c === k ? 'on' : ''}" title="${f}">${ic} ${t}</button>`).join('')}</span>
      ${c === 'line' ? `<span class="bx"><input data-in="clen" class="sm" type="number" step="0.1" min="0" value="${esc(S.cin.len)}" placeholder="ยาว" title="ความยาว (ซม.)"><span class="lb">ซม.</span><input data-in="cang" class="sm" type="number" step="1" value="${esc(S.cin.ang)}" placeholder="มุม" title="มุม (องศา · 0 = ขวา · 90 = ขึ้น)"><span class="lb">°</span><button data-sl="cadPlace"${n ? '' : ' disabled'}>วาง</button></span><button data-sl="ortho" class="${S.ortho ? 'on' : ''}" title="ล็อกแนวนอน / แนวตั้ง">⊾ ฉาก</button>` : ''}
      ${c === 'circle' ? `<span class="bx"><span class="lb">รัศมี</span><input data-in="crad" class="sm" type="number" step="0.1" min="0" value="${esc(S.cin.rad)}" placeholder="R" title="รัศมี (ซม.)"><span class="lb">ซม.</span><button data-sl="cadPlace"${n ? '' : ' disabled'}>วาง</button></span>` : ''}
      <span class="lb">${tip}</span><span class="sp"></span>${n ? '<button data-sl="cadBack">↶ ถอยจุด</button>' : ''}${n && c === 'line' ? '<button class="go" data-sl="cadDone">✓ จบเส้น</button>' : ''}${!n && S.lastLoop && S.lines.some((e) => e.id === S.lastLoop) ? '<button class="go" data-sl="cadRegion">⬚ ทำเป็นชิ้นงาน</button>' : ''}`; }
  else if (S.tool === 'cedit') { const m = S.ced, tip = { trim: 'แตะส่วนของเส้นที่ต้องการตัดทิ้ง (ตัดถึงเส้นที่ตัดผ่าน)', extend: 'แตะใกล้ปลายเส้นที่ต้องการยืด (ยืดถึงเส้นถัดไป)', offset: S.offSrc ? 'แตะด้านที่ต้องการวางเส้นขนาน' : 'แตะเส้นต้นแบบ', erase: 'แตะเส้น / ชิ้นงานที่ต้องการลบ', explode: 'แตะชิ้นงานเพื่อแตกเป็นเส้น (แล้วตัด / ยืดได้)', region: 'แตะเส้นที่ต่อกันเป็นวงปิด → เป็นชิ้นงาน (นับพื้นที่)' }[m];
    h = `<span class="bx" data-g="sl-ced">${CEDS.map(([k, ic, t, f]) => `<button data-ced="${k}" class="${m === k ? 'on' : ''}" title="${f}">${ic} ${t}</button>`).join('')}</span>${m === 'offset' ? `<span class="bx"><span class="lb">ระยะ</span><input data-in="offd" class="sm" type="number" step="0.1" min="0" value="${fmt(S.offD)}"><span class="lb">ซม.</span></span>` : ''}<span class="lb">${tip}</span><span class="sp"></span><button data-tool="move">เสร็จ</button>`; }
  else if (S.tool === 'meas') { const m = S.meas; h = m ? `<span>📐 ระยะ <b>${fmt(Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]))} ซม.</b> · แนวนอน ${fmt(Math.abs(m.b[0] - m.a[0]))} · แนวตั้ง ${fmt(Math.abs(m.b[1] - m.a[1]))} ซม.</span><span class="sp"></span>${ap}<button data-sl="measClear">ล้าง</button>` : '<span>📐 วัดระยะ: ลากจากจุดหนึ่งไปอีกจุด (มีแว่นขยาย) — ลากปลายเพื่อแก้</span>'; }
  else if (S.tool === 'gv' || S.tool === 'gh') h = `<span>${S.tool === 'gv' ? '┆ แตะเพื่อวางเส้นไกด์แนวตั้ง' : '┅ แตะเพื่อวางเส้นไกด์แนวนอน'} · ลากเส้นเพื่อย้าย · ลากออกนอกแผ่น = ลบ</span><span class="sp"></span><button data-tool="move">เสร็จ</button>`;
  else { const s = one(); const L = selected(), LS = lselected(), e1 = LS[0];
    if (LS.length === 1) h = `<span class="bx" data-g="sl-linsp"><b>${LNAME[e1.t]}</b>${e1.t === 'ln' ? `<input data-le="len" class="sm" type="number" step="0.1" min="0.1" value="${fmt(lLen(e1))}" title="ความยาว (ซม.)"><span class="lb">ซม.</span><input data-le="ang" class="sm" type="number" step="1" value="${fmt(lAng(e1))}" title="มุม (องศา · 0 = ขวา · 90 = ขึ้น)"><span class="lb">°</span>` : `<span class="lb">R</span><input data-le="r" class="sm" type="number" step="0.1" min="0.1" value="${fmt(e1.r)}" title="รัศมี (ซม.)"><span class="lb">ซม. · ⌀ ${fmt(e1.r * 2)}${e1.t === 'arc' ? ' · ยาว ' + fmt(lLen(e1)) : ''}</span>`}</span>
      <span class="bx"><button data-sl="ldim" class="${S.ldims && !e1.nd ? 'on' : ''}" title="แสดง / ซ่อนขนาดของเส้นนี้">↔ ขนาด</button><button data-sl="ldup" title="ทำสำเนา">⧉</button><button data-sl="lregion" title="ทำเป็นชิ้นงาน (เส้นต่อกันเป็นวงปิด)">⬚ เป็นชิ้น</button><button class="dg" data-sl="ldel" title="ลบ">🗑</button></span>${nudgePad('sel')}`;
    else if (LS.length > 1) h = `<span><b>เลือก ${LS.length} เส้น</b></span><span class="bx"><button data-sl="ldim" class="${S.ldims && !LS[0].nd ? 'on' : ''}">↔ ขนาด</button><button data-sl="ldup">⧉ สำเนา</button><button class="dg" data-sl="ldel">🗑 ลบ</button></span>${nudgePad('sel')}`;
    else if (s) h = `<span class="bx" data-g="sl-insp"><b>${esc(TNAME[s.t])} #${esc(s.n)}</b><input data-pe="w" class="sm" type="number" step="0.1" min="1" value="${fmt(s.w)}" title="กว้าง (ซม.)"${s.lock ? ' disabled' : ''}>${s.t === 'sq' || s.t === 'circle' ? '' : `<span>×</span><input data-pe="h" class="sm" type="number" step="0.1" min="1" value="${fmt(s.h)}" title="ยาว (ซม.)"${s.lock ? ' disabled' : ''}>`}<span class="lb">ซม.</span><input data-pe="rot" class="sm" type="number" step="1" value="${Math.round(s.rot || 0)}" title="มุม (องศา)"${s.lock ? ' disabled' : ''}><span class="lb">°</span></span>
      <span class="bx"><button data-sl="rot" title="หมุน 90°"${s.lock ? ' disabled' : ''}>⟳ 90°</button><button data-sl="dup" title="ทำสำเนา">⧉</button><button data-sl="lock" class="${s.lock ? 'on' : ''}" title="ล็อก กันขยับโดยไม่ตั้งใจ">${s.lock ? '🔒' : '🔓'}</button><button data-sl="zsel" title="ซูมไปที่ชิ้นนี้">🔍</button><button data-sl="pdim" data-g="sl-pdim" class="${S.dims && !s.nd ? 'on' : ''}" title="แสดง / ซ่อนขนาดของชิ้นนี้">↔ ขนาด</button><button class="dg" data-sl="del" title="ลบ">🗑</button></span><span class="bx" data-g="sl-opsel" title="ความทึบของชิ้นที่เลือก"><span class="lb"><i class="sl-opi"></i> พื้น</span><input type="range" min="0" max="100" step="1" data-opsel="f" value="${Math.round(fo(L[0]) * 100)}"><b class="opv" data-opv="sf">${Math.round(fo(L[0]) * 100)}%</b><button data-opq="${fo(L[0]) > 0 ? 0 : 10}" title="สลับ 10% ↔ 0%">${fo(L[0]) > 0 ? '→ 0%' : '→ 10%'}</button></span>${s.lock ? '' : nudgePad('sel')}`;
    else if (L.length > 1) h = `<span><b>เลือก ${L.length} ชิ้น</b></span><span class="bx"><button data-sl="rot">⟳ 90°</button><button data-sl="dup">⧉ สำเนา</button><button data-sl="zsel">🔍</button><button data-sl="pdim" class="${S.dims && !L[0].nd ? 'on' : ''}" title="แสดง / ซ่อนขนาดของชิ้นที่เลือก">↔ ขนาด</button><button class="dg" data-sl="del">🗑 ลบ</button></span><span class="bx" data-g="sl-opsel" title="ความทึบของชิ้นที่เลือก"><span class="lb"><i class="sl-opi"></i> พื้น</span><input type="range" min="0" max="100" step="1" data-opsel="f" value="${Math.round(fo(L[0]) * 100)}"><b class="opv" data-opv="sf">${Math.round(fo(L[0]) * 100)}%</b><button data-opq="${fo(L[0]) > 0 ? 0 : 10}" title="สลับ 10% ↔ 0%">${fo(L[0]) > 0 ? '→ 0%' : '→ 10%'}</button></span>${nudgePad('sel')}`;
    else if (!S.scaled) h = '<span>ขั้นต่อไป: <b>📏 ตั้งสเกล</b> — วาง 2 จุดที่รู้ระยะจริง</span>';
    else if (!S.shapes.length) h = '<span>ขั้นต่อไป: เลือก <b>▭ รูปทรง</b> หรือ <b>✏ วาดอิสระ</b> ที่แถบเครื่องมือ</span>'; }
  el.innerHTML = h; }
function toast(t) { const host = (S.img && $('#slCw', root)) || root; host.querySelectorAll(':scope > .sl-toast').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'sl-toast' + (host === root ? '' : ' in'); d.textContent = t; host.appendChild(d); setTimeout(() => d.remove(), 2400); }
function ask(title, body, okTx) { return new Promise((ok) => { const d = document.createElement('div'); d.className = 'sl-dlg';
  d.innerHTML = `<div class="bx"><h3>${title}</h3><div class="sl-mut" style="margin-bottom:8px">${body}</div><div class="sl-row" style="justify-content:flex-end;margin-top:12px"><button class="sl-b" data-no>ยกเลิก</button><button class="sl-b dk" data-ok>${okTx || 'ตกลง'}</button></div></div>`;
  root.appendChild(d); const done = (v) => { d.remove(); ok(v); }; d.addEventListener('click', (e) => { if (e.target.closest('[data-no]') || e.target === d) done(false); if (e.target.closest('[data-ok]')) done(true); }); }); }
function askNum(title, label, v) { return new Promise((ok) => { const d = document.createElement('div'); d.className = 'sl-dlg';
  d.innerHTML = `<div class="bx"><h3>${title}</h3><div class="sl-row"><label>${label}</label><input class="sl-in" type="number" step="0.1" value="${v}"></div><div class="sl-row" style="justify-content:flex-end"><button class="sl-b" data-no>ยกเลิก</button><button class="sl-b dk" data-ok>ตกลง</button></div></div>`;
  root.appendChild(d); const i = d.querySelector('input'); setTimeout(() => { i.focus(); i.select(); }, 30); const done = (x) => { d.remove(); ok(x); };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-no]') || e.target === d) done(null); if (e.target.closest('[data-ok]')) done(parseFloat(i.value)); }); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(parseFloat(i.value)); }); }); }
async function busy(t, fn) { const b = document.createElement('div'); b.className = 'sl-busy'; b.textContent = t; root.appendChild(b); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); try { return await fn(); } finally { b.remove(); } }
// ---------- โหลดรูป ----------
async function decode(f) { if (window.PE_decode) return window.PE_decode(f); try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (e) {} return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('เปิดรูปไม่ได้')); i.src = URL.createObjectURL(f); }); }
function toCanvas(bmp, max) { const k = Math.min(1, (max || 5000) / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c; }
function freshImg() { S.dimx = S.dimy = null; S.calAxis = 'x'; S.cmx = S.cmy = 0.1; S.scaled = false; S.prevImg = null; S.hist = []; S.redo = []; S.sel = []; S.cal = []; S.persp = []; S.drawPts = []; S.meas = null; S.act = null; S.calLen = ''; S.pw = ''; S.ph = ''; }
async function loadFile(f) {
  if ((S.shapes.length || S.lines.length) && S.img && !(await ask('เปลี่ยนรูปแผ่น?', 'ชิ้นงาน / เส้นที่วางไว้จะยังอยู่ที่ตำแหน่งเดิม (ซม.) — ถ้าเป็นแผ่นใหม่ ควรลบชิ้นงานก่อน', 'เปลี่ยนรูป'))) return;
  await busy('กำลังเปิดรูป…', async () => { try { const bmp = await decode(f); const had = !!S.img; S.img = toCanvas(bmp, 5000); if (!had) { S.name = f.name.replace(/\.[^.]+$/, ''); S.work = null; } freshImg(); S.imgDirty = true; S.dirty = true; S.tool = 'scale';
    fit(); ui(); autosave(); toast('เปิดรูปแล้ว — ขั้นต่อไป: ตั้งสเกล วาง 2 จุดที่รู้ระยะจริง'); } catch (e) { toast(String((e && e.message) || e)); } }); }
async function loadJson(f) { try { const d = JSON.parse(await f.text()); if (!d || !d.img) throw new Error('ไฟล์งานไม่ถูกต้อง');
  await busy('กำลังเปิดงาน…', async () => { const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('รูปในไฟล์งานเสีย')); i.src = d.img; }); S.img = toCanvas(im, 6000); S.name = d.name || f.name.replace(/\.json$/i, ''); freshImg(); applyData(d.st || {}); S.work = null; S.imgDirty = true; S.dirty = true; worksClose(); S.tool = 'move'; fit(); ui(); autosave(); toast('เปิดงานแล้ว'); }); } catch (e) { toast(String((e && e.message) || e)); } }
async function loadLast() { const L = await DB.get('last'); if (!L || !L.blob) { toast('ไม่พบงานล่าสุด'); return; } await busy('กำลังเปิดงานล่าสุด…', async () => { const bmp = await createImageBitmap(L.blob); S.img = toCanvas(bmp, 6000); S.name = L.name || 'slab'; freshImg(); applyData(L.st || {}); S.work = L.work || null; S.dirty = L.dirty !== false; S.imgDirty = !!L.imgDirty || !S.work; worksClose(); S.tool = 'move'; fit(); ui(); }); }
// ---------- สเกล ----------
// ---- ขนาดแผ่นจากจุดบนแผ่นจริง: ↔ แนวนอน (ขอบซ้าย-ขวา) · ↕ แนวตั้ง (ขอบบน-ล่าง) — เก็บเป็นพิกเซลของรูป จึงติดอยู่ที่จุดเดิมตลอด ----
const toImg = (p) => [p[0] / S.cmx, p[1] / S.cmy], fromImg = (p) => [p[0] * S.cmx, p[1] * S.cmy];
function loadAxis(ax) { S.calAxis = ax; const d = S['dim' + ax]; S.cal = d ? [fromImg(d.a), fromImg(d.b)] : []; S.calLen = d ? fmt(d.len) : ''; S.act = null; }
function applyDims() { const X = S.dimx, Y = S.dimy;
  if (X) { const dx = Math.abs(X.b[0] - X.a[0]); if (dx >= 3) S.cmx = X.len / dx; } if (Y) { const dy = Math.abs(Y.b[1] - Y.a[1]); if (dy >= 3) S.cmy = Y.len / dy; }
  if (X && !Y && S.lockRatio) S.cmy = S.cmx; if (Y && !X && S.lockRatio) S.cmx = S.cmy; if (X || Y) S.scaled = true; }
function calOk() { const len = parseFloat(S.calLen); if (!(len > 0)) { toast('ใส่ระยะจริง (ซม.) ก่อน'); const i = $('[data-in="calLen"]', root); if (i) i.focus(); return; }
  if (S.cal.length < 2) return; const ax = S.calAxis === 'y' ? 'y' : 'x', a = toImg(S.cal[0]), b = toImg(S.cal[1]), d = ax === 'x' ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  if (d < 3) { toast(ax === 'x' ? '2 จุดแนวนอนใกล้กันเกินไป — วางที่ขอบซ้าย / ขวาของแผ่น' : '2 จุดแนวตั้งใกล้กันเกินไป — วางที่ขอบบน / ล่างของแผ่น'); return; }
  push(); S['dim' + ax] = { a, b, len }; applyDims(); S.cal = []; S.calLen = ''; S.act = null;
  const next = ax === 'x' && !S.dimy ? 'y' : ax === 'y' && !S.dimx ? 'x' : '';
  if (next) { loadAxis(next); fit(); ui(); autosave(); toast((ax === 'x' ? '↔ กว้าง ' : '↕ สูง ') + fmt(len) + ' ซม. แล้ว — ต่อไป: ' + (next === 'y' ? '↕ แนวตั้ง แตะขอบบน / ล่างของแผ่น' : '↔ แนวนอน แตะขอบซ้าย / ขวา') + ' (หรือกด เสร็จ)'); return; }
  S.tool = 'move'; fit(); ui(); autosave(); toast('ตั้งขนาดแผ่นแล้ว — ↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') + ' ซม.'); }
function setSize(w, h, which) { if (!(w > 0) || !(h > 0)) return; push(); S.dimx = S.dimy = null;   // พิมพ์ขนาดทั้งรูป = ใช้ขอบรูปแทนจุดบนแผ่น
  if (S.lockRatio) { const k = which === 'h' ? h / IH() : w / IW(); S.cmx *= k; S.cmy *= k; } else { S.cmx = w / S.img.width; S.cmy = h / S.img.height; } S.scaled = true; fit(); ui(); autosave(); }
// ---------- ดัดมุมมอง 4 มุม ----------
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; const p = A[i][i]; if (Math.abs(p) < 1e-12) return null;
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / p; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
function homography(dst, src) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [u, v] = dst[i], [x, y] = src[i]; A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); } return solve(A, b); }
async function perspOk() { const W0 = parseFloat(S.pw), H0 = parseFloat(S.ph); if (!(W0 > 0) || !(H0 > 0)) { toast('ใส่ขนาดจริง กว้าง × สูง (ซม.) ก่อน'); return; }
  const q = S.persp.map(([x, y]) => [x / S.cmx, y / S.cmy]);
  await busy('กำลังดัดรูป…', async () => {
    const srcPx = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])); let k = srcPx / W0; k = Math.min(k, 4200 / Math.max(W0, H0)); k = Math.max(k, 1);
    const ow = Math.max(2, Math.round(W0 * k)), oh = Math.max(2, Math.round(H0 * k));
    const h = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], q); if (!h) { toast('มุมที่วางใช้ไม่ได้ — ลองใหม่'); return; }
    const sc = S.img, sw = sc.width, sh = sc.height, sd = sc.getContext('2d').getImageData(0, 0, sw, sh).data;
    const out = document.createElement('canvas'); out.width = ow; out.height = oh; const og = out.getContext('2d'), od = og.createImageData(ow, oh), D = od.data;
    for (let v = 0; v < oh; v++) for (let u = 0; u < ow; u++) { const w0 = h[6] * u + h[7] * v + 1, x = (h[0] * u + h[1] * v + h[2]) / w0, y = (h[3] * u + h[4] * v + h[5]) / w0, o = (v * ow + u) * 4;
      if (x < 0 || y < 0 || x >= sw - 1 || y >= sh - 1) { D[o + 3] = 0; continue; } const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) D[o + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy; D[o + 3] = 255; }
    og.putImageData(od, 0, 0);
    S.prevImg = { img: S.img, st: JSON.stringify(snapData()), hist: S.hist.slice() }; push(); S.histImgAt = S.hist.length; S.imgDirty = true;
    S.img = out; S.cmx = S.cmy = W0 / ow; S.scaled = true; S.dimx = S.dimy = null; S.shapes = []; S.lines = []; S.lsel = []; S.guides = []; S.sel = []; S.persp = []; S.act = null; S.tool = 'move'; fit(); ui(); autosave(); toast('ดัดรูปแล้ว — แผ่นจริง ' + fmt(W0) + ' × ' + fmt(H0) + ' ซม.'); }); }
// ---------- ชิ้นงาน ----------
function addShape(t, x, y, w, h, extra) { if (t === 'sq' || t === 'circle') h = w; const p = { id: uid(), n: String(S.next++), t, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rot: 0, c: S.color, op: S.opDef, lo: S.lineDef, ...(t === 'poly' ? { sides: S.sides } : {}), ...(extra || {}) }; S.shapes.push(p); return p; }
function afterCreate(p) { if (p && p.id) S.sel = [p.id]; if (!S.repeat) S.tool = 'move'; ui(); autosave(); }
function makePattern() { const P = one(); if (!P) return; const b0 = bbox(P), g = S.joint / 10, sw = b0[2] + g, sh = b0[3] + g; let c = Math.max(1, S.pat.c | 0), r = Math.max(1, S.pat.r | 0);
  if (S.pat.fill) { c = Math.max(1, Math.floor((IW() - b0[0] + g) / sw)); r = Math.max(1, Math.floor((IH() - b0[1] + g) / sh)); }
  push(); let n = 0; const cp = (dx, dy) => { const q = JSON.parse(JSON.stringify(P)); q.id = uid(); q.n = String(S.next++); q.lock = false; q.x = r1(P.x + dx); q.y = r1(P.y + dy); S.shapes.push(q); n++; };
  for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) { if (!i && !j) continue; cp(i * sw, j * sh); }
  if (S.pat.cut && S.pat.fill && (P.t === 'rect' || P.t === 'sq') && !((P.rot || 0) % 180)) { const rw = r1(IW() - (b0[0] + c * sw)), rh = r1(IH() - (b0[1] + r * sh)); const rect = (dx, dy, w, h) => { S.shapes.push({ id: uid(), n: String(S.next++), t: 'rect', x: r1(b0[0] + dx), y: r1(b0[1] + dy), w, h, rot: 0, c: P.c }); n++; };
    if (rw >= 1) for (let j = 0; j < r; j++) rect(c * sw, j * sh, rw, b0[3]); if (rh >= 1) for (let i = 0; i < c; i++) rect(i * sw, r * sh, b0[2], rh); if (rw >= 1 && rh >= 1) rect(c * sw, r * sh, rw, rh); }
  ui(); autosave(); toast('สร้างแพทเทิร์นแล้ว +' + n + ' ชิ้น'); }
function renum() { push(); const L = S.shapes.slice().sort((a, b) => (Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x)); L.forEach((p, i) => { p.n = String(i + 1); }); S.next = L.length + 1; ui(); autosave(); }
function simplify(P, eps) { if (P.length < 3) return P; let dm = 0, idx = 0; const a = P[0], b = P[P.length - 1]; for (let i = 1; i < P.length - 1; i++) { const d = segD(P[i][0], P[i][1], a, b); if (d > dm) { dm = d; idx = i; } }
  if (dm > eps) { const l = simplify(P.slice(0, idx + 1), eps), r = simplify(P.slice(idx), eps); return l.slice(0, -1).concat(r); } return [a, b]; }
function freeFrom(pts) { if (pts.length < 3) return null; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y; if (w < 1 || h < 1) return null;
  const cx = x + w / 2, cy = y + h / 2; return addShape('free', x, y, w, h, { pts: pts.map(([px, py]) => [(px - cx) / w, (py - cy) / h]) }); }
// ---------- วาด ----------
function draw() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
function pathOf(g, s) { const z = S.view.z; g.beginPath(); if (s.t === 'circle' || s.t === 'ellipse') { const [cx, cy] = toS(...ctr(s)); g.ellipse(cx, cy, Math.max(.5, s.w / 2 * z), Math.max(.5, s.h / 2 * z), (s.rot || 0) * D2R, 0, Math.PI * 2); return; }
  wverts(s).forEach((v, i) => { const [sx, sy] = toS(v[0], v[1]); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); g.closePath(); }
function label(g, txt, x, y, fs, bold) { g.font = `${bold ? 800 : 600} ${fs}px "IBM Plex Sans Thai",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(txt, x, y); g.fillStyle = '#fff'; g.fillText(txt, x, y); }
function paint() { if (!ctx) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#1E1C18'; ctx.fillRect(0, 0, W, H); if (!S.img) { lcv.hidden = true; return; }
  const z = S.view.z, [x0, y0] = toS(0, 0), iw = IW() * z, ih = IH() * z;
  ctx.imageSmoothingEnabled = z * Math.min(S.cmx, S.cmy) < 2; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(S.img, x0, y0, iw, ih); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, y0 + .5, iw, ih);
  if (S.scaled && !S.dimx && !S.dimy) slabDims(x0, y0, iw, ih);
  if (S.grid.on) { let st = S.grid.step; while (st * z < 7) st *= 2; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip(); ctx.lineWidth = 1;
    const gx0 = Math.max(0, Math.floor(-x0 / z / st) * st), gx1 = Math.min(IW(), (W - x0) / z), gy0 = Math.max(0, Math.floor(-y0 / z / st) * st), gy1 = Math.min(IH(), (H - y0) / z);
    for (let gx = gx0; gx <= gx1 + 1e-6; gx += st) { const sx = Math.round(x0 + gx * z) + .5; ctx.strokeStyle = (Math.round(gx) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y0 + ih); ctx.stroke(); }
    for (let gy = gy0; gy <= gy1 + 1e-6; gy += st) { const sy = Math.round(y0 + gy * z) + .5; ctx.strokeStyle = (Math.round(gy) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + iw, sy); ctx.stroke(); }
    ctx.restore(); }
  dimEdges();
  if (S.guidesOn) { ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 1.5; S.guides.forEach((g, i) => { ctx.strokeStyle = S.dragG === i ? '#FFD54A' : '#22D3EE'; ctx.beginPath(); if (g.o === 'v') { const sx = toS(g.p, 0)[0]; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); } else { const sy = toS(0, g.p)[1]; ctx.moveTo(0, sy); ctx.lineTo(W, sy); } ctx.stroke(); }); ctx.restore(); }
  S.shapes.forEach((s) => { const on = S.sel.indexOf(s.id) >= 0; pathOf(ctx, s); ctx.fillStyle = hexA(s.c, fo(s)); ctx.fill(); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = on ? '#FFD54A' : hexA(s.c, lo(s)); if (s.lock) ctx.setLineDash([8, 4]); ctx.stroke(); ctx.setLineDash([]);
    const [cx, cy] = toS(...ctr(s)), pw = s.w * z, ph = s.h * z, fs = Math.max(10, Math.min(28, Math.min(pw, ph) / 3.2));
    if (pw > 24 && ph > 18) { const sd = S.dims && !s.nd; label(ctx, (s.lock ? '🔒' : '') + s.n, cx, cy - (sd && ph > fs * 2.6 ? fs * .45 : 0), fs, true); if (sd && ph > fs * 2.6 && pw > 46) label(ctx, s.t === 'circle' ? '⌀' + fmt(s.w) : fmt(s.w) + '×' + fmt(s.h), cx, cy + fs * .55, Math.max(10, fs * .5)); } });
  paintLines(ctx);
  const s1 = one(); if (s1) {
    if (!((s1.rot || 0) % 360)) { const [ax, ay] = toS(s1.x, s1.y), pw = s1.w * z, ph = s1.h * z; ctx.save(); ctx.strokeStyle = '#FFD54A'; ctx.lineWidth = 1; const t = 14;
      ctx.beginPath(); ctx.moveTo(ax, ay - t); ctx.lineTo(ax + pw, ay - t); ctx.moveTo(ax, ay - t - 4); ctx.lineTo(ax, ay - t + 4); ctx.moveTo(ax + pw, ay - t - 4); ctx.lineTo(ax + pw, ay - t + 4);
      ctx.moveTo(ax + pw + t, ay); ctx.lineTo(ax + pw + t, ay + ph); ctx.moveTo(ax + pw + t - 4, ay); ctx.lineTo(ax + pw + t + 4, ay); ctx.moveTo(ax + pw + t - 4, ay + ph); ctx.lineTo(ax + pw + t + 4, ay + ph); ctx.stroke(); ctx.restore();
      label(ctx, fmt(s1.w) + ' ซม.', ax + pw / 2, ay - t - 10, 12); ctx.save(); ctx.translate(ax + pw + t + 12, ay + ph / 2); ctx.rotate(Math.PI / 2); label(ctx, fmt(s1.h) + ' ซม.', 0, 0, 12); ctx.restore(); }
    if (!s1.lock) { const hs = touchy() ? 9 : 5; handles(s1).forEach((hd) => { const [hx, hy] = toS(hd.p[0], hd.p[1]);
      if (hd.k === 'rot') { const [tx, ty] = toS(...wld(s1, 0, -s1.h / 2)); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, hs + 1, 0, 7); ctx.fillStyle = '#0E7490'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
      else { ctx.beginPath(); ctx.rect(hx - hs, hy - hs, hs * 2, hs * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#1C1B18'; ctx.lineWidth = 1.5; ctx.stroke(); } }); } }
  userDims();
  if (S.snapHit && S.dragging) { ctx.save(); ctx.strokeStyle = '#FF3DA6'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); if (S.snapHit.x != null) { const sx = toS(S.snapHit.x, 0)[0]; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke(); } if (S.snapHit.y != null) { const sy = toS(0, S.snapHit.y)[1]; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); } ctx.restore(); }
  const ptsDraw = (L, close, col, key) => { if (!L.length) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); L.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); if (close && L.length > 2) ctx.closePath(); ctx.stroke();
    L.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); const act = S.act && S.act.L === key && S.act.i === i; ctx.beginPath(); ctx.arc(sx, sy, act ? 9 : 7, 0, 7); ctx.fillStyle = act ? '#FF3DA6' : col; ctx.fill(); ctx.strokeStyle = '#1C1B18'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 13, sy); ctx.lineTo(sx - 4, sy); ctx.moveTo(sx + 4, sy); ctx.lineTo(sx + 13, sy); ctx.moveTo(sx, sy - 13); ctx.lineTo(sx, sy - 4); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx, sy + 13); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }); ctx.restore(); };
  if (S.tool === 'scale') ptsDraw(S.cal, false, '#FFD54A', 'cal'); if (S.tool === 'persp') ptsDraw(S.persp, true, '#FFD54A', 'persp'); if (S.tool === 'free' && S.freeMode === 'pts') ptsDraw(S.drawPts, false, S.color, 'draw');
  if (S.tool === 'cad') cadPreview(); osMark();
  if (S.meas) { ptsDraw([S.meas.a, S.meas.b], false, '#22D3EE', 'meas'); const [ax, ay] = toS(...S.meas.a), [bx, by] = toS(...S.meas.b); label(ctx, fmt(Math.hypot(S.meas.b[0] - S.meas.a[0], S.meas.b[1] - S.meas.a[1])) + ' ซม.', (ax + bx) / 2, (ay + by) / 2 - 14, 13, true); }
  if (S.tool === 'scale' && S.cal.length === 2) { const [ax, ay] = toS(...S.cal[0]), [bx, by] = toS(...S.cal[1]); label(ctx, S.calLen ? S.calLen + ' ซม.' : '? ซม.', (ax + bx) / 2, (ay + by) / 2 - 14, 13, true); }
  if (drag && drag.t === 'newPt') { const [sx, sy] = toS(...drag.w); ctx.save(); ctx.strokeStyle = '#FF3DA6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 7); ctx.stroke(); ctx.restore(); }
  if (S.rotLabel && drag && drag.t === 'rotate') { const s = S.rotLabel.s, [cx, cy] = toS(...ctr(s)); ctx.save(); ctx.fillStyle = 'rgba(14,116,144,.92)'; const tx = Math.round(s.rot) + '°', tw = 64; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - tw / 2, cy - 54, tw, 28, 8) : ctx.rect(cx - tw / 2, cy - 54, tw, 28); ctx.fill(); ctx.restore(); label(ctx, tx, cx, cy - 40, 16, true); }
  if (drag && drag.t === 'create' && drag.live) { const s = drag.live; pathOf(ctx, s); ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = S.color; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); const [cx, cy] = toS(...ctr(s)); label(ctx, s.t === 'circle' ? '⌀' + fmt(s.w) : fmt(s.w) + '×' + fmt(s.h), cx, cy, 13, true); }
  if (drag && drag.t === 'free' && drag.pts.length > 1) { ctx.save(); ctx.strokeStyle = S.color; ctx.lineWidth = 2; ctx.beginPath(); drag.pts.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); ctx.stroke(); ctx.restore(); }
  if (S.tool === 'shape' && S.hover && !drag && !touchy()) { const [hx, hy] = previewXY(S.hover); const s = { t: S.shape, x: hx, y: hy, w: S.defW, h: S.shape === 'sq' || S.shape === 'circle' ? S.defW : S.defH, rot: 0, sides: S.sides }; pathOf(ctx, s); ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = S.color; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  loupe(); }
function previewXY([x, y]) { const w = S.defW, h = S.shape === 'sq' || S.shape === 'circle' ? S.defW : S.defH; const sx = snapAxis([x, x + w], 'x'), sy = snapAxis([y, y + h], 'y'); return [x + sx.d, y + sy.d]; }
const fo = (s) => Math.max(0, Math.min(100, s.op == null ? S.opDef : s.op)) / 100, lo = () => 0.7;   // ความทึบพื้นชิ้น / เส้นตัด
// เส้นบอกขนาดแผ่น (หลังตั้งสเกล) — บนขอบบน + ขอบซ้ายของรูป · ถ้าชิดขอบจอให้วาดด้านใน
// เส้นประตามขอบผ่านจุดขนาด: ↔ = เส้นตั้ง 2 เส้น · ↕ = เส้นนอน 2 เส้น → รวมกันเป็นกรอบแผ่นตามที่ตั้ง (เห็นทันทีถ้าจุดไม่ตรงขอบแผ่น)
function dimEdges() { const [x0, y0] = toS(0, 0), x1 = x0 + IW() * S.view.z, y1 = y0 + IH() * S.view.z, g = ctx; g.save(); g.strokeStyle = 'rgba(255,213,74,.85)'; g.lineWidth = 1.5; g.setLineDash([10, 6]);
  const line = (ax, a, b, c) => { g.beginPath(); if (ax === 'v') { g.moveTo(a, b); g.lineTo(a, c); } else { g.moveTo(b, a); g.lineTo(c, a); } g.stroke(); };
  ['x', 'y'].forEach((ax) => { const d = S['dim' + ax]; if (!d || (S.tool === 'scale' && S.calAxis === ax)) return; [d.a, d.b].forEach((P) => { const [sx, sy] = toS(...fromImg(P)); if (ax === 'x') line('v', sx, y0, y1); else line('h', sy, x0, x1); }); });
  if (S.tool === 'scale') { const ax = S.calAxis === 'y' ? 'h' : 'v'; const L = S.cal.slice(); if (drag && drag.t === 'newPt' && drag.key === 'cal') L.push(drag.w); g.strokeStyle = 'rgba(255,61,166,.9)'; g.setLineDash([4, 4]);
    L.forEach((P) => { const [sx, sy] = toS(P[0], P[1]); if (ax === 'v') line('v', sx, y0, y1); else line('h', sy, x0, x1); }); }
  g.restore(); }
// เส้นขนาดที่ผู้ใช้ตั้งจากจุดบนแผ่น — แสดงตลอด (ยกเว้นแกนที่กำลังแก้ในเครื่องมือตั้งสเกล)
function userDims(g0) { const col = '#FFD54A', g = g0 || ctx;
  const tag = (txt, x, y, r) => { g.save(); g.translate(x, y); if (r) g.rotate(-Math.PI / 2); g.font = '800 13px "IBM Plex Sans Thai",system-ui,sans-serif'; const w = g.measureText(txt).width + 14; g.fillStyle = 'rgba(28,27,24,.92)'; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.rect(-w / 2, -11, w, 22); g.fill(); g.stroke(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore(); };
  const arrow = (x, y, dx, dy) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 9 - dy * 4, y + dy * 9 + dx * 4); g.moveTo(x, y); g.lineTo(x + dx * 9 + dy * 4, y + dy * 9 - dx * 4); g.stroke(); };
  ['x', 'y'].forEach((ax) => { const d = S['dim' + ax]; if (!d || S.dimH[ax] || (S.tool === 'scale' && S.calAxis === ax)) return; const A = toS(...fromImg(d.a)), B = toS(...fromImg(d.b)); g.save(); g.strokeStyle = col; g.lineWidth = 1.6; g.setLineDash([]);
    const G = dimGeo(ax, d); if (ax === 'x') { const y = G.at, l = G.lo, r = G.hi; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(A[0], y); g.moveTo(B[0], B[1]); g.lineTo(B[0], y); g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1;
      g.beginPath(); g.moveTo(l, y); g.lineTo(r, y); g.stroke(); arrow(l, y, 1, 0); arrow(r, y, -1, 0); [A, B].forEach((P) => { g.beginPath(); g.arc(P[0], P[1], 3.5, 0, 7); g.fillStyle = col; g.fill(); }); g.restore(); tag('↔ ' + fmt(d.len) + ' ซม.', G.tx, G.ty, false); }
    else { const x = G.at, t = G.lo, b = G.hi; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(x, A[1]); g.moveTo(B[0], B[1]); g.lineTo(x, B[1]); g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1;
      g.beginPath(); g.moveTo(x, t); g.lineTo(x, b); g.stroke(); arrow(x, t, 0, 1); arrow(x, b, 0, -1); [A, B].forEach((P) => { g.beginPath(); g.arc(P[0], P[1], 3.5, 0, 7); g.fillStyle = col; g.fill(); }); g.restore(); tag('↕ ' + fmt(d.len) + ' ซม.', G.tx, G.ty, true); } }); }
// ตำแหน่งเส้นขนาดบนจอ — d.o = ระยะเลื่อนเส้นออกจากจุดที่ตั้ง (หน่วยพิกเซลรูป ตั้งฉากกับเส้น) · d.tp = ตำแหน่งป้ายตามแนวเส้น (0–1)
// ลากเส้น / ป้ายออกไปวางที่ว่างได้อิสระ (ผู้ใช้ขอ 21/11/2026) — จุดที่ตั้งบนแผ่นอยู่ที่เดิม สเกลไม่เปลี่ยน
function dimGeo(ax, d) { const A = toS(...fromImg(d.a)), B = toS(...fromImg(d.b)), tp = d.tp == null ? 0.27 : d.tp, z = S.view.z;
  if (ax === 'x') { const at = (A[1] + B[1]) / 2 + (d.o || 0) * S.cmy * z, lo = Math.min(A[0], B[0]), hi = Math.max(A[0], B[0]); return { A, B, at, lo, hi, tx: lo + (hi - lo) * tp, ty: at - 14 }; }
  const at = (A[0] + B[0]) / 2 + (d.o || 0) * S.cmx * z, lo = Math.min(A[1], B[1]), hi = Math.max(A[1], B[1]); return { A, B, at, lo, hi, tx: at - 14, ty: lo + (hi - lo) * tp }; }
// แตะโดนเส้นขนาด / ป้าย → { ax, tag } · ป้ายมาก่อนเสมอ · ตัวเส้นนับเฉพาะเมื่อไม่ได้ทับชิ้นงาน
function hitDimLine(sx, sy, wx, wy) { const r = touchy() ? 14 : 7; let line = null;
  for (const ax of ['x', 'y']) { const d = S['dim' + ax]; if (!d || S.dimH[ax]) continue; const G = dimGeo(ax, d), hw = 46 + (touchy() ? 8 : 0), hh = 13 + (touchy() ? 8 : 0);
    if (ax === 'x' ? (Math.abs(sx - G.tx) <= hw && Math.abs(sy - G.ty) <= hh) : (Math.abs(sx - G.tx) <= hh && Math.abs(sy - G.ty) <= hw)) return { ax, tag: true };
    const u = ax === 'x' ? sx : sy, v = ax === 'x' ? sy : sx; if (!line && Math.abs(v - G.at) <= r && u >= G.lo - r && u <= G.hi + r) line = { ax, tag: false }; }
  return line && !hitAny(wx, wy) ? line : null; }
function slabDims(x0, y0, iw, ih) { const g = ctx, col = '#E2BC66', o = 16; g.save(); g.strokeStyle = col; g.lineWidth = 1.5;
  const ty = y0 - o >= 12 ? y0 - o : y0 + o, lx = x0 - o >= 12 ? x0 - o : x0 + o;
  g.beginPath(); if (!S.dimH.x) { g.moveTo(x0, ty); g.lineTo(x0 + iw, ty); g.moveTo(x0, ty - 6); g.lineTo(x0, ty + 6); g.moveTo(x0 + iw, ty - 6); g.lineTo(x0 + iw, ty + 6); }
  if (!S.dimH.y) { g.moveTo(lx, y0); g.lineTo(lx, y0 + ih); g.moveTo(lx - 6, y0); g.lineTo(lx + 6, y0); g.moveTo(lx - 6, y0 + ih); g.lineTo(lx + 6, y0 + ih); } g.stroke(); g.restore();
  const tag = (txt, x, y, r) => { g.save(); g.translate(x, y); if (r) g.rotate(-Math.PI / 2); g.font = '800 13px "IBM Plex Sans Thai",system-ui,sans-serif'; const w = g.measureText(txt).width + 14; g.fillStyle = '#1C1B18'; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.rect(-w / 2, -11, w, 22); g.fill(); g.stroke(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore(); };
  if (!S.dimH.x) tag('แผ่น ' + fmt(IW()) + ' ซม.', Math.max(70, Math.min(W - 70, x0 + iw / 2)), ty, false); if (!S.dimH.y) tag(fmt(IH()) + ' ซม.', lx, Math.max(60, Math.min(H - 60, y0 + ih / 2)), true); }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// แว่นขยาย 3× เหนือนิ้ว (แสดงขณะวางจุด / ลากที่จับ / ลากจุด / วัดระยะ)
function loupe() { const L = S.loupe; if (!L) { lcv.hidden = true; return; } lcv.hidden = false; const size = 150, k = 3, r = size / 2;
  let lx = L.sx - r, ly = L.sy - size - 46; if (ly < 4) ly = L.sy + 46; lx = Math.max(4, Math.min(W - size - 4, lx)); lcv.style.left = lx + 'px'; lcv.style.top = ly + 'px';
  const src = size / k * DPR, g = lctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lcv.width, lcv.height); g.save(); g.beginPath(); g.arc(lcv.width / 2, lcv.height / 2, lcv.width / 2, 0, 7); g.clip(); g.fillStyle = '#111'; g.fillRect(0, 0, lcv.width, lcv.height);
  g.imageSmoothingEnabled = false; g.drawImage(cv, L.sx * DPR - src / 2, L.sy * DPR - src / 2, src, src, 0, 0, lcv.width, lcv.height); g.restore();
  const c = lcv.width / 2; g.strokeStyle = '#FF3DA6'; g.lineWidth = 1.5 * DPR; g.beginPath(); g.moveTo(c - 26 * DPR, c); g.lineTo(c - 5 * DPR, c); g.moveTo(c + 5 * DPR, c); g.lineTo(c + 26 * DPR, c); g.moveTo(c, c - 26 * DPR); g.lineTo(c, c - 5 * DPR); g.moveTo(c, c + 5 * DPR); g.lineTo(c, c + 26 * DPR); g.stroke();
  const [wx, wy] = toW(L.sx, L.sy); g.font = `600 ${11 * DPR}px "IBM Plex Sans Thai",sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(c - 52 * DPR, lcv.height - 30 * DPR, 104 * DPR, 18 * DPR); g.fillStyle = '#fff'; g.fillText(fmt(wx) + ', ' + fmt(wy) + ' ซม.', c, lcv.height - 17 * DPR); }
// ---------- เส้น CAD (ผู้บริหารสั่ง 21/11/2026 "draw irregular geometry line + circle · trim · extend · delete · like AutoCAD") ----------
// S.lines: { id, col, t:'ln', a, b } · { t:'arc', o, r, a0, a1 } (โค้งจาก a0 ไปทางมุมเพิ่มถึง a1 · เรเดียน) · { t:'cir', o, r } — หน่วย ซม.
const TAU = Math.PI * 2, nrm = (a) => ((a % TAU) + TAU) % TAU;
const CADS = [['line', '⟋', 'เส้นตรง', 'เส้นตรงต่อเนื่อง (Line / Polyline)'], ['arc', '◠', 'โค้ง', 'ส่วนโค้ง 3 จุด (Arc)'], ['circle', '◯', 'วงกลม', 'วงกลม (Circle)']];
const CEDS = [['trim', '✂', 'ตัด', 'ตัดเส้น (Trim)'], ['extend', '⇥', 'ยืด', 'ยืดเส้น (Extend)'], ['offset', '⫽', 'ขนาน', 'เส้นขนาน (Offset)'], ['erase', '🗑', 'ลบ', 'ลบ (Erase)'], ['explode', '✳', 'แตกชิ้น', 'แตกชิ้นงานเป็นเส้น (Explode)'], ['region', '⬚', 'เป็นชิ้น', 'ทำเป็นชิ้นงาน (Region)']];
const LNAME = { ln: 'เส้นตรง', arc: 'ส่วนโค้ง', cir: 'วงกลม' };
const OSK = { end: 'จุดปลาย', mid: 'กึ่งกลาง', cen: 'ศูนย์กลาง', int: 'จุดตัด', cor: 'มุม' };
const sweep = (e) => { const s = nrm(e.a1 - e.a0); return s < 1e-9 ? TAU : s; };
const onC = (o, r, a) => [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a)];
const angOf = (o, p) => Math.atan2(p[1] - o[1], p[0] - o[0]);
const inSw = (e, a, eps) => nrm(a - e.a0) <= sweep(e) + (eps || 1e-9);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const lselected = () => S.lines.filter((e) => S.lsel.indexOf(e.id) >= 0);
function lEnds(e) { return e.t === 'ln' ? [e.a, e.b] : e.t === 'arc' ? [onC(e.o, e.r, e.a0), onC(e.o, e.r, e.a1)] : []; }
function lLen(e) { return e.t === 'ln' ? dist(e.a, e.b) : e.t === 'arc' ? e.r * sweep(e) : TAU * e.r; }
function lAng(e) { return nrm(Math.atan2(-(e.b[1] - e.a[1]), e.b[0] - e.a[0])) / D2R; }   // 0° = ขวา · 90° = ขึ้น
function lMid(e) { return e.t === 'ln' ? lerp(e.a, e.b, 0.5) : e.t === 'arc' ? onC(e.o, e.r, e.a0 + sweep(e) / 2) : onC(e.o, e.r, -Math.PI / 4); }
function lDist(e, p) { if (e.t === 'ln') return segD(p[0], p[1], e.a, e.b); const d = Math.abs(dist(p, e.o) - e.r); if (e.t === 'cir' || inSw(e, angOf(e.o, p))) return d; const [s, f] = lEnds(e); return Math.min(dist(p, s), dist(p, f)); }
function shiftL(e, dx, dy) { return e.t === 'ln' ? { a: [r1c(e.a[0] + dx), r1c(e.a[1] + dy)], b: [r1c(e.b[0] + dx), r1c(e.b[1] + dy)] } : { o: [r1c(e.o[0] + dx), r1c(e.o[1] + dy)] }; }
const r1c = (v) => Math.round(v * 1000) / 1000;
function arc3(p1, p2, p3) { const [ax, ay] = p1, [bx, by] = p2, [cx, cy] = p3, d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(d) < 1e-9) return null;
  const A = ax * ax + ay * ay, B = bx * bx + by * by, C = cx * cx + cy * cy, o = [(A * (by - cy) + B * (cy - ay) + C * (ay - by)) / d, (A * (cx - bx) + B * (ax - cx) + C * (bx - ax)) / d];
  let a0 = nrm(angOf(o, p1)), a1 = nrm(angOf(o, p3)); if (nrm(angOf(o, p2) - a0) > nrm(a1 - a0)) [a0, a1] = [a1, a0]; return { t: 'arc', o, r: dist(o, p1), a0, a1 }; }
// ---- ขอบสำหรับตัด / ยืด / จุดตัด: เส้น CAD · ขอบชิ้นงาน · ขอบแผ่น · เส้นไกด์ ----
function slabRect() { const X = S.dimx, Y = S.dimy; let x0 = 0, x1 = IW(), y0 = 0, y1 = IH(); if (X) { const a = fromImg(X.a)[0], b = fromImg(X.b)[0]; x0 = Math.min(a, b); x1 = Math.max(a, b); } if (Y) { const a = fromImg(Y.a)[1], b = fromImg(Y.b)[1]; y0 = Math.min(a, b); y1 = Math.max(a, b); } return [x0, y0, x1, y1]; }
function primOf(e) { return e.t === 'ln' ? { k: 'L', p: e.a, q: e.b } : { k: 'C', o: e.o, r: e.r, arc: e.t === 'arc' ? e : null }; }
function piecePrims(s) { if (s.t === 'circle') return [{ k: 'C', o: ctr(s), r: s.w / 2 }]; const V = wverts(s); return V.map((v, i) => ({ k: 'L', p: v, q: V[(i + 1) % V.length] })); }
function bounds(skipId) { const B = []; S.lines.forEach((e) => { if (e.id !== skipId) B.push(primOf(e)); }); S.shapes.forEach((s) => piecePrims(s).forEach((p) => B.push(p)));
  const [x0, y0, x1, y1] = slabRect(); [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]].forEach(([p, q]) => B.push({ k: 'L', p, q }));
  if (S.guidesOn) S.guides.forEach((g) => B.push(g.o === 'v' ? { k: 'L', p: [g.p, -1e5], q: [g.p, 1e5] } : { k: 'L', p: [-1e5, g.p], q: [1e5, g.p] })); return B; }
const U = 1e-7;
function xLL(p, q, r, s) { const d1 = [q[0] - p[0], q[1] - p[1]], d2 = [s[0] - r[0], s[1] - r[1]], den = cross(d1, d2); if (Math.abs(den) < 1e-12) return null; const w = [r[0] - p[0], r[1] - p[1]]; return { t: cross(w, d2) / den, u: cross(w, d1) / den }; }
function xLC(p, q, o, r) { const d = [q[0] - p[0], q[1] - p[1]], f = [p[0] - o[0], p[1] - o[1]], A = d[0] * d[0] + d[1] * d[1], B = 2 * (f[0] * d[0] + f[1] * d[1]), C = f[0] * f[0] + f[1] * f[1] - r * r, D = B * B - 4 * A * C; if (A < 1e-12 || D < -1e-9) return []; const sq = Math.sqrt(Math.max(0, D)); return sq < 1e-9 ? [-B / (2 * A)] : [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]; }
function xCC(o1, r1, o2, r2) { const d = dist(o1, o2); if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return []; const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a)), m = lerp(o1, o2, a / d), ux = (o2[0] - o1[0]) / d, uy = (o2[1] - o1[1]) / d; return h < 1e-9 ? [m] : [[m[0] - uy * h, m[1] + ux * h], [m[0] + uy * h, m[1] - ux * h]]; }
const inC = (b, pt) => !b.arc || inSw(b.arc, angOf(b.o, pt), 1e-7);
// จุดตัดของเส้น e (คิดเป็นเส้นยาวไม่สิ้นสุด / วงกลมเต็มวง) กับขอบ B → ค่าบน e (เส้นตรง: t ตามแนว a→b · โค้ง / วงกลม: มุม)
function cuts(e, B) { const P = primOf(e), out = [];
  B.forEach((b) => { if (P.k === 'L') { if (b.k === 'L') { const x = xLL(P.p, P.q, b.p, b.q); if (x && x.u >= -U && x.u <= 1 + U) out.push(x.t); } else xLC(P.p, P.q, b.o, b.r).forEach((t) => { if (inC(b, lerp(P.p, P.q, t))) out.push(t); }); }
    else if (b.k === 'L') xLC(b.p, b.q, P.o, P.r).forEach((u) => { if (u >= -U && u <= 1 + U) out.push(angOf(P.o, lerp(b.p, b.q, u))); });
    else xCC(P.o, P.r, b.o, b.r).forEach((pt) => { if (inC(b, pt)) out.push(angOf(P.o, pt)); }); }); return out; }
function xPts(a, b) { const out = []; if (a.k === 'L' && b.k === 'L') { const x = xLL(a.p, a.q, b.p, b.q); if (x && x.t >= -U && x.t <= 1 + U && x.u >= -U && x.u <= 1 + U) out.push(lerp(a.p, a.q, x.t)); }
  else if (a.k === 'L' || b.k === 'L') { const L = a.k === 'L' ? a : b, C = a.k === 'L' ? b : a; xLC(L.p, L.q, C.o, C.r).forEach((t) => { const pt = lerp(L.p, L.q, t); if (t >= -U && t <= 1 + U && inC(C, pt)) out.push(pt); }); }
  else xCC(a.o, a.r, b.o, b.r).forEach((pt) => { if (inC(a, pt) && inC(b, pt)) out.push(pt); }); return out; }
function primD(b, p) { if (b.k === 'L') return segD(p[0], p[1], b.p, b.q); return b.arc ? lDist(b.arc, p) : Math.abs(dist(p, b.o) - b.r); }
// ---- Snap จุดของเส้น (Object Snap): จุดปลาย · กึ่งกลาง · ศูนย์กลาง · จุดตัด · มุมชิ้นงาน / มุมแผ่น ----
function osnap(wx, wy, skip) { if (!S.snap.on || S.noSnap || S.snap.obj === false) return null; const r = (touchy() ? 18 : 10) / S.view.z, P = [wx, wy]; let best = null;
  const take = (p, k, bias) => { const d = dist(p, P) - (bias || 0); if (dist(p, P) <= r && (!best || d < best.d)) best = { p: [p[0], p[1]], k, d }; };
  S.lines.forEach((e) => { if (e.id === skip) return; lEnds(e).forEach((q) => take(q, 'end', r * 0.3)); if (e.t !== 'cir') take(lMid(e), 'mid'); if (e.t !== 'ln') take(e.o, 'cen'); });
  S.shapes.forEach((s) => { if (s.t === 'circle' || s.t === 'ellipse') take(ctr(s), 'cen'); else if (s.t !== 'free' || (s.pts || []).length <= 64) wverts(s).forEach((v) => take(v, 'cor', r * 0.2)); });
  const [x0, y0, x1, y1] = slabRect(); [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach((v) => take(v, 'cor', r * 0.2));
  const near = bounds(skip).filter((b) => primD(b, P) <= r);
  for (let i = 0; i < near.length && i < 40; i++) for (let j = i + 1; j < near.length && j < 40; j++) xPts(near[i], near[j]).forEach((pt) => take(pt, 'int', r * 0.25));
  return best; }
function cadPt(wx, wy, skip) { const o = osnap(wx, wy, skip); S.osHit = o; if (o) { S.snapHit = null; return o.p; } const prev = S.cpts[S.cpts.length - 1];
  if (S.ortho && prev && !skip && S.cad === 'line') return Math.abs(wx - prev[0]) >= Math.abs(wy - prev[1]) ? [r1(wx), prev[1]] : [prev[0], r1(wy)]; const q = snapPt(wx, wy); return [r1(q[0]), r1(q[1])]; }   // จุดที่แตะเอง = ปัดทีละ 1 มม.
function hitLine(sx, sy) { const [wx, wy] = toW(sx, sy), tol = (touchy() ? 14 : 7) / S.view.z; let best = null, bd = tol; S.lines.forEach((e) => { const d = lDist(e, [wx, wy]); if (d <= bd) { bd = d; best = e; } }); return best; }
function lgrips(e) { if (e.t === 'ln') return [{ k: 'a', p: e.a }, { k: 'b', p: e.b }]; if (e.t === 'cir') return [{ k: 'o', p: e.o }, { k: 'r', p: onC(e.o, e.r, 0) }]; const [s, f] = lEnds(e); return [{ k: 's', p: s }, { k: 'm', p: lMid(e) }, { k: 'f', p: f }]; }
function hitGrip(sx, sy) { const L = lselected(); if (L.length !== 1) return null; const e = L[0], r = touchy() ? 18 : 9; for (const g of lgrips(e)) { const [gx, gy] = toS(...g.p); if (Math.hypot(gx - sx, gy - sy) <= r) return { e, g }; } return null; }
function lRestore(d) { d.start.forEach(([id, js]) => { const q = S.lines.find((x) => x.id === id); if (q) Object.assign(q, JSON.parse(js)); }); }
function moveGrip(e, k, p, o) { if (e.t === 'ln') { e[k] = p; return; } if (e.t === 'cir') { if (k === 'o') e.o = p; else e.r = Math.max(0.1, dist(p, e.o)); return; }
  const [s, f] = lEnds(o), m = lMid(o), a = arc3(k === 's' ? p : s, k === 'm' ? p : m, k === 'f' ? p : f); if (a) Object.assign(e, { o: a.o, r: a.r, a0: a.a0, a1: a.a1 }); }
// ---- เขียนเส้น ----
function cadAdd(p) { const L = S.cpts, prev = L[L.length - 1]; if (prev && dist(prev, p) < 1e-6) return;
  if (S.cad === 'line') { if (prev) { push(); const e = { id: uid(), col: S.color, t: 'ln', a: prev.slice(), b: p.slice() }; S.lines.push(e); S.chain.push(e.id); }
    L.push(p); if (L.length >= 3 && dist(p, L[0]) < 1e-6) { S.lastLoop = S.chain[0]; S.cpts = []; S.chain = []; toast('ปิดรูปแล้ว — กด ⬚ ทำเป็นชิ้นงาน เพื่อนับเป็นชิ้น / พื้นที่'); } }
  else if (S.cad === 'arc') { L.push(p); if (L.length === 3) { const a = arc3(L[0], L[1], L[2]); S.cpts = []; if (!a) toast('3 จุดอยู่แนวเดียวกัน — วางจุดกลางให้โค้ง'); else { push(); S.lines.push({ id: uid(), col: S.color, ...a }); toast('ส่วนโค้ง R ' + fmt(a.r) + ' ซม. · ยาว ' + fmt(a.r * sweep(a)) + ' ซม.'); } } }
  else { L.push(p); if (L.length === 2) { const r = dist(L[0], L[1]); S.cpts = []; if (r > 0.05) { push(); const e = { id: uid(), col: S.color, t: 'cir', o: L[0].slice(), r }; S.lines.push(e); S.lastLoop = e.id; toast('วงกลม R ' + fmt(r) + ' · ⌀ ' + fmt(r * 2) + ' ซม.'); } } }
  autosave(); fbar(); panel(); stat(); draw(); }
function cadPlace() { const prev = S.cpts[S.cpts.length - 1]; if (!prev) { toast('แตะวางจุดเริ่มก่อน'); return; }
  if (S.cad === 'line') { const len = parseFloat(S.cin.len), ang = (parseFloat(S.cin.ang) || 0) * D2R; if (!(len > 0)) { toast('ใส่ความยาว (ซม.) ก่อน'); return; } cadAdd([r1c(prev[0] + len * Math.cos(ang)), r1c(prev[1] - len * Math.sin(ang))]); }
  else if (S.cad === 'circle') { const r = parseFloat(S.cin.rad); if (!(r > 0)) { toast('ใส่รัศมี (ซม.) ก่อน'); return; } cadAdd([prev[0] + r, prev[1]]); } }
// ---- แก้เส้น: ตัด · ยืด · ขนาน · ลบ · แตกชิ้น · ทำเป็นชิ้นงาน ----
function replaceLine(e, parts) { const i = S.lines.indexOf(e); S.lines.splice(i, 1, ...parts.map((q) => ({ id: uid(), col: e.col, ...q }))); S.lsel = []; }
function trimAt(e, p) { const C = cuts(e, bounds(e.id));
  if (e.t === 'ln') { const d = [e.b[0] - e.a[0], e.b[1] - e.a[1]], tp = ((p[0] - e.a[0]) * d[0] + (p[1] - e.a[1]) * d[1]) / ((d[0] * d[0] + d[1] * d[1]) || 1), T = C.filter((t) => t > 1e-6 && t < 1 - 1e-6);
    const lo = Math.max(-1, ...T.filter((t) => t < tp)), hi = Math.min(2, ...T.filter((t) => t > tp)), parts = [];
    if (lo >= 0) parts.push({ t: 'ln', a: e.a.slice(), b: lerp(e.a, e.b, lo) }); if (hi <= 1) parts.push({ t: 'ln', a: lerp(e.a, e.b, hi), b: e.b.slice() }); push(); replaceLine(e, parts); return parts.length ? 'ตัดเส้นแล้ว' : 'ไม่มีเส้นตัดผ่าน — ลบทั้งเส้น (↶ ย้อนได้)'; }
  const ap = angOf(e.o, p);
  if (e.t === 'cir') { const us = C.map((a) => nrm(a - ap)).filter((u) => u > 1e-7 && u < TAU - 1e-7); if (us.length < 2 || Math.max(...us) - Math.min(...us) < 1e-6) return '!วงกลมต้องมีเส้นตัดผ่านอย่างน้อย 2 จุด';
    push(); replaceLine(e, [{ t: 'arc', o: e.o.slice(), r: e.r, a0: nrm(ap + Math.min(...us)), a1: nrm(ap + Math.max(...us)) }]); return 'ตัดวงกลมแล้ว'; }
  const sw = sweep(e), up = nrm(ap - e.a0), V = C.map((a) => nrm(a - e.a0)).filter((u) => u > 1e-6 && u < sw - 1e-6), lo = Math.max(-1, ...V.filter((u) => u < up)), hi = Math.min(99, ...V.filter((u) => u > up)), parts = [];
  if (lo >= 0) parts.push({ t: 'arc', o: e.o.slice(), r: e.r, a0: e.a0, a1: nrm(e.a0 + lo) }); if (hi < 99) parts.push({ t: 'arc', o: e.o.slice(), r: e.r, a0: nrm(e.a0 + hi), a1: e.a1 }); push(); replaceLine(e, parts); return parts.length ? 'ตัดส่วนโค้งแล้ว' : 'ไม่มีเส้นตัดผ่าน — ลบทั้งเส้น (↶ ย้อนได้)'; }
function extendAt(e, p) { if (e.t === 'cir') return '!วงกลมยืดไม่ได้ — ใช้ ✂ ตัด แทน'; const C = cuts(e, bounds(e.id));
  if (e.t === 'ln') { const atB = dist(p, e.b) <= dist(p, e.a), T = C.filter((t) => (atB ? t > 1 + 1e-6 : t < -1e-6)); if (!T.length) return '!ไม่มีเส้นขอบให้ยืดไปถึง';
    const t = atB ? Math.min(...T) : Math.max(...T), np = lerp(e.a, e.b, t); push(); if (atB) e.b = np; else e.a = np; return 'ยืดเส้นแล้ว — ยาว ' + fmt(lLen(e)) + ' ซม.'; }
  const [s, f] = lEnds(e), atEnd = dist(p, f) <= dist(p, s), room = TAU - sweep(e) - 1e-6, us = C.map((a) => (atEnd ? nrm(a - e.a1) : nrm(e.a0 - a))).filter((u) => u > 1e-6 && u < room);
  if (!us.length) return '!ไม่มีเส้นขอบให้ยืดไปถึง'; const u = Math.min(...us); push(); if (atEnd) e.a1 = nrm(e.a1 + u); else e.a0 = nrm(e.a0 - u); return 'ยืดส่วนโค้งแล้ว'; }
function offsetAt(e, p, d) { if (!(d > 0)) return '!ใส่ระยะ (ซม.) ก่อน'; let q;
  if (e.t === 'ln') { const L = dist(e.a, e.b) || 1, n = [-(e.b[1] - e.a[1]) / L, (e.b[0] - e.a[0]) / L], s = Math.sign((p[0] - e.a[0]) * n[0] + (p[1] - e.a[1]) * n[1]) || 1; q = { t: 'ln', a: [e.a[0] + n[0] * d * s, e.a[1] + n[1] * d * s], b: [e.b[0] + n[0] * d * s, e.b[1] + n[1] * d * s] }; }
  else { const r = dist(p, e.o) > e.r ? e.r + d : e.r - d; if (r <= 0.05) return '!ระยะมากกว่ารัศมี — วางด้านนอก หรือลดระยะ'; q = JSON.parse(JSON.stringify(e)); delete q.id; q.r = r; }
  push(); S.lines.push({ id: uid(), col: e.col, ...q }); return 'สร้างเส้นขนาน ห่าง ' + fmt(d) + ' ซม. แล้ว'; }
function explodePiece(s) { push(); const col = s.c; if (s.t === 'circle') S.lines.push({ id: uid(), col, t: 'cir', o: ctr(s), r: s.w / 2 }); else { const V = wverts(s).map((v) => [r1c(v[0]), r1c(v[1])]); V.forEach((v, i) => S.lines.push({ id: uid(), col, t: 'ln', a: v.slice(), b: V[(i + 1) % V.length].slice() })); }
  S.shapes = S.shapes.filter((q) => q !== s); S.sel = []; return 'แตกชิ้น #' + s.n + ' เป็นเส้นแล้ว — ตัด / ยืด / ต่อเส้น แล้วกด ⬚ เป็นชิ้น'; }
function tess(e, rev) { let P; if (e.t === 'ln') P = [e.a, e.b]; else { const sw = sweep(e), n = Math.max(6, Math.ceil(sw / (TAU / 96))); P = []; for (let i = 0; i <= n; i++) P.push(onC(e.o, e.r, e.a0 + sw * i / n)); } return rev ? P.slice().reverse() : P; }
function regionFrom(e) { if (e.t === 'cir') { push(); S.lines = S.lines.filter((q) => q !== e); const p = addShape('circle', e.o[0] - e.r, e.o[1] - e.r, e.r * 2, e.r * 2, { c: e.col || S.color }); S.lsel = []; S.sel = [p.id]; return 'ทำเป็นชิ้นงานแล้ว #' + p.n + ' · วงกลม ⌀' + fmt(e.r * 2) + ' ซม.'; }
  const tol = Math.max(0.05, 3 / S.view.z), used = [e], start = lEnds(e)[0]; let pts = tess(e).slice(), cur = pts[pts.length - 1];
  for (let k = 0; k < 2000 && dist(cur, start) > tol; k++) { let nx = null, rev = false; for (const f of S.lines) { if (used.indexOf(f) >= 0 || f.t === 'cir') continue; const [a, b] = lEnds(f); if (dist(a, cur) <= tol) { nx = f; break; } if (dist(b, cur) <= tol) { nx = f; rev = true; break; } }
    if (!nx) { S.lsel = [e.id]; return '!เส้นยังไม่ต่อกันเป็นวงปิด — ตรวจจุดต่อ (วางจุดให้ติด Snap จุดปลาย)'; } used.push(nx); pts = pts.concat(tess(nx, rev).slice(1)); cur = pts[pts.length - 1]; }
  if (dist(cur, start) > tol || pts.length < 4) return '!เส้นยังไม่ต่อกันเป็นวงปิด'; pts.pop(); push(); const p = freeFrom(pts); if (!p) { S.hist.pop(); return '!รูปเล็กเกินไป'; }
  if (e.col) p.c = e.col; S.lines = S.lines.filter((q) => used.indexOf(q) < 0); S.lsel = []; S.sel = [p.id]; return 'ทำเป็นชิ้นงานแล้ว #' + p.n + ' · ' + (area(p) / 10000).toFixed(3) + ' ตร.ม.'; }
function cedTap(sx, sy) { const [wx, wy] = toW(sx, sy), P = [wx, wy], e = hitLine(sx, sy), m = S.ced; let r = '';
  if (m === 'explode') { const s = hitAny(wx, wy); r = !s ? '!แตะชิ้นงานที่ต้องการแตกเป็นเส้น' : s.lock ? '!ชิ้นนี้ล็อกอยู่ — ปลดล็อกก่อน' : explodePiece(s); }
  else if (m === 'erase') { if (e) { push(); S.lines = S.lines.filter((q) => q !== e); S.lsel = []; r = 'ลบเส้นแล้ว · ↶ ย้อนได้'; } else { const s = hitAny(wx, wy); if (s && !s.lock) { push(); S.shapes = S.shapes.filter((q) => q !== s); S.sel = S.sel.filter((id) => id !== s.id); r = 'ลบชิ้น #' + s.n + ' แล้ว · ↶ ย้อนได้'; } else r = s ? '!ชิ้นนี้ล็อกอยู่' : '!แตะเส้น / ชิ้นงานที่ต้องการลบ'; } }
  else if (m === 'offset') { const src = S.lines.find((q) => q.id === S.offSrc); if (!src) { if (e) { S.offSrc = e.id; r = 'แตะด้านที่ต้องการวางเส้นขนาน'; } else r = '!แตะเส้นต้นแบบก่อน'; } else { r = offsetAt(src, P, S.offD); S.offSrc = null; } }
  else if (!e) r = '!แตะที่ตัวเส้น (เส้น CAD) — ชิ้นงานกด ✳ แตกชิ้น ก่อน';
  else if (m === 'trim') r = trimAt(e, P); else if (m === 'extend') r = extendAt(e, P); else if (m === 'region') { r = regionFrom(e); if (r[0] !== '!') S.tool = 'move'; }
  if (r) toast(r.replace(/^!/, '')); ui(); autosave(); }
// ---- วาดเส้น ----
function lpath(g, e) { g.beginPath(); if (e.t === 'ln') { const [ax, ay] = toS(...e.a), [bx, by] = toS(...e.b); g.moveTo(ax, ay); g.lineTo(bx, by); } else { const [cx, cy] = toS(...e.o), rr = Math.max(0.5, e.r * S.view.z); if (e.t === 'cir') g.arc(cx, cy, rr, 0, TAU); else g.arc(cx, cy, rr, e.a0, e.a0 + sweep(e)); } }
function paintLines(g, k) { const z = S.view.z;
  S.lines.forEach((e) => { const on = !k && S.lsel.indexOf(e.id) >= 0, hv = !k && S.hoverL === e.id, src = !k && S.offSrc === e.id; lpath(g, e); g.save(); g.lineCap = 'round'; g.lineWidth = k ? Math.max(2, k * 0.25) : on || hv ? 3.5 : 2; g.strokeStyle = on || src ? '#FFD54A' : hv ? '#FF3DA6' : hexA(e.col || S.color, 0.9); if (src) g.setLineDash([8, 5]); g.stroke(); g.restore();
    if (S.ldims && !e.nd && !on && lLen(e) * z > 80) { const [mx, my] = toS(...lMid(e)); label(g, e.t === 'ln' ? fmt(lLen(e)) : 'R' + fmt(e.r), mx, my - (k ? 0 : 10), k ? Math.max(12, 3 * k) : 11); } });
  if (k) return; const L = lselected(); if (L.length !== 1) return; const e = L[0], hs = touchy() ? 9 : 5;
  lgrips(e).forEach((gp) => { const [x, y] = toS(...gp.p); g.beginPath(); g.rect(x - hs, y - hs, hs * 2, hs * 2); g.fillStyle = gp.k === 'm' || gp.k === 'o' ? '#22D3EE' : '#fff'; g.fill(); g.strokeStyle = '#1C1B18'; g.lineWidth = 1.5; g.stroke(); });
  const [mx, my] = toS(...lMid(e)); label(g, e.t === 'ln' ? fmt(lLen(e)) + ' ซม. · ' + fmt(lAng(e)) + '°' : 'R ' + fmt(e.r) + ' · ⌀ ' + fmt(e.r * 2) + ' ซม.', mx, my - 16, 13, true); }
function cadPreview() { const g = ctx, cp = drag && drag.t === 'cadPt' ? drag.w : (!touchy() ? S.hoverP : null), L = S.cpts;
  g.save(); g.strokeStyle = '#FFD54A'; g.lineWidth = 1.8; g.setLineDash([6, 4]);
  if (cp && L.length) { const a = L[L.length - 1];
    if (S.cad === 'line' || (S.cad === 'arc' && L.length === 1)) { const [ax, ay] = toS(...a), [bx, by] = toS(...cp); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); const ln = dist(a, cp); if (ln > 0.05) label(g, fmt(ln) + ' ซม. · ' + fmt(nrm(Math.atan2(-(cp[1] - a[1]), cp[0] - a[0])) / D2R) + '°', (ax + bx) / 2, (ay + by) / 2 - 16, 13, true); }
    else if (S.cad === 'arc') { const q = arc3(L[0], L[1], cp); if (q) { lpath(g, q); g.stroke(); const [mx, my] = toS(...lMid(q)); label(g, 'R ' + fmt(q.r) + ' ซม.', mx, my - 16, 13, true); } }
    else if (S.cad === 'circle') { const r = dist(a, cp); lpath(g, { t: 'cir', o: a, r }); g.stroke(); const [bx, by] = toS(...cp); label(g, 'R ' + fmt(r) + ' · ⌀ ' + fmt(r * 2) + ' ซม.', bx, by - 18, 13, true); } }
  g.setLineDash([]); L.forEach((q, i) => { const [x, y] = toS(...q); g.beginPath(); g.arc(x, y, i ? 4 : 6, 0, TAU); g.fillStyle = i ? '#FFD54A' : '#FF3DA6'; g.fill(); g.strokeStyle = '#1C1B18'; g.lineWidth = 1.2; g.stroke(); });
  if (drag && drag.t === 'cadPt') { const [x, y] = toS(...drag.w); g.beginPath(); g.arc(x, y, 8, 0, TAU); g.strokeStyle = '#FF3DA6'; g.lineWidth = 1.5; g.stroke(); } g.restore(); }
function osMark() { const o = S.osHit; if (!o) return; const g = ctx, [x, y] = toS(...o.p), s = 7; g.save(); g.strokeStyle = '#4ADE80'; g.lineWidth = 2; g.beginPath();
  if (o.k === 'end' || o.k === 'cor') g.rect(x - s, y - s, s * 2, s * 2); else if (o.k === 'mid') { g.moveTo(x, y - s); g.lineTo(x + s, y + s); g.lineTo(x - s, y + s); g.closePath(); } else if (o.k === 'cen') g.arc(x, y, s, 0, TAU); else { g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); }
  g.stroke(); g.font = '700 11px "IBM Plex Sans Thai",system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; const t = OSK[o.k], w = g.measureText(t).width + 8; g.fillStyle = 'rgba(20,83,45,.92)'; g.fillRect(x + 10, y + 8, w, 17); g.fillStyle = '#fff'; g.fillText(t, x + 14, y + 16.5); g.restore(); }
// ---------- เมาส์ / นิ้ว ----------
const PT = new Map(); let drag = null, lastTap = 0, lastTapXY = [0, 0];
function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
const thr = (e) => (isTouch(e) ? 9 : 4);
const listOf = (k) => (k === 'cal' ? S.cal : k === 'persp' ? S.persp : k === 'draw' ? S.drawPts : null);
function ptHit(L, sx, sy) { const r = touchy() ? 20 : 11; for (let i = L.length - 1; i >= 0; i--) { const [px, py] = toS(L[i][0], L[i][1]); if (Math.hypot(px - sx, py - sy) <= r) return i; } return -1; }
function pDown(e) { if (!S.img) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (e.isPrimary) PT.clear();   // นิ้วแรกของท่าใหม่ = ล้างนิ้วค้าง (บางเครื่องไม่ส่ง pointerup)
  PT.set(e.pointerId, pos(e)); S.noSnap = e.altKey;
  if (S.snapMenu || S.opMenu || S.dimMenu) { S.snapMenu = false; S.opMenu = false; S.dimMenu = false; bar(); }
  if (PT.size === 2) { if (drag && drag.t === 'move' && drag.moved) { drag.start.forEach(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); if (p) { p.x = x; p.y = y; } }); S.hist.pop(); }
    if ((drag && (drag.t === 'resize' || drag.t === 'rotate')) && drag.orig) { Object.assign(drag.s, drag.orig); S.hist.pop(); }
    if (drag && ((drag.t === 'lmove' && drag.moved) || drag.t === 'lgrip')) { lRestore(drag); S.hist.pop(); } S.osHit = null;
    const [a, b] = [...PT.values()]; drag = { t: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], z: S.view.z, ox: S.view.ox, oy: S.view.oy }; S.loupe = null; S.dragging = false; draw(); return; }
  if (PT.size > 2) return;
  const [sx, sy] = pos(e), [wx, wy] = toW(sx, sy), base = { sx, sy, t0: Date.now(), touch: isTouch(e) };
  if (e.button === 1 || e.button === 2 || S.space) { drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy }; return; }
  // จุดที่วางแล้ว (ลากแก้ได้)
  const keys = S.tool === 'scale' ? ['cal'] : S.tool === 'persp' ? ['persp'] : S.tool === 'free' && S.freeMode === 'pts' ? ['draw'] : [];
  for (const key of keys) { const L = listOf(key), i = ptHit(L, sx, sy); if (i >= 0) { if (key === 'draw' && i === 0 && L.length >= 3) { drag = { ...base, t: 'closePt' }; return; }
      drag = { ...base, t: 'editPt', key, i, off: [L[i][0] - wx, L[i][1] - wy] }; S.act = { L: key, i }; S.loupe = { sx, sy }; draw(); fbar(); return; } }
  if (S.tool === 'meas' && S.meas) { const i = ptHit([S.meas.a, S.meas.b], sx, sy); if (i >= 0) { const p = i ? S.meas.b : S.meas.a; drag = { ...base, t: 'editPt', key: 'meas', i, off: [p[0] - wx, p[1] - wy] }; S.act = { L: 'meas', i }; S.loupe = { sx, sy }; draw(); fbar(); return; } }
  if (S.tool === 'move' || S.tool === 'shape') { const hh = hitHandle(sx, sy); if (hh) { push(); const s = hh.s; drag = { ...base, t: hh.hd.k === 'rot' ? 'rotate' : 'resize', s, hd: hh.hd, orig: JSON.parse(JSON.stringify(s)) }; S.dragging = true; S.loupe = hh.hd.k === 'rot' ? null : { sx, sy }; draw(); return; } }
  if (S.tool === 'move') { const gh = hitGrip(sx, sy); if (gh) { push(); drag = { ...base, t: 'lgrip', e: gh.e, k: gh.g.k, start: [[gh.e.id, JSON.stringify(gh.e)]] }; S.loupe = { sx, sy }; draw(); return; }
    const r = touchy() ? 20 : 10; for (const ax of ['x', 'y']) { const d = S['dim' + ax]; if (!d) continue; for (const k of ['a', 'b']) { const [px, py] = toS(...fromImg(d[k])); if (Math.hypot(px - sx, py - sy) <= r) { push(); drag = { ...base, t: 'dimPt', ax, k, off: [fromImg(d[k])[0] - wx, fromImg(d[k])[1] - wy], cm: [S.cmx, S.cmy] }; S.loupe = { sx, sy }; draw(); return; } } }
    const hd = hitDimLine(sx, sy, wx, wy); if (hd) { const d = S['dim' + hd.ax]; push(); drag = { ...base, t: 'dimLine', ax: hd.ax, o0: d.o || 0, tp0: d.tp == null ? 0.27 : d.tp }; draw(); return; }
    const le = hitLine(sx, sy); if (le) { if (e.shiftKey) { const i = S.lsel.indexOf(le.id); if (i >= 0) S.lsel.splice(i, 1); else S.lsel.push(le.id); } else if (S.lsel.indexOf(le.id) < 0) S.lsel = [le.id]; S.sel = [];
      drag = { ...base, t: 'lmove', wx, wy, start: lselected().map((q) => [q.id, JSON.stringify(q)]), moved: false }; ui(); return; } }
  const tool = S.tool;
  if (tool === 'cad') { drag = { ...base, t: 'cadPt', w: cadPt(wx, wy) }; S.loupe = { sx, sy }; draw(); return; }
  if (tool === 'cedit') { drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy, tap: true, ced: true }; return; }
  if (tool === 'scale' || tool === 'persp' || (tool === 'free' && S.freeMode === 'pts')) { const key = tool === 'scale' ? 'cal' : tool === 'persp' ? 'persp' : 'draw', L = listOf(key), max = tool === 'scale' ? 2 : tool === 'persp' ? 4 : 999;
    if (L.length >= max) { drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy, tap: true }; return; } drag = { ...base, t: 'newPt', key, w: [wx, wy] }; S.loupe = { sx, sy }; draw(); return; }
  if (tool === 'meas') { const p0 = snapPt(wx, wy); S.meas = { a: p0, b: p0.slice() }; S.act = null; drag = { ...base, t: 'meas' }; S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (tool === 'gv' || tool === 'gh') { const gi = hitGuide(sx, sy); if (gi >= 0) { push(); drag = { ...base, t: 'guide', i: gi }; S.dragG = gi; draw(); return; } drag = { ...base, t: 'newGuide' }; return; }
  const gi = hitGuide(sx, sy), p = hitAny(wx, wy);
  if (p && tool !== 'free') { if (tool === 'shape') { S.tool = 'move'; tools(); }   // แตะโดนชิ้นเดิมขณะใช้เครื่องมือรูปทรง = แก้ชิ้นนั้น (ไม่สร้างซ้อน)
    S.lsel = []; const wasSel = S.sel.indexOf(p.id) >= 0; if (e.shiftKey) { if (wasSel) S.sel.splice(S.sel.indexOf(p.id), 1); else S.sel.push(p.id); } else if (!wasSel) S.sel = [p.id];
    drag = { ...base, t: 'move', wx, wy, start: selected().map((q) => [q.id, q.x, q.y]), moved: false, locked: selected().some((q) => q.lock) }; draw(); fbar(); panel(); stat(); return; }
  if (tool === 'shape') { const [x, y] = snapPt(wx, wy); drag = { ...base, t: 'create', a: [x, y] }; return; }
  if (tool === 'free') { drag = { ...base, t: 'free', pts: [[wx, wy]] }; return; }
  if (gi >= 0) { push(); drag = { ...base, t: 'guide', i: gi }; S.dragG = gi; draw(); return; }
  drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy, tap: true }; }
function pMove(e) { if (!S.img) return; const P0 = pos(e); if (PT.has(e.pointerId)) PT.set(e.pointerId, P0); const [sx, sy] = P0, [wx, wy] = toW(sx, sy); S.cursor = [wx, wy]; S.hover = [wx, wy]; S.noSnap = e.altKey;
  if (!drag) { if (S.tool === 'cad' && !touchy()) { S.hoverP = cadPt(wx, wy); draw(); } else if (S.tool === 'cedit' && !touchy()) { const hl = hitLine(sx, sy); S.hoverL = hl ? hl.id : null; draw(); } if (S.tool === 'shape') draw(); if (S.tool === 'move' && !touchy()) cv.style.cursor = hitDimLine(sx, sy, wx, wy) ? 'move' : ''; stat(); return; }
  const far = Math.hypot(sx - drag.sx, sy - drag.sy) > thr(e);
  if (drag.t === 'pinch') { if (PT.size < 2) return; const [a, b] = [...PT.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const nz = Math.max(S.fitZ * 0.2, Math.min(ZMAX(), drag.z * d / drag.d));
    S.view.z = nz; S.view.ox = c[0] - (drag.c[0] - drag.ox) * (nz / drag.z); S.view.oy = c[1] - (drag.c[1] - drag.oy) * (nz / drag.z); draw(); zoomUi(); return; }
  if (drag.t === 'pan') { if (drag.tap && !far) return; drag.tap = false; S.view.ox = drag.ox + sx - drag.sx; S.view.oy = drag.oy + sy - drag.sy; draw(); return; }
  if (drag.t === 'newPt') { drag.w = [wx, wy]; S.loupe = { sx, sy }; draw(); return; }
  if (drag.t === 'dimPt') { if (!drag.go) { if (!far) return; drag.go = true; } const d = S['dim' + drag.ax]; d[drag.k] = [(wx + drag.off[0]) / drag.cm[0], (wy + drag.off[1]) / drag.cm[1]]; S.loupe = { sx, sy }; draw(); return; }
  if (drag.t === 'cadPt') { drag.w = cadPt(wx, wy); S.loupe = { sx, sy }; draw(); return; }
  if (drag.t === 'lgrip') { if (!drag.go) { if (!far) return; drag.go = true; } moveGrip(drag.e, drag.k, cadPt(wx, wy, drag.e.id), JSON.parse(drag.start[0][1])); S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (drag.t === 'lmove') { if (!drag.moved && !far) return; if (!drag.moved) { push(); drag.moved = true; } const dx = wx - drag.wx, dy = wy - drag.wy; drag.start.forEach(([id, js]) => { const q = S.lines.find((x) => x.id === id); if (q) Object.assign(q, shiftL(JSON.parse(js), dx, dy)); }); draw(); return; }
  if (drag.t === 'dimLine') { if (!drag.go) { if (!far) return; drag.go = true; } const d = S['dim' + drag.ax], X = drag.ax === 'x', G = dimGeo(drag.ax, d), span = Math.max(20, G.hi - G.lo);
    d.o = drag.o0 + (X ? sy - drag.sy : sx - drag.sx) / ((X ? S.cmy : S.cmx) * S.view.z); d.tp = Math.max(0.04, Math.min(0.96, drag.tp0 + (X ? sx - drag.sx : sy - drag.sy) / span)); draw(); return; }
  if (drag.t === 'editPt') { const np = [wx + drag.off[0], wy + drag.off[1]]; if (drag.key === 'meas') { if (S.meas) S.meas[drag.i ? 'b' : 'a'] = np; } else { const L = listOf(drag.key); if (L) L[drag.i] = np; } S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (drag.t === 'meas') { if (S.meas) S.meas.b = snapPt(wx, wy); S.dragging = true; S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (drag.t === 'create') { if (!far && !drag.live) return; const [bx, by] = snapPt(wx, wy); let x = Math.min(drag.a[0], bx), y = Math.min(drag.a[1], by), w = Math.abs(bx - drag.a[0]), h = Math.abs(by - drag.a[1]);
    if (S.shape === 'sq' || S.shape === 'circle') { const m = Math.max(w, h); w = h = m; x = bx < drag.a[0] ? drag.a[0] - m : drag.a[0]; y = by < drag.a[1] ? drag.a[1] - m : drag.a[1]; }
    drag.live = { t: S.shape, x, y, w, h, rot: 0, sides: S.sides }; S.dragging = true; draw(); return; }
  if (drag.t === 'free') { const last = drag.pts[drag.pts.length - 1]; if (Math.hypot((wx - last[0]) * S.view.z, (wy - last[1]) * S.view.z) > 3) drag.pts.push([wx, wy]); draw(); return; }
  if (drag.t === 'guide') { const g = S.guides[drag.i]; const [x, y] = snapPt(wx, wy); g.p = r1(g.o === 'v' ? x : y); S.dragging = true; draw(); return; }
  if (drag.t === 'move') { if (!drag.moved && !far) return; if (drag.locked) { if (!drag.warned) { drag.warned = true; toast('ชิ้นนี้ล็อกอยู่ — กด 🔓 เพื่อปลดก่อนย้าย'); } return; }
    if (!drag.moved) { push(); drag.moved = true; } let dx = wx - drag.wx, dy = wy - drag.wy; const ids = drag.start.map((s0) => s0[0]);
    const bbs = drag.start.map(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); return bbox({ ...p, x, y }); });
    const bx = Math.min(...bbs.map((b) => b[0])) + dx, by = Math.min(...bbs.map((b) => b[1])) + dy, bw = Math.max(...bbs.map((b) => b[0] + b[2])) - Math.min(...bbs.map((b) => b[0])), bh = Math.max(...bbs.map((b) => b[1] + b[3])) - Math.min(...bbs.map((b) => b[1]));
    const snx = snapAxis([bx, bx + bw], 'x', ids), sny = snapAxis([by, by + bh], 'y', ids); dx += snx.d; dy += sny.d; S.snapHit = { x: snx.t, y: sny.t }; S.dragging = true;
    drag.start.forEach(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); if (p) { p.x = r1(x + dx); p.y = r1(y + dy); } }); draw(); stat(); return; }
  if ((drag.t === 'resize' || drag.t === 'rotate') && !drag.go) { if (!far) return; drag.go = true; }   // ต้องลากจริง (> 4px เมาส์ / 9px นิ้ว) ก่อน — นิ้วสั่นไม่ย่อ-ขยาย / หมุน
  if (drag.t === 'resize') { const s = drag.s, o = drag.orig, hd = drag.hd, th = (o.rot || 0) * D2R; let px = wx, py = wy;
    if (!((o.rot || 0) % 360)) { const sp = snapPt(wx, wy); px = sp[0]; py = sp[1]; S.dragging = true; }
    const [lx, ly] = loc(o, px, py); const fx = -hd.a * o.w / 2, fy = -hd.b * o.h / 2; let nw = hd.a ? Math.max(1, Math.abs(lx - fx)) : o.w, nh = hd.b ? Math.max(1, Math.abs(ly - fy)) : o.h;
    if (s.t === 'sq' || s.t === 'circle') { const m = Math.max(hd.a ? nw : 0, hd.b ? nh : 0); nw = nh = m; }
    const clx = hd.a ? fx + Math.sign((lx - fx) || hd.a) * nw / 2 : 0, cly = hd.b ? fy + Math.sign((ly - fy) || hd.b) * nh / 2 : 0; const [ccx, ccy] = ctr(o), [rx, ry] = rot(clx, cly, th);
    s.w = r1(nw); s.h = r1(nh); s.x = r1(ccx + rx - s.w / 2); s.y = r1(ccy + ry - s.h / 2); S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (drag.t === 'rotate') { const s = drag.s, [cx, cy] = ctr(s); let a = Math.atan2(wy - cy, wx - cx) / D2R + 90; a = ((a % 360) + 360) % 360; const m = Math.round(a / 45) * 45; if (!e.altKey && Math.abs(a - m) <= 3) a = m % 360;   // หมุนอิสระทีละ 1° · ใกล้ 0 / 45 / 90° ±3° ดูดเข้ามุม
    s.rot = Math.round(a) % 360; S.rotLabel = { s, sx, sy }; draw(); fbar(); return; } }
function pUp(e) { PT.delete(e.pointerId); const d = drag; if (!d) return; if (d.t === 'pinch') { if (!PT.size) drag = null; return; }
  drag = null; S.dragging = false; S.dragG = -1; S.loupe = null; lcv.hidden = true;
  const [sx, sy] = pos(e), [wx, wy] = toW(sx, sy), quick = Date.now() - d.t0 < 700, still = Math.hypot(sx - d.sx, sy - d.sy) <= thr(e);
  if (d.t === 'cadPt') { S.osHit = null; S.snapHit = null; cadAdd(d.w); return; }
  if (d.t === 'lgrip') { S.osHit = null; if (!d.go) { S.hist.pop(); draw(); return; } autosave(); fbar(); panel(); draw(); return; }
  if (d.t === 'lmove') { if (d.moved) autosave(); fbar(); panel(); stat(); draw(); return; }
  if (d.t === 'pan' && d.ced && d.tap && still) { cedTap(sx, sy); return; }
  if (d.t === 'pan') { if (d.tap && still) { const now = Date.now(); if (now - lastTap < 330 && Math.hypot(sx - lastTapXY[0], sy - lastTapXY[1]) < 30) { zoomAt(sx, sy, S.view.z * 2); lastTap = 0; } else { lastTap = now; lastTapXY = [sx, sy]; if (S.sel.length || S.lsel.length) { S.sel = []; S.lsel = []; panel(); fbar(); stat(); } } } draw(); return; }
  if (d.t === 'newPt') { const L = listOf(d.key); L.push(d.w); S.act = { L: d.key, i: L.length - 1 };
    if (S.tool === 'persp' && S.persp.length === 4 && S.scaled) { const q = S.persp; S.pw = S.pw || fmt(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1])); S.ph = S.ph || fmt(Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1])); }
    if (S.tool === 'scale' && S.cal.length === 2 && S.scaled) { const [a, b] = S.cal; S.calLen = S.calLen || fmt(S.calAxis === 'y' ? Math.abs(b[1] - a[1]) : Math.abs(b[0] - a[0])); }
    fbar(); draw(); if (!d.touch && ((S.tool === 'scale' && S.cal.length === 2) || (S.tool === 'persp' && S.persp.length === 4))) { const i = $(S.tool === 'scale' ? '[data-in="calLen"]' : '[data-in="pw"]', root); if (i && !i.value) i.focus(); } return; }
  if (d.t === 'closePt') { if (still) ptClose(); return; }
  if (d.t === 'editPt') { fbar(); draw(); return; }
  if (d.t === 'dimPt') { if (!d.go) { S.hist.pop(); draw(); return; } applyDims(); ui(); autosave(); toast('ปรับจุดขนาดแล้ว — แผ่น ↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') + ' ซม. (คำนวณสเกลใหม่)'); return; }
  if (d.t === 'dimLine') { const dd = S['dim' + d.ax]; if (!d.go) { S.hist.pop(); const now = Date.now(); if (quick && now - lastTap < 330 && Math.hypot(sx - lastTapXY[0], sy - lastTapXY[1]) < 30) { push(); delete dd.o; delete dd.tp; lastTap = 0; autosave(); toast('วางเส้นขนาดกลับที่จุดเดิมแล้ว'); } else { lastTap = now; lastTapXY = [sx, sy]; } draw(); return; }
    autosave(); toast('ย้ายเส้นขนาดแล้ว — จุดบนแผ่น / สเกลเหมือนเดิม · แตะป้าย 2 ครั้ง = กลับที่เดิม'); draw(); return; }
  if (d.t === 'meas') { S.snapHit = null; if (S.meas && Math.hypot(S.meas.b[0] - S.meas.a[0], S.meas.b[1] - S.meas.a[1]) * S.view.z < 4) S.meas = null; fbar(); draw(); return; }
  if (d.t === 'newGuide') { if (!still) { draw(); return; } push(); const [x, y] = snapPt(wx, wy); S.guides.push({ o: S.tool === 'gv' ? 'v' : 'h', p: r1(S.tool === 'gv' ? x : y) }); S.guidesOn = true; S.snapHit = null; ui(); autosave(); return; }
  if (d.t === 'guide') { S.snapHit = null; const g = S.guides[d.i]; if (g && ((g.o === 'v' && (g.p < -50 || g.p > IW() + 50)) || (g.o === 'h' && (g.p < -50 || g.p > IH() + 50)))) { S.guides.splice(d.i, 1); toast('ลบเส้นไกด์แล้ว (ลากออกนอกแผ่น)'); } ui(); autosave(); return; }
  S.snapHit = null;
  if (d.t === 'create') { if (d.live && d.live.w * S.view.z >= 8 && d.live.h * S.view.z >= 8) { push(); const L = d.live; afterCreate(addShape(L.t, L.x, L.y, Math.max(1, L.w), Math.max(1, L.h))); return; }
    if (!d.live && still && quick) { push(); const [x, y] = previewXY([wx, wy]); afterCreate(addShape(S.shape, x, y, S.defW, S.defH)); toast('✓ วาง' + TNAME[S.shape] + 'แล้ว' + (S.repeat ? '' : ' · กลับโหมดเลือก')); } draw(); return; }
  if (d.t === 'free') { const P = simplify(d.pts, 2 / S.view.z); if (P.length >= 3) { push(); const p = freeFrom(P); if (p) afterCreate(p); else toast('รูปเล็กเกินไป'); } else toast('เส้นสั้นเกินไป — ลากวาดให้เป็นรูปปิด'); draw(); return; }
  if (d.t === 'move') { if (d.moved) { autosave(); panel(); } fbar(); draw(); return; }
  S.rotLabel = null;
  if (d.t === 'resize' || d.t === 'rotate') { if (!d.go) { S.hist.pop(); draw(); return; } autosave(); panel(); fbar(); draw(); return; }
  draw(); }
function pCancel(e) { PT.delete(e.pointerId); if (drag && ((drag.t === 'lmove' && drag.moved) || (drag.t === 'lgrip' && drag.go))) { lRestore(drag); S.hist.pop(); } S.osHit = null; if (drag && drag.t === 'move' && drag.moved) { drag.start.forEach(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); if (p) { p.x = x; p.y = y; } }); } drag = null; S.loupe = null; S.dragging = false; draw(); }
function onWheel(e) { if (!S.img) return; e.preventDefault(); const [sx, sy] = pos(e); zoomAt(sx, sy, S.view.z * Math.exp(-e.deltaY * 0.0015)); }
function zoomBy(k) { zoomAt(W / 2, H / 2, S.view.z * k); }
function ptClose() { if (S.drawPts.length < 3) return; push(); const p = freeFrom(S.drawPts.slice()); S.drawPts = []; S.act = null; if (p) afterCreate(p); else ui(); }
// ความทึบ: which = 'all' (ทุกชิ้น + ค่าตั้งต้นของชิ้นใหม่) / 'sel' (ชิ้นที่เลือก) · k = 'f' พื้นชิ้น / 'l' เส้นตัด
function setOp(which, k, v) { const L = which === 'all' ? S.shapes : selected(); if (which === 'all') { if (k === 'f') S.opDef = v; else S.lineDef = v; } L.forEach((s) => { if (k === 'f') s.op = v; else s.lo = v; }); draw(); }
function nudge(dx, dy, kind) { const st = S.nudge;
  if (kind === 'pt' && S.act) { if (S.act.L === 'meas') { if (S.meas) { const k = S.act.i ? 'b' : 'a'; S.meas[k] = [S.meas[k][0] + dx * st, S.meas[k][1] + dy * st]; } } else { const L = listOf(S.act.L); if (L && L[S.act.i]) L[S.act.i] = [L[S.act.i][0] + dx * st, L[S.act.i][1] + dy * st]; } draw(); fbar(); return; }
  const L = selected().filter((p) => !p.lock), LL = lselected(); if (!L.length && !LL.length) return; push(); L.forEach((p) => { p.x = r1(p.x + dx * st); p.y = r1(p.y + dy * st); }); LL.forEach((q) => Object.assign(q, shiftL(q, dx * st, dy * st))); draw(); panel(); autosave(); }
// ---------- ปุ่ม ----------
function setTool(t) { if (S.tool === t && t !== 'move') t = 'move'; S.tool = t; if (t !== 'free') S.drawPts = []; if (t !== 'scale') { S.cal = []; S.calLen = ''; } else loadAxis(S.dimx && !S.dimy ? 'y' : 'x'); if (t !== 'persp') S.persp = []; if (t !== 'meas') S.meas = null; S.act = null; if (t !== 'move' && t !== 'shape') S.sel = []; if (t !== 'move') S.lsel = []; if (t !== 'cad') { S.cpts = []; S.chain = []; S.hoverP = null; } if (t !== 'cedit') { S.offSrc = null; S.hoverL = null; } S.osHit = null; tools(); fbar(); panel(); stat(); draw(); }
async function onClick(e) { const t = e.target;
  const wk = t.closest('[data-wk]'); if (wk) { const k = wk.dataset.wk; if (k === 'x') worksClose(); else if (k === 'mine' || k === 'all') { S.wk.scope = k; worksRender(); } else if (k === 'new') newWork(); else if (k === 'json') $('#slJson', root).click(); else if (k === 'last') { if (S.dirty && S.img && !(await ask('เปิดงานล่าสุดในเครื่อง?', 'งานที่เปิดอยู่มีการแก้ที่ยังไม่บันทึก', 'เปิด'))) return; loadLast(); } return; }
  const wo = t.closest('[data-wo]'); if (wo) return openWork(wo.dataset.wo); const wr = t.closest('[data-wr]'); if (wr) return renameWork(wr.dataset.wr); const wd = t.closest('[data-wd]'); if (wd) return deleteWork(wd.dataset.wd);
  if (t.classList && t.classList.contains('sl-wk')) { worksClose(); return; }
  const tl = t.closest('[data-tool]'); if (tl && !tl.disabled) { setTool(tl.dataset.tool); if (innerWidth <= 760 && tl.closest('#slPan')) { S.panel = false; panel(); } return; }
  const stp = t.closest('[data-step]'); if (stp) { const i = +stp.dataset.step; if (i === 0) $('#slFile', root).click(); else if (i === 1) setTool('scale'); else if (i === 2) { S.panel = true; panel(); const el = $('[data-g="sl-ratio"]', root); if (el) el.scrollIntoView({ behavior: 'smooth' }); } else if (i === 3) { S.snapMenu = true; bar(); } else if (i === 4) setTool('shape'); return; }
  const shp = t.closest('[data-shp]'); if (shp) { S.shape = shp.dataset.shp; if (S.tool !== 'shape') setTool('shape'); fbar(); panel(); draw(); return; }
  const cd = t.closest('[data-cad]'); if (cd) { S.cad = cd.dataset.cad; S.cpts = []; S.chain = []; if (S.tool !== 'cad') setTool('cad'); fbar(); draw(); return; }
  const ce = t.closest('[data-ced]'); if (ce) { S.ced = ce.dataset.ced; S.offSrc = null; if (S.tool !== 'cedit') setTool('cedit'); fbar(); draw(); return; }
  const fm = t.closest('[data-fm]'); if (fm) { S.freeMode = fm.dataset.fm; S.drawPts = []; S.act = null; fbar(); draw(); return; }
  const cax = t.closest('[data-cax]'); if (cax) { loadAxis(cax.dataset.cax); fbar(); draw(); return; }
  const nd = t.closest('[data-nud]'); if (nd) { const [a, b] = nd.dataset.nud.split(',').map(Number); nudge(a, b, nd.dataset.nk); return; }
  const pre = t.closest('[data-pre]'); if (pre) { const [a, b] = pre.dataset.pre.split('x').map(Number); S.defW = a; S.defH = b; panel(); fbar(); return; }
  const col = t.closest('[data-col]'); if (col) { S.color = col.dataset.col; panel(); return; }
  const pc = t.closest('[data-pcol]'); if (pc) { push(); selected().forEach((p) => { p.c = pc.dataset.pcol; }); draw(); autosave(); return; }
  const gx = t.closest('[data-gx]'); if (gx) { push(); S.guides.splice(+gx.dataset.gx, 1); ui(); autosave(); return; }
  const opq = t.closest('[data-opq]'); if (opq) { push(); setOp('sel', 'f', +opq.dataset.opq); fbar(); autosave(); return; }
  if ((S.snapMenu || S.opMenu || S.dimMenu) && !t.closest('.sl-menu') && !t.closest('[data-sl="snapmenu"]') && !t.closest('[data-sl="opmenu"]') && !t.closest('[data-sl="dimmenu"]')) { S.snapMenu = false; S.opMenu = false; S.dimMenu = false; bar(); }
  const b = t.closest('[data-sl]'); if (!b || b.disabled) return; return act(b.dataset.sl, b); }
async function act(a, b) {
  if (a === 'close') return close();
  if (a === 'pick') return $('#slFile', root).click();
  if (a === 'json') return $('#slJson', root).click();
  if (a === 'last') return loadLast();
  if (a === 'works') return worksOpen();
  if (a === 'csave') return saveWork(false); if (a === 'csaveas') return saveWork(true);
  if (a === 'undo') return undo(); if (a === 'redo') return redo();
  if (a === 'panel') { S.panel = !S.panel; panel(); return; }
  if (!S.img) return;
  if (a === 'grid') { S.grid.on = !S.grid.on; bar(); steps(); draw(); autosave(); }
  else if (a === 'guides') { S.guidesOn = !S.guidesOn; bar(); draw(); }
  else if (a === 'dims') { S.dims = !S.dims; bar(); draw(); }
  else if (a === 'dimmenu') { S.snapMenu = false; S.opMenu = false; S.dimMenu = !S.dimMenu; S.dimMenuX = b ? b.offsetLeft : 200; bar(); }
  else if (a === 'dimall') { push(); S.shapes.forEach((x) => { delete x.nd; }); S.lines.forEach((x) => { delete x.nd; }); bar(); fbar(); draw(); autosave(); toast('แสดงขนาดทุกชิ้นแล้ว'); }
  else if (a === 'pdim') { const L = selected(); if (!L.length) return; push(); const v = !L[0].nd; L.forEach((x) => { if (v) x.nd = true; else delete x.nd; }); if (!v && !S.dims) { S.dims = true; bar(); } fbar(); draw(); autosave(); toast(v ? 'ซ่อนขนาดชิ้นนี้แล้ว' : 'แสดงขนาดชิ้นนี้แล้ว'); }
  else if (a === 'ldim') { const L = lselected(); if (!L.length) return; push(); const v = !L[0].nd; L.forEach((x) => { if (v) x.nd = true; else delete x.nd; }); if (!v && !S.ldims) { S.ldims = true; bar(); } fbar(); draw(); autosave(); toast(v ? 'ซ่อนขนาดเส้นนี้แล้ว' : 'แสดงขนาดเส้นนี้แล้ว'); }
  else if (a === 'optoggle') { push(); const v = S.opDef > 0 ? 0 : 10; setOp('all', 'f', v); bar(); fbar(); autosave(); toast('พื้นชิ้นงานทุกชิ้น ' + v + '% · เส้นตัด 70%'); }
  else if (a === 'snapmenu') { S.opMenu = false; S.snapMenu = !S.snapMenu; S.snapMenuX = b ? b.offsetLeft : 200; bar(); }
  else if (a === 'fit') fit(); else if (a === 'zin') zoomBy(1.4); else if (a === 'zout') zoomBy(1 / 1.4);
  else if (a === 'calx' || a === 'caly') { setTool('scale'); loadAxis(a === 'calx' ? 'x' : 'y'); fbar(); draw(); if (innerWidth <= 760) { S.panel = false; panel(); } }
  else if (a === 'calOk') calOk(); else if (a === 'calReset') { S.cal = []; S.calLen = ''; S.act = null; fbar(); draw(); }
  else if (a === 'perspOk') perspOk(); else if (a === 'perspReset') { S.persp = []; S.act = null; fbar(); draw(); }
  else if (a === 'tcancel') setTool('move');
  else if (a === 'ptUndo') { S.drawPts.pop(); S.act = null; fbar(); draw(); } else if (a === 'ptClose') ptClose();
  else if (a === 'measClear') { S.meas = null; S.act = null; fbar(); draw(); }
  else if (a === 'cadPlace') cadPlace();
  else if (a === 'cadBack') { const id = S.chain.pop(); if (id) { S.lines = S.lines.filter((q) => q.id !== id); S.hist.pop(); } S.cpts.pop(); ui(); autosave(); }
  else if (a === 'cadDone') { S.cpts = []; S.chain = []; fbar(); draw(); }
  else if (a === 'cadRegion' || a === 'lregion') { const e = a === 'lregion' ? lselected()[0] : S.lines.find((q) => q.id === S.lastLoop); if (!e) return; const r = regionFrom(e); toast(r.replace(/^!/, '')); if (r[0] !== '!') { S.lastLoop = null; S.tool = 'move'; } ui(); autosave(); }
  else if (a === 'ortho') { S.ortho = !S.ortho; fbar(); }
  else if (a === 'ldel') { if (!S.lsel.length) return; push(); S.lines = S.lines.filter((q) => S.lsel.indexOf(q.id) < 0); S.lsel = []; ui(); autosave(); }
  else if (a === 'ldup') { const LL = lselected(); if (!LL.length) return; push(); S.lsel = LL.map((q) => { const c = { ...JSON.parse(JSON.stringify(q)), ...shiftL(q, 10, 10), id: uid() }; S.lines.push(c); return c.id; }); ui(); autosave(); toast('ทำสำเนาแล้ว (เลื่อน 10 ซม.) — ลากไปวางได้'); }
  else if (a === 'lclear') { if (await ask('ลบเส้น CAD ทั้งหมด?', 'ชิ้นงานยังอยู่ · ย้อนกลับได้ด้วย ↶ ย้อน', 'ลบเส้นทั้งหมด')) { push(); S.lines = []; S.lsel = []; ui(); autosave(); } }
  else if (a === 'repeat') { S.repeat = !S.repeat; fbar(); }
  else if (a === 'sidesM' || a === 'sidesP') { S.sides = Math.max(3, Math.min(24, S.sides + (a === 'sidesP' ? 1 : -1))); fbar(); draw(); }
  else if (a === 'stretch') { const kx = parseFloat($('[data-in="sx"]', root).value) / 100, ky = parseFloat($('[data-in="sy"]', root).value) / 100; if (kx > 0 && ky > 0 && (kx !== 1 || ky !== 1)) { push(); S.cmx *= kx; S.cmy *= ky; fit(); ui(); autosave(); toast('ปรับสัดส่วนแล้ว'); } }
  else if (a === 'unpersp') restorePrev();
  else if (a === 'gclear') { push(); S.guides = []; ui(); autosave(); }
  else if (a === 'swapd') { [S.defW, S.defH] = [S.defH, S.defW]; panel(); fbar(); }
  else if (a === 'center') { push(); const [cx, cy] = toW(W / 2, H / 2); const h = S.shape === 'sq' || S.shape === 'circle' ? S.defW : S.defH; afterCreate(addShape(S.shape, cx - S.defW / 2, cy - h / 2, S.defW, S.defH)); }
  else if (a === 'rot') { const L = selected().filter((p) => !p.lock); if (!L.length) return; push(); L.forEach((p) => { p.rot = ((p.rot || 0) + 90) % 360; }); ui(); autosave(); }
  else if (a === 'dup') { push(); const n = selected().map((p) => { const q = JSON.parse(JSON.stringify(p)); q.id = uid(); q.n = String(S.next++); q.lock = false; const bb = bbox(p); q.x = r1(p.x + bb[2] + S.joint / 10); S.shapes.push(q); return q; }); S.sel = n.map((p) => p.id); ui(); autosave(); }
  else if (a === 'del') { push(); S.shapes = S.shapes.filter((p) => S.sel.indexOf(p.id) < 0); S.sel = []; ui(); autosave(); }
  else if (a === 'lock') { const s = one(); if (s) { push(); s.lock = !s.lock; ui(); autosave(); toast(s.lock ? 'ล็อกชิ้นแล้ว — แตะเลือกได้แต่ไม่ขยับ' : 'ปลดล็อกแล้ว'); } }
  else if (a === 'zsel') { const L = selected(); if (!L.length) return; const bs = L.map(bbox); const x = Math.min(...bs.map((q) => q[0])), y = Math.min(...bs.map((q) => q[1])); zoomTo(x, y, Math.max(...bs.map((q) => q[0] + q[2])) - x, Math.max(...bs.map((q) => q[1] + q[3])) - y); }
  else if (a === 'pattern') makePattern();
  else if (a === 'renum') renum();
  else if (a === 'selall') { S.sel = S.shapes.map((p) => p.id); S.tool = 'move'; ui(); }
  else if (a === 'clear') { if (await ask('ลบชิ้นงานทั้งหมด?', 'ย้อนกลับได้ด้วย ↶ ย้อน', 'ลบทั้งหมด')) { push(); S.shapes = []; S.sel = []; S.next = 1; ui(); autosave(); } }
  else if (a === 'png') exportPng(); else if (a === 'csv') exportCsv(); else if (a === 'savejson') saveJson(); }
function onInput(e) { const t = e.target;
  if (t.hasAttribute && t.hasAttribute('data-wkq')) { S.wk.q = t.value; const pos = t.selectionStart; worksRender(); const i = $('[data-wkq]', root); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} } return; }
  if (t.dataset.opall || t.dataset.opsel) { if (!S.opPushed) { push(); S.opPushed = true; } const v = Math.max(0, Math.min(100, Math.round(parseFloat(t.value) || 0)));
    if (t.dataset.opall) setOp('all', t.dataset.opall, v); else setOp('sel', t.dataset.opsel, v);
    const lab = $('[data-opv="' + (t.dataset.opall ? t.dataset.opall : 's' + t.dataset.opsel) + '"]', root); if (lab) lab.textContent = v + '%'; const tb = $('[data-sl="opmenu"]', root); if (tb && t.dataset.opall === 'f') tb.innerHTML = '<i class="sl-opi"></i> ทึบ ' + v + '%'; return; }
  if (t.dataset.in === 'zoom') { const nz = (S.fitZ || 1) * Math.pow(2, parseFloat(t.value)); zoomAt(W / 2, H / 2, nz); return; }
  if (t.dataset.in === 'clen' || t.dataset.in === 'cang' || t.dataset.in === 'crad') { S.cin[t.dataset.in.slice(1)] = t.value; return; } if (t.dataset.in === 'offd') { S.offD = parseFloat(t.value) || 0; return; }
  if (t.dataset.in === 'calLen') { S.calLen = t.value; draw(); return; } if (t.dataset.in === 'pw') { S.pw = t.value; return; } if (t.dataset.in === 'ph') { S.ph = t.value; return; }
  if (t.dataset.pt) { S.pat[t.dataset.pt] = t.type === 'checkbox' ? t.checked : parseFloat(t.value) || 1; } }
function onChange(e) { const t = e.target, v = parseFloat(t.value);
  if (t.dataset.opall || t.dataset.opsel) { S.opPushed = false; autosave(); return; }
  if (t.dataset.snap) { S.snap[t.dataset.snap] = t.checked; bar(); return; }
  if (t.dataset.dm) { push(); const k = t.dataset.dm; if (k === 'pcs') S.dims = t.checked; else if (k === 'lns') S.ldims = t.checked; else S.dimH = { ...S.dimH, [k]: !t.checked }; bar(); draw(); autosave(); return; }
  if (t.dataset.in === 'nstep') { S.nudge = v; return; }
  if (t.dataset.in === 'gstep') { if (t.value === 'x') { askNum('ระยะตาราง', 'ระยะ (ซม.)', S.grid.step).then((r) => { if (r > 0) S.grid.step = r; bar(); draw(); }); return; } S.grid.step = v; S.grid.on = true; bar(); steps(); draw(); autosave(); return; }
  if (t.dataset.in === 'lock') { S.lockRatio = t.checked; return; }
  if (t.dataset.in === 'iw' || t.dataset.in === 'ih') { const w = parseFloat($('[data-in="iw"]', root).value), h = parseFloat($('[data-in="ih"]', root).value); setSize(w, h, t.dataset.in === 'ih' ? 'h' : 'w'); return; }
  if (t.dataset.in === 'dw' && v > 0) { S.defW = v; panel(); fbar(); return; } if (t.dataset.in === 'dh' && v > 0) { S.defH = v; panel(); fbar(); return; }
  if (t.dataset.in === 'joint' && v >= 0) { S.joint = v; autosave(); panel(); return; }
  if (t.dataset.gp) { push(); S.guides[+t.dataset.gp].p = v || 0; draw(); autosave(); return; }
  if (t.dataset.le) { const q = lselected()[0]; if (!q || !(v > 0 || (t.dataset.le === 'ang' && !isNaN(v)))) return; push(); const k = t.dataset.le;
    if (k === 'r') q.r = v; else { const len = k === 'len' ? v : lLen(q), ang = (k === 'ang' ? v : lAng(q)) * D2R; q.b = [r1c(q.a[0] + len * Math.cos(ang)), r1c(q.a[1] - len * Math.sin(ang))]; } ui(); autosave(); return; }
  if (t.dataset.pe) { const p = one(); if (!p) return; const k = t.dataset.pe; if ((k === 'w' || k === 'h') && !(v > 0)) return; push();
    if (k === 'n') p.n = t.value.trim() || p.n; else if (k === 'rot') p.rot = (((v || 0) % 360) + 360) % 360; else if (k === 'sides') p.sides = Math.max(3, Math.min(24, v | 0));
    else if (k === 'w' || k === 'h') { const [cx, cy] = ctr(p); if (p.t === 'sq' || p.t === 'circle') { p.w = p.h = r1(v); } else p[k] = r1(v); p.x = r1(cx - p.w / 2); p.y = r1(cy - p.h / 2); }
    else p[k] = r1(v || 0); ui(); autosave(); return; } }
function onKey(e) { if (!S.open) return; const tg = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(tg.tagName);
  if (e.key === ' ' && !typing) { S.space = e.type === 'keydown'; e.preventDefault(); return; } if (e.type !== 'keydown') return;
  if (window.WCGuide && WCGuide.active && WCGuide.active()) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (S.img) saveWork(false); return; }
  if (e.key === 'Escape' && S.wk && !$('.sl-dlg:not(.sl-wk)', root)) { worksClose(); e.preventDefault(); return; }
  if (e.key === 'Enter' && typing && /^(clen|cang|crad)$/.test(tg.dataset.in || '')) { e.preventDefault(); S.cin[tg.dataset.in.slice(1)] = tg.value; cadPlace(); return; }
  if (e.key === 'Enter' && typing && tg.dataset.in === 'calLen') { e.preventDefault(); S.calLen = tg.value; calOk(); return; }
  if (e.key === 'Enter' && typing && (tg.dataset.in === 'pw' || tg.dataset.in === 'ph')) { e.preventDefault(); perspOk(); return; }
  if (e.key === 'Escape') { if ($('.sl-dlg', root)) return; if (S.tool === 'cad' && S.cpts.length) { S.cpts = []; S.chain = []; fbar(); draw(); } else if (S.tool === 'cedit' && S.offSrc) { S.offSrc = null; fbar(); draw(); } else if (S.tool !== 'move') setTool('move'); else if (S.sel.length || S.lsel.length) { S.sel = []; S.lsel = []; ui(); } e.preventDefault(); return; }
  if (typing) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); if (S.sel.length) act('dup'); return; }
  let dx = 0, dy = 0; if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1; else if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1;
  if (dx || dy) { e.preventDefault(); const st = S.nudge; S.nudge = e.shiftKey ? 5 : (e.altKey ? 0.1 : st); nudge(dx, dy, S.act && !S.sel.length ? 'pt' : 'sel'); S.nudge = st; return; }
  if (!S.sel.length && S.lsel.length && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); act('ldel'); return; }
  if (!S.sel.length) { if (k === 'v') setTool('move'); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act('del'); return; }
  if (k === 'r' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); act('rot'); } }
// ---------- ส่งออก ----------
const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const fname = (ext) => (S.name || 'slab').replace(/[\\/:*?"<>|]+/g, '_') + '_slab-layout_' + today().split('/').reverse().join('') + '.' + ext;
async function exportPng() { if (!S.img) return; await busy('กำลังสร้างภาพ…', async () => {
  const k = Math.min(12, 5000 / Math.max(IW(), IH())), w = Math.round(IW() * k), h = Math.round(IH() * k), foot = Math.max(46, Math.round(w * 0.03));
  const c = document.createElement('canvas'); c.width = w; c.height = h + foot; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(S.img, 0, 0, w, h);
  const sv = S.view; S.view = { z: k, ox: 0, oy: 0 };
  try { S.shapes.forEach((p) => { pathOf(g, p); g.fillStyle = hexA(p.c, fo(p)); g.fill(); g.lineWidth = Math.max(2, k * .25); g.strokeStyle = hexA(p.c, lo(p)); g.stroke(); const [cx, cy] = toS(...ctr(p)), fs = Math.max(12, Math.min(p.w, p.h) * k / 3.4);
    const sd = S.dims && !p.nd; label(g, p.n, cx, cy - (sd ? fs * .4 : 0), fs, true); if (sd) label(g, p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(p.w) + '×' + fmt(p.h), cx, cy + fs * .5, fs * .45); }); paintLines(g, k); const tl = S.tool; S.tool = 'move'; userDims(g); S.tool = tl; } finally { S.view = sv; }
  const ar = S.shapes.reduce((a, p) => a + area(p) / 10000, 0); g.fillStyle = '#1C1B18'; g.fillRect(0, h, w, foot); g.fillStyle = '#F6F1E8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(foot * .36)}px "IBM Plex Sans Thai",sans-serif`;
  g.fillText(`Slab Layout · ${S.name} · แผ่น ${S.dimx || S.dimy ? '↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') : fmt(IW()) + ' × ' + fmt(IH())} ซม. · ${S.shapes.length} ชิ้น · ${ar.toFixed(2)} ตร.ม. ·${S.lines.length ? ' เส้น ' + S.lines.length + ' · ยาว ' + (S.lines.reduce((a, e) => a + lLen(e), 0) / 100).toFixed(2) + ' ม. ·' : ''} ร่อง ${S.joint} มม. · ${today()} · Wellcon Interior`, Math.round(foot * .4), h + foot / 2);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png')); dl(blob, fname('png')); toast('บันทึกภาพแผนตัดแล้ว'); }); }
function exportCsv() { if (!S.shapes.length && !S.lines.length) { toast('ยังไม่มีชิ้นงาน'); return; } const L = [['หมายเลข', 'รูปทรง', 'กว้าง (ซม.)', 'ยาว (ซม.)', 'มุม (°)', 'กรอบตัดจากแผ่น (ซม.)', 'พื้นที่ชิ้น (ตร.ม.)', 'ตำแหน่ง X (ซม.)', 'ตำแหน่ง Y (ซม.)']];
  S.shapes.slice().sort((a, b) => (parseFloat(a.n) || 0) - (parseFloat(b.n) || 0)).forEach((p) => { const b = bbox(p); L.push([p.n, TNAME[p.t] + (p.t === 'poly' ? ' ' + (p.sides || 6) + ' ด้าน' : ''), fmt(p.w), fmt(p.h), Math.round(p.rot || 0), fmt(b[2]) + ' × ' + fmt(b[3]), (area(p) / 10000).toFixed(3), fmt(p.x), fmt(p.y)]); });
  const sum = {}; S.shapes.forEach((p) => { const k = TNAME[p.t] + ' ' + (p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h))); sum[k] = (sum[k] || 0) + 1; });
  L.push([]); L.push(['สรุปตามขนาด', 'จำนวน']); Object.keys(sum).sort().forEach((k) => L.push([k, sum[k]])); L.push(['รวม', S.shapes.length]); L.push([]); L.push(['แผ่น', S.name, (S.dimx || S.dimy ? '↔ ' + (S.dimx ? fmt(S.dimx.len) : '—') + ' × ↕ ' + (S.dimy ? fmt(S.dimy.len) : '—') : fmt(IW()) + ' × ' + fmt(IH())) + ' ซม.', 'ร่อง ' + S.joint + ' มม.', today()]);
  if (S.lines.length) { L.push([]); L.push(['เส้น CAD', 'ชนิด', 'ยาว (ซม.)', 'รัศมี (ซม.)']); S.lines.forEach((e, i) => L.push([i + 1, LNAME[e.t], fmt(lLen(e)), e.t === 'ln' ? '' : fmt(e.r)])); L.push(['ความยาวเส้นรวม (ม.)', '', (S.lines.reduce((a, e) => a + lLen(e), 0) / 100).toFixed(2)]); }
  const csv = '﻿' + L.map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n'); dl(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fname('csv')); toast('บันทึกรายการตัดแล้ว (เปิดด้วย Excel ได้)'); }
async function saveJson() { if (!S.img) return; await busy('กำลังบันทึกงาน…', async () => { const img = S.img.toDataURL('image/jpeg', 0.9); dl(new Blob([JSON.stringify({ app: 'wellcon-slab', v: VER, name: S.name, at: new Date().toISOString(), img, st: snapData() })], { type: 'application/json' }), fname('json')); toast('บันทึกงานแล้ว — เปิดต่อได้ที่ 📂 เปิดงาน'); }); }
// ---------- งานที่บันทึกในระบบ (ผู้บริหารสั่ง 21/11/2026 "save the work within the software and come back to edit it later") ----------
// ระบบ: รูปแผ่น → storage general-photo/slab[-stg]/<id>-<รุ่น>.jpg (ลิงก์สาธารณะตามที่ผู้บริหารตัดสิน) · ข้อมูลงาน → app_state 'slab:<id>' { v: { name, by, byName, at, img, thumb, w, h, n, ln, st } }
// ไม่ได้เข้าสู่ระบบ / ต่อระบบไม่ได้ → เก็บในเครื่องนี้ (IndexedDB 'w:<id>')
const BUCKET = 'general-photo';
const cloud = () => { try { return window.PE_cloud ? window.PE_cloud() : null; } catch (e) { return null; } };
const fmtAt = (iso) => { const d = new Date(iso); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
const blobOf = (c, q) => new Promise((ok) => c.toBlob(ok, 'image/jpeg', q || 0.9));
function loadImg(url) { return new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(new Error('โหลดรูปแผ่นไม่ได้')); i.src = url; }); }
function planCanvas(maxW) { const k = Math.min(maxW / IW(), maxW / IH()), w = Math.max(1, Math.round(IW() * k)), h = Math.max(1, Math.round(IH() * k)), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(S.img, 0, 0, w, h);
  const sv = S.view; S.view = { z: k, ox: 0, oy: 0 }; try { S.shapes.forEach((p) => { pathOf(g, p); g.fillStyle = hexA(p.c, Math.max(0.25, fo(p))); g.fill(); g.lineWidth = 1.5; g.strokeStyle = hexA(p.c, 0.9); g.stroke(); }); S.lines.forEach((e) => { lpath(g, e); g.lineWidth = 1.5; g.strokeStyle = hexA(e.col || S.color, 0.9); g.stroke(); }); } finally { S.view = sv; } return c; }
function markDirty() { const b = root && $('[data-sl="csave"]', root); if (b) b.classList.toggle('dirty', !!(S.dirty && S.img)); }
function askText(title, label, v) { return new Promise((ok) => { const d = document.createElement('div'); d.className = 'sl-dlg';
  d.innerHTML = `<div class="bx"><h3>${title}</h3><div class="sl-row"><label>${label}</label><input class="sl-in" type="text" maxlength="80" style="flex:1;min-width:0" value="${esc(v)}"></div><div class="sl-row" style="justify-content:flex-end"><button class="sl-b" data-no>ยกเลิก</button><button class="sl-b dk" data-ok>บันทึก</button></div></div>`;
  root.appendChild(d); const i = d.querySelector('input'); setTimeout(() => { i.focus(); i.select(); }, 30); const done = (x) => { d.remove(); ok(x); };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-no]') || e.target === d) done(null); if (e.target.closest('[data-ok]')) done(i.value); }); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(i.value); if (e.key === 'Escape') done(null); }); }); }
async function saveWork(asNew) { if (!S.img) { toast('ยังไม่มีรูปแผ่น'); return; } const C = cloud(), me = C ? C.me : { email: '', name: '' }, W0 = S.work;
  let id = W0 && W0.id; const own = !!W0 && (!W0.by || W0.by === me.email);
  if (W0 && !own && !asNew) { if (!(await ask('บันทึกเป็นสำเนาของคุณ?', 'งานนี้เป็นของ <b>' + esc(W0.byName || W0.by) + '</b> — บันทึกเป็นงานใหม่ของคุณ (งานเดิมไม่เปลี่ยน)', 'บันทึกเป็นสำเนา'))) return; asNew = true; }
  if (W0 && W0.cloud !== !!C) asNew = true;   // งานในเครื่อง ↔ ในระบบ = บันทึกเป็นงานใหม่ที่ปลายทาง
  if (!id || asNew) { const nm = await askText(W0 ? 'บันทึกเป็นงานใหม่' : 'บันทึกงาน', 'ชื่องาน', W0 ? S.name + ' (สำเนา)' : S.name); if (nm == null) return; S.name = nm.trim() || S.name || 'slab'; id = 'w' + uid().slice(1); }
  const fresh = !W0 || asNew, by = fresh ? me.email : (W0.by || me.email), byName = fresh ? (me.name || me.email) : (W0.byName || me.name || '');
  if (C && !fresh) { try { const r = await C.sb.from('app_state').select('updated_by,at:data->v->>at').eq('id', 'slab:' + id).maybeSingle(); const x = r && r.data;
      if (x && x.at && W0.at && x.at !== W0.at && !(await ask('มีคนบันทึกงานนี้หลังจากคุณเปิด', 'บันทึกล่าสุด ' + esc(fmtAt(x.at)) + (x.updated_by ? ' โดย ' + esc(x.updated_by) : '') + ' — บันทึกทับด้วยงานของคุณ?', 'บันทึกทับ'))) return; } catch (e) {} }
  await busy(C ? 'กำลังบันทึกงานในระบบ…' : 'กำลังบันทึกงานในเครื่อง…', async () => { try {
    const at = new Date().toISOString(), st = JSON.parse(JSON.stringify(snapData())), thumb = planCanvas(360).toDataURL('image/jpeg', 0.72);
    const meta = { name: S.name, by, byName, at, w: S.img.width, h: S.img.height, n: S.shapes.length, ln: S.lines.length, thumb };
    if (C) { let img = !fresh && W0.img; const oldImg = img;
      if (!img || S.imgDirty || fresh) { img = (C.stg ? 'slab-stg/' : 'slab/') + id + '-' + Date.now().toString(36) + '.jpg'; const up = await C.sb.storage.from(BUCKET).upload(img, await blobOf(S.img, 0.9), { upsert: true, contentType: 'image/jpeg' }); if (up.error) throw up.error; }
      const r = await C.sb.from('app_state').upsert({ id: 'slab:' + id, data: { v: { ...meta, img, st } }, updated_by: me.email }); if (r.error) throw r.error;
      if (oldImg && oldImg !== img && !fresh) { try { await C.sb.storage.from(BUCKET).remove([oldImg]); } catch (e) {} }   // รูปรุ่นเก่าของงานเดียวกัน
      S.work = { id, by, byName, at, img, cloud: true }; }
    else { await DB.put('w:' + id, { ...meta, id, blob: await blobOf(S.img, 0.9), st }); S.work = { id, by, byName, at, cloud: false }; }
    S.imgDirty = false; S.dirty = false; ui(); autosave(); toast((C ? 'บันทึกในระบบแล้ว' : 'บันทึกในเครื่องนี้แล้ว (ยังไม่ได้เข้าสู่ระบบ)') + ' — เปิดต่อได้ที่ 📂 งานที่บันทึก');
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + ((e && e.message) || e) + ' — ลองใหม่ หรือกด ⬇ ไฟล์งาน .json'); } }); }
async function listWorks() { const C = cloud();
  if (C) { const r = await C.sb.from('app_state').select('id,updated_at,name:data->v->>name,by:data->v->>by,byName:data->v->>byName,at:data->v->>at,thumb:data->v->>thumb,n:data->v->>n,ln:data->v->>ln').like('id', 'slab:%').order('updated_at', { ascending: false }).limit(300);
    if (r.error) throw r.error; return (r.data || []).map((x) => ({ ...x, id: String(x.id).slice(5), cloud: true })); }
  return (await DB.list('w:')).map((x) => ({ id: x.id, name: x.name, by: x.by, byName: x.byName, at: x.at, thumb: x.thumb, n: x.n, ln: x.ln, cloud: false })).sort((a, b) => String(b.at).localeCompare(String(a.at))); }
async function worksOpen() { const C = cloud(); S.wk = { list: null, scope: S.wk ? S.wk.scope : 'mine', q: '', err: '' }; worksRender();
  try { S.wk.list = await listWorks(); } catch (e) { S.wk.list = []; S.wk.err = 'โหลดรายการไม่ได้: ' + ((e && e.message) || e); }
  if (!C) S.wk.scope = 'mine'; worksRender(); }
function worksClose() { const d = root && $('.sl-wk', root); if (d) d.remove(); S.wk = null; }
function worksRender() { if (!S.wk) return; const C = cloud(), me = C ? C.me.email : '', W = S.wk; let d = $('.sl-wk', root); if (!d) { d = document.createElement('div'); d.className = 'sl-dlg sl-wk'; root.appendChild(d); }
  const q = W.q.trim().toLowerCase(), L = (W.list || []).filter((x) => (W.scope === 'all' || !C || x.by === me) && (!q || String(x.name || '').toLowerCase().includes(q) || String(x.byName || '').toLowerCase().includes(q)));
  const card = (x) => { const own = !C || x.by === me, cur = S.work && S.work.id === x.id; return `<div class="wk-c${cur ? ' cur' : ''}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : '<div class="ph">✂</div>'}<div class="tx"><b>${esc(x.name || 'ไม่มีชื่อ')}</b><span>${C ? esc(x.byName || x.by || '') + ' · ' : ''}${esc(fmtAt(x.at))}</span><span>${+x.n || 0} ชิ้น · ${+x.ln || 0} เส้น${cur ? ' · <i>เปิดอยู่</i>' : ''}</span></div>
    <div class="ac"><button class="sl-b dk" data-wo="${esc(x.id)}">เปิด</button>${own ? `<button class="sl-b" data-wr="${esc(x.id)}" title="เปลี่ยนชื่อ">✎</button><button class="sl-b dg" data-wd="${esc(x.id)}" title="ลบงาน">🗑</button>` : ''}</div></div>`; };
  d.innerHTML = `<div class="bx"><div class="wk-hd"><h3>📂 งานที่บันทึก</h3><span class="sl-mut">${C ? 'เก็บในระบบ — เปิดต่อได้ทุกเครื่อง' : 'เก็บในเครื่องนี้ (ยังไม่ได้เข้าสู่ระบบ Wellcon PM)'}</span><button class="sl-b" data-wk="x" aria-label="ปิด">✕</button></div>
    <div class="sl-row">${C ? `<span class="wk-tab"><button class="${W.scope === 'mine' ? 'on' : ''}" data-wk="mine">ของฉัน</button><button class="${W.scope === 'all' ? 'on' : ''}" data-wk="all">ทั้งทีม</button></span>` : ''}<input class="sl-in" data-wkq placeholder="ค้นหาชื่องาน / ชื่อคน" value="${esc(W.q)}" style="flex:1;min-width:120px"></div>
    <div class="wk-list">${W.list == null ? '<div class="sl-mut">กำลังโหลด…</div>' : W.err ? `<div class="sl-warn">${esc(W.err)}</div>` : L.length ? L.map(card).join('') : `<div class="sl-mut" style="padding:18px 4px">${W.list.length ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงานที่บันทึก — วางแผนตัดแล้วกด 💾 บันทึก ที่หัวหน้า'}</div>`}</div>
    <div class="sl-row" style="margin-top:10px"><button class="sl-b tl" data-wk="new">＋ เริ่มงานใหม่</button><button class="sl-b" data-wk="json">📂 เปิดไฟล์ .json</button>${S.lastAt ? `<button class="sl-b" data-wk="last">↺ งานล่าสุดในเครื่อง</button>` : ''}</div></div>`; }
async function openWork(id) { const W = S.wk && (S.wk.list || []).find((x) => x.id === id); if (!W) return;
  if (S.dirty && S.img && !(S.work && S.work.id === id) && !(await ask('เปิดงานอื่น?', 'งานที่เปิดอยู่มีการแก้ที่ยังไม่บันทึก — ถ้าเปิดงานอื่น การแก้นั้นจะหาย', 'เปิดงาน'))) return;
  await busy('กำลังเปิดงาน…', async () => { try { let v, img; const C = cloud();
    if (W.cloud) { const r = await C.sb.from('app_state').select('data').eq('id', 'slab:' + id).maybeSingle(); if (r.error) throw r.error; v = r.data && r.data.data && r.data.data.v; if (!v || !v.img) throw new Error('ไม่พบงานนี้ (อาจถูกลบแล้ว)'); img = await loadImg(C.sb.storage.from(BUCKET).getPublicUrl(v.img).data.publicUrl); }
    else { v = await DB.get('w:' + id); if (!v || !v.blob) throw new Error('ไม่พบงานนี้'); img = await createImageBitmap(v.blob); }
    S.img = toCanvas(img, 6000); S.name = v.name || 'slab'; freshImg(); applyData(v.st || {}); fixPx(v.w, v.h); S.work = { id, by: v.by, byName: v.byName, at: v.at, img: v.img, cloud: !!W.cloud };
    S.imgDirty = false; S.dirty = false; S.tool = 'move'; S.sel = []; S.lsel = []; worksClose(); fit(); ui(); autosave(); toast('เปิดงานแล้ว — ' + S.name);
  } catch (e) { toast('เปิดงานไม่ได้: ' + ((e && e.message) || e)); } }); }
// รูปที่โหลดกลับมาขนาดพิกเซลไม่เท่าตอนบันทึก → ปรับสเกล / จุดขนาด (เก็บเป็นพิกเซล) ให้ขนาดจริง (ซม.) เท่าเดิม
function fixPx(w0, h0) { if (!(w0 > 0) || !(h0 > 0) || (S.img.width === w0 && S.img.height === h0)) return; const kx = w0 / S.img.width, ky = h0 / S.img.height; S.cmx *= kx; S.cmy *= ky; ['dimx', 'dimy'].forEach((k) => { const d = S[k]; if (d) { d.a = [d.a[0] / kx, d.a[1] / ky]; d.b = [d.b[0] / kx, d.b[1] / ky]; } }); }
async function renameWork(id) { const W = (S.wk.list || []).find((x) => x.id === id); if (!W) return; const nm = await askText('เปลี่ยนชื่องาน', 'ชื่องาน', W.name || ''); if (nm == null || !nm.trim()) return; const C = cloud();
  try { if (W.cloud) { const r = await C.sb.from('app_state').select('data').eq('id', 'slab:' + id).maybeSingle(); const v = r.data && r.data.data && r.data.data.v; if (!v) throw new Error('ไม่พบงานนี้'); v.name = nm.trim(); const u = await C.sb.from('app_state').upsert({ id: 'slab:' + id, data: { v }, updated_by: C.me.email }); if (u.error) throw u.error; if (S.work && S.work.id === id) S.work.at = v.at; }
    else { const v = await DB.get('w:' + id); v.name = nm.trim(); await DB.put('w:' + id, v); }
    W.name = nm.trim(); if (S.work && S.work.id === id) { S.name = W.name; sub(); } worksRender(); toast('เปลี่ยนชื่อแล้ว'); } catch (e) { toast('เปลี่ยนชื่อไม่ได้: ' + ((e && e.message) || e)); } }
async function deleteWork(id) { const W = (S.wk.list || []).find((x) => x.id === id); if (!W) return; if (!(await ask('ลบงาน “' + esc(W.name || '') + '”?', 'ลบทั้งรูปแผ่นและแผนตัดของงานนี้ — <b>กู้คืนไม่ได้</b> (ถ้าต้องการเก็บ เปิดงานแล้วกด ⬇ ไฟล์งาน .json ก่อน)', 'ลบงาน'))) return; const C = cloud();
  try { if (W.cloud) { const r = await C.sb.from('app_state').select('data').eq('id', 'slab:' + id).maybeSingle(); const v = r.data && r.data.data && r.data.data.v; const d = await C.sb.from('app_state').delete().eq('id', 'slab:' + id); if (d.error) throw d.error; if (v && v.img) { try { await C.sb.storage.from(BUCKET).remove([v.img]); } catch (e) {} } }
    else await DB.del('w:' + id);
    S.wk.list = S.wk.list.filter((x) => x.id !== id); if (S.work && S.work.id === id) { S.work = null; S.dirty = true; ui(); } worksRender(); toast('ลบงานแล้ว'); } catch (e) { toast('ลบไม่ได้: ' + ((e && e.message) || e)); } }
async function newWork() { if (S.dirty && S.img && !(await ask('เริ่มงานใหม่?', 'งานที่เปิดอยู่มีการแก้ที่ยังไม่บันทึก — ถ้าเริ่มงานใหม่ การแก้นั้นจะหาย', 'เริ่มงานใหม่'))) return;
  S.img = null; S.name = ''; freshImg(); S.shapes = []; S.lines = []; S.guides = []; S.lsel = []; S.next = 1; S.work = null; S.dirty = false; S.tool = 'move'; worksClose(); ui(); }
// ---------- เปิด / ปิด ----------
let prevKey = '';
async function open() { if (!root) { build(); document.addEventListener('keydown', onKey, true); document.addEventListener('keyup', onKey, true); window.addEventListener('beforeunload', (e) => { if (S.img && S.dirty) { e.preventDefault(); e.returnValue = ''; } }); } root.hidden = false; S.open = true; if (innerWidth <= 760) S.panel = false;   // มือถือ: แผงตั้งค่าปิดไว้ก่อน (กด ⚙ เปิด) ให้เห็นรูปเต็ม
  prevKey = document.documentElement.getAttribute('data-demo-key') || ''; document.documentElement.setAttribute('data-demo-key', 'tab:slab');
  resize(); ui(); if (!S.img) { const L = await DB.get('last'); if (L && L.blob) { S.lastAt = L.at; S.lastName = L.name; startPane(); } } }
function close() { if (!root) return; root.hidden = true; S.open = false; document.documentElement.setAttribute('data-demo-key', prevKey && prevKey !== 'tab:slab' ? prevKey : 'tab:photo'); }
window.WCSlab = { VER, open, close, isOpen: () => S.open, _S: S, _api: { saveWork, worksOpen, bbox, area, hitAny, toS, toW, one, lLen, regionFrom, fingers: () => PT.size, dragT: () => (drag ? drag.t : '') } };
// ?slab=1 → เปิดโหมดนี้เลย (จาก Learning Center / ลิงก์) — เฉพาะเมื่อเข้าสู่ระบบ / มีสิทธิ์ Photo Editor แล้ว
try { if (new URLSearchParams(location.search).get('slab')) { let n = 0; const go = () => { const m = document.getElementById('scrMain'); if (m && !m.hidden) open(); else if (n++ < 60) setTimeout(go, 250); }; setTimeout(go, 300); } } catch (e) {}
})();
