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
   ===================================================================== */
(() => {
'use strict';
const VER = '2.2.0';   // 2.2.0: หมุนอิสระทุกองศา · เส้นบอกขนาดแผ่น · ปุ่มทึบ 10% ↔ 0% · เส้นตัด 70% คงที่ · 2.1.0: 2.1.0: ความทึบ 0–100% (พื้นชิ้น / เส้นตัด) รายชิ้น · ชิ้นที่เลือก · ทุกชิ้น
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
  shapes: [], guides: [], sel: [], tool: 'move', next: 1,
  shape: 'rect', sides: 6, repeat: false, freeMode: 'drag', nudge: 0.5,
  grid: { on: true, step: 10 }, guidesOn: true, snap: { on: true, grid: true, guide: true, edge: true }, dims: true,
  opDef: 10, lineDef: 70, joint: 3, defW: 45, defH: 120, color: '#E5484D', pat: { c: 3, r: 2, fill: false, cut: true },
  view: { z: 1, ox: 0, oy: 0 }, fitZ: 1,
  cal: [], calLen: '', calAxis: 'both', persp: [], pw: '', ph: '', drawPts: [], meas: null, act: null,
  hover: null, snapHit: null, hist: [], redo: [], prevImg: null, cursor: null, panel: true, loupe: null,
};
let root, cv, ctx, lcv, lctx, W = 0, H = 0, DPR = 1, raf = 0;
const touchy = () => matchMedia('(pointer:coarse)').matches;
// ---------- เก็บงานล่าสุดในเครื่อง (IndexedDB) ----------
const DB = { db: null,
  async open() { if (this.db) return this.db; return new Promise((ok) => { try { const q = indexedDB.open('wcslab', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => { this.db = q.result; ok(this.db); }; q.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async get(k) { const d = await this.open(); if (!d) return null; return new Promise((ok) => { try { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async put(k, v) { const d = await this.open(); if (!d) return; try { d.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch (e) {} } };
let saveT = 0;
function autosave() { clearTimeout(saveT); saveT = setTimeout(async () => { if (!S.img) return; try { const blob = await new Promise((ok) => S.img.toBlob(ok, 'image/jpeg', 0.9)); await DB.put('last', { at: new Date().toISOString(), name: S.name, blob, st: snapData() }); } catch (e) {} }, 800); }
function snapData() { return { cmx: S.cmx, cmy: S.cmy, scaled: S.scaled, lockRatio: S.lockRatio, shapes: S.shapes, guides: S.guides, grid: S.grid, snap: S.snap, guidesOn: S.guidesOn, joint: S.joint, defW: S.defW, defH: S.defH, next: S.next, color: S.color, shape: S.shape, sides: S.sides, dims: S.dims, opDef: S.opDef, lineDef: S.lineDef }; }
function applyData(d) { ['cmx', 'cmy', 'scaled', 'lockRatio', 'joint', 'defW', 'defH', 'next', 'color', 'guidesOn', 'shape', 'sides', 'dims', 'opDef', 'lineDef'].forEach((k) => { if (d[k] !== undefined) S[k] = d[k]; });
  S.shapes = (d.shapes || d.pieces || []).map((p) => ({ t: 'rect', rot: 0, ...p })); S.guides = (d.guides || []).map((g) => ({ ...g })); if (d.grid) S.grid = { ...S.grid, ...d.grid }; if (d.snap) S.snap = { ...S.snap, ...d.snap }; }
// ---------- ย้อนกลับ / ทำซ้ำ ----------
function push() { S.hist.push(JSON.stringify(snapData())); if (S.hist.length > 80) S.hist.shift(); S.redo = []; }
function restorePrev() { const p = S.prevImg; if (!p) return; S.prevImg = null; S.img = p.img; applyData(JSON.parse(p.st)); S.hist = p.hist; S.sel = []; fit(); ui(); autosave(); toast('คืนรูปก่อนดัดแล้ว'); }
function undo() { if (S.prevImg && S.histImgAt === S.hist.length) { restorePrev(); return; }
  const h = S.hist.pop(); if (!h) { toast('ไม่มีอะไรให้ย้อน'); return; } S.redo.push(JSON.stringify(snapData())); applyData(JSON.parse(h)); S.sel = S.sel.filter((id) => S.shapes.some((s) => s.id === id)); ui(); autosave(); }
function redo() { const h = S.redo.pop(); if (!h) return; S.hist.push(JSON.stringify(snapData())); applyData(JSON.parse(h)); ui(); autosave(); }
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
      <button class="sl-ib" data-sl="redo" title="ทำซ้ำ (Ctrl+Y)">↷</button>
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
  cv.addEventListener('pointerdown', pDown); cv.addEventListener('pointermove', pMove); cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pCancel); cv.addEventListener('pointerleave', () => { if (!drag) { S.cursor = null; S.hover = null; stat(); draw(); } });
  cv.addEventListener('wheel', onWheel, { passive: false }); cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cw.addEventListener('dragover', (e) => { e.preventDefault(); }); cw.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { if (/\.json$/i.test(f.name)) loadJson(f); else loadFile(f); } });
  new ResizeObserver(resize).observe(cw);
}
function resize() { const cw = $('#slCw', root); if (!cw) return; DPR = window.devicePixelRatio || 1; const r = cw.getBoundingClientRect(); const first = !W; W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); lcv.width = lcv.height = Math.round(150 * DPR); if (first && S.img) fit(); else draw(); }
function ui() { steps(); tools(); bar(); panel(); stat(); startPane(); sub(); fbar(); draw(); }
function sub() { const t = $('#slSub', root); if (!t) return; t.textContent = S.img ? (S.name + ' · ' + (S.scaled ? 'แผ่นจริง ' + fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.' : 'ยังไม่ตั้งสเกล')) : 'นำเข้ารูปแผ่นหิน / ไม้ แล้ววางชิ้นงานตามขนาดจริง'; }
function steps() { const st = stepState(); const L = ['นำเข้ารูป', 'ตั้งสเกล', 'ปรับสัดส่วน', 'ตาราง · ไกด์ · Snap', 'วางชิ้นงาน'];
  $('#slSteps', root).innerHTML = L.map((t, i) => `<button class="sl-st${st[i] ? ' ok' : ''}" data-step="${i}"><i>${st[i] ? '✓' : i + 1}</i>${t}</button>`).join(''); }
const TOOLS = [['move', '✋', 'เลือก / ย้าย'], ['scale', '📏', 'ตั้งสเกล'], ['persp', '⬚', 'ดัด 4 มุม'], ['shape', '▭', 'รูปทรง', 1], ['free', '✏', 'วาดอิสระ'], ['meas', '📐', 'วัดระยะ'], ['gv', '┆', 'ไกด์ตั้ง', 1], ['gh', '┅', 'ไกด์นอน']];
function tools() { $('#slTools', root).innerHTML = TOOLS.map(([k, ic, t, sep]) => `<button class="sl-tool${S.tool === k ? ' on' : ''}${sep ? ' sep' : ''}" data-tool="${k}" data-g="sl-tool-${k}" title="${t}"${!S.img && k !== 'move' ? ' disabled' : ''}><b>${ic}</b>${t}</button>`).join(''); }
function zoomPct() { return Math.round(S.view.z / (S.fitZ || 1) * 100); }
function zoomUi() { const r = $('[data-in="zoom"]', root), b = $('#slZp', root); if (r) r.value = String(Math.log2(S.view.z / (S.fitZ || 1))); if (b) b.textContent = zoomPct() + '%'; }
function bar() { const g = S.grid, sn = S.snap;
  $('#slBar', root).innerHTML = `<button class="sl-tg${g.on ? ' on' : ''}" data-sl="grid" data-g="sl-grid" title="แสดง / ซ่อนตาราง">▦ ตาราง</button>
    <select data-in="gstep" title="ระยะตาราง (ซม.)">${STEPS.map((v) => `<option value="${v}"${v === g.step ? ' selected' : ''}>${v} ซม.</option>`).join('')}${STEPS.indexOf(g.step) < 0 ? `<option value="${g.step}" selected>${g.step} ซม.</option>` : ''}<option value="x">กำหนดเอง…</option></select>
    <button class="sl-tg${S.guidesOn ? ' on' : ''}" data-sl="guides" title="แสดง / ซ่อนเส้นไกด์">┆ ไกด์ ${S.guides.length || ''}</button>
    <button class="sl-tg${sn.on ? ' on' : ''}" data-sl="snapmenu" data-g="sl-snap" title="ตั้งค่า Snap">🧲 Snap ${sn.on ? 'เปิด' : 'ปิด'} ▾</button>
    <button class="sl-tg${S.opDef > 0 ? ' on' : ''}" data-sl="optoggle" data-g="sl-op" title="สลับความทึบพื้นชิ้นงานทุกชิ้น 10% ↔ 0% (เส้นตัดเห็น 70% ตลอด)"><i class="sl-opi"></i> ทึบ ${S.opDef > 0 ? S.opDef + '%' : '0%'}</button>
    <button class="sl-tg wide${S.dims ? ' on' : ''}" data-sl="dims" title="แสดงขนาดบนชิ้นงาน">↔ ขนาด</button>
    <span class="sl-zoom" data-g="sl-zoom"><button class="sl-tg" data-sl="zout" title="ซูมออก">－</button><input type="range" data-in="zoom" min="-2" max="6" step="0.05" value="${Math.log2(S.view.z / (S.fitZ || 1))}" aria-label="ซูม"><button class="sl-tg" data-sl="zin" title="ซูมเข้า">＋</button><b id="slZp">${zoomPct()}%</b><button class="sl-tg" data-sl="fit" title="พอดีจอ">⤢</button></span>
    ${S.snapMenu ? `<div class="sl-menu" style="left:${Math.min(S.snapMenuX || 200, Math.max(8, W - 260))}px"><label><input type="checkbox" data-snap="on"${sn.on ? ' checked' : ''}> <b>เปิด Snap</b></label><div style="border-top:1px solid #EEE6D8;margin:4px 0"></div>
      <label><input type="checkbox" data-snap="grid"${sn.grid ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดตาราง</label><label><input type="checkbox" data-snap="guide"${sn.guide ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดเส้นไกด์</label>
      <label><input type="checkbox" data-snap="edge"${sn.edge ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดขอบชิ้นงาน / ขอบแผ่น (+ ร่อง)</label><div class="sl-mut" style="padding:4px 8px">กด Alt ค้างขณะลาก = ปิด Snap ชั่วคราว</div></div>` : ''}`; }
function stat() { const el = $('#slStat', root); if (!el) return; const c = S.cursor;
  el.innerHTML = S.img ? `<span>ตำแหน่ง <b>${c ? fmt(c[0]) + ', ' + fmt(c[1]) + ' ซม.' : '—'}</b></span><span>สเกล <b>${S.scaled ? '1 px = ' + (S.cmx * 10).toFixed(2) + (Math.abs(S.cmx - S.cmy) > 1e-6 ? ' / ' + (S.cmy * 10).toFixed(2) : '') + ' มม.' : 'ยังไม่ตั้ง'}</b></span><span>ชิ้นงาน <b>${S.shapes.length}</b>${S.sel.length ? ' · เลือก ' + S.sel.length : ''}</span>` : '<span>ยังไม่มีรูป</span>'; }
function startPane() { const el = $('#slStart', root); if (!el) return; if (S.img) { el.hidden = true; return; } el.hidden = false;
  el.innerHTML = `<div class="sl-drop"><div style="font-size:42px">✂</div><h2>Slab Layout · วางแผนตัดแผ่น</h2><p>นำเข้ารูปแผ่นหิน / ไม้ / แผ่นวัสดุ → ตั้งสเกลตามขนาดจริง → วางชิ้นงาน (เช่น 45×120 ซม.) วงกลม · หลายเหลี่ยม · วาดอิสระ → จัดแพทเทิร์น · ออกรายการตัด</p>
    <div class="sl-row" style="justify-content:center"><button class="sl-b tl" data-sl="pick" data-g="sl-open" style="height:46px;padding:0 20px;font-size:15px">🖼 นำเข้ารูปแผ่น</button><button class="sl-b" data-sl="json" style="height:46px">📂 เปิดไฟล์งาน (.json)</button>${S.lastAt ? `<button class="sl-b" data-sl="last" style="height:46px">↺ งานล่าสุด · ${esc(S.lastName || '')}</button>` : ''}</div>
    <div class="sl-mut">หรือลากรูปมาวาง · JPG · PNG · WebP · TIFF · PSD — รูปอยู่ในเครื่องคุณ ไม่ถูกอัปโหลด</div>
    <div class="sl-flow"><div><b>1 · นำเข้ารูป</b>รูปแผ่นหิน / dry-lay / แบบ elevation</div><div><b>2 · ตั้งสเกล</b>วาง 2 จุด (มีแว่นขยาย) แล้วใส่ระยะจริง</div><div><b>3 · ปรับสัดส่วน</b>ปรับแกนเดียว หรือดัด 4 มุมให้ตรง</div><div><b>4 · ตาราง · ไกด์ · Snap</b>เปิด-ปิดได้ เลือกให้ติดอะไร</div><div><b>5 · วางชิ้นงาน</b>รูปทรง / วาดอิสระ · ตั้งขนาด ซม. · ลากย้าย · แพทเทิร์น</div></div></div>`; }
function panel() { const P = $('#slPan', root); if (!P) return; P.classList.toggle('off', !S.panel);
  if (!S.img) { P.innerHTML = '<div class="sl-sec"><h4><i>1</i>นำเข้ารูปแผ่น</h4><div class="sl-mut">เริ่มจากนำเข้ารูปแผ่นหิน / ไม้ หรือรูป dry-lay ที่ถ่ายจากโรงงาน</div><div class="sl-row"><button class="sl-b tl" data-sl="pick">🖼 นำเข้ารูป</button></div></div>'; return; }
  const sel = selected(), s1 = one();
  const sum = {}; S.shapes.forEach((p) => { const k = TNAME[p.t] + ' ' + (p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h))); sum[k] = sum[k] || { n: 0, a: 0 }; sum[k].n++; sum[k].a += area(p) / 10000; });
  const tot = Object.values(sum).reduce((a, b) => a + b.a, 0); const thin = S.shapes.filter((p) => Math.min(p.w, p.h) < 10).length;
  P.innerHTML = `
  <div class="sl-sec"><h4><i>1</i>รูปแผ่น</h4><div class="sl-mut">${esc(S.name)} · ${S.img.width} × ${S.img.height} px</div><div class="sl-row"><button class="sl-b" data-sl="pick">เปลี่ยนรูป</button><button class="sl-b" data-sl="savejson" title="บันทึกงาน (รูป + ชิ้นงาน) เป็นไฟล์ .json เปิดต่อได้">💾 บันทึกงาน</button><button class="sl-b" data-sl="json">📂 เปิดงาน</button></div></div>
  <div class="sl-sec" data-g="sl-scale"><h4><i>2</i>สเกล · ขนาดจริง</h4>
    <div class="sl-row"><button class="sl-b dk" data-tool="scale">📏 วาง 2 จุด ตั้งสเกล</button></div>
    <div class="sl-row"><label>ขนาดแผ่นจริง</label></div>
    <div class="sl-row" data-g="sl-size"><input class="sl-in" data-in="iw" type="number" step="0.1" min="1" value="${fmt(IW())}" title="กว้าง (ซม.)"><span>×</span><input class="sl-in" data-in="ih" type="number" step="0.1" min="1" value="${fmt(IH())}" title="สูง (ซม.)"><span class="sl-mut">ซม.</span></div>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-in="lock"${S.lockRatio ? ' checked' : ''}> <span>ล็อกสัดส่วน (ปลดเพื่อแก้กว้าง / สูงแยกกัน)</span></label>
    ${S.scaled ? `<div class="sl-ok">ตั้งสเกลแล้ว · สัดส่วนแกน X : Y = 1 : ${(S.cmy / S.cmx).toFixed(3)}</div>` : '<div class="sl-warn">ยังไม่ตั้งสเกล — วาง 2 จุดบนรูปที่รู้ระยะจริง หรือพิมพ์ขนาดแผ่นจริง</div>'}</div>
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
  <div class="sl-sec"><h4>📋 สรุปรายการตัด</h4>${S.shapes.length ? `<table><tr><th>ชิ้น (ซม.)</th><th>จำนวน</th><th>พื้นที่ ตร.ม.</th></tr>${Object.keys(sum).sort().map((k) => `<tr><td>${k}</td><td>${sum[k].n}</td><td>${sum[k].a.toFixed(2)}</td></tr>`).join('')}<tr><td><b>รวม</b></td><td><b>${S.shapes.length}</b></td><td><b>${tot.toFixed(2)}</b></td></tr></table>${thin ? `<div class="sl-warn">⚠ มีชิ้นแคบกว่า 10 ซม. ${thin} ชิ้น — หินแคบมากเสี่ยงแตก ลองขยับจุดเริ่มแพทเทิร์นให้ชิ้นขอบกว้างขึ้น (แบ่งเศษ 2 ข้าง)</div>` : ''}
    <div class="sl-row"><button class="sl-b" data-sl="renum" title="เรียงหมายเลขจากซ้ายบน → ขวาล่าง">🔢 เรียงหมายเลขใหม่</button><button class="sl-b" data-sl="selall">เลือกทั้งหมด</button><button class="sl-b" data-sl="clear">ลบทั้งหมด</button></div>` : '<div class="sl-mut">ยังไม่มีชิ้นงาน — เลือกเครื่องมือ ▭ รูปทรง หรือ ✏ วาดอิสระ</div>'}</div>
  <div class="sl-mut" style="padding:0 4px">ลัด: แตะ = เลือก · ลาก = ย้าย (ลากที่จับ = ย่อ-ขยาย / หมุน) · 2 นิ้ว = ซูม / เลื่อน · แตะที่ว่าง 2 ครั้ง = ซูมจุดนั้น · Shift + แตะ = เลือกหลายชิ้น · ลูกศร = ขยับ · R = หมุน 90° · Ctrl+D = สำเนา · Delete = ลบ · Ctrl+Z / Ctrl+Y</div>`; }
// ---------- แถบลอยบนภาพ (คำแนะนำ + ตั้งค่าของเครื่องมือ / ชิ้นที่เลือก) ----------
function nudgePad(kind) { return `<span class="pad" title="ขยับละเอียด"><span></span><button data-nud="0,-1" data-nk="${kind}" aria-label="ขึ้น">▲</button><span></span><button data-nud="-1,0" data-nk="${kind}" aria-label="ซ้าย">◀</button><button data-nud="0,1" data-nk="${kind}" aria-label="ลง">▼</button><button data-nud="1,0" data-nk="${kind}" aria-label="ขวา">▶</button></span><select data-in="nstep" title="ระยะขยับ" style="height:36px;border-radius:9px;background:#2A2721;color:#fff;border:1px solid #4A463D">${[0.1, 0.5, 1, 5].map((v) => `<option value="${v}"${v === S.nudge ? ' selected' : ''}>${v} ซม.</option>`).join('')}</select>`; }
function fbar() { const el = $('#slFb', root); if (!el) return; if (!S.img) { el.innerHTML = ''; return; } let h = '';
  const ap = S.act ? `<span class="lb">ขยับจุด</span>${nudgePad('pt')}` : '';
  if (S.tool === 'scale') { const n = S.cal.length;
    if (n < 2) h = `<span>📏 ${S.calAxis === 'x' ? 'สเกลแนวนอน' : S.calAxis === 'y' ? 'สเกลแนวตั้ง' : 'ตั้งสเกล'}: กดค้างแล้วเลื่อนเพื่อเล็ง (แว่นขยาย) ยกนิ้ววาง <b>จุดที่ ${n + 1}</b> จาก 2</span><span class="sp"></span>${ap}<button data-sl="tcancel">ยกเลิก</button>`;
    else h = `<span class="bx"><span class="lb">ระยะจริงระหว่าง 2 จุด</span><input data-in="calLen" type="number" step="0.1" min="0" value="${esc(S.calLen)}" placeholder="ซม."><span class="lb">ซม.</span></span>
      <span class="bx">${[['both', 'ทั้ง 2 แกน'], ['x', 'แนวนอน'], ['y', 'แนวตั้ง']].map(([k, t]) => `<button data-cax="${k}" class="${S.calAxis === k ? 'on' : ''}">${t}</button>`).join('')}</span><span class="lb">ลากจุดเหลืองเพื่อแก้</span><span class="sp"></span>${ap}<button data-sl="calReset">ล้างจุด</button><button class="go" data-sl="calOk">✓ ตั้งสเกล</button>`; }
  else if (S.tool === 'persp') { const n = S.persp.length, L = ['ซ้ายบน', 'ขวาบน', 'ขวาล่าง', 'ซ้ายล่าง'];
    if (n < 4) h = `<span>⬚ ดัด 4 มุม: วางมุม <b>${L[n]}</b> ของแผ่น (${n + 1}/4) — กดค้างเพื่อเล็งด้วยแว่นขยาย</span><span class="sp"></span>${ap}<button data-sl="tcancel">ยกเลิก</button>`;
    else h = `<span class="bx"><span class="lb">ขนาดจริง</span><input data-in="pw" type="number" step="0.1" min="0" value="${esc(S.pw)}" placeholder="กว้าง"><span>×</span><input data-in="ph" type="number" step="0.1" min="0" value="${esc(S.ph)}" placeholder="สูง"><span class="lb">ซม.</span></span><span class="lb">ลากมุมเพื่อแก้</span><span class="sp"></span>${ap}<button data-sl="perspReset">ล้างจุด</button><button class="go" data-sl="perspOk">✓ ดัดรูป</button>`; }
  else if (S.tool === 'shape') h = `<span class="bx">${SHAPES.map(([k, ic, t]) => `<button data-shp="${k}" class="${S.shape === k ? 'on' : ''}" title="${t}">${ic}<span class="wd"> ${t}</span></button>`).join('')}</span>
      ${S.shape === 'poly' ? `<span class="bx"><button data-sl="sidesM">－</button><b>${S.sides} ด้าน</b><button data-sl="sidesP">＋</button></span>` : ''}
      <span class="bx"><input data-in="dw" class="sm" type="number" step="0.1" min="1" value="${fmt(S.defW)}" title="กว้าง (ซม.)"><span>×</span><input data-in="dh" class="sm" type="number" step="0.1" min="1" value="${fmt(S.defH)}" title="ยาว (ซม.)"${S.shape === 'sq' || S.shape === 'circle' ? ' disabled' : ''}><span class="lb">ซม.</span></span>
      <button data-sl="repeat" class="${S.repeat ? 'on' : ''}" title="วางต่อเนื่องหลายชิ้น (ปิด = วาง 1 ชิ้นแล้วกลับโหมดเลือก)">🔁 วางต่อ</button><span class="lb">แตะ = วางขนาดนี้ · ลาก = วาดขนาดเอง</span>`;
  else if (S.tool === 'free') h = `<span class="bx"><button data-fm="drag" class="${S.freeMode === 'drag' ? 'on' : ''}">✏ ลากวาดเส้น</button><button data-fm="pts" class="${S.freeMode === 'pts' ? 'on' : ''}">⟋ จุดต่อจุด</button></span>
      ${S.freeMode === 'pts' ? `<span class="lb">${S.drawPts.length ? 'จุด ' + S.drawPts.length + ' · แตะจุดแรกเพื่อปิดรูป' : 'แตะวางจุด (มีแว่นขยาย)'}</span><span class="sp"></span>${ap}${S.drawPts.length ? '<button data-sl="ptUndo">↶ ลบจุด</button><button data-sl="tcancel">ยกเลิก</button>' : ''}${S.drawPts.length >= 3 ? '<button class="go" data-sl="ptClose">✓ ปิดรูป</button>' : ''}` : '<span class="lb">ลากนิ้ว / เมาส์วาดรูปปิด — ปล่อยแล้วเก็บเป็นชิ้นงาน</span>'}`;
  else if (S.tool === 'meas') { const m = S.meas; h = m ? `<span>📐 ระยะ <b>${fmt(Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]))} ซม.</b> · แนวนอน ${fmt(Math.abs(m.b[0] - m.a[0]))} · แนวตั้ง ${fmt(Math.abs(m.b[1] - m.a[1]))} ซม.</span><span class="sp"></span>${ap}<button data-sl="measClear">ล้าง</button>` : '<span>📐 วัดระยะ: ลากจากจุดหนึ่งไปอีกจุด (มีแว่นขยาย) — ลากปลายเพื่อแก้</span>'; }
  else if (S.tool === 'gv' || S.tool === 'gh') h = `<span>${S.tool === 'gv' ? '┆ แตะเพื่อวางเส้นไกด์แนวตั้ง' : '┅ แตะเพื่อวางเส้นไกด์แนวนอน'} · ลากเส้นเพื่อย้าย · ลากออกนอกแผ่น = ลบ</span><span class="sp"></span><button data-tool="move">เสร็จ</button>`;
  else { const s = one(); const L = selected();
    if (s) h = `<span class="bx" data-g="sl-insp"><b>${esc(TNAME[s.t])} #${esc(s.n)}</b><input data-pe="w" class="sm" type="number" step="0.1" min="1" value="${fmt(s.w)}" title="กว้าง (ซม.)"${s.lock ? ' disabled' : ''}>${s.t === 'sq' || s.t === 'circle' ? '' : `<span>×</span><input data-pe="h" class="sm" type="number" step="0.1" min="1" value="${fmt(s.h)}" title="ยาว (ซม.)"${s.lock ? ' disabled' : ''}>`}<span class="lb">ซม.</span><input data-pe="rot" class="sm" type="number" step="1" value="${Math.round(s.rot || 0)}" title="มุม (องศา)"${s.lock ? ' disabled' : ''}><span class="lb">°</span></span>
      <span class="bx"><button data-sl="rot" title="หมุน 90°"${s.lock ? ' disabled' : ''}>⟳ 90°</button><button data-sl="dup" title="ทำสำเนา">⧉</button><button data-sl="lock" class="${s.lock ? 'on' : ''}" title="ล็อก กันขยับโดยไม่ตั้งใจ">${s.lock ? '🔒' : '🔓'}</button><button data-sl="zsel" title="ซูมไปที่ชิ้นนี้">🔍</button><button class="dg" data-sl="del" title="ลบ">🗑</button></span><span class="bx" data-g="sl-opsel" title="ความทึบของชิ้นที่เลือก"><span class="lb"><i class="sl-opi"></i> พื้น</span><input type="range" min="0" max="100" step="1" data-opsel="f" value="${Math.round(fo(L[0]) * 100)}"><b class="opv" data-opv="sf">${Math.round(fo(L[0]) * 100)}%</b><button data-opq="${fo(L[0]) > 0 ? 0 : 10}" title="สลับ 10% ↔ 0%">${fo(L[0]) > 0 ? '→ 0%' : '→ 10%'}</button></span>${s.lock ? '' : nudgePad('sel')}`;
    else if (L.length > 1) h = `<span><b>เลือก ${L.length} ชิ้น</b></span><span class="bx"><button data-sl="rot">⟳ 90°</button><button data-sl="dup">⧉ สำเนา</button><button data-sl="zsel">🔍</button><button class="dg" data-sl="del">🗑 ลบ</button></span><span class="bx" data-g="sl-opsel" title="ความทึบของชิ้นที่เลือก"><span class="lb"><i class="sl-opi"></i> พื้น</span><input type="range" min="0" max="100" step="1" data-opsel="f" value="${Math.round(fo(L[0]) * 100)}"><b class="opv" data-opv="sf">${Math.round(fo(L[0]) * 100)}%</b><button data-opq="${fo(L[0]) > 0 ? 0 : 10}" title="สลับ 10% ↔ 0%">${fo(L[0]) > 0 ? '→ 0%' : '→ 10%'}</button></span>${nudgePad('sel')}`;
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
function freshImg() { S.cmx = S.cmy = 0.1; S.scaled = false; S.prevImg = null; S.hist = []; S.redo = []; S.sel = []; S.cal = []; S.persp = []; S.drawPts = []; S.meas = null; S.act = null; S.calLen = ''; S.calAxis = 'both'; S.pw = ''; S.ph = ''; }
async function loadFile(f) {
  if (S.shapes.length && S.img && !(await ask('เปลี่ยนรูปแผ่น?', 'ชิ้นงานที่วางไว้จะยังอยู่ที่ตำแหน่งเดิม (ซม.) — ถ้าเป็นแผ่นใหม่ ควรลบชิ้นงานก่อน', 'เปลี่ยนรูป'))) return;
  await busy('กำลังเปิดรูป…', async () => { try { const bmp = await decode(f); S.img = toCanvas(bmp, 5000); S.name = f.name.replace(/\.[^.]+$/, ''); freshImg(); S.tool = 'scale';
    fit(); ui(); autosave(); toast('เปิดรูปแล้ว — ขั้นต่อไป: ตั้งสเกล วาง 2 จุดที่รู้ระยะจริง'); } catch (e) { toast(String((e && e.message) || e)); } }); }
async function loadJson(f) { try { const d = JSON.parse(await f.text()); if (!d || !d.img) throw new Error('ไฟล์งานไม่ถูกต้อง');
  await busy('กำลังเปิดงาน…', async () => { const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('รูปในไฟล์งานเสีย')); i.src = d.img; }); S.img = toCanvas(im, 6000); S.name = d.name || f.name.replace(/\.json$/i, ''); freshImg(); applyData(d.st || {}); S.tool = 'move'; fit(); ui(); autosave(); toast('เปิดงานแล้ว'); }); } catch (e) { toast(String((e && e.message) || e)); } }
async function loadLast() { const L = await DB.get('last'); if (!L || !L.blob) { toast('ไม่พบงานล่าสุด'); return; } await busy('กำลังเปิดงานล่าสุด…', async () => { const bmp = await createImageBitmap(L.blob); S.img = toCanvas(bmp, 6000); S.name = L.name || 'slab'; freshImg(); applyData(L.st || {}); S.tool = 'move'; fit(); ui(); }); }
// ---------- สเกล ----------
function calOk() { const len = parseFloat(S.calLen); if (!(len > 0)) { toast('ใส่ระยะจริง (ซม.) ก่อน'); const i = $('[data-in="calLen"]', root); if (i) i.focus(); return; }
  const [a, b] = S.cal, dxp = Math.abs(b[0] - a[0]) / S.cmx, dyp = Math.abs(b[1] - a[1]) / S.cmy, A = S.calAxis;
  if (A === 'x' && dxp < 3) { toast('2 จุดแนวนอนใกล้กันเกินไป'); return; } if (A === 'y' && dyp < 3) { toast('2 จุดแนวตั้งใกล้กันเกินไป'); return; } if (A === 'both' && Math.hypot(dxp, dyp) < 3) { toast('2 จุดใกล้กันเกินไป'); return; }
  push();
  if (A === 'x') { S.cmx = len / dxp; if (S.lockRatio && !S.scaled) S.cmy = S.cmx; }
  else if (A === 'y') { S.cmy = len / dyp; if (S.lockRatio && !S.scaled) S.cmx = S.cmy; }
  else { const ratio = S.cmy / S.cmx, k = len / Math.hypot(dxp, dyp * ratio); S.cmx = k; S.cmy = k * ratio; }
  S.scaled = true; S.cal = []; S.calLen = ''; S.act = null; S.tool = 'move'; fit(); ui(); autosave(); toast('ตั้งสเกลแล้ว — แผ่นจริง ' + fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.'); }
function setSize(w, h, which) { if (!(w > 0) || !(h > 0)) return; push(); if (S.lockRatio) { const k = which === 'h' ? h / IH() : w / IW(); S.cmx *= k; S.cmy *= k; } else { S.cmx = w / S.img.width; S.cmy = h / S.img.height; } S.scaled = true; fit(); ui(); autosave(); }
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
    S.prevImg = { img: S.img, st: JSON.stringify(snapData()), hist: S.hist.slice() }; push(); S.histImgAt = S.hist.length;
    S.img = out; S.cmx = S.cmy = W0 / ow; S.scaled = true; S.shapes = []; S.guides = []; S.sel = []; S.persp = []; S.act = null; S.tool = 'move'; fit(); ui(); autosave(); toast('ดัดรูปแล้ว — แผ่นจริง ' + fmt(W0) + ' × ' + fmt(H0) + ' ซม.'); }); }
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
  if (S.scaled) slabDims(x0, y0, iw, ih);
  if (S.grid.on) { let st = S.grid.step; while (st * z < 7) st *= 2; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip(); ctx.lineWidth = 1;
    const gx0 = Math.max(0, Math.floor(-x0 / z / st) * st), gx1 = Math.min(IW(), (W - x0) / z), gy0 = Math.max(0, Math.floor(-y0 / z / st) * st), gy1 = Math.min(IH(), (H - y0) / z);
    for (let gx = gx0; gx <= gx1 + 1e-6; gx += st) { const sx = Math.round(x0 + gx * z) + .5; ctx.strokeStyle = (Math.round(gx) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y0 + ih); ctx.stroke(); }
    for (let gy = gy0; gy <= gy1 + 1e-6; gy += st) { const sy = Math.round(y0 + gy * z) + .5; ctx.strokeStyle = (Math.round(gy) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + iw, sy); ctx.stroke(); }
    ctx.restore(); }
  if (S.guidesOn) { ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 1.5; S.guides.forEach((g, i) => { ctx.strokeStyle = S.dragG === i ? '#FFD54A' : '#22D3EE'; ctx.beginPath(); if (g.o === 'v') { const sx = toS(g.p, 0)[0]; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); } else { const sy = toS(0, g.p)[1]; ctx.moveTo(0, sy); ctx.lineTo(W, sy); } ctx.stroke(); }); ctx.restore(); }
  S.shapes.forEach((s) => { const on = S.sel.indexOf(s.id) >= 0; pathOf(ctx, s); ctx.fillStyle = hexA(s.c, fo(s)); ctx.fill(); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = on ? '#FFD54A' : hexA(s.c, lo(s)); if (s.lock) ctx.setLineDash([8, 4]); ctx.stroke(); ctx.setLineDash([]);
    const [cx, cy] = toS(...ctr(s)), pw = s.w * z, ph = s.h * z, fs = Math.max(10, Math.min(28, Math.min(pw, ph) / 3.2));
    if (pw > 24 && ph > 18) { label(ctx, (s.lock ? '🔒' : '') + s.n, cx, cy - (S.dims && ph > fs * 2.6 ? fs * .45 : 0), fs, true); if (S.dims && ph > fs * 2.6 && pw > 46) label(ctx, s.t === 'circle' ? '⌀' + fmt(s.w) : fmt(s.w) + '×' + fmt(s.h), cx, cy + fs * .55, Math.max(10, fs * .5)); } });
  const s1 = one(); if (s1) {
    if (!((s1.rot || 0) % 360)) { const [ax, ay] = toS(s1.x, s1.y), pw = s1.w * z, ph = s1.h * z; ctx.save(); ctx.strokeStyle = '#FFD54A'; ctx.lineWidth = 1; const t = 14;
      ctx.beginPath(); ctx.moveTo(ax, ay - t); ctx.lineTo(ax + pw, ay - t); ctx.moveTo(ax, ay - t - 4); ctx.lineTo(ax, ay - t + 4); ctx.moveTo(ax + pw, ay - t - 4); ctx.lineTo(ax + pw, ay - t + 4);
      ctx.moveTo(ax + pw + t, ay); ctx.lineTo(ax + pw + t, ay + ph); ctx.moveTo(ax + pw + t - 4, ay); ctx.lineTo(ax + pw + t + 4, ay); ctx.moveTo(ax + pw + t - 4, ay + ph); ctx.lineTo(ax + pw + t + 4, ay + ph); ctx.stroke(); ctx.restore();
      label(ctx, fmt(s1.w) + ' ซม.', ax + pw / 2, ay - t - 10, 12); ctx.save(); ctx.translate(ax + pw + t + 12, ay + ph / 2); ctx.rotate(Math.PI / 2); label(ctx, fmt(s1.h) + ' ซม.', 0, 0, 12); ctx.restore(); }
    if (!s1.lock) { const hs = touchy() ? 9 : 5; handles(s1).forEach((hd) => { const [hx, hy] = toS(hd.p[0], hd.p[1]);
      if (hd.k === 'rot') { const [tx, ty] = toS(...wld(s1, 0, -s1.h / 2)); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, hs + 1, 0, 7); ctx.fillStyle = '#0E7490'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
      else { ctx.beginPath(); ctx.rect(hx - hs, hy - hs, hs * 2, hs * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#1C1B18'; ctx.lineWidth = 1.5; ctx.stroke(); } }); } }
  if (S.snapHit && S.dragging) { ctx.save(); ctx.strokeStyle = '#FF3DA6'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); if (S.snapHit.x != null) { const sx = toS(S.snapHit.x, 0)[0]; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke(); } if (S.snapHit.y != null) { const sy = toS(0, S.snapHit.y)[1]; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); } ctx.restore(); }
  const ptsDraw = (L, close, col, key) => { if (!L.length) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); L.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); if (close && L.length > 2) ctx.closePath(); ctx.stroke();
    L.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); const act = S.act && S.act.L === key && S.act.i === i; ctx.beginPath(); ctx.arc(sx, sy, act ? 9 : 7, 0, 7); ctx.fillStyle = act ? '#FF3DA6' : col; ctx.fill(); ctx.strokeStyle = '#1C1B18'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 13, sy); ctx.lineTo(sx - 4, sy); ctx.moveTo(sx + 4, sy); ctx.lineTo(sx + 13, sy); ctx.moveTo(sx, sy - 13); ctx.lineTo(sx, sy - 4); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx, sy + 13); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }); ctx.restore(); };
  if (S.tool === 'scale') ptsDraw(S.cal, false, '#FFD54A', 'cal'); if (S.tool === 'persp') ptsDraw(S.persp, true, '#FFD54A', 'persp'); if (S.tool === 'free' && S.freeMode === 'pts') ptsDraw(S.drawPts, false, S.color, 'draw');
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
function slabDims(x0, y0, iw, ih) { const g = ctx, col = '#E2BC66', o = 16; g.save(); g.strokeStyle = col; g.lineWidth = 1.5;
  const ty = y0 - o >= 12 ? y0 - o : y0 + o, lx = x0 - o >= 12 ? x0 - o : x0 + o;
  g.beginPath(); g.moveTo(x0, ty); g.lineTo(x0 + iw, ty); g.moveTo(x0, ty - 6); g.lineTo(x0, ty + 6); g.moveTo(x0 + iw, ty - 6); g.lineTo(x0 + iw, ty + 6);
  g.moveTo(lx, y0); g.lineTo(lx, y0 + ih); g.moveTo(lx - 6, y0); g.lineTo(lx + 6, y0); g.moveTo(lx - 6, y0 + ih); g.lineTo(lx + 6, y0 + ih); g.stroke(); g.restore();
  const tag = (txt, x, y, r) => { g.save(); g.translate(x, y); if (r) g.rotate(-Math.PI / 2); g.font = '800 13px "IBM Plex Sans Thai",system-ui,sans-serif'; const w = g.measureText(txt).width + 14; g.fillStyle = '#1C1B18'; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.rect(-w / 2, -11, w, 22); g.fill(); g.stroke(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore(); };
  tag('แผ่น ' + fmt(IW()) + ' ซม.', Math.max(70, Math.min(W - 70, x0 + iw / 2)), ty, false); tag(fmt(IH()) + ' ซม.', lx, Math.max(60, Math.min(H - 60, y0 + ih / 2)), true); }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// แว่นขยาย 3× เหนือนิ้ว (แสดงขณะวางจุด / ลากที่จับ / ลากจุด / วัดระยะ)
function loupe() { const L = S.loupe; if (!L) { lcv.hidden = true; return; } lcv.hidden = false; const size = 150, k = 3, r = size / 2;
  let lx = L.sx - r, ly = L.sy - size - 46; if (ly < 4) ly = L.sy + 46; lx = Math.max(4, Math.min(W - size - 4, lx)); lcv.style.left = lx + 'px'; lcv.style.top = ly + 'px';
  const src = size / k * DPR, g = lctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lcv.width, lcv.height); g.save(); g.beginPath(); g.arc(lcv.width / 2, lcv.height / 2, lcv.width / 2, 0, 7); g.clip(); g.fillStyle = '#111'; g.fillRect(0, 0, lcv.width, lcv.height);
  g.imageSmoothingEnabled = false; g.drawImage(cv, L.sx * DPR - src / 2, L.sy * DPR - src / 2, src, src, 0, 0, lcv.width, lcv.height); g.restore();
  const c = lcv.width / 2; g.strokeStyle = '#FF3DA6'; g.lineWidth = 1.5 * DPR; g.beginPath(); g.moveTo(c - 26 * DPR, c); g.lineTo(c - 5 * DPR, c); g.moveTo(c + 5 * DPR, c); g.lineTo(c + 26 * DPR, c); g.moveTo(c, c - 26 * DPR); g.lineTo(c, c - 5 * DPR); g.moveTo(c, c + 5 * DPR); g.lineTo(c, c + 26 * DPR); g.stroke();
  const [wx, wy] = toW(L.sx, L.sy); g.font = `600 ${11 * DPR}px "IBM Plex Sans Thai",sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(c - 52 * DPR, lcv.height - 30 * DPR, 104 * DPR, 18 * DPR); g.fillStyle = '#fff'; g.fillText(fmt(wx) + ', ' + fmt(wy) + ' ซม.', c, lcv.height - 17 * DPR); }
// ---------- เมาส์ / นิ้ว ----------
const PT = new Map(); let drag = null, lastTap = 0, lastTapXY = [0, 0];
function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
const thr = (e) => (isTouch(e) ? 9 : 4);
const listOf = (k) => (k === 'cal' ? S.cal : k === 'persp' ? S.persp : k === 'draw' ? S.drawPts : null);
function ptHit(L, sx, sy) { const r = touchy() ? 20 : 11; for (let i = L.length - 1; i >= 0; i--) { const [px, py] = toS(L[i][0], L[i][1]); if (Math.hypot(px - sx, py - sy) <= r) return i; } return -1; }
function pDown(e) { if (!S.img) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (e.isPrimary) PT.clear();   // นิ้วแรกของท่าใหม่ = ล้างนิ้วค้าง (บางเครื่องไม่ส่ง pointerup)
  PT.set(e.pointerId, pos(e)); S.noSnap = e.altKey;
  if (S.snapMenu || S.opMenu) { S.snapMenu = false; S.opMenu = false; bar(); }
  if (PT.size === 2) { if (drag && drag.t === 'move' && drag.moved) { drag.start.forEach(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); if (p) { p.x = x; p.y = y; } }); S.hist.pop(); }
    if ((drag && (drag.t === 'resize' || drag.t === 'rotate')) && drag.orig) { Object.assign(drag.s, drag.orig); S.hist.pop(); }
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
  const tool = S.tool;
  if (tool === 'scale' || tool === 'persp' || (tool === 'free' && S.freeMode === 'pts')) { const key = tool === 'scale' ? 'cal' : tool === 'persp' ? 'persp' : 'draw', L = listOf(key), max = tool === 'scale' ? 2 : tool === 'persp' ? 4 : 999;
    if (L.length >= max) { drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy, tap: true }; return; } drag = { ...base, t: 'newPt', key, w: [wx, wy] }; S.loupe = { sx, sy }; draw(); return; }
  if (tool === 'meas') { const p0 = snapPt(wx, wy); S.meas = { a: p0, b: p0.slice() }; S.act = null; drag = { ...base, t: 'meas' }; S.loupe = { sx, sy }; draw(); fbar(); return; }
  if (tool === 'gv' || tool === 'gh') { const gi = hitGuide(sx, sy); if (gi >= 0) { push(); drag = { ...base, t: 'guide', i: gi }; S.dragG = gi; draw(); return; } drag = { ...base, t: 'newGuide' }; return; }
  const gi = hitGuide(sx, sy), p = hitAny(wx, wy);
  if (p && tool !== 'free') { if (tool === 'shape') { S.tool = 'move'; tools(); }   // แตะโดนชิ้นเดิมขณะใช้เครื่องมือรูปทรง = แก้ชิ้นนั้น (ไม่สร้างซ้อน)
    const wasSel = S.sel.indexOf(p.id) >= 0; if (e.shiftKey) { if (wasSel) S.sel.splice(S.sel.indexOf(p.id), 1); else S.sel.push(p.id); } else if (!wasSel) S.sel = [p.id];
    drag = { ...base, t: 'move', wx, wy, start: selected().map((q) => [q.id, q.x, q.y]), moved: false, locked: selected().some((q) => q.lock) }; draw(); fbar(); panel(); stat(); return; }
  if (tool === 'shape') { const [x, y] = snapPt(wx, wy); drag = { ...base, t: 'create', a: [x, y] }; return; }
  if (tool === 'free') { drag = { ...base, t: 'free', pts: [[wx, wy]] }; return; }
  if (gi >= 0) { push(); drag = { ...base, t: 'guide', i: gi }; S.dragG = gi; draw(); return; }
  drag = { ...base, t: 'pan', ox: S.view.ox, oy: S.view.oy, tap: true }; }
function pMove(e) { if (!S.img) return; const P0 = pos(e); if (PT.has(e.pointerId)) PT.set(e.pointerId, P0); const [sx, sy] = P0, [wx, wy] = toW(sx, sy); S.cursor = [wx, wy]; S.hover = [wx, wy]; S.noSnap = e.altKey;
  if (!drag) { if (S.tool === 'shape') draw(); stat(); return; }
  const far = Math.hypot(sx - drag.sx, sy - drag.sy) > thr(e);
  if (drag.t === 'pinch') { if (PT.size < 2) return; const [a, b] = [...PT.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const nz = Math.max(S.fitZ * 0.2, Math.min(ZMAX(), drag.z * d / drag.d));
    S.view.z = nz; S.view.ox = c[0] - (drag.c[0] - drag.ox) * (nz / drag.z); S.view.oy = c[1] - (drag.c[1] - drag.oy) * (nz / drag.z); draw(); zoomUi(); return; }
  if (drag.t === 'pan') { if (drag.tap && !far) return; drag.tap = false; S.view.ox = drag.ox + sx - drag.sx; S.view.oy = drag.oy + sy - drag.sy; draw(); return; }
  if (drag.t === 'newPt') { drag.w = [wx, wy]; S.loupe = { sx, sy }; draw(); return; }
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
  if (d.t === 'pan') { if (d.tap && still) { const now = Date.now(); if (now - lastTap < 330 && Math.hypot(sx - lastTapXY[0], sy - lastTapXY[1]) < 30) { zoomAt(sx, sy, S.view.z * 2); lastTap = 0; } else { lastTap = now; lastTapXY = [sx, sy]; if (S.sel.length) { S.sel = []; panel(); fbar(); stat(); } } } draw(); return; }
  if (d.t === 'newPt') { const L = listOf(d.key); L.push(d.w); S.act = { L: d.key, i: L.length - 1 };
    if (S.tool === 'persp' && S.persp.length === 4 && S.scaled) { const q = S.persp; S.pw = S.pw || fmt(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1])); S.ph = S.ph || fmt(Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1])); }
    if (S.tool === 'scale' && S.cal.length === 2 && S.scaled) { const [a, b] = S.cal; S.calLen = S.calLen || fmt(S.calAxis === 'x' ? Math.abs(b[0] - a[0]) : S.calAxis === 'y' ? Math.abs(b[1] - a[1]) : Math.hypot(b[0] - a[0], b[1] - a[1])); }
    fbar(); draw(); if (!d.touch && ((S.tool === 'scale' && S.cal.length === 2) || (S.tool === 'persp' && S.persp.length === 4))) { const i = $(S.tool === 'scale' ? '[data-in="calLen"]' : '[data-in="pw"]', root); if (i && !i.value) i.focus(); } return; }
  if (d.t === 'closePt') { if (still) ptClose(); return; }
  if (d.t === 'editPt') { fbar(); draw(); return; }
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
function pCancel(e) { PT.delete(e.pointerId); if (drag && drag.t === 'move' && drag.moved) { drag.start.forEach(([id, x, y]) => { const p = S.shapes.find((q) => q.id === id); if (p) { p.x = x; p.y = y; } }); } drag = null; S.loupe = null; S.dragging = false; draw(); }
function onWheel(e) { if (!S.img) return; e.preventDefault(); const [sx, sy] = pos(e); zoomAt(sx, sy, S.view.z * Math.exp(-e.deltaY * 0.0015)); }
function zoomBy(k) { zoomAt(W / 2, H / 2, S.view.z * k); }
function ptClose() { if (S.drawPts.length < 3) return; push(); const p = freeFrom(S.drawPts.slice()); S.drawPts = []; S.act = null; if (p) afterCreate(p); else ui(); }
// ความทึบ: which = 'all' (ทุกชิ้น + ค่าตั้งต้นของชิ้นใหม่) / 'sel' (ชิ้นที่เลือก) · k = 'f' พื้นชิ้น / 'l' เส้นตัด
function setOp(which, k, v) { const L = which === 'all' ? S.shapes : selected(); if (which === 'all') { if (k === 'f') S.opDef = v; else S.lineDef = v; } L.forEach((s) => { if (k === 'f') s.op = v; else s.lo = v; }); draw(); }
function nudge(dx, dy, kind) { const st = S.nudge;
  if (kind === 'pt' && S.act) { if (S.act.L === 'meas') { if (S.meas) { const k = S.act.i ? 'b' : 'a'; S.meas[k] = [S.meas[k][0] + dx * st, S.meas[k][1] + dy * st]; } } else { const L = listOf(S.act.L); if (L && L[S.act.i]) L[S.act.i] = [L[S.act.i][0] + dx * st, L[S.act.i][1] + dy * st]; } draw(); fbar(); return; }
  const L = selected().filter((p) => !p.lock); if (!L.length) return; push(); L.forEach((p) => { p.x = r1(p.x + dx * st); p.y = r1(p.y + dy * st); }); draw(); panel(); autosave(); }
// ---------- ปุ่ม ----------
function setTool(t) { if (S.tool === t && t !== 'move') t = 'move'; S.tool = t; if (t !== 'free') S.drawPts = []; if (t !== 'scale') { S.cal = []; S.calLen = ''; } if (t !== 'persp') S.persp = []; if (t !== 'meas') S.meas = null; S.act = null; if (t !== 'move' && t !== 'shape') S.sel = []; tools(); fbar(); panel(); stat(); draw(); }
async function onClick(e) { const t = e.target;
  const tl = t.closest('[data-tool]'); if (tl && !tl.disabled) { setTool(tl.dataset.tool); if (innerWidth <= 760 && tl.closest('#slPan')) { S.panel = false; panel(); } return; }
  const stp = t.closest('[data-step]'); if (stp) { const i = +stp.dataset.step; if (i === 0) $('#slFile', root).click(); else if (i === 1) setTool('scale'); else if (i === 2) { S.panel = true; panel(); const el = $('[data-g="sl-ratio"]', root); if (el) el.scrollIntoView({ behavior: 'smooth' }); } else if (i === 3) { S.snapMenu = true; bar(); } else if (i === 4) setTool('shape'); return; }
  const shp = t.closest('[data-shp]'); if (shp) { S.shape = shp.dataset.shp; if (S.tool !== 'shape') setTool('shape'); fbar(); panel(); draw(); return; }
  const fm = t.closest('[data-fm]'); if (fm) { S.freeMode = fm.dataset.fm; S.drawPts = []; S.act = null; fbar(); draw(); return; }
  const cax = t.closest('[data-cax]'); if (cax) { S.calAxis = cax.dataset.cax; if (S.calAxis !== 'both') S.lockRatio = false; fbar(); return; }
  const nd = t.closest('[data-nud]'); if (nd) { const [a, b] = nd.dataset.nud.split(',').map(Number); nudge(a, b, nd.dataset.nk); return; }
  const pre = t.closest('[data-pre]'); if (pre) { const [a, b] = pre.dataset.pre.split('x').map(Number); S.defW = a; S.defH = b; panel(); fbar(); return; }
  const col = t.closest('[data-col]'); if (col) { S.color = col.dataset.col; panel(); return; }
  const pc = t.closest('[data-pcol]'); if (pc) { push(); selected().forEach((p) => { p.c = pc.dataset.pcol; }); draw(); autosave(); return; }
  const gx = t.closest('[data-gx]'); if (gx) { push(); S.guides.splice(+gx.dataset.gx, 1); ui(); autosave(); return; }
  const opq = t.closest('[data-opq]'); if (opq) { push(); setOp('sel', 'f', +opq.dataset.opq); fbar(); autosave(); return; }
  if ((S.snapMenu || S.opMenu) && !t.closest('.sl-menu') && !t.closest('[data-sl="snapmenu"]') && !t.closest('[data-sl="opmenu"]')) { S.snapMenu = false; S.opMenu = false; bar(); }
  const b = t.closest('[data-sl]'); if (!b || b.disabled) return; return act(b.dataset.sl, b); }
async function act(a, b) {
  if (a === 'close') return close();
  if (a === 'pick') return $('#slFile', root).click();
  if (a === 'json') return $('#slJson', root).click();
  if (a === 'last') return loadLast();
  if (a === 'undo') return undo(); if (a === 'redo') return redo();
  if (a === 'panel') { S.panel = !S.panel; panel(); return; }
  if (!S.img) return;
  if (a === 'grid') { S.grid.on = !S.grid.on; bar(); steps(); draw(); autosave(); }
  else if (a === 'guides') { S.guidesOn = !S.guidesOn; bar(); draw(); }
  else if (a === 'dims') { S.dims = !S.dims; bar(); draw(); }
  else if (a === 'optoggle') { push(); const v = S.opDef > 0 ? 0 : 10; setOp('all', 'f', v); bar(); fbar(); autosave(); toast('พื้นชิ้นงานทุกชิ้น ' + v + '% · เส้นตัด 70%'); }
  else if (a === 'snapmenu') { S.opMenu = false; S.snapMenu = !S.snapMenu; S.snapMenuX = b ? b.offsetLeft : 200; bar(); }
  else if (a === 'fit') fit(); else if (a === 'zin') zoomBy(1.4); else if (a === 'zout') zoomBy(1 / 1.4);
  else if (a === 'calx' || a === 'caly') { setTool('scale'); S.calAxis = a === 'calx' ? 'x' : 'y'; S.lockRatio = false; fbar(); if (innerWidth <= 760) { S.panel = false; panel(); } }
  else if (a === 'calOk') calOk(); else if (a === 'calReset') { S.cal = []; S.calLen = ''; S.act = null; fbar(); draw(); }
  else if (a === 'perspOk') perspOk(); else if (a === 'perspReset') { S.persp = []; S.act = null; fbar(); draw(); }
  else if (a === 'tcancel') setTool('move');
  else if (a === 'ptUndo') { S.drawPts.pop(); S.act = null; fbar(); draw(); } else if (a === 'ptClose') ptClose();
  else if (a === 'measClear') { S.meas = null; S.act = null; fbar(); draw(); }
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
  if (t.dataset.opall || t.dataset.opsel) { if (!S.opPushed) { push(); S.opPushed = true; } const v = Math.max(0, Math.min(100, Math.round(parseFloat(t.value) || 0)));
    if (t.dataset.opall) setOp('all', t.dataset.opall, v); else setOp('sel', t.dataset.opsel, v);
    const lab = $('[data-opv="' + (t.dataset.opall ? t.dataset.opall : 's' + t.dataset.opsel) + '"]', root); if (lab) lab.textContent = v + '%'; const tb = $('[data-sl="opmenu"]', root); if (tb && t.dataset.opall === 'f') tb.innerHTML = '<i class="sl-opi"></i> ทึบ ' + v + '%'; return; }
  if (t.dataset.in === 'zoom') { const nz = (S.fitZ || 1) * Math.pow(2, parseFloat(t.value)); zoomAt(W / 2, H / 2, nz); return; }
  if (t.dataset.in === 'calLen') { S.calLen = t.value; draw(); return; } if (t.dataset.in === 'pw') { S.pw = t.value; return; } if (t.dataset.in === 'ph') { S.ph = t.value; return; }
  if (t.dataset.pt) { S.pat[t.dataset.pt] = t.type === 'checkbox' ? t.checked : parseFloat(t.value) || 1; } }
function onChange(e) { const t = e.target, v = parseFloat(t.value);
  if (t.dataset.opall || t.dataset.opsel) { S.opPushed = false; autosave(); return; }
  if (t.dataset.snap) { S.snap[t.dataset.snap] = t.checked; bar(); return; }
  if (t.dataset.in === 'nstep') { S.nudge = v; return; }
  if (t.dataset.in === 'gstep') { if (t.value === 'x') { askNum('ระยะตาราง', 'ระยะ (ซม.)', S.grid.step).then((r) => { if (r > 0) S.grid.step = r; bar(); draw(); }); return; } S.grid.step = v; S.grid.on = true; bar(); steps(); draw(); autosave(); return; }
  if (t.dataset.in === 'lock') { S.lockRatio = t.checked; return; }
  if (t.dataset.in === 'iw' || t.dataset.in === 'ih') { const w = parseFloat($('[data-in="iw"]', root).value), h = parseFloat($('[data-in="ih"]', root).value); setSize(w, h, t.dataset.in === 'ih' ? 'h' : 'w'); return; }
  if (t.dataset.in === 'dw' && v > 0) { S.defW = v; panel(); fbar(); return; } if (t.dataset.in === 'dh' && v > 0) { S.defH = v; panel(); fbar(); return; }
  if (t.dataset.in === 'joint' && v >= 0) { S.joint = v; autosave(); panel(); return; }
  if (t.dataset.gp) { push(); S.guides[+t.dataset.gp].p = v || 0; draw(); autosave(); return; }
  if (t.dataset.pe) { const p = one(); if (!p) return; const k = t.dataset.pe; if ((k === 'w' || k === 'h') && !(v > 0)) return; push();
    if (k === 'n') p.n = t.value.trim() || p.n; else if (k === 'rot') p.rot = (((v || 0) % 360) + 360) % 360; else if (k === 'sides') p.sides = Math.max(3, Math.min(24, v | 0));
    else if (k === 'w' || k === 'h') { const [cx, cy] = ctr(p); if (p.t === 'sq' || p.t === 'circle') { p.w = p.h = r1(v); } else p[k] = r1(v); p.x = r1(cx - p.w / 2); p.y = r1(cy - p.h / 2); }
    else p[k] = r1(v || 0); ui(); autosave(); return; } }
function onKey(e) { if (!S.open) return; const tg = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(tg.tagName);
  if (e.key === ' ' && !typing) { S.space = e.type === 'keydown'; e.preventDefault(); return; } if (e.type !== 'keydown') return;
  if (window.WCGuide && WCGuide.active && WCGuide.active()) return;
  if (e.key === 'Enter' && typing && tg.dataset.in === 'calLen') { e.preventDefault(); S.calLen = tg.value; calOk(); return; }
  if (e.key === 'Enter' && typing && (tg.dataset.in === 'pw' || tg.dataset.in === 'ph')) { e.preventDefault(); perspOk(); return; }
  if (e.key === 'Escape') { if ($('.sl-dlg', root)) return; if (S.tool !== 'move') setTool('move'); else if (S.sel.length) { S.sel = []; ui(); } e.preventDefault(); return; }
  if (typing) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); if (S.sel.length) act('dup'); return; }
  let dx = 0, dy = 0; if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1; else if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1;
  if (dx || dy) { e.preventDefault(); const st = S.nudge; S.nudge = e.shiftKey ? 5 : (e.altKey ? 0.1 : st); nudge(dx, dy, S.act && !S.sel.length ? 'pt' : 'sel'); S.nudge = st; return; }
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
    label(g, p.n, cx, cy - fs * .4, fs, true); label(g, p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(p.w) + '×' + fmt(p.h), cx, cy + fs * .5, fs * .45); }); } finally { S.view = sv; }
  const ar = S.shapes.reduce((a, p) => a + area(p) / 10000, 0); g.fillStyle = '#1C1B18'; g.fillRect(0, h, w, foot); g.fillStyle = '#F6F1E8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(foot * .36)}px "IBM Plex Sans Thai",sans-serif`;
  g.fillText(`Slab Layout · ${S.name} · แผ่น ${fmt(IW())} × ${fmt(IH())} ซม. · ${S.shapes.length} ชิ้น · ${ar.toFixed(2)} ตร.ม. · ร่อง ${S.joint} มม. · ${today()} · Wellcon Interior`, Math.round(foot * .4), h + foot / 2);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png')); dl(blob, fname('png')); toast('บันทึกภาพแผนตัดแล้ว'); }); }
function exportCsv() { if (!S.shapes.length) { toast('ยังไม่มีชิ้นงาน'); return; } const L = [['หมายเลข', 'รูปทรง', 'กว้าง (ซม.)', 'ยาว (ซม.)', 'มุม (°)', 'กรอบตัดจากแผ่น (ซม.)', 'พื้นที่ชิ้น (ตร.ม.)', 'ตำแหน่ง X (ซม.)', 'ตำแหน่ง Y (ซม.)']];
  S.shapes.slice().sort((a, b) => (parseFloat(a.n) || 0) - (parseFloat(b.n) || 0)).forEach((p) => { const b = bbox(p); L.push([p.n, TNAME[p.t] + (p.t === 'poly' ? ' ' + (p.sides || 6) + ' ด้าน' : ''), fmt(p.w), fmt(p.h), Math.round(p.rot || 0), fmt(b[2]) + ' × ' + fmt(b[3]), (area(p) / 10000).toFixed(3), fmt(p.x), fmt(p.y)]); });
  const sum = {}; S.shapes.forEach((p) => { const k = TNAME[p.t] + ' ' + (p.t === 'circle' ? '⌀' + fmt(p.w) : fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h))); sum[k] = (sum[k] || 0) + 1; });
  L.push([]); L.push(['สรุปตามขนาด', 'จำนวน']); Object.keys(sum).sort().forEach((k) => L.push([k, sum[k]])); L.push(['รวม', S.shapes.length]); L.push([]); L.push(['แผ่น', S.name, fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.', 'ร่อง ' + S.joint + ' มม.', today()]);
  const csv = '﻿' + L.map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n'); dl(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fname('csv')); toast('บันทึกรายการตัดแล้ว (เปิดด้วย Excel ได้)'); }
async function saveJson() { if (!S.img) return; await busy('กำลังบันทึกงาน…', async () => { const img = S.img.toDataURL('image/jpeg', 0.9); dl(new Blob([JSON.stringify({ app: 'wellcon-slab', v: VER, name: S.name, at: new Date().toISOString(), img, st: snapData() })], { type: 'application/json' }), fname('json')); toast('บันทึกงานแล้ว — เปิดต่อได้ที่ 📂 เปิดงาน'); }); }
// ---------- เปิด / ปิด ----------
let prevKey = '';
async function open() { if (!root) { build(); document.addEventListener('keydown', onKey, true); document.addEventListener('keyup', onKey, true); } root.hidden = false; S.open = true; if (innerWidth <= 760) S.panel = false;   // มือถือ: แผงตั้งค่าปิดไว้ก่อน (กด ⚙ เปิด) ให้เห็นรูปเต็ม
  prevKey = document.documentElement.getAttribute('data-demo-key') || ''; document.documentElement.setAttribute('data-demo-key', 'tab:slab');
  resize(); ui(); if (!S.img) { const L = await DB.get('last'); if (L && L.blob) { S.lastAt = L.at; S.lastName = L.name; startPane(); } } }
function close() { if (!root) return; root.hidden = true; S.open = false; document.documentElement.setAttribute('data-demo-key', prevKey && prevKey !== 'tab:slab' ? prevKey : 'tab:photo'); }
window.WCSlab = { VER, open, close, isOpen: () => S.open, _S: S, _api: { bbox, area, hitAny, toS, toW, one, fingers: () => PT.size, dragT: () => (drag ? drag.t : '') } };
// ?slab=1 → เปิดโหมดนี้เลย (จาก Learning Center / ลิงก์) — เฉพาะเมื่อเข้าสู่ระบบ / มีสิทธิ์ Photo Editor แล้ว
try { if (new URLSearchParams(location.search).get('slab')) { let n = 0; const go = () => { const m = document.getElementById('scrMain'); if (m && !m.hidden) open(); else if (n++ < 60) setTimeout(go, 250); }; setTimeout(go, 300); } } catch (e) {}
})();
